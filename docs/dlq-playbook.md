EduRights AI · Operations · DLQ Recovery Playbook
==================================================

목적: 카테고리 A 배치 파이프라인에서 DLQ(`queue:batch:dlq`)가 적체되거나 단일 source가 연속 실패할 때, 첫 번째 응답자가 5분 내에 안전하게 진단·완화할 수 있도록 하는 절차서.

대상 청중: 운영자(또는 온콜), Phase 7 W22 이후.

연관 문서:
- `docs/Technical_Specification_v1.0.md` §1.2.3 (재시도 + DLQ 정책)
- `docs/Implementation_Plan_v1.0.md` §3.8 (Phase 7 관측성)


## 0. TL;DR

> "queue:batch DLQ > 10" Slack 알림이 오면:
> 1. `/admin/operator/overview`에서 `crawlerFailures` 카드를 본다 (24h 이력).
> 2. 같은 source가 반복 실패면 → §2 source 복구
> 3. 다양한 source가 동시에 실패면 → §3 인프라 인시던트
> 4. 단발성 실패면 → §4 단순 재시도


## 1. 트리거 조건

다음 중 하나가 발생하면 본 플레이북을 적용한다.

| 조건 | 임계값 | 알림 채널 |
|---|---|---|
| `queue:batch:dlq` 적체 | > 10 jobs | Slack `#ops-alerts` + PagerDuty |
| 단일 source 연속 실패 | 3회 이내 | Slack `#ops-alerts` (자동 circuit breaker) |
| 카테고리 A job 실패율 (24h) | > 5% | Slack `#ops-alerts` |

(자동 알림 룰은 Phase 7.3에서 Grafana Alerting으로 구현 — 본 플레이북은 알림 발화 후 절차)


## 2. Source 복구 (단일 source 반복 실패)

### 2.1 진단

```bash
# 1) 어느 source가 실패하는지 식별
# Operator overview에서 확인하거나, DB로 직접:
psql $DATABASE_PUBLIC_URL -c "
  SELECT source, COUNT(*), MAX(failed_at)
    FROM crawler_failures
   WHERE failed_at >= now() - interval '1 hour'
   GROUP BY source
   ORDER BY 2 DESC;
"

# 2) 최근 에러 메시지 확인
psql $DATABASE_PUBLIC_URL -c "
  SELECT source, error_code, error_msg, failed_at
    FROM crawler_failures
   WHERE source = 'bologna'  -- ← 식별된 source
     AND failed_at >= now() - interval '1 hour'
   ORDER BY failed_at DESC LIMIT 5;
"

# 3) Sentry 동일 source의 unhandled exception
# https://sentry.io/organizations/eduright/issues/?query=source:bologna
```

### 2.2 원인 분류 + 조치

| 에러 유형 | 시그널 | 조치 |
|---|---|---|
| **HTML 구조 변경** (크롤링) | `Cannot read property 'querySelector' of null` | `packages/crawlers/src/category-a/{source}.ts`의 selector 업데이트, fixture 테스트 추가, redeploy |
| **API 변경** (REST) | `HTTP 404` 또는 `unexpected schema` | API 문서 확인, 응답 매핑 수정, 또는 fallback source 활성화 |
| **Rate limit / 차단** | `HTTP 429` 또는 `403` | 1) circuit breaker 30분 자동 작동 확인, 2) User-Agent 순환 강화, 3) 필요 시 공식 API 전환 |
| **타임아웃** | `AbortError` 또는 `socket hang up` | 1) 일시적이면 자동 재시도로 해결, 2) 지속되면 source 측 인시던트 확인, 3) timeout 상향 검토 |
| **인증 만료** | `401` 또는 `invalid_credentials` | Railway Variables에서 키 갱신 후 재배포 |

### 2.3 수동 재시도

source 코드를 수정·배포한 후 운영자 API로 즉시 1회 실행:

```bash
curl -u admin:$ADMIN_PASS -X POST -H "Content-Type: application/json" \
  -d '{"name":"buyers:bologna"}' \
  https://mktg-agent-production.up.railway.app/admin/batch/run
```

성공 확인:

