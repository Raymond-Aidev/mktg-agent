GoldenCheck  ·  Implementation Plan  |  v1.0 → v2.0

> **v2.0 업데이트 (2026-04-14)**: 실제 구현 진행 상황을 반영합니다.

## Phase 진행 현황 (2026-04-14 기준)

| Phase | 설계 기간 | 상태 | 달성도 | 비고 |
|-------|----------|------|--------|------|
| Phase 0. 프로젝트 셋업 | W01~W02 | 완료 | 90% | Railway로 변경 (AWS 아님), CI/CD는 Railway 자동 배포, buildCommand 설정 완료 |
| Phase 1. 데이터 기반 | W03~W05 | 완료 | 95% | 12개 마이그레이션 (0001~0012), BullMQ 2큐, DB Role 강제 적용 |
| Phase 2. Category A 파이프라인 | W06~W10 | 부분 완료 | 55% | 5/7 배치 구현, buyers:bologna/raw-posts:archive 미구현, DLQ 미구현 |
| Phase 3. Category B 수집기 | W06~W09 | 부분 완료 | 30% | Naver+HN 구현, YouTube/DC/Clien/FM 미구현 |
| Phase 4. LLM 14모듈 | W10~W15 | 부분 완료 | 45% | 6/14 모듈 구현 (#01,#03,#06,#07,#08,#13), #06 SWOT→Market Intelligence 변경 |
| Phase 5. KPI/리포트/PDF | W16~W19 | 부분 완료 | 65% | KPI 계산, 리포트 HTML 시각화(도넛/SOV/포지셔닝맵/타임라인) 완료, PDF/R2 미구현 |
| Phase 6. API/대시보드 통합 | W18~W22 | 대폭 확장 | 85% | 19개 API, 21개 React 컴포넌트, JWT 인증, 제품/키워드 CRUD, 어드민 패널 |
| Phase 7. 관측성 | W22~W25 | 진행 중 | 25% | Prometheus /metrics + Sentry 기본. Grafana 대시보드/DLQ/부하테스트 미구현 |
| Phase 8. MVP 릴리즈 | W25~W28 | 미시작 | 0% | |

### 설계 외 추가 구현 (Phase A~D + Admin + 샘플)

| Phase | 내용 | 상태 | 완료일 |
|-------|------|------|--------|
| Phase A | 랜딩 페이지 (히어로/기능/프로세스/요금제/FAQ) + 글로벌 네비게이션 + 뒤로가기 | 완료 | 2026-04-13 |
| Phase B | 회원가입/로그인 (JWT + bcrypt + users 테이블 + localStorage 토큰) | 완료 | 2026-04-13 |
| Phase C | 제품/키워드 CRUD (products + product_keywords 테이블 + API + UI) | 완료 | 2026-04-13 |
| Phase D | 법적 문서 v1.0 (이용약관/개인정보/사업자정보) + 요금제 페이지 (/pricing) | 완료 | 2026-04-13 |
| Admin | 어드민 패널 (회원 목록/생성/권한 변경/삭제, 시스템 통계 7개 지표) | 완료 | 2026-04-13 |
| 분석 샘플 | 랜딩 페이지 + 로그인 후 네비게이션에 샘플 리포트 탭 (iframe) | 완료 | 2026-04-13 |
| 디자인 | FlareLane 스타일 적용 (인디고 블루, Inter 폰트, 이모지 전량 제거) | 완료 | 2026-04-13 |
| 시드 데이터 | "어린이AI 지휘자" 제품 기준 전체 파이프라인 더미 데이터 | 완료 | 2026-04-13 |

### 잔여 작업 (MVP 전 필수)

| 우선순위 | 항목 | Phase |
|---------|------|-------|
| HIGH | Category B 수집기 확장 (YouTube/DC/Clien/FM) | Phase 3 |
| HIGH | LLM 모듈 8개 추가 (#02,#04,#05,#09,#10,#11,#12,#14) | Phase 4 |
| HIGH | Grafana 대시보드 + 알림 규칙 7개 | Phase 7 |
| HIGH | DLQ 플레이북 + Circuit Breaker | Phase 7 |
| MEDIUM | PDF 생성 (Puppeteer) + R2 업로드 | Phase 5 |
| MEDIUM | PG 연동 결제 시스템 | Phase D 후속 |
| MEDIUM | 부하 테스트 (10 동시 SignalCraft) | Phase 7 |
| MEDIUM | buyers:bologna 크롤러 | Phase 2 |
| LOW | raw_posts S3 Parquet 아카이브 | Phase 2 |
| LOW | i18n (한/영) | Phase 6 |
| LOW | 이메일 인증 (회원가입 시) | Phase B 후속 |

---

GoldenCheck (구 EduRights AI) — AI Marketing Agent Platform
Implementation Plan


6개월 MVP 단계별 구현 계획서


문서 버전
	v1.0 (아래 원본은 이력 보존용)
작성일
	2026년 4월
분류
	내부용 (INTERNAL)
연관 문서
	GoldenCheck PRD v2.0 · Technical Specification v2.0
독자
	개발팀
목적
	기술 명세서의 모든 요구사항을 구현 가능한 8개 단계로 분해하고, 각 단계의 산출물·검증 기준·의존성·리스크를 정의
MVP 목표 일시
	2026년 10월 말 (볼로냐 북페어 시즌 대비)
전체 가용 기간
	2026년 4월 ~ 10월 (약 26주, 6개월)
________________


0. 계획 수립 원칙


원칙 1 — 수직 슬라이스 우선
	파이프라인 전 구간을 일찍 연결하고(2개 데이터셋 + 1개 LLM 모듈 + 1개 리포트), 이후 폭을 확장. "전체 구조를 먼저, 상세는 나중에."
원칙 2 — 카테고리 A/B 병행
	카테고리 A(배치)와 B(온디맨드)는 서로 다른 팀원이 병렬 진행 가능. 두 큐·두 테이블 세트가 분리되어 있어 충돌 위험 낮음.
원칙 3 — LLM 모듈은 마지막에
	프롬프트·Zod 스키마는 데이터 수집이 안정된 후 튜닝. 데이터 없이 프롬프트 엔지니어링하면 반복 작업 낭비.
원칙 4 — 관측성 조기 투입
	Prometheus + Grafana는 Phase 1에서 셋업. 장애 감지 없이 카테고리 A 배치를 돌리면 실패 원인 파악 불가.
원칙 5 — "결정" 항목은 기한을 두고 보류
	Nielsen API, Datadog 전환 등 오픈 이슈(Tech Spec §6)는 M3 리뷰까지 결정 연기.
	________________


1. 팀 구성 및 역할


역할
	담당 범위
	주 투입 Phase
	풀스택 리드 (FSL)
	인프라, BullMQ, DB 스키마, API, 배포, 코드 리뷰
	전 단계 총괄
	프론트엔드 (FE)
	React 대시보드, Chart.js, PDF 렌더링 HTML, 이벤트 트래커
	Phase 1, 5, 6, 7
	AI 엔지니어 (AI)
	14모듈 프롬프트, Zod 스키마, LLM 클라이언트 래퍼, 편향 보정
	Phase 3, 4
	PM / 데이터 엔지니어 (PM)
	카테고리 A 크롤러, 데이터 소스 법무 검토, QA, 문서화
	Phase 1, 2, 7, 8
	________________


2. 단계 개요 (한눈에 보기)


Phase
	기간
	주차
	핵심 산출물
	Phase 0. 프로젝트 셋업
	2026-04-15 ~ 04-28
	W01~W02
	레포·CI·ECS·Postgres·Redis·모니터링 스캐폴드
	Phase 1. 데이터 기반
	2026-04-29 ~ 05-19
	W03~W05
	DB 스키마 전체, 공통 유틸, BullMQ 큐 2개, 이벤트 수집
	Phase 2. 카테고리 A 파이프라인
	2026-05-20 ~ 06-23
	W06~W10
	7개 마스터 데이터셋 배치 수집 + cron + 재시도 + 장애 복구
	Phase 3. 카테고리 B 수집기
	2026-05-20 ~ 06-16
	W06~W09 (병렬)
	5개 매체 크롤러 + raw_posts + 캐싱 + 진행률 API
	Phase 4. LLM 14모듈 분석
	2026-06-17 ~ 07-28
	W10~W15
	14개 모듈 프롬프트·Zod 스키마·병렬 실행·환각 방지
	Phase 5. KPI · 리포트 · PDF
	2026-07-29 ~ 08-25
	W16~W19
	리드 스코어·예상 매출·통합 리포트·PDF 생성
	Phase 6. API · 대시보드 통합
	2026-08-12 ~ 09-15
	W18~W22 (일부 병렬)
	고객/운영자 API 전체 + React 대시보드 + SSE
	Phase 7. 관측성·장애 대응
	2026-09-09 ~ 09-29
	W22~W25
	Grafana 보드, 알림, DLQ 대응, 부하 테스트
	Phase 8. MVP 릴리즈 준비
	2026-09-30 ~ 10-27
	W25~W28
	보안 감사, 법무 검토 완료, 사용자 수용 테스트, 배포
	


크리티컬 패스
	Phase 0 → 1 → (2 ∥ 3) → 4 → 5 → 6 → 7 → 8
	
병렬 실행 가능 구간
	Phase 2(PM)와 Phase 3(AI+FSL)은 W06~W09에서 병렬.
Phase 6(FE)은 Phase 5 후반부터 시작 가능.
	________________


3. Phase 상세


3.1 Phase 0. 프로젝트 셋업 (W01~W02, 2주)


목표
	모든 팀원이 로컬·스테이징에서 동일하게 개발 가능한 기반 환경 구축.
	


주요 작업


작업
	담당
	산출물
	검증
	0.1 GitHub 레포 구조 확정
	FSL
	`apps/api`, `apps/web`, `apps/workers`, `packages/shared` 모노레포
	`pnpm install` 성공
	0.2 TypeScript 공통 설정
	FSL
	tsconfig base, ESLint, Prettier, Husky pre-commit
	`pnpm lint` 통과
	0.3 AWS ECS + RDS + ElastiCache 프로비저닝
	FSL
	Terraform 모듈 (vpc, ecs, rds, elasticache, s3)
	`terraform apply` 성공, staging 환경 up
	0.4 Postgres 15 + Redis 7 스키마 초기화
	FSL
	`db/migrations/0001_init.sql`
	마이그레이션 실행 성공
	0.5 CI/CD 파이프라인
	FSL
	GitHub Actions → ECR → ECS Blue/Green
	PR 머지 시 staging 자동 배포
	0.6 Prometheus + Grafana + Sentry
	FSL
	docker-compose (local), Grafana Cloud 연동 (staging)
	대시보드 접속 가능, Sentry 테스트 에러 전송 확인
	0.7 비밀 관리
	FSL
	AWS Secrets Manager (OpenAI/Anthropic/Google API 키)
	env 주입 확인
	0.8 개발자 가이드 README
	PM
	로컬 실행, 테스트, 배포 절차 문서
	팀원 2명 onboarding 실제 실행
	


완료 기준 (DoD)
	① staging URL에서 "Hello World" 응답 확인
② 임의 커밋이 자동으로 staging에 배포됨
③ Grafana에서 ECS CPU 메트릭 시각화됨
	
리스크
	AWS 계정·IAM 권한 지연 → W01 시작 전 계정 확보 필수
	________________


3.2 Phase 1. 데이터 기반 (W03~W05, 3주)


목표
	모든 테이블 스키마·공통 유틸·이벤트 수집 인프라를 완성하여 이후 단계들이 데이터 기반 없이 블로킹되지 않도록 한다.
	


주요 작업


작업
	담당
	산출물
	검증
	1.1 전체 DB 마이그레이션 (Tech Spec §1.2.5 기반)
	FSL
	buyers, competitors, market_trends, fx_rates, rights_deals, bestsellers, email_events, raw_posts, events, llm_usage, crawler_failures, reports, campaigns 등
	`pnpm db:migrate` 성공, 스키마 ERD 생성
	1.2 공통 컬럼 규약 구현
	FSL
	source_uid/fingerprint/last_seen_at/updated_at/is_stale 트리거, change_log 테이블
	fingerprint 변경 시 change_log에 diff 기록 테스트 통과
	1.3 BullMQ 큐 2개 셋업
	FSL
	`queue:batch`, `queue:signalcraft` + bull-board 관리 UI
	bull-board에서 큐 확인 가능
	1.4 DB 권한 롤 정의
	FSL
	`signalcraft_worker`(카테고리 A SELECT only), `batch_worker`(A 테이블 RW)
	INSERT 시도 시 권한 에러 확인
	1.5 Redis 캐시 레이어
	FSL
	`cache:ref:{table}:{key}`, `cache:signalcraft:*` 헬퍼 함수
	캐시 HIT/MISS 로깅
	1.6 이벤트 수집 엔드포인트
	FSL
	`POST /api/v1/events` + 프론트엔드 훅 `useTrackEvent()`
	브라우저에서 이벤트 발생 시 events 테이블 적재 확인
	1.7 LLM 클라이언트 래퍼
	AI
	Anthropic + Google SDK 통합, llm_usage 자동 기록, tenant_id 헤더 바인딩
	테스트 호출 시 llm_usage 레코드 생성
	1.8 SendGrid/Resend webhook 수신 엔드포인트
	FSL
	`POST /webhooks/email` + 시그니처 검증
	샘플 webhook 전송 시 email_events 적재
	


완료 기준
	① 모든 테이블이 staging에 존재
② bull-board에서 2개 큐 시각화
③ 더미 이벤트 end-to-end 기록 성공 (FE → API → DB)
	
의존성
	Phase 0 완료
	리스크
	스키마 변경 잦을 수 있음 → migration 번호 체계 엄격 관리, 롤백 스크립트 필수
	________________


3.3 Phase 2. 카테고리 A 파이프라인 (W06~W10, 5주)


목표
	7개 마스터 데이터셋을 모두 정기 배치로 수집·적재·업데이트하고, 장애 복구 정책을 구현한다.
	


주차별 분해


주차
	작업
	담당
	W06
	2.1 fx_rates (exchangerate.host REST, 매시 cron, 최단 난이도 → 먼저 시작)
	PM
	W06
	2.2 공통 배치 러너 프레임워크 (job wrapper, 재시도, circuit breaker, DLQ)
	FSL
	W07
	2.3 bestsellers (Amazon BSR + 교보문고 Playwright, 매일 06:00)
	PM
	W07
	2.4 market_trends (pytrends + Statista RSS, 매일 05:00)
	PM
	W08
	2.5 buyers (볼로냐 Playwright 크롤러, 매일 03:00) ← OI-01 결정 필요
	PM + FSL
	W09
	2.6 competitors (PW/Bookseller RSS + 크롤링, 매주 월 04:00)
	PM
	W09
	2.7 rights_deals (Open Library API 증분, 매일 03:30)
	PM
	W10
	2.8 raw_posts 아카이브 배치 (매일 02:00 → S3 Parquet 이관)
	FSL
	W10
	2.9 운영자용 수동 재시도 API (`POST /admin/batch/:jobId/retry`)
	FSL
	W10
	2.10 통합 테스트 (7개 데이터셋 48시간 무중단 운영 검증)
	PM
	


주요 구현 포인트
	① 크롤러는 `packages/crawlers/{source}.ts`로 구조화, 공통 인터페이스 `collect(): Promise<CollectResult>`
② 각 배치 job은 `jobId` 고정(`batch:buyers:bologna` 등)으로 중복 등록 방지
③ fingerprint 비교는 공통 유틸 `computeFingerprint(record, keys)` 사용
④ 법적 리스크(OI-04 볼로냐 robots.txt) 확인 전에는 크롤러 staging에서만 실행
	


완료 기준
	① 7개 테이블에 실제 데이터 누적 (볼로냐 1,500건, 환율 24건/일 등)
② DLQ 없이 48시간 무중단 운영
③ 의도적 장애 주입 시 circuit breaker + Slack 알림 작동
	
의존성
	Phase 1 완료 (테이블·큐·캐시)
	리스크
	볼로냐 HTML 구조 변경 / Google Trends 쿼터 초과 / Nielsen 의존성
완화: pytrends 캐싱 강화, Open Library fallback 확보
	________________


3.4 Phase 3. 카테고리 B 수집기 (W06~W09, 4주, Phase 2와 병렬)


목표
	SignalCraft 파이프라인의 Stage 1~2(수집·전처리)를 완성해, 14모듈이 소비할 raw_posts를 안정적으로 공급한다.
	


주차
	작업
	담당
	W06
	3.1 queue:signalcraft 워커 + 진행률 추적 (`signalcraft_jobs` 테이블)
	FSL
	W06
	3.2 네이버 뉴스 크롤러 (Playwright, User-Agent 순환)
	AI
	W07
	3.3 네이버 댓글(cbox API) + Playwright fallback
	AI
	W07
	3.4 유튜브 데이터 (YouTube Data API v3, 쿼터 관리)
	AI
	W08
	3.5 DC인사이드 크롤러 (로그인 필요 게시물 스킵)
	AI
	W08
	3.6 클리앙 + FM코리아 Cheerio 파서
	AI
	W09
	3.7 정규화·중복 제거 Stage 2
	AI
	W09
	3.8 Redis 캐싱 (동일 키워드 재실행 60% 절감 목표)
	FSL
	W09
	3.9 `POST /api/v1/signalcraft/run` + `GET /api/v1/signalcraft/jobs/:id` 폴링 API
	FSL
	


완료 기준
	① 임의 키워드("어린이 책")로 5개 매체 수집 → raw_posts에 500건 이상 적재
② 진행률 API가 Stage 1 진행률 0~100% 반환
③ 동일 키워드 재실행 시 캐시 히트 > 60%
	
의존성
	Phase 1의 raw_posts 테이블·BullMQ·Redis
	리스크
	네이버 cbox API 변경 빈도 높음 → Playwright fallback 우선 구현
DC인사이드 크롤링 법적 이슈 → 법무 사전 리뷰
	________________


3.5 Phase 4. LLM 14모듈 분석 (W10~W15, 6주)


목표
	SignalCraft Stage 3(14모듈 병렬 분석)과 Stage 4(#13 통합 리포트 생성)를 완성한다.
	


주차
	작업
	담당
	W10
	4.1 공통 프롬프트 빌더 (Tech Spec §4.1 4-Part Template)
	AI
	W10
	4.2 Zod 스키마 14개 정의 + 검증 재시도 루프
	AI
	W11
	4.3 모듈 #03 Sentiment (가장 기초, 먼저 구현하여 파이프라인 검증)
	AI
	W11
	4.4 모듈 #01 Macro View + #02 Segmentation
	AI
	W12
	4.5 모듈 #05 Risk Map + #06 Opportunity + #07 Strategy
	AI
	W13
	4.6 모듈 #08 Summary + #09 Preference (편향 보정, Tech Spec §2.7)
	AI
	W14
	4.7 모듈 #11 Crisis + #12 Success Sim
	AI
	W14
	4.8 모듈 #13 Integrated Report (12개 결과 종합)
	AI
	W15
	4.9 카테고리 A 참조 통합 (competitors, bestsellers, fx_rates 경유 Redis)
	AI
	W15
	4.10 환각 방지 후처리 (raw_posts 교차 검증, confidence=low 배지)
	AI
	


완료 기준
	① 임의 키워드 1건 → 14모듈 파이프라인 end-to-end 완주
② Zod 검증 통과율 > 95%
③ 동일 입력 3회 실행 시 모듈별 출력 편차 < 10% (재현성)
④ 평균 실행 시간 < 90분
	
의존성
	Phase 3 완료 (raw_posts 안정 공급)
	리스크
	LLM 출력 일관성 부족 → temperature 낮춤, 재시도 로직
비용 폭주 → 모듈별 토큰 상한선, llm_usage 일일 임계값 알림
	________________


3.6 Phase 5. KPI · 리포트 · PDF (W16~W19, 4주)


목표
	Tech Spec §2의 모든 KPI 공식을 구현하고, 통합 리포트를 PDF로 생성·S3 업로드하는 파이프라인을 완성한다.
	


작업
	담당
	주차
	5.1 리드 스코어 계산 서비스 (`calcLeadScore`) + 단위 테스트
	FSL
	W16
	5.2 예상 매출 집계 + fx_rates 환산
	FSL
	W16
	5.3 이메일 캠페인 지표 집계 쿼리 + Materialized View
	FSL
	W16
	5.4 에이전트 채택률 / WAU 집계 쿼리
	FSL
	W17
	5.5 LLM 비용 집계 대시보드 쿼리
	FSL
	W17
	5.6 리포트 렌더링 HTML (React, 13개 섹션, PDF 최적화 CSS)
	FE
	W17~W18
	5.7 Puppeteer 기반 PDF 생성 서비스 (별도 ECS 태스크)
	FSL
	W18
	5.8 S3 업로드 + signed URL 발급
	FSL
	W18
	5.9 시장 트렌드 리포트 (Research Agent, LLM 요약 구간)
	AI
	W19
	5.10 번역 품질 검토 리포트 (TA-03, BLEU + 용어집 대조)
	AI
	W19
	


완료 기준
	① 샘플 키워드 기반 PDF 리포트 1건 생성 (13섹션 완전 렌더링)
② 리드 스코어 계산 단위 테스트 커버리지 > 90%
③ PDF 평균 크기 < 5MB, 생성 시간 < 30초
	
의존성
	Phase 4 완료 (LLM 모듈 출력)
	________________


3.7 Phase 6. API · 대시보드 통합 (W18~W22, 5주, Phase 5와 일부 병렬)


목표
	고객·운영자 대시보드 UI와 전체 API 엔드포인트(Tech Spec §5)를 완성한다.
	


작업
	담당
	주차
	6.1 고객 API 전체 (15개 엔드포인트, JWT 미들웨어)
	FSL
	W18~W19
	6.2 운영자 API 전체 (SSO + IP 화이트리스트)
	FSL
	W19~W20
	6.3 실시간 에러 SSE 스트림 (`/admin/errors/stream`)
	FSL
	W20
	6.4 고객 대시보드 KPI 패널 (React)
	FE
	W19~W20
	6.5 바이어 파이프라인 UI (드래그 앤 드롭 단계 변경)
	FE
	W20~W21
	6.6 SignalCraft 실행 패널 + 진행률 폴링 UI
	FE
	W21
	6.7 리포트 뷰어 (13섹션, PDF 다운로드 버튼)
	FE
	W21~W22
	6.8 운영자 대시보드 (시스템 헬스, 큐 상태, 크롤러 상태, LLM 사용량)
	FE
	W21~W22
	6.9 i18n 기본 골격 (한/영 2개 로캘부터)
	FE
	W22
	


완료 기준
	① 고객 계정 생성 → 로그인 → SignalCraft 실행 → 리포트 열람 → PDF 다운로드 end-to-end
② 운영자 대시보드에서 모든 Prometheus 메트릭 시각화
③ Lighthouse 접근성 스코어 > 85
	
의존성
	Phase 5 (리포트) 완료 시 리포트 뷰어 작업 가능
	________________


3.8 Phase 7. 관측성·장애 대응 (W22~W25, 4주)


목표
	운영 중 발생할 장애를 조기 감지·자동 완화하는 체계를 구축한다.
	


작업
	담당
	주차
	7.1 Grafana 대시보드 `eduright-data-pipeline` (A/B 좌우 분리)
	FSL
	W22
	7.2 Slack 알림 통합 (#ops-alerts, #product-alerts, PagerDuty)
	FSL
	W22
	7.3 임계값 알림 룰 (Tech Spec §1.7 7개 지표)
	FSL
	W23
	7.4 카테고리 A 배치 DLQ 대응 플레이북 작성
	PM
	W23
	7.5 부하 테스트 (동시 SignalCraft 실행 10건, 카테고리 A 배치 전체 동시 실행)
	FSL
	W24
	7.6 에러 로그 Sentry 통합 + 주간 리뷰 템플릿
	FSL
	W24
	7.7 카오스 테스트 (네이버 차단, Redis 다운, RDS failover)
	FSL + PM
	W25
	


완료 기준
	① 의도적 장애 7종 주입 테스트 모두 자동 감지 + 알림 수신
② 부하 테스트에서 P95 < 500ms, 에러율 < 1%
③ DLQ 플레이북 기반 수동 재시도 시연 성공
	________________


3.9 Phase 8. MVP 릴리즈 준비 (W25~W28, 4주)


목표
	상용 출시에 필요한 보안·법무·사용자 수용 테스트를 완료하고, 프로덕션 환경으로 배포한다.
	


작업
	담당
	주차
	8.1 보안 감사 (OWASP Top 10, JWT 취약점, SQL injection)
	FSL
	W25
	8.2 법무 검토 완료 (OI-04 볼로냐 크롤링, 개인정보 처리)
	PM
	W25
	8.3 백업·복구 전략 (RDS 일 백업, Point-in-Time Recovery 테스트)
	FSL
	W26
	8.4 문서화 (사용자 매뉴얼, API 레퍼런스, 운영 런북)
	PM + FE
	W26
	8.5 사용자 수용 테스트 (UAT) — 파일럿 고객 2사
	PM
	W27
	8.6 성능 최적화 (느린 쿼리 튜닝, 인덱스 점검)
	FSL
	W27
	8.7 프로덕션 환경 프로비저닝 (AWS 프로덕션 계정 분리)
	FSL
	W27
	8.8 프로덕션 배포 + Smoke Test
	FSL
	W28
	8.9 런치 모니터링 (초기 72시간 온콜 대응)
	전원
	W28
	


완료 기준
	① 파일럿 고객 2사가 실제 워크플로우로 최소 1개 리포트 생성 성공
② 보안 감사 지적사항 0건 (High/Critical)
③ 프로덕션 URL에서 24시간 에러율 < 0.5%
	________________


4. 의존성 그래프


```
Phase 0 (셋업)
    │
    ▼
Phase 1 (데이터 기반)
    │
    ├─────────────┐
    ▼             ▼
Phase 2 (A배치)  Phase 3 (B수집)
    │             │
    │             ▼
    │         Phase 4 (LLM 14모듈)
    │             │
    │             ▼
    │         Phase 5 (KPI·리포트·PDF)
    │             │
    │             ▼
    └─────────▶ Phase 6 (API·대시보드)
                  │
                  ▼
              Phase 7 (관측성)
                  │
                  ▼
              Phase 8 (릴리즈)
```


병렬 실행 포인트
	Phase 2 ∥ Phase 3 (W06~W09)
Phase 5 후반 ∥ Phase 6 전반 (W18~W19)
	________________


5. 리스크 레지스터


ID
	리스크
	영향
	확률
	완화 전략
	R-01
	볼로냐 사이트 구조 변경 / 차단
	High
	Medium
	Exhibitor API fallback, HTML diff 감지 조기 경보
	R-02
	네이버 cbox API 변경
	High
	High
	Playwright fallback 우선 구현
	R-03
	LLM 비용 폭주 (14모듈 × 다수 테넌트)
	High
	Medium
	일일 토큰 상한, Redis 캐싱 강화, Gemini Flash 우선
	R-04
	법무 리뷰 지연 (OI-04)
	Critical
	Medium
	Phase 1 시작과 동시에 법무팀 의뢰, robots.txt 준수 명시
	R-05
	AI 엔지니어 이탈 (1인)
	Critical
	Low
	프롬프트·스키마 문서화 철저, 페어 리뷰 강제
	R-06
	Nielsen API 도입 결정 지연
	Medium
	High
	Open Library로 MVP 진행, M3 재검토
	R-07
	Puppeteer 메모리 누수 (PDF 생성)
	Medium
	Medium
	ECS 태스크 분리, 태스크당 100건 처리 후 재시작
	R-08
	파일럿 고객 확보 실패
	High
	Low
	영업팀 W20부터 UAT 고객 섭외 시작
	________________


6. 마일스톤 및 게이트


게이트
	주차
	게이트 기준
	결정권자
	G1. Foundation Ready
	W05 말
	Phase 0~1 완료, staging 안정
	FSL
	G2. Data Pipelines Live
	W10 말
	카테고리 A 7개 + 카테고리 B 5개 수집 안정
	FSL + PM
	G3. LLM Analysis Working
	W15 말
	14모듈 end-to-end 성공, 재현성 검증
	AI + FSL
	G4. MVP Feature Complete
	W22 말
	모든 API + UI 완성, 샘플 리포트 생성 가능
	FSL + FE
	G5. Production Ready
	W25 말
	관측성·부하 테스트·DLQ 플레이북 완료
	FSL + PM
	G6. Launch
	W28 말
	파일럿 UAT 성공, 프로덕션 배포 완료
	전원 + 경영진
	


각 게이트는 PASS/FAIL 회의로 판정. FAIL 시 최대 1주 지연 허용, 2주 이상 지연 시 스코프 재조정.
________________


7. 스코프 축소 우선순위 (일정 지연 시)


MVP 일정 리스크 발생 시 아래 순서로 스코프를 축소한다.


우선순위
	축소 항목
	사유
	1
	카테고리 A 중 bestsellers (Amazon/교보문고)
	리포트 생성에 필수 아님, Nice-to-have
	2
	다국어 i18n (영어만 유지)
	2026 4분기 배포 대상은 국내 우선
	3
	운영자 대시보드 상세 SSE 스트림
	Sentry 웹 UI로 대체 가능
	4
	TA-03 번역 품질 검토 리포트
	번역 기능 자체는 유지하되 품질 검토 리포트는 v1.1로 이월
	5
	카테고리 A 중 rights_deals
	Research Agent 참고 데이터, 없어도 리포트 생성 가능
	


축소 불가 (Non-negotiable)
	buyers, fx_rates, market_trends, competitors (카테고리 A) / 5개 매체 전체 (카테고리 B) / 14모듈 중 #01~#08, #13 (9개)
	________________


8. 주간 운영 규칙


주간 스탠드업
	월·수·금 09:30, 15분
	스프린트 리뷰
	격주 금 16:00, 45분 (2주 스프린트)
	코드 리뷰 SLA
	PR 제출 후 24시간 내 리뷰 1건 필수
	장애 대응
	Slack #ops-alerts 알림은 30분 내 응답, PagerDuty는 10분 내
	문서 업데이트
	Tech Spec 변경 시 해당 PR에 문서 diff 포함 필수
	________________


9. 변경 이력


버전
	날짜
	변경 내용
	작성자
	v1.0
	2026-04-11
	초안 작성 — 8개 Phase 구조, 리스크 레지스터, 게이트 6개 정의
	개발팀
	________________


— END OF DOCUMENT —
EduRights AI Implementation Plan v1.0  ·  INTERNAL
INTERNAL  ·  EduRights AI Implementation Plan  ·   /
