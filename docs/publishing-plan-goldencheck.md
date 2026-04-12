EduRights AI · Publishing Plan · goldencheck.kr
================================================

문서 버전: v0.1 (초안)
작성일: 2026-04-12
대상: 현재 Railway(`mktg-agent-production.up.railway.app`)에 배포된 EduRights AI 플랫폼을 `www.goldencheck.kr` 커스텀 도메인으로 퍼블리싱
분류: 내부용 (INTERNAL)

## 0. 확인 필요 (먼저 결정해야 할 3가지)

| # | 질문 | 이유 |
|---|---|---|
| Q1 | **`goldencheck.kr`은 이미 소유한 도메인인가?** (WHOIS 등록자 확인) | 미등록이면 등록부터 (KR 도메인은 Gabia/후이즈, ~29,000원/년) |
| Q2 | **상품 브랜딩을 "EduRights"에서 "GoldenCheck"로 변경하는가?** | UI 카피, 리포트 제목, 이메일 템플릿, PRD 전체 영향 |
| Q3 | **apex(goldencheck.kr)와 `www`는 어떻게 처리?** | apex → www 리디렉트(권장) 또는 둘 다 제공 |

기본 가정: **Q1=Yes, Q2=UI만 리브랜딩, Q3=www로 리디렉트**. 다르면 아래 계획을 조정.

## 1. 단계별 로드맵 (5단계, 총 소요 ~8시간 작업 + 24-48시간 DNS 전파)

### Stage 1 — 도메인 + Railway 커스텀 도메인 연결 (30분)
1. `goldencheck.kr` DNS 관리 패널 접근 권한 확보 (레지스트라 계정)
2. Railway Dashboard → Project `brave-joy` → Service `MKTG-Agent` → **Settings → Networking → Custom Domain → Add** → `www.goldencheck.kr` 입력
3. Railway가 제시하는 CNAME 타겟 복사 (예: `xyz.up.railway.app`)
4. DNS 레코드 추가:
   - `www.goldencheck.kr` → `CNAME` → Railway 타겟
   - `goldencheck.kr` (apex) → `ALIAS/ANAME` 또는 Cloudflare Proxy redirect (KR 레지스트라가 apex CNAME 미지원이면 Cloudflare nameserver로 위임 후 301 redirect rule 사용 권장)
5. Railway가 자동으로 Let's Encrypt 인증서 발급 (보통 1-5분)

### Stage 2 — 환경 변수 경화 (1시간)
프로덕션 비밀 값을 Railway Variables에 업데이트. 현재 dev-fixture로 대체된 항목을 실제 키로 교체.

| 변수 | 현재 | 퍼블리싱 시 |
|---|---|---|
| `ADMIN_USER` | `admin` | 변경 없음 |
| `ADMIN_PASS` | 임시 랜덤 48자 | **견고한 새 값으로 재발급** |
| `ANTHROPIC_API_KEY` | 없음 (dev-fixture 자동 활성화) | **실 키 등록** → dev-fixture 자동 비활성화 |
| `GOOGLE_AI_KEY` | 없음 | 선택 (Gemini 사용 시) |
| `SENTRY_DSN` | 없음 | **Sentry 프로젝트 생성 후 DSN 등록** |
| `RELEASE_SHA` | 없음 | GitHub Actions에서 `${{ github.sha }}` 주입 |
| `NODE_ENV` | production | 변경 없음 |
| `PUBLIC_BASE_URL` (신규) | — | `https://www.goldencheck.kr` |

**필수 코드 추가** (30분):
- `apps/api/src/index.ts`: CORS 미들웨어 추가 (origin whitelist = `PUBLIC_BASE_URL`)
- `apps/api/src/index.ts`: `helmet`으로 보안 헤더(`X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport-Security`)
- `apps/web/src/api.ts`: fetch URL을 상대 경로 유지(이미 그러함 — 변경 없음)

### Stage 3 — 브랜딩 리브랜딩 (Q2=Yes일 때, 2시간)
- `apps/web/index.html` `<title>` → "GoldenCheck — AI Marketing Agent"
- `apps/web/src/App.tsx` 헤더 제목, 배지
- `apps/api/src/reports/render-html.ts` 리포트 헤더 + `<title>` + "EduRights AI" 문자열
- `apps/api/src/llm/providers/dev-fixture.ts` 고정 문구
- `docs/*.md`는 v1.1로 메모(우선순위 낮음)
- 로고 에셋(SVG) — 있으면 `apps/web/public/logo.svg`

### Stage 4 — 법적/컴플라이언스 페이지 (3시간)
한국 도메인 + B2B SaaS 기준 필수:
1. **이용약관**(`/terms`) — 기본 서비스 이용 계약
2. **개인정보처리방침**(`/privacy`) — KISA 가이드 준수, 수집 항목·보관 기간·DPO 연락처
3. **쿠키 배너** — 선택(B2B 대시보드는 필수는 아니나 EU 고객 고려 시 추가)
4. **사업자 정보 노출**(`/about` 푸터) — 정보통신망법상 사업자명, 주소, 연락처
5. **문의 이메일** — `contact@goldencheck.kr` MX 설정

