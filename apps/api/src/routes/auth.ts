import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getPool } from "../infra/db.ts";
import { signToken, type JwtPayload } from "../infra/auth.ts";

const RegisterSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(100),
  name: z.string().max(200).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRouter: ExpressRouter = Router();

authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation_error", issues: parsed.error.flatten().fieldErrors });
  }

  const { email, password, name } = parsed.data;
  const pool = getPool();

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    return res
      .status(409)
      .json({ error: "email_exists", message: "This email is already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const tenantId = crypto.randomUUID();

  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (tenant_id, email, password, name, role)
     VALUES ($1, $2, $3, $4, 'owner')
     RETURNING id`,
    [tenantId, email, hashedPassword, name ?? null],
  );

  const userId = result.rows[0]?.id;
  if (!userId) {
    return res.status(500).json({ error: "internal_error" });
  }

  const token = signToken({ userId, tenantId, email, role: "owner" });

  return res.status(201).json({
    token,
    user: { id: userId, tenantId, email, name: name ?? null, role: "owner" },
  });
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error" });
  }

  const { email, password } = parsed.data;
  const pool = getPool();

  const result = await pool.query<{
    id: string;
    tenant_id: string;
    email: string;
    password: string;
    name: string | null;
    role: string;
  }>("SELECT id, tenant_id, email, password, name, role FROM users WHERE email = $1", [email]);

  const user = result.rows[0];
  if (!user) {
    return res
      .status(401)
      .json({ error: "invalid_credentials", message: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res
      .status(401)
      .json({ error: "invalid_credentials", message: "Invalid email or password" });
  }

  const token = signToken({
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

authRouter.get("/me", (req: Request, res: Response) => {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return res.json({ user });
});
