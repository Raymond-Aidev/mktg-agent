import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #03 — Sentiment.
 *
 * Tech Spec §4.2 ROLE: NLP 감성 분석 전문가
 * Tech Spec §4.2 TASK: 감정 분포(긍/부/중립) 정량화, 핵심 키워드 TOP 20
 *                       추출, 프레임 경쟁 구조 분석
 *
 * Output is the smallest schema in the 14-module set, which is why we
 * implement this one first — all the other modules slot into the same
 * abstraction once Sentiment proves the path.
 */

export const SentimentSchema = z.object({
  sentimentRatio: z.object({
    positive: z.number().min(0).max(1),
    negative: z.number().min(0).max(1),
    neutral: z.number().min(0).max(1),
  }),
  topKeywords: z
    .array(
      z.object({
        term: z.string().min(1).max(60),
        count: z.number().int().nonnegative(),
        sentiment: z.enum(["positive", "negative", "neutral"]),
      }),
    )
    .max(20),
  frameCompetition: z
    .array(
      z.object({
        label: z.string().max(120),
        share: z.number().min(0).max(1),
      }),
    )
    .max(5),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(500).optional(),
});

export type SentimentOutput = z.infer<typeof SentimentSchema>;

export const sentimentModuleConfig: ModuleConfig<SentimentOutput> = {
  id: "#03",
  title: "Sentiment / Top Keywords",
  role: "당신은 한국 온라인 여론 데이터를 다루는 NLP 감성 분석 전문가입니다.",
  task: [
    "1. 감정 분포(positive/negative/neutral)를 0~1 사이의 비율로 정량화하라.",
    "   세 값의 합은 1.0에 가까워야 한다.",
    "2. 본문에서 자주 등장한 핵심 키워드 TOP 20을 추출하고, 각 키워드의",
    "   감정 라벨(positive/negative/neutral)을 함께 부여하라. count는 실제",
    "   원문에서 관측된 등장 횟수여야 한다.",
    "3. 댓글들이 논쟁하는 프레임(예: '가격 vs 품질', '안전 vs 자유')을 최대 5개",
    "   추출하고, 각 프레임이 점유한 share를 0~1로 추정하라.",
    "4. 분석 신뢰도(high/medium/low)와 필요 시 disclaimer를 첨부하라.",
  ].join("\n"),
  maxPosts: 30,
  maxOutputTokens: 1500,
  model: "claude-sonnet-4-6",
  temperature: 0.2,
  schema: SentimentSchema,
  schemaName: "SentimentSchema",
};
