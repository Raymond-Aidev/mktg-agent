import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import basicAuth from "express-basic-auth";
import { env } from "../infra/env.ts";
import { getPool } from "../infra/db.ts";
import { listQueues } from "../infra/queues.ts";
import { snapshot as circuitBreakerSnapshot } from "../batch/circuit-breaker.ts";

/**
 * Operator overview endpoint — single round-trip for the admin dashboard.
 *
 *   GET /admin/operator/overview
 *
 * Includes:
 *   - System health snapshot (postgres reachable, redis reachable)
 *   - Category A dataset freshness (per master table)
 *   - Recent crawler failures (last 24h, top 10)
 *   - BullMQ queue counts (batch + signalcraft)
 *   - LLM cost summary (last 7 days, all tenants)
 *   - SignalCraft job statistics (last 24h)
 *
 * Protected by basic auth (same as /admin/queues, /admin/batch).
 */

const auth = basicAuth({
  users: { [env.ADMIN_USER]: env.ADMIN_PASS },
  challenge: true,
  realm: "eduright-admin",
});

export const operatorRouter: ExpressRouter = Router();
operatorRouter.use(auth);

const CATEGORY_A_TABLES = ["buyers", "competitors", "market_trends", "rights_deals", "bestsellers"];

operatorRouter.get("/overview", async (_req: Request, res: Response) => {
  const pool = getPool();
  try {
    // Health probe
    const healthStart = Date.now();
    const pgOk = await pool
      .query("SELECT 1")
      .then(() => true)
      .catch(() => false);
    const pgLatencyMs = Date.now() - healthStart;

    // Per-table freshness — the most recent last_seen_at + row count
    const tableStats: Array<{
      table: string;
      rowCount: number;
      newestLastSeen: string | null;
      oldestLastSeen: string | null;
      staleCount: number;
    }> = [];
    for (const t of CATEGORY_A_TABLES) {
      try {
        const r = await pool.query<{
          row_count: string;
          newest: Date | null;
          oldest: Date | null;
          stale_count: string;
        }>(
          `SELECT COUNT(*)::int                  AS row_count,
                  MAX(last_seen_at)              AS newest,
                  MIN(last_seen_at)              AS oldest,
                  COUNT(*) FILTER (WHERE is_stale = true)::int AS stale_count
             FROM ${t}`,
        );
        const row = r.rows[0];
        tableStats.push({
          table: t,
          rowCount: Number(row?.row_count ?? 0),
          newestLastSeen: row?.newest?.toISOString() ?? null,
          oldestLastSeen: row?.oldest?.toISOString() ?? null,
          staleCount: Number(row?.stale_count ?? 0),
        });
      } catch (err) {
        tableStats.push({
          table: t,
          rowCount: -1,
          newestLastSeen: null,
          oldestLastSeen: null,
          staleCount: -1,
        });
        console.error(`[operator] table ${t} stats failed:`, (err as Error).message);
      }
    }

    // fx_rates is special (append-only, no last_seen_at)
    try {
      const r = await pool.query<{ row_count: string; newest: Date | null }>(
        `SELECT COUNT(*)::int AS row_count, MAX(observed_at) AS newest FROM fx_rates`,
      );
      tableStats.push({
        table: "fx_rates",
        rowCount: Number(r.rows[0]?.row_count ?? 0),
        newestLastSeen: r.rows[0]?.newest?.toISOString() ?? null,
        oldestLastSeen: null,
        staleCount: 0,
      });
    } catch {
      // ignore
    }

    // Recent crawler failures (last 24h)
    const failures = await pool.query<{
      source: string;
      error_code: string | null;
      error_msg: string | null;
      attempt: number;
      failed_at: Date;
    }>(
      `SELECT source, error_code, error_msg, attempt, failed_at
         FROM crawler_failures
        WHERE failed_at >= now() - interval '24 hours'
        ORDER BY failed_at DESC
        LIMIT 10`,
    );

    // Queue counts
    const queueCounts: Record<string, Record<string, number>> = {};
    let redisOk = true;
    try {
      const queues = listQueues();
      const counts = await Promise.all(queues.map((q) => q.getJobCounts()));
      for (let i = 0; i < queues.length; i++) {
        const q = queues[i];
        const c = counts[i];
        if (q && c) {
          queueCounts[q.name] = {
            waiting: Number(c.waiting ?? 0),
            active: Number(c.active ?? 0),
            completed: Number(c.completed ?? 0),
            failed: Number(c.failed ?? 0),
            delayed: Number(c.delayed ?? 0),
          };
        }
      }
    } catch (err) {
      redisOk = false;
      console.error("[operator] queue counts failed:", (err as Error).message);
    }

    // LLM cost summary (last 7 days, all tenants)
    const llmCost = await pool.query<{
      model_name: string;
      total_calls: string;
      total_input: string;
      total_output: string;
      cost_usd: string;
    }>(
      `SELECT model_name,
              COUNT(*)::int             AS total_calls,
              SUM(input_tokens)::bigint AS total_input,
              SUM(output_tokens)::bigint AS total_output,
              COALESCE(SUM(cost_usd), 0)::numeric AS cost_usd
         FROM llm_usage
        WHERE called_at >= now() - interval '7 days'
        GROUP BY model_name
        ORDER BY cost_usd DESC`,
    );

    // SignalCraft job statistics (last 24h)
    const jobStats = await pool.query<{
      status: string;
      c: string;
    }>(
      `SELECT status, COUNT(*)::int AS c
         FROM signalcraft_jobs
        WHERE created_at >= now() - interval '24 hours'
        GROUP BY status`,
    );
    const signalcraftJobs: Record<string, number> = {};
    for (const r of jobStats.rows) signalcraftJobs[r.status] = Number(r.c);

    // Circuit breakers (best-effort — table may be empty on first deploy).
    let circuitBreakers: Awaited<ReturnType<typeof circuitBreakerSnapshot>> = [];
    try {
      circuitBreakers = await circuitBreakerSnapshot();
    } catch (err) {
      console.error("[operator] circuit breakers failed:", (err as Error).message);
    }

    return res.json({
      health: {
        postgres: { ok: pgOk, latencyMs: pgLatencyMs },
        redis: { ok: redisOk },
      },
      datasets: tableStats,
      crawlerFailures: failures.rows.map((r) => ({
        source: r.source,
        errorCode: r.error_code,
        errorMsg: r.error_msg?.slice(0, 200) ?? null,
        attempt: r.attempt,
        failedAt: r.failed_at.toISOString(),
      })),
      queues: queueCounts,
      circuitBreakers,
      llmCost: llmCost.rows.map((r) => ({
        modelName: r.model_name,
        totalCalls: Number(r.total_calls),
        totalInputTokens: Number(r.total_input),
        totalOutputTokens: Number(r.total_output),
        costUsd: Number(r.cost_usd),
      })),
      signalcraftJobs,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[operator] overview failed:", (err as Error).message);
    return res.status(500).json({ error: "internal_error" });
  }
});
