import { Worker, type Job } from "bullmq";
import { createBullConnection } from "../infra/redis.ts";
import { QUEUE_SIGNALCRAFT } from "../infra/queues.ts";
import { runPipeline } from "../signalcraft/pipeline.ts";
import { isTerminalFailure, moveToDlq } from "../batch/dlq.ts";

/**
 * queue:signalcraft worker — Category B (on-demand keyword dataset).
 *
 * Phase 3 W06: Stage 1 collection is wired end-to-end through
 * runPipeline(). Stage 2~4 are stubbed inside the pipeline itself so the
 * job reaches a terminal state during local testing.
 */

export interface SignalcraftJobData {
  signalcraftJobId: string;
  tenantId: string;
  keyword: string;
  regions: string[];
  modules: string[];
  productKeywordId?: string;
}

async function handleSignalcraftJob(job: Job<SignalcraftJobData>) {
  const started = Date.now();
  const { signalcraftJobId, tenantId, keyword, regions, productKeywordId } = job.data;
  console.log(
    `[worker:signalcraft] start keyword="${keyword}" job=${signalcraftJobId} bullId=${job.id}`,
  );

  const result = await runPipeline({
    jobId: signalcraftJobId,
    tenantId,
    keyword,
    regions,
    productKeywordId,
  });

  await job.updateProgress(100);
  const ms = Date.now() - started;
  return { ms, ...result };
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
    if (isTerminalFailure(job)) {
      void moveToDlq(QUEUE_SIGNALCRAFT, job!, err).catch((e) => {
        console.error(`[worker:signalcraft] DLQ move failed: ${(e as Error).message}`);
      });
    }
  });
  worker.on("error", (err) => {
    console.error(`[worker:signalcraft] error ${err.message}`);
  });

  return worker;
}