구현:
- `apps/api/src/routes/legal.ts` → `GET /terms`, `GET /privacy` 정적 HTML 제공
- 또는 `apps/web/src/pages/Legal.tsx` 추가 (React 라우터 도입 시)

### Stage 5 — 프리런치 체크리스트 + 모니터링 (2시간)
#### 프리런치 체크리스트 (모두 통과해야 DNS 컷오버)
- [ ] `curl https://www.goldencheck.kr/health` → 200
- [ ] `curl https://www.goldencheck.kr/` → React SPA
- [ ] `curl https://www.goldencheck.kr/api/v1/dashboard/kpis?tenantId=...` → 200
- [ ] `POST /api/v1/signalcraft/run` → 202 (real LLM key로 end-to-end)
- [ ] `/metrics` → Grafana Cloud scrape 활성화 후 30분 내 데이터 도착
- [ ] Sentry에 테스트 에러 1건 도착 확인
- [ ] 부하 테스트: `BASE_URL=https://www.goldencheck.kr pnpm exec tsx src/cli/load-test.ts 10` → 통과
- [ ] SSL 등급 A 이상 ([ssllabs.com](https://www.ssllabs.com))
- [ ] 보안 헤더 등급 A ([securityheaders.com](https://securityheaders.com))
- [ ] 법적 페이지 2개 렌더링 확인
- [ ] 이메일 webhook DNS (Resend/SendGrid SPF + DKIM + DMARC)

#### Grafana Cloud 스크래핑 등록
```yaml
# Grafana Cloud Agent scrape config
scrape_configs:
  - job_name: eduright-api
    metrics_path: /metrics
    scheme: https
    static_configs:
      - targets: ['www.goldencheck.kr']
    scrape_interval: 30s
```

#### 알림 룰 활성화
`docs/dlq-playbook.md §7`의 7개 룰을 Grafana Alerting에 등록. 채널: Slack `#ops-alerts`.

## 2. 롤아웃 전략

**옵션 A — 빅뱅 (권장)**: Stage 1-5 완료 후 DNS 즉시 전환. 소프트 런치 + smoke test만 단일 창에.
**옵션 B — 블루/그린**: 별도 Railway 환경(`production-goldencheck`)을 복제 후 도메인만 전환. 롤백 30초.

MVP 스케일에서는 **옵션 A**로 충분. 재해 복구는 Railway의 기본 롤백(이전 이미지)으로 해결.

## 3. 위험 및 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| DNS 전파 지연 (~48h) | 일부 사용자 구 URL 접속 | Railway URL은 유지, 구 도메인에 301 redirect |
| Let's Encrypt 발급 실패 | HTTPS 404 | Cloudflare Universal SSL로 fallback |
| dev-fixture가 비활성화 안 됨 | 리포트에 placeholder 출력 | 배포 후 smoke test에서 real API 응답 확인 |
| ADMIN_PASS 유출 | /admin/* 전체 노출 | 등록 즉시 강제 로테이션, `openssl rand -hex 24` |
| Google Search 색인 시점 | SEO 영향 | Stage 5에서 `robots.txt` + sitemap.xml 제공 |
| 법무 검토 미완(OI-04) | 크롤러 법적 리스크 | **OI-04 해소 전에는 buyers:bologna 크롤러 비활성화 유지** |

## 4. 소요 및 비용

| 항목 | 소요 시간 | 월 비용 |
|---|---|---|
| 작업 (Stages 1-5) | ~8시간 (1 developer day) | — |
| DNS 전파 대기 | 24-48시간 | — |
| `.kr` 도메인 등록 | — | ₩29,000/년 |
| Railway Hobby (현행) | — | $5-20 |
| Sentry Developer | — | $0 (무료 티어) |
| Grafana Cloud Free | — | $0 |
| Cloudflare Free Plan | — | $0 |
| **총합 (월)** | | **$5-20 + ₩2,400** |

## 5. Go/No-Go 체크 (Stage 5 완료 시)

| 항목 | 기준 |
|---|---|
| Smoke test 통과율 | 100% (11개 체크 모두 통과) |
| 부하 테스트 acceptance | P95 < 500ms, 에러율 < 1% |
| 법적 페이지 | 이용약관 + 개인정보처리방침 게시 |
| 모니터링 | Sentry + Grafana 활성화 + 알림 테스트 1건 |
| 롤백 계획 | Railway 이전 이미지로 < 5분 내 복구 가능 |

**모두 GREEN이면 런치**. 하나라도 RED면 해당 Stage로 복귀.

## 6. 런치 후 72시간 모니터링

- T+1h: `/health`, `/metrics` 연속 확인, 첫 SignalCraft 잡 수동 실행
- T+6h: Sentry 인시던트 수, Grafana 대시보드 지표 확인
- T+24h: 24시간 summary 자동 리포트 (크론 `0 9 * * *`로 운영자 overview 스냅샷 Slack 전송)
- T+72h: 첫 postmortem(이슈 없으면 생략), 프로덕션 안정 판정

## 변경 이력

| 버전 | 날짜 | 변경 |
|---|---|---|
| v0.1 | 2026-04-12 | 초안 — 6 Stage 로드맵, 체크리스트, 위험 레지스터 |
