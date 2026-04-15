import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getPool } from "../infra/db.ts";
import type { JwtPayload } from "../infra/auth.ts";

function getTenant(req: Request): string | null {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (user) return user.tenantId;
  return (req.query.tenantId as string) ?? null;
}

const CreateProductSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
});

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
});

const AddKeywordSchema = z.object({
  keyword: z.string().min(1).max(200),
  searchVolume: z.number().int().min(0).optional(),
});

const UUID = /^[0-9a-f-]{36}$/;

export const productsRouter: ExpressRouter = Router();

// List products
productsRouter.get("/", async (req: Request, res: Response) => {
  const tenantId = getTenant(req);
  if (!tenantId) return res.status(400).json({ error: "tenant_required" });

  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.name, p.description, p.created_at,
       (SELECT COUNT(*)::int FROM product_keywords pk WHERE pk.product_id = p.id AND pk.status = 'active') AS keyword_count
     FROM products p WHERE p.tenant_id = $1 ORDER BY p.created_at DESC`,
    [tenantId],
  );
  return res.json({ products: result.rows });
});

// Create product
productsRouter.post("/", async (req: Request, res: Response) => {
  const tenantId = getTenant(req);
  if (!tenantId) return res.status(400).json({ error: "tenant_required" });

  const parsed = CreateProductSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "validation_error", issues: parsed.error.flatten().fieldErrors });

  const pool = getPool();
  const result = await pool.query<{ id: string }>(
    `INSERT INTO products (tenant_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
    [tenantId, parsed.data.name, parsed.data.description ?? null],
  );
  return res.status(201).json({ id: result.rows[0]?.id });
});

