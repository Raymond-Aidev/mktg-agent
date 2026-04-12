GoldenCheck · Launch Runbook
=============================

대상: Raymond (운영자)
목적: `www.goldencheck.kr`로 퍼블리싱하기 위해 Railway 대시보드 + DNS + 외부 계정에서 직접 수행해야 할 단계를 순서대로 나열한 절차서.
연관 문서: `docs/publishing-plan-goldencheck.md` (상위 계획)
상태: Phase 7 W22 코드 경화 완료 시점 기준 (cors + helmet + env 확장 + 브랜딩 교체 이미 main에 push됨)

---

## Step 1 — Railway Variables 업데이트 (5분)

Railway Dashboard → Project `brave-joy` → Service `MKTG-Agent` → Variables 탭에서 다음을 설정:

```
PUBLIC_BASE_URL       = https://www.goldencheck.kr
ALLOWED_ORIGINS       = https://www.goldencheck.kr,https://goldencheck.kr
ADMIN_USER            = admin
ADMIN_PASS            = <openssl rand -hex 32 로 새 값 생성 후 붙여넣기>
SENTRY_DSN            = (Step 4에서 발급 후 입력)
RELEASE_SHA           = (선택) GitHub Actions에서 주입 예정
```

**주의**: `ADMIN_PASS`는 현재 세션에서 사용 중이던 임시 값을 반드시 로테이션 — 로컬/Slack/문서 어디에도 이전 값 남기지 말 것.

---

## Step 2 — Railway 커스텀 도메인 연결 (10분)

1. Railway Dashboard → Service `MKTG-Agent` → **Settings → Networking** → `Custom Domain` 섹션
2. `+ Custom Domain` 클릭 → `www.goldencheck.kr` 입력 → `Add Domain`
3. Railway가 CNAME 타겟을 제시 (예: `xyz123.up.railway.app`) — **복사해둔다**
4. 같은 방식으로 `goldencheck.kr` (apex)도 추가 → 두 번째 CNAME 타겟 확보

> Railway는 `goldencheck.kr` apex에 대해 ALIAS/ANAME을 권장. KR 레지스트라가 이를 지원하지 않으면 Step 3의 Cloudflare 옵션 사용.

---

## Step 3 — DNS 레코드 설정 (5분 + 전파 24-48h)

### 옵션 A: Cloudflare (권장 — apex CNAME flattening 지원)

1. https://dash.cloudflare.com 에서 `goldencheck.kr` 사이트 추가 (Free plan)
2. Cloudflare가 제시하는 2개 nameserver를 레지스트라(가비아/후이즈)의 도메인 관리에 등록
3. Cloudflare DNS 설정:

   | Type | Name | Target | Proxy |
   |---|---|---|---|
   | CNAME | www | `xyz123.up.railway.app` (Railway 제시값) | DNS only |
   | CNAME | @ | `(apex용 Railway 제시값)` | DNS only |

