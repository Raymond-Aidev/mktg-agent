/**
 * Multi-module end-to-end test.
 * Verifies that #01 Macro View, #03 Sentiment, and #08 Summary all run
 * inside one SignalCraft pipeline pass, persist outputs, and record
 * llm_usage for each call. Uses a deterministic test provider that
 * dispatches canned JSON by schemaName.
 *
 * Run:
 *   DATABASE_URL=... pnpm --filter @eduright/api exec tsx src/cli/test-modules.ts [keyword]
 */
import { runPipeline } from "../signalcraft/pipeline.ts";
import { registerProvider } from "../llm/client.ts";
import { sentimentModuleConfig } from "../llm/modules/sentiment.ts";
import { macroViewModuleConfig } from "../llm/modules/macro-view.ts";
import { summaryModuleConfig } from "../llm/modules/summary.ts";
import { getPool, closePool } from "../infra/db.ts";
import type { LLMProvider, LLMRequest, LLMResponse } from "../llm/types.ts";

const TENANT = "00000000-0000-0000-0000-0000000000cc";
const KEYWORD = process.argv[2] ?? "children's books";

// Re-point all three modules at the test model so the real Anthropic
// SDK is never called.
sentimentModuleConfig.model = "mock-1";
macroViewModuleConfig.model = "mock-1";
summaryModuleConfig.model = "mock-1";

const FIXTURES: Record<string, string> = {
  SentimentSchema: JSON.stringify({
    sentimentRatio: { positive: 0.55, negative: 0.2, neutral: 0.25 },
    topKeywords: [
      { term: "kafka", count: 12, sentiment: "positive" },
      { term: "kids", count: 9, sentiment: "neutral" },
      { term: "education", count: 6, sentiment: "positive" },
    ],
    frameCompetition: [
      { label: "education vs entertainment", share: 0.6 },
      { label: "tech-friendly vs abstract risk", share: 0.4 },
    ],
    confidence: "medium",
    disclaimer: "Test fixture",
  }),
  MacroViewSchema: JSON.stringify({
    overallDirection: "mixed",
    summary:
      "수집된 데이터에서는 아동 도서에 대한 관심이 일관적으로 유지되었으나, 기술 친화적 콘텐츠 출시 시점에 강한 긍정 반응이 관찰되었다. 일부 전통주의 비판도 함께 등장했다. 전반적으로 시장은 새로운 형식 실험에 호의적이다.",
    inflectionPoints: [
      { date: "2025-12-15", event: "Apache Kafka 일러스트북 공개", impact: "high" },
      { date: "2026-02-03", event: "Soviet 컬렉터 아이템 화제", impact: "medium" },
    ],
    dailyMentionTrend: [
      { date: "2025-12-15", count: 24, sentiment: "positive" },
      { date: "2026-02-03", count: 18, sentiment: "neutral" },
    ],
    confidence: "medium",
    disclaimer: "Test fixture",
  }),
  SummarySchema: JSON.stringify({
    oneLiner: "기술 친화적 아동 도서가 출판 시장의 차세대 성장 축이다",
    keyTakeaways: [
      "기술-친화 형식(예: Kafka 일러스트북)에 대한 강한 긍정 반응 확인",
      "전통적 동화 vs 기술 친화 형식 사이의 프레임 경쟁 존재",
      "교육적 가치를 강조한 메시지가 수용도가 가장 높음",
    ],
    criticalActions: [
      { action: "기술 친화 아동 도서 라인업 사전 기획", priority: "high" },
      { action: "교육적 가치 중심의 마케팅 메시지 표준화", priority: "high" },
      { action: "전통주의 비판에 대한 대응 가이드 작성", priority: "medium" },
    ],
    confidence: "medium",
    disclaimer: "Test fixture",
  }),
};

const testProvider: LLMProvider = {
  name: "mock",
  async call(req: LLMRequest): Promise<LLMResponse> {
    const fixture = req.expectedSchemaName ? FIXTURES[req.expectedSchemaName] : null;
    if (!fixture) {
      throw new Error(`No test fixture for schema ${req.expectedSchemaName}`);
    }
    const inputChars = req.messages.reduce((s, m) => s + m.content.length, 0);
    return {
      content: fixture,
      inputTokens: Math.ceil(inputChars / 4),
      outputTokens: Math.ceil(fixture.length / 4),
      cachedInputTokens: 0,
      stopReason: "end_turn",
      latencyMs: 5,
    };
  },
};
registerProvider(testProvider);

const pool = getPool();

const insert = await pool.query<{ id: string }>(
  `INSERT INTO signalcraft_jobs
     (tenant_id, keyword, regions, modules_requested, status, current_stage)
   VALUES ($1, $2, $3, $4, 'queued', 'stage1:queued')
   RETURNING id`,
  [TENANT, KEYWORD, [], ["#01", "#03", "#08"]],
);
const jobId = insert.rows[0]?.id;
if (!jobId) throw new Error("failed to create job");
console.log("created signalcraft job:", jobId);

const result = await runPipeline({
  jobId,
  tenantId: TENANT,
  keyword: KEYWORD,
  regions: [],
});
console.log("pipeline result:", result);

const out = await pool.query(
  `SELECT module_id, status, attempts, duration_ms, model_name
     FROM signalcraft_module_outputs
    WHERE job_id = $1
    ORDER BY module_id`,
  [jobId],
);
console.log("--- module outputs ---");
out.rows.forEach((r) =>
  console.log(`  ${r.module_id}  status=${r.status}  attempts=${r.attempts}  ms=${r.duration_ms}`),
);

const usage = await pool.query(
  `SELECT module_id, model_name, input_tokens, output_tokens
     FROM llm_usage
    WHERE job_id = $1
    ORDER BY module_id`,
  [jobId],
);
console.log("--- llm_usage rows ---");
usage.rows.forEach((r) =>
  console.log(`  ${r.module_id}  ${r.model_name}  in=${r.input_tokens} out=${r.output_tokens}`),
);

console.log("--- summary one-liner ---");
const sum = await pool.query(
  `SELECT output->>'oneLiner' AS one_liner
     FROM signalcraft_module_outputs
    WHERE job_id = $1 AND module_id = '#08'`,
  [jobId],
);
console.log(`  "${sum.rows[0]?.one_liner ?? "(missing)"}"`);

// Cleanup
await pool.query("DELETE FROM signalcraft_jobs WHERE id = $1", [jobId]);
await pool.query("DELETE FROM llm_usage WHERE tenant_id = $1", [TENANT]);
await closePool();
console.log("DONE");
