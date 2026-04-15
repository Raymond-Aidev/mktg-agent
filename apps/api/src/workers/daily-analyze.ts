import { Worker, type Job } from "bullmq";
import { createBullConnection } from "../infra/redis.ts";
import { getPool } from "../infra/db.ts";
import { getQueue, QUEUE_BATCH, QUEUE_SIGNALCRAFT } from "../infra/queues.ts";

/**
 * Daily keyword analysis scheduler.
 *
 * Runs as a repeatable job on queue:batch.
 * For every active product_keyword with auto_analyze=true,
 * enqueues a SignalCraft job if no snapshot exists for today.
 */

interface DailyAnalyzeResult {
  enqueued: number;
  skipped: number;
}

async function handleDailyAnalyze(_job: Job): Promise<DailyAnalyzeResult> {
  const pool = getPool();
  const today = new Date().toISOString().slice(0, 10);

  // Find all active keywords that need analysis today
  const rows = await pool.query<{
    pk_id: string;
    keyword: string;
    tenant_id: string;
  }>(
    `SELECT pk.id AS pk_id, pk.keyword, pk.tenant_id
       FROM product_keywords pk
       JOIN products p ON pk.product_id = p.id
      WHERE pk.status = 'active'
        AND pk.auto_analyze = true
        AND NOT EXISTS (
          SELECT 1 FROM keyword_snapshots ks
           WHERE ks.product_keyword_id = pk.id
             AND ks.snapshot_date = $1
        )`,
    [today],
  );

  let enqueued = 0;
  let skipped = 0;
  const queue = getQueue(QUEUE_SIGNALCRAFT);

  for (const row of rows.rows) {
    try {
      // Create signalcraft job
      const insert = await pool.query<{ id: string }>(
        `INSERT INTO signalcraft_jobs
           (tenant_id, keyword, regions, modules_requested, status, current_stage)
         VALUES ($1, $2, $3, $4, 'queued', 'stage1:queued')
         RETURNING id`,
        [row.tenant_id, row.keyword, ["KR"], ["#01", "#03", "#06", "#07", "#08", "#13"]],
      );
      const jobId = insert.rows[0]?.id;
      if (!jobId) {
        skipped++;
        continue;
      }

      await queue.add(
        "run",
        {
          signalcraftJobId: jobId,
          tenantId: row.tenant_id,
          keyword: row.keyword,
          regions: ["KR"],
          modules: ["#01", "#03", "#06", "#07", "#08", "#13"],
          productKeywordId: row.pk_id,
        },
        { removeOnComplete: { count: 200 }, removeOnFail: { count: 500 } },
      );
      enqueued++;
    } catch (err) {
      console.error(
        `[daily-analyze] failed to enqueue keyword="${row.keyword}": ${(err as Error).message}`,
      );
      skipped++;
    }
  }

  console.log(`[daily-analyze] done: ${enqueued} enqueued, ${skipped} skipped`);
  return { enqueued, skipped };
}

export function startDailyAnalyzeScheduler(): Worker {
  const worker = new Worker(QUEUE_BATCH, handleDailyAnalyze, {
    connection: createBullConnection(),
    concurrency: 1,
    autorun: true,
  });

  // Register repeatable job: every day at 21:00 UTC (06:00 KST)
  const queue = getQueue(QUEUE_BATCH);
  queue
    .add("daily-analyze", {}, { repeat: { pattern: "0 21 * * *" }, jobId: "daily-analyze" })
    .catch((err) => {
      console.error(`[daily-analyze] failed to register repeatable: ${(err as Error).message}`);
    });

  worker.on("completed", (job) => {
    console.log(`[daily-analyze] completed id=${job.id}`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[daily-analyze] failed id=${job?.id}: ${err.message}`);
  });

  return worker;
}
