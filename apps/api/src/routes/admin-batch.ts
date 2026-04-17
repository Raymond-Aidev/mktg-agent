import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import basicAuth from "express-basic-auth";
import { z } from "zod";
import { env } from "../infra/env.ts";
import {
  dlqFor,
  getQueue,
  QUEUE_BATCH,
  QUEUE_BATCH_DLQ,
  QUEUE_SIGNALCRAFT,
  QUEUE_SIGNALCRAFT_DLQ,
  type QueueName,
} from "../infra/queues.ts";
import { BATCH_SCHEDULES } from "../batch/scheduler.ts";
import { snapshot as circuitBreakerSnapshot } from "../batch/circuit-breaker.ts";

/**
 * Operator-only admin endpoints for Category A batch jobs:
 *
 *   GET  /admin/batch/schedules              list registered cron entries
 *   POST /admin/batch/run                    manual immediate run of one job
 *   GET  /admin/batch/circuit-breakers       list circuit breaker state per source
 *   GET  /admin/batch/dlq?queue=batch        list DLQ entries (default: batch)
 *   POST /admin/batch/dlq/:id/retry          re-enqueue one DLQ job to its primary
 *   POST /admin/batch/dlq/retry-all          re-enqueue every DLQ job for a queue
 *   POST /admin/batch/dlq/:id/discard        permanently delete one DLQ job
 *
 * Protected by the same basic-auth used for /admin/queues.
 */

const RunSchema = z.object({
  name: z.string().min(1),
});

const DlqQuerySchema = z.object({
  queue: z.enum(["batch", "signalcraft"]).default("batch"),
});

const auth = basicAuth({
  users: { [env.ADMIN_USER]: env.ADMIN_PASS },
  challenge: true,
  realm: "eduright-admin",
});

export const adminBatchRouter: ExpressRouter = Router();
adminBatchRouter.use(auth);

adminBatchRouter.get("/schedules", (_req: Request, res: Response) => {
  res.json({ schedules: BATCH_SCHEDULES });
});

adminBatchRouter.post("/run", async (req: Request, res: Response) => {
  const parsed = RunSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_body",
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  const { name } = parsed.data;
  const known = BATCH_SCHEDULES.some((s) => s.name === name);
  if (!known) {
    return res.status(404).json({ error: "unknown_job", hint: BATCH_SCHEDULES.map((s) => s.name) });
  }
  const queue = getQueue(QUEUE_BATCH);
  const job = await queue.add(name, {}, { removeOnComplete: { count: 100 } });
  return res.status(202).json({ jobId: job.id, name });
});

adminBatchRouter.get("/circuit-breakers", async (_req: Request, res: Response) => {
  try {
    const rows = await circuitBreakerSnapshot();
    res.json({ breakers: rows });
  } catch (err) {
    console.error("[admin-batch] circuit-breakers failed:", (err as Error).message);
    res.status(500).json({ error: "internal_error" });
  }
});

function dlqQueueName(primary: "batch" | "signalcraft"): QueueName {
  return primary === "batch" ? QUEUE_BATCH_DLQ : QUEUE_SIGNALCRAFT_DLQ;
}

adminBatchRouter.get("/dlq", async (req: Request, res: Response) => {
  const parsed = DlqQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_query",
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  const { queue: which } = parsed.data;
  const queue = getQueue(dlqQueueName(which));

  // BullMQ stores DLQ jobs in waiting state (attempts:1, no auto retry).
  // Capture both waiting and delayed so an operator sees pending work.
  const jobs = await queue.getJobs(["waiting", "delayed", "active"], 0, 99, false);
  const items = jobs.map((j) => ({
    id: j.id,
    name: j.name,
    enqueuedAt: j.timestamp ? new Date(j.timestamp).toISOString() : null,
    payload: j.data ?? null,
    failedReason: j.failedReason ?? null,
  }));
  return res.json({ queue: which, count: items.length, items });
});

adminBatchRouter.post("/dlq/retry-all", async (req: Request, res: Response) => {
  const parsed = DlqQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_query" });
  }
  const { queue: which } = parsed.data;
  const dlq = getQueue(dlqQueueName(which));
  const primary = which === "batch" ? getQueue(QUEUE_BATCH) : getQueue(QUEUE_SIGNALCRAFT);

  const jobs = await dlq.getJobs(["waiting", "delayed"], 0, 999, false);
  let requeued = 0;
  for (const j of jobs) {
    const data = (j.data as { originalData?: unknown })?.originalData ?? {};
    await primary.add(j.name, data, { removeOnComplete: { count: 100 } });
    await j.remove();
    requeued += 1;
  }
  return res.json({ queue: which, requeued });
});

adminBatchRouter.post("/dlq/:id/retry", async (req: Request, res: Response) => {
  const parsed = DlqQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_query" });
  }
  const { queue: which } = parsed.data;
  const dlq = dlqFor(which === "batch" ? QUEUE_BATCH : QUEUE_SIGNALCRAFT);
  const primary = which === "batch" ? getQueue(QUEUE_BATCH) : getQueue(QUEUE_SIGNALCRAFT);

  const job = await dlq.getJob(req.params.id ?? "");
  if (!job) return res.status(404).json({ error: "dlq_job_not_found" });

  const data = (job.data as { originalData?: unknown })?.originalData ?? {};
  const enqueued = await primary.add(job.name, data, { removeOnComplete: { count: 100 } });
  await job.remove();
  return res.json({ queue: which, requeuedAs: enqueued.id });
});

adminBatchRouter.post("/dlq/:id/discard", async (req: Request, res: Response) => {
  const parsed = DlqQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_query" });
  }
  const { queue: which } = parsed.data;
  const dlq = dlqFor(which === "batch" ? QUEUE_BATCH : QUEUE_SIGNALCRAFT);

  const job = await dlq.getJob(req.params.id ?? "");
  if (!job) return res.status(404).json({ error: "dlq_job_not_found" });
  await job.remove();
  return res.json({ queue: which, discarded: req.params.id });
});
