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
  sentimentRatio: { positive: 0.47, negative: 0.31, neutral: 0.22 },
  topKeywords: [
    { term: "LP레코드", count: 84, sentiment: "positive" },
    { term: "가격저항", count: 91, sentiment: "negative" },
    { term: "파닉스", count: 67, sentiment: "positive" },
    { term: "스크린프리", count: 52, sentiment: "positive" },
    { term: "추가비용", count: 45, sentiment: "negative" },
    { term: "세이펜비교", count: 44, sentiment: "neutral" },
    { term: "누리과정", count: 38, sentiment: "positive" },
    { term: "내구성불만", count: 38, sentiment: "negative" },
    { term: "체험수요", count: 31, sentiment: "neutral" },
    { term: "기능한계", count: 29, sentiment: "negative" },
    { term: "자기주도학습", count: 27, sentiment: "positive" },
    { term: "교사추천", count: 24, sentiment: "positive" },
    { term: "투자유치", count: 15, sentiment: "positive" },
    { term: "하티하티", count: 14, sentiment: "neutral" },
    { term: "CES후보", count: 9, sentiment: "positive" },
  ],
  keywordSentiment: [
    { keyword: "키즈 LP 토토", score: 0.52, postCount: 187 },
    { keyword: "한국삐아제", score: 0.61, postCount: 520 },
    { keyword: "토토LP 후기", score: 0.48, postCount: 210 },
    { keyword: "토토LP 단점", score: 0.22, postCount: 145 },
    { keyword: "유아 오디오 교구", score: 0.55, postCount: 380 },
    { keyword: "동화 카드 플레이어", score: 0.58, postCount: 195 },
    { keyword: "말하는 카드 교구", score: 0.54, postCount: 125 },
    { keyword: "유아 음악 교구 추천", score: 0.62, postCount: 310 },
    { keyword: "두돌 세돌 교구 추천", score: 0.65, postCount: 440 },
    { keyword: "누리과정 교구", score: 0.58, postCount: 165 },
  ],
  frameCompetition: [
    { label: "가격·가성비 이슈", share: 0.28 },
    { label: "촉각 학습 효과·자기주도", share: 0.24 },
    { label: "경쟁 교구 비교", share: 0.21 },
    { label: "하드웨어 품질·AS 불만", share: 0.15 },
    { label: "교육과정 연계·B2B", share: 0.12 },
  ],
  confidence: "high",
  disclaimer: "네이버 뉴스, 맘카페, HackerNews 기반 10개 연관검색어 통합 분석입니다.",
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
    { brand: "토토LP (한국삐아제)", mentions: 42, sentimentPositive: 0.47, isOurs: true },
    { brand: "세이펜 (크레비스)", mentions: 31, sentimentPositive: 0.68, isOurs: false },
    { brand: "핑크퐁 워크북+펜", mentions: 19, sentimentPositive: 0.72, isOurs: false },
    { brand: "윤선생 스마트올", mentions: 12, sentimentPositive: 0.55, isOurs: false },
    { brand: "하티하티 플레이어", mentions: 8, sentimentPositive: 0.61, isOurs: false },
  ],
  sovByKeyword: [
    { keyword: "유아 오디오 교구", totoLP: 0.38, competitor: "세이펜", competitorShare: 0.32 },
    { keyword: "동화 카드 플레이어", totoLP: 0.24, competitor: "세이펜", competitorShare: 0.41 },
    { keyword: "말하는 카드 교구", totoLP: 0.19, competitor: "하티하티", competitorShare: 0.28 },
  ],
  positioning: [
    {
      brand: "토토LP (한국삐아제)",
      mentionVolume: 42,
      positiveRate: 0.47,
      distinctKeyword: "촉각학습 LP",
      position: "高SOV + 低긍정 — 논란의 중심",
    },
    {
      brand: "세이펜 (크레비스)",
      mentionVolume: 31,
      positiveRate: 0.68,
      distinctKeyword: "가성비 호환",
      position: "中SOV + 高긍정 — 조용한 강자",
    },
    {
      brand: "핑크퐁 워크북+펜",
      mentionVolume: 19,
      positiveRate: 0.72,
      distinctKeyword: "캐릭터 학습",
      position: "低SOV + 最高긍정 — 팬덤형",
    },
    {
      brand: "윤선생 스마트올",
      mentionVolume: 12,
      positiveRate: 0.55,
      distinctKeyword: "체계적 커리큘럼",
      position: "低SOV + 中긍정 — 전문가형",
    },
    {
      brand: "하티하티 플레이어",
      mentionVolume: 8,
      positiveRate: 0.61,
      distinctKeyword: "한국어 동화",
      position: "最低SOV + 급성장 — 신흥 경쟁자",
    },
  ],
  pricePositioning: {
    competitors: [
      { brand: "토토LP", initialCost: 148000, annualTotalCost: 220000 },
      { brand: "세이펜", initialCost: 49000, annualTotalCost: 290000 },
      { brand: "핑크퐁", initialCost: 69000, annualTotalCost: 250000 },
      { brand: "윤선생", initialCost: 0, annualTotalCost: 590000 },
      { brand: "하티하티", initialCost: 79000, annualTotalCost: 180000 },
    ],
    insight:
      "초기 가격 최고가(14.8만원)이나 1년 총비용 4위(22만원). 세이펜(29만원)보다 7만원 저렴, 윤선생(59만원) 대비 63% 절약.",
  },
  contentGaps: [
    {
      topic: "'토토LP vs 세이펜' 비교 콘텐츠",
      competitorActivity:
        "세이펜이 네이버 블로그 '교구 비교' 시리즈 주 3회 발행, '동화 카드 플레이어' SEO 1위 장악",
      ourStatus: "absent" as const,
      suggestedAction: "'1년 총비용 비교표 + 어휘 유지율 28% 차이' 데이터 기반 비교 콘텐츠",
      estimatedImpact: "high" as const,
      revenueImpact: "월 추정 120세트 이탈 방지",
    },
    {
      topic: "실구매자 아이 반응 영상",
      competitorActivity: "핑크퐁 유튜브 언박싱+반응 릴스 월 12회, 평균 8만 조회",
      ourStatus: "weak" as const,
      suggestedAction: "'우리 아이가 LP카드 스스로 꺼내는 순간' 숏폼 시리즈 + 구매 링크 직결",
      estimatedImpact: "high" as const,
      revenueImpact: "전환율 2.1%p 개선 잠재력",
    },
    {
      topic: "'두돌 세돌 교구 추천' 카테고리 진입",
      competitorActivity: "세이펜·핑크퐁이 '연령별 교구 추천' SEO 상위 5개 중 3개 장악",
      ourStatus: "absent" as const,
      suggestedAction: "'두돌 아이 첫 영어, LP카드로 시작하세요' 연령별 가이드 콘텐츠",
      estimatedImpact: "high" as const,
      revenueImpact: "월 19,800건 미포획 시장",
    },
    {
      topic: "누리과정 교사 추천 콘텐츠",
      competitorActivity: "윤선생이 교사 커뮤니티에서 교구 활용 가이드 배포 (팔로워 1.2만)",
      ourStatus: "absent" as const,
      suggestedAction: "유치원 50곳 채택 사례 + 교사 인터뷰 → B2B + B2C 동시 공략",
      estimatedImpact: "high" as const,
      revenueImpact: "B2B 월 25세트 추가 판매",
    },
    {
      topic: "'말하는 카드 교구' 포지셔닝",
      competitorActivity: "하티하티 SOV 28%로 선두, 3개월 전 12%에서 2.3배 급성장",
      ourStatus: "weak" as const,
      suggestedAction: "'말하는 카드 그 이상 — LP카드로 음악을 듣고, 영어를 배우는 교구' 차별화",
      estimatedImpact: "medium" as const,
      revenueImpact: "월 5,300건 잠재 유입",
    },
  ],
  riskSignals: [
    {
      signal: "가격 저항 — 구매 전환 최대 장벽 (매출 영향: 월 추정 -180세트)",
      severity: "critical" as const,
      evidence:
        "'토토LP 단점' 검색 4,200건/월, 맘카페 가격 불만 91건 (전주 대비 1.8배). 소비자 인식: '14.8만원 = 가장 비싼 교구' (실제 1년 총비용은 세이펜보다 저렴)",
      suggestedResponse:
        "① 1년 총비용 비교표 상세페이지 최상단 ② 3개월 무이자(월 49,333원) ③ 체험 후 구매 프로그램. 예상 효과: 가격 불만 40% 감소, 전환율 +1.5%p",
    },
    {
      signal: "긍정률 최하위(47%) — SOV 1위인데 감성은 꼴찌",
      severity: "critical" as const,
      evidence:
        "5개 경쟁사 중 긍정률 최하위. 핑크퐁 72%, 세이펜 68% 대비 심각한 격차. '많이 알려졌지만 불만도 많다' → 인지도 투자가 역효과로 전환될 위험",
      suggestedResponse:
        "① 인지도 확대 전 긍정 콘텐츠 선행 ② 실구매자 후기 숏폼 집중 ③ 품질 개선 PR. 예상 효과: 3개월 내 긍정률 55% 도달 시 전환율 +2.3%p",
    },
    {
      signal: "플레이어 내구성·AS 불만 — 부정 구전 확산",
      severity: "warning" as const,
      evidence: "소비자원 상담 40% 증가, 별점 4.2→3.6 하락. '고장' '모터소리' 'AS 느림' 언급 38건",
      suggestedResponse:
        "2년 무상 보증 + 48시간 내 교환 보장. 예상 효과: 별점 3.6→4.0 회복 시 네이버 쇼핑 클릭률 +18%",
    },
    {
      signal: "'말하는 카드 교구' 시장에서 하티하티 급부상",
      severity: "warning" as const,
      evidence: "하티하티 SOV 28%, 3개월 전 12%에서 2.3배 성장. 가격 7.9만원으로 가성비 포지셔닝",
      suggestedResponse:
        "LP카드의 '음악 학습' 차별점 강화, 하티하티 대비 콘텐츠 양(200장 vs 80장) 부각",
    },
    {
      signal: "세이펜 신제품 출시 예고",
      severity: "watch" as const,
      evidence: "크레비스 SNS 신제품 티저 + '세이펜 신형' 검색량 2.1배 증가",
      suggestedResponse:
        "출시 전 선제적 비교 콘텐츠 발행 + '음악 학습은 세이펜이 못 하는 영역' 메시지",
    },
  ],
  competitorGaps: [
    {
      competitor: "세이펜 (크레비스)",
      price: "4.9만원 | 1년 총비용: 29만원",
      gap: "음악·오디오 학습 부재, 펜 분실·파손 빈번, 호환 도서 추가 비용 누적",
      ourAdvantage:
        "'1년 쓰면 세이펜보다 7만원 저렴 + 어휘 유지율 28% 높음'. 키워드 전투: '유아 오디오 교구' 세이펜 32% vs 토토LP 38% → 유지 필요",
    },
    {
      competitor: "핑크퐁 워크북+펜",
      price: "6.9만원 | 1년 총비용: 25만원",
      gap: "캐릭터 의존, 학습 깊이 부족, 유아기 지나면 흥미 급감",
      ourAdvantage:
        "'캐릭터 없이도 아이가 스스로 꺼내는 교구 — 자기주도 학습 습관'. 키워드 전투: '유아 음악 교구 추천' 핑크퐁 29% vs 토토LP 15% → 공략 필요",
    },
    {
      competitor: "윤선생 스마트올",
      price: "월 4.9만원 | 1년 총비용: 59만원",
      gap: "연 59만원 고비용, 약정 해지 위약금, 교구 반납",
      ourAdvantage:
        "'59만원 구독 vs 14.8만원 1회 구매 — 2년 쓰면 4배 절약'. 키워드 전투: '누리과정 교구' 윤선생 22% vs 토토LP 18% → B2B 확대로 역전 가능",
    },
    {
      competitor: "하티하티 카드 플레이어",
      price: "7.9만원 | 1년 총비용: 18만원",
      gap: "영어 콘텐츠 부족(80장), 교육과정 연계 없음",
      ourAdvantage:
        "'영어 파닉스 전문 200장 + 누리과정 연계 — 교육부 인증 교구'. 키워드 전투: '말하는 카드 교구' 하티하티 28% vs 토토LP 19% → 열세, 즉시 공략",
    },
  ],
  purchaseFunnel: {
    awareness: {
      keywords: [
        "유아 오디오 교구",
        "유아 음악 교구 추천",
        "두돌 세돌 교구 추천",
        "누리과정 교구",
        "말하는 카드 교구",
        "동화 카드 플레이어",
      ],
      totalSearchVolume: 64500,
      totoLPExposureRate: 0.18,
    },
    consideration: {
      keywords: ["한국삐아제", "키즈 LP 토토"],
      totalSearchVolume: 31400,
      brandToProductConversionRate: 0.43,
    },
    evaluation: {
      keywords: ["토토LP 후기", "토토LP 단점"],
      totalSearchVolume: 11000,
      negativeSearchRatio: 0.62,
    },
    estimatedMonthlyPurchases: "350~400세트",
    overallConversionRate: "0.54~0.62% (업계 평균 1.2% 대비 절반)",
  },
  confidence: "high",
};

