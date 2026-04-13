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
const KEYWORD = "어린이AI 지휘자";
const NOW = new Date().toISOString();

const RAW_POSTS = [
  {
    source: "naver_news",
    postId: "naver-001",
    author: "에듀테크리뷰",
    content:
      "어린이AI 지휘자가 출시 3개월 만에 누적 다운로드 5만 건을 돌파했다. AI가 아이의 손동작을 인식해 오케스트라를 지휘하는 콘셉트가 학부모들 사이에서 큰 호응을 얻고 있다.",
    likes: 387,
    commentsCnt: 52,
    viewCnt: 14200,
    publishedAt: "2026-04-10T09:00:00Z",
    url: "https://example.com/news/001",
  },
  {
    source: "naver_news",
    postId: "naver-002",
    author: "키즈앱매거진",
    content:
      "교육부 디지털 교과서 시범 사업에 어린이AI 지휘자가 음악 교육 보조 도구로 선정됐다. 전국 120개 초등학교에서 시범 운영을 시작하며 AI 음악 교육의 가능성을 보여주고 있다.",
    likes: 445,
    commentsCnt: 67,
    viewCnt: 18900,
    publishedAt: "2026-04-09T14:30:00Z",
    url: "https://example.com/news/002",
  },
  {
    source: "naver_news",
    postId: "naver-003",
    author: "음악교육신문",
    content:
      "아동 음악 전문가들은 AI 지휘 체험이 리듬감과 표현력 발달에 긍정적이라고 평가했다. 다만 실제 악기 연주를 대체할 수는 없다는 한계도 지적됐다.",
    likes: 198,
    commentsCnt: 41,
    viewCnt: 8400,
    publishedAt: "2026-04-08T11:00:00Z",
    url: "https://example.com/news/003",
  },
  {
    source: "naver_news",
    postId: "naver-004",
    author: "맘카페뉴스",
    content:
      "7세 아들이 어린이AI 지휘자 쓰면서 클래식 음악에 관심을 갖기 시작했어요. 베토벤, 모차르트 이름을 줄줄 외우네요. 다만 월 구독료 9,900원이 좀 부담이라는 의견도 있어요.",
    likes: 623,
    commentsCnt: 128,
    viewCnt: 25600,
    publishedAt: "2026-04-07T10:00:00Z",
    url: "https://example.com/news/004",
  },
  {
    source: "naver_news",
    postId: "naver-005",
    author: "스타트업데일리",
    content:
      "어린이AI 지휘자 개발사가 시리즈A 투자 30억원을 유치했다. 동작 인식 AI 기술과 음악 교육 콘텐츠의 결합이 투자자들의 관심을 끌었으며, 글로벌 진출도 준비 중이다.",
    likes: 312,
    commentsCnt: 38,
    viewCnt: 12700,
    publishedAt: "2026-04-06T15:00:00Z",
    url: "https://example.com/news/005",
  },
  {
    source: "naver_news",
    postId: "naver-006",
    author: "학부모커뮤니티",
    content:
      "어린이AI 지휘자 체험단 후기: 아이가 화면 속 오케스트라를 지휘하면서 박자 개념을 자연스럽게 익혔어요. 문제는 태블릿 화면 크기. TV 미러링하면 훨씬 몰입감이 좋습니다.",
    likes: 534,
    commentsCnt: 95,
    viewCnt: 21300,
    publishedAt: "2026-04-05T09:30:00Z",
    url: "https://example.com/news/006",
  },
  {
    source: "hackernews",
    postId: "hn-001",
    author: "edtech_insider",
    content:
      "Korean startup launches AI Conductor for Kids - uses computer vision to track hand gestures and lets children conduct a virtual orchestra. 50K downloads in 3 months. Interesting EdTech approach.",
    likes: 134,
    commentsCnt: 42,
    viewCnt: 5600,
    publishedAt: "2026-04-09T18:00:00Z",
    url: "https://example.com/hn/001",
  },
  {
    source: "hackernews",
    postId: "hn-002",
    author: "music_ai_dev",
    content:
      "The gesture recognition tech behind 어린이AI 지휘자 is impressive. MediaPipe-based hand tracking with custom ML model for conducting gestures. Latency under 50ms. Wonder about their training data.",
    likes: 89,
    commentsCnt: 31,
    viewCnt: 3800,
    publishedAt: "2026-04-08T20:00:00Z",
    url: "https://example.com/hn/002",
  },
  {
    source: "naver_news",
    postId: "naver-007",
    author: "디지털교육비평",
    content:
      "AI 음악 교육 앱의 한계를 지적하는 목소리도 있다. 실제 지휘와 달리 화면 속 반응이 제한적이며, 악기별 뉘앙스 표현이 부족하다. 교육적 깊이보다 흥미 위주라는 비판도 있다.",
    likes: 156,
    commentsCnt: 63,
    viewCnt: 7800,
    publishedAt: "2026-04-04T13:00:00Z",
    url: "https://example.com/news/007",
  },
  {
    source: "naver_news",
    postId: "naver-008",
    author: "앱스토어분석",
    content:
      "어린이 교육 앱 카테고리에서 어린이AI 지휘자가 매출 TOP 5에 진입했다. 경쟁 앱 대비 세션당 체류시간이 2.3배 길어 높은 몰입도를 보여주고 있다.",
    likes: 267,
    commentsCnt: 33,
    viewCnt: 11400,
    publishedAt: "2026-04-03T16:00:00Z",
    url: "https://example.com/news/008",
  },
  {
    source: "hackernews",
    postId: "hn-003",
    author: "ai_education",
    content:
      "AI Conductor for Kids just got selected for Korea's digital textbook pilot. 120 schools. This could be a model for how AI-powered creative education scales in public school systems.",
    likes: 76,
    commentsCnt: 18,
    viewCnt: 3200,
    publishedAt: "2026-04-07T22:00:00Z",
    url: "https://example.com/hn/003",
  },
  {
    source: "naver_news",
    postId: "naver-009",
    author: "클래식음악FM",
    content:
      "서울시립교향악단이 어린이AI 지휘자와 콜라보 공연을 발표했다. 아이들이 앱으로 실제 오케스트라를 지휘하는 참여형 공연으로, 2,000석이 10분 만에 매진됐다.",
    likes: 578,
    commentsCnt: 87,
    viewCnt: 23400,
    publishedAt: "2026-04-02T10:00:00Z",
    url: "https://example.com/news/009",
  },
  {
    source: "naver_news",
    postId: "naver-010",
    author: "유치원교사모임",
    content:
      "유치원 수업에 어린이AI 지휘자를 도입한 사례가 늘고 있다. 아이들의 집중력이 높아지고 협동 학습 효과도 관찰됐다. 다만 기기 보급과 Wi-Fi 환경이 과제다.",
    likes: 345,
    commentsCnt: 72,
    viewCnt: 15100,
    publishedAt: "2026-04-01T08:00:00Z",
    url: "https://example.com/news/010",
  },
  {
    source: "naver_news",
    postId: "naver-011",
    author: "IT조선",
    content:
      "어린이AI 지휘자 영어·일본어 버전 출시가 예고됐다. 일본 소니뮤직과 콘텐츠 라이선싱 협의 중이며, 미국 시장은 Roblox 내 미니게임 형태로 진출을 검토 중이다.",
    likes: 289,
    commentsCnt: 44,
    viewCnt: 12100,
    publishedAt: "2026-03-31T11:00:00Z",
    url: "https://example.com/news/011",
  },
  {
    source: "hackernews",
    postId: "hn-004",
    author: "startup_asia",
    content:
      "Korean AI Conductor for Kids raised $2.3M Series A. Sony Music licensing deal in the works. The Roblox integration idea is smart - meet kids where they already are.",
    likes: 102,
    commentsCnt: 22,
    viewCnt: 4500,
    publishedAt: "2026-04-06T14:00:00Z",
    url: "https://example.com/hn/004",
  },
];

