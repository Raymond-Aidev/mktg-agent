import { Worker, type Job } from "bullmq";
import { createBullConnection } from "../infra/redis.ts";
import { QUEUE_BATCH } from "../infra/queues.ts";
import { withBatchLifecycle, type BatchHandler, type BatchResult } from "../batch/runner.ts";
import { fxRatesHandler } from "../batch/handlers/fx-rates.ts";
import { rightsDealsHandler } from "../batch/handlers/rights-deals.ts";
import { bestsellersHandler } from "../batch/handlers/bestsellers.ts";
import { marketTrendsHandler } from "../batch/handlers/market-trends.ts";

/**
 * queue:batch worker — Category A (persistent dataset) scheduled crawlers.
 *
 * Routes BullMQ job names to per-source handlers via the HANDLERS map.
 * Each handler is responsible for one master dataset and is wrapped with
 * `withBatchLifecycle` so logging, timing, and crawler_failures recording
 * are uniform.
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

const HANDLERS: Record<string, BatchHandler> = {
  "fx-rates:hourly": fxRatesHandler,
  "rights-deals:daily": rightsDealsHandler,
  "bestsellers:daily": bestsellersHandler,
  "market-trends:daily": marketTrendsHandler,
  // Phase 2 follow-ups slot in here:
  //   "buyers:bologna": buyersBolognaHandler,
  //   "competitors:weekly": competitorsHandler,
};

async function handleBatchJob(job: Job<BatchJobData>): Promise<BatchResult> {
  const handler = HANDLERS[job.name];
  if (!handler) {
    throw new Error(`No batch handler registered for job name "${job.name}"`);
  }
  return withBatchLifecycle(job, handler);
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
