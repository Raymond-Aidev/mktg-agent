/**
 * KPI bundle end-to-end test.
 *   1. Pure unit assertions for calcLeadScore + expected revenue
 *   2. Inserts sample events / email_events / llm_usage rows for a tenant
 *   3. Calls each query function and prints the shape
 *   4. Cleanup
 *
 * Run:
 *   DATABASE_URL=... pnpm --filter @eduright/api exec tsx src/cli/test-kpis.ts
 */
import { calcLeadScore } from "../kpis/lead-score.ts";
import {
  calcExpectedRevenueKRW,
  loadFxToKrw,
  probabilityFromScore,
} from "../kpis/expected-revenue.ts";
import {
  getAdoptionStats,
  getCampaignStats,
  getLlmCostByModel,
  getWeeklyActiveUsers,
} from "../kpis/queries.ts";
import { getPool, closePool } from "../infra/db.ts";

const TENANT = "00000000-0000-0000-0000-0000000000ee";
const USER1 = "00000000-0000-0000-0000-0000000000e1";
const CAMPAIGN = "00000000-0000-0000-0000-000000000c01";
const BUYER1 = "00000000-0000-0000-0000-000000000b01";
const BUYER2 = "00000000-0000-0000-0000-000000000b02";

console.log("--- 1. calcLeadScore ---");
const hot = calcLeadScore({
  buyerGenres: ["children", "education"],
  sellerGenres: ["children", "education", "fantasy"],
  buyerLanguages: ["en", "ko"],
  sellerLanguages: ["en", "ko", "ja"],
  lastDealYear: 2025,
  contactCount12m: 6,
  country: "US",
  marketSizeIndex: { US: 1.0, JP: 0.7, DE: 0.6 },
  emailEngagement: 1.0,
});
console.log("  hot lead:", hot);

const cold = calcLeadScore({
  buyerGenres: ["sports"],
  sellerGenres: ["children"],
  buyerLanguages: ["fr"],
  sellerLanguages: ["en"],
  lastDealYear: null,
  contactCount12m: 0,
  country: null,
  marketSizeIndex: {},
  emailEngagement: 0,
});
console.log("  cold lead:", cold);

if (hot.total <= cold.total) {
  throw new Error(`expected hot > cold, got hot=${hot.total} cold=${cold.total}`);
}

console.log("--- 2. expectedRevenue ---");
const fxFake = { USD: 1483.27, EUR: 1737.89, KRW: 1 };
const expected = calcExpectedRevenueKRW(
  [
    { leadScore: 85, stage: "negotiation", currency: "USD" },
    { leadScore: 65, stage: "proposal_sent", currency: "EUR" },
    { leadScore: 45, stage: "meeting_scheduled", currency: "KRW" },
  ],
  fxFake,
);
console.log("  expectedRevenueKRW:", expected.toLocaleString());
console.log("  hot probability:", probabilityFromScore(85));

console.log("--- 3. seed sample data ---");
const pool = getPool();

// clean any prior data
await pool.query("DELETE FROM email_events WHERE tenant_id = $1", [TENANT]);
await pool.query("DELETE FROM events WHERE tenant_id = $1", [TENANT]);
await pool.query("DELETE FROM llm_usage WHERE tenant_id = $1", [TENANT]);
await pool.query("DELETE FROM buyers WHERE source_uid LIKE 'test-kpi-%'", []);

// seed two buyers so email_events FK is satisfied
await pool.query(
  `INSERT INTO buyers (id, source_uid, tenant_id, company_name, fingerprint)
   VALUES ($1, 'test-kpi-1', $3, 'Test Buyer One', 'fp-test-1'),
          ($2, 'test-kpi-2', $3, 'Test Buyer Two', 'fp-test-2')`,
  [BUYER1, BUYER2, TENANT],
);

// email_events: 3 sent, 2 opened, 1 clicked
await pool.query(
  `INSERT INTO email_events (tenant_id, campaign_id, buyer_id, event_type, occurred_at)
   VALUES
     ($1, $2, $3, 'email.sent',    now() - interval '5 days'),
     ($1, $2, $4, 'email.sent',    now() - interval '5 days'),
     ($1, $2, $3, 'email.sent',    now() - interval '5 days'),
     ($1, $2, $3, 'email.opened',  now() - interval '4 days'),
     ($1, $2, $4, 'email.opened',  now() - interval '4 days'),
     ($1, $2, $3, 'email.clicked', now() - interval '3 days')`,
  [TENANT, CAMPAIGN, BUYER1, BUYER2],
);

// events: 3 accepted, 2 rejected for marketing/pitch_deck
await pool.query(
  `INSERT INTO events (tenant_id, user_id, event_type, payload, occurred_at)
   VALUES
     ($1, $2, 'agent_output_accepted', '{"agent":"marketing","output_type":"pitch_deck"}'::jsonb, now() - interval '2 days'),
     ($1, $2, 'agent_output_accepted', '{"agent":"marketing","output_type":"pitch_deck"}'::jsonb, now() - interval '2 days'),
     ($1, $2, 'agent_output_accepted', '{"agent":"marketing","output_type":"pitch_deck"}'::jsonb, now() - interval '1 days'),
     ($1, $2, 'agent_output_rejected', '{"agent":"marketing","output_type":"pitch_deck"}'::jsonb, now() - interval '1 days'),
     ($1, $2, 'agent_output_rejected', '{"agent":"marketing","output_type":"pitch_deck"}'::jsonb, now() - interval '1 days')`,
  [TENANT, USER1],
);

// WAU event today
await pool.query(
  `INSERT INTO events (tenant_id, user_id, event_type, payload, occurred_at)
   VALUES ($1, $2, 'signalcraft_started', '{}'::jsonb, now())`,
  [TENANT, USER1],
);

// llm_usage: two model calls
await pool.query(
  `INSERT INTO llm_usage
     (tenant_id, model_name, input_tokens, output_tokens,
      price_per_input_token, price_per_output_token, called_at)
   VALUES
     ($1, 'claude-sonnet-4-6', 1000, 500, 0.000003, 0.000015, now() - interval '2 days'),
     ($1, 'gemini-2.5-flash',  4000, 800, 0.000000075, 0.0000003, now() - interval '1 days')`,
  [TENANT],
);

console.log("--- 4. query functions ---");
const campaigns = await getCampaignStats(pool, TENANT);
console.log("  campaigns:", campaigns);

const adoption = await getAdoptionStats(pool, TENANT);
console.log("  adoption:", adoption);

const wau = await getWeeklyActiveUsers(pool, TENANT);
console.log("  wau:", wau);

const llmCost = await getLlmCostByModel(pool, TENANT);
console.log("  llmCost:", llmCost);

const fx = await loadFxToKrw(pool);
console.log("  fxToKrw (live from fx_rates):", fx);

// cleanup
await pool.query("DELETE FROM email_events WHERE tenant_id = $1", [TENANT]);
await pool.query("DELETE FROM events WHERE tenant_id = $1", [TENANT]);
await pool.query("DELETE FROM llm_usage WHERE tenant_id = $1", [TENANT]);
await pool.query("DELETE FROM buyers WHERE source_uid LIKE 'test-kpi-%'", []);
await closePool();
console.log("DONE");
