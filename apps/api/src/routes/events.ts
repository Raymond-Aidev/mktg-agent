import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getPool } from "../infra/db.ts";

/**
 * POST /api/v1/events
 *   Body: { tenantId, userId?, eventType, payload? }
 *
 * Phase 1 status: JWT authentication is not yet wired — request must still
 * carry tenantId in the body. Phase 6 will replace that with `req.tenant`
 * injected by the auth middleware.
 */

const EventSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  eventType: z.string().min(1).max(60),
  payload: z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime().optional(),
});

export const eventsRouter: ExpressRouter = Router();

eventsRouter.post("/", async (req: Request, res: Response) => {
  const parsed = EventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_body",
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const { tenantId, userId, eventType, payload, occurredAt } = parsed.data;
  const pool = getPool();
  try {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO events (tenant_id, user_id, event_type, payload, occurred_at)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()))
       RETURNING id`,
      [tenantId, userId ?? null, eventType, JSON.stringify(payload ?? {}), occurredAt ?? null],
    );
    return res.status(201).json({ id: result.rows[0]?.id });
  } catch (err) {
    console.error("[events] insert failed:", (err as Error).message);
    return res.status(500).json({ error: "internal_error" });
  }
});
