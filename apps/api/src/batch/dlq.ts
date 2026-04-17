import type { Job } from "bullmq";
import type { QUEUE_SIGNALCRAFT } from "../infra/queues.ts";
import { dlqFor, QUEUE_BATCH } from "../infra/queues.ts";
import { getPoolForRole } from "../infra/db.ts";
import { dlqMovedTotal } from "../infra/metrics.ts";

/**
 * Move a job into the DLQ for its primary queue.
 *
 * Called from the worker's `failed` listener once `job.attemptsMade` has
 * reached `job.opts.attempts`. The original job stays in the BullMQ "failed"
 * set (subject to removeOnFail retention) AND is reproduced as a fresh job
 * in the DLQ so the operator UI can list / retry / discard it without
 * navigating two queue states.
 *
 * The corresponding crawler_failures row (written from withBatchLifecycle)
 * is flipped to is_terminal=true so dashboards distinguish transient vs
 * final failures.
 */

type PrimaryQueue = typeof QUEUE_BATCH | typeof QUEUE_SIGNALCRAFT;

export async function moveToDlq(primary: PrimaryQueue, job: Job, err: Error): Promise<void> {
  const dlq = dlqFor(primary);
  const payload = {
    originalJobId: String(job.id),
    originalName: job.name,
    originalData: job.data ?? {},
    failureCount: job.attemptsMade,
    failedAt: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack?.slice(0, 4_000) ?? null,
    },
  };

  await dlq.add(job.name, payload, {
    jobId: `dlq:${primary}:${job.id ?? Date.now()}`,
    removeOnComplete: false,
    removeOnFail: false,
  });

  dlqMovedTotal.inc({ queue: primary });

  // Flag the most recent crawler_failures row for this job as terminal.
  if (primary === QUEUE_BATCH) {
    try {
      const pool = getPoolForRole("batch_worker");
      await pool.query(
        `UPDATE crawler_failures
            SET is_terminal = true
          WHERE bull_job_id = $1
            AND is_terminal = false`,
        [String(job.id)],
      );
    } catch (logErr) {
      console.error(`[dlq] terminal flag failed: ${(logErr as Error).message}`);
    }
  }
}

export function isTerminalFailure(job: Job | undefined): boolean {
  if (!job) return false;
  const max = job.opts?.attempts ?? 1;
  return job.attemptsMade >= max;
}
