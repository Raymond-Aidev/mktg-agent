import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initSentry, captureException } from "./infra/sentry.ts";

// Initialize Sentry FIRST so its instrumentation can patch other modules.
initSentry();

import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./infra/env.ts";
import { getPool, closePool } from "./infra/db.ts";
import { httpRequestDuration } from "./infra/metrics.ts";
import { getRedis, disconnectAllRedis } from "./infra/redis.ts";
import { closeAllQueues, listQueues } from "./infra/queues.ts";
import { startBatchWorker } from "./workers/batch.ts";
import { startSignalcraftWorker } from "./workers/signalcraft.ts";
import { mountBullBoard } from "./admin/bull-board.ts";
import { eventsRouter } from "./routes/events.ts";
import { emailWebhookRouter } from "./routes/email-webhook.ts";
import { adminBatchRouter } from "./routes/admin-batch.ts";
import { signalcraftRouter } from "./routes/signalcraft.ts";
import { reportsRouter } from "./routes/reports.ts";
import { dashboardRouter } from "./routes/dashboard.ts";
import { dashboardV2Router } from "./routes/dashboard-v2.ts";
import { actionsRouter } from "./routes/actions.ts";
import { competitorsV2Router } from "./routes/competitors-v2.ts";
import { channelsRouter } from "./routes/channels.ts";
import { buyersRouter } from "./routes/buyers.ts";
import { operatorRouter } from "./routes/operator.ts";
import { metricsRouter } from "./routes/metrics.ts";
import { legalRouter } from "./routes/legal.ts";
import { campaignsRouter } from "./routes/campaigns.ts";
import { authRouter } from "./routes/auth.ts";
import { productsRouter } from "./routes/products.ts";
import { authMiddleware } from "./infra/auth.ts";
import { registerBatchSchedules } from "./batch/scheduler.ts";
import { registerDevFixtureProviders } from "./llm/providers/dev-fixture.ts";

const pg = env.DATABASE_URL ? getPool() : null;
const redis = env.REDIS_URL ? getRedis() : null;

// Register development fixture LLM providers when real API keys are absent.
// Once ANTHROPIC_API_KEY lands in Railway Variables the real provider will
// be registered and this override can be removed.
if (!env.ANTHROPIC_API_KEY) {
  registerDevFixtureProviders();
  console.log("[goldencheck-api] dev-fixture LLM providers registered (no real keys)");
}

const app = express();

// Security headers — Phase 7 launch hardening.
// CSP is relaxed because the SPA inlines styles from vite and bull-board
// injects its own runtime bundle; tighten further once both use hashed nonces.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:"],
        "frame-ancestors": ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS — allow the public site origin + optional additional allowlist.
// ALLOWED_ORIGINS is a comma-separated list. When neither PUBLIC_BASE_URL
// nor ALLOWED_ORIGINS is set, CORS is effectively same-origin (dev).
const allowList = new Set<string>();
if (env.PUBLIC_BASE_URL) allowList.add(env.PUBLIC_BASE_URL);
if (env.ALLOWED_ORIGINS) {
  for (const o of env.ALLOWED_ORIGINS.split(",")) {
    const trimmed = o.trim();
    if (trimmed) allowList.add(trimmed);
  }
}
app.use(
  cors({
    origin: (origin, cb) => {
      // Same-origin or tool requests (Postman etc.) have no Origin header.
      if (!origin) return cb(null, true);
      if (allowList.size === 0 || allowList.has(origin)) return cb(null, true);
      return cb(new Error(`origin ${origin} not allowed`));
    },
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
  }),
);

app.use(express.json({ limit: "1mb" }));

// http_request_duration_seconds histogram middleware. Recorded for all
// routes; we strip query strings and substitute :id-style placeholders so
// label cardinality stays bounded.
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route =
      (req.route?.path as string | undefined) ?? req.path.replace(/\/[0-9a-f-]{36}/g, "/:id");
    httpRequestDuration
      .labels({ method: req.method, route, status: String(res.statusCode) })
      .observe(seconds);
  });
  next();
});

// Lightweight identity endpoint used by health checks and the build pipeline.
// The SPA takes over "/" when its static bundle is available (see below).
app.get("/api", (_req, res) => {
  res.json({
    name: "goldencheck-api",
    brand: "GoldenCheck",
    phase: "Phase 7 — W22 observability",
    status: "ok",
  });
});

// Admin-only one-off Sentry smoke test. Hits this after deploying a new
// SENTRY_DSN to verify the SDK is wired end-to-end. Behind basic auth so
// random visitors can't spam the issue feed.
app.get("/admin/sentry-test", (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="goldencheck-admin"');
    res.status(401).send("auth required");
    return;
  }
  try {
    throw new Error("Sentry smoke test from /admin/sentry-test — expected error, safe to close.");
  } catch (err) {
    next(err);
  }
});

