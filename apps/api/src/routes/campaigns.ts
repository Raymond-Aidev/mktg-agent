import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getPool } from "../infra/db.ts";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const QuerySchema = z.object({
  windowDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const campaignsRouter: ExpressRouter = Router();

campaignsRouter.get("/:id/stats", async (req: Request, res: Response) => {
  const params = ParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: "invalid_campaign_id" });
  }
  const query = QuerySchema.safeParse(req.query);
  const windowDays = query.success ? (query.data.windowDays ?? 30) : 30;

  const pool = getPool();
  try {
    const campaignRow = await pool.query<{
      id: string;
      name: string;
      status: string;
      target_count: number;
      scheduled_at: Date | null;
      sent_at: Date | null;
      completed_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, name, status, target_count, scheduled_at, sent_at, completed_at, created_at
         FROM campaigns WHERE id = $1`,
      [params.data.id],
    );

    if (!campaignRow.rows[0]) {
      return res.status(404).json({ error: "campaign_not_found" });
    }

    const campaign = campaignRow.rows[0];

    const statsRes = await pool.query<{
      sent: string;
      opened: string;
      clicked: string;
      replied: string;
      bounced: string;
      open_rate: string | null;
      click_to_open_rate: string | null;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'email.sent')    AS sent,
         COUNT(*) FILTER (WHERE event_type = 'email.opened')  AS opened,
         COUNT(*) FILTER (WHERE event_type = 'email.clicked') AS clicked,
         COUNT(*) FILTER (WHERE event_type = 'email.replied') AS replied,
         COUNT(*) FILTER (WHERE event_type = 'email.bounced') AS bounced,
         (COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.opened'))::numeric
           / NULLIF(COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.sent'), 0)
           AS open_rate,
         (COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.clicked'))::numeric
           / NULLIF(COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.opened'), 0)
           AS click_to_open_rate
       FROM email_events
       WHERE campaign_id = $1
         AND occurred_at >= now() - ($2 || ' days')::interval`,
      [params.data.id, windowDays],
    );

    const stats = statsRes.rows[0];

    return res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        targetCount: campaign.target_count,
        scheduledAt: campaign.scheduled_at,
        sentAt: campaign.sent_at,
        completedAt: campaign.completed_at,
        createdAt: campaign.created_at,
      },
      stats: {
        sent: Number(stats?.sent ?? 0),
        opened: Number(stats?.opened ?? 0),
        clicked: Number(stats?.clicked ?? 0),
        replied: Number(stats?.replied ?? 0),
        bounced: Number(stats?.bounced ?? 0),
        openRate: stats?.open_rate ? Number(stats.open_rate) : 0,
        clickToOpenRate: stats?.click_to_open_rate ? Number(stats.click_to_open_rate) : 0,
      },
      windowDays,
    });
  } catch (err) {
    console.error("[campaigns] stats query failed:", (err as Error).message);
    return res.status(500).json({ error: "internal_error" });
  }
});
