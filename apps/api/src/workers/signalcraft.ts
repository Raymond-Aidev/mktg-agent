import { Worker, type Job } from "bullmq";
import { createBullConnection } from "../infra/redis.ts";
import { QUEUE_SIGNALCRAFT } from "../infra/queues.ts";

/**
 * queue:signalcraft worker — Category B (on-demand keyword dataset).
 *
 * Phase 1 status: skeleton. Real Stage 1~4 handling lands in Phase 3 + 4
 * (collection, analysis, report rendering).
 */

export interface SignalcraftJobData {
  tenantId: string;
  keyword: string;
  regions: string[];
  modules: string[];
}

async function handleSignalcraftJob(job: Job<SignalcraftJobData>) {
  const started = Date.now();
  console.log(`[worker:signalcraft] start keyword="${job.data.keyword}" id=${job.id}`);
  // TODO(Phase 3): collection stage (5 sources → raw_posts)
  // TODO(Phase 4): 14-module analysis stage
  await job.updateProgress(100);
  const ms = Date.now() - started;
  return { ms, note: "skeleton handler — replaced in Phase 3/4" };
}

export function startSignalcraftWorker(): Worker<SignalcraftJobData> {
  const worker = new Worker<SignalcraftJobData>(QUEUE_SIGNALCRAFT, handleSignalcraftJob, {
    connection: createBullConnection(),
    concurrency: 1,
    autorun: true,
  });

  worker.on("completed", (job) => {
    console.log(`[worker:signalcraft] done id=${job.id}`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker:signalcraft] fail id=${job?.id}: ${err.message}`);
  });
  worker.on("error", (err) => {
    console.error(`[worker:signalcraft] error ${err.message}`);
  });

  return worker;
}
