import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getPool } from "../infra/db.ts";

/**
 * GET /api/v2/dashboard/competitors?tenantId=...
 *
 * PRD v2.0 §3.1 — 경쟁사 vs 나 비교 카드.
 * competitors 마스터 테이블 + 최근 SignalCraft #06 Opportunity의
 * competitorGaps를 결합해 반환.
 */

const QuerySchema = z.object({
  tenantId: z.string().uuid(),
});

export const competitorsV2Router: ExpressRouter = Router();

competitorsV2Router.get("/", async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_query",
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  const { tenantId } = parsed.data;
  const pool = getPool();

  try {
    // 1. Top 5 competitors from master table
    const comps = await pool.query<{
      name: string;
      country: string | null;
      primary_genres: string[] | null;
      recent_titles: unknown;
      updated_at: Date;
    }>(
      `SELECT name, country, primary_genres, recent_titles, updated_at
         FROM competitors
        WHERE is_stale = false
        ORDER BY updated_at DESC
        LIMIT 5`,
    );

    const competitors = comps.rows.map((r) => {
      const titles = Array.isArray(r.recent_titles) ? r.recent_titles : [];
      return {
        name: r.name,
        country: r.country,
        genres: (r.primary_genres ?? []).slice(0, 5),
        recentTitleCount: titles.length,
        topTitle: (titles[0] as { title?: string })?.title ?? null,
        updatedAt: r.updated_at.toISOString(),
      };
    });

    // 2. Latest #06 Opportunity competitorGaps (if any)
    const latestJob = await pool.query<{ id: string }>(
      `SELECT id FROM signalcraft_jobs
        WHERE tenant_id = $1 AND status = 'done'
        ORDER BY finished_at DESC NULLS LAST LIMIT 1`,
      [tenantId],
    );

    let competitorGaps: Array<{
      competitor: string;
      gap: string;
      ourAdvantage: string;
    }> = [];

    if (latestJob.rows[0]) {
      const opp = await pool.query<{ output: Record<string, unknown> }>(
        `SELECT output FROM signalcraft_module_outputs
          WHERE job_id = $1 AND module_id = '#06' AND status = 'success'`,
        [latestJob.rows[0].id],
      );
      if (opp.rows[0]?.output) {
        const gaps = (
          opp.rows[0].output as {
            competitorGaps?: Array<{
              competitor: string;
              gap: string;
              ourAdvantage: string;
            }>;
          }
        ).competitorGaps;
        if (Array.isArray(gaps)) {
          competitorGaps = gaps.slice(0, 5);
        }
      }
    }

    return res.json({
      competitors,
      competitorGaps,
      totalTracked: comps.rows.length,
    });
  } catch (err) {
    console.error("[competitors-v2] failed:", (err as Error).message);
    return res.status(500).json({ error: "internal_error" });
  }
});
