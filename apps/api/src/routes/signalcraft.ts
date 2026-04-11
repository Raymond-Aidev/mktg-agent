import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getPool } from "../infra/db.ts";
import { getQueue, QUEUE_SIGNALCRAFT } from "../infra/queues.ts";

/**
 * Public SignalCraft API:
 *
 *   POST /api/v1/signalcraft/run
 *     Body: { tenantId, keyword, regions?, modules? }
 *     Creates a signalcraft_jobs row (status=queued) and enqueues a
 *     BullMQ job on queue:signalcraft. Returns the jobId so the caller
 *     can poll.
 *
 *   GET /api/v1/signalcraft/jobs/:id
 *     Returns the current signalcraft_jobs row plus a lightweight
 *     count of raw_posts collected so far.
 */

const RunSchema = z.object({
  tenantId: z.string().uuid(),
  keyword: z.string().min(1).max(200),
  regions: z.array(z.string().min(1)).max(20).optional(),
  modules: z.array(z.string().min(1)).max(20).optional(),
});

export const signalcraftRouter: ExpressRouter = Router();

signalcraftRouter.post("/run", async (req: Request, res: Response) => {
  const parsed = RunSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_body",
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  const { tenantId, keyword, regions = [], modules = [] } = parsed.data;

  const pool = getPool();
  const insert = await pool.query<{ id: string }>(
    `INSERT INTO signalcraft_jobs
       (tenant_id, keyword, regions, modules_requested, status, current_stage)
     VALUES ($1, $2, $3, $4, 'queued', 'stage1:queued')
     RETURNING id`,
    [tenantId, keyword, regions, modules],
  );
  const jobId = insert.rows[0]?.id;
  if (!jobId) {
    return res.status(500).json({ error: "job_insert_failed" });
  }

  const queue = getQueue(QUEUE_SIGNALCRAFT);
  await queue.add(
    "run",
    { signalcraftJobId: jobId, tenantId, keyword, regions, modules },
    { removeOnComplete: { count: 200 }, removeOnFail: { count: 500 } },
  );

  return res.status(202).json({ jobId, estimatedMinutes: 2 });
});

signalcraftRouter.get("/jobs/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return res.status(400).json({ error: "invalid_id" });
  }
  const pool = getPool();
  const job = await pool.query(
    `SELECT id, tenant_id, keyword, regions, modules_requested, status,
            current_stage, progress_pct, error_message,
            created_at, started_at, finished_at
       FROM signalcraft_jobs
      WHERE id = $1`,
    [id],
  );
  if (job.rowCount === 0) {
    return res.status(404).json({ error: "not_found" });
  }
  const counts = await pool.query<{ source: string; c: number }>(
    `SELECT source, COUNT(*)::int AS c
       FROM raw_posts
      WHERE job_id = $1
      GROUP BY source`,
    [id],
  );
  const bySource: Record<string, number> = {};
  for (const row of counts.rows) bySource[row.source] = row.c;

  const report = await pool.query<{ id: string }>(
    `SELECT id FROM reports
      WHERE job_id = $1 AND kind = 'signalcraft_integrated'
      ORDER BY created_at DESC
      LIMIT 1`,
    [id],
  );
  const reportId = report.rows[0]?.id ?? null;

  return res.json({ ...job.rows[0], rawPostsBySource: bySource, reportId });
});