```bash
# crawler_failures에 새 row가 추가되지 않아야 함
# 해당 source의 master 테이블 last_seen_at이 갱신되어야 함
curl -u admin:$ADMIN_PASS \
  https://mktg-agent-production.up.railway.app/admin/operator/overview \
  | jq '.datasets[] | select(.table=="buyers")'
```


## 3. 인프라 인시던트 (다양한 source 동시 실패)

여러 source가 동시에 실패하면 source 자체가 아니라 인프라 문제. 다음 순서로 점검:

### 3.1 Postgres
```bash
curl https://mktg-agent-production.up.railway.app/health
```
`postgres.ok = false`면 Railway Postgres 플러그인 상태 확인:
- Railway dashboard → Postgres service → Metrics
- 디스크 사용량 80%+면 storage 확장
- connection pool exhausted면 RDS-side 로그 확인

### 3.2 Redis
같은 health 체크에서 `redis.ok = false`면:
- Railway Redis service → Metrics → memory
- `redis_memory_used_bytes` 가 80% 이상이면 cleanup script 실행 또는 instance 업그레이드

### 3.3 외부 의존성
모든 source가 동일하게 timeout이면 outbound 네트워크 또는 DNS 문제. Railway service의 outbound 차단 여부 확인.

### 3.4 LLM API
SignalCraft 파이프라인 실패가 동반되면 Anthropic / Google 측 인시던트:
- https://status.anthropic.com
- https://status.cloud.google.com


## 4. 단순 재시도 (단발성 실패)

알림이 1회만 발화하고 후속 자동 재시도(BullMQ exponential backoff)에서 회복되면 별도 조치 불필요. 단, 다음을 기록:

1. Sentry 이슈에 "transient" 라벨 추가
2. `crawler_failures`의 해당 row를 주간 리뷰 회의에서 재검토 (반복되면 §2.2의 항목으로 재분류)


## 5. DLQ 비우기

DLQ에 쌓인 job을 정리하는 두 가지 방법:

### 5.1 운영자 API (재시도)
```bash
# Phase 8에서 추가될 예정의 endpoint
curl -u admin:$ADMIN_PASS -X POST \
  https://mktg-agent-production.up.railway.app/admin/batch/dlq/retry-all
```

### 5.2 Bull-Board UI
1. https://mktg-agent-production.up.railway.app/admin/queues 접속 (basic auth)
2. `batch` 큐 → `Failed` 탭 → 각 job 선택 → `Retry`
3. 또는 `Clean` 으로 일괄 정리(원인이 source 측 영구 변경이라 판단된 경우만)


## 6. 사후 분석 (Postmortem)

연속 실패 또는 DLQ 적체가 30분 이상 지속된 경우:

1. **24시간 내 postmortem 작성** (`docs/postmortems/{date}-{source}.md`)
2. 포함 항목:
   - 시작/감지/해소 시각
   - 영향받은 데이터셋과 행 수
   - 근본 원인
   - 즉각 조치
   - 재발 방지 액션 (코드/모니터링/문서)
3. 다음 주간 운영 회의 어젠다에 추가


## 7. 알림 룰 (Phase 7.3에서 자동화 예정)

| 룰 | 조건 | 동작 |
|---|---|---|
| `dlq_high` | `eduright_queue_failed_jobs{queue="batch"} > 10` | Slack `#ops-alerts` + PagerDuty |
| `source_failures` | `crawler_failures` 동일 source 1시간에 3건 이상 | Slack `#ops-alerts` |
| `queue_active_starvation` | `eduright_queue_active_jobs{queue="batch"} == 0` AND waiting > 5 (10분) | Slack `#ops-alerts` (워커 다운 의심) |
| `signalcraft_long_run` | 단일 job duration > 3시간 | Slack `#product-alerts` |
| `llm_cost_spike` | 24h 비용 7-day avg 3배 초과 | Slack `#product-alerts` |
| `pg_unhealthy` | `/health` postgres ok == false | Slack `#ops-alerts` + PagerDuty |
| `redis_unhealthy` | `/health` redis ok == false | Slack `#ops-alerts` + PagerDuty |

(Tech Spec §1.7 표 참조)


## 8. 변경 이력

| 버전 | 날짜 | 변경 |
|---|---|---|
| v0.1 | 2026-04-11 | 초안 — Phase 7 W22 first cut, 자동 알림 룰은 §7의 사양만 정의 (구현은 7.3) |
