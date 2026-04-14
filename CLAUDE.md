# GoldenCheck — AI Marketing Agent Platform

## 프로젝트 요약
교육 콘텐츠·아동 도서 출판사를 위한 자동화 마케팅 플랫폼.
5개 AI 에이전트(Research · Marketing · Translation · CRM · Analytics) + 14모듈 SignalCraft 여론 분석 파이프라인.
공개 브랜드: **GoldenCheck** (www.goldencheck.kr)
내부 코드네임: MKTGagent · 초기 제품명: EduRights AI (docs/PRD_v1.0.md는 historical)
MVP 목표: 2026년 10월 (볼로냐 북페어 시즌 대비).

## 레포 구조
- `apps/api` — Express + BullMQ API 서버 (18개 라우트, JWT 인증, admin API)
- `apps/web` — React SPA (Vite) — 랜딩 페이지, 제품/키워드 포트폴리오, 분석 리포트, 어드민 패널
- `apps/workers` — BullMQ 워커 (queue:batch + queue:signalcraft)
- `packages/shared` — 공통 타입·Zod 스키마·유틸
- `packages/crawlers` — 카테고리 A/B 크롤러 모듈
- `db/migrations` — Postgres 마이그레이션 (0001~0012, 번호 체계 엄격 관리)
- `docs/` — PRD, Technical Spec, Implementation Plan, Prompt Playbook
- `.claude/` — hooks, agents, settings (Claude Code 프로젝트 설정)

## 핵심 원칙 (위반 금지)
1. **데이터 카테고리 분리** — 카테고리 A(상시 배치) / 카테고리 B(온디맨드)를 엄격히 분리
2. **쓰기 방향 제한** — 카테고리 B → A 쓰기 금지. DB 롤 레벨에서 강제(`signalcraft_worker`는 A 테이블에 SELECT만)
3. **공통 컬럼 규약** — 카테고리 A 마스터 테이블은 반드시 `source_uid`, `fingerprint`, `last_seen_at`, `updated_at`, `is_stale` 포함
4. **BullMQ 큐 분리** — `queue:batch`(카테고리 A) / `queue:signalcraft`(카테고리 B) 완전 분리
5. **LLM 호출 기록** — 모든 LLM 호출은 `llm_usage` 테이블에 `tenant_id`와 함께 기록
6. **환각 방지** — 모든 프롬프트는 "실제 수집된 데이터만 인용, 없는 사실 생성 금지" 문구 포함, Zod 스키마 검증 필수

## 현재 Phase
Phase 7 — W22 — 관측성 (Prometheus /metrics · Sentry · 부하 테스트 · DLQ 플레이북)

## 구현 완료 현황 (2026-04-14 기준)

### DB 스키마 (12 마이그레이션)
- 0001 extensions · 0002 master tables (buyers/competitors/market_trends/fx_rates/rights_deals/bestsellers)
- 0003 signalcraft (jobs/raw_posts/reports) · 0004 events+ops · 0005 llm_usage · 0006 roles
- 0007 master triggers · 0008 module_outputs · 0009 actions · 0010 campaigns · 0011 users · 0012 products

### 인증 시스템
- JWT 기반 인증 (bcryptjs + jsonwebtoken)
- 회원가입 (POST /api/v1/auth/register) — 자동 tenant 발급
- 로그인 (POST /api/v1/auth/login) — JWT 7일 만료
- authMiddleware 전역 적용, role 기반 접근 제어 (admin/owner/member)
- 어드민 계정: benedium@gmail.com (role: admin)

### API 라우트 (19개)
- 인증: auth (register/login/me)
- 대시보드: dashboard, dashboard-v2, channels, competitors-v2
- SignalCraft: signalcraft (run/jobs), reports, actions
- 데이터: buyers, campaigns, products (CRUD + keywords)
- 어드민: admin-users (회원 관리/통계), admin-batch, operator
- 기타: events, email-webhook, metrics, legal (terms/privacy/about/pricing)

