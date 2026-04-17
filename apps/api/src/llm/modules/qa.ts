import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #14 — QA (Hallucination Cross-Validation).
 *
 * 모든 선행 모듈 출력을 교차 검증하여 환각/불일치/근거 없는 주장을 탐지한다.
 * 본 모듈의 출력은 사용자에게 바로 노출되지 않고, #13 Integrated 리포트의
 * disclaimer + trustScore 계산에 사용된다.
 *
 * 검사 축:
 *   1. 수치 불일치 (모듈 간 같은 지표 다른 값)
 *   2. 미근거 주장 (evidence 필드가 빈 주장)
 *   3. rawPosts 미반영 (모듈 출력이 원문에 없는 고유명사/숫자 인용)
 *   4. 논리 모순 (예: #03 긍정 높은데 #09 편향 보정 후 급락 없음)
 */

export const QaSchema = z.object({
  overallTrustScore: z.number().min(0).max(1),
  trustLevel: z.enum(["high", "medium", "low"]),
  findings: z
    .array(
      z.object({
        severity: z.enum(["blocker", "warning", "info"]),
        type: z.enum([
          "number_mismatch",
          "unsupported_claim",
          "not_in_source",
          "logical_contradiction",
          "schema_divergence",
          "disclaimer_missing",
        ]),
        affectedModules: z.array(z.string().max(10)).min(1).max(6),
        description: z.string().max(300),
        suggestedAction: z.string().max(200),
      }),
    )
    .max(20),
  numberMismatches: z
    .array(
      z.object({
        metric: z.string().max(100),
        modules: z.array(
          z.object({
            moduleId: z.string().max(10),
            value: z.string().max(80),
          }),
        ),
      }),
    )
    .max(10),
  recommendedDisclaimers: z.array(z.string().max(400)).max(5),
  summary: z.string().min(60).max(500),
});

export type QaOutput = z.infer<typeof QaSchema>;

export const qaModuleConfig: ModuleConfig<QaOutput> = {
  id: "#14",
  title: "QA / Hallucination Check",
  role: "당신은 LLM 출력의 환각과 불일치를 탐지하는 QA 감사관입니다.",
  task: [
    "1. upstreamResults의 모든 모듈 출력을 읽고 아래 축으로 검사하라:",
    "   a. number_mismatch: 같은 지표를 여러 모듈이 서로 다른 값으로 보고",
    "      (예: SOV가 #06에서 38%, #09에서 22%로 다르게 기재)",
    "   b. unsupported_claim: evidence/representativeQuote 없이 단정된 주장",
    "   c. not_in_source: rawPosts에 존재하지 않는 고유명사/인물/수치를 모듈이 인용",
    "   d. logical_contradiction: 모듈 간 논리 모순 (예: #03 긍정 높은데 #11 crisis 심각)",
    "   e. schema_divergence: 스키마 제약 이탈 시도 흔적",
    "   f. disclaimer_missing: 환각 위험 높은데 disclaimer가 비어있음",
    "2. 각 finding은 severity(blocker/warning/info) 부여. blocker는 사용자 노출 전 수정 필수.",
    "3. numberMismatches: 모듈 간 동일 지표가 다르게 등장한 경우 그 값들을 모두 나열.",
    "4. overallTrustScore 0~1 산출:",
    "   - blocker 1건당 -0.3, warning -0.1, info -0.02",
    "   - disclaimer 포함된 모듈이 전체 모듈 중 80% 이상이면 +0.05",
    "5. trustLevel: score ≥ 0.8 high, 0.5~0.8 medium, < 0.5 low.",
    "6. recommendedDisclaimers 0~5개: 최종 리포트에 추가돼야 할 문구 제안.",
    "7. summary(60~500자): 검증 결과 총평.",
    "8. 원본 rawPosts 샘플을 교차 참조하여 not_in_source 탐지에 활용하라.",
  ].join("\n"),
  maxPosts: 10,
  maxOutputTokens: 3500,
  model: "claude-sonnet-4-6",
  temperature: 0.1,
  schema: QaSchema,
  schemaName: "QaSchema",
  outputExample: `{
  "overallTrustScore": 0.72,
  "trustLevel": "medium",
  "findings": [
    {
      "severity": "warning",
      "type": "number_mismatch",
      "affectedModules": ["#06", "#09"],
      "description": "토토LP SOV가 #06에서 38%, #09 편향 보정 후 22-35% 구간으로 상충",
      "suggestedAction": "리포트에서 #06 raw 수치와 #09 범위를 함께 제시해 차이를 명시"
    }
  ],
  "numberMismatches": [
    {
      "metric": "토토LP SOV",
      "modules": [
        { "moduleId": "#06", "value": "38%" },
        { "moduleId": "#09", "value": "22~35%" }
      ]
    }
  ],
  "recommendedDisclaimers": [
    "본 수치는 온라인 관찰 기반이며 실제 판매·설문 데이터와 다를 수 있습니다."
  ],
  "summary": "6개 선행 모듈 중 경미한 수치 불일치 1건, 근거 충분 주장 비율 85%. 최종 리포트에 편향 disclaimer 추가 권장."
}`,
};
