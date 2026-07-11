# 한국삐아제 ERP 구축 협업 포털 — 개발 문서

> **목적**: 이 포털은 한국삐아제 고객사와 지속적으로 소통·협업하는 채널입니다. 변경·추가가 잦으므로, 재작업 시 혼선이 없도록 **구조·데이터·배포·함정·작업이력**을 이 문서에 정리합니다.
> **원칙**: 코드를 고치기 전에 이 문서의 "① 아키텍처 / ⑤ 배포 방법 / ⑥ 함정" 섹션을 먼저 읽으세요.
> 최종 갱신: 2026-07-11

---

## 0. 한눈에 요약

| 항목 | 값 |
|---|---|
| 접속 주소(운영) | **https://piaget.goldencheck.kr** (또는 프리뷰 `https://www.goldencheck.kr/piaget`) |
| 호스팅 | Railway (24시간 상시, 맥 무관) |
| 레포 | `Raymond-Aidev/mktg-agent` (모노레포, 서비스 `@eduright/api`) |
| 실행 | `tsx src/index.ts` — **타입체크 안 함**, 문법 오류만 배포를 막음 |
| DB | Railway Postgres (테이블 2개: `piaget_portal_answers`, `piaget_portal_tasks`) |
| 계정 | `admin`/`piaget2026!` (role=admin), `piaget`/`piaget2026!` (role=member) |
| 배포 | main 브랜치에 머지 → 자동 배포(~1~2분) |

**핵심 파일 (3개)**
- `apps/api/src/routes/piaget-portal.ts` — 라우터·인증·데이터모델·DB·API
- `apps/api/src/routes/piaget-portal-html.ts` — 화면 전체(LOGIN_HTML, PORTAL_HTML: HTML+CSS+JS 문자열)
- `apps/api/src/index.ts` — 라우터 마운트 + CORS 허용목록(93행), 마운트(203행)

> ⚠️ 이 포털은 별도 프론트엔드 프레임워크 없이 **HTML/CSS/JS를 문자열 템플릿**으로 서버가 그대로 내려줍니다. 화면 수정 = `piaget-portal-html.ts`의 문자열을 편집.

---

## 1. 아키텍처

```
브라우저 (piaget.goldencheck.kr)
   │  HTTPS (Let's Encrypt, Cloudflare DNS-only)
   ▼
Railway 엣지 → @eduright/api (Express, tsx)
   │  app.use(piagetPortalRouter)  ← authMiddleware(JWT) 보다 먼저 마운트
   ▼
piagetPortalRouter (piaget-portal.ts)
   │  자체 쿠키 세션 인증(sid, HMAC) — 앱의 JWT와 별개
   ▼
Railway Postgres (getPool())
```

- 포털은 기존 goldencheck 앱에 **호스트 분기 라우터**로 얹혀 있음.
  - `GET /` : `isPiagetHost(req)`면 포털, 아니면 `next()` (기존 앱 그대로).
  - `GET /piaget` : 어느 호스트든 포털 프리뷰.
  - 나머지 호스트/경로는 기존 앱에 영향 없음.
- 포털 라우터는 **`app.use(authMiddleware)`보다 먼저** 마운트됨(자체 인증 사용).

---

## 2. API 엔드포인트 (전부 `piaget-portal.ts`)

| 메서드·경로 | 인증 | 설명 |
|---|---|---|
| `GET /` (piaget 호스트) / `GET /piaget` | - | 로그인 or 포털 HTML (Cache-Control: no-store) |
| `POST /piaget/api/login` | - | `{username,password}` → 쿠키 `sid` 발급 |
| `POST /piaget/api/logout` | - | 쿠키 삭제 |
| `GET /piaget/api/state` | 필요 | `{ok,user,role,phases,questions,docs,answers,tasks}` |
| `POST /piaget/api/answer` | 필요 | (레거시) 질문 응답 저장 — **UI 카드는 제거됨**, 엔드포인트만 잔존 |
| `POST /piaget/api/task` | 필요 | 업무 **등록** |
| `POST /piaget/api/task/:id` | 필요 | 업무 **수정** |
| `POST /piaget/api/task/:id/delete` | 필요 | 업무 **삭제** |
| `GET /piaget/api/doc/:type` | **admin** | 응답 기반 문서(기획서/CRD/PRD/SRD) 자동조립 |

> **삭제는 DELETE 메서드가 아니라 POST**(`/:id/delete`)로 구현 — 앱 CORS가 `GET,POST,OPTIONS`만 허용하기 때문. 새 쓰기 동작도 POST로 만들 것.