const SENTIMENT_OUTPUT = {
  sentimentRatio: { positive: 0.58, negative: 0.18, neutral: 0.24 },
  topKeywords: [
    { term: "AI 지휘", count: 52, sentiment: "positive" },
    { term: "음악교육", count: 38, sentiment: "positive" },
    { term: "동작인식", count: 28, sentiment: "positive" },
    { term: "클래식", count: 25, sentiment: "positive" },
    { term: "몰입도", count: 22, sentiment: "positive" },
    { term: "구독료", count: 19, sentiment: "negative" },
    { term: "태블릿", count: 17, sentiment: "neutral" },
    { term: "교육부시범", count: 16, sentiment: "positive" },
    { term: "체류시간", count: 14, sentiment: "positive" },
    { term: "실제악기", count: 13, sentiment: "negative" },
    { term: "글로벌진출", count: 12, sentiment: "positive" },
    { term: "흥미위주", count: 11, sentiment: "negative" },
    { term: "콜라보공연", count: 10, sentiment: "positive" },
    { term: "유치원도입", count: 9, sentiment: "positive" },
    { term: "Wi-Fi환경", count: 7, sentiment: "negative" },
  ],
  frameCompetition: [
    { label: "AI 기술 혁신·교육 효과", share: 0.38 },
    { label: "음악 흥미 유발·몰입 체험", share: 0.27 },
    { label: "가격·접근성 이슈", share: 0.15 },
    { label: "실제 음악 교육 대체 한계", share: 0.12 },
    { label: "글로벌 확장·투자 소식", share: 0.08 },
  ],
  confidence: "high",
  disclaimer: "네이버 뉴스 및 HackerNews 기반 분석으로, 전체 여론을 대표하지 않을 수 있습니다.",
};

