import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #12 — Success Simulation.
 *
 * Tech Spec §4.2 ROLE: 전략 컨설턴트
 * Tech Spec §4.2 TASK: 11개 선행 분석 결과 종합, 베이지안 추론으로 전략
 *                      성공 확률 0~100% 산출
 *
 * 본 모듈은 원본 rawPosts를 거의 사용하지 않고 upstreamResults의
 * 구조화된 출력을 통합한다. 단일 "successProbability" 점수가 아니라
 * 시나리오별 확률 분포 + 주요 레버 + 민감도 분석을 제공.
 */

export const SuccessSimSchema = z.object({
  baselineProbability: z.number().min(0).max(1),
  scenarios: z
    .array(
      z.object({
        label: z.string().max(120),
        description: z.string().max(300),
        probability: z.number().min(0).max(1),
        expectedRoi: z.enum(["strong_positive", "positive", "neutral", "negative"]),
        keyAssumptions: z.array(z.string().max(200)).min(1).max(5),
      }),
    )
    .min(3)
    .max(5),
  bayesianEvidence: z
    .array(
      z.object({
        sourceModule: z.string().max(20),
        signal: z.string().max(200),
        directionEffect: z.enum(["raises", "lowers", "neutral"]),
        weight: z.number().min(0).max(1),
      }),
    )
    .min(3)
    .max(12),
  topLevers: z
    .array(
      z.object({
        lever: z.string().max(150),
        sensitivity: z.number().min(0).max(1),
        recommendedAction: z.string().max(200),
      }),
    )
    .min(2)
    .max(5),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().min(40).max(500),
});

export type SuccessSimOutput = z.infer<typeof SuccessSimSchema>;

export const successSimModuleConfig: ModuleConfig<SuccessSimOutput> = {
  id: "#12",
  title: "Success Simulation (Bayesian)",
  role: "당신은 전략 컨설턴트이며, 다중 분석 결과를 통합해 베이지안 추론으로 실행 성공 확률을 산출합니다.",
  task: [
    "1. upstreamResults의 모든 선행 모듈 출력을 수집하여 증거(Evidence)로 활용하라.",
    "   - #03 Sentiment, #04 Topic, #05 RiskMap, #06 Opportunity, #07 Strategy, #09 Preference, #10 ContentGap, #11 Crisis",
    "2. baselineProbability: 현재 상태 그대로 유지할 때의 캠페인/전략 성공 확률 (0~1).",
    "3. scenarios 3~5개 작성 (label + description + probability + expectedRoi + keyAssumptions):",
    "   - 예: '공격적 비교 콘텐츠 투입', '가격 방어 + 번들링', '현상 유지', 'SCCT diminishment'",
    "   - probability는 baselineProbability와 달라야 함 (상향 또는 하향).",
    "4. bayesianEvidence 3~12개: 각 선행 모듈에서 관찰된 신호가 성공 확률에 미치는 방향과 가중치.",
    "   - directionEffect: raises(상승)/lowers(하락)/neutral",
    "   - weight: 0~1 (해당 신호의 상대적 중요도)",
    "5. topLevers 2~5개: 가장 민감도 높은 실행 레버와 권장 조치.",
    "   - sensitivity: 해당 레버 1단위 변화가 성공 확률에 미치는 영향 (0~1).",
    "6. disclaimer 필수: 확률은 수집 데이터 기반 추정이며 실제 시장 결과를 보증하지 않음.",
    "7. 확률 수치는 모두 0~1 소수점, 합 제약 없음 (시나리오 간 독립 평가).",
  ].join("\n"),
  maxPosts: 5,
  maxOutputTokens: 3000,
  model: "claude-sonnet-4-6",
  temperature: 0.2,
  schema: SuccessSimSchema,
  schemaName: "SuccessSimSchema",
  outputExample: `{
  "baselineProbability": 0.42,
  "scenarios": [
    {
      "label": "공격적 비교 콘텐츠 + 체험 프로모션",
      "description": "세이펜 대비 장기 가치 콘텐츠 8주 집중 + 2주 무료 체험",
      "probability": 0.64,
      "expectedRoi": "strong_positive",
      "keyAssumptions": ["콘텐츠 평균 시청 시간 50% 이상", "체험 전환율 15%"]
    },
    {
      "label": "현상 유지",
      "description": "기존 마케팅 채널 유지, 추가 투입 없음",
      "probability": 0.38,
      "expectedRoi": "neutral",
      "keyAssumptions": ["경쟁사 공격 캠페인 없음"]
    },
    {
      "label": "위기 대응 실패 시",
      "description": "가격 저항 담론 방치 + 대응 없음",
      "probability": 0.22,
      "expectedRoi": "negative",
      "keyAssumptions": ["부정 여론 월 2배 증가"]
    }
  ],
  "bayesianEvidence": [
    { "sourceModule": "#03", "signal": "긍정률 47% 최하위", "directionEffect": "lowers", "weight": 0.35 },
    { "sourceModule": "#06", "signal": "콘텐츠 갭 5건 식별", "directionEffect": "raises", "weight": 0.30 }
  ],
  "topLevers": [
    {
      "lever": "가격 방어 Q&A 콘텐츠 배포 속도",
      "sensitivity": 0.6,
      "recommendedAction": "14일 내 공식 Q&A + 인플루언서 3명 배포"
    }
  ],
  "confidence": "medium",
  "disclaimer": "본 확률은 수집된 온라인 데이터와 선행 분석 결과에 기반한 추정이며 실제 시장 결과를 보증하지 않습니다."
}`,
};
