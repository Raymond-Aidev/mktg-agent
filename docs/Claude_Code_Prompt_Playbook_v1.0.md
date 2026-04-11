EduRights AI  ·  Claude Code Prompt Playbook  |  v1.0
Claude Code 기능 활용 프롬프트 가이드


EduRights AI Marketing Agent Platform 구현 계획(6개월, 28주, 4인 팀)을 Claude Code로 최대한 효율적으로 실행하기 위한 프롬프트 템플릿 모음


문서 버전
	v1.0
작성일
	2026년 4월
분류
	내부용 (INTERNAL)
연관 문서
	Implementation Plan v1.0 · Technical Specification v1.1 · PRD v1.0
목적
	Agent Teams · Scheduled Tasks · Hooks · Subagents · Channels 5개 기능을 실제 Phase 작업에 투입할 때 복사해서 쓸 수 있는 프롬프트 제공
________________


0. 프롬프트 작성 원칙


원칙 1 — Context + Constraint + Output
	모든 프롬프트는 ① 현재 상황(context), ② 지켜야 할 제약(constraint), ③ 기대 산출물(output)을 반드시 포함한다.
원칙 2 — 파일 경로를 명시
	Claude는 프로젝트 구조를 모른 상태에서 시작하므로, 읽어야 할 파일 경로와 쓸 파일 경로를 명확히 적는다.
원칙 3 — 응답 길이 제한
	"200단어 이내" 같은 한계를 명시하지 않으면 장황한 응답이 나와 context를 낭비한다.
원칙 4 — 한 번에 한 가지 일
	단일 프롬프트에 여러 작업을 묶지 않는다. 대신 subagent나 task list로 분해한다.
원칙 5 — 실패 조건 명시
	"못하면 멈추고 보고하라"고 적어야 거짓 성공을 방지한다.
	________________


1. CLAUDE.md — 모든 세션의 공통 컨텍스트


가장 먼저 할 일. 프로젝트 루트에 `CLAUDE.md`를 두면 Claude Code 모든 세션에 자동 로딩된다. 이 파일이 "팀원에게 온보딩 자료를 주는 것"과 같은 효과를 낸다.


```markdown
# EduRights AI — Marketing Agent Platform

## 프로젝트 요약
교육 콘텐츠·아동 도서 출판사를 위한 자동화 마케팅 플랫폼.
5개 AI 에이전트 + 14모듈 SignalCraft 파이프라인. MVP 2026-10.

## 레포 구조
- `apps/api` — Express + BullMQ API 서버
- `apps/web` — React 대시보드
- `apps/workers` — BullMQ 워커 (queue:batch + queue:signalcraft)
- `packages/shared` — 공통 타입/유틸/Zod 스키마
- `packages/crawlers` — 카테고리 A/B 크롤러 모듈
- `db/migrations` — Postgres 마이그레이션
- `docs/` — PRD, Tech Spec, Implementation Plan

## 핵심 원칙
- 데이터는 카테고리 A(상시 배치) / B(온디맨드)로 엄격 분리
- 카테고리 B → A 쓰기 금지 (DB 롤 레벨 강제)
- 모든 마스터 테이블은 source_uid/fingerprint/last_seen_at/updated_at/is_stale 공통 컬럼
- BullMQ 큐는 queue:batch / queue:signalcraft 완전 분리
- LLM 모든 호출은 llm_usage 테이블에 tenant_id와 함께 기록

## 현재 Phase
Phase {0~8} — {주차} — {주요 목표}
(매 Phase 전환 시 이 줄만 업데이트)

## 팀 역할
- FSL (풀스택 리드): 인프라·API·스키마·배포
- FE (프론트엔드): React·Chart.js·PDF HTML·이벤트 트래커
- AI (AI 엔지니어): 14모듈·프롬프트·Zod·LLM 래퍼
- PM (데이터/QA): 카테고리 A 크롤러·법무·문서화·QA

## 커밋 규칙
- Conventional Commits (feat/fix/chore/docs/refactor)
- 마이그레이션 PR은 반드시 roll-back SQL 포함
- .env, package-lock.json은 절대 커밋 금지

## 문서 참조
- PRD: docs/PRD_v1.0.md
- Tech Spec: docs/Technical_Specification_v1.0.md
- 구현 계획: docs/Implementation_Plan_v1.0.md
- 이 플레이북: docs/Claude_Code_Prompt_Playbook_v1.0.md
```


