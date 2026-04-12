GoldenCheck · Technical Specification · v2.0
=============================================

데이터 수집 · KPI 계산 · 대시보드 · 액션 자동화 기술 명세서

문서 버전: v2.0 — PRD v2.0 기반 전면 재설계
작성일: 2026-04-13
분류: 내부용 (INTERNAL)
연관 문서: GoldenCheck PRD v2.0 · Implementation Plan v1.0 · Launch Log 2026-04-12
독자: 개발팀 (풀스택 리드 · 프론트엔드 · AI 엔지니어 · PM)

v1.1 → v2.0 주요 변경
	① 데이터 수집: 영어 위주 → 한국 시장 우선 5개 채널
② KPI 공식: 운영자 메트릭 → 사업자 비즈니스 KPI 6종
③ 대시보드 API: 사업자 뷰 + 운영자 뷰 분리
④ 모듈 우선순위: #06 Opportunity + #07 Strategy 최우선
⑤ 액션 자동화: 리포트 → 캠페인 초안/콘텐츠 캘린더/피칭 덱 연결
⑥ 프론트엔드: 모바일 대응, 3초 인사이트 원칙
	________________


1. 데이터 수집 아키텍처 (v2.0)


1.1 수집 모델 — v1.1 원칙 유지 + 소스 교체

카테고리 A(상시) / 카테고리 B(온디맨드) 분리, BullMQ 큐 분리, DB 롤 격리는 v1.1 그대로 유지.
변경점은 **소스 자체**와 **수집 우선순위**.


1.2 카테고리 A — 상시 적재 (한국 시장 우선)


1.2.1 마스터 데이터셋 목록 (v2.0)

#
	데이터셋
	소스
	수집 방법
	저장 테이블
	cron (KST)
	우선순위
	v1.1 대비
	1
	국내 베스트셀러
	교보문고 + YES24 랭킹 페이지
	Playwright 크롤링
	bestsellers
	0 6 * * *
	P0
	Open Library → 교보/YES24 교체
	2
	네이버 쇼핑 카테고리 트렌드
	네이버 데이터랩 API + 쇼핑 카테고리
	REST API + Playwright
	shopping_trends (신규 테이블)
	0 7 * * *
	P0
	신규
	3
	경쟁사 프로파일 (국내)
	네이버 스토어 + 공식 SNS + 교보 작가 페이지
	Playwright 크롤링
	competitors
	0 4 * * 1
	P0
	Open Library → 국내 소스 교체
	4
	환율 (FX)
	frankfurter.app
	REST API
	fx_rates
	0 * * * *
	P2
	v1.1 유지
	5
	교육시장 통계
	교육부 KESS 공공데이터 + 통계청
	공공 API / 수동 보완
	market_stats (신규 테이블)
	0 0 1 * *
	P1
	신규
	6
	글로벌 바이어 (볼로냐)
	Exhibitor Directory
	Playwright / API
	buyers
	0 3 * * *
	P2
	v1.1 유지 (해외 사업 기능)
	7
	글로벌 저작권 거래
	Open Library / Nielsen
	REST API
	rights_deals
	30 3 * * *
	P2
	v1.1 유지
	

신규 테이블 스키마

shopping_trends
	CREATE TABLE shopping_trends (
	  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	  source_uid   TEXT NOT NULL,
	  category     VARCHAR(200) NOT NULL,
	  keyword      VARCHAR(200) NOT NULL,
	  search_volume INTEGER,
	  trend_direction VARCHAR(10),  -- 'up' | 'down' | 'stable'
	  click_rate   NUMERIC(5,4),
	  observed_at  DATE NOT NULL,
	  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
	  fingerprint  TEXT NOT NULL,
	  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	  is_stale     BOOLEAN NOT NULL DEFAULT false
	);
	CREATE UNIQUE INDEX shopping_trends_source_uid_idx ON shopping_trends (source_uid);
	

market_stats
	CREATE TABLE market_stats (
	  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	  source_uid   TEXT NOT NULL,
	  indicator    VARCHAR(200) NOT NULL,
	  value        NUMERIC(18,4),
	  unit         VARCHAR(30),
	  period       VARCHAR(20) NOT NULL,  -- '2026-Q1', '2026-03' 등
	  source       VARCHAR(60) NOT NULL,
	  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
	  fingerprint  TEXT NOT NULL,
	  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	  is_stale     BOOLEAN NOT NULL DEFAULT false
	);
	CREATE UNIQUE INDEX market_stats_source_uid_idx ON market_stats (source_uid);
	