const MACRO_VIEW_OUTPUT = {
  overallDirection: "positive",
  summary:
    "어린이AI 지휘자는 AI 동작 인식과 클래식 음악 교육을 결합한 혁신적 에듀테크 제품으로, 출시 3개월 만에 5만 다운로드를 달성하며 빠른 성장세를 보이고 있다. 교육부 디지털 교과서 시범 선정(120개교)과 시리즈A 30억 투자 유치가 핵심 성장 신호이며, 서울시향 콜라보 공연 매진 등 오프라인 연계까지 확장되고 있다. 다만 구독료 부담, 실제 악기 대체 한계, 교육적 깊이 부족이라는 비판은 지속적으로 모니터링이 필요하다.",
  inflectionPoints: [
    { date: "2026-04-09", event: "교육부 디지털 교과서 시범 사업 선정 (120개교)", impact: "high" },
    { date: "2026-04-06", event: "시리즈A 30억원 투자 유치 발표", impact: "high" },
    { date: "2026-04-02", event: "서울시향 콜라보 공연 2,000석 10분 매진", impact: "high" },
    { date: "2026-04-03", event: "앱스토어 교육 카테고리 매출 TOP 5 진입", impact: "medium" },
    { date: "2026-04-04", event: "교육적 깊이 부족 비판 기사 게재", impact: "low" },
  ],
  dailyMentionTrend: [
    { date: "2026-04-01", count: 18, sentiment: "positive" },
    { date: "2026-04-02", count: 45, sentiment: "positive" },
    { date: "2026-04-03", count: 28, sentiment: "positive" },
    { date: "2026-04-04", count: 22, sentiment: "negative" },
    { date: "2026-04-05", count: 35, sentiment: "positive" },
    { date: "2026-04-06", count: 52, sentiment: "positive" },
    { date: "2026-04-07", count: 38, sentiment: "positive" },
    { date: "2026-04-08", count: 24, sentiment: "neutral" },
    { date: "2026-04-09", count: 61, sentiment: "positive" },
    { date: "2026-04-10", count: 33, sentiment: "positive" },
  ],
  confidence: "high",
};