효과
	매 세션 시작 시 Claude가 프로젝트 구조·원칙·현재 Phase를 자동 인지 → 잘못된 파일 생성, 카테고리 A/B 원칙 위반 등 방지.
	________________


2. Agent Teams — Phase 2 ∥ Phase 3 병렬 팀 스폰


W06~W09 병렬 구간에서 카테고리 A(PM)와 카테고리 B(AI+FSL) 팀이 동시에 움직인다.


2.1 팀 스폰 프롬프트 (세션 시작 시 한 번)


```
4인 팀으로 EduRights Phase 2-3 병렬 작업을 시작한다. docs/Implementation_Plan_v1.0.md §3.3, §3.4를 읽고 아래 4명의 teammate를 스폰해줘:

1. teammate "pm-batch"
   역할: 카테고리 A 배치 크롤러 담당 (PM)
   담당 작업: fx_rates, bestsellers, market_trends, buyers, competitors, rights_deals 순서로 packages/crawlers에 구현
   제약: Tech Spec §1.2 규약(source_uid/fingerprint) 엄수, 각 크롤러마다 unit test + 통합 test
   완료 조건: 해당 데이터셋이 staging DB에 실제 레코드로 적재되고 48시간 무중단

2. teammate "ai-collector"
   역할: 카테고리 B 5개 매체 크롤러 담당 (AI)
   담당 작업: 네이버 뉴스/댓글, 유튜브, DC, 클리앙, FM코리아 순서로 구현
   제약: raw_posts 단일 스키마 준수, 매체별 rate limit 준수
   완료 조건: 임의 키워드로 500건 이상 수집 가능

3. teammate "fsl-infra"
   역할: 공통 인프라 (FSL)
   담당 작업: queue:signalcraft 워커, 진행률 API, signalcraft_jobs 테이블, Redis 캐싱 레이어
   제약: 두 teammate의 작업을 블로킹하지 않도록 최우선 진행
   완료 조건: POST /api/v1/signalcraft/run과 진행률 폴링 동작

4. teammate "fe-prep"
   역할: Phase 6 프론트엔드 사전 준비 (FE)
   담당 작업: Chart.js 컴포넌트 라이브러리, 리포트 렌더링 HTML 스켈레톤
   제약: 실제 데이터 없이 mock으로 진행
   완료 조건: Storybook에 5개 차트 컴포넌트 등록

공통 제약:
- 모든 teammate는 CLAUDE.md를 읽고 시작
- 매일 09:30 KST에 스스로 진행 상황을 공유 태스크 리스트에 업데이트
- 서로의 PR에 24시간 내 리뷰 1건 남기기
- 블로커 발생 시 즉시 팀 전체에 브로드캐스트

우선 각 teammate를 스폰하고, 각자 첫 작업(fx_rates / 네이버 뉴스 / signalcraft 워커 / Chart.js 셋업)을 시작해줘.
```


2.2 Phase별 재사용 가능한 팀 템플릿


Phase 4 (LLM 14모듈)에서 쓸 팀 스폰 예시는 섹션 5 Subagents 참조.
________________


3. Scheduled Tasks — 주간·일간 자동 리뷰


3.1 주간 Phase 진행 리뷰 (매주 목 09:00 KST)


```
/schedule create "phase-weekly-review" "0 0 * * 4" """
현재 주차와 Phase를 docs/Implementation_Plan_v1.0.md에서 확인하고 아래를 보고해줘:

1. 이번 주 완료된 작업 (git log로 확인, 어제까지 7일)
2. 이번 주 목표 대비 진행률 (Phase §3.X의 '작업' 테이블 기준)
3. 블로커 또는 지연 리스크 (issue tracker, DLQ, Sentry 기반)
4. 다음 주 집중 항목 Top 3
5. 리스크 레지스터 업데이트 필요 항목 (구현 계획서 §5)
6. 게이트 G1~G6 중 임박한 게이트 상태

출력 형식:
- Slack 메시지 스타일, 섹션 이모지 없이, 400단어 이내
- 팀 전원(#eduright-dev)에 전송

주의:
- 추측 금지. git log, Sentry, DB의 실제 데이터만 인용
- 숫자는 정확히, 애매한 진술 금지
"""
```


