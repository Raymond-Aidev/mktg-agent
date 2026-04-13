import type { Job } from "bullmq";
import { getPoolForRole } from "../infra/db.ts";

/**
 * Common batch job lifecycle wrapper.
 *
 * Every Category A handler is wrapped with `withBatchLifecycle` so we get
 * uniform logging, timing, and crawler_failures persistence on errors.
 * All DB operations run under SET ROLE batch_worker (0006_roles.sql).
 *
 * Handlers receive a `BatchContext` and return a serializable `BatchResult`
 * that BullMQ stores on the completed job. Throwing inside the handler
 * causes BullMQ's standard retry/backoff to kick in (configured per queue
 * in src/infra/queues.ts).
 */

export interface BatchContext {
  jobId: string;
  jobName: string;
  startedAt: number;
}

export interface BatchResult {
  source: string;
  collected: number;
  skipped?: number;
  failed?: number;
  durationMs: number;
}

export type BatchHandler = (
  job: Job,
  ctx: BatchContext,
) => Promise<Omit<BatchResult, "durationMs">>;

export async function withBatchLifecycle(job: Job, handler: BatchHandler): Promise<BatchResult> {
  const ctx: BatchContext = {
    jobId: String(job.id),
    jobName: job.name,
    startedAt: Date.now(),
  };

  try {
    const partial = await handler(job, ctx);
    const durationMs = Date.now() - ctx.startedAt;
    console.log(
      `[batch:${job.name}] ok in ${durationMs}ms — collected=${partial.collected} skipped=${partial.skipped ?? 0} failed=${partial.failed ?? 0}`,
    );
    return { ...partial, durationMs };
  } catch (err) {
    const error = err as Error;
    const durationMs = Date.now() - ctx.startedAt;
    console.error(`[batch:${job.name}] fail in ${durationMs}ms: ${error.message}`);

    try {
      const pool = getPoolForRole("batch_worker");
      await pool.query(
        `INSERT INTO crawler_failures (source, target_url, error_code, error_msg, attempt)
         VALUES ($1, NULL, $2, $3, $4)`,
        [job.name, error.name ?? "Error", error.message, job.attemptsMade + 1],
      );
    } catch (logErr) {
      console.error(
        `[batch:${job.name}] crawler_failures insert failed: ${(logErr as Error).message}`,
      );
    }
    throw error;
  }
}
