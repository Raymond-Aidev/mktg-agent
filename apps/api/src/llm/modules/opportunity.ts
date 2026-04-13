import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #06 — Market Intelligence.
 *
 * PRD v2.0 질문 매핑: "뭘 수정해야 하나?"
 *
 * Replaces the legacy SWOT framework with data-driven marketing
 * intelligence: SOV, positioning, content gap, risk signals.
 * All outputs are derivable from collected online mentions.
 */

export const OpportunitySchema = z.object({
  shareOfVoice: z
    .array(
      z.object({
        brand: z.string().max(100),
        mentions: z.number().int().min(0),
        sentimentPositive: z.number().min(0).max(1),
        isOurs: z.boolean(),
      }),
    )
    .min(2)
    .max(8),
  positioning: z
    .array(
      z.object({
        brand: z.string().max(100),
        mentionVolume: z.number().int().min(0),
        positiveRate: z.number().min(0).max(1),
        distinctKeyword: z.string().max(100),
      }),
    )
    .min(2)
    .max(8),
  contentGaps: z
    .array(
      z.object({
        topic: z.string().max(200),
        competitorActivity: z.string().max(300),
        ourStatus: z.enum(["absent", "weak", "moderate"]),
        suggestedAction: z.string().max(300),
        estimatedImpact: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(1)
    .max(5),
  riskSignals: z
    .array(
      z.object({
        signal: z.string().max(200),
        severity: z.enum(["critical", "warning", "watch"]),
        evidence: z.string().max(300),
        suggestedResponse: z.string().max(300),
      }),
    )
    .max(5),
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
  title: "Market Intelligence",
  role: "당신은 교육 콘텐츠 시장의 온라인 마케팅 데이터를 분석하는 시장 정보 분석가입니다.",
  task: [
    "1. Share of Voice(SOV) 분석: 수집된 게시물에서 언급된 브랜드/제품별 언급량과 긍정률을 산출하라.",
    "   반드시 2개 이상의 브랜드를 비교하고, 우리 제품은 isOurs=true로 표시하라.",
    "2. 포지셔닝 맵: 각 브랜드/제품의 언급량(mentionVolume)과 긍정률(positiveRate)을 산출하라.",
    "   각 브랜드를 대표하는 핵심 연관 키워드(distinctKeyword)를 1개씩 식별하라.",
    "3. 콘텐츠 갭 분석: 경쟁사가 다루고 있지만 우리가 다루지 않는 토픽/채널을 최대 5개 식별하라.",
    "   각 갭에 대해 경쟁사 활동 내용, 우리의 현재 상태(absent/weak/moderate), 제안 액션, 예상 영향도를 제시하라.",
    "4. 리스크 시그널: 부정 여론 급등, 경쟁사 공격적 캠페인, 규제 변화 등 위험 신호를 감지하라.",
    "   심각도(critical/warning/watch), 근거, 대응 방안을 제시하라.",
    "5. 경쟁사 약점 분석: 경쟁사의 약점과 우리의 잠재 우위를 비교하라. 최대 5개.",
    "6. 모든 수치는 실제 수집된 데이터에서 산출하라. 추측 금지.",
    "7. upstreamResults의 #03 Sentiment 결과가 있으면 감정 분포와 키워드를 참조하라.",
  ].join("\n"),
  maxPosts: 15,
  maxOutputTokens: 3000,
  model: "claude-sonnet-4-6",
  temperature: 0.3,
  schema: OpportunitySchema,
  schemaName: "OpportunitySchema",
  outputExample: `{
  "shareOfVoice": [
    { "brand": "우리 제품", "mentions": 28, "sentimentPositive": 0.68, "isOurs": true },
    { "brand": "경쟁사 A", "mentions": 15, "sentimentPositive": 0.45, "isOurs": false }
  ],
  "positioning": [
    { "brand": "우리 제품", "mentionVolume": 28, "positiveRate": 0.68, "distinctKeyword": "교육 효과" },
    { "brand": "경쟁사 A", "mentionVolume": 15, "positiveRate": 0.45, "distinctKeyword": "가격 경쟁" }
  ],
  "contentGaps": [
    {
      "topic": "학부모 후기 영상 콘텐츠",
      "competitorActivity": "경쟁사 A가 유튜브에서 학부모 인터뷰 시리즈 운영 (월 4회)",
      "ourStatus": "absent",
      "suggestedAction": "학부모 리뷰 숏폼 영상 시리즈 런칭",
      "estimatedImpact": "high"
    }
  ],
  "riskSignals": [
    {
      "signal": "가격 인상에 대한 부정 여론 급증",
      "severity": "warning",
      "evidence": "최근 7일간 가격 관련 부정 게시물 8건 (이전 대비 3배)",
      "suggestedResponse": "가격 대비 가치 콘텐츠 선제 배포 + FAQ 업데이트"
    }
  ],
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
