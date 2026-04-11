/**
 * Direct end-to-end test of the SignalCraft Stage 1 pipeline.
 * Run:
 *   DATABASE_URL=... pnpm --filter @eduright/api exec tsx src/cli/test-signalcraft.ts
 *
 * Creates a signalcraft_jobs row, runs runPipeline() synchronously (no
 * BullMQ), and reports the resulting raw_posts counts.
 */
import { runPipeline } from "../signalcraft/pipeline.ts";
import { getPool, closePool } from "../infra/db.ts";

const TENANT = "00000000-0000-0000-0000-0000000000aa";
const KEYWORD = process.argv[2] ?? "react";

const pool = getPool();

const insert = await pool.query<{ id: string }>(
  `INSERT INTO signalcraft_jobs
     (tenant_id, keyword, regions, modules_requested, status, current_stage)
   VALUES ($1, $2, $3, $4, 'queued', 'stage1:queued')
   RETURNING id`,
  [TENANT, KEYWORD, [], []],
);
const jobId = insert.rows[0]?.id;
if (!jobId) throw new Error("failed to create job row");
console.log("created signalcraft job:", jobId);

const result = await runPipeline({
  jobId,
  tenantId: TENANT,
  keyword: KEYWORD,
  regions: [],
});
console.log("pipeline result:", result);

const job = await pool.query(
  `SELECT status, current_stage, progress_pct, started_at, finished_at
     FROM signalcraft_jobs
    WHERE id = $1`,
  [jobId],
);
console.log("final job row:", job.rows[0]);

const sample = await pool.query(
  `SELECT source, author, likes, left(content, 80) AS snippet
     FROM raw_posts
    WHERE job_id = $1
    ORDER BY likes DESC NULLS LAST
    LIMIT 3`,
  [jobId],
);
console.log("--- top 3 by likes ---");
sample.rows.forEach((r) => {
  console.log(`  [${r.source}] ${r.author ?? "?"} (${r.likes}) ${r.snippet}...`);
});

// Cleanup: delete the test job + its raw_posts (cascades)
await pool.query("DELETE FROM signalcraft_jobs WHERE id = $1", [jobId]);
await closePool();
console.log("DONE");
