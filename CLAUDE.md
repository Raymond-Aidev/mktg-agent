# EduRights AI — Marketing Agent Platform

## 프로젝트 요약
교육 콘텐츠·아동 도서 출판사를 위한 자동화 마케팅 플랫폼.
5개 AI 에이전트(Research · Marketing · Translation · CRM · Analytics) + 14모듈 SignalCraft 여론 분석 파이프라인.
MVP 목표: 2026년 10월 (볼로냐 북페어 시즌 대비).

## 레포 구조
- `apps/api` — Express + BullMQ API 서버
- `apps/web` — React 대시보드 (Vite)
- `apps/workers` — BullMQ 워커 (queue:batch + queue:signalcraft)
- `packages/shared` — 공통 타입·Zod 스키마·유틸
- `packages/crawlers` — 카테고리 A/B 크롤러 모듈
- `db/migrations` — Postgres 마이그레이션 (번호 체계 엄격 관리)
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
Phase 6 — W18 — React 대시보드 (Vite · KPI 패널 · 첫 사용자 UI)

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
- Express, React 18 + Vite, Chart.js, Puppeteer
- Sentry (에러 추적), Grafana Cloud (무료 티어, 메트릭/로그)

## 인프라 (Railway 기반)
- **호스팅**: Railway — API / workers / web 서비스, GitHub 연동 자동 배포
- **DB**: Railway Postgres 플러그인 (15)
- **Cache/Queue**: Railway Redis 플러그인 (BullMQ 백엔드)
- **Object storage**: Cloudflare R2 (S3 호환, PDF/아카이브 저장) — Railway에 오브젝트 스토리지 없음
- **Secrets**: Railway Variables (환경변수 암호화 저장)
- **IaC**: `railway.json` + Railway CLI (Terraform 불필요)
- **CI/CD**: GitHub push → Railway 자동 빌드·배포 (GitHub Actions는 lint/test만)
- **환경 분리**: Railway Environments (staging / production)

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
