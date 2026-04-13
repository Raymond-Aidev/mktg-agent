import type { ModuleConfig, ModuleContext } from "./types.ts";
import type { LLMMessage } from "../types.ts";

/**
 * Build the 4-part prompt for a SignalCraft module per Tech Spec §4.1.
 *
 *   ## ROLE
 *   ## INPUT          (keyword, dateRange, postCount, upstreamResults, posts)
 *   ## TASK
 *   ## CONSTRAINTS    (always includes the no-hallucination clause)
 *   ## OUTPUT FORMAT  (Zod schema name + literal JSON shape requirement)
 *
 * The system message carries the immutable safety/constraints text and
 * the JSON-only output instruction. The user message carries the volatile
 * INPUT block. Splitting like this lets the prompt cache hit on system
 * messages even when raw_posts change between runs.
 */

export interface BuildOptions {
  config: ModuleConfig<unknown>;
  context: ModuleContext;
}

function formatPostForPrompt(p: ModuleContext["rawPosts"][number]): string {
  const lines = [
    `[${p.source}] author=${p.author ?? "?"} likes=${p.likes} comments=${p.commentsCnt}`,
    p.url ? `url: ${p.url}` : null,
    p.content.slice(0, 600),
  ].filter(Boolean);
  return lines.join("\n");
}

function formatDateRange(posts: ModuleContext["rawPosts"]): string {
  const dates = posts
    .map((p) => p.publishedAt)
    .filter((d): d is Date => d instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return "(unknown)";
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (!first || !last) return "(unknown)";
  return `${first.toISOString().slice(0, 10)} → ${last.toISOString().slice(0, 10)}`;
}

export function buildModuleMessages(opts: BuildOptions): LLMMessage[] {
  const { config, context } = opts;
  const sample = context.rawPosts.slice(0, config.maxPosts);
  const dateRange = formatDateRange(context.rawPosts);

  const system = [
    `## ROLE`,
    config.role,
    ``,
    `## CONSTRAINTS`,
    `- 실제 수집된 데이터에서만 근거를 찾을 것. 존재하지 않는 사실 생성 금지.`,
    `- 모든 추정값에는 confidence(high/medium/low)를 반드시 포함할 것.`,
    `- 아래 OUTPUT FORMAT의 JSON 스키마를 정확히 따를 것. 추가 필드 금지.`,
    ``,
    `## OUTPUT FORMAT`,
    `반드시 아래 JSON 구조를 정확히 따를 것. 필드명은 영어 camelCase 그대로 사용.`,
    `JSON 외의 텍스트, 마크다운 코드펜스, 설명, 주석은 절대 포함하지 말 것.`,
    `응답 전체가 { 로 시작하고 } 로 끝나는 순수 JSON이어야 한다.`,
    ``,
    `예시 구조 (값은 실제 분석 결과로 채울 것):`,
    config.outputExample,
  ].join("\n");

  const user = [
    `## INPUT`,
    `분석 키워드: ${context.keyword}`,
    `수집 기간: ${dateRange}`,
    `수집 건수: ${context.rawPosts.length}건 (이번 호출 샘플: ${sample.length}건)`,
    `이전 단계 결과: ${JSON.stringify(context.upstreamResults).slice(0, 1500)}`,
    ``,
    `원문 데이터 샘플:`,
    sample.map(formatPostForPrompt).join("\n---\n"),
    ``,
    `## TASK`,
    config.task,
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