// Get product detail with keywords
productsRouter.get("/:id", async (req: Request, res: Response) => {
  const tenantId = getTenant(req);
  if (!tenantId || !UUID.test(req.params.id ?? ""))
    return res.status(400).json({ error: "invalid_request" });

  const pool = getPool();
  const pRes = await pool.query(
    `SELECT id, name, description, created_at FROM products WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, tenantId],
  );
  if (!pRes.rows[0]) return res.status(404).json({ error: "not_found" });

  const kwRes = await pool.query(
    `SELECT pk.id, pk.keyword, pk.search_volume, pk.status, pk.created_at,
       (SELECT COUNT(*)::int FROM raw_posts rp
        JOIN signalcraft_jobs sj ON rp.job_id = sj.id
        WHERE sj.tenant_id = $2 AND rp.keyword = pk.keyword
          AND rp.collected_at >= now() - interval '30 days') AS post_count_30d,
       (SELECT sj2.finished_at FROM signalcraft_jobs sj2
        WHERE sj2.tenant_id = $2 AND sj2.keyword = pk.keyword AND sj2.status = 'done'
        ORDER BY sj2.finished_at DESC LIMIT 1) AS last_analyzed
     FROM product_keywords pk
     WHERE pk.product_id = $1 AND pk.status != 'archived'
     ORDER BY pk.created_at ASC`,
    [req.params.id, tenantId],
  );

  return res.json({ product: pRes.rows[0], keywords: kwRes.rows });
});

// Update product
productsRouter.patch("/:id", async (req: Request, res: Response) => {
  const tenantId = getTenant(req);
  if (!tenantId || !UUID.test(req.params.id ?? ""))
    return res.status(400).json({ error: "invalid_request" });

  const parsed = UpdateProductSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_error" });

  const sets: string[] = [];
  const params: unknown[] = [req.params.id, tenantId];
  let i = 3;
  if (parsed.data.name) {
    sets.push(`name = $${i++}`);
    params.push(parsed.data.name);
  }
  if (parsed.data.description !== undefined) {
    sets.push(`description = $${i++}`);
    params.push(parsed.data.description);
  }
  if (sets.length === 0) return res.status(400).json({ error: "no_fields" });

  sets.push("updated_at = now()");
  const pool = getPool();
  await pool.query(
    `UPDATE products SET ${sets.join(", ")} WHERE id = $1 AND tenant_id = $2`,
    params,
  );
  return res.json({ ok: true });
});

// Delete product
productsRouter.delete("/:id", async (req: Request, res: Response) => {
  const tenantId = getTenant(req);
  if (!tenantId || !UUID.test(req.params.id ?? ""))
    return res.status(400).json({ error: "invalid_request" });

  const pool = getPool();
  await pool.query(`DELETE FROM products WHERE id = $1 AND tenant_id = $2`, [
    req.params.id,
    tenantId,
  ]);
  return res.json({ ok: true });
});

// Add keyword to product
productsRouter.post("/:id/keywords", async (req: Request, res: Response) => {
  const tenantId = getTenant(req);
  if (!tenantId || !UUID.test(req.params.id ?? ""))
    return res.status(400).json({ error: "invalid_request" });

  const parsed = AddKeywordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_error" });

  const pool = getPool();
  try {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO product_keywords (product_id, tenant_id, keyword, search_volume)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.params.id, tenantId, parsed.data.keyword, parsed.data.searchVolume ?? 0],
    );
    return res.status(201).json({ id: result.rows[0]?.id });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return res.status(409).json({ error: "keyword_exists" });
    }
    throw err;
  }
});

// Keyword timeline — 시계열 수치
productsRouter.get("/:id/keywords/:kwId/timeline", async (req: Request, res: Response) => {
  const tenantId = getTenant(req);
  if (!tenantId || !UUID.test(req.params.id ?? "") || !UUID.test(req.params.kwId ?? ""))
    return res.status(400).json({ error: "invalid_request" });

  const from =
    (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = (req.query.to as string) || new Date().toISOString().slice(0, 10);

  const pool = getPool();

  // 키워드 이름 확인
  const kwRes = await pool.query<{ keyword: string }>(
    `SELECT keyword FROM product_keywords WHERE id = $1 AND tenant_id = $2`,
    [req.params.kwId, tenantId],
  );
  if (!kwRes.rows[0]) return res.status(404).json({ error: "keyword_not_found" });

  const snap = await pool.query(
    `SELECT snapshot_date, post_count, sentiment_positive, sentiment_negative, sentiment_neutral,
            sov_share, sov_rank, mention_count, risk_count
       FROM keyword_snapshots
      WHERE product_keyword_id = $1 AND tenant_id = $2
        AND snapshot_date >= $3 AND snapshot_date <= $4
      ORDER BY snapshot_date ASC`,
    [req.params.kwId, tenantId, from, to],
  );

  // 요약 통계
  const points = snap.rows;
  const avgSentiment =
    points.length > 0
      ? points.reduce((s, r) => s + Number(r.sentiment_positive), 0) / points.length
      : 0;
  const firstSov = points.length > 0 ? Number(points[0].sov_share) : 0;
  const lastSov = points.length > 0 ? Number(points[points.length - 1]!.sov_share) : 0;
  const totalMentions = points.reduce((s, r) => s + Number(r.mention_count), 0);

  let sentimentTrend: "up" | "down" | "stable" = "stable";
  if (points.length >= 3) {
    const firstHalf = points.slice(0, Math.floor(points.length / 2));
    const secondHalf = points.slice(Math.floor(points.length / 2));
    const avgFirst =
      firstHalf.reduce((s, r) => s + Number(r.sentiment_positive), 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((s, r) => s + Number(r.sentiment_positive), 0) / secondHalf.length;
    if (avgSecond - avgFirst > 0.03) sentimentTrend = "up";
    else if (avgFirst - avgSecond > 0.03) sentimentTrend = "down";
  }

  return res.json({
    keyword: kwRes.rows[0].keyword,
    dataPoints: points,
    summary: {
      avgSentiment: Math.round(avgSentiment * 10000) / 10000,
      sentimentTrend,
      sovChange: Math.round((lastSov - firstSov) * 10000) / 10000,
      totalMentions,
    },
  });
});

// Keyword snapshot detail — 특정 날짜 전체 분석 결과
productsRouter.get("/:id/keywords/:kwId/snapshots/:date", async (req: Request, res: Response) => {
  const tenantId = getTenant(req);
  if (!tenantId || !UUID.test(req.params.kwId ?? ""))
    return res.status(400).json({ error: "invalid_request" });

  const pool = getPool();
  const snap = await pool.query(
    `SELECT * FROM keyword_snapshots
      WHERE product_keyword_id = $1 AND tenant_id = $2 AND snapshot_date = $3`,
    [req.params.kwId, tenantId, req.params.date],
  );
  if (!snap.rows[0]) return res.status(404).json({ error: "snapshot_not_found" });

  return res.json(snap.rows[0]);
});

// Manual analyze trigger — 수동 즉시 분석
productsRouter.post("/:id/keywords/:kwId/analyze", async (req: Request, res: Response) => {
  const tenantId = getTenant(req);
  if (!tenantId || !UUID.test(req.params.id ?? "") || !UUID.test(req.params.kwId ?? ""))
    return res.status(400).json({ error: "invalid_request" });

  const pool = getPool();
  const kwRes = await pool.query<{ keyword: string }>(
    `SELECT keyword FROM product_keywords WHERE id = $1 AND product_id = $2 AND tenant_id = $3 AND status = 'active'`,
    [req.params.kwId, req.params.id, tenantId],
  );
  if (!kwRes.rows[0]) return res.status(404).json({ error: "keyword_not_found" });

  const keyword = kwRes.rows[0].keyword;

  // Create signalcraft job
  const insert = await pool.query<{ id: string }>(
    `INSERT INTO signalcraft_jobs
       (tenant_id, keyword, regions, modules_requested, status, current_stage)
     VALUES ($1, $2, $3, $4, 'queued', 'stage1:queued')
     RETURNING id`,
    [tenantId, keyword, ["KR"], ["#01", "#03", "#06", "#07", "#08", "#13"]],
  );
  const jobId = insert.rows[0]?.id;
  if (!jobId) return res.status(500).json({ error: "job_insert_failed" });

  // Enqueue with productKeywordId for snapshot persistence
  const { getQueue, QUEUE_SIGNALCRAFT } = await import("../infra/queues.ts");
  const queue = getQueue(QUEUE_SIGNALCRAFT);
  await queue.add(
    "run",
    {
      signalcraftJobId: jobId,
      tenantId,
      keyword,
      regions: ["KR"],
      modules: ["#01", "#03", "#06", "#07", "#08", "#13"],
      productKeywordId: req.params.kwId,
    },
    { removeOnComplete: { count: 200 }, removeOnFail: { count: 500 } },
  );

  return res.status(202).json({ jobId, keyword, estimatedMinutes: 2 });
});

// Remove keyword
productsRouter.delete("/:productId/keywords/:kwId", async (req: Request, res: Response) => {
  const tenantId = getTenant(req);
  if (!tenantId) return res.status(400).json({ error: "tenant_required" });

  const pool = getPool();
  await pool.query(
    `UPDATE product_keywords SET status = 'archived', updated_at = now() WHERE id = $1 AND tenant_id = $2`,
    [req.params.kwId, tenantId],
  );
  return res.json({ ok: true });
});
