GoldenCheck  ·  Technical Specification  |  v1.1 → v2.0

> **v2.0 업데이트 (2026-04-14)**: 실제 구현 상태를 반영하여 아키텍처 변경사항을 기록합니다.

## v2.0 아키텍처 변경 사항

### 인프라 변경
| 설계 (v1.1) | 현재 구현 (v2.0) |
|------------|-----------------|
| AWS ECS + RDS + ElastiCache | **Railway** (Postgres 15 + Redis 7) |
| S3 (PDF/아카이브) | **Cloudflare R2** (예정, 미연동) |
| Terraform IaC | **railway.json** + Railway CLI |
| GitHub Actions CI/CD | GitHub push → **Railway 자동 빌드** (buildCommand: web build 포함) |
| AWS Secrets Manager | **Railway Variables** |

### DB 스키마 추가 (설계 외)
| 테이블 | 용도 | 마이그레이션 |
|--------|------|-------------|
| `users` | JWT 인증, 회원가입/로그인, role 관리 | 0011 |
| `products` | 제품 CRUD (테넌트별) | 0012 |
| `product_keywords` | 키워드 등록/관리 (제품별) | 0012 |
| `campaigns` | 이메일 캠페인 (email_events FK) | 0010 |

### DB Role 강제 구현
- `getPoolForRole("batch_worker")` — Category A 핸들러 5개에 적용
- `getPoolForRole("signalcraft_worker")` — SignalCraft pipeline에 적용
- Pool `connect` 이벤트에서 자동 `SET ROLE`

### #06 모듈 프레임워크 변경
- **설계**: SWOT (Strengths/Weaknesses/Opportunities/Threats)
- **현재**: **Market Intelligence** (SOV 점유율, 포지셔닝 맵, 콘텐츠 갭 분석, 리스크 시그널)
- **변경 사유**: SWOT의 S/W는 내부 요인으로 키워드 검색 데이터에서 도출 불가. Brandwatch/Meltwater급 분석 프레임워크로 교체

### 인증 아키텍처 (신규)
- JWT (jsonwebtoken) + bcryptjs, 7일 만료
- `authMiddleware` 전역 적용 (backward compatible)
- Role: admin/owner/member
- Admin API: 회원 관리, 시스템 통계

