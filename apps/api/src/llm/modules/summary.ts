import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #08 — Executive Summary (BLUF).
 *
 * Tech Spec §4.2 ROLE: 경영진 보고서 작가
 * Tech Spec §4.2 TASK: BLUF 원칙 적용, 30~50자 한 줄 요약, 즉시 실행
 *                       과제 3~5개
 *
 * Reads upstream results from #01 Macro View and #03 Sentiment when
 * available so the executive summary stays consistent with the rest of
 * the report.
 */

export const SummarySchema = z.object({
  oneLiner: z.string().min(15).max(80),
  keyTakeaways: z.array(z.string().min(10).max(200)).min(2).max(5),
  criticalActions: z
    .array(
      z.object({
        action: z.string().min(5).max(200),
        priority: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(3)
    .max(5),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(500).optional(),
});

export type SummaryOutput = z.infer<typeof SummarySchema>;

export const summaryModuleConfig: ModuleConfig<SummaryOutput> = {
  id: "#08",
  title: "Executive Summary (BLUF)",
  role: "당신은 BLUF 원칙(Bottom Line Up Front)을 따르는 경영진 보고서 작가입니다.",
  task: [
    "1. 전체 분석을 한 문장으로 압축한 oneLiner를 30~50자 사이로 작성하라.",
    "2. 의사결정자가 알아야 할 핵심 takeaway 2~5개를 간결한 문장으로 제시하라.",
    "3. 즉시 실행해야 할 과제(criticalActions) 3~5개를 priority(high/medium/low)와",
    "   함께 제안하라. 각 action은 동사로 시작하는 행동 지시여야 한다.",
    "4. 전체 분석 신뢰도(high/medium/low)와 필요 시 disclaimer를 첨부하라.",
    "5. 가능한 경우 upstreamResults의 #01 Macro View와 #03 Sentiment 결과를",
    "   인용하여 일관된 권고를 제시하라.",
  ].join("\n"),
  maxPosts: 25,
  maxOutputTokens: 1200,
  model: "claude-sonnet-4-6",
  temperature: 0.3,
  schema: SummarySchema,
  schemaName: "SummarySchema",
};