1.3 카테고리 B — 키워드 온디맨드 (한국 채널 우선)


1.3.1 수집 소스 및 우선순위 (v2.0)

소스
	기술
	Rate Limit 대응
	우선순위
	v1.1 대비
	네이버 뉴스
	Playwright headless, 검색 결과 페이지 파싱
	요청 간 1~3초 랜덤 딜레이
	P0
	v1.1 정의됨, 미구현 → 구현
	네이버 블로그
	네이버 검색 API (blog 타입) + 본문 Playwright
	일 25,000건 쿼터, 초과 시 Playwright fallback
	P0
	신규 (핵심)
	네이버 카페
	네이버 검색 API (cafe 타입) + Playwright
	검색 API 동일 쿼터 공유
	P0
	신규 (핵심, 맘카페 포함)
	인스타그램
	Instagram Graph API (해시태그 검색) 또는 Playwright
	Graph API: 시간당 200건 / Playwright: 2초 딜레이
	P0
	신규 (핵심)
	유튜브
	YouTube Data API v3
	일 10,000 units
	P1
	v1.1 정의됨 → 구현
	맘카페 (주요 3개)
	Playwright 크롤링
	페이지당 3초 딜레이
	P1
	신규
	Hacker News
	Algolia API (영어 보조)
	관대
	P2
	v1.1 유지
	

raw_posts 스키마는 v1.1과 동일. source 컬럼 값 확장:
	'naver_news' | 'naver_blog' | 'naver_cafe' | 'instagram' | 'youtube' | 'momcafe' | 'hackernews'
	

1.3.2 수집 → 분석 흐름 (v2.0 개선)

v1.1 흐름
	POST /api/v1/signalcraft/run { keyword }
	→ 전체 소스 병렬 수집 → 분석

v2.0 개선 흐름
	POST /api/v1/signalcraft/run { keyword, channels[], urgency }
	→ channels: 사용자가 선택한 채널만 수집 (기본: 전체)
	→ urgency: "draft" (15분, 상위 3 소스만) | "full" (30분, 전체)
	→ Stage 1 완료 즉시 #03 Sentiment 선실행 → 대시보드에 부분 결과 표시
	→ 나머지 모듈 병렬 완주 후 전체 리포트 갱신


1.4 카테고리 간 데이터 흐름도 (v2.0)

┌───────────────────────────────────────────────────┐
│                  외부 데이터 소스                    │
│ 교보·YES24 · 네이버 쇼핑 · 네이버 뉴스/블로그/카페  │
│ 인스타그램 · 유튜브 · 맘카페 · 교육부/통계청 · ...  │
└───────────────┬───────────────────────────────────┘
                │ (cron: queue:batch)
                ▼
┌───────────────────────────────────────────────────┐
│       카테고리 A — Persistent Master Tables         │
│ bestsellers · shopping_trends · competitors ·      │
│ market_stats · fx_rates · buyers · rights_deals    │
└───────────────┬───────────────────────────────────┘
                │ (read-only, Redis 캐시)
                ▼
┌───────────────────────────────────────────────────┐
│  카테고리 B — SignalCraft On-Demand Pipeline       │
│  키워드+채널 → 한국 소스 수집 → raw_posts →        │
│  #03→#06→#07→#08→#01→#13 분석 → 통합 리포트        │
│                    ↓                               │
│  액션 자동화: 캠페인 초안 / 콘텐츠 캘린더 / 피칭 덱  │
└───────────────────────────────────────────────────┘
                │
                ▼
          reports + actions (사업자 대시보드)
________________


2. KPI 계산 공식 (v2.0 — 사업자 KPI)


v1.1의 리드 스코어·예상 매출·이메일 캠페인·채택률·WAU·LLM 비용 공식은 유지하되,
v2.0은 사업자 관점 KPI 4종을 추가 정의한다.


2.1 캠페인 효과 스코어 (Campaign Effectiveness Score, 0~100)

5개 채널의 최근 30일 활동을 가중 집계한 종합 마케팅 효과 점수.

변수
	설명
	최대 점수
	가중치
	naver_reach
	네이버 뉴스/블로그/카페에서 키워드 언급 횟수 (정규화 0~1)
	25점
	25%
	instagram_engagement
	인스타그램 해시태그 게시물 수 × 평균 좋아요 (정규화 0~1)
	25점
	25%
	sentiment_score
	SignalCraft #03 긍정 비율 (0~1)
	20점
	20%
	conversion_proxy
	이메일 클릭률 × 바이어 파이프라인 전진 수 (정규화 0~1)
	20점
	20%
	trend_alignment
	내 키워드가 shopping_trends의 상승 트렌드와 겹치는 비율 (0~1)
	10점
	10%
	