const OPPORTUNITY_OUTPUT = {
  shareOfVoice: [
    { brand: "어린이AI 지휘자", mentions: 38, sentimentPositive: 0.68, isOurs: true },
    { brand: "JoyTunes (Simply Piano)", mentions: 22, sentimentPositive: 0.52, isOurs: false },
    { brand: "야마하 스마트피아니스트", mentions: 16, sentimentPositive: 0.58, isOurs: false },
    { brand: "뮤직몬스터", mentions: 12, sentimentPositive: 0.45, isOurs: false },
    { brand: "리틀뮤지션", mentions: 8, sentimentPositive: 0.62, isOurs: false },
  ],
  positioning: [
    {
      brand: "어린이AI 지휘자",
      mentionVolume: 38,
      positiveRate: 0.68,
      distinctKeyword: "AI 동작인식",
    },
    { brand: "JoyTunes", mentionVolume: 22, positiveRate: 0.52, distinctKeyword: "피아노 연습" },
    { brand: "야마하", mentionVolume: 16, positiveRate: 0.58, distinctKeyword: "악기 연동" },
    { brand: "뮤직몬스터", mentionVolume: 12, positiveRate: 0.45, distinctKeyword: "게임형 학습" },
    { brand: "리틀뮤지션", mentionVolume: 8, positiveRate: 0.62, distinctKeyword: "유아 리듬" },
  ],
  contentGaps: [
    {
      topic: "학부모 체험 후기 영상",
      competitorActivity: "JoyTunes가 유튜브에서 학부모 리뷰 시리즈 운영 (월 8회, 평균 5만 조회)",
      ourStatus: "weak" as const,
      suggestedAction: "앱 사용 아이 반응 숏폼 영상 + 학부모 인터뷰 시리즈 런칭",
      estimatedImpact: "high" as const,
    },
    {
      topic: "음악 교육 효과 블로그 콘텐츠",
      competitorActivity:
        "야마하가 네이버 블로그에서 '음악이 두뇌에 미치는 영향' 시리즈 (주 2회, SEO 상위)",
      ourStatus: "absent" as const,
      suggestedAction: "AI 지휘 체험이 리듬감·집중력에 미치는 효과 연구 기반 콘텐츠 발행",
      estimatedImpact: "high" as const,
    },
    {
      topic: "교사용 수업 가이드",
      competitorActivity:
        "뮤직몬스터가 교사 대상 무료 수업 지도안 배포 (월 3회, 교사 커뮤니티 활성)",
      ourStatus: "absent" as const,
      suggestedAction: "초등 음악 교과 연계 수업 지도안 + 교사 워크숍 운영",
      estimatedImpact: "medium" as const,
    },
    {
      topic: "클래식 음악 해설 인스타",
      competitorActivity: "리틀뮤지션 인스타에서 '오늘의 클래식' 카드뉴스 (일 1회, 팔로워 2.5만)",
      ourStatus: "absent" as const,
      suggestedAction: "지휘곡 해설 + 작곡가 스토리 카드뉴스 시리즈",
      estimatedImpact: "medium" as const,
    },
  ],
  riskSignals: [
    {
      signal: "월 구독료 9,900원에 대한 가격 저항",
      severity: "warning" as const,
      evidence: "맘카페에서 '비싸다' '무료 체험 후 해지' 관련 언급 14건, 전주 대비 2.5배 증가",
      suggestedResponse: "연간 결제 30% 할인 + 형제 할인 도입, 무료 체험 기간 7일→14일 연장",
    },
    {
      signal: "실제 악기 교육 대체 불가 비판",
      severity: "watch" as const,
      evidence: "음악 교육 전문가 부정 리뷰 4건 — '흥미 유발은 좋지만 실기 대체는 안 된다'",
      suggestedResponse:
        "포지셔닝 명확화: '악기 교육 입문 도우미'로 메시지 전환, 음악학원 제휴 프로모션",
    },
    {
      signal: "경쟁사 JoyTunes 한국어 버전 강화 움직임",
      severity: "warning" as const,
      evidence: "JoyTunes 앱스토어에 한국어 업데이트 공지 + 인스타 한국 계정 개설",
      suggestedResponse:
        "차별점(지휘 체험·동작인식) 강조 캠페인 + 교육부 시범 선정 레퍼런스 적극 홍보",
    },
  ],
  competitorGaps: [
    {
      competitor: "JoyTunes",
      gap: "피아노 한정, 오케스트라 체험 없음",
      ourAdvantage: "AI 동작인식 기반 풀 오케스트라 지휘 체험 — 유일한 지휘 콘셉트",
    },
    {
      competitor: "야마하",
      gap: "자사 악기 중심, 소프트웨어 단독 사용 불가",
      ourAdvantage: "별도 기기 불필요, 태블릿/스마트폰만으로 즉시 체험",
    },
    {
      competitor: "뮤직몬스터",
      gap: "게이미피케이션 과다, 교육 심도 부족",
      ourAdvantage: "실제 클래식 곡 + 교육부 인증으로 교육적 신뢰도 확보",
    },
    {
      competitor: "리틀뮤지션",
      gap: "유아 전용, 초등 고학년 커버리지 없음",
      ourAdvantage: "5-12세 전 연령 커버 + 난이도 AI 자동 조절",
    },
  ],
  confidence: "high",
};