app.get("/health", async (_req, res) => {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  if (pg) {
    try {
      const r = await pg.query("SELECT 1 AS ok");
      checks.postgres = { ok: r.rows[0]?.ok === 1 };
    } catch (err) {
      checks.postgres = { ok: false, detail: (err as Error).message };
    }
  } else {
    checks.postgres = { ok: false, detail: "DATABASE_URL not set" };
  }

  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      const pong = await redis.ping();
      checks.redis = { ok: pong === "PONG" };
    } catch (err) {
      checks.redis = { ok: false, detail: (err as Error).message };
    }
  } else {
    checks.redis = { ok: false, detail: "REDIS_URL not set" };
  }

  // Queue depth as a lightweight liveness signal (not gating health status).
  try {
    const queues = listQueues();
    const counts = await Promise.all(queues.map((q) => q.getJobCounts()));
    checks.queues = {
      ok: true,
      detail: queues
        .map((q, i) => {
          const c = counts[i];
          if (!c) return `${q.name}:n/a`;
          return `${q.name}:w=${c.waiting ?? 0},a=${c.active ?? 0},f=${c.failed ?? 0}`;
        })
        .join(" "),
    };
  } catch (err) {
    checks.queues = { ok: false, detail: (err as Error).message };
  }

  const coreOk = checks.postgres?.ok && checks.redis?.ok;
  res.status(coreOk ? 200 : 503).json({ status: coreOk ? "ok" : "degraded", checks });
});

// Auth — public routes (no JWT required)
app.use("/api/v1/auth", authRouter);

// JWT middleware — extracts user from Authorization header for all routes below
app.use(authMiddleware);

// Routes
app.use("/api/v1/events", eventsRouter);
app.use("/api/v1/signalcraft", signalcraftRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v2/dashboard", dashboardV2Router);
app.use("/api/v2/actions", actionsRouter);
app.use("/api/v2/dashboard/competitors", competitorsV2Router);
app.use("/api/v2/dashboard/channels", channelsRouter);
app.use("/api/v1/buyers", buyersRouter);
app.use("/api/v1/campaigns", campaignsRouter);
app.use("/api/v1/products", productsRouter);
app.use("/webhooks/email", emailWebhookRouter);
app.use("/admin/batch", adminBatchRouter);
app.use("/admin/operator", operatorRouter);
app.use("/metrics", metricsRouter);
app.use("/", legalRouter);

// Express error handler — captures whatever fell through to Sentry and
// returns a generic 500 to the client.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[express:error]", err.message);
  captureException(err);
  if (!res.headersSent) {
    res.status(500).json({ error: "internal_error" });
  }
});

// Admin UI (bull-board) — mounted only when Redis is available.
if (env.REDIS_URL) {
  try {
    mountBullBoard(app);
    console.log("[goldencheck-api] bull-board mounted at /admin/queues");
  } catch (err) {
    console.error("[goldencheck-api] bull-board mount failed:", (err as Error).message);
  }
}

// --------------------------------------------------------------------------
// Static SPA — serve apps/web/dist when the build output is present.
// Missing in dev mode (tsx src/index.ts) when the web build has not been
// produced yet; in that case '/' returns the JSON identity instead and
// developers typically run `pnpm --filter @eduright/web dev` on :5173.
// --------------------------------------------------------------------------
{
  const here = dirname(fileURLToPath(import.meta.url));
  const webDist = resolve(here, "../../web/dist");
  const webIndex = join(webDist, "index.html");
  if (existsSync(webIndex) && statSync(webIndex).isFile()) {
    app.use(express.static(webDist, { index: false, maxAge: "1h" }));
    app.get(
      /^\/(?!api\/|admin\/|webhooks\/|health|metrics|terms|privacy|about|pricing).*/,
      (_req, res) => {
        res.sendFile(webIndex);
      },
    );
    console.log(`[goldencheck-api] serving SPA from ${webDist}`);
  } else {
    console.log(
      `[goldencheck-api] SPA dist not found at ${webDist} — run 'pnpm --filter @eduright/web build'`,
    );
  }
}

// Start BullMQ workers in-process (Phase 1 deployment model: single Railway
// service runs the API and both workers). We split into a dedicated workers
// service later if CPU/memory pressure demands it.
let batchWorker: ReturnType<typeof startBatchWorker> | null = null;
let signalcraftWorker: ReturnType<typeof startSignalcraftWorker> | null = null;
if (env.REDIS_URL) {
  try {
    batchWorker = startBatchWorker();
    signalcraftWorker = startSignalcraftWorker();
    console.log("[goldencheck-api] workers started: queue:batch, queue:signalcraft");
  } catch (err) {
    console.error("[goldencheck-api] worker start failed:", (err as Error).message);
  }

  // Register Category A cron repeats. Stable jobIds make this idempotent.
  registerBatchSchedules().catch((err) => {
    console.error("[goldencheck-api] scheduler register failed:", (err as Error).message);
  });
}

const server = app.listen(env.PORT, () => {
  console.log(`[goldencheck-api] listening on :${env.PORT}`);
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[goldencheck-api] ${signal} received, shutting down`);

  server.close();

  await Promise.allSettled([
    batchWorker?.close(),
    signalcraftWorker?.close(),
    closeAllQueues(),
    closePool(),
  ]);

  await disconnectAllRedis();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