---

## 3. 데이터 모델

### 3-1. 상수 (piaget-portal.ts)
- **PHASES** (7단계 로드맵): `{id, name, weeks, who, plain, activities:[{t,d}], outputs:[], gate}`
  - P0 계약·착수 / P1 Discovery / P2 요구사항(CRD) / P3 설계(PRD·SRD) / P4 구축 / P5 테스트 / P6 전환·안정화
- **QUESTIONS** (19개): `{id, phase, domain, q, doc, section}` — 화면엔 안 뜨지만(질문 카드 제거) **도메인 목록의 출처** 이자 문서조립에 사용.
- **도메인 (9 + 기타)**: QUESTIONS의 domain을 dedup → `회계, 발주·영업, CS·반품, 물류, 지사(외부), 지구별닷컴, 권한·계정, 데이터, 전략` + **`기타`**.
  - 서버 검증: `[...new Set(QUESTIONS.map(x=>x.domain)), "기타"]`
  - 클라이언트: `allDomains()` = 동일. 필터 칩 = `['전체', ...도메인, '기타']`.
- **DOCS**: `["기획서","CRD","PRD","SRD"]`

### 3-2. DB 테이블

**`piaget_portal_answers`** (레거시 질문응답)
```
id bigint, question_id text, phase text, domain text, question text,
answer text, respondent text, role text, auth_user text,
doc text, section text, created_at timestamptz
```

**`piaget_portal_tasks`** (업무 등록 — 현재 핵심)
```
id bigint PK, domain text, title text, process text,
steps jsonb, comment text, respondent text, auth_user text,
created_at timestamptz
```
- **`steps` (jsonb)**: 프로세스 단계 배열. 각 원소:
  ```json
  { "text": "단계 설명", "owner": "담당자(필수)", "cc": "참조", "collab": "공동작업자", "approver": "최종 승인", "receiver": "수신자" }
  ```
  - `owner`(담당자)만 필수, 나머지 4개는 선택(빈 문자열 허용).
  - **하위호환**: 옛 데이터는 `steps`가 문자열 배열 `["a","b"]`. 읽을 때 `normStep`(클라)·`sanitizeSteps`(서버)가 객체로 변환. **이 변환 로직을 절대 제거하지 말 것.**
- **`process` (text)**: `steps[].text`를 `" → "`로 조인한 요약(검색·문서용). steps로부터 항상 파생.
- **`comment` (text)**: 업무 단위 코멘트(선택).

> 마이그레이션: `ensureTable()`이 `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`로 자동 처리. **컬럼 추가는 반드시 `ADD COLUMN IF NOT EXISTS`로.** 급하면 psql로 직접 ALTER 가능(⑤-DB 참고).

---

## 4. 인증

- **USERS**: 환경변수에서 로드
  - `PIAGET_USERS_JSON`(전체 JSON) 또는 `PIAGET_ADMIN_PW`/`PIAGET_PIAGET_PW`(개별 비번)
  - 기본값: `admin`(admin), `piaget`(member), 둘 다 `piaget2026!`
- **세션**: 쿠키 `sid` = HMAC 토큰(`makeToken`/`verifyToken`).
  - 시크릿: `PIAGET_PORTAL_SECRET` 또는 `DATABASE_URL` 기반 파생.
  - 쿠키 속성: `HttpOnly; Secure(x-forwarded-proto=https일 때); SameSite=Lax; Path=/; Max-Age=1일`.
- **role**: `admin`만 문서(자동조립) 탭·`/doc` API 접근 가능. `member`는 로드맵·업무 등록만.

---

## 5. 개발·배포 방법 (재작업 시 이 순서대로)

### 5-1. 코드 위치
로컬 작업 클론: `/tmp/mktg-agent` (없으면 `git clone https://github.com/Raymond-Aidev/mktg-agent /tmp/mktg-agent`).