### 프론트엔드 아키텍처 (신규)
- React SPA (단일 App.tsx ~2,500줄, state 기반 네비게이션, React Router 미사용)
- View: landing → products → product-detail → keyword-report / sample / admin
- 21개 컴포넌트: App, LandingPage, Breadcrumb, ProductsGrid, ProductDetail, RealProductDetail, KeywordReportView, SampleReportView, BusinessOverview, ChannelCard, CompetitorCard, SignalcraftPanel, ActionButtons, BuyersPanel, OperatorPanel, Panels, AdminPanel + 유틸리티
- 글로벌 네비게이션 바 (sticky): 대시보드/분석 샘플/설정/관리자
- 리포트 HTML: 서버 렌더링 (render-html.ts), CSS-only 시각화 (SVG 도넛, CSS 바, gradient 포지셔닝맵)
- 디자인: FlareLane 스타일 (--accent: #4F46E5, Inter 폰트, 16px radius, 이모지 없음)

---

GoldenCheck (구 EduRights AI)
Technical Specification


데이터 수집 · KPI 계산 · 보고서 생성 기술 명세서


문서 버전
	v1.1 — 데이터 수집 파이프라인 전면 보완 (아래 원본은 이력 보존용)
작성일
	2026년 4월
분류
	내부용 (INTERNAL)
연관 문서
	GoldenCheck PRD v1.0
독자
	개발팀
목적
	PRD에서 명세되지 않은 수집·계산·보고서 생성 로직을 개발 가능한 수준으로 정의
v1.1 변경
	① 데이터 수집을 두 카테고리(상시 적재 / 온디맨드)로 재구성
② 모든 마스터 데이터셋의 소스·cron·재시도 정책 명시
③ 환율·시장 트렌드·경쟁사·저작권 거래·베스트셀러 데이터셋 신규 정의
④ 카테고리 간 데이터 흐름·격리 원칙 명시
	

이 문서의 범위
	A. 데이터 수집 아키텍처 — 두 수집 모델(상시/온디맨드), 모든 수치의 원천 데이터·스케줄·재시도·격리 정책
B. KPI 계산 공식 — 리드 스코어, 예상 매출, 채택률 등 모든 수치의 정확한 산출 로직
C. 보고서 생성 파이프라인 — SignalCraft 통합 리포트, 시장 트렌드 리포트, PDF 생성 방법
D. 프롬프트 설계 원칙 — 14개 AI 모듈 프롬프트 구조 가이드라인
E. 대시보드 API 엔드포인트 명세
F. 오픈 이슈 및 결정 필요 항목
	________________


목  차


1. 데이터 수집 아키텍처
   1.1 수집 모델 개요 — 두 카테고리 원칙
   1.2 카테고리 A — 상시 적재 마스터 데이터셋
   1.3 카테고리 B — 키워드 온디맨드 수집 (SignalCraft)
   1.4 사용자 행동 이벤트 수집
   1.5 운영자 대시보드 메트릭 수집
   1.6 카테고리 간 데이터 흐름도
   1.7 모니터링 및 관측성
2. KPI 계산 공식
3. 보고서 생성 파이프라인
4. LLM 프롬프트 설계 원칙
5. 대시보드 API 엔드포인트 명세
6. 오픈 이슈


________________


1. 데이터 수집 아키텍처


1.1 수집 모델 개요 — 두 카테고리 원칙


EduRights AI가 다루는 모든 데이터는 수집 트리거 기준으로 두 카테고리로 분리된다. 이 경계는 큐·스키마·권한 수준에서 엄격히 지켜진다.


카테고리
	수집 트리거
	저장 방식
	주요 소비자
	BullMQ 큐
	A. Persistent Dataset (상시 적재)
	스케줄러(cron) 기반 정기 배치
	마스터 테이블에 upsert (증분 누적)
	Research Agent, CRM Agent, SignalCraft 참조 데이터
	queue:batch
	B. On-Demand Keyword Dataset
	고객 키워드 입력 시 1회성 실행
	job 단위 append (tenantId·jobId 바인딩)
	SignalCraft 14모듈 파이프라인
	queue:signalcraft
	


데이터 격리 원칙
	① 카테고리 A는 테넌트 비종속(global shared) 또는 테넌트별 마스터로, 키워드와 무관하게 시스템이 소유한다.
② 카테고리 B는 반드시 `jobId` + `tenantId`에 바인딩되며, job 종료 후 raw_posts는 90일 보존 후 S3 콜드 스토리지로 이관.
③ 카테고리 B → 카테고리 A 쓰기 금지 (읽기만 허용). SignalCraft 분석 결과가 마스터 테이블을 오염시키는 것을 방지.
④ 두 큐는 별도 Redis 네임스페이스를 사용하여 상호 간섭·스로틀링 차단.
	

1.1.1 전체 데이터 흐름 요약
레이어
	수집 주체
	저장소
	수집 모드
	외부 마스터 데이터 (바이어·경쟁사·트렌드·환율·ISBN·베스트셀러)
	카테고리 A 배치 크롤러 + API 클라이언트
	PostgreSQL 마스터 테이블
	정기 배치 (cron)
	외부 온라인 매체 (5개 매체)
	SignalCraft 크롤러 (Playwright + Cheerio)
	PostgreSQL raw_posts (job 파티션)
	온디맨드 (키워드 입력)
	내부 사용자 행동
	React 이벤트 + Express 미들웨어
	PostgreSQL events 테이블
	실시간
	이메일 성과 이벤트
	Resend/SendGrid Webhook 수신
	PostgreSQL email_events 테이블
	실시간 (push)
	LLM·인프라 메트릭
	BullMQ 이벤트 + Prometheus exporter
	Prometheus + PostgreSQL
	실시간
	________________


1.2 카테고리 A — 상시 적재 마스터 데이터셋


1.2.1 마스터 데이터셋 목록


시스템이 배경에서 정기적으로 수집·갱신하는 7개 마스터 데이터셋이다.


#
	데이터셋
	소스 (primary / fallback)
	수집 방법
	저장 테이블
	소유자
	1
	글로벌 바이어 디렉토리
	볼로냐 북페어 Exhibitor Directory (웹) / Exhibitor API (유료)
	Playwright 크롤링 / REST API
	buyers
	Research Agent
	2
	경쟁사 출판사 프로파일
	Publishers Weekly, The Bookseller, 도서관 CIP 데이터
	Playwright 크롤링 + RSS 폴링
	competitors
	Research Agent
	3
	시장 트렌드 시그널
	Google Trends (pytrends) / Statista RSS / IBISWorld 요약
	pytrends + RSS + 스크레이퍼
	market_trends
	Analytics Agent
	4
	환율 데이터
	exchangerate.host (무료) / ECB XML 피드 (fallback)
	공식 REST API (JSON/XML)
	fx_rates
	공통 유틸
	5
	ISBN·저작권 거래 이력
	Nielsen BookData API (유료) / Open Library API (무료)
	REST API 증분 수집
	rights_deals
	Research Agent
	6
	장르별 베스트셀러
	Amazon BSR (US/UK/DE/JP), 교보문고 랭킹
	Playwright 크롤링
	bestsellers
	Analytics Agent
	7
	이메일 캠페인 성과
	Resend / SendGrid webhook
	push (webhook 수신)
	email_events
	CRM Agent
	


1.2.2 배치 스케줄 명세 (cron)


모든 배치 작업은 BullMQ `queue:batch`에 repeat 옵션으로 등록된다. 기준 시간대는 `Asia/Seoul` (KST).


Job ID
	cron (KST)
	빈도
	평균 소요
	동시 실행 한도
	비고
	batch:buyers:bologna
	`0 3 * * *`
	매일 03:00
	45분
	1
	볼로냐 참가사 프로파일 변경 감지
	batch:competitors:weekly
	`0 4 * * 1`
	매주 월 04:00
	90분
	1
	신작·저작권 거래 주 단위 변동
	batch:market-trends:daily
	`0 5 * * *`
	매일 05:00
	20분
	2
	Google Trends 쿼리 쿼터 분산
	batch:fx-rates:hourly
	`0 * * * *`
	매시 정각
	30초
	1
	환율, 경량
	batch:rights-deals:daily
	`30 3 * * *`
	매일 03:30
	60분
	1
	ISBN 피드 증분
	batch:bestsellers:daily
	`0 6 * * *`
	매일 06:00
	30분
	2
	지역별 병렬
	batch:raw-posts:archive
	`0 2 * * *`
	매일 02:00
	15분
	1
	90일 경과 raw_posts를 S3 Parquet로 이관
	batch:email-events
	realtime (webhook)
	즉시
	—
	—
	webhook push 수신
	


구현 예시 (TypeScript / BullMQ)


```ts
// src/queues/batch.ts
import { Queue } from 'bullmq';
import { connection } from '../infra/redis';

export const batchQueue = new Queue('batch', { connection });

await batchQueue.add('buyers:bologna', {}, {
  repeat: { pattern: '0 3 * * *', tz: 'Asia/Seoul' },
  jobId: 'batch:buyers:bologna',     // 중복 등록 방지
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
});
```


1.2.3 재시도 및 장애 복구 정책


모든 카테고리 A job은 아래 기본값을 적용한다.


항목
	값
	attempts
	5
	backoff
	exponential, base delay 60s (1분 → 2분 → 4분 → 8분 → 16분)
	timeout
	기본 10분 / 크롤링 job은 120분
	dead-letter queue
	5회 실패 시 `queue:batch:dlq`로 이동 + Sentry 이슈 + Slack #ops-alerts 알림
	partial success
	크롤링 대상 중 실패율 < 10%면 성공 처리, 실패 레코드는 `crawler_failures`에 기록
	circuit breaker
	동일 소스에서 연속 3회 실패 시 해당 소스 30분 차단
	


장애 기록 스키마


```sql
CREATE TABLE crawler_failures (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,          -- 'bologna' | 'publishers_weekly' | ...
  target_url  TEXT,
  error_code  TEXT,
  error_msg   TEXT,
  attempt     SMALLINT,
  failed_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON crawler_failures (source, failed_at DESC);
```


1.2.4 증분 업데이트 전략


모든 마스터 테이블에 다음 공통 컬럼이 존재한다.


컬럼
	타입
	용도
	source_uid
	TEXT
	소스 측 자연 키 (볼로냐 exhibitor ID 등), UNIQUE INDEX
	fingerprint
	TEXT
	핵심 필드의 MD5 해시, 변경 감지
	last_seen_at
	TIMESTAMPTZ
	마지막으로 소스에서 관측된 시각
	updated_at
	TIMESTAMPTZ
	실제 필드 변경이 발생한 시각
	is_stale
	BOOLEAN
	7일 이상 미관측 레코드 마킹
	


동작 원칙
	① 수집 시 `source_uid`로 조회 → 레코드 존재 시 `fingerprint` 비교.
② fingerprint 동일: `last_seen_at`만 업데이트.
③ fingerprint 변경: 전체 upsert + `change_log` 테이블에 이전/이후 diff 기록 + `updated_at` 갱신.
④ 7일간 `last_seen_at` 갱신되지 않으면 `is_stale=true`로 마킹 (삭제하지 않음, 히스토리 보존).
	

1.2.5 주요 테이블 스키마


buyers 테이블


```sql
CREATE TABLE buyers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_uid      TEXT UNIQUE NOT NULL,
  tenant_id       UUID,                 -- NULL이면 global shared
  company_name    VARCHAR(300) NOT NULL,
  country         VARCHAR(100),
  city            VARCHAR(100),
  contact_name    VARCHAR(200),
  contact_email   VARCHAR(200),
  genres          TEXT[],               -- ['children','education','sci-fi']
  languages       TEXT[],               -- 선호 언어
  deal_history    JSONB,                -- 과거 거래 이력 (공개 정보)
  booth_number    VARCHAR(50),
  lead_score      NUMERIC(5,2),         -- 섹션 2.1 공식
  last_contacted  DATE,
  source_url      TEXT,
  fingerprint     TEXT NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_stale        BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX ON buyers (country, lead_score DESC);
CREATE INDEX ON buyers (tenant_id) WHERE tenant_id IS NOT NULL;
```


fx_rates 테이블


```sql
CREATE TABLE fx_rates (
  base         CHAR(3) NOT NULL,   -- 'USD'
  quote        CHAR(3) NOT NULL,   -- 'KRW', 'EUR', ...
  rate         NUMERIC(18,8) NOT NULL,
  observed_at  TIMESTAMPTZ NOT NULL,
  source       TEXT NOT NULL,      -- 'exchangerate.host' | 'ecb'
  PRIMARY KEY (base, quote, observed_at)
);
CREATE INDEX ON fx_rates (base, quote, observed_at DESC);
```


market_trends, competitors, rights_deals, bestsellers 테이블도 동일한 공통 컬럼(source_uid/fingerprint/last_seen_at/updated_at/is_stale) 규약을 따른다. (스키마 상세는 `/db/migrations` 참조.)


1.2.6 이메일 성과 데이터 수집 (webhook 기반)


이메일 오픈·클릭은 배치가 아닌 webhook push 방식으로 실시간 수집한다.


```ts
// Resend Webhook 수신 핸들러 (Express)
app.post('/webhooks/email', async (req, res) => {
  const { type, data } = req.body;
  // type: 'email.opened' | 'email.clicked' | 'email.bounced' | 'email.replied'
  await db.emailEvents.insert({
    campaign_id: data.tags?.campaign_id,
    buyer_id:    data.tags?.buyer_id,
    tenant_id:   data.tags?.tenant_id,
    event_type:  type,
    occurred_at: data.created_at,
  });
  res.sendStatus(200);
});
```


Webhook 보안
	Resend/SendGrid 시그니처 헤더 검증 필수. 검증 실패 시 401 응답 + Sentry 기록.
	________________


1.3 카테고리 B — 키워드 온디맨드 수집 (SignalCraft)


1.3.1 트리거 및 파이프라인 개요


```
POST /api/v1/signalcraft/run
  body: { keyword, regions[], modules[], tenantId }
        ↓
  queue:signalcraft  (queue:batch와 완전 분리)
        ↓
  Stage 1: 수집 (5개 매체 → raw_posts append, jobId 바인딩)
  Stage 2: 전처리·정규화·중복 제거
  Stage 3: 14개 모듈 분석 (#01~#12 병렬, #13 통합)
  Stage 4: 리포트 생성 → reports 테이블 + PDF S3 업로드
        ↓
  GET /api/v1/signalcraft/jobs/:id  (진행률 폴링)
```


1.3.2 raw_posts 공통 스키마


5개 매체의 수집 결과는 아래 단일 스키마로 정규화되어 `raw_posts`에 저장된다.


```sql
CREATE TABLE raw_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL,          -- SignalCraft 실행 단위 (카테고리 B 필수 바인딩)
  tenant_id    UUID NOT NULL,
  source       VARCHAR(20) NOT NULL,   -- 'naver_news'|'naver_comment'|'youtube'|'dc'|'community'
  keyword      VARCHAR(200) NOT NULL,
  post_id      VARCHAR(200),           -- 원본 게시글 ID
  author       VARCHAR(200),
  content      TEXT NOT NULL,
  likes        INTEGER DEFAULT 0,
  dislikes     INTEGER DEFAULT 0,
  comments_cnt INTEGER DEFAULT 0,
  view_cnt     INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  url          TEXT
);
CREATE INDEX ON raw_posts (job_id);
CREATE INDEX ON raw_posts (tenant_id, collected_at DESC);
```


1.3.3 매체별 수집 방법 상세


매체
	기술
	Rate Limit 대응
	수집 필드
	오류 처리
	네이버 뉴스
	Playwright headless 크롤링, 검색 결과 페이지 파싱
	요청 간 1~3초 랜덤 딜레이, User-Agent 순환
	제목·본문·작성일·URL·댓글수
	503 시 지수 백오프 재시도 3회
	네이버 댓글
	Cheerio + 네이버 비공식 댓글 API (cbox)
	분당 최대 60 요청
	댓글 본문·좋아요·싫어요·작성자·날짜
	API 변경 시 Playwright fallback
	유튜브
	YouTube Data API v3 (공식)
	일 할당량 10,000 units, 영상당 100 units
	영상 제목·설명·좋아요·댓글 스레드
	할당량 초과 시 큐 대기 후 익일 재시도
	DC인사이드
	Playwright 크롤링, 갤러리 목록 파싱
	페이지당 2초 딜레이
	제목·본문·추천수·댓글·작성일
	로그인 필요 게시물 스킵
	클리앙·FM코리아
	Cheerio 정적 파서 (서버 렌더링)
	초당 최대 2 요청
	제목·본문·추천·댓글·조회수
	HTML 구조 변경 감지 시 Slack 알림
	


1.3.4 카테고리 A 참조 (read-only)


SignalCraft 14개 모듈은 분석 중 카테고리 A 마스터 데이터셋을 read-only로 참조할 수 있다. 참조는 반드시 Redis 캐시 레이어(`cache:ref:{table}:{key}`, TTL 1시간)를 경유한다.


모듈
	참조 카테고리 A 테이블
	용도
	#03 Sentiment / TopKeywords
	(참조 없음)
	raw_posts 단독 분석
	#05 Risk Map
	competitors
	경쟁사 브랜드·작가명 매칭
	#06 Opportunity
	market_trends, bestsellers
	장르 인기도 스코어
	#07 Strategy
	bestsellers
	성공 메시지 레퍼런스
	#11 Crisis
	competitors
	경쟁사 위기 사례 비교
	#13 Integrated
	fx_rates
	통화 환산(USD 기준 표기)
	


쓰기 금지 강제
	데이터베이스 권한 수준에서 `signalcraft_worker` 롤은 카테고리 A 테이블에 SELECT만 부여, INSERT/UPDATE/DELETE 거부.
	

1.3.5 raw_posts 보존 및 아카이브 정책


1. 기본 보존: 90일 (감사·재분석·재학습).
2. 90일 경과 시 `batch:raw-posts:archive`(매일 02:00 KST)가 Parquet로 변환해 S3 `s3://eduright-archive/raw_posts/{yyyy}/{mm}/` 에 이관.
3. 이관 완료된 레코드는 PostgreSQL에서 삭제, 메타데이터는 `raw_posts_archive_index`에 유지.


1.3.6 캐싱 전략


동일 키워드·동일 regions 조합의 SignalCraft 재실행 시 Redis 캐싱으로 LLM 호출 ~60% 감소.


캐시 키
	대상
	TTL
	`cache:signalcraft:posts:{hash(keyword+regions+dateRange)}`
	raw_posts 수집 결과
	6시간
	`cache:signalcraft:module:{moduleId}:{hash(input)}`
	모듈별 LLM 출력
	24시간
	`cache:ref:{table}:{key}`
	카테고리 A 참조
	1시간
	________________


1.4 사용자 행동 이벤트 수집


고객 대시보드의 에이전트 채택률·WAU 등은 프론트엔드 이벤트 + Express 미들웨어로 실시간 수집한다.


이벤트 전송 예시


```ts
// React 컴포넌트 내 이벤트 트래킹
const trackEvent = async (eventType: string, payload: object) => {
  await fetch('/api/v1/events', {
    method: 'POST',
    body: JSON.stringify({
      tenant_id,
      user_id,
      event_type,   // 'agent_output_accepted' | 'agent_output_rejected'
                    // | 'report_viewed' | 'dashboard_visited'
      payload,      // { agent: 'marketing', action_type: 'pitch_deck' }
      timestamp: new Date().toISOString()
    })
  });
};
```


이벤트 타입 정의


이벤트 타입
	발생 시점
	payload 필드
	사용 지표
	agent_output_accepted
	사용자가 AI 제안을 '적용' 클릭
	agent, output_type, item_id
	에이전트 채택률
	agent_output_rejected
	사용자가 AI 제안을 '무시/삭제' 클릭
	agent, output_type, item_id
	에이전트 채택률
	signalcraft_started
	SignalCraft 분석 실행 버튼 클릭
	keyword, tenant_id, job_id
	월 실행 횟수
	report_viewed
	리포트 열람 (5초 이상 체류)
	report_id, report_type
	리포트 활용률
	dashboard_visited
	대시보드 페이지 진입
	page_name
	WAU
	email_draft_sent
	AI 초안을 수정 없이 발송
	campaign_id, buyer_id
	채택률 세부
	buyer_stage_advanced
	바이어를 다음 파이프라인 단계로 이동
	buyer_id, from_stage, to_stage
	계약 전환율
	________________


1.5 운영자 대시보드 메트릭 수집


APM 도구 결정
	권장 스택: Prometheus + Grafana (오픈소스, 자체 호스팅)
이유: 비용 없음, BullMQ bull-board 연동 용이, AWS ECS 메트릭 스크래핑 지원
대안: Datadog (편의성 높으나 월 50만 원+), New Relic
MVP: Prometheus + Grafana로 시작, 운영 복잡도 높으면 Datadog 전환
	


지표
	수집 방법
	저장소
	Prometheus 메트릭명
	API 응답시간 P95
	Express 미들웨어 타이머
	Prometheus
	http_request_duration_seconds
	BullMQ 작업 상태 (양 큐)
	BullMQ 이벤트 리스너
	Redis + Prometheus
	bullmq_job_completed_total
	LLM API 호출 수/비용
	LLM 클라이언트 래퍼에서 집계
	PostgreSQL llm_usage
	llm_api_calls_total
	Redis 메모리
	Redis INFO 주기 폴링
	Prometheus
	redis_memory_used_bytes
	PostgreSQL 쿼리 시간
	pg_stat_statements 확장
	PostgreSQL
	pg_stat_statements
	크롤러 수집 건수 (A/B 분리)
	크롤러 완료 이벤트 발행
	PostgreSQL crawler_stats
	crawler_posts_collected_total
	ECS CPU/메모리
	AWS CloudWatch → Prometheus exporter
	Prometheus
	container_cpu_usage_seconds
	________________


1.6 카테고리 간 데이터 흐름도


```
┌─────────────────────────────────────────────────────────────┐
│                      외부 데이터 소스                        │
│  볼로냐 · Publishers Weekly · Google Trends ·                │
│  exchangerate.host · Amazon BSR · Nielsen/OpenLibrary · ...  │
└───────────────┬─────────────────────────────────────────────┘
                │ (cron 스케줄러: queue:batch)
                ▼
┌─────────────────────────────────────────────────────────────┐
│       카테고리 A — Persistent Master Tables                  │
│  buyers · competitors · market_trends · fx_rates ·           │
│  rights_deals · bestsellers · email_events                   │
└───────────────┬─────────────────────────────────────────────┘
                │ (read-only, Redis 캐시 경유)
                ▼
┌─────────────────────────────────────────────────────────────┐
│   카테고리 B — SignalCraft On-Demand Pipeline (14 modules)   │
│   고객 키워드 → queue:signalcraft → 5개 매체 수집 →         │
│   raw_posts → 14모듈 분석 → reports + PDF                    │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
          reports + PDF (고객 대시보드)
```


원칙
	① 카테고리 B는 카테고리 A를 읽을 수 있으나 쓰기 불가.
② 역방향 데이터 흐름(SignalCraft 결과 → 마스터 테이블) 금지.
③ 고객 키워드는 카테고리 B만 트리거 (카테고리 A는 키워드 무관).
	________________


1.7 모니터링 및 관측성


지표
	임계값
	알림 채널
	카테고리 A job 실패율 (24h)
	> 5%
	Slack #ops-alerts
	queue:batch DLQ 적체
	> 10건
	Slack #ops-alerts + PagerDuty
	크롤링 소스 연속 실패
	3회
	자동 circuit breaker + Slack
	카테고리 B 평균 실행 시간
	> 3시간
	Slack #product-alerts
	Redis 캐시 적중률 (카테고리 A 참조)
	< 70%
	대시보드 경고
	환율 API 지연
	> 5분
	대시보드 경고
	raw_posts 아카이브 지연
	> 24시간
	Slack #ops-alerts
	


Grafana 대시보드 ID
	`eduright-data-pipeline`: 카테고리 A/B 지표를 좌우로 분리 표시
	________________


2. KPI 계산 공식


이 섹션은 두 대시보드에 표시되는 모든 수치의 정확한 계산 방법을 정의한다. 개발자는 이 공식을 그대로 구현해야 한다.


2.1 리드 스코어 (Lead Score)


리드 스코어는 0~100점으로 바이어의 계약 가능성을 나타낸다. 아래 6개 변수의 가중합으로 산출한다.


변수
	설명
	최대 점수
	가중치
	genre_match
	자사 보유 콘텐츠 장르와 바이어 선호 장르의 교집합 비율 (0~1)
	30점
	30%
	language_coverage
	바이어 주요 언어를 자사가 지원하는 비율 (0~1)
	20점
	20%
	deal_recency
	마지막 거래 후 경과 시간: 1년 이내=1.0, 3년=0.5, 5년 이상=0.1
	20점
	20%
	contact_frequency
	최근 12개월 접촉 횟수: 0회=0, 1~2회=0.4, 3~5회=0.7, 6회+=1.0
	15점
	15%
	market_size
	바이어 국가 교육출판 시장 규모 (상위 20국 정규화 0~1)
	10점
	10%
	engagement_signal
	이메일 오픈·클릭 여부: 미발송=0, 발송=0.2, 오픈=0.5, 클릭=1.0
	5점
	5%
	


```ts
// 리드 스코어 계산 함수
function calcLeadScore(buyer: Buyer, myGenres: string[], mySupportedLangs: string[]): number {
  const genreMatch       = intersection(buyer.genres, myGenres).length / Math.max(buyer.genres.length, 1);
  const langCoverage     = intersection(buyer.languages, mySupportedLangs).length / Math.max(buyer.languages.length, 1);
  const yearsSinceDeal   = buyer.deal_history?.last_deal_year
                           ? (new Date().getFullYear() - buyer.deal_history.last_deal_year) : 10;
  const dealRecency      = yearsSinceDeal <= 1 ? 1.0 : yearsSinceDeal <= 3 ? 0.5 : 0.1;
  const contacts         = buyer.contact_count_12m ?? 0;
  const contactFreq      = contacts === 0 ? 0 : contacts <= 2 ? 0.4 : contacts <= 5 ? 0.7 : 1.0;
  const marketSize       = MARKET_SIZE_INDEX[buyer.country] ?? 0.2;  // 정규화 인덱스 테이블
  const emailEngage      = buyer.email_engagement ?? 0;              // 0|0.2|0.5|1.0

  return Math.round(
    genreMatch * 30 + langCoverage * 20 + dealRecency * 20 +
    contactFreq * 15 + marketSize * 10 + emailEngage * 5
  );
}
```


2.2 예상 매출 (Expected Revenue)


파이프라인 바이어들의 기대 매출을 리드 스코어 기반 성사 확률로 가중 합산한다.


```ts
// 성사 확률 = 리드 스코어 기반 구간 매핑
function toProbability(leadScore: number): number {
  if (leadScore >= 80) return 0.65;  // Hot
  if (leadScore >= 60) return 0.35;  // Warm
  if (leadScore >= 40) return 0.15;  // Lukewarm
  return 0.05;                        // Cold
}

// CRM 단계별 추가 가중치
const STAGE_MULTIPLIER = {
  'initial_contact':   1.0,
  'meeting_scheduled': 1.3,
  'proposal_sent':     1.6,
  'negotiation':       2.0,
  'contract_review':   2.5,
};

// 계약 단가 기본값 (테넌트가 설정 가능)
const DEFAULT_DEAL_VALUE_KRW = 15_000_000; // 1,500만 원

const expectedRevenue = pipeline.buyers.reduce((sum, buyer) => {
  const prob = toProbability(buyer.lead_score) * STAGE_MULTIPLIER[buyer.stage];
  const dealValue = buyer.custom_deal_value ?? DEFAULT_DEAL_VALUE_KRW;
  return sum + (prob * dealValue);
}, 0);
```


통화 환산
	글로벌 바이어는 USD/EUR 기준일 수 있다. fx_rates 최신 레코드로 KRW 환산 후 집계한다.
	

2.3 이메일 캠페인 지표


```sql
SELECT
  campaign_id,
  COUNT(*) FILTER (WHERE event_type = 'email.sent')    AS sent,
  COUNT(*) FILTER (WHERE event_type = 'email.opened')  AS opened,
  COUNT(*) FILTER (WHERE event_type = 'email.clicked') AS clicked,
  COUNT(*) FILTER (WHERE event_type = 'email.replied') AS replied,

  -- 오픈율 (중복 제거: 동일 buyer 여러 번 열어도 1회)
  COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.opened')
    / NULLIF(COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.sent'), 0)::NUMERIC
    AS open_rate,

  -- CTOR (클릭 / 오픈)
  COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.clicked')
    / NULLIF(COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.opened'), 0)::NUMERIC
    AS click_to_open_rate
FROM email_events
WHERE tenant_id = $1 AND occurred_at >= NOW() - INTERVAL '30 days'
GROUP BY campaign_id;
```


2.4 에이전트 출력 채택률


```sql
SELECT
  payload->>'agent'       AS agent_name,
  payload->>'output_type' AS output_type,
  COUNT(*) FILTER (WHERE event_type = 'agent_output_accepted') AS accepted,
  COUNT(*) FILTER (WHERE event_type = 'agent_output_rejected') AS rejected,
  COUNT(*) FILTER (WHERE event_type = 'agent_output_accepted')
    / NULLIF(
        COUNT(*) FILTER (WHERE event_type IN ('agent_output_accepted','agent_output_rejected')),
        0
      )::NUMERIC AS adoption_rate
FROM events
WHERE tenant_id = $1
  AND event_type IN ('agent_output_accepted', 'agent_output_rejected')
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY agent_name, output_type
ORDER BY adoption_rate DESC;
```


2.5 WAU (주간 활성 사용자)


활성의 정의
	다음 중 하나 이상을 해당 주에 수행한 사용자를 활성으로 정의한다.
① 에이전트 실행 요청 (signalcraft_started, 피칭덱 생성 등)
② 리포트 열람 5초 이상 (report_viewed)
③ 바이어 파이프라인 단계 변경 (buyer_stage_advanced)
단순 로그인·대시보드 방문만으로는 활성 처리 안 함.
	


```sql
SELECT COUNT(DISTINCT user_id) AS wau
FROM events
WHERE tenant_id = $1
  AND event_type IN ('signalcraft_started','agent_output_accepted',
                     'report_viewed','buyer_stage_advanced','email_draft_sent')
  AND timestamp >= date_trunc('week', NOW())
  AND timestamp <  date_trunc('week', NOW()) + INTERVAL '7 days';
```


2.6 LLM API 비용 집계 (운영자 대시보드)


모델
	입력 단가
	출력 단가
	집계 테이블
	Gemini 2.5 Flash
	$0.075 / 1M tokens
	$0.30 / 1M tokens
	llm_usage
	Claude Sonnet 4.6
	$3.00 / 1M tokens
	$15.00 / 1M tokens
	llm_usage
	


```sql
SELECT
  tenant_id,
  model_name,
  DATE(called_at) AS date,
  SUM(input_tokens)  AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(input_tokens  * price_per_input_token
    + output_tokens * price_per_output_token) AS cost_usd
FROM llm_usage
WHERE called_at >= NOW() - INTERVAL '30 days'
GROUP BY tenant_id, model_name, DATE(called_at)
ORDER BY cost_usd DESC;
```


테넌트 귀속
	모든 LLM 호출 시 헤더 또는 메타데이터에 tenant_id를 포함하여 llm_usage 테이블에 기록한다.
	

2.7 SignalCraft 브랜드 선호도 추정 — 편향 보정


5개 매체의 긍정/부정 반응 비율을 매체별 가중치로 보정해 추정 선호도 범위를 산출한다.


매체
	인구 대표성 가중치
	근거
	네이버 뉴스 댓글
	0.20
	강한 반응 집단 편향
	유튜브 댓글
	0.25
	연령 편중(10~30대), 도달 넓음
	DC인사이드
	0.15
	특정 성별·연령 편향 강함
	클리앙
	0.20
	IT 친화 30~50대, 소비 여력 높음
	FM코리아
	0.20
	스포츠·엔터 관심층, 중간 대표성
	


```ts
function calcWeightedSentiment(sentimentBySource: Record<string, SentimentData>) {
  const WEIGHTS = {
    naver_news: 0.20, youtube: 0.25, dc: 0.15, clien: 0.20, fmkorea: 0.20
  };
  let weightedPos = 0, weightedNeg = 0;
  for (const [source, data] of Object.entries(sentimentBySource)) {
    const w = WEIGHTS[source] ?? 0;
    weightedPos += data.positive_ratio * w;
    weightedNeg += data.negative_ratio * w;
  }
  const confidence = calcConfidence(sentimentBySource);
  const margin = confidence === 'high' ? 0.03 : confidence === 'medium' ? 0.05 : 0.08;
  return {
    estimatedPositive: weightedPos,
    range: { min: weightedPos - margin, max: weightedPos + margin },
    confidence,
  };
}
```
________________


3. 보고서 생성 파이프라인


3.1 PDF 생성 기술 결정


결정: Puppeteer 기반 HTML → PDF 변환 (권장)
	이유: React 대시보드와 동일한 HTML/CSS 자산 재사용 가능, 시각화 충실 재현
대안: ReportLab (Python), LaTeX — 별도 서비스 또는 학습 비용 큼
구현: Node.js Puppeteer 컨테이너를 별도 ECS 태스크로 분리 (Chrome headless 메모리 격리)
출력 품질: A4 210×297mm, margin 15mm, 해상도 150 DPI
	


```ts
app.post('/api/v1/reports/:reportId/export-pdf', async (req, res) => {
  const { reportId } = req.params;
  const report = await db.reports.findById(reportId);

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const renderUrl = `${INTERNAL_BASE_URL}/render/report/${reportId}?token=${signToken(reportId)}`;
  await page.goto(renderUrl, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    printBackground: true,
  });
  await browser.close();

  const s3Key = `reports/${report.tenant_id}/${reportId}.pdf`;
  await s3.upload({ Bucket: S3_BUCKET, Key: s3Key, Body: pdf }).promise();
  res.json({ pdf_url: await getSignedUrl(s3Key) });
});
```


3.2 SignalCraft 통합 리포트 구조


SC-13 모듈이 생성하는 통합 리포트(Integrated Report)의 섹션 구성이다. LLM에게 이 구조대로 출력하도록 프롬프트에 명시한다.


섹션
	섹션명
	데이터 소스
	분량 기준
	0
	표지
	분석 키워드·날짜·테넌트명
	1페이지
	1
	한 줄 요약 (BLUF)
	SC-08 oneLiner
	1~2문장 (30~50자)
	2
	현재 여론 구조
	SC-01 전체·SC-02 집단
	300~500자
	3
	감정 분포 & 키워드 TOP 20
	SC-03 sentimentRatio·topKeywords
	표 + 300자
	4
	메시지 파급력 분석
	SC-04 success/failureMessages
	300자
	5
	리스크 지도 (Top 3~5)
	SC-05 topRisks
	리스크별 100자
	6
	기회 분석
	SC-06 priorityOpportunity
	300자
	7
	종합 전략 권고
	SC-07 messageStrategy·contentStrategy
	400~600자
	8
	브랜드 선호도 추정
	SC-09 estimatedRange + 면책
	200자 + 면책
	9
	프레임 경쟁 현황
	SC-10 dominantFrames
	300자
	10
	위기 대응 시나리오 (3가지)
	SC-11 scenarios
	시나리오별 200자
	11
	전략 성공 확률
	SC-12 successProbability + conditions
	200자 + 조건표
	12
	즉시 실행 과제 (Top 3~5)
	SC-08 criticalActions
	액션별 1문장
	부록 A
	원문 인용 근거
	raw_posts URL 목록
	자동 생성
	부록 B
	수집 메타데이터
	수집 일시·매체별 건수
	자동 생성
	


3.3 시장 트렌드 리포트 구조 (Research Agent)


Research Agent가 카테고리 A 마스터 데이터셋(buyers, market_trends, competitors, bestsellers)을 집계해 생성한다. LLM 요약 구간에서만 Claude Sonnet 4.6을 호출한다.


섹션
	내용
	생성 방법
	갱신
	시장 동향 요약
	최근 4주 주요 뉴스·계약 동향 3~5개
	market_trends 집계 → LLM 요약
	주 1회
	장르별 수요 지도
	볼로냐 참가사 선호 장르 분포
	buyers.genres 집계 → Chart.js 히트맵
	수집 시
	국가별 바이어 활동
	국가별 신규 바이어 수·거래 빈도
	buyers + rights_deals 집계
	일 1회
	경쟁사 신작 동향
	주요 경쟁사 최근 출간·계약 정보
	competitors + rights_deals + LLM 요약
	주 1회
	기회 장르 TOP 5
	자사 미보유이나 수요 높은 장르
	buyers.genres vs 보유 장르 diff
	월 1회
	권고 액션
	이번 주 주목해야 할 바이어 3인
	리드 스코어 상위 + 최근 활동
	일 1회
	


3.4 번역 품질 검토 리포트 구조 (TA-03)


항목
	내용
	자동화 방법
	BLEU Score
	원문 대비 번역 품질 점수 (0~1)
	sacreBLEU 라이브러리 자동 계산
	전문 용어 일관성
	용어집 등재 단어 번역 일치 여부
	번역 결과 vs 용어집 DB 자동 대조
	길이 비율 이상
	원문 대비 번역 길이 50% 이상 차이
	문자 수 비교 로직
	미번역 구간
	원문 언어 그대로 남은 구간 탐지
	언어 감지 API (lingua-py)
	권고 교정 목록
	품질 기준 미달 문장 목록 + 제안 번역
	Claude Sonnet 4.6 교정 제안
	________________


4. LLM 프롬프트 설계 원칙


14개 AI 모듈의 프롬프트는 아래 공통 원칙을 따른다. 각 모듈 담당 엔지니어는 이 원칙을 반드시 준수한다.


4.1 공통 프롬프트 구조 (4-Part Template)


```ts
const buildPrompt = (module: ModuleConfig, context: AnalysisContext) => `
## 역할 (ROLE)
${module.role}

## 입력 데이터 (INPUT)
분석 키워드: ${context.keyword}
수집 기간: ${context.dateRange}
수집 건수: ${context.postCount}건
이전 단계 결과: ${JSON.stringify(context.upstreamResults)}

원문 데이터 (최대 ${module.maxPosts}건 샘플):
${context.posts.slice(0, module.maxPosts).map(formatPost).join('\n')}

## 분석 지시 (TASK)
${module.task}

## 제약 조건 (CONSTRAINTS)
- 실제 수집된 데이터에서만 근거를 찾을 것. 존재하지 않는 사실 생성 금지.
- 추정값에는 반드시 confidence(high/medium/low)를 포함할 것.
- 아래 JSON 스키마를 정확히 따를 것. 추가 필드 금지.

## 출력 형식 (OUTPUT FORMAT)
반드시 다음 JSON 스키마로만 응답하라:
${JSON.stringify(module.zodSchema.shape, null, 2)}
`;
```


4.2 모듈별 Role·Task 정의


모듈
	ROLE (역할 정의)
	TASK 핵심 지시
	#01 Macro View
	한국 온라인 여론 분석 전문가
	전체 데이터를 시간축으로 펼쳐 변곡점과 이벤트-반응 인과관계를 서사로 재구성
	#02 Segmentation
	소비자 행동 분석 전문가
	댓글 작성자를 Core·Neutral·Critical 3집단으로 분류하고 집단별 규모·결집력 평가
	#03 Sentiment
	NLP 감성 분석 전문가
	감정 분포(긍/부/중립) 정량화, 핵심 키워드 TOP 20 추출, 프레임 경쟁 구조 분석
	#05 Risk Map
	브랜드 리스크 관리 전문가
	4D(발화점·확산력·지속성·피해범위) 기준 Top 3~5 리스크 우선순위화 및 트리거 조건
	#06 Opportunity
	마케팅 전략가
	부정 여론 속 긍정 자산 발굴, SWOT 관점 기회 3개 도출
	#07 Strategy
	IMC 캠페인 전략가
	타겟·메시지·콘텐츠·리스크대응 4축 실행 전략, 메시지 15자 이내 압축
	#08 Summary
	경영진 보고서 작가
	BLUF 원칙 적용, 30~50자 한 줄 요약, 즉시 실행 과제 3~5개
	#09 Preference
	시장 리서치 분석가
	플랫폼 편향 보정 후 브랜드 선호도 추정 범위 산출, 면책 문구 자동 포함
	#11 Crisis
	위기 커뮤니케이션 전문가
	확산/통제/역전 3시나리오, SCCT 이론 기반 대응 전략
	#12 Success Sim
	전략 컨설턴트
	11개 선행 분석 결과 종합, 베이지안 추론으로 전략 성공 확률 0~100% 산출
	#13 Integrated
	리포트 편집장
	12개 모듈 결과를 피라미드 원칙으로 재구성, 중복 통합, 출처 부록 자동 생성
	


4.3 Zod 스키마 예시 — Module #01 Macro View


```ts
import { z } from 'zod';

export const MacroViewSchema = z.object({
  overallDirection: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  summary: z.string().min(100).max(500),
  inflectionPoints: z.array(z.object({
    date: z.string(),
    event: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
  })).max(5),
  dailyMentionTrend: z.array(z.object({
    date: z.string(),
    count: z.number().int().nonnegative(),
    sentiment: z.enum(['positive', 'negative', 'neutral']),
  })),
  confidence: z.enum(['high', 'medium', 'low']),
  disclaimer: z.string().optional(),
});

// LLM 출력 파싱 시 반드시 이 스키마로 검증
const parsed = MacroViewSchema.safeParse(llmOutput);
if (!parsed.success) {
  throw new SchemaValidationError(parsed.error);  // 최대 2회 재시도
}
```


4.4 환각(Hallucination) 방지 지침


* 모든 프롬프트 CONSTRAINTS 섹션에 '실제 수집된 데이터만 인용, 없는 사실 생성 금지' 문구 필수
* LLM 출력의 수치·날짜·고유명사는 raw_posts 데이터와 교차 검증 로직 추가 (포스트-처리 단계)
* Zod 스키마 검증 실패 시 최대 2회 재시도, 그래도 실패하면 해당 모듈을 null 처리하고 파이프라인 계속
* 신뢰도(confidence)가 'low'인 모든 추정값은 대시보드에 회색 면책 배지로 표시
________________


5. 대시보드 API 엔드포인트 명세


5.1 고객 대시보드 API


엔드포인트
	메서드
	설명
	응답 핵심 필드
	GET /api/v1/dashboard/kpis
	GET
	KPI 패널 전체 데이터
	activeBuyers, pipelineRevenue, followupsToday, agentStatus[5]
	GET /api/v1/buyers?sort=lead_score
	GET
	리드 스코어 상위 바이어 목록
	id, name, country, leadScore, stage, lastContacted
	GET /api/v1/campaigns/:id/stats
	GET
	이메일 캠페인 성과
	sent, openRate, clickToOpenRate, replied
	GET /api/v1/signalcraft/latest
	GET
	최신 SignalCraft 결과 요약
	oneLiner, overallRiskLevel, priorityOpportunity, successProbability
	GET /api/v1/reports/:id
	GET
	통합 리포트 JSON
	sections[], metadata, createdAt
	POST /api/v1/reports/:id/export-pdf
	POST
	리포트 PDF 생성 요청
	pdf_url (S3 signed URL)
	POST /api/v1/signalcraft/run
	POST
	SignalCraft 파이프라인 실행 (카테고리 B 트리거)
	job_id, estimatedMinutes
	GET /api/v1/signalcraft/jobs/:id
	GET
	파이프라인 진행 상황 폴링
	progress%, currentModule, status
	


5.2 운영자 대시보드 API


엔드포인트
	메서드
	설명
	응답 핵심 필드
	GET /admin/system/health
	GET
	전체 시스템 헬스 요약
	uptime, apiP95ms, bullmqFailed, llmErrorRate, redisMemPct
	GET /admin/crawlers/status
	GET
	크롤러 상태 (카테고리 A/B 분리)
	source, category, lastCollectedAt, successCount24h, failCount24h
	GET /admin/pipeline/queue
	GET
	BullMQ 큐 현황 (batch + signalcraft)
	queueName, waiting, active, completed, failed, dlq
	GET /admin/pipeline/modules/stats
	GET
	14개 모듈 실행 통계
	moduleId, avgDurationMs, successRate, failCount7d
	GET /admin/llm/usage
	GET
	LLM API 사용량·비용
	model, date, totalTokens, costUsd (테넌트별 분리)
	GET /admin/tenants/usage
	GET
	테넌트별 사용량
	tenantId, name, plan, monthlyRuns, costUsd, lastActive
	GET /admin/errors/stream
	GET (SSE)
	실시간 에러 로그 스트림
	Server-Sent Events — level, service, message, timestamp
	POST /admin/crawlers/:source/run
	POST
	크롤러 수동 즉시 실행
	jobId
	POST /admin/batch/:jobId/retry
	POST
	카테고리 A 실패 job 수동 재시도
	jobId, status
	


인증 구분
	고객 API (/api/v1/*): JWT Bearer 토큰, 테넌트 격리 미들웨어 필수
운영자 API (/admin/*): Google SSO 세션 + IP 화이트리스트 미들웨어 필수
SSE 엔드포인트 (/admin/errors/stream): 연결 유지 타임아웃 60초, 재연결 로직 프론트엔드 구현
	________________


6. 오픈 이슈 (구현 전 결정 필요)


#
	이슈
	선택지
	결정 기한
	OI-01
	볼로냐 데이터 원천
	Option A: 공식 사이트 Playwright 크롤링 (무료, 구조 변경 리스크)
Option B: Exhibitor API (유료, 안정)
	MVP: A로 시작, M3 리뷰 시 B 전환 검토
	OI-02
	Nielsen BookData 유료 API 도입
	$500~$2000/월 / Open Library 무료 대체
	MVP 시점 예산 검토
	OI-03
	Google Trends 쿼터 초과
	SerpAPI 유료 대체 검토 (무료 ~1000회/일)
	트래픽 기반 사후 결정
	OI-04
	볼로냐 크롤링 법적 검토
	robots.txt 준수 + rate limit < 1 req/sec + 법무 리뷰
	MVP 개발 전 필수
	OI-05
	카테고리 A 테넌트 격리 수준
	global shared / per-tenant mirror
	대형 고객 요청 시 per-tenant 마이그레이션
	OI-06
	APM 도구
	Prometheus+Grafana / Datadog
	운영 복잡도 기준 M3 재검토
	________________


— END OF DOCUMENT —
EduRights AI Technical Spec v1.1  ·  INTERNAL
INTERNAL  ·  EduRights AI Technical Spec  ·   /
