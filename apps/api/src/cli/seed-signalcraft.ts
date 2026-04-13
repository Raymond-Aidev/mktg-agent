/**
 * Seed realistic SignalCraft analysis results for UI development.
 *
 * Inserts a completed job with raw_posts, all 6 module outputs,
 * and an integrated report so the dashboard displays full results.
 *
 * Run:
 *   DATABASE_URL=... pnpm --filter @eduright/api exec tsx src/cli/seed-signalcraft.ts
 *   railway run pnpm --filter @eduright/api exec tsx src/cli/seed-signalcraft.ts
 */
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[seed] DATABASE_URL is required");
  process.exit(1);
}

const TENANT = "00000000-0000-0000-0000-0000000000ee";
const JOB_ID = randomUUID();
const REPORT_ID = randomUUID();
const KEYWORD = "어린이 그림책";
const NOW = new Date().toISOString();

const RAW_POSTS = [
  {
    source: "naver_news",
    postId: "naver-001",
    author: "키즈북리뷰",
    content:
      "올해 상반기 어린이 그림책 시장이 전년 대비 15% 성장했다. 특히 한국 창작 그림책의 해외 수출이 크게 늘었으며, 볼로냐 북페어에서 한국관이 역대 최대 규모로 참가했다.",
    likes: 342,
    commentsCnt: 45,
    viewCnt: 12400,
    publishedAt: "2026-04-10T09:00:00Z",
    url: "https://example.com/news/001",
  },
  {
    source: "naver_news",
    postId: "naver-002",
    author: "출판저널",
    content:
      "교육부의 독서교육 강화 정책에 따라 학교 도서관 예산이 20% 증액되면서 어린이 그림책 수요가 급증하고 있다. 출판사들은 신간 출간 속도를 높이고 있다.",
    likes: 218,
    commentsCnt: 32,
    viewCnt: 8900,
    publishedAt: "2026-04-09T14:30:00Z",
    url: "https://example.com/news/002",
  },
  {
    source: "naver_news",
    postId: "naver-003",
    author: "북스타트뉴스",
    content:
      "아동 심리 전문가들은 그림책이 유아기 정서 발달에 핵심적 역할을 한다고 강조했다. 다만 디지털 매체 선호 증가로 종이책 판매는 정체 추세다.",
    likes: 156,
    commentsCnt: 28,
    viewCnt: 6700,
    publishedAt: "2026-04-08T11:00:00Z",
    url: "https://example.com/news/003",
  },
  {
    source: "naver_news",
    postId: "naver-004",
    author: "에듀프레스",
    content:
      "2026 볼로냐 아동도서전에서 한국 그림책 저작권 거래가 120건을 돌파했다. 특히 동남아와 중동 시장에서의 수요가 급증하고 있다.",
    likes: 487,
    commentsCnt: 67,
    viewCnt: 18200,
    publishedAt: "2026-04-07T10:00:00Z",
    url: "https://example.com/news/004",
  },
  {
    source: "naver_news",
    postId: "naver-005",
    author: "한국출판문화산업진흥원",
    content:
      "정부의 K-Book 해외 진출 지원 사업이 올해 150억원 규모로 확대됐다. 그림책 분야가 전체 지원의 35%를 차지하며 가장 높은 비중을 보였다.",
    likes: 298,
    commentsCnt: 41,
    viewCnt: 11500,
    publishedAt: "2026-04-06T15:00:00Z",
    url: "https://example.com/news/005",
  },
  {
    source: "naver_news",
    postId: "naver-006",
    author: "맘스홀릭",
    content:
      "육아맘들 사이에서 '매일 그림책 한 권' 챌린지가 유행하면서 그림책 정기구독 서비스 가입자가 3배 증가했다. 특히 0-3세 보드북이 인기다.",
    likes: 523,
    commentsCnt: 89,
    viewCnt: 22100,
    publishedAt: "2026-04-05T09:30:00Z",
    url: "https://example.com/news/006",
  },
  {
    source: "hackernews",
    postId: "hn-001",
    author: "techparent",
    content:
      "Korean picture books are gaining traction globally. The Bologna Book Fair 2026 saw record licensing deals for Korean titles. AI-assisted translation is making cross-border publishing faster.",
    likes: 89,
    commentsCnt: 23,
    viewCnt: 3400,
    publishedAt: "2026-04-09T18:00:00Z",
    url: "https://example.com/hn/001",
  },
  {
    source: "hackernews",
    postId: "hn-002",
    author: "edtech_watcher",
    content:
      "Interesting trend: Korean children's book publishers are using AI for market analysis and content localization. GoldenCheck platform seems to be leading this space.",
    likes: 67,
    commentsCnt: 15,
    viewCnt: 2800,
    publishedAt: "2026-04-08T20:00:00Z",
    url: "https://example.com/hn/002",
  },
  {
    source: "naver_news",
    postId: "naver-007",
    author: "도서비평",
    content:
      "일부 전문가들은 그림책 시장의 과열을 우려했다. 신생 출판사의 난립으로 품질 저하 문제가 제기되고 있으며, 번역 품질도 여전히 과제로 남아 있다.",
    likes: 134,
    commentsCnt: 52,
    viewCnt: 7300,
    publishedAt: "2026-04-04T13:00:00Z",
    url: "https://example.com/news/007",
  },
  {
    source: "naver_news",
    postId: "naver-008",
    author: "서점인사이드",
    content:
      "대형 서점 3사의 어린이 그림책 매출이 전년 대비 22% 증가했다. 온라인 채널 비중이 60%를 돌파하며 오프라인 서점의 위기감도 커지고 있다.",
    likes: 201,
    commentsCnt: 35,
    viewCnt: 9100,
    publishedAt: "2026-04-03T16:00:00Z",
    url: "https://example.com/news/008",
  },
  {
    source: "hackernews",
    postId: "hn-003",
    author: "globalpub",
    content:
      "The children's picture book market in East Asia is booming. Korean publishers are particularly aggressive in rights trading, with AI tools helping identify market opportunities.",
    likes: 45,
    commentsCnt: 8,
    viewCnt: 1900,
    publishedAt: "2026-04-07T22:00:00Z",
    url: "https://example.com/hn/003",
  },
  {
    source: "naver_news",
    postId: "naver-009",
    author: "퍼블리싱위클리",
    content:
      "그림책 작가 수입이 5년 만에 처음으로 상승 전환했다. 해외 인세 수입이 국내 매출의 40%에 달하는 작가도 등장하면서 창작 생태계에 활력이 불고 있다.",
    likes: 367,
    commentsCnt: 58,
    viewCnt: 14600,
    publishedAt: "2026-04-02T10:00:00Z",
    url: "https://example.com/news/009",
  },
  {
    source: "naver_news",
    postId: "naver-010",
    author: "유아교육신문",
    content:
      "초등 저학년 학부모 설문조사 결과, 86%가 '종이 그림책이 태블릿보다 교육 효과가 높다'고 응답했다. 다만 구매 채널은 온라인이 압도적이었다.",
    likes: 412,
    commentsCnt: 73,
    viewCnt: 16800,
    publishedAt: "2026-04-01T08:00:00Z",
    url: "https://example.com/news/010",
  },
  {
    source: "naver_news",
    postId: "naver-011",
    author: "인디출판연합",
    content:
      "소규모 독립출판사들의 그림책이 SNS 입소문을 타며 베스트셀러에 진입하는 사례가 늘고 있다. 인스타그램 북스타그램 해시태그 게시물이 월 50만 건을 돌파했다.",
    likes: 278,
    commentsCnt: 44,
    viewCnt: 10200,
    publishedAt: "2026-03-31T11:00:00Z",
    url: "https://example.com/news/011",
  },
  {
    source: "hackernews",
    postId: "hn-004",
    author: "asia_biz",
    content:
      "Seoul Book Fair numbers are impressive - 35% growth in international rights deals for children's books. The Korean government's K-Culture push is paying dividends in publishing.",
    likes: 112,
    commentsCnt: 19,
    viewCnt: 4200,
    publishedAt: "2026-04-06T14:00:00Z",
    url: "https://example.com/hn/004",
  },
];