const STRATEGY_OUTPUT = {
  messageStrategy: {
    primaryMessage: "LP카드 한 장이면, 우리 아이 영어가 시작됩니다",
    segmentMessages: [
      {
        segment: "첫 교구 탐색형 (두돌 세돌 추천 검색)",
        messages: [
          "두돌 아이 첫 영어, 스크린 없이 LP카드로 시작하세요",
          "교육부 누리과정 연계 인증 — 유치원 50곳이 선택한 첫 영어 교구",
        ],
        cta: "체험존 예약 또는 2주 체험 대여",
      },
      {
        segment: "비교 구매형 (오디오 교구·카드 플레이어 검색)",
        messages: [
          "세이펜 5만원 vs 토토LP 14.8만원 — 그런데 1년 쓰면 토토LP가 7만원 더 저렴합니다",
          "어휘 유지율 28% 차이 — 이 숫자가 3배 비싼 이유입니다",
        ],
        cta: "1년 비용 비교표 다운로드",
      },
      {
        segment: "브랜드 신뢰형 (한국삐아제 검색)",
        messages: [
          "30년 교육 철학이 담긴 한국삐아제의 대표 히트 교구",
          "15억 투자 유치한 교육 기업의 자신작 — 토토LP",
        ],
        cta: "제품 상세페이지 직행",
      },
      {
        segment: "대체 교구 탐색형 (말하는 카드 교구 검색)",
        messages: [
          "말하는 카드 그 이상 — 음악으로 배우는 영어, LP카드",
          "태블릿 대신, 아이 손에 LP카드를 쥐어주세요",
        ],
        cta: "숏폼 영상 시청",
      },
      {
        segment: "B2B 기관 구매 (누리과정 교구 검색)",
        messages: [
          "서울시교육청 인증, 유치원 50곳 도입 완료",
          "대량 구매 할인(세트당 12만원) + 교사용 활용 가이드 무상 제공",
        ],
        cta: "B2B 상담 신청",
      },
    ],
    tone: "따뜻하고 신뢰감 있는, 데이터로 뒷받침하되 공감 우선",
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
        topic: "토토LP vs 세이펜 완전 비교 — 1년 총비용·학습 효과·내구성",
        channel: "naver_blog",
        format: "비교 분석 블로그 + 상세페이지 CTA",
        timing: "월요일",
        targetKeyword: "유아 오디오 교구, 동화 카드 플레이어",
      },
      {
        topic: "32개월 아이가 LP카드 스스로 꺼내서 틀어요 — 실사용 영상",
        channel: "instagram",
        format: "릴스 30초 + 구매 링크 CTA",
        timing: "화요일",
        targetKeyword: "토토LP 후기, 키즈 LP 토토",
      },
      {
        topic: "유치원 선생님이 말하는 토토LP 누리과정 활용법",
        channel: "youtube",
        format: "교사 인터뷰 숏폼 3분",
        timing: "수요일",
        targetKeyword: "누리과정 교구",
      },
      {
        topic: "두돌 아이 첫 영어 교구 — LP카드로 시작하는 3가지 이유",
        channel: "naver_blog",
        format: "연령별 가이드 블로그 + 체험 CTA",
        timing: "목요일",
        targetKeyword: "두돌 세돌 교구 추천",
      },
      {
        topic: "말하는 카드 교구 TOP4 비교 — 토토LP가 특별한 이유",
        channel: "instagram",
        format: "카드뉴스 + 구매 링크",
        timing: "금요일",
        targetKeyword: "말하는 카드 교구, 유아 음악 교구 추천",
      },
      {
        topic: "교보문고 체험존 현장 반응 + 1년 비용 비교표 공유",
        channel: "맘카페",
        format: "후기 게시물 + 비교표 이미지",
        timing: "토요일",
        targetKeyword: "토토LP 단점 (부정 대응)",
      },
    ],
  },
  channelPriority: [
    {
      channel: "네이버 블로그 SEO",
      priority: 10,
      investment: "월 200만원",
      expectedROI: "5.8x",
      reason: "10개 키워드 중 7개가 네이버 검색 기반. 학부모 교구 검색의 70%가 네이버.",
    },
    {
      channel: "네이버 쇼핑 검색광고",
      priority: 9,
      investment: "월 300만원",
      expectedROI: "4.2x",
      reason:
        "'유아 오디오 교구' '동화 카드 플레이어' '말하는 카드 교구' 직접 구매 의향 키워드. 현재 광고 미집행.",
    },
    {
      channel: "인스타그램 릴스",
      priority: 8,
      investment: "월 150만원",
      expectedROI: "3.5x",
      reason: "'토토LP 후기' 검색자의 60%가 인스타에서 추가 탐색.",
    },
    {
      channel: "유튜브",
      priority: 7,
      investment: "월 100만원",
      expectedROI: "2.8x",
      reason: "'토토LP vs 세이펜' 비교 영상 수요 높으나 공식 콘텐츠 0건.",
    },
    {
      channel: "맘카페 (네이버 카페)",
      priority: 6,
      investment: "월 50만원",
      expectedROI: "방어 가치",
      reason: "가격 논란 발원지. 모니터링 + 공식 답변 미대응 시 부정 확산.",
    },
    {
      channel: "오프라인 체험존",
      priority: 5,
      investment: "월 400만원",
      expectedROI: "2.1x",
      reason: "체험→구매 전환율 35~40% 검증. 체험 후 온라인 구매 유도.",
    },
  ],
  totalInvestment: { monthly: 12000000, expectedAdditionalRevenue: 58700000, overallROI: "4.9x" },
  riskMitigation: [
    {
      risk: "가격 저항(14.8만원) → 장바구니 이탈률 추정 65%",
      timeline: "즉시~2주",
      actions: [
        "네이버 쇼핑 상세페이지에 '1년 총비용 비교 인포그래픽' 최상단 배치",
        "3개월 무이자 할부 도입 + '하루 1,644원' 표기",
        "체험 후 구매 프로그램: 2주 대여(2만원) → 구매 시 전액 차감",
      ],
      target: "장바구니 이탈률 65% → 45%",
    },
    {
      risk: "긍정률 최하위(47%) → 인지도 투자 역효과 위험",
      timeline: "1~4주",
      actions: [
        "실구매자 아이 반응 숏폼 촬영 착수 (월 8회 발행)",
        "기존 만족 구매자 후기 캠페인 (네이버 쇼핑 포토리뷰 500원 적립)",
        "'어휘 유지율 28%' 연구 결과 전면 배치",
      ],
      target: "긍정률 47% → 55% (3개월 내)",
    },
    {
      risk: "플레이어 내구성·AS 불만 → 별점 3.6",
      timeline: "즉시~4주",
      actions: [
        "2년 무상 보증 + 48시간 내 교환 정책 공식 발표",
        "기존 구매자 '플레이어 무상 점검 이벤트' 시행",
        "제조사와 내구성 개선 협의 (모터 소음·카드 인식 오류)",
      ],
      target: "별점 3.6 → 4.0 (2개월 내)",
    },
    {
      risk: "'말하는 카드 교구' 시장 하티하티 급부상",
      timeline: "즉시~2주",
      actions: [
        "하티하티 대비 '영어 전문 200장 vs 한국어 80장' 차별점 콘텐츠",
        "'말하는 카드 교구' 키워드 네이버 블로그 SEO 콘텐츠 발행",
      ],
      target: "SOV 19% → 30% (2개월 내)",
    },
  ],
  confidence: "high",
};

