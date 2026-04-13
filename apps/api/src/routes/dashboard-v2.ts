import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getPool } from "../infra/db.ts";

/**
 * GET /api/v2/dashboard/overview
 *
 * PRD v2.0 §3.1 — 사업자 메인 뷰. 한 번의 요청으로 대시보드 전체를
 * 렌더링할 수 있는 데이터를 반환한다.
 *
 * 포함 항목:
 *   - 최근 SignalCraft 분석 요약 (#03 sentiment + #08 summary)
 *   - 예상 매출 (활성 바이어 × 평균 단가)
 *   - 트렌드 키워드 TOP 5
 *   - 최근 분석 리포트 목록 (최대 5건)
 *   - 데이터 신선도 (마지막 수집 시각)
 */

const QuerySchema = z.object({
  tenantId: z.string().uuid(),
});

export const dashboardV2Router: ExpressRouter = Router();

dashboardV2Router.get("/overview", async (req: Request, res: Response) => {
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
    // 1. 최근 완료된 SignalCraft 잡 + 모듈 결과
    const latestJob = await pool.query<{
      id: string;
      keyword: string;
      finished_at: Date | null;
    }>(
      `SELECT id, keyword, finished_at
         FROM signalcraft_jobs
        WHERE tenant_id = $1 AND status = 'done'
        ORDER BY finished_at DESC NULLS LAST
        LIMIT 1`,
      [tenantId],
    );

    let brandSentiment: {
      positive: number;
      negative: number;
      neutral: number;
      oneLiner: string | null;
      confidence: string | null;
    } | null = null;

    let weeklyActions: Array<{
      action: string;
      priority: string;
    }> = [];

    let latestKeyword: string | null = null;
    let lastAnalyzedAt: string | null = null;

    if (latestJob.rows[0]) {
      const jobId = latestJob.rows[0].id;
      latestKeyword = latestJob.rows[0].keyword;
      lastAnalyzedAt = latestJob.rows[0].finished_at?.toISOString() ?? null;

      // #03 Sentiment
      const sentimentRow = await pool.query<{ output: Record<string, unknown> }>(
        `SELECT output FROM signalcraft_module_outputs
          WHERE job_id = $1 AND module_id = '#03' AND status = 'success'`,
        [jobId],
      );
      if (sentimentRow.rows[0]?.output) {
        const s = sentimentRow.rows[0].output as {
          sentimentRatio?: { positive?: number; negative?: number; neutral?: number };
          topKeywords?: Array<{ term: string; count: number; sentiment: string }>;
        };
        brandSentiment = {
          positive: s.sentimentRatio?.positive ?? 0,
          negative: s.sentimentRatio?.negative ?? 0,
          neutral: s.sentimentRatio?.neutral ?? 0,
          oneLiner: null,
          confidence: null,
        };
      }

      // #08 Summary
      const summaryRow = await pool.query<{ output: Record<string, unknown> }>(
        `SELECT output FROM signalcraft_module_outputs
          WHERE job_id = $1 AND module_id = '#08' AND status = 'success'`,
        [jobId],
      );
      if (summaryRow.rows[0]?.output) {
        const sum = summaryRow.rows[0].output as {
          oneLiner?: string;
          criticalActions?: Array<{ action: string; priority: string }>;
          confidence?: string;
        };
        if (brandSentiment) {
          brandSentiment.oneLiner = sum.oneLiner ?? null;
          brandSentiment.confidence = sum.confidence ?? null;
        }
        weeklyActions = (sum.criticalActions ?? []).slice(0, 5);
      }
    }

    // 2. 예상 매출 (간소화: 활성 바이어 × 기본 단가)
    const buyerStats = await pool.query<{
      active_buyers: string;
      avg_lead_score: string | null;
    }>(
      `SELECT COUNT(*)::int AS active_buyers,
              AVG(lead_score)::numeric(6,2) AS avg_lead_score
         FROM buyers
        WHERE (tenant_id = $1 OR tenant_id IS NULL) AND is_stale = false`,
      [tenantId],
    );
    const activeBuyers = Number(buyerStats.rows[0]?.active_buyers ?? 0);
    const avgLeadScore = buyerStats.rows[0]?.avg_lead_score
      ? Number(buyerStats.rows[0].avg_lead_score)
      : 0;
    const DEFAULT_DEAL_KRW = 5_000_000;
    const estimatedRevenue = Math.round(activeBuyers * DEFAULT_DEAL_KRW * (avgLeadScore / 100));

    // 3. 트렌드 키워드 TOP 5 (market_trends + SignalCraft topKeywords 병합)
    const trendsFromDb = await pool.query<{
      topic: string;
      score: number;
    }>(
      `SELECT topic, score FROM market_trends
        WHERE is_stale = false
        ORDER BY score DESC LIMIT 5`,
    );
    const trendKeywords = trendsFromDb.rows.map((r) => ({
      term: r.topic,
      volume: Math.round(r.score),
      direction: "stable" as const,
    }));

    // 4. 최근 리포트 5건
    const recentReports = await pool.query<{
      id: string;
      title: string;
      kind: string;
      created_at: Date;
      job_keyword: string | null;
    }>(
      `SELECT r.id, r.title, r.kind, r.created_at,
              j.keyword AS job_keyword
         FROM reports r
         LEFT JOIN signalcraft_jobs j ON j.id = r.job_id
        WHERE r.tenant_id = $1
        ORDER BY r.created_at DESC
        LIMIT 5`,
      [tenantId],
    );

    // 5. 데이터 신선도
    const freshness = await pool.query<{
      table_name: string;
      latest: Date | null;
    }>(
      `SELECT 'naver' AS table_name, MAX(collected_at) AS latest
         FROM raw_posts WHERE tenant_id = $1
       UNION ALL
       SELECT 'bestsellers', MAX(last_seen_at) FROM bestsellers
       UNION ALL
       SELECT 'market_trends', MAX(last_seen_at) FROM market_trends
       UNION ALL
       SELECT 'fx_rates', MAX(observed_at) FROM fx_rates`,
      [tenantId],
    );
    const dataFreshness: Record<string, string | null> = {};
    for (const r of freshness.rows) {
      dataFreshness[r.table_name] = r.latest?.toISOString() ?? null;
    }

    return res.json({
      tenantId,
      estimatedRevenue: {
        amount: estimatedRevenue,
        currency: "KRW",
        activeBuyers,
        avgLeadScore,
      },
      brandSentiment,
      weeklyActions,
      trendKeywords,
      latestKeyword,
      lastAnalyzedAt,
      recentReports: recentReports.rows.map((r) => ({
        id: r.id,
        title: r.title,
        kind: r.kind,
        keyword: r.job_keyword,
        createdAt: r.created_at.toISOString(),
        htmlUrl: `/api/v1/reports/${r.id}?format=html`,
      })),
      dataFreshness,
    });
  } catch (err) {
    console.error("[dashboard-v2] overview failed:", (err as Error).message);
    return res.status(500).json({ error: "internal_error" });
  }
});