const SENTIMENT_OUTPUT = {
  sentimentRatio: { positive: 0.62, negative: 0.14, neutral: 0.24 },
  topKeywords: [
    { term: "그림책", count: 48, sentiment: "positive" },
    { term: "해외수출", count: 32, sentiment: "positive" },
    { term: "볼로냐", count: 28, sentiment: "positive" },
    { term: "저작권거래", count: 25, sentiment: "positive" },
    { term: "교육정책", count: 22, sentiment: "positive" },
    { term: "디지털매체", count: 18, sentiment: "negative" },
    { term: "품질저하", count: 15, sentiment: "negative" },
    { term: "정기구독", count: 14, sentiment: "positive" },
    { term: "온라인채널", count: 13, sentiment: "neutral" },
    { term: "창작생태계", count: 12, sentiment: "positive" },
    { term: "K-Book", count: 11, sentiment: "positive" },
    { term: "번역품질", count: 10, sentiment: "negative" },
    { term: "학교도서관", count: 9, sentiment: "positive" },
    { term: "북스타그램", count: 8, sentiment: "positive" },
    { term: "독립출판", count: 7, sentiment: "neutral" },
  ],
  frameCompetition: [
    { label: "시장 성장·수출 확대", share: 0.42 },
    { label: "교육 효과·정책 지원", share: 0.25 },
    { label: "디지털 전환 우려", share: 0.14 },
    { label: "창작자 생태계", share: 0.12 },
    { label: "품질·번역 이슈", share: 0.07 },
  ],
  confidence: "high",
  disclaimer: "네이버 뉴스 및 HackerNews 기반 분석으로, 전체 여론을 대표하지 않을 수 있습니다.",
};

