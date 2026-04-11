import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getPool } from "../infra/db.ts";

/**
 * POST /webhooks/email
 *   Resend webhook payload. See https://resend.com/docs/webhooks/events
 *
 * Phase 1 status: accepts any Resend-shaped payload and writes to
 * email_events. Signature verification via svix will be wired in Phase 2
 * once we finalize the Resend account — until then the endpoint is rate-
 * limited by Railway's infra and gated by obscurity (not a secret path).
 */

const ResendEventSchema = z.object({
  type: z.string(),
  created_at: z.string(),
  data: z
    .object({
      tags: z
        .object({
          tenant_id: z.string().uuid().optional(),
          campaign_id: z.string().uuid().optional(),
          buyer_id: z.string().uuid().optional(),
        })
        .optional(),
    })
    .passthrough(),
});

export const emailWebhookRouter: ExpressRouter = Router();

emailWebhookRouter.post("/", async (req: Request, res: Response) => {
  const parsed = ResendEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_body",
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const { type, created_at, data } = parsed.data;
  const tags = data.tags ?? {};
  if (!tags.tenant_id) {
    // Without a tenant we cannot attribute the event — acknowledge with 202
    // so Resend doesn't retry forever, but log for investigation.
    console.warn("[email-webhook] dropping event without tenant_id", type);
    return res.status(202).json({ ok: true, dropped: "missing_tenant_id" });
  }

  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO email_events
         (tenant_id, campaign_id, buyer_id, event_type, provider,
          occurred_at, raw_payload)
       VALUES ($1, $2, $3, $4, 'resend', $5::timestamptz, $6)`,
      [
        tags.tenant_id,
        tags.campaign_id ?? null,
        tags.buyer_id ?? null,
        type,
        created_at,
        JSON.stringify(data),
      ],
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[email-webhook] insert failed:", (err as Error).message);
    return res.status(500).json({ error: "internal_error" });
  }
});