3.2 일일 카테고리 A 배치 헬스 체크 (매일 10:00 KST, Phase 2 이후)


```
/schedule create "batch-health-daily" "0 1 * * *" """
카테고리 A 배치 파이프라인 헬스 체크:

1. 지난 24시간 queue:batch의 completed / failed / DLQ 건수
2. 7개 데이터셋별 last_seen_at 최신 시각 (24시간 이상 지연된 것은 경고)
3. crawler_failures 테이블에서 최근 24시간 에러 Top 5 (source, error_code, count)
4. fx_rates 최신 USD→KRW 환율 (exchangerate.host API 직접 비교하여 편차 > 0.5%면 경고)
5. circuit breaker 발동 중인 소스 목록

출력:
- 이상 없음이면 "✅ All batches healthy" 한 줄만
- 이상 있으면 항목별 상세 + 추천 조치

주의:
- Slack #ops-alerts에 전송
- 모든 수치는 PostgreSQL 실시간 쿼리로 확인
"""
```


3.3 게이트 임박 알림 (G1~G6 각각)


```
/schedule create "gate-g2-check" "0 0 * * 1" """
오늘이 W10의 월요일이면 G2 (Data Pipelines Live) 게이트 체크 실행:

기준 (docs/Implementation_Plan_v1.0.md §6):
- 카테고리 A 7개 데이터셋 모두 적재 완료 ✅/❌
- 카테고리 B 5개 매체 수집 안정 ✅/❌
- DLQ 없이 48시간 운영 ✅/❌
- 모니터링 지표 임계값 내 ✅/❌

각 기준을 실제 데이터로 검증한 후 PASS/FAIL 판정.
FAIL이면 누락 항목과 최대 1주 지연 여유 내 완료 가능 여부 분석.

출력 대상: FSL + PM Slack DM
"""
```


3.4 LLM 비용 일일 모니터 (Phase 4 시작 후)


```
/schedule create "llm-cost-daily" "0 2 * * *" """
어제 LLM API 사용량 리포트:

1. llm_usage 테이블에서 어제 총 비용 (USD, 테넌트별/모델별 분리)
2. 7일 이동 평균 대비 편차
3. 월간 예산 대비 진행률 (예산: $XXXX)
4. 편차 > 30%면 원인 추정 (모듈별 token 증가, 재시도 증가, 캐시 미스 등)

출력:
- 편차 30% 이하: 한 줄 요약
- 초과: 상세 분석 + 완화 제안
- 대상: AI + FSL Slack DM
"""
```


효과
	6개월간 수동 상태 체크 0회. 이상 징후만 선별적으로 알림.
	________________


4. Hooks — 규약 자동 강제


`.claude/settings.json`에 Phase 0 셋업 시 등록. 팀 전원에 동일하게 적용된다.


4.1 settings.json 전체 예시


```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/block-forbidden-files.sh",
            "description": "Block edits to .env, package-lock.json, db/migrations/*(applied)"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/block-destructive-commands.sh",
            "description": "Block rm -rf, git push --force, drop table"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/auto-format.sh $CLAUDE_FILE_PATH",
            "description": "Run prettier + eslint --fix on TypeScript files"
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/validate-migration.sh $CLAUDE_FILE_PATH",
            "description": "Ensure new migrations include rollback + fingerprint columns"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/inject-phase-context.sh",
            "description": "Inject current phase from CLAUDE.md into every prompt"
          }
        ]
      }
    ]
  }
}
```


4.2 block-forbidden-files.sh


```bash
#!/usr/bin/env bash
# .claude/hooks/block-forbidden-files.sh
set -e
FILE_PATH=$(echo "$1" | jq -r '.tool_input.file_path // empty')

FORBIDDEN=(
  "*.env"
  "*.env.local"
  "package-lock.json"
  "pnpm-lock.yaml"
)

for pattern in "${FORBIDDEN[@]}"; do
  if [[ "$FILE_PATH" == $pattern ]]; then
    echo "BLOCKED: Editing $FILE_PATH is forbidden by project rules." >&2
    exit 1
  fi
done

# Applied migrations (0001~0100 already merged)
if [[ "$FILE_PATH" =~ db/migrations/00[0-9]{2}_.*\.sql ]]; then
  MIGRATION_NUM=$(basename "$FILE_PATH" | grep -oE '^[0-9]+')
  if [[ $MIGRATION_NUM -lt 100 ]] && git log --all --oneline -- "$FILE_PATH" | grep -q .; then
    echo "BLOCKED: Migration $FILE_PATH is already applied. Create a new one instead." >&2
    exit 1
  fi
fi
```