const MACRO_VIEW_OUTPUT = {
  overallDirection: "positive",
  summary:
    "어린이 그림책 시장은 정부 지원 확대, 해외 수출 급증, 학교 도서관 예산 증액 등 복합적 성장 동력에 힘입어 뚜렷한 상승세를 보이고 있다. 볼로냐 북페어에서의 저작권 거래 120건 돌파와 K-Book 지원 사업 150억원 규모 확대가 핵심 지표다. 다만 디지털 매체 선호 증가와 신생 출판사 난립에 따른 품질 이슈는 중기적 리스크 요인으로 주시가 필요하다.",
  inflectionPoints: [
    { date: "2026-04-07", event: "볼로냐 북페어 한국 저작권 거래 120건 돌파", impact: "high" },
    { date: "2026-04-06", event: "K-Book 해외 진출 지원 150억 규모 확정", impact: "high" },
    { date: "2026-04-05", event: "그림책 정기구독 가입자 3배 증가 보도", impact: "medium" },
    { date: "2026-04-03", event: "대형 서점 3사 매출 22% 성장 발표", impact: "medium" },
    { date: "2026-04-01", event: "학부모 설문 — 종이책 선호 86% 결과", impact: "low" },
  ],
  dailyMentionTrend: [
    { date: "2026-04-01", count: 23, sentiment: "positive" },
    { date: "2026-04-02", count: 18, sentiment: "positive" },
    { date: "2026-04-03", count: 31, sentiment: "positive" },
    { date: "2026-04-04", count: 15, sentiment: "negative" },
    { date: "2026-04-05", count: 42, sentiment: "positive" },
    { date: "2026-04-06", count: 38, sentiment: "positive" },
    { date: "2026-04-07", count: 55, sentiment: "positive" },
    { date: "2026-04-08", count: 29, sentiment: "neutral" },
    { date: "2026-04-09", count: 35, sentiment: "positive" },
    { date: "2026-04-10", count: 27, sentiment: "positive" },
  ],
  confidence: "high",
};

