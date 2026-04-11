import express from "express";
import { Pool } from "pg";
import { Redis } from "ioredis";

const PORT = Number(process.env.PORT ?? 8080);
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;

const pg = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, max: 5 }) : null;

const redis = REDIS_URL
  ? new Redis(REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true })
  : null;

const app = express();

app.get("/", (_req, res) => {
  res.json({
    name: "eduright-api",
    phase: "Phase 0 — W01/W02 scaffold",
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

  const allOk = Object.values(checks).every((c) => c.ok);
  res.status(allOk ? 200 : 503).json({ status: allOk ? "ok" : "degraded", checks });
});

const server = app.listen(PORT, () => {
  console.log(`[eduright-api] listening on :${PORT}`);
});

const shutdown = async (signal: string) => {
  console.log(`[eduright-api] ${signal} received, shutting down`);
  server.close();
  await pg?.end().catch(() => {});
  redis?.disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
