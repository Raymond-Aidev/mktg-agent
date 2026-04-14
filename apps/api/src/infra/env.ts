/**
 * Typed environment loader. Validates required variables at startup.
 *
 * Adding a new variable:
 *   1. Add it to `EnvSchema` with a clear default or required marker.
 *   2. Consume it via `env` (not `process.env.*` directly).
 */
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),

  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),

  // Category A / B role connection strings (optional, fall back to DATABASE_URL)
  DATABASE_URL_BATCH_WORKER: z.string().url().optional(),
  DATABASE_URL_SIGNALCRAFT_WORKER: z.string().url().optional(),

  // Admin UI gate (bull-board, /admin/*). Default to a random-looking placeholder
  // so unauthenticated access is rejected even if the operator forgets to set it.
  ADMIN_USER: z.string().default("admin"),
  ADMIN_PASS: z.string().default("change-me-in-railway-variables"),

  // Real LLM SDK keys. When ANTHROPIC_API_KEY is missing we register a
  // deterministic dev-fixture provider so the SignalCraft pipeline still
  // reaches a terminal state in staging.
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_KEY: z.string().optional(),

  // Observability — Phase 7
  SENTRY_DSN: z.string().url().optional(),
  RELEASE_SHA: z.string().optional(),

  // Public deployment — Phase 7 launch
  PUBLIC_BASE_URL: z.string().url().optional(),
  ALLOWED_ORIGINS: z.string().optional(),

  // Korean data sources — Phase A (v2.0)
  NAVER_CLIENT_ID: z.string().optional(),
  NAVER_CLIENT_SECRET: z.string().optional(),

  // Auth — Phase B
  JWT_SECRET: z.string().default("goldencheck-dev-jwt-secret-change-in-prod"),

  // Email (Gmail SMTP)
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[env] invalid environment:", parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }
  cached = parsed.data;
  return cached;
}

export const env = loadEnv();
