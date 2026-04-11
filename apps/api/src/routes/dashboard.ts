import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getPool } from "../infra/db.ts";
import {
  getAdoptionStats,
  getCampaignStats,
  getLlmCostByModel,
  getPipelineSummary,
  getWeeklyActiveUsers,
} from "../kpis/queries.ts";
import { loadFxToKrw } from "../kpis/expected-revenue.ts";

/**
 * GET /api/v1/dashboard/kpis?tenantId=...
 *
 * One-shot KPI fetch for the customer dashboard. Combines all five
 * Phase 5 KPI sources into a single response shape so the frontend can
 * paint the home screen in one round trip.
 *
 * Tenant scoping is currently via query string. Phase 6 replaces it
 * with a JWT middleware that injects req.tenant.
 */

const QuerySchema = z.object({
  tenantId: z.string().uuid(),
  windowDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const dashboardRouter: ExpressRouter = Router();

dashboardRouter.get("/kpis", async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_query",
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  const { tenantId, windowDays = 30 } = parsed.data;

  const pool = getPool();
  try {
    const [pipeline, campaigns, adoption, wau, llmCost, fxToKrw] = await Promise.all([
      getPipelineSummary(pool, tenantId),
      getCampaignStats(pool, tenantId, windowDays),
      getAdoptionStats(pool, tenantId, windowDays),
      getWeeklyActiveUsers(pool, tenantId),
      getLlmCostByModel(pool, tenantId, windowDays),
      loadFxToKrw(pool),
    ]);

    return res.json({
      tenantId,
      windowDays,
      pipeline,
      campaigns,
      adoption,
      wau,
      llmCost,
      fxToKrw,
    });
  } catch (err) {
    console.error("[dashboard] kpi query failed:", (err as Error).message);
    return res.status(500).json({ error: "internal_error" });
  }
});
