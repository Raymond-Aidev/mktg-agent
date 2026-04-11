import { Queue, type QueueOptions } from "bullmq";
import { createBullConnection } from "./redis.ts";

/**
 * BullMQ queue registry.
 *
 * Category A (persistent dataset) and Category B (on-demand keyword dataset)
 * run on strictly separated queues so load spikes in one cannot starve the
 * other. See docs/Technical_Specification_v1.0.md §1.1 for the contract.
 */

// BullMQ forbids ':' in queue names. The conceptual names in Tech Spec are
// "queue:batch" / "queue:signalcraft"; on the wire they are plain strings.
export const QUEUE_BATCH = "batch";
export const QUEUE_SIGNALCRAFT = "signalcraft";

export type QueueName = typeof QUEUE_BATCH | typeof QUEUE_SIGNALCRAFT;

const DEFAULT_QUEUE_OPTS: Omit<QueueOptions, "connection"> = {
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
};

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  const existing = queues.get(name);
  if (existing) return existing;
  const queue = new Queue(name, {
    connection: createBullConnection(),
    ...DEFAULT_QUEUE_OPTS,
  });
  queues.set(name, queue);
  return queue;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
  queues.clear();
}

export function listQueues(): Queue[] {
  return [getQueue(QUEUE_BATCH), getQueue(QUEUE_SIGNALCRAFT)];
}
