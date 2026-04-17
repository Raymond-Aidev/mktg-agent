import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #09 — Preference.
 *
 * Tech Spec §4.2 ROLE: 시장 리서치 분석가
 * Tech Spec §4.2 TASK: 플랫폼 편향 보정 후 브랜드 선호도 추정 범위 산출,
 *                      면책 문구 자동 포함
 *
 * 주의: 온라인 커뮤니티 데이터는 실제 시장 선호도가 아님. 자발적 발화
 * 편향(loud minority), 플랫폼별 사용자 군집 편향이 있다. 본 모듈은
 * 그 편향을 명시적으로 조정하여 "추정 범위 [lower, upper]"를 제공한다.
 */

export const PreferenceSchema = z.object({
  brands: z
    .array(
      z.object({
        brand: z.string().max(100),
        isOurs: z.boolean(),
        rawMentionShare: z.number().min(0).max(1),
        biasAdjustedRange: z.object({
          lower: z.number().min(0).max(1),
          upper: z.number().min(0).max(1),
        }),
        biasFactors: z.array(z.string().max(150)).max(5),
      }),
    )
    .min(2)
    .max(8),
  methodologyNote: z.string().min(50).max(600),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().min(50).max(500),
});

export type PreferenceOutput = z.infer<typeof PreferenceSchema>;

export const preferenceModuleConfig: ModuleConfig<PreferenceOutput> = {
  id: "#09",
  title: "Preference (Bias-Adjusted)",
  role: "당신은 시장 리서치 분석가이며, 온라인 데이터의 자발적 발화 편향을 보정한 브랜드 선호도 추정을 제공합니다.",
  task: [
    "1. 수집된 게시물에서 각 브랜드의 rawMentionShare(원시 언급 점유율, 합≈1)를 산출하라.",
    "2. 각 브랜드에 대해 biasFactors를 1~5개 명시하라:",
    "   - 플랫폼 편향 (예: 네이버 카페는 학부모 편중)",
    "   - 자발적 발화 편향 (loud minority)",
    "   - 시기/이벤트 편향 (예: 최근 프로모션 노출)",
    "   - 응답 편향 (추천받은 사람만 후기 작성)",
    "3. biasAdjustedRange.[lower, upper]: 편향 보정 후 실제 시장 선호도로 추정되는 구간 (0~1).",
    "   구간 폭은 불확실성 수준을 반영해야 한다 (일반적으로 rawMentionShare ± 10~25%).",
    "4. methodologyNote: 보정 방법의 간단 설명 (50~600자).",
    "5. disclaimer: 반드시 포함. '본 수치는 온라인 관찰 기반 추정이며 실제 판매/설문 데이터 아님' 명시.",
    "6. upstreamResults의 #06 Market Intelligence의 shareOfVoice가 있으면 교차 검증에 활용.",
  ].join("\n"),
  maxPosts: 15,
  maxOutputTokens: 2000,
  model: "claude-sonnet-4-6",
  temperature: 0.2,
  schema: PreferenceSchema,
  schemaName: "PreferenceSchema",
  outputExample: `{
  "brands": [
    {
      "brand": "토토LP",
      "isOurs": true,
      "rawMentionShare": 0.38,
      "biasAdjustedRange": { "lower": 0.22, "upper": 0.35 },
      "biasFactors": [
        "네이버 카페에서 최근 프로모션으로 언급 집중",
        "자녀 교구 후기 작성자의 성별 편향"
      ]
    },
    {
      "brand": "세이펜",
      "isOurs": false,
      "rawMentionShare": 0.42,
      "biasAdjustedRange": { "lower": 0.38, "upper": 0.52 },
      "biasFactors": ["장수 브랜드로 기존 사용자 기반 우위"]
    }
  ],
  "methodologyNote": "플랫폼별 사용자 구성 통계로 가중치 보정. loud minority는 ±15% 완충 구간 적용.",
  "confidence": "medium",
  "disclaimer": "본 수치는 온라인 관찰 기반 추정이며 실제 판매·설문 데이터가 아닙니다. 마케팅 의사결정 보조 지표로만 활용하세요."
}`,
};
