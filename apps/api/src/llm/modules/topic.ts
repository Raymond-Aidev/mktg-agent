import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #04 — Topic Extraction.
 *
 * 주요 논점 TOP 5~10 추출 + 논점별 포지션 분포(찬성/반대/관망) + 대표 인용.
 *
 * Input:  rawPosts (+ 선행 #03 Sentiment 키워드 참조 허용)
 * Output: 논점 배열 (topic, share, stance distribution, representative quotes)
 *
 * 설계 의도: #03이 단어 레벨 감성을 본다면 #04는 담론 레벨(같은 단어를 둘러싼
 * 서로 다른 입장)을 본다. Frame competition과 다른 점은 #04는 구체 "주장"을
 * 추출하는 반면, #03의 frameCompetition은 추상적 가치 축을 본다.
 */

export const TopicSchema = z.object({
  topics: z
    .array(
      z.object({
        topic: z.string().max(200),
        share: z.number().min(0).max(1),
        stance: z.object({
          supportive: z.number().min(0).max(1),
          opposed: z.number().min(0).max(1),
          observing: z.number().min(0).max(1),
        }),
        representativeQuotes: z.array(z.string().max(200)).min(1).max(3),
        keywords: z.array(z.string().max(40)).max(5),
      }),
    )
    .min(3)
    .max(10),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(500).optional(),
});

export type TopicOutput = z.infer<typeof TopicSchema>;

export const topicModuleConfig: ModuleConfig<TopicOutput> = {
  id: "#04",
  title: "Topic Extraction",
  role: "당신은 온라인 담론을 분석하여 주요 논점(topic)과 입장 분포를 추출하는 전문가입니다.",
  task: [
    "1. 수집된 게시물/댓글에서 가장 자주 등장하는 주요 논점 3~10개를 추출하라.",
    "   각 논점은 한 문장(200자 이내)으로 압축된 구체적 담론이어야 한다.",
    "   예시: '토토LP는 세이펜 대비 가격이 비싸 부담이다', '발음 품질이 세이펜보다 낫다'",
    "2. 각 논점의 share(전체 담론에서 차지하는 비중, 합≈1.0)를 산출하라.",
    "3. 각 논점에 대한 입장 분포 stance를 산출하라 (supportive + opposed + observing = 1.0):",
    "   - supportive: 해당 논점에 동의하는 비율",
    "   - opposed: 반대·반박하는 비율",
    "   - observing: 관찰·질문만 하는 비율",
    "4. 각 논점을 가장 잘 보여주는 실제 인용문 1~3개 (200자 이내).",
    "5. 각 논점의 핵심 키워드 1~5개 (명사·형용사).",
    "6. upstreamResults의 #03 Sentiment topKeywords가 있으면 교차 검증에 활용하라.",
    "7. 실제 수집된 데이터에서만 논점을 추출하라. 상식에 기반한 추측 금지.",
  ].join("\n"),
  maxPosts: 20,
  maxOutputTokens: 2500,
  model: "claude-sonnet-4-6",
  temperature: 0.25,
  schema: TopicSchema,
  schemaName: "TopicSchema",
  outputExample: `{
  "topics": [
    {
      "topic": "토토LP는 세이펜보다 비싸 가격 부담이 크다",
      "share": 0.28,
      "stance": { "supportive": 0.65, "opposed": 0.20, "observing": 0.15 },
      "representativeQuotes": [
        "세이펜은 5만원인데 토토LP는 15만원이라 고민돼요",
        "가격 대비 콘텐츠는 좋지만 초기 부담이 큰 건 사실"
      ],
      "keywords": ["가격", "세이펜", "부담"]
    },
    {
      "topic": "발음 품질이 세이펜보다 낫다",
      "share": 0.18,
      "stance": { "supportive": 0.80, "opposed": 0.05, "observing": 0.15 },
      "representativeQuotes": ["발음이 확실히 더 또렷해요"],
      "keywords": ["발음", "품질"]
    }
  ],
  "confidence": "medium"
}`,
};
