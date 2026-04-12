# GoldenCheck — AI Marketing Agent Platform

SignalCraft 여론 분석 파이프라인과 카테고리 A 배치 크롤러, LLM 14모듈 분석, 통합 리포트 HTML/PDF,
React 대시보드, Prometheus 관측성을 포함한 B2B AI 마케팅 플랫폼.

- **프로덕션**: https://www.goldencheck.kr (Railway)
- **문서**: `docs/` (PRD · Technical Spec · Implementation Plan · Prompt Playbook · DLQ Playbook · Publishing Plan)
- **인프라**: Railway (API + Postgres + Redis), Grafana Cloud (metrics), Sentry (errors)

## 주요 경로

- `apps/api` — Express + BullMQ + LLM wrapper + routes
- `apps/web` — Vite + React 18 + KPI / SignalCraft / Buyers / Operator 패널
- `apps/workers` — BullMQ 워커 (queue:batch + queue:signalcraft) — Phase 1에서는 API 프로세스에 내장
- `packages/shared` — 공통 타입/유틸
- `packages/crawlers` — 카테고리 A/B 크롤러 모듈
- `db/migrations` — Postgres 마이그레이션 (0001 ~ 0008)

## 로컬 개발

```
pnpm install
pnpm build:web
pnpm start       # API (serves React dist from apps/web/dist)
```

개발 모드 (API + Vite 프록시 동시 기동):

```
pnpm dev:api     # :8080
pnpm dev:web     # :5173 (proxies /api → :8080)
```

## 라이선스

내부용 (Internal), 2026 GoldenCheck.
