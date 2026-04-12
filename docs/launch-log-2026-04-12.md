GoldenCheck · Soft Launch Log
==============================

일시: 2026-04-12
담당: Raymond (benedium@gmail.com) + Claude
상태: **Soft Launch Complete** — `https://www.goldencheck.kr` 프로덕션 라이브
관련 문서: `docs/publishing-plan-goldencheck.md`, `docs/goldencheck-launch-runbook.md`, `docs/dlq-playbook.md`

---

## 요약

GoldenCheck AI Marketing Agent Platform이 2026-04-12부로 `https://www.goldencheck.kr`에서 공개 접근 가능한 상태로 전환되었습니다. Phase 0~7의 모든 코어 기능(데이터 파이프라인, LLM 분석 프레임워크, 대시보드, 관측성)이 프로덕션 환경에서 작동합니다.

## 런치 Gate 결과

docs/publishing-plan-goldencheck.md §5 Go/No-Go 기준:

| 기준 | 상태 | 세부 |
|---|---|---|
| Smoke test 통과 | ✅ | /api, /health, /, /assets, legal×3, metrics, CORS, HSTS |
| 부하 테스트 | ✅ | 10 동시성 100% 성공, 0 에러, 실질 P95 ~325ms (RTT 제외) |
| 법적 페이지 | ✅ | /terms, /privacy, /about v0.1 초안 게시 |
| 모니터링 | ✅ | Sentry 활성화 + smoke test event 수신 확인, Prometheus /metrics 공개 |
| 롤백 | ✅ | Railway Deployments 탭에서 이전 이미지 선택 가능 |

**결과: 5/5 GREEN → 런치 실행**

## 완료된 Launch Runbook Steps

| # | 작업 | 상세 |
|---|---|---|
| 1 | Railway Variables | `PUBLIC_BASE_URL`, `ALLOWED_ORIGINS`, `ADMIN_PASS` 로테이션, `SENTRY_DSN` |
| 2 | Railway 커스텀 도메인 | `www.goldencheck.kr` → `opxsrkt7.up.railway.app` CNAME 타겟 |
| 3 | DNS + SSL | YesNIC 네임서버 → Cloudflare, DNS zone `goldencheck.kr` 이관, Cloudflare Page Rule `goldencheck.kr/*` → 301 → `https://www.goldencheck.kr/$1`, Let's Encrypt 자동 발급 |
| 4 | Sentry | 프로젝트 `goldencheck-api` (Node.js), DSN 등록, `/admin/sentry-test` smoke endpoint → 실제 이벤트 수신 확인 |
| 7 | 부하 테스트 | `BASE_URL=https://www.goldencheck.kr load-test 10 "children books"` → 10/10 done, 0 failed |
| 8 | 법적 페이지 | `apps/api/src/routes/legal.ts` — /terms, /privacy, /about 서버 HTML 렌더 |

## 의도적 Skip

| Step | 이유 | 재개 조건 |
|---|---|---|
| 5 Grafana Cloud | 현재 트래픽 수준에서 Sentry만으로 충분 | DAU 10+ 또는 P95 이상 감지 필요 시 |
| 6 Anthropic SDK | API 키 미확보, dev-fixture 영구 유지 | Anthropic API 키 확보 시 30분 작업으로 전환 가능 |

## 발생한 이슈와 해결

### 1. Railway GitHub auto-deploy 정체
- **증상**: main 브랜치 push 후 Railway가 3개 커밋(`2975f4a`, `b41626f`, `6e900c4`)을 자동 배포하지 않음. webhook 지연 또는 auto-deploy 설정 이슈 추정.
- **해결**: `railway up --service MKTG-Agent --detach` 로컬 업로드 직접 배포. GitHub 경로 우회.
- **후속 조치**: Phase 8에서 Railway Settings → Source → Auto Deploy 상태 확인, GitHub webhook 로그 점검.

### 2. Cloudflare Workers/Pages 오해
- **증상**: 초기 Cloudflare 설정 시 Workers/Pages 빌드가 자동 트리거되어 `wrangler deploy` 실패 로그 발생.
- **해결**: Cloudflare는 DNS Zone만 사용, Workers/Pages 프로젝트 삭제. 호스팅은 Railway 전담.
- **교훈**: Cloudflare에 GitHub 연동은 DNS만 필요한 경우 절대 설정하지 말 것.

### 3. Railway TXT 검증 필수
- **증상**: Railway가 `www.goldencheck.kr`에 Let's Encrypt 발급 전 `_railway-verify.www` TXT 레코드 요구.
- **해결**: Cloudflare DNS에 TXT 수동 추가, Railway가 30초 내 감지.
- **기록**: TXT 값 `railway-verify=971535161a83ea322c66138dfa78d9e460f3072d5bf922db6b3cf66455e4a7e3`

## 프로덕션 엔드포인트 맵

