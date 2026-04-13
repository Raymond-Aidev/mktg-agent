import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #07 — Strategy.
 *
 * PRD v2.0 질문 매핑: "더 좋은 방법은 무엇인가?"
 * Tech Spec v2.0 §4.2: 타겟·메시지·콘텐츠·리스크대응 4축 실행 전략
 *
 * Reads upstream #03 Sentiment + #06 Opportunity to produce
 * actionable marketing strategy: what message to send, which
 * channels to prioritize, what content to create this week,
 * and what risks to mitigate.
 */

export const StrategySchema = z.object({
  messageStrategy: z.object({
    primaryMessage: z.string().min(10).max(100),
    supportingMessages: z.array(z.string().max(200)).max(5),
    tone: z.string().max(50),
    avoidTopics: z.array(z.string().max(100)).max(5),
  }),
  contentStrategy: z.object({
    weeklyTopics: z
      .array(
        z.object({
          topic: z.string().max(200),
          channel: z.enum(["naver_blog", "instagram", "youtube", "email", "other"]),
          format: z.string().max(50),
          timing: z.string().max(50),
        }),
      )
      .max(7),
  }),
  channelPriority: z
    .array(
      z.object({
        channel: z.string().max(50),
        priority: z.number().int().min(1).max(10),
        reason: z.string().max(200),
      }),
    )
    .max(5),
  riskMitigation: z
    .array(
      z.object({
        risk: z.string().max(200),
        action: z.string().max(200),
      }),
    )
    .max(3),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(500).optional(),
});

export type StrategyOutput = z.infer<typeof StrategySchema>;

export const strategyModuleConfig: ModuleConfig<StrategyOutput> = {
  id: "#07",
  title: "Strategy / Action Plan",
  role: "당신은 교육 콘텐츠 마케팅 IMC 캠페인 전략가입니다.",
  task: [
    "1. 수집된 여론 데이터와 upstream 분석 결과(#03 Sentiment, #06 Opportunity)를 바탕으로",
    "   핵심 마케팅 메시지 전략을 수립하라.",
    "   primaryMessage: 15자 이내의 핵심 슬로건.",
    "   supportingMessages: 보조 메시지 최대 5개.",
    "   tone: 커뮤니케이션 톤 (예: '신뢰감 있는 전문가', '친근한 학부모 동료').",
    "   avoidTopics: 현재 여론에서 민감한 주제, 언급 회피 권고.",
    "2. 이번 주 실행할 콘텐츠 전략(weeklyTopics)을 최대 7개 제안하라.",
    "   각 항목에 topic, channel(naver_blog/instagram/youtube/email/other),",
    "   format(예: '카드뉴스', '숏폼 영상', '블로그 리뷰'), timing(예: '월요일 오전')을 포함.",
    "3. 채널 우선순위(channelPriority)를 1~10 스코어로 최대 5개 제시하라.",
    "   각 채널에 priority 점수와 선택 이유를 포함.",
    "4. 리스크 완화 조치(riskMitigation) 최대 3개. 현재 감지된 부정 여론이나",
    "   잠재 위기에 대한 선제적 대응 전략.",
    "5. 분석 신뢰도(high/medium/low)와 필요 시 disclaimer를 첨부하라.",
  ].join("\n"),
  maxPosts: 25,
  maxOutputTokens: 2500,
  model: "claude-sonnet-4-6",
  temperature: 0.3,
  schema: StrategySchema,
  schemaName: "StrategySchema",
  outputExample: `{
  "messageStrategy": {
    "primaryMessage": "우리 아이의 미래, 검증된 교육으로",
    "supportingMessages": [
      "전문가가 설계한 커리큘럼",
      "학부모 만족도 95% 달성"
    ],
    "tone": "신뢰감 있는 교육 전문가",
    "avoidTopics": ["가격 비교", "경쟁사 직접 언급"]
  },
  "contentStrategy": {
    "weeklyTopics": [
      {
        "topic": "학부모 후기 인터뷰 시리즈",
        "channel": "instagram",
        "format": "카드뉴스 (5장)",
        "timing": "화요일 오전 10시"
      },
      {
        "topic": "교육 전문가 칼럼: 초등 독서 습관",
        "channel": "naver_blog",
        "format": "롱폼 블로그 포스트 (2000자+)",
        "timing": "수요일 오후 2시"
      }
    ]
  },
  "channelPriority": [
    { "channel": "네이버 블로그", "priority": 9, "reason": "학부모 검색 트래픽 최다 채널" },
    { "channel": "인스타그램", "priority": 7, "reason": "시각적 교육 콘텐츠 참여율 높음" }
  ],
  "riskMitigation": [
    { "risk": "가격 불만 여론 확산 가능성", "action": "교육 효과 데이터 기반 가치 정당화 콘텐츠 선제 배포" }
  ],
  "confidence": "medium"
}`,
};