4.3 validate-migration.sh


```bash
#!/usr/bin/env bash
# .claude/hooks/validate-migration.sh
set -e
FILE_PATH="$1"

[[ "$FILE_PATH" =~ db/migrations/.*\.sql$ ]] || exit 0

# 필수 조건 1: 공통 컬럼 규약
if grep -qE 'CREATE TABLE .* (buyers|competitors|market_trends|rights_deals|bestsellers)' "$FILE_PATH"; then
  for col in "source_uid" "fingerprint" "last_seen_at" "updated_at" "is_stale"; do
    if ! grep -q "$col" "$FILE_PATH"; then
      echo "ERROR: 카테고리 A 테이블은 $col 컬럼이 필수입니다." >&2
      exit 1
    fi
  done
fi

# 필수 조건 2: rollback 파일 존재
ROLLBACK="${FILE_PATH%.sql}.rollback.sql"
if [[ ! -f "$ROLLBACK" ]]; then
  echo "WARNING: rollback SQL 파일이 없습니다: $ROLLBACK" >&2
fi
```


4.4 inject-phase-context.sh


```bash
#!/usr/bin/env bash
# 모든 사용자 프롬프트 앞에 현재 Phase 정보 주입
PHASE=$(grep -A1 "현재 Phase" CLAUDE.md | tail -1)
echo "## 현재 Phase"
echo "$PHASE"
echo ""
echo "이 Phase의 상세 작업은 docs/Implementation_Plan_v1.0.md §3.x 참조."
```


효과
	① 6개월간 모든 PR이 동일 규약 준수 ② 카테고리 A 스키마 위반 0건 ③ 위험 명령(rm -rf, force push) 자동 차단.
	________________


5. Subagents — Phase 4 LLM 14모듈 병렬 구현


`.claude/agents/` 디렉토리에 아래 파일들을 두면 Claude가 자동으로 적절한 작업을 위임한다.


5.1 .claude/agents/prompt-engineer.md


```markdown
---
name: prompt-engineer
description: SignalCraft 14모듈 중 하나의 LLM 프롬프트를 Tech Spec §4.1 4-Part Template에 따라 설계. 모듈 번호가 언급되면 자동 트리거.
tools: Read, Write, Edit, Grep, Glob
---

당신은 EduRights AI의 프롬프트 엔지니어 전문가입니다.

작업 원칙:
1. Tech Spec §4.1 4-Part Template(ROLE/INPUT/TASK/CONSTRAINTS/OUTPUT)을 엄수
2. 반드시 "실제 수집된 데이터만 인용, 없는 사실 생성 금지" 문구 포함
3. 추정값에는 confidence(high/medium/low) 필수
4. 출력은 Zod 스키마와 1:1 매칭되는 JSON만 허용

작업 절차:
1. 해당 모듈 ID(예: #03 Sentiment)의 Tech Spec §4.2 Role/Task 확인
2. raw_posts 샘플 구조 확인 (packages/shared/types/raw_post.ts)
3. packages/workers/signalcraft/modules/{moduleId}/prompt.ts 작성
4. 로컬 테스트: 샘플 10개 raw_posts로 실행, Zod 검증 통과 확인

제약:
- 모듈 하나에만 집중, 다른 모듈 건드리지 말 것
- 한 번의 LLM 호출당 token 입력 < 50k
- 출력 token 상한 모듈 config에 명시
```


5.2 .claude/agents/zod-schema-designer.md