const OPPORTUNITY_OUTPUT = {
  shareOfVoice: [
    { brand: "우리 그림책", mentions: 32, sentimentPositive: 0.72, isOurs: true },
    { brand: "사파리출판사", mentions: 18, sentimentPositive: 0.55, isOurs: false },
    { brand: "비룡소", mentions: 24, sentimentPositive: 0.61, isOurs: false },
    { brand: "창비교육", mentions: 14, sentimentPositive: 0.48, isOurs: false },
    { brand: "길벗어린이", mentions: 11, sentimentPositive: 0.64, isOurs: false },
  ],
  positioning: [
    { brand: "우리 그림책", mentionVolume: 32, positiveRate: 0.72, distinctKeyword: "해외 수출" },
    { brand: "비룡소", mentionVolume: 24, positiveRate: 0.61, distinctKeyword: "전집 세트" },
    { brand: "사파리출판사", mentionVolume: 18, positiveRate: 0.55, distinctKeyword: "자연 관찰" },
    { brand: "창비교육", mentionVolume: 14, positiveRate: 0.48, distinctKeyword: "교과 연계" },
    { brand: "길벗어린이", mentionVolume: 11, positiveRate: 0.64, distinctKeyword: "창작 동화" },
  ],
  contentGaps: [
    {
      topic: "학부모 후기 영상 콘텐츠",
      competitorActivity: "비룡소가 유튜브에서 학부모 리뷰 시리즈 운영 (월 4회, 평균 2만 조회)",
      ourStatus: "absent" as const,
      suggestedAction: "학부모 리뷰 숏폼 영상 시리즈 런칭 + 인스타 릴스 동시 배포",
      estimatedImpact: "high" as const,
    },
    {
      topic: "연령별 추천 큐레이션 블로그",
      competitorActivity: "사파리출판사 네이버 블로그 '월령별 추천' 시리즈 (주 2회, 상위 노출)",
      ourStatus: "weak" as const,
      suggestedAction: "0-3세/4-6세/7-9세 큐레이션 콘텐츠 SEO 최적화 발행",
      estimatedImpact: "high" as const,
    },
    {
      topic: "교사 대상 B2B 뉴스레터",
      competitorActivity: "창비교육이 교사 대상 월간 뉴스레터 발행 (구독자 3,000+)",
      ourStatus: "absent" as const,
      suggestedAction: "교사·사서 대상 월간 도서 추천 뉴스레터 런칭",
      estimatedImpact: "medium" as const,
    },
    {
      topic: "작가 비하인드 인스타그램",
      competitorActivity: "길벗어린이 작가 인터뷰 릴스 시리즈 (회당 5,000+ 좋아요)",
      ourStatus: "weak" as const,
      suggestedAction: "소속 작가 작업실 비하인드 + 그림 과정 타임랩스 콘텐츠",
      estimatedImpact: "medium" as const,
    },
  ],
  riskSignals: [
    {
      signal: "디지털 매체 선호 증가로 종이책 수요 정체 우려",
      severity: "warning" as const,
      evidence: "최근 10일간 '디지털 vs 종이' 관련 부정 언급 6건, 전월 대비 2배",
      suggestedResponse: "종이책 고유 가치(정서 발달·집중력) 강조 콘텐츠 + 연구 데이터 인용 캠페인",
    },
    {
      signal: "신생 출판사 난립에 따른 품질 저하 이슈",
      severity: "watch" as const,
      evidence: "품질·번역 관련 부정 키워드 15건 관측, 업계 전반에 대한 신뢰 하락 조짐",
      suggestedResponse: "품질 인증·수상 경력 강조 + '믿을 수 있는 출판사' 브랜딩 차별화",
    },
    {
      signal: "경쟁사 비룡소의 정기구독 서비스 런칭 임박",
      severity: "warning" as const,
      evidence: "비룡소 블로그에서 구독 서비스 티저 콘텐츠 3건 발견",
      suggestedResponse: "선제적 구독 서비스 MVP 런칭으로 시장 선점 + 기존 고객 전환 프로모션",
    },
  ],
  competitorGaps: [
    {
      competitor: "사파리출판사",
      gap: "동남아 시장 진출 부재",
      ourAdvantage: "GoldenCheck 바이어 DB로 현지 파트너 매칭 가능",
    },
    {
      competitor: "비룡소",
      gap: "AI 기반 마케팅 분석 도구 미사용",
      ourAdvantage: "SignalCraft 실시간 여론 분석으로 데이터 기반 의사결정",
    },
    {
      competitor: "창비교육",
      gap: "SNS 채널 운영 비일관적 (월 2-3회)",
      ourAdvantage: "Marketing Agent 자동 콘텐츠 캘린더로 주 5회 일관 운영",
    },
    {
      competitor: "길벗어린이",
      gap: "해외 번역 파이프라인 수동 (출시까지 6개월)",
      ourAdvantage: "Translation Agent 6개국어 동시 번역으로 출시 속도 3배",
    },
  ],
  confidence: "high",
};

