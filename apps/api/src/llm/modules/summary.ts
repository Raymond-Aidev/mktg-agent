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
  role: "당신은 BLUF 원칙(Bottom Line Up Front)을 따르는 마케팅 전략 보고서 작가입니다. 판매 촉진 관점에서 실행 가능한 인사이트를 제공합니다.",
  task: [
    "1. 전체 분석을 한 문장으로 압축한 oneLiner를 30~50자 사이로 작성하라.",
    "   판매 기회와 핵심 리스크를 모두 포함해야 한다.",
    "2. 판매 담당자가 알아야 할 핵심 takeaway 3~5개를 간결한 문장으로 제시하라.",
    "   시장 기회, 고객 니즈, 경쟁 상황, 구매 장벽, 프로모션 기회를 포함하라.",
    "3. 즉시 실행해야 할 판매 촉진 과제(criticalActions) 3~5개를 priority(high/medium/low)와",
    "   함께 제안하라. 각 action은 동사로 시작하는 구체적 행동 지시여야 한다.",
    "   (예: '네이버 쇼핑 검색광고 세팅', '학부모 체험단 모집 공고 게시', '얼리버드 할인 프로모션 설계')",
    "4. 전체 분석 신뢰도(high/medium/low)와 필요 시 disclaimer를 첨부하라.",
    "5. 가능한 경우 upstreamResults의 #01 Macro View와 #03 Sentiment 결과를",
    "   인용하여 일관된 권고를 제시하라.",
  ].join("\n"),
  maxPosts: 15,
  maxOutputTokens: 1800,
  model: "claude-sonnet-4-6",
  temperature: 0.3,
  schema: SummarySchema,
  schemaName: "SummarySchema",
  outputExample: `{
  "oneLiner": "교육 콘텐츠에 대한 긍정 여론이 우세하나 가격 민감도에 주의 필요",
  "keyTakeaways": [
    "온라인 교육 콘텐츠에 대한 학부모 관심 증가 추세",
    "가격 대비 품질에 대한 논쟁이 주요 프레임"
  ],
  "criticalActions": [
    { "action": "학부모 대상 무료 체험 캠페인 기획", "priority": "high" },
    { "action": "가격 정당성 콘텐츠 제작 (교육 효과 데이터 활용)", "priority": "high" },
    { "action": "경쟁사 프로모션 동향 모니터링 강화", "priority": "medium" }
  ],
  "confidence": "medium"
}`,
};
