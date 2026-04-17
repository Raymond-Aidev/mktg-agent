import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #02 — Segmentation.
 *
 * Tech Spec §4.2 ROLE: 소비자 행동 분석 전문가
 * Tech Spec §4.2 TASK: 댓글 작성자를 Core·Neutral·Critical 3집단으로 분류하고
 *                       집단별 규모·결집력 평가
 *
 * Input:  rawPosts (author cues, likes, comment count, content tone)
 * Output: 3 segments, each with size(share), cohesion, signature traits,
 *         representative quotes.
 *
 * 주의: author 정보가 익명이거나 부족할 경우 본문 톤을 근거로 분류하며
 *       confidence를 낮추고 disclaimer를 남긴다.
 */

export const SegmentationSchema = z.object({
  segments: z
    .array(
      z.object({
        label: z.enum(["core", "neutral", "critical"]),
        sizeShare: z.number().min(0).max(1),
        cohesion: z.enum(["high", "medium", "low"]),
        signatureTraits: z.array(z.string().max(120)).min(1).max(5),
        representativeQuote: z.string().max(300),
        volumeEstimate: z.number().int().nonnegative(),
      }),
    )
    .length(3),
  dominantSegment: z.enum(["core", "neutral", "critical"]),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(500).optional(),
});

export type SegmentationOutput = z.infer<typeof SegmentationSchema>;

export const segmentationModuleConfig: ModuleConfig<SegmentationOutput> = {
  id: "#02",
  title: "Segmentation",
  role: "당신은 한국 온라인 여론의 소비자 행동을 분석하는 전문가입니다.",
  task: [
    "1. 수집된 게시물/댓글의 작성자를 세 집단으로 분류하라:",
    "   - core: 긍정 옹호자 (추천·재구매·적극 공유 신호)",
    "   - neutral: 중립/탐색 (비교·질문·호기심 신호)",
    "   - critical: 부정 비판자 (불만·환불·경쟁 제품 선호 신호)",
    "2. 각 집단의 sizeShare (0~1 합=1.0)와 volumeEstimate(관측 게시물 수)를 산출하라.",
    "3. 각 집단의 cohesion(결집력: 의견 일관성)을 high/medium/low로 평가하라.",
    "4. 각 집단을 특징짓는 signatureTraits(언어 패턴·관심사) 1~5개 추출.",
    "5. 각 집단을 가장 잘 대표하는 실제 인용문 1건 선정 (300자 이내).",
    "6. 전체에서 가장 dominant한 집단을 명시하라.",
    "7. 작성자 정보가 부족하면 본문 톤에 근거하되 confidence를 medium/low로 낮추고 disclaimer를 남겨라.",
  ].join("\n"),
  maxPosts: 20,
  maxOutputTokens: 2000,
  model: "claude-sonnet-4-6",
  temperature: 0.2,
  schema: SegmentationSchema,
  schemaName: "SegmentationSchema",
  outputExample: `{
  "segments": [
    {
      "label": "core",
      "sizeShare": 0.35,
      "cohesion": "high",
      "signatureTraits": ["재구매 의향", "아이 반응 긍정", "추천 공유"],
      "representativeQuote": "둘째도 쓰려고 하나 더 샀어요. 발음이 진짜 좋아요.",
      "volumeEstimate": 7
    },
    {
      "label": "neutral",
      "sizeShare": 0.40,
      "cohesion": "medium",
      "signatureTraits": ["세이펜과 비교 질문", "가격 대비 가치 탐색"],
      "representativeQuote": "토토LP랑 세이펜 중에 뭐가 나을까요?",
      "volumeEstimate": 8
    },
    {
      "label": "critical",
      "sizeShare": 0.25,
      "cohesion": "medium",
      "signatureTraits": ["가격 부담", "교구 수명 불안"],
      "representativeQuote": "15만원대는 너무 비싸요. 세이펜이 5만원인데.",
      "volumeEstimate": 5
    }
  ],
  "dominantSegment": "neutral",
  "confidence": "medium",
  "disclaimer": "익명 커뮤니티 데이터 기반이므로 집단 크기 추정 오차 ±10%"
}`,
};