const STRATEGY_OUTPUT = {
  messageStrategy: {
    primaryMessage: "K-그림책, 세계 아이들의 첫 친구가 되다",
    supportingMessages: [
      "볼로냐가 인정한 한국 그림책의 힘",
      "AI가 연결하는 창작자와 글로벌 독자",
      "아이의 첫 책장을 채우는 정기구독",
      "데이터로 찾는 다음 베스트셀러",
    ],
    tone: "따뜻하고 전문적인 — 교육적 가치를 강조하되 비즈니스 인사이트를 겸비",
    avoidTopics: [
      "경쟁사 직접 비교",
      "품질 저하 이슈 확대",
      "디지털 vs 종이 이분법",
      "정치적 정책 평가",
    ],
  },
  contentStrategy: {
    weeklyTopics: [
      {
        topic: "볼로냐 북페어 성과 분석 리포트",
        channel: "naver_blog",
        format: "장문 분석 포스트",
        timing: "월요일 오전 10시",
      },
      {
        topic: "이주의 추천 그림책 큐레이션",
        channel: "instagram",
        format: "캐러셀 카드 5장",
        timing: "화요일 오후 2시",
      },
      {
        topic: "해외 바이어 인터뷰 — 왜 한국 그림책인가",
        channel: "youtube",
        format: "숏폼 인터뷰 3분",
        timing: "수요일 오후 6시",
      },
      {
        topic: "그림책 시장 데이터 인사이트",
        channel: "email",
        format: "뉴스레터",
        timing: "목요일 오전 9시",
      },
      {
        topic: "작가 비하인드 스토리",
        channel: "instagram",
        format: "릴스 60초",
        timing: "금요일 오후 1시",
      },
    ],
  },
  channelPriority: [
    {
      channel: "네이버 블로그",
      priority: 9,
      reason: "국내 학부모·교육자 핵심 검색 채널, SEO 효과 극대",
    },
    {
      channel: "인스타그램",
      priority: 8,
      reason: "북스타그램 50만 게시물, 시각적 콘텐츠에 최적화",
    },
    {
      channel: "이메일 뉴스레터",
      priority: 8,
      reason: "B2B 바이어·서점 대상 직접 커뮤니케이션, 전환율 높음",
    },
    { channel: "유튜브", priority: 6, reason: "글로벌 도달 범위, 영문 자막으로 해외 바이어 접근" },
    { channel: "링크드인", priority: 5, reason: "출판 업계 B2B 네트워킹, 해외 파트너 발굴" },
  ],
  riskMitigation: [
    {
      risk: "번역 품질 논란으로 브랜드 신뢰도 하락",
      action: "Translation Agent BLEU 점수 기반 품질 검증 프로세스 의무화",
    },
    {
      risk: "구독 모델 초기 이탈률 높을 가능성",
      action: "첫 달 무료 체험 + 3개월 약정 시 20% 할인으로 록인",
    },
    {
      risk: "SNS 부정 여론 확산",
      action: "CRM Agent 실시간 모니터링 + 24시간 내 공식 대응 프로토콜",
    },
  ],
  confidence: "high",
};

const SUMMARY_OUTPUT = {
  oneLiner: "어린이 그림책 시장, 해외 수출과 구독 경제로 황금기 진입",
  keyTakeaways: [
    "볼로냐 북페어 저작권 거래 120건 돌파 — 동남아·중동이 핵심 신규 시장",
    "그림책 정기구독 가입자 3배 증가, 0-3세 보드북이 견인",
    "정부 K-Book 지원 150억 확대로 해외 진출 인프라 강화",
    "디지털 전환 우려에도 학부모 86%가 종이 그림책 선호",
    "북스타그램 월 50만 게시물 — SNS가 신규 발견 채널로 부상",
  ],
  criticalActions: [
    { action: "동남아·중동 현지 파트너십 3개사 확보 (Q2 목표)", priority: "high" },
    { action: "연령별 큐레이션 정기구독 서비스 MVP 런칭", priority: "high" },
    { action: "인스타그램 북스타그래머 시딩 프로그램 20명 선정", priority: "high" },
    { action: "AI 번역 파이프라인 6개국어 확장 (베트남·아랍어 우선)", priority: "medium" },
    { action: "네이버 블로그 SEO 콘텐츠 주 2회 발행 체계 구축", priority: "medium" },
  ],
  confidence: "high",
};

