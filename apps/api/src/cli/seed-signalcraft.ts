/**
 * Seed realistic SignalCraft analysis results for UI development.
 *
 * Product: 토토LP 교육 (LP레코드 기반 유아 영어 교육 프로그램)
 * Reflects enhanced analysis modules with sales promotion focus.
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
const REPORT_ID = "1ddac365-4031-4d55-ad25-8e1b400137c1";
const KEYWORD = "토토LP 교육";
const NOW = new Date().toISOString();

const RAW_POSTS = [
  {
    source: "naver_news",
    postId: "naver-001",
    author: "에듀프레스",
    content:
      "LP레코드로 영어를 배운다? 토토LP 교육이 출시 6개월 만에 학부모들 사이에서 화제다. 실물 LP레코드를 턴테이블에 올리면 연동된 앱에서 원어민 발음과 노래가 재생되며, 아이가 자연스럽게 파닉스를 익히는 구조다. 누적 판매 1만 2천 세트 돌파.",
    likes: 412,
    commentsCnt: 67,
    viewCnt: 18700,
    publishedAt: "2026-04-12T09:00:00Z",
    url: "https://example.com/news/001",
  },
  {
    source: "naver_news",
    postId: "naver-002",
    author: "키즈매거진",
    content:
      "서울시교육청이 유아 영어 교육 혁신 사례로 토토LP 교육을 선정했다. 전통적인 LP레코드 매체와 디지털 학습을 결합한 점이 높은 평가를 받았으며, 시범 유치원 50곳에서 정규 교구로 채택됐다.",
    likes: 356,
    commentsCnt: 54,
    viewCnt: 15200,
    publishedAt: "2026-04-11T14:30:00Z",
    url: "https://example.com/news/002",
  },
  {
    source: "naver_news",
    postId: "naver-003",
    author: "맘스홀릭",
    content:
      "5세 딸이 토토LP 정말 좋아해요! LP판 직접 올리는 게 의식처럼 느껴지는지 매일 아침 스스로 꺼내서 틀어요. 다만 세트 가격 14만 8천원이 좀 부담이에요. 추가 LP판도 장당 1만 5천원이라 시리즈 전체 모으려면 30만원 넘어요.",
    likes: 823,
    commentsCnt: 156,
    viewCnt: 34200,
    publishedAt: "2026-04-10T10:00:00Z",
    url: "https://example.com/news/003",
  },
  {
    source: "naver_news",
    postId: "naver-004",
    author: "유아교육연구소",
    content:
      "촉각 학습(tactile learning)의 효과를 실증한 연구에서 토토LP 교육을 활용한 그룹이 태블릿 전용 그룹 대비 어휘 기억 유지율이 28% 높았다는 결과가 발표됐다. LP레코드를 직접 만지고 조작하는 행위가 학습 몰입을 높이는 것으로 분석됐다.",
    likes: 478,
    commentsCnt: 89,
    viewCnt: 22100,
    publishedAt: "2026-04-09T11:00:00Z",
    url: "https://example.com/news/004",
  },
  {
    source: "naver_news",
    postId: "naver-005",
    author: "스타트업투데이",
    content:
      "토토LP 교육 개발사가 프리A 투자 15억원을 유치했다. 아날로그 교구와 AI 학습 분석의 결합 모델이 투자자들의 관심을 끌었다. 2027년까지 중국어·일본어 버전 출시와 동남아 진출을 계획 중이다.",
    likes: 287,
    commentsCnt: 42,
    viewCnt: 13500,
    publishedAt: "2026-04-08T15:00:00Z",
    url: "https://example.com/news/005",
  },
  {
    source: "naver_news",
    postId: "naver-006",
    author: "학부모카페",
    content:
      "토토LP 체험단 후기입니다. 아이가 LP판에서 나오는 노래를 따라 부르면 앱이 발음을 분석해주는 기능이 좋았어요. 문제는 턴테이블 고장이 잦다는 점. 3개월 만에 모터 소리가 나기 시작했어요. AS가 느리다는 후기도 많네요.",
    likes: 612,
    commentsCnt: 134,
    viewCnt: 28900,
    publishedAt: "2026-04-07T09:30:00Z",
    url: "https://example.com/news/006",
  },
  {
    source: "hackernews",
    postId: "hn-001",
    author: "edtech_watcher",
    content:
      "Korean startup combines vinyl records with language learning for toddlers. Physical LP records trigger app-based phonics lessons. 12K units sold in 6 months. Interesting analog-digital hybrid.",
    likes: 118,
    commentsCnt: 38,
    viewCnt: 5200,
    publishedAt: "2026-04-11T18:00:00Z",
    url: "https://example.com/hn/001",
  },
  {
    source: "hackernews",
    postId: "hn-002",
    author: "audio_ml_dev",
    content:
      "The pronunciation analysis in 토토LP uses Whisper-based ASR fine-tuned on children's speech. Accuracy for 3-6 year olds is reportedly 87%. The tactile learning angle is backed by actual research.",
    likes: 76,
    commentsCnt: 25,
    viewCnt: 3400,
    publishedAt: "2026-04-09T20:00:00Z",
    url: "https://example.com/hn/002",
  },
  {
    source: "naver_news",
    postId: "naver-007",
    author: "소비자평가",
    content:
      "토토LP 교육에 대한 소비자 불만이 증가하고 있다. 턴테이블 품질 이슈, 앱 연동 끊김, 높은 추가 LP판 가격이 주요 불만 사항. 한국소비자원에 접수된 상담 건수가 전월 대비 40% 증가했다.",
    likes: 234,
    commentsCnt: 98,
    viewCnt: 11800,
    publishedAt: "2026-04-06T13:00:00Z",
    url: "https://example.com/news/007",
  },
  {
    source: "naver_news",
    postId: "naver-008",
    author: "교구리뷰어",
    content:
      "유아 영어 교구 비교: 토토LP vs 핑크퐁 스마트펜 vs 윤선생 스마트랜드. 토토LP는 '몰입감'에서 압도적 1위, '가성비'에서는 최하위. 학습 효과는 연구 논문까지 있어 신뢰도 높음.",
    likes: 567,
    commentsCnt: 112,
    viewCnt: 31200,
    publishedAt: "2026-04-05T16:00:00Z",
    url: "https://example.com/news/008",
  },
  {
    source: "hackernews",
    postId: "hn-003",
    author: "edu_innovation",
    content:
      "토토LP selected for Seoul education pilot program, 50 kindergartens. The tactile learning research paper showing 28% better retention is compelling. But the hardware quality concerns need addressing.",
    likes: 62,
    commentsCnt: 19,
    viewCnt: 2900,
    publishedAt: "2026-04-08T22:00:00Z",
    url: "https://example.com/hn/003",
  },
  {
    source: "naver_news",
    postId: "naver-009",
    author: "교보문고뉴스",
    content:
      "교보문고 키즈 코너에서 토토LP 교육 팝업 체험존을 운영한다. 2주간 체험 후 구매 시 15% 할인 + LP판 2장 추가 증정 프로모션이 진행되며, 사전 예약이 하루 만에 500건을 넘었다.",
    likes: 445,
    commentsCnt: 76,
    viewCnt: 19800,
    publishedAt: "2026-04-04T10:00:00Z",
    url: "https://example.com/news/009",
  },
  {
    source: "naver_news",
    postId: "naver-010",
    author: "워킹맘넷",
    content:
      "토토LP 할인 언제 하나요? 정가 14만 8천원은 솔직히 교구치고 비싸요. 핑크퐁 스마트펜은 7만원대인데. 근데 아이가 진짜 좋아하는 건 토토LP라서 고민 중이에요. 형제 할인이라도 있으면 좋겠어요.",
    likes: 389,
    commentsCnt: 145,
    viewCnt: 16700,
    publishedAt: "2026-04-03T08:00:00Z",
    url: "https://example.com/news/010",
  },
  {
    source: "naver_news",
    postId: "naver-011",
    author: "키즈산업뉴스",
    content:
      "토토LP 교육이 미국 CES 2027 에듀테크 부문 혁신상 후보에 올랐다. 아날로그와 디지털의 융합이라는 콘셉트가 글로벌 교육계에서 주목받고 있으며, 일본 쿠몬과 콘텐츠 제휴 협의 중이다.",
    likes: 312,
    commentsCnt: 48,
    viewCnt: 14300,
    publishedAt: "2026-04-02T11:00:00Z",
    url: "https://example.com/news/011",
  },
  {
    source: "hackernews",
    postId: "hn-004",
    author: "startup_asia",
    content:
      "토토LP raised $1.1M pre-Series A. Kumon Japan content partnership in talks. CES 2027 Innovation Award nominee. Hardware QC seems to be the main risk — turntable failure rate reportedly at 8%.",
    likes: 88,
    commentsCnt: 21,
    viewCnt: 4100,
    publishedAt: "2026-04-08T14:00:00Z",
    url: "https://example.com/hn/004",
  },
];

const SENTIMENT_OUTPUT = {
  sentimentRatio: { positive: 0.52, negative: 0.26, neutral: 0.22 },
  topKeywords: [
    { term: "LP레코드", count: 61, sentiment: "positive" },
    { term: "파닉스", count: 44, sentiment: "positive" },
    { term: "촉각학습", count: 36, sentiment: "positive" },
    { term: "가격", count: 33, sentiment: "negative" },
    { term: "턴테이블", count: 29, sentiment: "negative" },
    { term: "발음분석", count: 27, sentiment: "positive" },
    { term: "유치원", count: 24, sentiment: "positive" },
    { term: "교보체험", count: 22, sentiment: "positive" },
    { term: "AS불만", count: 19, sentiment: "negative" },
    { term: "핑크퐁비교", count: 17, sentiment: "neutral" },
    { term: "투자유치", count: 15, sentiment: "positive" },
    { term: "품질이슈", count: 14, sentiment: "negative" },
    { term: "글로벌진출", count: 12, sentiment: "positive" },
    { term: "할인요청", count: 11, sentiment: "negative" },
    { term: "CES후보", count: 9, sentiment: "positive" },
  ],
  frameCompetition: [
    { label: "아날로그+디지털 융합 혁신", share: 0.32 },
    { label: "촉각 학습 효과·몰입 체험", share: 0.25 },
    { label: "가격·가성비 이슈", share: 0.22 },
    { label: "하드웨어 품질·AS 불만", share: 0.13 },
    { label: "글로벌 확장·투자 소식", share: 0.08 },
  ],
  confidence: "high",
  disclaimer: "네이버 뉴스 및 HackerNews 기반 분석으로, 전체 여론을 대표하지 않을 수 있습니다.",
};

const MACRO_VIEW_OUTPUT = {
  overallDirection: "positive",
  summary:
    "토토LP 교육은 실물 LP레코드와 AI 발음 분석 앱을 결합한 유아 영어 교구로, 출시 6개월 만에 1만 2천 세트를 판매하며 시장의 주목을 받고 있다. 서울시교육청 혁신 사례 선정, 촉각 학습 효과 논문 발표, 프리A 15억 투자 유치 등 핵심 성장 지표가 긍정적이다. 그러나 세트 가격 14만 8천원에 대한 가격 저항, 턴테이블 품질 이슈, 경쟁 교구 대비 가성비 비판이 구매 전환의 주요 장벽으로 작용하고 있다.",
  inflectionPoints: [
    {
      date: "2026-04-11",
      event: "서울시교육청 유아 영어 혁신 사례 선정 (50개 유치원 채택)",
      impact: "high",
    },
    {
      date: "2026-04-09",
      event: "촉각 학습 효과 연구 논문 발표 (어휘 유지율 28% 향상)",
      impact: "high",
    },
    { date: "2026-04-08", event: "프리A 15억원 투자 유치 발표", impact: "high" },
    {
      date: "2026-04-04",
      event: "교보문고 팝업 체험존 사전예약 500건 돌파 (1일 만)",
      impact: "medium",
    },
    {
      date: "2026-04-06",
      event: "소비자원 상담 건수 전월 대비 40% 증가 (품질·가격 불만)",
      impact: "low",
    },
  ],
  dailyMentionTrend: [
    { date: "2026-04-02", count: 22, sentiment: "positive" },
    { date: "2026-04-03", count: 35, sentiment: "negative" },
    { date: "2026-04-04", count: 48, sentiment: "positive" },
    { date: "2026-04-05", count: 42, sentiment: "positive" },
    { date: "2026-04-06", count: 28, sentiment: "negative" },
    { date: "2026-04-07", count: 38, sentiment: "neutral" },
    { date: "2026-04-08", count: 55, sentiment: "positive" },
    { date: "2026-04-09", count: 62, sentiment: "positive" },
    { date: "2026-04-10", count: 45, sentiment: "neutral" },
    { date: "2026-04-11", count: 58, sentiment: "positive" },
    { date: "2026-04-12", count: 41, sentiment: "positive" },
  ],
  confidence: "high",
};

const OPPORTUNITY_OUTPUT = {
  shareOfVoice: [
    { brand: "토토LP 교육", mentions: 42, sentimentPositive: 0.62, isOurs: true },
    { brand: "핑크퐁 스마트펜", mentions: 28, sentimentPositive: 0.71, isOurs: false },
    { brand: "윤선생 스마트랜드", mentions: 18, sentimentPositive: 0.55, isOurs: false },
    { brand: "리틀팍스", mentions: 14, sentimentPositive: 0.48, isOurs: false },
    { brand: "디즈니 잉글리시", mentions: 10, sentimentPositive: 0.65, isOurs: false },
  ],
  positioning: [
    {
      brand: "토토LP 교육",
      mentionVolume: 42,
      positiveRate: 0.62,
      distinctKeyword: "촉각학습 LP",
    },
    {
      brand: "핑크퐁 스마트펜",
      mentionVolume: 28,
      positiveRate: 0.71,
      distinctKeyword: "캐릭터 학습",
    },
    {
      brand: "윤선생 스마트랜드",
      mentionVolume: 18,
      positiveRate: 0.55,
      distinctKeyword: "체계적 커리큘럼",
    },
    {
      brand: "리틀팍스",
      mentionVolume: 14,
      positiveRate: 0.48,
      distinctKeyword: "애니메이션 영어",
    },
    {
      brand: "디즈니 잉글리시",
      mentionVolume: 10,
      positiveRate: 0.65,
      distinctKeyword: "디즈니 IP",
    },
  ],
  contentGaps: [
    {
      topic: "학부모 구매 후기 영상 (언박싱 + 아이 반응)",
      competitorActivity:
        "핑크퐁이 유튜브에서 학부모 언박싱 리뷰 시리즈 운영 (월 12회, 평균 8만 조회, 구매 링크 포함)",
      ourStatus: "weak" as const,
      suggestedAction: "아이가 LP판 올리는 순간 반응 숏폼 영상 + 구매 페이지 CTA 직결 시리즈 런칭",
      estimatedImpact: "high" as const,
    },
    {
      topic: "타 교구 비교 분석 콘텐츠",
      competitorActivity:
        "윤선생이 네이버 블로그에서 '교구 비교 가이드' 시리즈 (주 2회, SEO 상위 3위 점유)",
      ourStatus: "absent" as const,
      suggestedAction:
        "촉각 학습 연구 데이터 기반 '왜 LP 교구가 다른가' 비교 콘텐츠 발행 + 체험 신청 CTA",
      estimatedImpact: "high" as const,
    },
    {
      topic: "유치원 교사 추천 콘텐츠",
      competitorActivity:
        "리틀팍스가 교사 대상 무료 수업 자료 배포 (월 4회, 교사 커뮤니티 팔로워 1.2만)",
      ourStatus: "absent" as const,
      suggestedAction: "시범 유치원 50곳 교사 인터뷰 콘텐츠 + 교사 전용 할인 프로그램",
      estimatedImpact: "medium" as const,
    },
    {
      topic: "학습 성과 추적 콘텐츠",
      competitorActivity:
        "디즈니 잉글리시가 인스타에서 '우리 아이 영어 성장 기록' 카드뉴스 (일 1회, 팔로워 3.8만)",
      ourStatus: "absent" as const,
      suggestedAction:
        "앱 발음 분석 데이터 기반 '우리 아이 파닉스 성장 리포트' 공유 기능 + SNS 챌린지",
      estimatedImpact: "medium" as const,
    },
  ],
  riskSignals: [
    {
      signal: "세트 가격 14만 8천원에 대한 가격 저항 — 구매 전환 최대 장벽",
      severity: "warning" as const,
      evidence:
        "맘카페에서 '비싸다' '핑크퐁이 반값' '할인 언제' 관련 언급 23건, 전주 대비 1.8배 증가. 장바구니 이탈률 추정 65%.",
      suggestedResponse:
        "3개월 무이자 할부 + 형제 2세트 20% 할인 + 체험 후 구매 프로그램 도입. 체험존 방문 후 전환율 데이터 공개로 가치 입증.",
    },
    {
      signal: "턴테이블 품질 이슈 — 구매 망설임 및 부정 구전 확산",
      severity: "warning" as const,
      evidence:
        "소비자원 상담 40% 증가, '모터 소리' 'AS 느림' 언급 19건. 구매 후기에서 별점 하락 추세 (4.2→3.6).",
      suggestedResponse:
        "턴테이블 2년 무상 보증 발표 + 24시간 내 교환 보장 정책 시행. 품질 개선 로드맵 공개로 신뢰 회복.",
    },
    {
      signal: "핑크퐁 스마트펜 신제품 출시 예고 — 가격대 동일 구간 경쟁 심화",
      severity: "watch" as const,
      evidence:
        "핑크퐁 SNS에서 '새로운 영어 교구 곧 출시' 티저 + 네이버 검색량 전주 대비 2.1배 증가.",
      suggestedResponse:
        "차별점(촉각 학습 논문 + 교육청 인증) 강조 캠페인 선제 집행 + 얼리버드 기존 고객 업그레이드 혜택.",
    },
  ],
  competitorGaps: [
    {
      competitor: "핑크퐁 스마트펜",
      gap: "캐릭터 의존도 높음, 학습 심도 부족. 가격 7만원대로 가성비 우위이나 교육 연구 근거 없음.",
      ourAdvantage:
        "촉각 학습 논문으로 교육 효과 입증 — '재미만 있는 교구 vs 검증된 교구' 포지셔닝으로 프리미엄 정당화. 판매 포인트: '연구로 증명된 28% 높은 어휘 유지율'",
    },
    {
      competitor: "윤선생 스마트랜드",
      gap: "방문 학습 필수, 교구 단독 사용 불가. 월 구독 5만원으로 연간 비용 60만원 이상.",
      ourAdvantage:
        "1회 구매로 무한 반복 학습 — 연간 비용 기준 1/4 수준. 판매 포인트: '60만원 vs 15만원, 같은 효과'",
    },
    {
      competitor: "리틀팍스",
      gap: "스크린 의존형, 유아 시력 우려. 실물 교구 없이 앱 전용.",
      ourAdvantage:
        "LP레코드 실물 조작 → 스크린 타임 최소화. 판매 포인트: '눈 걱정 없는 영어 교육'",
    },
    {
      competitor: "디즈니 잉글리시",
      gap: "IP 라이선싱 비용으로 가격 높음(20만원대). 한국어 학습 최적화 부족.",
      ourAdvantage:
        "한국 유아 발음 특화 AI 분석 (정확도 87%). 판매 포인트: '한국 아이 발음에 맞춘 유일한 교구'",
    },
  ],
  confidence: "high",
};

const STRATEGY_OUTPUT = {
  messageStrategy: {
    primaryMessage: "LP 한 장이면, 우리 아이 영어가 시작됩니다",
    supportingMessages: [
      "연구로 증명: LP 촉각 학습이 어휘 기억력 28% 높인다 (유아교육연구소 논문)",
      "서울시교육청이 선정한 유아 영어 혁신 교구 — 전국 50개 유치원 정규 채택",
      "1만 2천 가정이 선택한 우리 아이 첫 영어 친구",
      "스크린 걱정 없이, LP레코드로 자연스럽게 파닉스 완성",
      "지금 체험하면 LP 2장 추가 증정 — 한정 수량",
    ],
    tone: "따뜻하고 신뢰감 있는 — 연구 데이터와 학부모 공감을 균형있게",
    avoidTopics: [
      "턴테이블 품질 이슈 직접 언급",
      "경쟁 교구 직접 비하",
      "학습 성과 과장",
      "가격 비교 회피",
    ],
  },
  contentStrategy: {
    weeklyTopics: [
      {
        topic: "LP 언박싱: 아이가 처음 턴테이블에 LP를 올리는 순간",
        channel: "instagram",
        format: "구매 후기 릴스 30초 + 구매 링크 CTA",
        timing: "월요일 오전 10시",
      },
      {
        topic: "촉각 학습이 뭔가요? — 연구 논문 쉽게 풀어보기",
        channel: "naver_blog",
        format: "비교 분석 블로그 (촉각 vs 스크린) + 체험 신청 CTA",
        timing: "화요일 오후 2시",
      },
      {
        topic: "유치원 선생님이 말하는 토토LP 수업 효과",
        channel: "youtube",
        format: "교사 인터뷰 숏폼 3분 + 교사 할인 정보",
        timing: "수요일 오후 6시",
      },
      {
        topic: "이번 주 우리 아이 파닉스 성장 리포트",
        channel: "email",
        format: "개인화 뉴스레터 + 추가 LP판 구매 CTA",
        timing: "목요일 오전 9시",
      },
      {
        topic: "토토LP vs 스마트펜: 우리 아이에게 맞는 교구는?",
        channel: "naver_blog",
        format: "객관적 비교 카드뉴스 + 체험 프로그램 안내",
        timing: "금요일 오후 1시",
      },
      {
        topic: "교보문고 체험존 현장: 아이들 반응 라이브",
        channel: "instagram",
        format: "스토리 하이라이트 + 체험 예약 CTA",
        timing: "토요일 오전 11시",
      },
    ],
  },
  channelPriority: [
    {
      channel: "네이버 블로그",
      priority: 10,
      reason:
        "학부모 교구 검색의 70%가 네이버 — '유아 영어 교구 추천' SEO 선점 필수. 구매 전환 기여도 1위.",
    },
    {
      channel: "인스타그램",
      priority: 9,
      reason: "아이 반응 영상의 바이럴 잠재력 극대. 구매 링크 연결 용이. 육아맘 핵심 채널.",
    },
    {
      channel: "유튜브",
      priority: 7,
      reason: "교사·전문가 추천 콘텐츠로 신뢰도 강화. 긴 영상으로 교구 가치 충분히 전달.",
    },
    {
      channel: "네이버 쇼핑 검색광고",
      priority: 8,
      reason: "구매 의향 높은 검색 트래픽 직접 포획. '유아 영어 교구' 키워드 CPC 경쟁 관리.",
    },
    {
      channel: "이메일 뉴스레터",
      priority: 6,
      reason: "기존 구매자 리텐션 + 추가 LP판 크로스셀. B2B 유치원 대상 전환율 높음.",
    },
  ],
  riskMitigation: [
    {
      risk: "가격 저항(14만 8천원)으로 장바구니 이탈률 높음",
      action:
        "3개월 무이자 할부 즉시 도입 + 체험 후 구매 프로그램(2주 대여 후 구매 시 대여비 차감) + 형제 세트 20% 할인",
    },
    {
      risk: "턴테이블 품질 불만으로 구매 망설임 및 부정 구전 확산",
      action:
        "2년 무상 보증 + 24시간 내 교환 정책 공식 발표. 품질 개선 완료 후 '신뢰 보증 캠페인' 집행",
    },
    {
      risk: "핑크퐁 신제품 출시로 가격대 직접 경쟁 심화",
      action:
        "촉각 학습 논문 + 교육청 인증 강조 차별화 캠페인 선제 집행. 기존 고객 대상 업그레이드 혜택 발표",
    },
  ],
  confidence: "high",
};

const SUMMARY_OUTPUT = {
  oneLiner:
    "토토LP 교육, 촉각 학습의 검증된 효과와 가격·품질 장벽 사이에서 판매 전환 극대화가 핵심 과제",
  keyTakeaways: [
    "시장 기회: 유아 영어 교구 시장 연 15% 성장, 아날로그+디지털 융합 교구는 토토LP가 유일 — 카테고리 선점 기회",
    "고객 니즈: 학부모는 '스크린 걱정 없는 영어 교육'에 높은 관심 → 촉각 학습 메시지가 구매 결정의 핵심 트리거",
    "경쟁 상황: SOV 1위(38%) 확보했으나 핑크퐁(25%)의 가성비 포지셔닝에 밀리는 구간 존재 → 프리미엄 가치 입증 필수",
    "구매 장벽: 가격 14.8만원 저항(23건 불만), 턴테이블 품질 불만(19건) → 체험·할부·보증 3종 대응 시급",
    "프로모션 기회: 교보문고 팝업 전환율 데이터 확보 후 전국 오프라인 체험 확대 + 형제 할인으로 객단가 유지하며 볼륨 확대",
  ],
  criticalActions: [
    {
      action: "네이버 쇼핑 검색광고 세팅 — '유아 영어 교구 추천' 키워드 구매 전환 직결",
      priority: "high",
    },
    {
      action: "학부모 체험 후기 언박싱 숏폼 시리즈 런칭 — 월 8회, 구매 링크 CTA 필수 포함",
      priority: "high",
    },
    {
      action: "체험 후 구매 프로그램 설계 — 2주 대여 → 구매 시 대여비 차감, 전환율 목표 40%",
      priority: "high",
    },
    {
      action: "턴테이블 2년 무상 보증 + 24시간 교환 정책 공식 발표 — 구매 망설임 해소",
      priority: "high",
    },
    {
      action: "촉각 학습 연구 데이터 기반 교구 비교 콘텐츠 발행 — 프리미엄 가격 정당화",
      priority: "medium",
    },
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
  title: `"${KEYWORD}" 마케팅 분석 리포트`,
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
  { moduleId: "#03", output: SENTIMENT_OUTPUT, durationMs: 9120 },
  { moduleId: "#06", output: OPPORTUNITY_OUTPUT, durationMs: 14800 },
  { moduleId: "#07", output: STRATEGY_OUTPUT, durationMs: 16400 },
  { moduleId: "#08", output: SUMMARY_OUTPUT, durationMs: 7200 },
  { moduleId: "#01", output: MACRO_VIEW_OUTPUT, durationMs: 10500 },
  { moduleId: "#13", output: INTEGRATED_OUTPUT, durationMs: 21000 },
];

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO signalcraft_jobs (id, tenant_id, keyword, regions, modules_requested, status, current_stage, progress_pct, created_at, started_at, finished_at) VALUES ($1, $2, $3, $4, $5, 'done', 'done', 100, $6, $6, $7) ON CONFLICT (id) DO NOTHING`,
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
    let postCount = 0;
    for (const p of RAW_POSTS) {
      await client.query(
        `INSERT INTO raw_posts (job_id, tenant_id, source, keyword, post_id, author, content, likes, dislikes, comments_cnt, view_cnt, published_at, url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12)`,
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
    for (const m of MODULE_OUTPUTS) {
      await client.query(
        `INSERT INTO signalcraft_module_outputs (job_id, tenant_id, module_id, status, output, attempts, duration_ms, model_name) VALUES ($1, $2, $3, 'success', $4, 1, $5, 'claude-sonnet-4-6') ON CONFLICT (job_id, module_id) DO UPDATE SET output = EXCLUDED.output, duration_ms = EXCLUDED.duration_ms`,
        [JOB_ID, TENANT, m.moduleId, JSON.stringify(m.output), m.durationMs],
      );
    }
    console.log(`[seed] signalcraft_module_outputs inserted: ${MODULE_OUTPUTS.length} modules`);
    await client.query(
      `INSERT INTO reports (id, tenant_id, job_id, kind, title, sections, metadata) VALUES ($1, $2, $3, 'signalcraft_integrated', $4, $5, $6) ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, metadata = EXCLUDED.metadata`,
      [
        REPORT_ID,
        TENANT,
        JOB_ID,
        "토토LP 교육 — 마케팅 분석 리포트",
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
    await client.query(
      `INSERT INTO signalcraft_actions (tenant_id, job_id, action_type, input, output, status, model_name, duration_ms) VALUES ($1, $2, 'campaign_draft', $3, $4, 'done', 'claude-sonnet-4-6', 8400)`,
      [
        TENANT,
        JOB_ID,
        JSON.stringify({ keyword: KEYWORD, modules: ["#03", "#07", "#08"] }),
        JSON.stringify({
          subject: "LP 한 장이면 영어가 시작됩니다 — 토토LP 교육 체험 안내",
          body: "안녕하세요, GoldenCheck입니다.\n\n토토LP 교육이 서울시교육청 유아 영어 혁신 사례로 선정되며 전국 50개 유치원에서 정규 교구로 채택됐습니다.\n\n출시 6개월 만에 1만 2천 세트 판매를 돌파하고, 촉각 학습 효과 연구 논문에서 어휘 기억 유지율 28% 향상이 입증되었습니다.\n\n본 리포트에서 확인하실 수 있는 내용:\n• 경쟁 교구 5종 대비 SOV 점유율 1위 (42건)\n• 구매 전환 장벽 3가지와 즉시 실행 대응 전략\n• 콘텐츠 갭 4건 — 판매 직결 마케팅 기회\n\n자세한 분석은 첨부 리포트를 참조하세요.",
          cta: "분석 리포트 전문 확인하기",
          targetSegment: "유아 교육 교구 마케팅 담당자",
        }),
      ],
    );
    await client.query(
      `INSERT INTO signalcraft_actions (tenant_id, job_id, action_type, input, output, status, model_name, duration_ms) VALUES ($1, $2, 'content_calendar', $3, $4, 'done', 'claude-sonnet-4-6', 6200)`,
      [
        TENANT,
        JOB_ID,
        JSON.stringify({ keyword: KEYWORD, modules: ["#07"] }),
        JSON.stringify({
          weekOf: "2026-04-14",
          entries: [
            {
              day: "월",
              channel: "인스타그램",
              topic: "아이가 처음 LP를 올리는 순간 — 언박싱 리액션",
              format: "릴스 30초 + 구매 링크",
            },
            {
              day: "화",
              channel: "네이버 블로그",
              topic: "촉각 학습이란? 연구 논문으로 보는 LP 교구의 효과",
              format: "장문 비교 분석 (3000자) + 체험 CTA",
            },
            {
              day: "수",
              channel: "유튜브",
              topic: "유치원 선생님이 직접 말하는 토토LP 수업 효과",
              format: "교사 인터뷰 숏폼 3분",
            },
            {
              day: "목",
              channel: "이메일",
              topic: "우리 아이 이번 주 파닉스 성장 리포트",
              format: "개인화 뉴스레터 + 추가 LP판 구매 CTA",
            },
            {
              day: "금",
              channel: "네이버 블로그",
              topic: "토토LP vs 핑크퐁 스마트펜 — 우리 아이에게 맞는 교구는?",
              format: "객관적 비교 카드뉴스 + 체험 안내",
            },
            {
              day: "토",
              channel: "인스타그램",
              topic: "교보문고 체험존 현장 아이들 반응 하이라이트",
              format: "스토리 + 체험 예약 CTA",
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
