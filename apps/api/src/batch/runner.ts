import type { Job } from "bullmq";
import { getPoolForRole } from "../infra/db.ts";
import { assertClosed, CircuitOpenError, recordFailure, recordSuccess } from "./circuit-breaker.ts";

/**
 * Common batch job lifecycle wrapper.
 *
 * Every Category A handler is wrapped with `withBatchLifecycle` so we get
 * uniform circuit-breaker enforcement, logging, timing, and crawler_failures
 * persistence on errors. All DB operations run under SET ROLE batch_worker
 * (0006_roles.sql).
 *
 * Handlers receive a `BatchContext` and return a serializable `BatchResult`
 * that BullMQ stores on the completed job. Throwing inside the handler
 * causes BullMQ's standard retry/backoff to kick in (configured per queue
 * in src/infra/queues.ts). When all retries are exhausted the worker's
 * "failed" listener moves the job to the DLQ (see workers/batch.ts).
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
  circuitSkipped?: boolean;
}

export type BatchHandler = (
  job: Job,
  ctx: BatchContext,
) => Promise<Omit<BatchResult, "durationMs" | "circuitSkipped">>;

export async function withBatchLifecycle(job: Job, handler: BatchHandler): Promise<BatchResult> {
  const ctx: BatchContext = {
    jobId: String(job.id),
    jobName: job.name,
    startedAt: Date.now(),
  };

  // Circuit breaker — throw fast if the source has been failing recently.
  // The error is caught below and reported as a no-op completion so BullMQ
  // does not consume retry budget on a known-bad source.
  try {
    await assertClosed(job.name);
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      const durationMs = Date.now() - ctx.startedAt;
      console.warn(
        `[batch:${job.name}] circuit OPEN — skipped (until ${err.openUntil.toISOString()})`,
      );
      return {
        source: job.name,
        collected: 0,
        durationMs,
        circuitSkipped: true,
      };
    }
    throw err;
  }

  try {
    const partial = await handler(job, ctx);
    const durationMs = Date.now() - ctx.startedAt;
    console.log(
      `[batch:${job.name}] ok in ${durationMs}ms — collected=${partial.collected} skipped=${partial.skipped ?? 0} failed=${partial.failed ?? 0}`,
    );
    await recordSuccess(job.name).catch((e) => {
      console.error(`[batch:${job.name}] recordSuccess failed: ${(e as Error).message}`);
    });
    return { ...partial, durationMs };
  } catch (err) {
    const error = err as Error;
    const durationMs = Date.now() - ctx.startedAt;
    console.error(`[batch:${job.name}] fail in ${durationMs}ms: ${error.message}`);

    try {
      const pool = getPoolForRole("batch_worker");
      await pool.query(
        `INSERT INTO crawler_failures
           (source, target_url, error_code, error_msg, attempt, queue_name, bull_job_id, job_data)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7)`,
        [
          job.name,
          error.name ?? "Error",
          error.message,
          job.attemptsMade + 1,
          job.queueName,
          String(job.id),
          job.data ? JSON.stringify(job.data) : null,
        ],
      );
    } catch (logErr) {
      console.error(
        `[batch:${job.name}] crawler_failures insert failed: ${(logErr as Error).message}`,
      );
    }

    await recordFailure(job.name).catch((e) => {
      console.error(`[batch:${job.name}] recordFailure failed: ${(e as Error).message}`);
    });

    throw error;
  }
}