const INTEGRATED_SECTIONS = [
  {
    id: "section-1",
    title: "핵심 요약 (Executive Summary)",
    content: SUMMARY_OUTPUT.oneLiner + "\n\n" + SUMMARY_OUTPUT.keyTakeaways.join("\n"),
    sourceModule: "#08",
  },
  {
    id: "section-2",
    title: "시장 여론 동향 (Macro View)",
    content: MACRO_VIEW_OUTPUT.summary,
    sourceModule: "#01",
  },
  {
    id: "section-3",
    title: "감성 분석 (Sentiment Analysis)",
    content: `긍정 ${(SENTIMENT_OUTPUT.sentimentRatio.positive * 100).toFixed(0)}% · 부정 ${(SENTIMENT_OUTPUT.sentimentRatio.negative * 100).toFixed(0)}% · 중립 ${(SENTIMENT_OUTPUT.sentimentRatio.neutral * 100).toFixed(0)}%\n\n상위 키워드: ${SENTIMENT_OUTPUT.topKeywords
      .slice(0, 7)
      .map((k) => `${k.term}(${k.count})`)
      .join(
        ", ",
      )}\n\n프레임 경쟁:\n${SENTIMENT_OUTPUT.frameCompetition.map((f) => `• ${f.label}: ${(f.share * 100).toFixed(0)}%`).join("\n")}`,
    sourceModule: "#03",
  },
  {
    id: "section-4",
    title: "주요 변곡점 (Inflection Points)",
    content: MACRO_VIEW_OUTPUT.inflectionPoints
      .map((p) => `[${p.date}] ${p.event} (영향도: ${p.impact})`)
      .join("\n"),
    sourceModule: "#01",
  },
  {
    id: "section-5",
    title: "SOV 점유율 분석 (Share of Voice)",
    content: OPPORTUNITY_OUTPUT.shareOfVoice
      .map(
        (s) =>
          `${s.isOurs ? "★ " : ""}${s.brand}: ${s.mentions}건 (긍정률 ${Math.round(s.sentimentPositive * 100)}%)`,
      )
      .join("\n"),
    sourceModule: "#06",
  },
  {
    id: "section-6",
    title: "콘텐츠 갭 분석",
    content: OPPORTUNITY_OUTPUT.contentGaps
      .map(
        (g) =>
          `■ ${g.topic} [${g.ourStatus}] → 영향: ${g.estimatedImpact}\n  경쟁사: ${g.competitorActivity}\n  제안: ${g.suggestedAction}`,
      )
      .join("\n\n"),
    sourceModule: "#06",
  },
  {
    id: "section-7",
    title: "리스크 시그널",
    content: OPPORTUNITY_OUTPUT.riskSignals
      .map(
        (r) =>
          `[${r.severity.toUpperCase()}] ${r.signal}\n  근거: ${r.evidence}\n  대응: ${r.suggestedResponse}`,
      )
      .join("\n\n"),
    sourceModule: "#06",
  },
  {
    id: "section-7b",
    title: "경쟁사 갭 분석",
    content: OPPORTUNITY_OUTPUT.competitorGaps
      .map((c) => `■ ${c.competitor}\n  갭: ${c.gap}\n  우리 강점: ${c.ourAdvantage}`)
      .join("\n\n"),
    sourceModule: "#06",
  },
  {
    id: "section-8",
    title: "메시지 전략 (Message Strategy)",
    content: `핵심 메시지: "${STRATEGY_OUTPUT.messageStrategy.primaryMessage}"\n\n보조 메시지:\n${STRATEGY_OUTPUT.messageStrategy.supportingMessages.map((m) => `• ${m}`).join("\n")}\n\n톤앤매너: ${STRATEGY_OUTPUT.messageStrategy.tone}`,
    sourceModule: "#07",
  },
  {
    id: "section-9",
    title: "콘텐츠 전략 (Content Calendar)",
    content: STRATEGY_OUTPUT.contentStrategy.weeklyTopics
      .map((t) => `${t.timing} | ${t.channel} | ${t.format}\n  → ${t.topic}`)
      .join("\n\n"),
    sourceModule: "#07",
  },
  {
    id: "section-10",
    title: "채널 우선순위",
    content: STRATEGY_OUTPUT.channelPriority
      .map((c) => `${c.priority}/10 — ${c.channel}\n  ${c.reason}`)
      .join("\n\n"),
    sourceModule: "#07",
  },
  {
    id: "section-11",
    title: "리스크 완화 방안",
    content: STRATEGY_OUTPUT.riskMitigation.map((r) => `⚠ ${r.risk}\n  → ${r.action}`).join("\n\n"),
    sourceModule: "#07",
  },
  {
    id: "section-12",
    title: "즉시 실행 과제 (Critical Actions)",
    content: SUMMARY_OUTPUT.criticalActions
      .map((a) => `[${a.priority.toUpperCase()}] ${a.action}`)
      .join("\n"),
    sourceModule: "#08",
  },
];

