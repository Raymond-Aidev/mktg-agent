import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getPool } from "../infra/db.ts";
import { signToken, type JwtPayload } from "../infra/auth.ts";
import { sendPasswordResetEmail } from "../infra/mailer.ts";

const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다")
  .max(100)
  .regex(/[a-z]/, "소문자를 1자 이상 포함해야 합니다")
  .regex(/[A-Z]/, "대문자를 1자 이상 포함해야 합니다")
  .regex(/[0-9]/, "숫자를 1자 이상 포함해야 합니다")
  .regex(/[^a-zA-Z0-9]/, "특수문자를 1자 이상 포함해야 합니다");

const RegisterSchema = z.object({
  email: z.string().email().max(200),
  password: passwordSchema,
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

/* ─── Password Reset ─── */

const RESET_TOKEN_EXPIRY_HOURS = 1;

authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error" });
  }

  const pool = getPool();
  const result = await pool.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [
    parsed.data.email,
  ]);

  // 이메일 존재 여부와 무관하게 동일한 응답 (타이밍 공격 방지)
  if (!result.rows[0]) {
    return res.json({ message: "재설정 링크가 이메일로 발송되었습니다" });
  }

  const userId = result.rows[0].id;
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // 기존 미사용 토큰 무효화
  await pool.query(
    "UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL",
    [userId],
  );

  await pool.query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );

  await sendPasswordResetEmail(parsed.data.email, token);

  return res.json({
    message: "재설정 링크가 이메일로 발송되었습니다",
    // 개발 환경에서만 토큰 노출
    ...(process.env.NODE_ENV !== "production" && { resetToken: token }),
  });
});

authRouter.post("/verify-reset-token", async (req: Request, res: Response) => {
  const parsed = z.object({ token: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error" });
  }

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const pool = getPool();

  const result = await pool.query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM password_resets
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );

  if (!result.rows[0]) {
    return res
      .status(400)
      .json({ error: "invalid_token", message: "유효하지 않거나 만료된 토큰입니다" });
  }

  return res.json({ valid: true });
});

authRouter.post("/reset-password", async (req: Request, res: Response) => {
  const parsed = z
    .object({ token: z.string().min(1), password: passwordSchema })
    .safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation_error", issues: parsed.error.flatten().fieldErrors });
  }

  const { token, password } = parsed.data;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const pool = getPool();

  const result = await pool.query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM password_resets
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );

  if (!result.rows[0]) {
    return res
      .status(400)
      .json({ error: "invalid_token", message: "유효하지 않거나 만료된 토큰입니다" });
  }

  const { id: resetId, user_id: userId } = result.rows[0];
  const hashedPassword = await bcrypt.hash(password, 12);

  await pool.query("UPDATE users SET password = $1, updated_at = now() WHERE id = $2", [
    hashedPassword,
    userId,
  ]);
  await pool.query("UPDATE password_resets SET used_at = now() WHERE id = $1", [resetId]);

  return res.json({ message: "비밀번호가 성공적으로 변경되었습니다" });
});
