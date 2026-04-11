import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import basicAuth from "express-basic-auth";
import { z } from "zod";
import { env } from "../infra/env.ts";
import { getQueue, QUEUE_BATCH } from "../infra/queues.ts";
import { BATCH_SCHEDULES } from "../batch/scheduler.ts";

/**
 * Operator-only admin endpoints for Category A batch jobs:
 *
 *   GET  /admin/batch/schedules          list registered cron entries
 *   POST /admin/batch/run                manual immediate run of one job
 *
 * Protected by the same basic-auth used for /admin/queues.
 */

const RunSchema = z.object({
  name: z.string().min(1),
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
