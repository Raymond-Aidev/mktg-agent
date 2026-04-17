import { Queue, type QueueOptions } from "bullmq";
import { createBullConnection } from "./redis.ts";

/**
 * BullMQ queue registry.
 *
 * Category A (persistent dataset) and Category B (on-demand keyword dataset)
 * run on strictly separated queues so load spikes in one cannot starve the
 * other. See docs/Technical_Specification_v1.0.md §1.1 for the contract.
 *
 * Each primary queue has a paired DLQ where the worker moves jobs whose
 * BullMQ retries are exhausted (Phase 7 W22). DLQ jobs are NOT auto-retried;
 * an operator inspects them via /admin/batch/dlq and chooses to retry or
 * discard. See docs/dlq-playbook.md.
 */

// BullMQ forbids ':' in queue names. The conceptual names in Tech Spec are
// "queue:batch" / "queue:signalcraft"; on the wire they are plain strings.
export const QUEUE_BATCH = "batch";
export const QUEUE_SIGNALCRAFT = "signalcraft";
export const QUEUE_BATCH_DLQ = "batch-dlq";
export const QUEUE_SIGNALCRAFT_DLQ = "signalcraft-dlq";

export type QueueName =
  | typeof QUEUE_BATCH
  | typeof QUEUE_SIGNALCRAFT
  | typeof QUEUE_BATCH_DLQ
  | typeof QUEUE_SIGNALCRAFT_DLQ;

const DEFAULT_QUEUE_OPTS: Omit<QueueOptions, "connection"> = {
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
};

// DLQ jobs do not auto-retry; they sit until an operator acts.
const DLQ_QUEUE_OPTS: Omit<QueueOptions, "connection"> = {
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: false,
    removeOnFail: false,
  },
};

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  const existing = queues.get(name);
  if (existing) return existing;
  const opts =
    name === QUEUE_BATCH_DLQ || name === QUEUE_SIGNALCRAFT_DLQ
      ? DLQ_QUEUE_OPTS
      : DEFAULT_QUEUE_OPTS;
  const queue = new Queue(name, {
    connection: createBullConnection(),
    ...opts,
  });
  queues.set(name, queue);
  return queue;
}

export function dlqFor(primary: typeof QUEUE_BATCH | typeof QUEUE_SIGNALCRAFT): Queue {
  return primary === QUEUE_BATCH ? getQueue(QUEUE_BATCH_DLQ) : getQueue(QUEUE_SIGNALCRAFT_DLQ);
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
  queues.clear();
}

export function listQueues(): Queue[] {
  return [
    getQueue(QUEUE_BATCH),
    getQueue(QUEUE_SIGNALCRAFT),
    getQueue(QUEUE_BATCH_DLQ),
    getQueue(QUEUE_SIGNALCRAFT_DLQ),
  ];
}