### 5-2. 수정 → 문법검증 → 배포
```bash
cd /tmp/mktg-agent
# 1) 편집: piaget-portal.ts / piaget-portal-html.ts / index.ts
# 2) 문법 검증 (타입 아님! esbuild 트랜스파일로 문법만)
npx esbuild apps/api/src/routes/piaget-portal.ts --format=esm --platform=node > /dev/null && echo OK
npx esbuild apps/api/src/routes/piaget-portal-html.ts --format=esm --platform=node > /dev/null && echo OK
# 3) 브랜치 → 커밋 → 푸시 → PR → 머지(squash) → 자동배포
git fetch origin && git checkout -b feat/xxx origin/main
git add -A && git commit --no-verify -m "feat(piaget): ..."   # husky 미설치 → --no-verify
git push -u origin feat/xxx
gh pr create --head feat/xxx --title "..." --body "..."
gh pr merge --squash --delete-branch feat/xxx
```
- **gh CLI는 Raymond-Aidev(레포 소유자)로 인증**돼 있어 머지 가능.
- 머지 후 Railway가 main을 감지해 **자동 배포(~1~2분)**.
- **배포 확인**: 로그인 후 HTML/상태에 새 마커가 있는지 curl로 폴링.
  ```bash
  curl -s -H 'Origin: https://piaget.goldencheck.kr' -H 'Content-Type: application/json' \
    -c /tmp/j -X POST https://piaget.goldencheck.kr/piaget/api/login \
    -d '{"username":"admin","password":"piaget2026!"}'
  curl -s -b /tmp/j https://piaget.goldencheck.kr/piaget | grep '찾는마커'
  ```

### 5-3. DB 직접 접속 (확인/수정/데이터정리)
```bash
cd /tmp/mktg-agent
PUB=$(railway variables -s Postgres --json | python3 -c "import sys,json;print(json.load(sys.stdin)['DATABASE_PUBLIC_URL'])")
psql "$PUB" -c "\d piaget_portal_tasks"                       # 스키마
psql "$PUB" -tAc "SELECT id,title,jsonb_pretty(steps),comment FROM piaget_portal_tasks ORDER BY id;"
psql "$PUB" -c "ALTER TABLE piaget_portal_tasks ADD COLUMN IF NOT EXISTS 새컬럼 TEXT;"  # 마이그레이션
```
- Railway CLI는 `benedium@gmail.com`으로 로그인됨. **읽기(variables/logs/status)는 되지만 일부 쓰기(커스텀 도메인 추가 등)는 권한 부족 → Railway 대시보드에서 처리**.

### 5-4. 도메인/DNS (이미 설정됨 — 참고용)
- Railway 서비스 MKTG-Agent에 커스텀 도메인 `piaget.goldencheck.kr`(포트 8080) 등록됨.
- Cloudflare(goldencheck.kr): `piaget` **CNAME → s2sstbv0.up.railway.app** + **TXT `_railway-verify.piaget` = railway-verify=...** (소유권 확인). **프록시 OFF(회색 구름)**.
- Cloudflare DNS는 `~/.cloudflared/cert.pem`에 내장된 API 토큰으로 스크립트 조작 가능(과거 이 방식으로 레코드 교체).

---

## 6. 함정(Gotcha) — 반드시 기억

1. **CORS 허용목록**: 새 호스트에서 접속 시 브라우저가 `Origin` 헤더를 보내는데, `index.ts`의 allowList에 없으면 **로그인이 500(`internal_error`)** 남. piaget 호스트는 이미 추가됨(93행). curl은 Origin이 없어 통과하므로 **브라우저 테스트 필수**(또는 `-H 'Origin: https://piaget.goldencheck.kr'`).
2. **tsx는 타입체크 안 함**: 타입 에러는 배포를 막지 않음. **문법 오류만** 막음 → 배포 전 esbuild로 문법 확인.
3. **화면 셸은 no-store**: 로그인/포털 HTML에 `Cache-Control: no-store`. 캐시된 옛 화면이 로그인 루프를 유발했던 이슈 방지. 유지할 것.
4. **하위호환 변환**(`normStep`/`sanitizeSteps`): steps가 문자열/객체 혼재 → 제거 금지.
5. **커스텀 도메인 검증**: Railway는 CNAME + **TXT verify 레코드 둘 다** 필요. Cloudflare **프록시가 켜져 있으면 검증 실패**("Waiting for DNS update") → 회색 구름(DNS-only)으로.
6. **삭제/쓰기는 POST**: CORS methods가 `GET,POST,OPTIONS`뿐. DELETE 쓰지 말 것.
7. **로컬 맥 버전은 폐기**: 과거 `~/Piajet/portal-server.js`+`public/portal.html`(포트 4200, Cloudflare 터널)로 서비스했으나 **Railway로 이관 후 사용 안 함**. 수정은 **Railway(레포) 쪽만** 하면 됨. (맥 launchd/터널 정리는 선택)

---

## 7. 현재 화면 구성 (2026-07-11 기준)

**탭 3개**: 🗺 구축 로드맵 · 📝 업무 등록 · 📄 문서(자동 조립, admin만) + `＋ 업무 추가` 버튼

