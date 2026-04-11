/**
 * Direct handler test for market_trends.
 * Run: DATABASE_URL=... pnpm --filter @eduright/api exec tsx src/cli/test-market-trends.ts
 */
import { marketTrendsHandler } from "../batch/handlers/market-trends.ts";
import { getPool, closePool } from "../infra/db.ts";

const fakeJob = { id: "manual", name: "market-trends:daily" } as never;
const fakeCtx = {
  jobId: "manual",
  jobName: "market-trends:daily",
  startedAt: Date.now(),
};

const pool = getPool();

const before = await pool.query<{ c: number }>("SELECT COUNT(*)::int AS c FROM market_trends");
console.log("market_trends rows before:", before.rows[0]?.c);

console.log("--- run #1 ---");
const r1 = await marketTrendsHandler(fakeJob, fakeCtx);
console.log("result:", r1);

const after1 = await pool.query<{ c: number }>("SELECT COUNT(*)::int AS c FROM market_trends");
console.log("rows after run #1:", after1.rows[0]?.c);

console.log("--- run #2 (same window → all noop) ---");
const r2 = await marketTrendsHandler(fakeJob, fakeCtx);
console.log("result:", r2);

const cl = await pool.query<{ c: number }>(
  "SELECT COUNT(*)::int AS c FROM change_log WHERE table_name='market_trends'",
);
console.log("change_log rows:", cl.rows[0]?.c);

console.log("--- topics ranked by score ---");
const top = await pool.query(
  `SELECT topic, score, observed_at, payload->>'avg7d' AS avg_7d,
          payload->>'total14d' AS total_14d
     FROM market_trends
    ORDER BY score DESC`,
);
top.rows.forEach((r) => {
  console.log(`  ${r.topic.padEnd(24)} score=${r.score} avg7d=${r.avg_7d} total14d=${r.total_14d}`);
});

await closePool();
console.log("DONE");
