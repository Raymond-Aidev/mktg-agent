/**
 * Direct handler test for competitors.
 * Run: DATABASE_URL=... pnpm --filter @eduright/api exec tsx src/cli/test-competitors.ts
 */
import { competitorsHandler } from "../batch/handlers/competitors.ts";
import { getPool, closePool } from "../infra/db.ts";

const fakeJob = { id: "manual", name: "competitors:weekly" } as never;
const fakeCtx = {
  jobId: "manual",
  jobName: "competitors:weekly",
  startedAt: Date.now(),
};

const pool = getPool();

const before = await pool.query<{ c: number }>("SELECT COUNT(*)::int AS c FROM competitors");
console.log("competitors rows before:", before.rows[0]?.c);

console.log("--- run #1 ---");
const r1 = await competitorsHandler(fakeJob, fakeCtx);
console.log("result:", r1);

const after1 = await pool.query<{ c: number }>("SELECT COUNT(*)::int AS c FROM competitors");
console.log("rows after run #1:", after1.rows[0]?.c);

console.log("--- run #2 (should be all noop) ---");
const r2 = await competitorsHandler(fakeJob, fakeCtx);
console.log("result:", r2);

const cl = await pool.query<{ c: number }>(
  "SELECT COUNT(*)::int AS c FROM change_log WHERE table_name='competitors'",
);
console.log("change_log rows:", cl.rows[0]?.c);

console.log("--- competitor summary ---");
const rows = await pool.query(
  `SELECT name, country,
          array_length(primary_genres, 1) AS genre_cnt,
          jsonb_array_length(recent_titles) AS titles_cnt
     FROM competitors
    ORDER BY name`,
);
rows.rows.forEach((r) => {
  console.log(
    `  ${r.name.padEnd(48)} ${String(r.country ?? "-").padEnd(4)} genres=${r.genre_cnt ?? 0} titles=${r.titles_cnt ?? 0}`,
  );
});

console.log("--- sample recent titles (Scholastic) ---");
const scholastic = await pool.query(
  `SELECT primary_genres, recent_titles
     FROM competitors
    WHERE name = 'Scholastic'`,
);
if (scholastic.rows[0]) {
  console.log("  top genres:", scholastic.rows[0].primary_genres?.slice(0, 5));
  const titles = scholastic.rows[0].recent_titles as {
    title: string;
    author: string | null;
    publishYear: number | null;
  }[];
  titles.slice(0, 5).forEach((t) => {
    console.log(`  - "${t.title}" by ${t.author ?? "?"} (${t.publishYear ?? "?"})`);
  });
}

await closePool();
console.log("DONE");
