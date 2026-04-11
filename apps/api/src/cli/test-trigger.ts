/**
 * Manual end-to-end test for the master_row_update trigger.
 * Run: DATABASE_URL=... pnpm --filter @eduright/api exec tsx src/cli/test-trigger.ts
 */
import { Client } from "pg";

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

await c.query("DELETE FROM change_log WHERE table_name='buyers'");
await c.query("DELETE FROM buyers WHERE source_uid='test-trigger-1'");

await c.query(`
  INSERT INTO buyers (source_uid, company_name, country, genres, fingerprint)
  VALUES ('test-trigger-1', 'Test Publisher', 'US', ARRAY['children'], 'fp-v1')
`);

// Case 1: same fingerprint → name change should be ignored by the trigger
await c.query("UPDATE buyers SET company_name='IGNORED' WHERE source_uid='test-trigger-1'");
const case1 = await c.query(
  `SELECT company_name, (updated_at = collected_at) AS unchanged,
          (last_seen_at >= collected_at) AS observed
     FROM buyers WHERE source_uid='test-trigger-1'`,
);
console.log("Case 1 (same fp):", case1.rows[0]);

const logsAfter1 = await c.query(
  "SELECT COUNT(*)::int AS c FROM change_log WHERE table_name='buyers'",
);
console.log("  change_log rows after case 1:", logsAfter1.rows[0].c);

// Case 2: fingerprint change → diff recorded, updated_at bumped
await c.query(
  "UPDATE buyers SET company_name='New Name', fingerprint='fp-v2' WHERE source_uid='test-trigger-1'",
);
const case2 = await c.query(
  `SELECT company_name, (updated_at > collected_at) AS bumped
     FROM buyers WHERE source_uid='test-trigger-1'`,
);
console.log("Case 2 (new fp):", case2.rows[0]);

const logs = await c.query(
  "SELECT diff FROM change_log WHERE table_name='buyers' ORDER BY id DESC LIMIT 1",
);
console.log("Change log diff:", JSON.stringify(logs.rows[0]?.diff, null, 2));

// Cleanup
await c.query("DELETE FROM buyers WHERE source_uid='test-trigger-1'");
await c.query("DELETE FROM change_log WHERE table_name='buyers'");
await c.end();

console.log("OK");