const SUMMARY_OUTPUT = {
  oneLiner:
    "토토LP 교육, 10개 연관검색어 통합 분석 — '높은 인지도 + 낮은 긍정률' 구조적 취약점 해소와 32,300건 미포획 시장 공략이 핵심 과제",
  keyTakeaways: [
    "매출 기회 규모: 10개 키워드 월간 총 검색량 111,700건. 구매 의향 키워드 비중 62% → 월 약 69,000건 잠재 구매 검색 유입 가능",
    "퍼널 병목: '토토LP 후기'(6,800건) → '토토LP 단점'(4,200건) 전환율 62% → 후기 탐색자 중 62%가 단점 검색으로 이탈 (업계 평균 35~40%)",
    "경쟁 포지션: SOV 38% 1위이나 긍정률 47% 최하위 — 핑크퐁 72%, 세이펜 68% 대비 심각. 인지도만 올리면 역효과",
    "가격 오해: 초기 가격 최고가(14.8만원)이나 1년 총비용 4위(22만원). 세이펜(29만원)보다 7만원 저렴 — 비교표 전면 배치 필수",
    "미포획 시장: '두돌 세돌 교구 추천'(19,800건), '말하는 카드 교구'(5,300건), '누리과정 교구'(7,200건) — 합계 32,300건 잠재 고객이 토토LP 미인지",
  ],
  criticalActions: [
    {
      action:
        "네이버 쇼핑 검색광고 세팅 — '유아 오디오 교구' '동화 카드 플레이어' '말하는 카드 교구' 3개 키워드 (예산 월 300만원)",
      priority: "high",
      week: 1,
    },
    {
      action:
        "상세페이지 리뉴얼 — ① 1년 총비용 비교 인포그래픽 ② 어휘 유지율 28% 연구 데이터 ③ 교육부 인증 뱃지 ④ 2년 무상 보증",
      priority: "high",
      week: 1,
    },
    {
      action: "'토토LP vs 세이펜' 비교 블로그 발행 + 실구매자 아이 반응 숏폼 시리즈 런칭 (월 8회)",
      priority: "high",
      week: 2,
    },
    {
      action: "'두돌 세돌 교구 추천' SEO 블로그 시리즈 + 체험 후 구매 프로그램 런칭",
      priority: "high",
      week: 3,
    },
    {
      action: "누리과정 교사 활용 가이드 PDF 제작 + '말하는 카드 교구 TOP4 비교' 콘텐츠",
      priority: "medium",
      week: 4,
    },
  ],
  thirtyDayKPI: {
    seoTop10Keywords: "3개 → 7개",
    additionalMonthlySales: "+250~400세트 (월 매출 +3,700~5,900만원)",
    positiveRate: "47% → 52%",
    cartAbandonRate: "65% → 50%",
    negativeToPositiveRatio: "0.5 → 1.0",
  },
  confidence: "high",
};