### 프론트엔드 (React SPA, 21개 컴포넌트)
- 랜딩 페이지: 히어로, 기능 소개, 분석 샘플 (iframe), 3단계 요금제, FAQ, 로그인/회원가입 모달
- 글로벌 네비게이션: sticky 상단 바, 대시보드/분석 샘플/설정/관리자, 사용자명, 로그아웃
- 제품/키워드 포트폴리오: 3단계 드릴다운 (제품 목록 → 키워드 테이블 → 분석 리포트)
- 제품 CRUD: API 연동 추가/삭제 + 데모 제품 병렬 표시
- 분석 리포트: 시각화 (도넛 차트, SOV 바, 포지셔닝 맵, 콘텐츠 갭, 리스크 시그널, 타임라인)
- 분석 샘플: 랜딩 페이지 + 로그인 후 탭에서 "어린이AI 지휘자" 리포트 표시
- 어드민 패널: 시스템 통계 7개, 회원 목록/생성/권한 변경/삭제
- 디자인: FlareLane 스타일 (인디고 블루 #4F46E5, 순백 배경, Inter 폰트)

### LLM 모듈 (6개 구현)
- #01 Macro View · #03 Sentiment · #06 Market Intelligence (SOV/포지셔닝/콘텐츠갭/리스크)
- #07 Strategy · #08 Summary · #13 Integrated Report
- #06은 SWOT에서 Market Intelligence로 변경 (키워드 검색 데이터 기반 분석에 적합하도록)

### 크롤러 (7개)
- Category A: fx-rates, bestsellers, competitors, market-trends, rights-deals
- Category B: naver, hackernews

### 인프라
- Railway 호스팅 (API + Workers + Postgres + Redis)
- Sentry 에러 추적, Prometheus /metrics
- BullMQ 큐 분리 (batch/signalcraft), DB Role 강제 (getPoolForRole)
- railway.json: buildCommand로 web 빌드 포함
- 법적 문서 v1.0 (이용약관/개인정보처리방침/사업자정보/요금제)

### 시드/데모 데이터
- "어린이AI 지휘자" 제품 기준 시드 스크립트 (seed-signalcraft.ts)
- 15개 raw_posts, 6개 module outputs, 통합 리포트, 2개 actions
- 데모 제품 4개 x 키워드 4~6개 (프론트엔드 하드코딩)

## 팀 역할
- **FSL (풀스택 리드)**: 인프라·BullMQ·DB 스키마·API·배포·코드 리뷰
- **FE (프론트엔드)**: React 대시보드·Chart.js·PDF 렌더링 HTML·이벤트 트래커
- **AI (AI 엔지니어)**: 14모듈 프롬프트·Zod 스키마·LLM 클라이언트 래퍼·편향 보정
- **PM (데이터/QA)**: 카테고리 A 크롤러·법무 검토·QA·문서화

## 커밋 규칙
- Conventional Commits: `feat/fix/chore/docs/refactor/test(scope): subject`
- 마이그레이션 PR은 반드시 roll-back SQL 동반 (`*.rollback.sql`)
- `.env`, `*.env.local`, 이미 적용된 마이그레이션 파일은 절대 수정 금지 (hook으로 차단)
- `main` 브랜치 직접 커밋 금지, 모든 작업은 feature 브랜치에서 PR로 머지

## 기술 스택
- Node.js 22 LTS, pnpm 10, TypeScript 5.7+
- PostgreSQL 15, Redis 7, BullMQ, Playwright
- Express, React 18 + Vite, bcryptjs, jsonwebtoken
- Sentry (에러 추적), Prometheus (prom-client), Grafana Cloud

## 인프라 (Railway 기반)
- **호스팅**: Railway — API / workers / web 서비스, GitHub 연동 자동 배포
- **DB**: Railway Postgres 플러그인 (15)
- **Cache/Queue**: Railway Redis 플러그인 (BullMQ 백엔드)
- **Object storage**: Cloudflare R2 (S3 호환, PDF/아카이브 저장) — Railway에 오브젝트 스토리지 없음
- **Secrets**: Railway Variables (환경변수 암호화 저장)
- **IaC**: `railway.json` + Railway CLI (Terraform 불필요)
- **CI/CD**: GitHub push → Railway 자동 빌드·배포 (GitHub Actions는 lint/test만)
- **환경 분리**: Railway Environments (staging / production)
- **Railway CLI**: 로컬에 설치됨 (`railway` 명령 사용 가능)
  - `railway run <cmd>` — Railway 환경변수를 주입하여 로컬에서 명령 실행
  - DB Public Networking: `mainline.proxy.rlwy.net:40180` (user: postgres, db: railway)
  - 마이그레이션 실행: `PGPASSWORD=<pw> psql -h mainline.proxy.rlwy.net -p 40180 -U postgres -d railway -f db/migrations/<file>.sql`
  - `railway variables` — 환경변수 조회

## 문서 참조 (세션 시작 시 반드시 확인)
- `docs/PRD_v1.0.md` — 제품 요구사항
- `docs/Technical_Specification_v1.0.md` — 기술 명세 v1.1 (데이터 수집 아키텍처·KPI·리포트·프롬프트)
- `docs/Implementation_Plan_v1.0.md` — 28주 단계별 구현 계획
- `docs/Claude_Code_Prompt_Playbook_v1.0.md` — 작업 규칙과 프롬프트 패턴

## 작업 시 준수사항
- **파일 경로를 명시받지 못하면 먼저 docs를 참조**해서 정확한 위치를 판단할 것
- **추측 금지** — 수치·날짜·고유명사는 반드시 근거(파일/DB/git log)와 함께 인용
- **실패 시 멈추고 보고** — 부분 성공을 성공으로 보고하지 말 것
- **다른 Phase 영역을 건드리지 말 것** — 현재 Phase 범위를 벗어나면 사람에게 확인
- **안티패턴 금지** — `docs/Claude_Code_Prompt_Playbook_v1.0.md §8` 참조