```markdown
---
name: zod-schema-designer
description: 14모듈 각각의 Zod 출력 스키마를 설계하고 검증한다. 스키마/타입 작업 시 트리거.
tools: Read, Write, Edit, Grep
---

Tech Spec §4.3 예시 스타일을 따라 Zod 스키마를 작성한다.

원칙:
- 모든 추정치 필드는 confidence enum 필수
- 배열 최대 길이 명시 (.max(N))
- 날짜는 z.string() + YYYY-MM-DD 검증 regex
- 새 enum 값은 packages/shared/enums.ts에 추가 후 import

작업 산출물:
- packages/workers/signalcraft/modules/{moduleId}/schema.ts
- packages/workers/signalcraft/modules/{moduleId}/schema.test.ts (Zod 파싱 테스트)

실패 시: 모듈 담당자에게 명확한 이유 보고. 임의로 다른 모듈 스키마 수정 금지.
```


5.3 .claude/agents/hallucination-checker.md


```markdown
---
name: hallucination-checker
description: LLM 출력의 수치·날짜·고유명사를 raw_posts와 교차 검증하는 후처리 로직 작성/감사. 환각 방지 키워드 트리거.
tools: Read, Write, Edit, Grep, Bash
---

Tech Spec §4.4 환각 방지 지침을 구현한다.

검증 대상:
1. 수치 (좋아요, 조회수, 비율 등) → raw_posts 집계와 ±5% 이내 일치
2. 날짜 (변곡점, 이벤트) → raw_posts.published_at 범위 내
3. 고유명사 (작가명, 브랜드) → raw_posts.content에 substring 존재

결과 처리:
- 모두 통과: 원본 유지
- 일부 실패: confidence를 한 단계 낮춤 + disclaimer 필드에 실패 항목 기록
- 50% 이상 실패: 모듈 재시도 요청 (최대 2회)

파일: packages/workers/signalcraft/modules/{moduleId}/validator.ts
```


5.4 Phase 4 병렬 구현 트리거 프롬프트


```
Phase 4를 시작한다. docs/Implementation_Plan_v1.0.md §3.5 주차별 분해에 따라:

- 오늘 W11: 모듈 #03 Sentiment를 먼저 구현
- 내일부터 W11 내: 모듈 #01, #02 병렬 구현

각 모듈마다 아래 3개 subagent를 병렬 호출:
1. prompt-engineer — prompt.ts 작성
2. zod-schema-designer — schema.ts 작성
3. hallucination-checker — validator.ts 작성

세 결과가 모이면 통합해서 packages/workers/signalcraft/modules/{moduleId}/index.ts에 export. 로컬에서 샘플 데이터로 end-to-end 실행해 Zod 검증 통과율 측정. 통과율 95% 미만이면 prompt-engineer에 재작업 요청.

모듈 #03부터 시작. 완료되면 보고하고 대기.
```


효과
	한 모듈당 3개 subagent가 병렬 실행 → Phase 4 6주에서 3~4주로 단축 가능.
	________________


6. Channels — Slack/Linear 양방향 통합


6.1 Phase 0 셋업 시점 설정


```
다음을 수행해줘:

1. Claude Code의 slack channels plugin을 활성화
2. 수신 대상: #eduright-dev (개발), #ops-alerts (장애), #product-alerts (UAT)
3. 트리거 룰 정의:
   - "@claude review #123" → 해당 PR 리뷰 → 리뷰 코멘트 GitHub에 등록
   - "@claude batch status" → 카테고리 A 배치 헬스 요약
   - "@claude phase progress" → 현재 Phase 진행률
   - "@claude incident {description}" → Sentry/DLQ 조사 후 원인 후보 Top 3 보고
4. Linear 플러그인도 연결, 이슈 생성 시 자동 assign 룰 적용

설정 완료 후 .claude/settings.json에 기록하고, 테스트 메시지 1회 시뮬레이션.
```


6.2 장애 감지 시 자동 대응 프롬프트


```
#ops-alerts에서 "queue:batch DLQ > 10" 알림이 오면 자동 실행할 프롬프트:

1. queue:batch:dlq에서 실패 job 상위 5개 조회
2. 각 job의 에러 로그를 Sentry에서 조회
3. 공통 원인 추정 (HTML 구조 변경 / API 변경 / 네트워크 / 스키마)
4. 원인별 추천 조치:
   - HTML 구조 변경: fixture 업데이트 PR 생성
   - API 변경: fallback 경로 활성화
   - 네트워크: circuit breaker 자동 reset
5. 결과를 #ops-alerts에 쓰레드로 답장, 인간 개입이 필요하면 @on-call 멘션

주의: 자동 수정 코드는 PR로만 제출, main 직접 푸시 금지.
```


