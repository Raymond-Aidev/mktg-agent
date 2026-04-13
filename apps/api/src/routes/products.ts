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
