# GoldenCheck — Grafana Cloud Observability

Phase 7 W22 관측성 자산 (대시보드 JSON + 알림 룰 YAML + Slack contact point).

## 디렉토리 구조

```
grafana/
├── README.md                             ← 본 문서
├── dashboards/
│   └── goldencheck-overview.json         ← 통합 대시보드 (uid: eduright-data-pipeline)
├── alerts/
│   └── observability-rules.yaml          ← 7개 알림 룰 (Tech Spec §1.7)
└── contact-points.yaml                   ← Slack webhook + notification policy
```

## 전제조건

1. **Grafana Cloud 계정** (무료 티어 가능) — `docs/goldencheck-launch-runbook.md` §Step 5 절차로 등록
2. **Prometheus 스크래핑 등록** — `https://www.goldencheck.kr/metrics` 를 30초 간격으로 수집
3. **Slack Webhook** 2개 — `#ops-alerts`, `#product-alerts` (Slack App → Incoming Webhooks)

## 1. 대시보드 Import

1. Grafana UI → Dashboards → New → Import
2. `dashboards/goldencheck-overview.json` 업로드
3. `${datasource}` 변수에서 실제 Prometheus 데이터소스 선택 (기본: `grafanacloud-prom`)

구성 요약:

- **Category A row**: queue:batch 6개 stat + 2개 timeseries (DLQ moved rate, 큐 상태 추이)
- **Category B row**: queue:signalcraft 3개 stat + 2개 timeseries (잡 terminal rate, 큐 상태 추이)
- **LLM row**: eduright_llm_calls_total rate (모델+상태별)
- **System row**: HTTP p50/p95/p99 + status rate + heap + CPU + event loop p50/p99

## 2. 알림 룰 Provisioning

```bash
# Grafana Cloud UI:
# Alerting → Alert rules → Provisioning → Import YAML
# alerts/observability-rules.yaml 업로드
```

또는 Grafana CLI로:

```bash
grafana-cli alerting rules import grafana/alerts/observability-rules.yaml
```

7개 룰 (Tech Spec §1.7):

| UID                             | 조건                                               | severity | 채널    |
| ------------------------------- | -------------------------------------------------- | -------- | ------- |
| `dlq_high_batch`                | `eduright_dlq_size{queue="batch-dlq"} > 10` for 5m | critical | ops     |
| `source_failures`               | `eduright_circuit_breaker_state == 2` for 1m       | warning  | ops     |
| `queue_active_starvation_batch` | active=0 AND waiting>5 for 10m                     | critical | ops     |
| `signalcraft_long_run`          | signalcraft active>0 지속 3h                       | warning  | ops     |
| `llm_cost_spike`                | 1h 호출 rate > 3× 24h avg for 15m                  | warning  | product |
| `pg_unhealthy`                  | `up{job="goldencheck-api"} == 0` for 2m            | critical | ops     |
| `redis_unhealthy`               | `eventloop_lag_p99 > 1s` for 5m                    | critical | ops     |

## 3. Contact Point + Notification Policy

```bash
# Grafana Cloud UI:
# Alerting → Contact points → Provisioning → Import YAML
# contact-points.yaml 업로드
```

Slack Webhook은 파일에 placeholder로 들어있다. import 후 **반드시 UI에서 실제 webhook URL로 교체**:

1. Alerting → Contact points → `slack-ops-alerts` → Edit → `URL` 필드 갱신
2. `slack-product-alerts`도 동일

라우팅 정책 (contact-points.yaml):

- default → `slack-ops-alerts`
- `category=cost` → `slack-product-alerts`
- 그 외 `ops-alerts`로

## 4. 검증 체크리스트

대시보드 import 후 즉시 확인:

```bash
# 메트릭 노출 확인 (/metrics에 신규 게이지가 들어있어야 함)
curl -s https://www.goldencheck.kr/metrics | grep -E "^eduright_(dlq_|circuit_breaker_)" | head -10
```

알림 룰 Smoke Test:

1. `/admin/sentry-test` 혹은 SignalCraft 실패 잡을 5회 연속 발생시킨다
2. Grafana Alerting → Firing 상태로 진입하는지 확인
3. Slack 채널에 포스팅 확인

## 5. 변경 관리

- 대시보드 수정 → Grafana UI → Export JSON → PR로 덮어쓰기
- 룰 수정 → YAML 수정 후 재import (기존 룰은 UID 기준 upsert)
- Webhook 회전 → Railway Variables의 secret만 교체, YAML은 placeholder 유지

## 관련 문서

- `docs/Technical_Specification_v1.0.md` §1.7 — 지표/임계값/채널 원본 명세
- `docs/dlq-playbook.md` §7 — 알림 발화 후 대응 절차
- `docs/goldencheck-launch-runbook.md` §Step 5 — Grafana Cloud 스크래핑 등록