________________


7. 복합 워크플로우 — 한 Phase를 통째로 실행하는 프롬프트


Phase 2 실행 예시 — 이 프롬프트 하나로 Phase 2 전체가 자동 진행된다.


```
Phase 2 (카테고리 A 파이프라인, W06~W10)를 시작한다. 

준비:
1. CLAUDE.md의 현재 Phase를 "Phase 2 - W06 - 카테고리 A 7개 데이터셋"으로 업데이트
2. docs/Implementation_Plan_v1.0.md §3.3 주차별 분해 테이블을 task list로 변환
3. 각 작업을 TaskCreate로 등록 (담당자, 예상 주차 포함)

실행:
- W06 작업부터 순차: fx_rates → 배치 러너 프레임워크 → ...
- 각 작업마다:
  a) Subagent "pm-batch"에 위임
  b) 완료 시 unit test + 통합 test 실행
  c) staging에 배포 후 48시간 데이터 누적 관찰
  d) 문제 없으면 TaskUpdate completed, 다음 작업으로
- 블로커 발생 시 즉시 중단, 사람에게 보고

매일 종료 시:
- Scheduled task "batch-health-daily" 결과 확인
- 진행률을 CLAUDE.md에 업데이트
- Git commit: "chore(phase2): W{NN} {작업명} 완료"

Phase 완료 조건 (Implementation Plan §3.3 DoD):
1. 7개 테이블에 실제 데이터 누적
2. DLQ 없이 48시간 무중단
3. 의도적 장애 주입 시 circuit breaker 작동

위 조건 전부 만족 시 G2 게이트 체크 실행. PASS면 Phase 3(또는 4)로 자동 전환.

주의:
- 카테고리 B 영역(raw_posts, SignalCraft) 절대 건드리지 말 것
- Tech Spec §1.2 규약 위반 시 Hook이 차단 → 차단되면 규약부터 확인
- 법적 리스크(OI-04 볼로냐)는 법무 검토 완료 전까지 staging만 운영
```


________________


8. 안티패턴 — 피해야 할 프롬프트


피해야 할 예시 1 — 너무 모호
	❌ "Phase 2 좀 해줘"
✅ 섹션 7의 복합 워크플로우 예시처럼 구체적 작업·제약·완료 조건 명시
	피해야 할 예시 2 — 여러 Phase를 한 번에
	❌ "Phase 2와 3을 동시에 진행해"
✅ Agent Teams로 teammate 2명 스폰, 각자에게 분리된 프롬프트
	피해야 할 예시 3 — 문서 참조 없이
	❌ "카테고리 A 크롤러 만들어줘"
✅ "docs/Technical_Specification_v1.0.md §1.2.1 bestsellers 항목을 구현해줘"
	피해야 할 예시 4 — 실패 조건 없음
	❌ "14모듈 다 만들어"
✅ "모듈 #03 구현. Zod 검증 통과율 95% 미만이면 멈추고 원인 보고"
	피해야 할 예시 5 — 응답 길이 무제한
	❌ "진행 상황 알려줘"
✅ "진행 상황을 400단어 이내, 섹션 5개로 보고"
	________________


9. 체크리스트 — 프롬프트 제출 전 확인


□ CLAUDE.md가 최신 Phase 정보로 업데이트되어 있는가
□ 참조해야 할 파일 경로를 모두 명시했는가
□ 작업의 완료 기준(DoD)을 명시했는가
□ 실패 시 어떻게 할지 명시했는가
□ 응답 길이 제한을 두었는가
□ 다른 Phase/영역을 건드리지 말라는 제약을 두었는가
□ 카테고리 A/B 경계를 지키는지 확인했는가
□ 쓰면 안 되는 파일(.env, applied migration)은 hook으로 차단되는가
________________


10. 변경 이력


버전
	날짜
	변경 내용
	v1.0
	2026-04-11
	초안 — 5개 Claude Code 기능별 프롬프트 템플릿, Phase별 복합 워크플로우, 안티패턴 정리
	________________


— END OF DOCUMENT —
EduRights AI Claude Code Prompt Playbook v1.0  ·  INTERNAL
