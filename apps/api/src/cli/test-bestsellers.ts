/**
 * Direct handler test for bestsellers.
 * Run: DATABASE_URL=... pnpm --filter @eduright/api exec tsx src/cli/test-bestsellers.ts
 */
import { bestsellersHandler } from "../batch/handlers/bestsellers.ts";
import { getPool, closePool } from "../infra/db.ts";

const fakeJob = { id: "manual", name: "bestsellers:daily" } as never;
const fakeCtx = {
  jobId: "manual",
  jobName: "bestsellers:daily",
  startedAt: Date.now(),
};

const pool = getPool();

const before = await pool.query<{ c: number }>("SELECT COUNT(*)::int AS c FROM bestsellers");
console.log("bestsellers rows before:", before.rows[0]?.c);

console.log("--- run #1 ---");
const r1 = await bestsellersHandler(fakeJob, fakeCtx);
console.log("result:", r1);

const after1 = await pool.query<{ c: number }>("SELECT COUNT(*)::int AS c FROM bestsellers");
console.log("rows after run #1:", after1.rows[0]?.c);

const cl1 = await pool.query<{ c: number }>(
  "SELECT COUNT(*)::int AS c FROM change_log WHERE table_name='bestsellers'",
);
console.log("change_log rows after #1:", cl1.rows[0]?.c);

console.log("--- run #2 (same day, identical ranking should be all noop) ---");
const r2 = await bestsellersHandler(fakeJob, fakeCtx);
console.log("result:", r2);

const cl2 = await pool.query<{ c: number }>(
  "SELECT COUNT(*)::int AS c FROM change_log WHERE table_name='bestsellers'",
);
console.log("change_log rows after #2:", cl2.rows[0]?.c);

console.log("--- top 5 ---");
const top = await pool.query(
  `SELECT rank, title, author, edition_count FROM (
     SELECT rank, title, author, (payload->>'editionCount')::int AS edition_count
       FROM bestsellers
      WHERE region='global' AND category='children'
      ORDER BY rank ASC
      LIMIT 5
   ) t`,
);
top.rows.forEach((r) => {
  console.log(
    `  #${r.rank}  ${r.title}  —  ${r.author ?? "(n/a)"}  (${r.edition_count ?? "?"} editions)`,
  );
});

await closePool();
console.log("DONE");