4. Cloudflare → SSL/TLS 모드 `Full (strict)` 확인 (Railway가 Let's Encrypt 발급)
5. (선택) Cloudflare → Rules → Redirect Rules에 `goldencheck.kr/*` → `https://www.goldencheck.kr/$1` 301 리디렉트 추가

### 옵션 B: 레지스트라 직접 설정

| Type | Host | Value | TTL |
|---|---|---|---|
| CNAME | www | Railway 제시 타겟 | 300 |
| CNAME | @ | Railway 제시 타겟 (지원 시) | 300 |

**확인**:
```
dig www.goldencheck.kr CNAME +short
dig goldencheck.kr +short
curl -I https://www.goldencheck.kr/health
```
5분~48시간 내 전파되면 Railway가 자동으로 Let's Encrypt 인증서를 발급한다.

---

## Step 4 — Sentry 프로젝트 생성 (5분)

1. https://sentry.io 에서 Organization → `+ Create Project`
2. Platform: **Node.js**
3. Project name: `goldencheck-api`
4. Alert Frequency: `Default`
5. 생성 후 제공된 DSN 복사 (형태: `https://<key>@o<org>.ingest.sentry.io/<project>`)
6. Step 1에서 `SENTRY_DSN` 변수에 붙여넣기 (Railway Variables)
7. Sentry에서 Slack integration 연결: Settings → Integrations → Slack → `#ops-alerts` 채널 권한 부여

**검증**:
```bash
# Railway 서비스에 테스트 에러 1건 강제 발생
curl -X POST https://www.goldencheck.kr/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{"bad":"payload"}'
# → 400 응답 (정상). Sentry로 흘러가는 것은 500 이상만.
# 진짜 테스트는 Step 5 이후 부하 테스트로.
```

---

## Step 5 — Grafana Cloud 스크래핑 등록 (10분)

1. https://grafana.com 무료 티어 가입 → Stack 생성 → `goldencheck`
2. Cloud Portal → Connections → `Hosted Prometheus` → **Publish your own metrics**
3. `Agent Config`의 `remote_write` URL + username + API key를 저장
4. 메트릭 스크래핑 대상 등록:
   ```yaml
   # Grafana Cloud Agent UI 또는 prometheus.yml
   scrape_configs:
     - job_name: goldencheck-api
       metrics_path: /metrics
       scheme: https
       static_configs:
         - targets: ['www.goldencheck.kr']
       scrape_interval: 30s
   ```
5. Grafana Dashboards → `+ New` → Phase 7 시작 지표 import:
   - `eduright_http_request_duration_seconds_bucket`
   - `eduright_queue_{waiting,active,failed}_jobs`
   - `eduright_nodejs_heap_size_used_bytes`
   - `eduright_process_cpu_user_seconds_total`

(메트릭 이름은 prefix `eduright_` 유지됨 — 브랜드만 바뀌었고 prom-client registry prefix는 호환성 위해 그대로. 향후 리네임 시 마이그레이션 필요.)

---

## Step 6 — Anthropic API 키 등록 (3분)

1. https://console.anthropic.com → API Keys → `Create Key` (name: `goldencheck-production`)
2. Step 1의 `ANTHROPIC_API_KEY` 변수에 붙여넣기
3. Railway 재배포 후 로그 확인:
   ```
   [goldencheck-api] dev-fixture LLM providers registered (no real keys)  ← 이 줄이 사라져야 함
   ```
4. **주의**: `apps/api/src/llm/providers/anthropic.ts` 실제 SDK 통합 코드가 아직 없음. 현재는 `client.ts`의 stub이 throw한다. 다음 작업으로 `@anthropic-ai/sdk` 통합 코드 추가 필요.

**임시 우회**: Anthropic SDK 통합 전까지는 `ANTHROPIC_API_KEY`를 비워두고 dev-fixture를 계속 사용.

---

## Step 7 — 프리런치 Smoke Test (15분)

Step 1~6 완료 후 `www.goldencheck.kr`가 응답하면 다음 체크리스트 전부 통과해야 런치.

```bash
BASE=https://www.goldencheck.kr

# 1. 기본 엔드포인트
curl -s $BASE/api | jq .
curl -s $BASE/health | jq .health
curl -s -o /dev/null -w "%{http_code}\n" $BASE/     # SPA
curl -s -o /dev/null -w "%{http_code}\n" $BASE/metrics

# 2. 보안 헤더
curl -s -D - -o /dev/null $BASE/api | grep -iE "^(strict-transport|content-security|x-frame|x-content-type)"

# 3. SSL 등급
# https://www.ssllabs.com/ssltest/analyze.html?d=www.goldencheck.kr
# 목표: A 이상

# 4. 보안 헤더 등급
# https://securityheaders.com/?q=www.goldencheck.kr
# 목표: A 이상

# 5. CORS
curl -o /dev/null -w "%{http_code}\n" -X OPTIONS \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: GET" \
  $BASE/api/v1/dashboard/kpis
# 목표: 4xx/5xx (거부)

# 6. Admin 보호
curl -s -o /dev/null -w "%{http_code}\n" $BASE/admin/operator/overview
# 목표: 401

# 7. 부하 테스트
BASE_URL=$BASE pnpm --filter @eduright/api exec tsx src/cli/load-test.ts 10 "children books"
# 목표: P95 < 500ms, 에러율 < 1% (PASS)

# 8. SignalCraft end-to-end
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"tenantId":"00000000-0000-0000-0000-000000000001","keyword":"launch smoke"}' \
  $BASE/api/v1/signalcraft/run
# → jobId 반환 → 2초 후 /jobs/:id로 status=done + reportId 확인
```

---

## Step 8 — 법적 페이지 (별도 PR 필요)

이 런북 범위 밖. Phase 8 릴리즈 준비 작업으로 분리:
- 이용약관 (`/terms`)
- 개인정보처리방침 (`/privacy`)
- 사업자 정보 (`/about`)
- `contact@goldencheck.kr` MX + SPF + DKIM + DMARC

현재 상태: **해당 라우트 없음**. 런치 전 최소한 정적 HTML 2개(`/terms`, `/privacy`)는 추가 필요.

---

## Step 9 — 런치 후 72시간 모니터링

`docs/dlq-playbook.md` §7 알림 룰 참조. 다음 체크포인트:

- **T+1h**: `/health`, `/metrics`, 첫 SignalCraft 잡 수동 실행
- **T+6h**: Sentry 인시던트 0건 확인, Grafana 지표 정상 범위
- **T+24h**: `/admin/operator/overview` 스냅샷을 Slack에 수동 포스트
- **T+72h**: 안정화 판정, 이 런북을 `DONE` 상태로 마크

---

## 롤백 절차 (문제 발생 시)

1. Railway Dashboard → Service `MKTG-Agent` → **Deployments** 탭
2. 마지막으로 녹색으로 성공한 deployment → **Redeploy** 또는 **Rollback**
3. 소요: ~2분. 트래픽은 헬스체크 통과 시 자동 전환.
4. 도메인 이슈면 Cloudflare에서 일시적으로 기존 Railway 도메인으로 redirect.

---

## 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| v0.1 | 2026-04-12 | 초안 — Phase 7 W22 코드 경화 완료 시점 기준 9-step runbook |
