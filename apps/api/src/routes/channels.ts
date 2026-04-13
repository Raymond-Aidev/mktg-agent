import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getPool } from "../infra/db.ts";

/**
 * GET /api/v2/dashboard/channels?tenantId=...
 *
 * PRD v2.0 §2.3 — 채널별 성과 분석.
 * 각 수집 채널(naver_news, naver_blog, naver_cafe, hackernews 등)의
 * 최근 데이터 도달량(reach)과 참여도(engagement proxy)를 비교.
 *
 * 실제 ROI 계산은 사용자 투입 비용 입력이 필요하므로 MVP는
 * "채널별 도달 + 반응" 비교까지만 제공.
 */

const QuerySchema = z.object({
  tenantId: z.string().uuid(),
  windowDays: z.coerce.number().int().min(1).max(90).optional(),
});

const SOURCE_LABELS: Record<string, string> = {
  naver_news: "네이버 뉴스",
  naver_blog: "네이버 블로그",
  naver_cafe: "네이버 카페",
  instagram: "인스타그램",
  youtube: "유튜브",
  hackernews: "Hacker News",
  momcafe: "맘카페",
};

export const channelsRouter: ExpressRouter = Router();

channelsRouter.get("/", async (req: Request, res: Response) => {
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
    // 1. 채널별 수집 건수 + 평균 참여도 (최근 windowDays)
    const channelStats = await pool.query<{
      source: string;
      post_count: string;
      avg_likes: string;
      avg_comments: string;
      total_likes: string;
    }>(
      `SELECT source,
              COUNT(*)::int                    AS post_count,
              AVG(likes)::numeric(10,1)        AS avg_likes,
              AVG(comments_cnt)::numeric(10,1) AS avg_comments,
              SUM(likes)::int                  AS total_likes
         FROM raw_posts
        WHERE tenant_id = $1
          AND collected_at >= now() - ($2 || ' days')::interval
        GROUP BY source
        ORDER BY post_count DESC`,
      [tenantId, windowDays],
    );

    const channels = channelStats.rows.map((r) => ({
      source: r.source,
      label: SOURCE_LABELS[r.source] ?? r.source,
      postCount: Number(r.post_count),
      avgLikes: Number(r.avg_likes),
      avgComments: Number(r.avg_comments),
      totalLikes: Number(r.total_likes),
      engagementScore: Math.round(Number(r.avg_likes) * 2 + Number(r.avg_comments) * 3),
    }));

    // 2. 이메일 채널 성과 (별도)
    const emailStats = await pool.query<{
      sent: string;
      opened: string;
      clicked: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'email.sent')::int    AS sent,
         COUNT(*) FILTER (WHERE event_type = 'email.opened')::int  AS opened,
         COUNT(*) FILTER (WHERE event_type = 'email.clicked')::int AS clicked
       FROM email_events
       WHERE tenant_id = $1
         AND occurred_at >= now() - ($2 || ' days')::interval`,
      [tenantId, windowDays],
    );
    const email = emailStats.rows[0]
      ? {
          source: "email",
          label: "이메일",
          sent: Number(emailStats.rows[0].sent),
          opened: Number(emailStats.rows[0].opened),
          clicked: Number(emailStats.rows[0].clicked),
          openRate:
            Number(emailStats.rows[0].sent) > 0
              ? Number(emailStats.rows[0].opened) / Number(emailStats.rows[0].sent)
              : 0,
        }
      : null;

    // 3. 총합
    const totalPosts = channels.reduce((s, c) => s + c.postCount, 0);

    return res.json({
      tenantId,
      windowDays,
      totalPosts,
      channels,
      email,
    });
  } catch (err) {
    console.error("[channels] failed:", (err as Error).message);
    return res.status(500).json({ error: "internal_error" });
  }
});