const STRATEGY_OUTPUT = {
  messageStrategy: {
    primaryMessage: "손끝으로 오케스트라를 지휘하는 아이, AI가 여는 음악의 세계",
    supportingMessages: [
      "교육부가 선택한 AI 음악 교육 — 전국 120개교 시범 운영",
      "서울시향 2,000석을 10분 만에 매진시킨 아이들의 지휘",
      "클래식이 어려운 게 아니라 재미있다는 걸 알려주는 앱",
      "5만 가정이 선택한 우리 아이 첫 클래식 경험",
    ],
    tone: "신뢰감 있으면서 따뜻한 — 기술 혁신보다 아이의 성장과 즐거움을 앞세움",
    avoidTopics: ["실제 악기 대체 주장", "경쟁 앱 직접 비교", "과도한 기술 용어", "학습 성과 과장"],
  },
  contentStrategy: {
    weeklyTopics: [
      {
        topic: "이번 주 지휘곡 해설 — 비발디 '사계' 중 봄",
        channel: "naver_blog",
        format: "장문 해설 + 앱 연동 가이드",
        timing: "월요일 오전 10시",
      },
      {
        topic: "우리 아이 지휘 챌린지 하이라이트",
        channel: "instagram",
        format: "릴스 30초 (아이 지휘 장면 모음)",
        timing: "화요일 오후 2시",
      },
      {
        topic: "음악 교사가 말하는 AI 지휘 수업 효과",
        channel: "youtube",
        format: "교사 인터뷰 숏폼 3분",
        timing: "수요일 오후 6시",
      },
      {
        topic: "이 주의 음악 교육 인사이트 뉴스레터",
        channel: "email",
        format: "뉴스레터",
        timing: "목요일 오전 9시",
      },
      {
        topic: "클래식 작곡가 비하인드 — 베토벤의 하루",
        channel: "instagram",
        format: "캐러셀 카드 5장",
        timing: "금요일 오후 1시",
      },
    ],
  },
  channelPriority: [
    {
      channel: "네이버 블로그",
      priority: 9,
      reason: "학부모 핵심 검색 채널 — '어린이 음악 교육' SEO 선점 필수",
    },
    {
      channel: "인스타그램",
      priority: 9,
      reason: "아이 지휘 영상의 바이럴 잠재력 극대, 육아맘 핵심 채널",
    },
    {
      channel: "유튜브",
      priority: 7,
      reason: "교사·학부모 대상 교육 효과 콘텐츠 + 글로벌 진출 시 영문 자막 활용",
    },
    {
      channel: "이메일 뉴스레터",
      priority: 7,
      reason: "B2B (학교·유치원) + 기존 구독자 리텐션, 전환율 높음",
    },
    { channel: "틱톡", priority: 6, reason: "아이 지휘 챌린지 바이럴 가능성, Z세대 부모 접근" },
  ],
  riskMitigation: [
    {
      risk: "구독료 저항으로 이탈률 증가",
      action: "연간 결제 30% 할인 + 14일 무료 체험 + 형제 추가 50% 할인 도입",
    },
    {
      risk: "'흥미 위주' 비판으로 교육적 신뢰 저하",
      action: "음대 교수진 자문단 구성 + 교육 효과 연구 논문 후원 및 결과 공유",
    },
    {
      risk: "JoyTunes 한국어 버전 강화로 경쟁 심화",
      action: "지휘 체험 독점성 + 교육부 레퍼런스 강조 차별화 캠페인 선제 집행",
    },
  ],
  confidence: "high",
};

