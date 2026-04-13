import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #06 — Opportunity.
 *
 * PRD v2.0 질문 매핑: "뭘 수정해야 하나?"
 * Tech Spec v2.0 §4.2: 부정 여론 속 긍정 자산 발굴, SWOT 관점 기회 도출
 *
 * Reads upstream #03 Sentiment results to identify untapped areas
 * where negative sentiment reveals unmet needs or where competitor
 * weaknesses create openings.
 */

export const OpportunitySchema = z.object({
  untappedAreas: z
    .array(
      z.object({
        area: z.string().min(5).max(200),
        evidence: z.string().min(10).max(500),
        estimatedImpact: z.enum(["high", "medium", "low"]),
        suggestedAction: z.string().min(10).max(300),
      }),
    )
    .min(1)
    .max(5),
  swotSummary: z.object({
    strengths: z.array(z.string().max(200)).max(5),
    weaknesses: z.array(z.string().max(200)).max(5),
    opportunities: z.array(z.string().max(200)).max(5),
    threats: z.array(z.string().max(200)).max(5),
  }),
  competitorGaps: z
    .array(
      z.object({
        competitor: z.string().max(100),
        gap: z.string().max(200),
        ourAdvantage: z.string().max(200),
      }),
    )
    .max(5),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(500).optional(),
});

export type OpportunityOutput = z.infer<typeof OpportunitySchema>;

export const opportunityModuleConfig: ModuleConfig<OpportunityOutput> = {
  id: "#06",
  title: "Opportunity / SWOT",
  role: "당신은 교육 콘텐츠 시장의 마케팅 기회를 발굴하는 전략 분석가입니다.",
  task: [
    "1. 수집된 데이터에서 아직 충족되지 않은 소비자 니즈(untapped areas)를 최대 5개 발굴하라.",
    "   각 영역에 대해 근거(evidence), 예상 영향도(high/medium/low), 구체적 실행 제안(suggestedAction)을 제시하라.",
    "2. 현재 브랜드/키워드의 SWOT 분석을 수행하라.",
    "   각 항목(strengths, weaknesses, opportunities, threats) 최대 5개씩.",
    "3. 데이터에서 언급된 경쟁사(또는 경쟁 제품/서비스)의 약점과 우리의 잠재 우위를 비교하라.",
    "   competitorGaps 최대 5개.",
    "4. 분석 신뢰도(high/medium/low)와 필요 시 disclaimer를 첨부하라.",
    "5. upstreamResults의 #03 Sentiment 결과가 있으면 감정 분포와 키워드를 참조하여",
    "   기회 영역을 도출하라.",
  ].join("\n"),
  maxPosts: 30,
  maxOutputTokens: 2500,
  model: "claude-sonnet-4-6",
  temperature: 0.3,
  schema: OpportunitySchema,
  schemaName: "OpportunitySchema",
  outputExample: `{
  "untappedAreas": [
    {
      "area": "학부모 대상 무료 체험 콘텐츠 부재",
      "evidence": "블로그/카페에서 '무료 체험' 키워드와 함께 불만 12건 관찰",
      "estimatedImpact": "high",
      "suggestedAction": "7일 무료 체험판 출시 + 네이버 블로그 체험단 모집"
    }
  ],
  "swotSummary": {
    "strengths": ["교육 전문성에 대한 긍정 여론 우세"],
    "weaknesses": ["가격 민감도 높은 학부모층 대응 부족"],
    "opportunities": ["정부 교육 투자 확대에 따른 시장 성장"],
    "threats": ["대형 에듀테크 업체의 공격적 프로모션"]
  },
  "competitorGaps": [
    {
      "competitor": "경쟁사 A",
      "gap": "모바일 학습 UX 불편 관련 불만 다수",
      "ourAdvantage": "모바일 최적화된 콘텐츠 제공 가능"
    }
  ],
  "confidence": "medium"
}`,
};