- **구축 로드맵**: 세로 타임라인(P0~P6). 단계별 상태색(완료/진행중/예정), 쉬운 한줄 설명, 활동 칩(클릭 시 설명 펼침), 산출물·완료게이트·참여주체.
- **업무 등록**: 도메인 필터 칩(전체+9+기타) + 등록된 업무 목록(수정/삭제 버튼). 질문 카드는 제거됨.
  - **＋ 업무 추가 / 수정 모달**: ①영역 드롭다운(10개) → 확인 → ②업무명·담당자·**프로세스 플로우 박스**(기본 3개, 화살표 `+`로 추가/`×`로 삭제, 각 박스에 담당자＊·참조·공동작업자·최종승인·수신자)·코멘트 → 저장.
- **문서**: admin이 기획서/CRD/PRD/SRD 선택 시 응답 기반 자동조립.

---

## 8. 작업 지시 이력 (요청 → 반영, PR#)

| # | 고객(사장) 지시 | 반영 |
|---|---|---|
| #2 | 협업 포털을 Railway 레포에서 구동 | 포털 최초 구축, piaget.goldencheck.kr |
| #3 | 문서(자동조립) 탭은 admin만 | role 가드(UI 숨김 + `/doc` 403) |
| #4 | 구축 로드맵 상세 시각화 + 활동 클릭 설명 | 세로 타임라인 + activities `{t,d}` 클릭 펼침 |
| #5 | 업무 추가를 드롭다운(10, 기타 포함) + 프로세스 플로우 박스 | 2단계 모달 + 플로우 편집기 + 도메인별 샘플 |
| #6 | (로그인 캐시 루프) | HTML no-store |
| #7 | (로그인 500) | CORS 허용목록에 piaget 추가 |
| #8 | 업무 등록의 질문 샘플 모두 삭제 | 질문 카드 제거 + 빈 상태 안내 |
| #9 | 만든 업무 수정 기능 | 수정/삭제 버튼 + 편집 모달 + UPDATE/DELETE |
| #10 | 업무 코멘트 + 박스별 담당자·참조·공동작업자·최종승인·수신자 | steps 객체배열(JSONB) + comment 컬럼 |
| #11 | 담당자만 필수, 나머지 선택 | 서버·클라 검증 + UI ＊/(필수)(선택) 표기 |

**그 외 지시**: 계정 2개(admin/piaget), 탭 이름 "질문·응답"→"업무 등록", 로드맵을 별도 md로 문서화(`ERP구축_로드맵.md`), 각 도메인 샘플 프로세스 제공.

---

## 9. 알려진 상태 / TODO

- **실데이터**: 현재 `piaget_portal_tasks`에 id=2 "지사 발주 실사(수정됨)"(검증 중 수정됨), id=3 "배송" 존재 — 테스트성 데이터일 수 있음. 정리 필요 시 psql DELETE.
- **레거시 질문응답**: `/answer` 엔드포인트·`piaget_portal_answers` 테이블·문서조립은 남아있음(admin 문서 탭에서 사용). 완전 폐기 여부 미정.
- **맥 터널/launchd**: 미사용. 원하면 정리(`launchctl unload ~/Library/LaunchAgents/kr.goldencheck.piaget-*.plist`, `cloudflared tunnel delete piaget-portal`).
- **권장 env(Railway Variables)**: `PIAGET_PORTAL_SECRET`(세션 서명 고정), 비번 변경 시 `PIAGET_ADMIN_PW`/`PIAGET_PIAGET_PW`.

---

## 10. 자주 하게 될 변경 — 빠른 가이드

- **도메인(영역) 추가/변경**: `QUESTIONS`의 domain 값이 출처. 질문과 무관한 순수 영역을 추가하려면 향후 **명시적 DOMAINS 상수로 분리 권장**(현재는 QUESTIONS 파생 + "기타" 하드코딩). 서버 검증(`domains`)·클라(`allDomains`)·필터 칩 3곳을 함께 수정.
- **박스 역할 필드 추가**: `ROLE_FIELDS`(클라) + `sanitizeSteps`(서버, 필드 나열) + 읽기표시(`taskFlow`) 3곳. steps는 JSONB라 DB 스키마 변경 불필요.
- **업무 항목 필드 추가(예: 마감일)**: DB 컬럼 추가(`ADD COLUMN IF NOT EXISTS`) → `listTasks` SELECT/return → create/update 라우트 → 모달 입력 + `submitTask` body → `renderTasks` 표시.
- **화면 문구/스타일**: `piaget-portal-html.ts`의 해당 문자열. 배포 후 강력 새로고침으로 확인.