| URL | 설명 | 보호 |
|---|---|---|
| `https://www.goldencheck.kr/` | React SPA 대시보드 | Public |
| `https://goldencheck.kr/` | apex → www 301 | Public |
| `https://www.goldencheck.kr/api` | API identity JSON | Public |
| `https://www.goldencheck.kr/health` | postgres/redis/queues 헬스 | Public |
| `https://www.goldencheck.kr/metrics` | Prometheus text format | Public (no secrets) |
| `https://www.goldencheck.kr/terms` | 이용약관 v0.1 | Public |
| `https://www.goldencheck.kr/privacy` | 개인정보처리방침 v0.1 | Public |
| `https://www.goldencheck.kr/about` | 사업자 정보 | Public |
| `/api/v1/events` | 이벤트 수집 (POST) | (JWT Phase 8) |
| `/api/v1/signalcraft/run` | SignalCraft 실행 | (JWT Phase 8) |
| `/api/v1/signalcraft/jobs/:id` | 진행률 폴링 | (JWT Phase 8) |
| `/api/v1/reports/:id` | 통합 리포트 JSON/HTML | (JWT Phase 8) |
| `/api/v1/dashboard/kpis` | 대시보드 KPI | (JWT Phase 8) |
| `/api/v1/buyers` | 바이어 목록 | (JWT Phase 8) |
| `/webhooks/email` | Resend webhook | (시그니처 검증 TODO) |
| `/admin/queues` | Bull Dashboard | Basic Auth |
| `/admin/batch/*` | 배치 스케줄/수동 실행 | Basic Auth |
| `/admin/operator/overview` | 운영자 overview | Basic Auth |
| `/admin/sentry-test` | Sentry 파이프 검증 | Basic Auth |

## Phase 7 완료 지표

- 보안 헤더: helmet 기본 세트 (CSP, HSTS, X-Frame-Options, Referrer-Policy, X-Content-Type-Options)
- CORS: `PUBLIC_BASE_URL` 기반 allowlist, 외부 origin 거부
- 에러 추적: Sentry `@sentry/node` 8.x, `SENTRY_DSN` 활성 시 자동 init, Express error handler → captureException
- 메트릭: prom-client 기반 `/metrics`, custom counters (http duration, queue depth, signalcraft jobs, llm calls)
- 부하 테스트: CLI 도구 `apps/api/src/cli/load-test.ts` 사용 가능
- DLQ 플레이북: `docs/dlq-playbook.md` 작성 완료

## 인프라 비용 (월 예상)

| 항목 | 비용 |
|---|---|
| Railway (Hobby/Pro) | $5-20 |
| Cloudflare DNS | $0 |
| Sentry Developer | $0 (5K errors, 10K performance/월) |
| `.kr` 도메인 | ₩2,400/월 (연 ₩29K) |
| LLM 호출 | $0 (dev-fixture, Anthropic 미통합) |
| **합계** | **~$5-20 + ₩2,400** |

## 런치 후 72시간 모니터링

`docs/goldencheck-launch-runbook.md §Step 9` 참조.

- [ ] T+1h: `/health`, `/metrics` 확인, 첫 SignalCraft 잡 수동 실행
- [ ] T+6h: Sentry 인시던트 0건 확인, 메트릭 정상 범위
- [ ] T+24h: 운영자 overview 스냅샷 기록
- [ ] T+72h: postmortem(이슈 있으면) 또는 안정화 판정

## 다음 세션 추천 작업

우선순위 순:

1. **실제 사용자 피드백**: 베타 사용자 1~2명 초대, SignalCraft 실행 + 리포트 확인 흐름 관찰
2. **JWT 인증 미들웨어**: Phase 6.1 남은 작업. 현재 고객 API는 tenantId를 body/query로 받음 — 토큰 기반으로 승격
3. **모듈 #02/#05/#06/#07 추가**: 통합 리포트 풍성화. #06 Opportunity는 카테고리 A 참조 첫 사례
4. **PRD/Tech Spec v1.1 개정**: 리브랜딩 반영, 구현 현황 동기화, OI-01~OI-06 상태 업데이트
5. **이메일 도메인(`contact@goldencheck.kr`)**: Cloudflare Email Routing 또는 Google Workspace
6. **법적 페이지 v1.0**: 법무 검토 후 placeholder 교체

## 감사합니다

이 런치는 Phase 0(repo scaffold)부터 Phase 7(관측성)까지 단 2 세션(2026-04-11, 2026-04-12)에 완료되었습니다. 총 27 커밋, 5개 카테고리 A 크롤러, 4개 LLM 분석 모듈, 5개 대시보드 패널, React SPA, Prometheus 메트릭, Sentry 통합, 부하 테스트, 법적 페이지가 프로덕션 환경에서 작동합니다.

— 2026-04-12, GoldenCheck 운영팀
