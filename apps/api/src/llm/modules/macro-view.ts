import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #01 — Macro View.
 *
 * Tech Spec §4.2 ROLE: 한국 온라인 여론 분석 전문가
 * Tech Spec §4.2 TASK: 전체 데이터를 시간축으로 펼쳐 변곡점과
 *                       이벤트-반응 인과관계를 서사로 재구성
 * Tech Spec §4.3 schema example used as the contract.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MacroViewSchema = z.object({
  overallDirection: z.enum(["positive", "negative", "neutral", "mixed"]),
  summary: z.string().min(100).max(800),
  inflectionPoints: z
    .array(
      z.object({
        date: z.string().regex(ISO_DATE),
        event: z.string().min(1).max(200),
        impact: z.enum(["high", "medium", "low"]),
      }),
    )
    .max(5),
  dailyMentionTrend: z
    .array(
      z.object({
        date: z.string().regex(ISO_DATE),
        count: z.number().int().nonnegative(),
        sentiment: z.enum(["positive", "negative", "neutral"]),
      }),
    )
    .max(60),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(500).optional(),
});

export type MacroViewOutput = z.infer<typeof MacroViewSchema>;

export const macroViewModuleConfig: ModuleConfig<MacroViewOutput> = {
  id: "#01",
  title: "Macro View / Inflection Points",
  role: "당신은 한국 온라인 여론 데이터를 시간축으로 다루는 전문가입니다.",
  task: [
    "1. 전체 여론의 방향(positive/negative/neutral/mixed)을 한 단어로 분류하라.",
    "2. 100~800자 내에서 여론의 흐름을 서사로 요약하라(BLUF가 아닌 narrative).",
    "3. 수집된 게시물의 published_at을 기준으로 변곡점(inflection point)을",
    "   최대 5개 식별하라. 각 변곡점은 (date YYYY-MM-DD, event 한 문장,",
    "   impact high/medium/low)로 구성한다.",
    "4. 일자별 게시물 수와 감정 분포를 dailyMentionTrend에 채워라.",
    "5. 분석 신뢰도(high/medium/low)와 필요 시 disclaimer를 첨부하라.",
  ].join("\n"),
  maxPosts: 15,
  maxOutputTokens: 2000,
  model: "claude-sonnet-4-6",
  temperature: 0.2,
  schema: MacroViewSchema,
  schemaName: "MacroViewSchema",
  outputExample: `{
  "overallDirection": "mixed",
  "summary": "수집된 데이터에서 교육 관련 관심이 지속되며 긍정적 변곡점이 관찰되었다.",
  "inflectionPoints": [
    { "date": "2026-04-10", "event": "새 교육과정 발표", "impact": "high" }
  ],
  "dailyMentionTrend": [
    { "date": "2026-04-10", "count": 24, "sentiment": "positive" },
    { "date": "2026-04-11", "count": 18, "sentiment": "neutral" }
  ],
  "confidence": "medium"
}`,
};