const SUMMARY_OUTPUT = {
  oneLiner: "어린이AI 지휘자, AI 동작인식으로 클래식 교육의 문턱을 낮추다",
  keyTakeaways: [
    "출시 3개월 만에 5만 다운로드 — 에듀테크 앱 중 가장 빠른 성장세",
    "교육부 디지털 교과서 시범 선정 (전국 120개교) — B2B 확장 신호",
    "서울시향 콜라보 공연 2,000석 10분 매진 — 오프라인 연계 성공",
    "구독료 9,900원/월에 대한 가격 저항 존재 — 요금 체계 개선 필요",
    "경쟁사 JoyTunes 한국어 강화 움직임 — 차별화 포지셔닝 시급",
  ],
  criticalActions: [
    { action: "연간 결제 할인 + 형제 할인 + 14일 무료 체험 요금 체계 개편", priority: "high" },
    { action: "학부모 체험 후기 숏폼 영상 시리즈 런칭 (월 8회)", priority: "high" },
    { action: "교사용 수업 지도안 배포 + 교사 워크숍 프로그램 개시", priority: "high" },
    { action: "음악 교육 효과 연구 논문 후원 착수 (음대 자문단 구성)", priority: "medium" },
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
        "샘플 분석결과",
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
      `INSERT INTO signalcraft_actions (tenant_id, job_id, action_type, input, output, status, model_name, duration_ms) VALUES ($1, $2, 'campaign_draft', $3, $4, 'done', 'claude-sonnet-4-6', 7200)`,
      [
        TENANT,
        JOB_ID,
        JSON.stringify({ keyword: KEYWORD, modules: ["#03", "#07", "#08"] }),
        JSON.stringify({
          subject: "AI가 여는 음악의 세계 — 어린이AI 지휘자 교육 효과 리포트",
          body: "안녕하세요, GoldenCheck입니다.\n\n어린이AI 지휘자가 교육부 디지털 교과서 시범 사업에 선정되며 전국 120개 초등학교에서 운영을 시작했습니다.\n\n출시 3개월 만에 5만 다운로드를 돌파하고, 서울시향 콜라보 공연이 10분 만에 매진되는 등 시장의 뜨거운 반응이 이어지고 있습니다.\n\n본 리포트에서 확인하실 수 있는 내용:\n• 경쟁사 대비 SOV 점유율 분석 (38건, 1위)\n• 콘텐츠 갭 4건 — 즉시 실행 가능한 마케팅 기회\n• 가격 저항 리스크와 대응 전략\n\n자세한 분석은 첨부 리포트를 참조하세요.",
          cta: "분석 리포트 전문 확인하기",
          targetSegment: "에듀테크 마케팅 담당자",
        }),
      ],
    );
    await client.query(
      `INSERT INTO signalcraft_actions (tenant_id, job_id, action_type, input, output, status, model_name, duration_ms) VALUES ($1, $2, 'content_calendar', $3, $4, 'done', 'claude-sonnet-4-6', 5800)`,
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
              topic: "비발디 '사계' 중 봄 — 어린이AI 지휘자로 배우는 클래식",
              format: "장문 해설 + 앱 연동 가이드 (2000자)",
            },
            {
              day: "화",
              channel: "인스타그램",
              topic: "우리 아이 지휘 챌린지 하이라이트 모음",
              format: "릴스 30초",
            },
            {
              day: "수",
              channel: "유튜브",
              topic: "초등 음악 교사가 말하는 AI 지휘 수업 효과",
              format: "교사 인터뷰 숏폼 3분",
            },
            {
              day: "목",
              channel: "이메일",
              topic: "이 주의 음악 교육 인사이트 뉴스레터",
              format: "뉴스레터 (HTML)",
            },
            {
              day: "금",
              channel: "인스타그램",
              topic: "베토벤의 하루 — 클래식 작곡가 비하인드",
              format: "캐러셀 카드 5장",
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
