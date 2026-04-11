import { getQueue, QUEUE_BATCH } from "../infra/queues.ts";

/**
 * Repeat schedule registry — single source of truth for the BullMQ cron
 * patterns from docs/Technical_Specification_v1.0.md §1.2.2.
 *
 * `registerBatchSchedules()` is called once at application startup. It uses
 * a stable jobId per repeat so re-running the bootstrap (e.g. on every
 * restart) does NOT create duplicate repeats.
 */

export interface BatchScheduleEntry {
  /** Job name dispatched to apps/api/src/workers/batch.ts. */
  name: string;
  /** Cron expression. Times are evaluated in `tz`. */
  cron: string;
  /** IANA timezone — Tech Spec uses Asia/Seoul. */
  tz: string;
  /** Per-job timeout. Defaults to 10 minutes if omitted. */
  timeoutMs?: number;
}

export const BATCH_SCHEDULES: BatchScheduleEntry[] = [
  {
    name: "fx-rates:hourly",
    cron: "0 * * * *",
    tz: "Asia/Seoul",
    timeoutMs: 60_000,
  },
  {
    name: "rights-deals:daily",
    cron: "30 3 * * *",
    tz: "Asia/Seoul",
    timeoutMs: 600_000,
  },
  {
    name: "bestsellers:daily",
    cron: "0 6 * * *",
    tz: "Asia/Seoul",
    timeoutMs: 600_000,
  },
  {
    name: "market-trends:daily",
    cron: "0 5 * * *",
    tz: "Asia/Seoul",
    timeoutMs: 600_000,
  },
  {
    name: "competitors:weekly",
    cron: "0 4 * * 1",
    tz: "Asia/Seoul",
    timeoutMs: 900_000,
  },
  // Phase 2 follow-ups: buyers:bologna.
];

export async function registerBatchSchedules(): Promise<void> {
  const queue = getQueue(QUEUE_BATCH);

  for (const entry of BATCH_SCHEDULES) {
    await queue.add(
      entry.name,
      {},
      {
        repeat: { pattern: entry.cron, tz: entry.tz },
        // Stable jobId prevents duplicate repeats across restarts.
        jobId: `repeat:${entry.name}`,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    );
    console.log(`[scheduler] registered ${entry.name} (${entry.cron} ${entry.tz})`);
  }
}
