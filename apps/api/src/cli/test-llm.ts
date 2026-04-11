/**
 * End-to-end smoke test for the LLM wrapper:
 *   1. Issue a callModel() call using the mock provider.
 *   2. Verify the response.
 *   3. Confirm llm_usage received a row with the expected tenant/module/model.
 *
 * Run: DATABASE_URL=... pnpm --filter @eduright/api exec tsx src/cli/test-llm.ts
 */
import { callModel } from "../llm/client.ts";
import { getPool, closePool } from "../infra/db.ts";

const TENANT = "00000000-0000-0000-0000-00000000beef";
const JOB_ID = "00000000-0000-0000-0000-00000000cafe";

const pool = getPool();

// Clean any prior test rows so the assertion is deterministic.
await pool.query("DELETE FROM llm_usage WHERE tenant_id = $1", [TENANT]);

const before = await pool.query<{ c: number }>(
  "SELECT COUNT(*)::int AS c FROM llm_usage WHERE tenant_id = $1",
  [TENANT],
);
console.log("before count:", before.rows[0]?.c);

const res = await callModel(
  {
    model: "mock-1",
    messages: [
      { role: "system", content: "You are a test harness." },
      {
        role: "user",
        content: "Return a short echo so the cost path is exercised.",
      },
    ],
    maxOutputTokens: 64,
  },
  {
    tenantId: TENANT,
    jobId: JOB_ID,
    moduleId: "#00-test",
  },
);

console.log("response content:", res.content);
console.log("tokens: in=%d out=%d latency=%dms", res.inputTokens, res.outputTokens, res.latencyMs);

const after = await pool.query(
  `SELECT model_name, module_id, input_tokens, output_tokens, cost_usd
     FROM llm_usage
    WHERE tenant_id = $1
    ORDER BY id DESC
    LIMIT 1`,
  [TENANT],
);
console.log("llm_usage row:", after.rows[0]);

if (!after.rows[0] || after.rows[0].model_name !== "mock-1") {
  throw new Error("assertion failed: llm_usage row not recorded correctly");
}
if (after.rows[0].input_tokens !== res.inputTokens) {
  throw new Error("assertion failed: input_tokens mismatch");
}

// Cleanup
await pool.query("DELETE FROM llm_usage WHERE tenant_id = $1", [TENANT]);
await closePool();
console.log("OK");
