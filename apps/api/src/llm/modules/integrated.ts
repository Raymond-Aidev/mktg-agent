import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #13 — Integrated Report.
 *
 * Tech Spec §4.2 ROLE: 리포트 편집장
 * Tech Spec §4.2 TASK: 12개 모듈 결과를 피라미드 원칙으로 재구성, 중복
 *                       통합, 출처 부록 자동 생성
 *
 * #13 always runs last. It receives every prior module's output via
 * ctx.upstreamResults and is responsible for producing the final
 * sections array that the report renderer (Phase 5 §3.2) consumes.
 */

const SECTION_ID = /^section-\d{1,3}$/;

export const IntegratedSchema = z.object({
  title: z.string().min(5).max(200),
  sections: z
    .array(
      z.object({
        id: z.string().regex(SECTION_ID),
        title: z.string().min(1).max(120),
        content: z.string().min(1).max(5000),
        sourceModule: z.string().max(20).optional(),
      }),
    )
    .min(1)
    .max(20),
  metadata: z.object({
    keyword: z.string().min(1).max(200),
    generatedAt: z.string(),
    modulesUsed: z.array(z.string().max(20)).max(14),
  }),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(800).optional(),
});

export type IntegratedOutput = z.infer<typeof IntegratedSchema>;

export const integratedModuleConfig: ModuleConfig<IntegratedOutput> = {
  id: "#13",
  title: "Integrated Report",
  role: "당신은 SignalCraft 리포트 편집장입니다. 피라미드 원칙(BLUF)으로 마케팅 분석 보고서를 구성합니다.",
  task: [
    "ctx.upstreamResults에 있는 모든 선행 모듈 결과를 종합하여 아래 13개 섹션을 반드시 작성하라.",
    "각 section의 content에는 해당 모듈의 데이터를 JSON이 아닌 **한국어 서술형 텍스트**로 작성한다.",
    "",
    "필수 섹션 (순서 및 sourceModule 정확히 지킬 것):",
    'section-1: "핵심 요약 (Executive Summary)" sourceModule="#08" — oneLiner + keyTakeaways 5개 + criticalActions',
    'section-2: "시장 여론 동향 (Macro View)" sourceModule="#01" — overallDirection + summary + dailyMentionTrend',
    'section-3: "감성 분석 (Sentiment Analysis)" sourceModule="#03" — sentimentRatio + topKeywords',
    'section-4: "주요 변곡점 (Inflection Points)" sourceModule="#01" — inflectionPoints 목록',
    'section-5: "SOV 점유율 분석 (Share of Voice)" sourceModule="#06" — shareOfVoice + positioning',
    'section-6: "콘텐츠 갭 분석" sourceModule="#06" — contentGaps 각 항목 설명',
    'section-7: "리스크 시그널" sourceModule="#06" — riskSignals 각 항목',
    'section-8: "경쟁사 갭 분석" sourceModule="#06" — competitorGaps',
    'section-9: "메시지 전략 (Message Strategy)" sourceModule="#07" — messageStrategy',
    'section-10: "콘텐츠 전략 (Content Calendar)" sourceModule="#07" — weeklyTopics',
    'section-11: "채널 우선순위" sourceModule="#07" — channelPriority',
    'section-12: "리스크 완화 방안" sourceModule="#07" — riskMitigation',
    'section-13: "즉시 실행 과제 (Critical Actions)" sourceModule="#08" — criticalActions 우선순위별 정리',
    "",
    "해당 모듈이 실패한 경우 그 섹션의 content에 '데이터 수집 부족으로 분석 불가'라고 적어라.",
    "원문에 없는 사실을 만들지 마라. 선행 모듈 결과만 인용·재구성하라.",
  ].join("\n"),
  maxPosts: 10,
  maxOutputTokens: 6000,
  model: "claude-sonnet-4-6",
  temperature: 0.2,
  schema: IntegratedSchema,
  schemaName: "IntegratedSchema",
  outputExample: `{
  "title": "GoldenCheck SignalCraft — 토토LP 교육 통합 리포트",
  "sections": [
    { "id": "section-1", "title": "핵심 요약 (Executive Summary)", "content": "토토LP는 ...", "sourceModule": "#08" },
    { "id": "section-2", "title": "시장 여론 동향 (Macro View)", "content": "전체적으로 ...", "sourceModule": "#01" },
    { "id": "section-3", "title": "감성 분석 (Sentiment Analysis)", "content": "긍정 62% ...", "sourceModule": "#03" },
    { "id": "section-4", "title": "주요 변곡점 (Inflection Points)", "content": "2026-04-09 ...", "sourceModule": "#01" },
    { "id": "section-5", "title": "SOV 점유율 분석 (Share of Voice)", "content": "토토LP 35% ...", "sourceModule": "#06" },
    { "id": "section-6", "title": "콘텐츠 갭 분석", "content": "학부모 체험 후기 ...", "sourceModule": "#06" },
    { "id": "section-7", "title": "리스크 시그널", "content": "가격 저항 ...", "sourceModule": "#06" },
    { "id": "section-8", "title": "경쟁사 갭 분석", "content": "경쟁사 A는 ...", "sourceModule": "#06" },
    { "id": "section-9", "title": "메시지 전략 (Message Strategy)", "content": "핵심 메시지 ...", "sourceModule": "#07" },
    { "id": "section-10", "title": "콘텐츠 전략 (Content Calendar)", "content": "월요일 블로그 ...", "sourceModule": "#07" },
    { "id": "section-11", "title": "채널 우선순위", "content": "네이버 블로그 9/10 ...", "sourceModule": "#07" },
    { "id": "section-12", "title": "리스크 완화 방안", "content": "가격 저항 → ...", "sourceModule": "#07" },
    { "id": "section-13", "title": "즉시 실행 과제 (Critical Actions)", "content": "HIGH: ...", "sourceModule": "#08" }
  ],
  "metadata": { "keyword": "토토LP 교육", "generatedAt": "2026-04-14T00:00:00.000Z", "modulesUsed": ["#01","#03","#06","#07","#08","#13"] },
  "confidence": "medium"
}`,
};
