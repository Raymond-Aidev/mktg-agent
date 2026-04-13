import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getPool } from "../infra/db.ts";
import type { JwtPayload } from "../infra/auth.ts";

function requireAdmin(req: Request, res: Response): JwtPayload | null {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "admin_required" });
    return null;
  }
  return user;
}

const CreateUserSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(100),
  name: z.string().max(200).optional(),
  role: z.enum(["owner", "admin", "member"]).optional(),
  tenantId: z.string().uuid().optional(),
});

const UpdateRoleSchema = z.object({
  role: z.enum(["owner", "admin", "member"]),
});

export const adminUsersRouter: ExpressRouter = Router();

// List all users
adminUsersRouter.get("/", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const pool = getPool();
  const result = await pool.query(
    `SELECT id, tenant_id, email, name, role, created_at, updated_at
     FROM users ORDER BY created_at DESC`,
  );
  return res.json({ total: result.rowCount, users: result.rows });
});

// Create user (admin can assign tenant and role)
adminUsersRouter.post("/", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "validation_error", issues: parsed.error.flatten().fieldErrors });

  const { email, password, name, role, tenantId } = parsed.data;
  const pool = getPool();

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    return res.status(409).json({ error: "email_exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const finalTenantId = tenantId ?? crypto.randomUUID();

  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (tenant_id, email, password, name, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [finalTenantId, email, hashedPassword, name ?? null, role ?? "member"],
  );

  return res.status(201).json({ id: result.rows[0]?.id, tenantId: finalTenantId });
});

// Update user role
adminUsersRouter.patch("/:id/role", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const parsed = UpdateRoleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_error" });

  const pool = getPool();
  await pool.query(`UPDATE users SET role = $1, updated_at = now() WHERE id = $2`, [
    parsed.data.role,
    req.params.id,
  ]);
  return res.json({ ok: true });
});

// Delete user
adminUsersRouter.delete("/:id", async (req: Request, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (req.params.id === admin.userId) {
    return res.status(400).json({ error: "cannot_delete_self" });
  }

  const pool = getPool();
  await pool.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
  return res.json({ ok: true });
});

// System stats for admin dashboard
adminUsersRouter.get("/stats", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const pool = getPool();
  const [users, products, keywords, jobs, reports] = await Promise.all([
    pool.query<{ count: string }>("SELECT COUNT(*)::int as count FROM users"),
    pool.query<{ count: string }>("SELECT COUNT(*)::int as count FROM products"),
    pool.query<{ count: string }>(
      "SELECT COUNT(*)::int as count FROM product_keywords WHERE status = 'active'",
    ),
    pool.query<{ count: string; done: string; failed: string }>(
      `SELECT COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE status = 'done')::int as done,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed
       FROM signalcraft_jobs WHERE created_at >= now() - interval '7 days'`,
    ),
    pool.query<{ count: string }>("SELECT COUNT(*)::int as count FROM reports"),
  ]);

  return res.json({
    users: Number(users.rows[0]?.count ?? 0),
    products: Number(products.rows[0]?.count ?? 0),
    activeKeywords: Number(keywords.rows[0]?.count ?? 0),
    jobs7d: {
      total: Number(jobs.rows[0]?.count ?? 0),
      done: Number(jobs.rows[0]?.done ?? 0),
      failed: Number(jobs.rows[0]?.failed ?? 0),
    },
    reports: Number(reports.rows[0]?.count ?? 0),
  });
});