// 캠페인 효과 스코어 계산
function calcCampaignEffectiveness(input: CESInput): number {
  return Math.round(
    input.naverReach * 25 +
    input.instagramEngagement * 25 +
    input.sentimentScore * 20 +
    input.conversionProxy * 20 +
    input.trendAlignment * 10
  );
}


2.2 예상 매출 (v2.0 간소화)

v1.1의 Expected Revenue 공식 유지하되, 교육상품 사업자에게는
**간소화 버전**을 메인 대시보드에 표시:

예상 매출 (이번 달)
= 활성 리드 수 × 평균 계약 단가 × 캠페인 효과 스코어 / 100

활성 리드 = buyers WHERE is_stale = false AND lead_score >= 40
평균 계약 단가 = 테넌트 설정값 (기본 500만원)


2.3 채널별 ROI (신규)

각 마케팅 채널(네이버, 인스타, 이메일)별로 투입 대비 성과를 비교.

채널 ROI = (채널에서 유입된 리드의 예상 매출) / (채널 투입 비용)

투입 비용은 사용자가 수동 입력 (또는 광고 API 연동 시 자동).
리드 유입 경로는 events.payload.source 또는 email_events.campaign_id로 추적.


2.4 경쟁사 대비 포지셔닝 스코어 (신규)

competitors 테이블 + bestsellers 테이블에서 산출:

포지셔닝 점수 = (내 상품 랭킹 ÷ 경쟁사 평균 랭킹) × sentiment_gap

sentiment_gap = 내 브랜드 긍정률 - 경쟁사 평균 긍정률

0 이하 = "열세", 0~0.3 = "경합", 0.3 이상 = "우위"
________________


3. 대시보드 API 재설계 (v2.0)


3.1 사업자 대시보드 API (메인 뷰)

엔드포인트
	메서드
	설명
	v1.1 대비
	GET /api/v2/dashboard/overview
	GET
	사업자 메인 뷰: 예상매출, CES, 반응요약, 트렌드TOP5, 액션3개
	신규 (v1 kpis 대체)
	GET /api/v2/dashboard/competitors
	GET
	경쟁사 vs 나 비교 카드 (최대 5사)
	신규
	GET /api/v2/dashboard/channels
	GET
	채널별 ROI + 도달·참여·전환 퍼널
	신규
	GET /api/v2/dashboard/trends
	GET
	트렌드 키워드 TOP 20 + shopping_trends 연동
	신규
	GET /api/v1/dashboard/kpis
	GET
	v1.1 KPI (하위 호환, 운영자 상세 모드)
	유지
	

GET /api/v2/dashboard/overview 응답 구조

{
  tenantId: string,
  period: "2026-04",
  estimatedRevenue: { amount: number, currency: "KRW", changeVsPrev: number },
  campaignEffectivenessScore: number,  // 0~100
  brandSentiment: {
    positive: number, negative: number, neutral: number,
    oneLiner: string,  // #08.oneLiner
    confidence: "high" | "medium" | "low"
  },
  trendKeywords: Array<{ term: string, volume: number, direction: "up"|"down"|"stable" }>,
  weeklyActions: Array<{ action: string, priority: "high"|"medium"|"low", source: string }>,
  competitorGap: { score: number, label: "열세"|"경합"|"우위" },
  lastAnalyzedAt: string | null,  // 최근 SignalCraft 완료 시각
}


3.2 액션 API (v2.0 신규)

엔드포인트
	메서드
	설명
	POST /api/v2/actions/campaign-draft
	POST
	#07 Strategy 기반 이메일/SNS 캠페인 초안 생성
	POST /api/v2/actions/content-calendar
	POST
	#07 contentStrategy 기반 주간 콘텐츠 캘린더 생성
	POST /api/v2/actions/pitch-deck
	POST
	#06 Opportunity 기반 피칭 덱 개요 생성
	GET /api/v2/actions/:id
	GET
	생성된 액션 결과 조회
	

액션은 signalcraft_actions (신규 테이블)에 저장:

