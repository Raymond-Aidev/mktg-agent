import { Worker, type Job } from "bullmq";
import { createBullConnection } from "../infra/redis.ts";
import { QUEUE_BATCH } from "../infra/queues.ts";

/**
 * queue:batch worker — Category A (persistent dataset) scheduled crawlers.
 *
 * Phase 1 status: skeleton only. Real handlers are wired per crawler in
 * Phase 2. For now this acknowledges jobs so we can test the pipeline
 * end-to-end and observe them in bull-board.
 */

export type BatchJobName =
  | "fx-rates:hourly"
  | "buyers:bologna"
  | "competitors:weekly"
  | "market-trends:daily"
  | "rights-deals:daily"
  | "bestsellers:daily"
  | "raw-posts:archive";

export interface BatchJobData {
  [k: string]: unknown;
}

async function handleBatchJob(job: Job<BatchJobData>) {
  const started = Date.now();
  console.log(`[worker:batch] start ${job.name} id=${job.id}`);
  // TODO(Phase 2): dispatch to per-source crawler in packages/crawlers.
  await job.updateProgress(100);
  const ms = Date.now() - started;
  return { name: job.name, ms, note: "skeleton handler — replaced in Phase 2" };
}

export function startBatchWorker(): Worker<BatchJobData> {
  const worker = new Worker<BatchJobData>(QUEUE_BATCH, handleBatchJob, {
    connection: createBullConnection(),
    concurrency: 2,
    autorun: true,
  });

  worker.on("completed", (job) => {
    console.log(`[worker:batch] done ${job.name} id=${job.id}`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker:batch] fail ${job?.name} id=${job?.id}: ${err.message}`);
  });
  worker.on("error", (err) => {
    console.error(`[worker:batch] error ${err.message}`);
  });

  return worker;
}
