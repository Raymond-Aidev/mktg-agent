import express from "express";
import { env } from "./infra/env.ts";
import { getPool, closePool } from "./infra/db.ts";
import { getRedis, disconnectAllRedis } from "./infra/redis.ts";
import { closeAllQueues, listQueues } from "./infra/queues.ts";
import { startBatchWorker } from "./workers/batch.ts";
import { startSignalcraftWorker } from "./workers/signalcraft.ts";
import { mountBullBoard } from "./admin/bull-board.ts";
import { eventsRouter } from "./routes/events.ts";
import { emailWebhookRouter } from "./routes/email-webhook.ts";
import { adminBatchRouter } from "./routes/admin-batch.ts";
import { registerBatchSchedules } from "./batch/scheduler.ts";

const pg = env.DATABASE_URL ? getPool() : null;
const redis = env.REDIS_URL ? getRedis() : null;

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "eduright-api",
    phase: "Phase 1 — W03 data foundation",
    status: "ok",
  });
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

// Routes
app.use("/api/v1/events", eventsRouter);
app.use("/webhooks/email", emailWebhookRouter);
app.use("/admin/batch", adminBatchRouter);

// Admin UI (bull-board) — mounted only when Redis is available.
if (env.REDIS_URL) {
  try {
    mountBullBoard(app);
    console.log("[eduright-api] bull-board mounted at /admin/queues");
  } catch (err) {
    console.error("[eduright-api] bull-board mount failed:", (err as Error).message);
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
    console.log("[eduright-api] workers started: queue:batch, queue:signalcraft");
  } catch (err) {
    console.error("[eduright-api] worker start failed:", (err as Error).message);
  }

  // Register Category A cron repeats. Stable jobIds make this idempotent.
  registerBatchSchedules().catch((err) => {
    console.error("[eduright-api] scheduler register failed:", (err as Error).message);
  });
}

const server = app.listen(env.PORT, () => {
  console.log(`[eduright-api] listening on :${env.PORT}`);
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[eduright-api] ${signal} received, shutting down`);

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
