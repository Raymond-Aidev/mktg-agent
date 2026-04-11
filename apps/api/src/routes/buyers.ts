import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getPool } from "../infra/db.ts";

/**
 * GET /api/v1/buyers?tenantId=...&limit=50&offset=0&sort=lead_score
 *
 * Returns the buyer list scoped to a tenant. Phase 1 schema makes
 * tenant_id nullable so we include rows where (tenant_id = $1 OR
 * tenant_id IS NULL) — the latter cover globally-shared buyers
 * collected by Category A crawlers.
 */

const QuerySchema = z.object({
  tenantId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["lead_score", "company_name", "country", "updated_at"]).optional(),
});

export const buyersRouter: ExpressRouter = Router();

buyersRouter.get("/", async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_query",
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  const { tenantId, limit = 50, offset = 0, sort = "lead_score" } = parsed.data;

  const orderBy = {
    lead_score: "lead_score DESC NULLS LAST, company_name ASC",
    company_name: "company_name ASC",
    country: "country ASC NULLS LAST, company_name ASC",
    updated_at: "updated_at DESC",
  }[sort];

  const pool = getPool();
  try {
    const total = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::int AS c
         FROM buyers
        WHERE (tenant_id = $1 OR tenant_id IS NULL)
          AND is_stale = false`,
      [tenantId],
    );

    const rows = await pool.query(
      `SELECT id, source_uid, company_name, country, city, contact_name,
              contact_email::text AS contact_email, genres, languages,
              lead_score, last_contacted, source_url, updated_at
         FROM buyers
        WHERE (tenant_id = $1 OR tenant_id IS NULL)
          AND is_stale = false
        ORDER BY ${orderBy}
        LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset],
    );

    return res.json({
      tenantId,
      limit,
      offset,
      total: Number(total.rows[0]?.c ?? 0),
      buyers: rows.rows,
    });
  } catch (err) {
    console.error("[buyers] query failed:", (err as Error).message);
    return res.status(500).json({ error: "internal_error" });
  }
});