const INTEGRATED_OUTPUT = {
  title: `"${KEYWORD}" 여론 분석 통합 리포트`,
  sections: INTEGRATED_SECTIONS,
  metadata: {
    keyword: KEYWORD,
    generatedAt: NOW,
    modulesUsed: ["#01", "#03", "#06", "#07", "#08", "#13"],
  },
  confidence: "high",
  disclaimer:
    "본 분석은 네이버 뉴스 및 HackerNews 기반이며, 전수 조사가 아닌 샘플 분석입니다. 수치는 수집된 데이터 범위 내의 추정치입니다.",
};

const MODULE_OUTPUTS: Array<{ moduleId: string; output: unknown; durationMs: number }> = [
  { moduleId: "#03", output: SENTIMENT_OUTPUT, durationMs: 8420 },
  { moduleId: "#06", output: OPPORTUNITY_OUTPUT, durationMs: 12350 },
  { moduleId: "#07", output: STRATEGY_OUTPUT, durationMs: 15200 },
  { moduleId: "#08", output: SUMMARY_OUTPUT, durationMs: 6100 },
  { moduleId: "#01", output: MACRO_VIEW_OUTPUT, durationMs: 9800 },
  { moduleId: "#13", output: INTEGRATED_OUTPUT, durationMs: 18500 },
];

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    // 1. signalcraft_jobs
    await client.query(
      `INSERT INTO signalcraft_jobs
         (id, tenant_id, keyword, regions, modules_requested, status,
          current_stage, progress_pct, created_at, started_at, finished_at)
       VALUES ($1, $2, $3, $4, $5, 'done', 'done', 100, $6, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        JOB_ID,
        TENANT,
        KEYWORD,
        ["KR", "global"],
        ["#01", "#03", "#06", "#07", "#08", "#13"],
        NOW,
        NOW,
      ],
    );
    console.log(`[seed] signalcraft_jobs inserted: ${JOB_ID}`);

    // 2. raw_posts
    let postCount = 0;
    for (const p of RAW_POSTS) {
      await client.query(
        `INSERT INTO raw_posts
           (job_id, tenant_id, source, keyword, post_id, author, content,
            likes, dislikes, comments_cnt, view_cnt, published_at, url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12)`,
        [
          JOB_ID,
          TENANT,
          p.source,
          KEYWORD,
          p.postId,
          p.author,
          p.content,
          p.likes,
          p.commentsCnt,
          p.viewCnt,
          p.publishedAt,
          p.url,
        ],
      );
      postCount++;
    }
    console.log(`[seed] raw_posts inserted: ${postCount} rows`);

    // 3. signalcraft_module_outputs
    for (const m of MODULE_OUTPUTS) {
      await client.query(
        `INSERT INTO signalcraft_module_outputs
           (job_id, tenant_id, module_id, status, output, attempts, duration_ms, model_name)
         VALUES ($1, $2, $3, 'success', $4, 1, $5, 'claude-sonnet-4-6')
         ON CONFLICT (job_id, module_id) DO UPDATE SET
           output = EXCLUDED.output, duration_ms = EXCLUDED.duration_ms`,
        [JOB_ID, TENANT, m.moduleId, JSON.stringify(m.output), m.durationMs],
      );
    }
    console.log(`[seed] signalcraft_module_outputs inserted: ${MODULE_OUTPUTS.length} modules`);

    // 4. reports
    await client.query(
      `INSERT INTO reports
         (id, tenant_id, job_id, kind, title, sections, metadata)
       VALUES ($1, $2, $3, 'signalcraft_integrated', $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         sections = EXCLUDED.sections, metadata = EXCLUDED.metadata`,
      [
        REPORT_ID,
        TENANT,
        JOB_ID,
        INTEGRATED_OUTPUT.title,
        JSON.stringify(INTEGRATED_OUTPUT.sections),
        JSON.stringify({
          keyword: KEYWORD,
          generatedAt: NOW,
          modulesUsed: ["#01", "#03", "#06", "#07", "#08", "#13"],
          confidence: "high",
          disclaimer: INTEGRATED_OUTPUT.disclaimer,
        }),
      ],
    );
    console.log(`[seed] reports inserted: ${REPORT_ID}`);

    // 5. signalcraft_actions (campaign_draft + content_calendar)
    await client.query(
      `INSERT INTO signalcraft_actions
         (tenant_id, job_id, action_type, input, output, status, model_name, duration_ms)
       VALUES ($1, $2, 'campaign_draft', $3, $4, 'done', 'claude-sonnet-4-6', 7200)`,
      [
        TENANT,
        JOB_ID,
        JSON.stringify({ keyword: KEYWORD, modules: ["#03", "#07", "#08"] }),
        JSON.stringify({
          subject: "K-그림책이 세계를 만날 때 — 볼로냐 북페어 인사이트 리포트",
          body: "안녕하세요, GoldenCheck입니다.\n\n2026 볼로냐 아동도서전에서 한국 그림책의 저작권 거래가 120건을 돌파했습니다.\n특히 동남아·중동 시장의 수요가 폭발적으로 증가하며, 새로운 기회가 열리고 있습니다.\n\n본 리포트에서는 시장 트렌드, 경쟁사 갭 분석, 그리고 즉시 실행 가능한 전략을 확인하실 수 있습니다.\n\n주요 인사이트:\n• 동남아·중동 현지 파트너십 구축 적기\n• 정기구독 모델 가입자 3배 급증\n• 북스타그램 월 50만 게시물 — SNS 마케팅 최적 시점\n\n자세한 분석은 첨부 리포트를 참조하세요.",
          cta: "리포트 전문 확인하기",
          targetSegment: "해외 저작권 거래 관심 출판사",
        }),
      ],
    );

    await client.query(
      `INSERT INTO signalcraft_actions
         (tenant_id, job_id, action_type, input, output, status, model_name, duration_ms)
       VALUES ($1, $2, 'content_calendar', $3, $4, 'done', 'claude-sonnet-4-6', 5800)`,
      [
        TENANT,
        JOB_ID,
        JSON.stringify({ keyword: KEYWORD, modules: ["#07"] }),
        JSON.stringify({
          weekOf: "2026-04-14",
          entries: [
            {
              day: "월",
              channel: "네이버 블로그",
              topic: "볼로냐 북페어 성과 분석 — 저작권 거래 120건의 의미",
              format: "장문 분석 (2000자)",
            },
            {
              day: "화",
              channel: "인스타그램",
              topic: "이주의 추천 그림책 TOP 5",
              format: "캐러셀 카드 5장",
            },
            {
              day: "수",
              channel: "유튜브",
              topic: "해외 바이어가 말하는 한국 그림책의 매력",
              format: "숏폼 인터뷰 3분",
            },
            {
              day: "목",
              channel: "이메일",
              topic: "그림책 시장 주간 인사이트 뉴스레터",
              format: "뉴스레터 (HTML)",
            },
            {
              day: "금",
              channel: "인스타그램",
              topic: "그림책 작가 작업실 비하인드",
              format: "릴스 60초",
            },
          ],
        }),
      ],
    );
    console.log("[seed] signalcraft_actions inserted: 2 (campaign_draft + content_calendar)");

    await client.query("COMMIT");
    console.log("\n[seed] done — all data committed");
    console.log(`  Job ID:    ${JOB_ID}`);
    console.log(`  Report ID: ${REPORT_ID}`);
    console.log(`  Tenant:    ${TENANT}`);
    console.log(`  Keyword:   ${KEYWORD}`);
    console.log(`\n  View report: /api/v1/reports/${REPORT_ID}?format=html`);
    console.log(`  View job:    /api/v1/signalcraft/jobs/${JOB_ID}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
