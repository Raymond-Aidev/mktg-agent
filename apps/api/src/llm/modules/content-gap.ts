import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #10 — Content Gap (심화 기획안).
 *
 * #06 Market Intelligence의 contentGaps(요약) 출력을 이어받아,
 * 각 갭에 대한 **구체 콘텐츠 기획안**을 생성한다. #06이 "어디에 공백이 있다"면
 * #10은 "그 공백을 어떤 포맷/톤/키메시지/일정으로 채울 것인가"를 답한다.
 *
 * 입력 의존성: upstreamResults["#06"]가 있으면 그 contentGaps를 시드로,
 * 없으면 본 모듈 단독으로 rawPosts에서 공백을 추출.
 */

export const ContentGapSchema = z.object({
  plans: z
    .array(
      z.object({
        topic: z.string().max(200),
        format: z.enum([
          "blog",
          "short_video",
          "long_video",
          "sns_card",
          "landing_page",
          "faq",
          "email",
          "podcast",
        ]),
        tone: z.enum(["emotional", "informational", "comparison", "tutorial", "humor"]),
        targetSegment: z.enum(["core", "neutral", "critical", "all"]),
        keyMessage: z.string().max(200),
        callToAction: z.string().max(100),
        recommendedChannels: z.array(z.string().max(60)).min(1).max(4),
        estimatedEffort: z.enum(["low", "medium", "high"]),
        estimatedImpact: z.enum(["high", "medium", "low"]),
        publishWindowDays: z.number().int().min(1).max(90),
        successMetric: z.string().max(200),
      }),
    )
    .min(3)
    .max(8),
  editorialRhythm: z.string().max(400),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(500).optional(),
});

export type ContentGapOutput = z.infer<typeof ContentGapSchema>;

export const contentGapModuleConfig: ModuleConfig<ContentGapOutput> = {
  id: "#10",
  title: "Content Gap (심화 기획안)",
  role: "당신은 교육/소비재 브랜드의 콘텐츠 전략 기획자이며, 경쟁 대비 공백을 구체 기획안으로 전환하는 전문가입니다.",
  task: [
    "1. upstreamResults['#06'].contentGaps가 있으면 그 항목들을 시드로 삼아 각각을 기획안으로 확장하라.",
    "   없으면 rawPosts에서 자사가 다루지 않는 주제/포맷 공백을 직접 3~8개 식별하라.",
    "2. 각 plan에 필수 필드 지정:",
    "   - format: blog/short_video/long_video/sns_card/landing_page/faq/email/podcast 중 선택",
    "   - tone: emotional/informational/comparison/tutorial/humor 중 선택",
    "   - targetSegment: upstreamResults['#02'] 집단(core/neutral/critical) 중 하나 또는 all",
    "   - keyMessage: 15~100자, 한 문장 핵심 카피",
    "   - callToAction: 구체 행동 (예: '무료 체험 신청', '구매 페이지 이동')",
    "   - recommendedChannels: 인스타/네이버블로그/유튜브/카페 등 (1~4개)",
    "   - publishWindowDays: 제작~출고 권장 일수 (1~90)",
    "   - successMetric: 성공 측정 지표 (예: '게시물당 댓글 30+')",
    "3. editorialRhythm(최대 400자): 전체 plan들을 아우르는 출간 리듬/간격 제안.",
    "4. estimatedEffort와 estimatedImpact로 우선순위 결정 가능하게 하라.",
    "5. 실제 수집된 공백 증거 없이 일반론적 기획 금지.",
  ].join("\n"),
  maxPosts: 15,
  maxOutputTokens: 3000,
  model: "claude-sonnet-4-6",
  temperature: 0.35,
  schema: ContentGapSchema,
  schemaName: "ContentGapSchema",
  outputExample: `{
  "plans": [
    {
      "topic": "세이펜 vs 토토LP 실사용 비교",
      "format": "long_video",
      "tone": "comparison",
      "targetSegment": "neutral",
      "keyMessage": "15만원이 아깝지 않은 3가지 차이 — 발음·콘텐츠·내구성",
      "callToAction": "무료 체험 신청 링크",
      "recommendedChannels": ["유튜브", "네이버블로그"],
      "estimatedEffort": "high",
      "estimatedImpact": "high",
      "publishWindowDays": 21,
      "successMetric": "영상 평균 시청 시간 50% 이상"
    }
  ],
  "editorialRhythm": "주 2회 (수/일) 신규 콘텐츠. 월 1회 비교 콘텐츠, 주 1회 후기 SNS 카드.",
  "confidence": "medium"
}`,
};