const INTEGRATED_SECTIONS = [
  {
    id: "section-1",
    title: "진단 요약 — 토토LP는 지금 어디에 있는가",
    content: `${SUMMARY_OUTPUT.oneLiner}\n\n핵심 진단:\n${SUMMARY_OUTPUT.keyTakeaways.map((t) => `• ${t}`).join("\n")}\n\n결론: 토토LP는 '광고 투자' 전에 '가격 오해 해소 + 긍정 후기 확보 + 미인지 시장 진입'을 선행해야 한다.`,
    sourceModule: "#08",
  },
  {
    id: "section-2",
    title: "시장 속의 토토LP — 소비자 인식 지도",
    content: `10개 연관검색어를 소비자 인식 단계별로 재구성:\n\n[1층: 토토LP를 모르는 시장 — 월 32,300건] 감성 54~65%로 높음, 선점 효과 극대\n  인지: ${OPPORTUNITY_OUTPUT.purchaseFunnel.awareness.keywords.join(", ")}\n  토토LP 노출률: ${(OPPORTUNITY_OUTPUT.purchaseFunnel.awareness.totoLPExposureRate * 100).toFixed(0)}% (세이펜 34% 대비 절반)\n\n[2층: 비교 대상으로만 보는 시장 — 월 36,900건] '비싸다' 프레임에 갇힘\n  비교: ${OPPORTUNITY_OUTPUT.purchaseFunnel.consideration.keywords.join(", ")}\n  브랜드→제품 전환: ${(OPPORTUNITY_OUTPUT.purchaseFunnel.consideration.brandToProductConversionRate * 100).toFixed(0)}%\n\n[3층: 구매 직전 이탈 — 월 11,000건] 후기→단점 전환 ${(OPPORTUNITY_OUTPUT.purchaseFunnel.evaluation.negativeSearchRatio * 100).toFixed(0)}% (업계 평균 35~40%)\n  평가: ${OPPORTUNITY_OUTPUT.purchaseFunnel.evaluation.keywords.join(", ")}\n\n전체 전환율: ${OPPORTUNITY_OUTPUT.purchaseFunnel.overallConversionRate}`,
    sourceModule: "#01",
  },
  {
    id: "section-3",
    title: "인식 vs 현실 — 토토LP가 풀어야 할 3가지 오해",
    content: `종합 감성: 긍정 ${(SENTIMENT_OUTPUT.sentimentRatio.positive * 100).toFixed(0)}% · 부정 ${(SENTIMENT_OUTPUT.sentimentRatio.negative * 100).toFixed(0)}% · 중립 ${(SENTIMENT_OUTPUT.sentimentRatio.neutral * 100).toFixed(0)}%\n\n오해 1: '토토LP는 가장 비싼 교구'\n  소비자 인식: 초기 14.8만원 → 불만 ${SENTIMENT_OUTPUT.topKeywords.find((k) => k.term === "가격저항")?.count}건\n  현실: 1년 총비용 ${OPPORTUNITY_OUTPUT.pricePositioning.competitors.map((c) => `${c.brand} ${(c.annualTotalCost / 10000).toFixed(0)}만원`).join(" < ")}\n  ${OPPORTUNITY_OUTPUT.pricePositioning.insight}\n\n오해 2: '품질이 나쁘다' → 별점 4.2→3.6, 내구성 불만 ${SENTIMENT_OUTPUT.topKeywords.find((k) => k.term === "내구성불만")?.count}건\n  현실: 고장률 8%(업계 5~7%), AS 대응 속도(7일)가 핵심 문제\n\n오해 3: 'LP만 틀어주는 단순 교구' → 비교 문의 ${SENTIMENT_OUTPUT.topKeywords.find((k) => k.term === "세이펜비교")?.count}건이나 공식 비교 콘텐츠 0건\n  현실: AI 발음 분석(87%), 파닉스 체계, 어휘 유지율 +28%, 누리과정 인증`,
    sourceModule: "#03",
  },
  {
    id: "section-4",
    title: "경쟁 지형과 토토LP의 해자",
    content: `SOV 통합:\n${OPPORTUNITY_OUTPUT.shareOfVoice.map((s) => `${s.isOurs ? "★ " : ""}${s.brand}: ${s.mentions}건 (긍정률 ${Math.round(s.sentimentPositive * 100)}%)`).join("\n")}\n\n전장별 승패:\n${OPPORTUNITY_OUTPUT.sovByKeyword.map((s) => `• '${s.keyword}' — 토토LP ${(s.totoLP * 100).toFixed(0)}% vs ${s.competitor} ${(s.competitorShare * 100).toFixed(0)}%`).join("\n")}\n\n경쟁사 약점 vs 토토LP 셀링포인트:\n${OPPORTUNITY_OUTPUT.competitorGaps.map((c) => `■ ${c.competitor}(${c.price}): ${c.gap}\n  → ${c.ourAdvantage}`).join("\n")}\n\n토토LP의 해자(경쟁사가 단기 모방 불가):\n① 촉각학습 효과 논문(어휘 유지율 +28%)\n② 교육청 인증 + 유치원 50곳 채택\n③ LP카드라는 독특한 물리적 학습 경험`,
    sourceModule: "#06",
  },
  {
    id: "section-5",
    title: "구매 전환 병목 해부 — 3곳의 누수",
    content: `병목 1: 브랜드→제품 전환 단절 (월 15,800건 소실)\n  '한국삐아제' 22,000건 중 '키즈LP토토' 9,400건 전환 43% — 삐아제를 아는데 토토LP 페이지에 안 감\n\n병목 2: 후기→부정 이탈 (월 2,600건 이탈)\n  후기→단점 전환 62% (업계 35~40%). 긍정 영상 후기 12% (핑크퐁 35%). 부정 콘텐츠가 SEO 상위 독점.\n\n병목 3: 카테고리→제품 미연결 (월 32,300건 미접촉)\n  6개 카테고리 키워드 중 토토LP SOV 1위는 '유아 오디오 교구' 1곳뿐. 나머지 5곳에서 5~24%로 열세.\n\n콘텐츠 갭:\n${OPPORTUNITY_OUTPUT.contentGaps.map((g) => `• ${g.topic} [${g.ourStatus}] → ${g.revenueImpact}`).join("\n")}\n\n3개 병목 합산 판매 손실: 월 추정 370세트(약 5,480만원)`,
    sourceModule: "#06",
  },
  {
    id: "section-6",
    title: "숨은 시장과 변곡점 — 기회의 창",
    content: `◆ 잠재 시장 (토토LP 미인지, 합산 32,300건/월)\n  첫 교구 탐색 부모(19,800건) — 감성 65%, 토토LP 노출 5% 미만\n  비디지털 교구 탐색(5,300건) — 토토LP 해자와 완벽 부합하나 SOV 19%(3위)\n  기관 구매(7,200건) — 교육청 50곳 레퍼런스 보유, 교사 콘텐츠 0건\n  → 전환율 1.5% 기준 월 +150세트(+2,220만원) 잠재력\n\n◆ 모멘텀 (2~3주 내 소멸)\n${MACRO_VIEW_OUTPUT.inflectionPoints.map((p) => `  [${p.date}] ${p.event} (${p.impact})`).join("\n")}\n\n◆ 리스크 (매일 누적)\n${OPPORTUNITY_OUTPUT.riskSignals.map((r) => `  [${r.severity.toUpperCase()}] ${r.signal}`).join("\n")}\n\n결론: 모멘텀의 유통기한은 2~3주, 위협은 매일 누적. 지금이 행동 시점.`,
    sourceModule: "#01",
  },
  {
    id: "section-7",
    title: "방치 vs 실행 — 6개월 후 시나리오",
    content:
      "시나리오 A (방치):\n  1개월: 부정 게시물 검색 상위 고착, 세이펜 신제품으로 비교 열세 심화\n  3개월: 하티하티 SOV 40% 장악, 토토LP SOV 38%→30%, 교육청 모멘텀 소멸\n  6개월: 긍정률 47%→40%, 월 판매 350→220건, 연 매출 -2.3억\n\n시나리오 B (실행):\n  1개월: 가격 오해 해소로 불만 40% 감소, 검색광고 가동, 영상 후기 12%→20%\n  3개월: SEO 3→7개 키워드, 신규 고객층 확보, 긍정률 47%→55%\n  6개월: SOV 38%→42%, 월 판매 350→600건, 연 매출 +4.4억\n\n격차: 연 6.7억원 | 투자: 월 1,200만원(6개월 7,200만원) | ROI 9.3x",
    sourceModule: "#07",
  },
  {
    id: "section-8",
    title: "통합 전략 — 3단계 시장 공략 로드맵",
    content: `━━ 1단계: 방어 (1~2주) — 부정 인식 차단 ━━\n  ① 상세페이지 '1년 총비용 비교표' 최상단\n  ② 2년 무상 보증 + 48시간 교환 정책 발표\n  ③ 맘카페 부정 게시물 팩트 기반 공식 답변\n  ④ 3개월 무이자(하루 1,644원) + 체험 후 구매 프로그램\n  목표: 가격 불만 40% 감소, 이탈률 65%→45%\n\n━━ 2단계: 전환 (3~4주) — 긍정 콘텐츠 우위 ━━\n  ① 아이 반응 숏폼 월 8회 (인스타+유튜브)\n  ② 'VS 세이펜' 데이터 기반 비교 블로그 (네이버 SEO)\n  ③ 만족 구매자 후기 캠페인 + 네이버 쇼핑 광고 3키워드(월 300만원)\n  목표: 긍정률 +8%p, 월 +120세트\n\n━━ 3단계: 확장 (5~8주) — 미인지 시장 진입 ━━\n  ① '두돌 교구 추천' 연령별 가이드 시리즈\n  ② '말하는 카드 교구 TOP4' 차별화 콘텐츠\n  ③ 교사 활용 가이드 PDF + 체험존 전국 확대\n  ④ LP카드 번들팩·정기구독 상품 기획\n  목표: 잠재 시장 노출 5%→25%, 월 +150세트\n\n순서의 이유: 부정 차단(1단계) 없이 콘텐츠(2단계)를 만들면 '비싸다' 댓글이 달리고, 신규 시장(3단계)에 가도 불만 선입견이 따라온다.`,
    sourceModule: "#07",
  },
  {
    id: "section-9",
    title: "세그먼트별 메시지 전략",
    content: `핵심 메시지: "${STRATEGY_OUTPUT.messageStrategy.primaryMessage}"\n\n${STRATEGY_OUTPUT.messageStrategy.segmentMessages.map((s) => `● ${s.segment}\n${s.messages.map((m) => `  • "${m}"`).join("\n")}\n  CTA: ${s.cta}`).join("\n\n")}\n\n톤앤매너: ${STRATEGY_OUTPUT.messageStrategy.tone}`,
    sourceModule: "#07",
  },
  {
    id: "section-10",
    title: "투자 계획과 기대 수익",
    content:
      STRATEGY_OUTPUT.channelPriority
        .map(
          (c) =>
            `${c.priority}/10 — ${c.channel} (${c.investment} / ROI ${c.expectedROI})\n  ${c.reason}`,
        )
        .join("\n\n") +
      `\n\n월 총 투자: ${(STRATEGY_OUTPUT.totalInvestment.monthly / 10000).toLocaleString()}만원\n예상 추가 매출: ${(STRATEGY_OUTPUT.totalInvestment.expectedAdditionalRevenue / 10000).toLocaleString()}만원/월 (ROI ${STRATEGY_OUTPUT.totalInvestment.overallROI})\n손익분기점: 82세트/월`,
    sourceModule: "#07",
  },
  {
    id: "section-11",
    title: "30일 액션 플랜",
    content:
      SUMMARY_OUTPUT.criticalActions
        .map((a) => `[${a.priority.toUpperCase()}] W${a.week} | ${a.action}`)
        .join("\n") +
      `\n\n30일 목표:\n• SEO 상위 10위: ${SUMMARY_OUTPUT.thirtyDayKPI.seoTop10Keywords}\n• 추가 판매: ${SUMMARY_OUTPUT.thirtyDayKPI.additionalMonthlySales}\n• 긍정률: ${SUMMARY_OUTPUT.thirtyDayKPI.positiveRate}\n• 이탈률: ${SUMMARY_OUTPUT.thirtyDayKPI.cartAbandonRate}\n• 부정/긍정 비율: ${SUMMARY_OUTPUT.thirtyDayKPI.negativeToPositiveRatio}`,
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
      `INSERT INTO reports (id, tenant_id, job_id, kind, title, sections, metadata) VALUES ($1, $2, $3, 'signalcraft_integrated', $4, $5, $6) ON CONFLICT (id) DO UPDATE SET job_id = EXCLUDED.job_id, title = EXCLUDED.title, sections = EXCLUDED.sections, metadata = EXCLUDED.metadata`,
      [
        REPORT_ID,
        TENANT,
        JOB_ID,
        "토토LP 교육 — 10개 키워드 통합 마케팅 분석 리포트",
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
          subject: "토토LP 10개 키워드 통합 분석 — 월 111,700건 검색 시장 공략 전략",
          body: "안녕하세요, GoldenCheck입니다.\n\n토토LP 교육 10개 연관검색어 통합 분석 결과를 공유드립니다.\n\n[핵심 발견]\n• 월간 총 검색량 111,700건, 구매 의향 키워드 62% → 월 69,000건 잠재 구매 검색\n• SOV 38% 1위이나 긍정률 47% 최하위 — '높은 인지도 + 낮은 긍정률' 구조적 취약점\n• 1년 총비용 기준 세이펜보다 7만원 저렴 — 소비자의 가격 오해 해소 필수\n• 미포획 시장 32,300건: 두돌 세돌 교구·말하는 카드 교구·누리과정 교구\n\n본 리포트 포함 내용:\n• 구매 퍼널 4단계 전환율 분석 + 가격 포지셔닝 전략\n• 5개 고객 세그먼트별 맞춤 메시지 전략\n• ROI 기반 채널 투자 계획 (월 1,200만원 / ROI 4.9x)\n• 30일 주차별 액션 플랜 + KPI 목표\n\n자세한 분석은 첨부 리포트를 참조하세요.",
          cta: "통합 분석 리포트 전문 확인하기",
          targetSegment: "토토LP 판매사 마케팅·영업 담당자",
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
              channel: "네이버 블로그",
              topic: "토토LP vs 세이펜 완전 비교 — 1년 총비용·학습 효과·내구성",
              format: "비교 분석 블로그 + 상세페이지 CTA",
              targetKeyword: "유아 오디오 교구, 동화 카드 플레이어",
            },
            {
              day: "화",
              channel: "인스타그램",
              topic: "32개월 아이가 LP카드 스스로 꺼내서 틀어요 — 실사용 영상",
              format: "릴스 30초 + 구매 링크 CTA",
              targetKeyword: "토토LP 후기, 키즈 LP 토토",
            },
            {
              day: "수",
              channel: "유튜브",
              topic: "유치원 선생님이 말하는 토토LP 누리과정 활용법",
              format: "교사 인터뷰 숏폼 3분",
              targetKeyword: "누리과정 교구",
            },
            {
              day: "목",
              channel: "네이버 블로그",
              topic: "두돌 아이 첫 영어 교구 — LP카드로 시작하는 3가지 이유",
              format: "연령별 가이드 블로그 + 체험 CTA",
              targetKeyword: "두돌 세돌 교구 추천",
            },
            {
              day: "금",
              channel: "인스타그램",
              topic: "말하는 카드 교구 TOP4 비교 — 토토LP가 특별한 이유",
              format: "카드뉴스 + 구매 링크",
              targetKeyword: "말하는 카드 교구, 유아 음악 교구 추천",
            },
            {
              day: "토",
              channel: "맘카페",
              topic: "교보문고 체험존 현장 반응 + 1년 비용 비교표 공유",
              format: "후기 게시물 + 비교표 이미지",
              targetKeyword: "토토LP 단점 (부정 대응)",
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
