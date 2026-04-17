import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #05 — Risk Map.
 *
 * Tech Spec §4.2 ROLE: 브랜드 리스크 관리 전문가
 * Tech Spec §4.2 TASK: 4D(발화점·확산력·지속성·피해범위) 기준 Top 3~5 리스크
 *                      우선순위화 및 트리거 조건 정의
 *
 * 4D 각 차원을 0~1 점수로 평가하고 가중합(동일 가중)으로 priorityScore 산출.
 * triggerConditions는 해당 리스크가 실제 위기로 번지는 임계 조건을 명시.
 */

const DimSchema = z.number().min(0).max(1);

export const RiskMapSchema = z.object({
  risks: z
    .array(
      z.object({
        label: z.string().max(160),
        category: z.enum([
          "price",
          "quality",
          "safety",
          "competitor",
          "regulatory",
          "reputation",
          "other",
        ]),
        dimensions: z.object({
          ignition: DimSchema, // 발화점: 부정 담론 형성 속도
          spreadability: DimSchema, // 확산력: 공유·인용 가능성
          persistence: DimSchema, // 지속성: 시간축 유지
          impactScope: DimSchema, // 피해범위: 영향 받는 고객/시장
        }),
        priorityScore: z.number().min(0).max(1),
        evidence: z.array(z.string().max(250)).min(1).max(3),
        triggerConditions: z.array(z.string().max(200)).min(1).max(3),
        earlyWarningSignal: z.string().max(200),
      }),
    )
    .min(3)
    .max(5),
  overallRiskLevel: z.enum(["critical", "elevated", "moderate", "low"]),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(500).optional(),
});

export type RiskMapOutput = z.infer<typeof RiskMapSchema>;

export const riskMapModuleConfig: ModuleConfig<RiskMapOutput> = {
  id: "#05",
  title: "Risk Map",
  role: "당신은 한국 소비재/교육 브랜드의 리스크 관리 전문가입니다.",
  task: [
    "1. 수집된 부정 담론에서 Top 3~5 리스크를 우선순위화하라.",
    "2. 각 리스크를 4차원으로 점수화하라 (각 0~1):",
    "   - ignition: 새로운 부정 담론이 얼마나 빠르게 형성되는가",
    "   - spreadability: 공유·인용·캡처되어 확산될 가능성",
    "   - persistence: 단발이 아닌 지속적으로 거론되는가",
    "   - impactScope: 구매/신뢰/브랜드에 미치는 영향 범위",
    "3. priorityScore = 4차원의 단순 평균 (0~1). 정렬에 사용.",
    "4. category는 price/quality/safety/competitor/regulatory/reputation/other 중 선택.",
    "5. evidence 1~3개: 실제 관측된 게시물 근거 (인용/숫자).",
    "6. triggerConditions 1~3개: 이 리스크가 실제 위기로 전환되는 임계 조건.",
    "   예시: '관련 부정 게시물 일 10건 초과', '주요 커뮤니티 메인 노출'",
    "7. earlyWarningSignal: 위기 임박을 알리는 조기 경보 1문장.",
    "8. overallRiskLevel을 critical/elevated/moderate/low 중 선택.",
    "9. upstreamResults의 #03 Sentiment (부정 키워드) / #04 Topic (반대 논점)과 정합성을 유지하라.",
  ].join("\n"),
  maxPosts: 20,
  maxOutputTokens: 2500,
  model: "claude-sonnet-4-6",
  temperature: 0.2,
  schema: RiskMapSchema,
  schemaName: "RiskMapSchema",
  outputExample: `{
  "risks": [
    {
      "label": "가격 저항 확산 (세이펜 대비 3배 지적)",
      "category": "price",
      "dimensions": {
        "ignition": 0.7, "spreadability": 0.6, "persistence": 0.8, "impactScope": 0.6
      },
      "priorityScore": 0.68,
      "evidence": ["가격 관련 부정 게시물 91건 (전주 1.8배)"],
      "triggerConditions": ["주요 카페 메인 노출", "일 5건 초과 지속 7일"],
      "earlyWarningSignal": "네이버 카페 베스트 게시물에 가격 불만글 등장"
    }
  ],
  "overallRiskLevel": "elevated",
  "confidence": "medium"
}`,
};