CREATE TABLE signalcraft_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  job_id       UUID REFERENCES signalcraft_jobs(id) ON DELETE SET NULL,
  action_type  VARCHAR(30) NOT NULL,  -- 'campaign_draft' | 'content_calendar' | 'pitch_deck'
  input        JSONB NOT NULL,
  output       JSONB,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  model_name   VARCHAR(60),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


3.3 운영자 API

v1.1의 /admin/* 엔드포인트는 그대로 유지. v2.0에서 추가:

엔드포인트
	메서드
	설명
	GET /admin/crawlers/health
	GET
	한국 소스별 최근 수집 성공/실패 + 차단 감지
	GET /admin/cost/forecast
	GET
	이번 달 API 비용 예측 (Anthropic + 네이버 API)
	
________________


4. AI 분석 모듈 (v2.0 — 우선순위 재배치)


4.1 모듈 실행 순서 (v2.0)

v1.1에서는 #01→#03→#08→#13 순서.
v2.0에서는 사업자 3대 질문 기반 재배치:

단계
	모듈
	목적
	PRD 질문 매핑
	구현 상태
	1
	#03 Sentiment
	"지금 반응이 어떤가"
	잘 되고 있나?
	✅ 구현
	2
	#06 Opportunity
	"놓치고 있는 기회는"
	뭘 수정해야 하나?
	🔴 미구현 → 즉시
	3
	#07 Strategy
	"구체적으로 뭘 해야 하나"
	더 좋은 방법은?
	🔴 미구현 → 즉시
	4
	#08 Summary
	"한 줄 요약 + 액션 3개"
	경영진 보고
	✅ 구현
	5
	#05 Risk Map
	"주의할 리스크"
	리스크 관리
	❌ 미구현 → P1
	6
	#01 Macro View
	"여론 흐름 서사"
	맥락 이해
	✅ 구현
	7
	#02 Segmentation
	"어떤 소비자 집단이 반응하는가"
	타겟 정밀화
	❌ 미구현 → P1
	8
	#09 Preference
	"브랜드 선호도 추정"
	경쟁 분석
	❌ 미구현 → P2
	9
	#11 Crisis
	"위기 시나리오"
	위기 대응
	❌ 미구현 → P2
	10
	#12 Success Sim
	"전략 성공 확률"
	의사결정
	❌ 미구현 → P2
	11
	#13 Integrated
	"통합 리포트 조합"
	최종 산출물
	✅ 구현
	


4.2 신규 모듈 #06 Opportunity — Zod 스키마

const OpportunitySchema = z.object({
  untappedAreas: z.array(z.object({
    area: z.string().min(5).max(200),
    evidence: z.string().min(10).max(500),
    estimatedImpact: z.enum(["high", "medium", "low"]),
    suggestedAction: z.string().min(10).max(300),
  })).min(1).max(5),
  swotSummary: z.object({
    strengths: z.array(z.string()).max(5),
    weaknesses: z.array(z.string()).max(5),
    opportunities: z.array(z.string()).max(5),
    threats: z.array(z.string()).max(5),
  }),
  competitorGaps: z.array(z.object({
    competitor: z.string(),
    gap: z.string(),
    ourAdvantage: z.string(),
  })).max(5),
  confidence: z.enum(["high", "medium", "low"]),
});


4.3 신규 모듈 #07 Strategy — Zod 스키마

const StrategySchema = z.object({
  messageStrategy: z.object({
    primaryMessage: z.string().min(10).max(100),
    supportingMessages: z.array(z.string().max(200)).max(5),
    tone: z.string().max(50),
    avoidTopics: z.array(z.string()).max(5),
  }),
  contentStrategy: z.object({
    weeklyTopics: z.array(z.object({
      topic: z.string().max(200),
      channel: z.enum(["naver_blog", "instagram", "youtube", "email", "other"]),
      format: z.string().max(50),
      timing: z.string().max(50),
    })).max(7),
  }),
  channelPriority: z.array(z.object({
    channel: z.string(),
    priority: z.number().int().min(1).max(10),
    reason: z.string().max(200),
  })).max(5),
  riskMitigation: z.array(z.object({
    risk: z.string().max(200),
    action: z.string().max(200),
  })).max(3),
  confidence: z.enum(["high", "medium", "low"]),
});
________________


5. 프론트엔드 재설계 (v2.0)


5.1 화면 구조 (모바일 우선)

/ (메인 대시보드)
├── 히어로 카드: 예상 매출 + 전월 대비 변화
├── 액션 체크리스트 (3개): #08.criticalActions
├── 브랜드 반응 카드: #03 도넛 + #08.oneLiner
├── 트렌드 키워드 TOP 5: shopping_trends + #03.topKeywords
├── 경쟁사 비교 카드: competitors + #06.competitorGaps
├── [접기] 상세
│   ├── 채널별 ROI 차트
│   ├── 이메일 캠페인 테이블
│   └── 바이어 파이프라인
│
├── SignalCraft 실행 패널
│   ├── 키워드 + 채널 선택 + urgency 토글
│   ├── 진행률 + 부분 결과 (Sentiment 선노출)
│   ├── 통합 리포트 인라인 iframe
│   └── 액션 버튼 3개 (캠페인/캘린더/피칭)
│
└── [운영자 모드 토글]
    ├── 시스템 헬스
    ├── 큐 상태
    ├── 크롤러 상태
    ├── LLM 비용
    └── DLQ 현황


5.2 3초 인사이트 원칙

사용자가 대시보드 접속 후 3초 안에 읽을 수 있는 정보:
1. 큰 숫자 1개 = 이번 달 예상 매출 (₩)
2. 화살표 1개 = 전월 대비 ▲/▼
3. 한 줄 1개 = AI 브랜드 반응 요약 (#08.oneLiner)

나머지는 스크롤 또는 탭으로 분리.


5.3 모바일 대응 (v2.0 신규)

* 핵심 3 KPI(매출/CES/액션)는 모바일 320px에서 가독
* 차트·테이블은 가로 스크롤 또는 카드 스택
* SignalCraft 실행은 모바일에서도 키워드 입력 → 실행 → 결과 확인 가능
* CSS: min-width 제거, flex/grid auto-fit, font-size clamp()
________________


6. 구현 우선순위 로드맵 (v2.0)


Phase
	기간
	핵심 산출물
	A. 한국 데이터 수집기
	W01-W03
	네이버 뉴스 + 네이버 블로그/카페 + 인스타그램 collector 3개
	B. 모듈 #06 + #07
	W02-W04
	Opportunity + Strategy 모듈 구현 + 파이프라인 통합
	C. 대시보드 v2
	W03-W05
	메인 화면 재설계 (예상 매출 + CES + 반응 카드 + 트렌드 + 액션)
	D. 액션 자동화
	W05-W07
	캠페인 초안 + 콘텐츠 캘린더 자동 생성 API
	E. 모바일 대응
	W06-W08
	반응형 CSS + 모바일 KPI 뷰
	F. 경쟁사 비교
	W07-W08
	경쟁사 vs 나 대시보드 카드 + #06 연동
	G. 채널별 ROI
	W08-W10
	채널 투입/성과 추적 + ROI 차트
	

크리티컬 패스: A → B → C → D
병렬 가능: E(C 이후) · F(B 이후) · G(C 이후)
________________


7. 오픈 이슈 (v2.0)


#
	이슈
	선택지
	결정 기한
	OI-07
	인스타그램 수집 방식
	Graph API (정식, 사업자 계정 필요) vs Playwright (비공식)
	Phase A 시작 전
	OI-08
	네이버 검색 API 쿼터
	일 25,000건 무료 (블로그+카페+뉴스 공유). 초과 시 Playwright fallback
	Phase A 시작 전
	OI-09
	맘카페 크롤링 법적
	개인정보 포함 가능 → 게시물 본문만 수집, 작성자 정보 마스킹 필수
	Phase A 시작 전
	OI-10
	캠페인 초안 면책
	AI 생성 콘텐츠 면책 문구 필수 ("AI가 생성한 초안이며 최종 검토는 사용자 책임")
	Phase D 시작 전
	OI-11
	모바일 앱 vs 반응형 웹
	반응형 웹 우선 (PWA 고려), 네이티브 앱은 MAU 10,000+ 이후
	Phase E 시작 전
	
________________


8. 변경 이력


버전
	날짜
	변경 내용
	v1.0
	2026-04
	초안 (EduRights AI, 글로벌 위주)
	v1.1
	2026-04-11
	데이터 수집 보완, 카테고리 A/B 분리 명확화
	v2.0
	2026-04-13
	GoldenCheck 리브랜딩, 한국 시장 우선, 사업자 KPI 재설계, 대시보드 재구조, 모듈 우선순위 재배치, 액션 자동화 신규, 모바일 대응, 신규 테이블 2개
	________________

— END OF DOCUMENT —
GoldenCheck Technical Specification v2.0  ·  INTERNAL
