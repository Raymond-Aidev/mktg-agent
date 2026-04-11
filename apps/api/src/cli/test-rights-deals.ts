/**
 * Direct (no BullMQ) end-to-end test of the rights_deals handler.
 * Run: DATABASE_URL=... pnpm --filter @eduright/api exec tsx src/cli/test-rights-deals.ts
 */
import { rightsDealsHandler } from "../batch/handlers/rights-deals.ts";
import { getPool, closePool } from "../infra/db.ts";

const fakeJob = { id: "manual", name: "rights-deals:daily" } as never;
const fakeCtx = {
  jobId: "manual",
  jobName: "rights-deals:daily",
  startedAt: Date.now(),
};

const pool = getPool();

// Snapshot before
const before = await pool.query<{ c: number }>("SELECT COUNT(*)::int AS c FROM rights_deals");
console.log("rights_deals rows before:", before.rows[0]?.c);

console.log("--- run #1 ---");
const r1 = await rightsDealsHandler(fakeJob, fakeCtx);
console.log("result:", r1);

const after1 = await pool.query<{ c: number }>("SELECT COUNT(*)::int AS c FROM rights_deals");
console.log("rows after run #1:", after1.rows[0]?.c);

const cl1 = await pool.query<{ c: number }>(
  "SELECT COUNT(*)::int AS c FROM change_log WHERE table_name='rights_deals'",
);
console.log("change_log rows after #1:", cl1.rows[0]?.c);

console.log("--- run #2 (should be all noop, no new change_log) ---");
const r2 = await rightsDealsHandler(fakeJob, fakeCtx);
console.log("result:", r2);

const after2 = await pool.query<{ c: number }>("SELECT COUNT(*)::int AS c FROM rights_deals");
console.log("rows after run #2:", after2.rows[0]?.c);

const cl2 = await pool.query<{ c: number }>(
  "SELECT COUNT(*)::int AS c FROM change_log WHERE table_name='rights_deals'",
);
console.log("change_log rows after #2:", cl2.rows[0]?.c);

console.log("--- sample row ---");
const sample = await pool.query(
  `SELECT source_uid, title, author, isbn, original_lang, last_seen_at, updated_at
     FROM rights_deals ORDER BY collected_at DESC LIMIT 1`,
);
console.log(sample.rows[0]);

await closePool();
console.log("DONE");
