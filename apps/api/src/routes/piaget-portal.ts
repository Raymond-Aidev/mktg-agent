// 한국삐아제 ERP 구축 협업 포털 — Express 라우터
// piaget.goldencheck.kr 호스트로 서빙(또는 /piaget 경로로 프리뷰). 응답은 Postgres 저장.
// 계정/시크릿은 환경변수로 오버라이드 가능(레포에 평문 노출 최소화).

import crypto from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { getPool } from "../infra/db.ts";
import { LOGIN_HTML, PORTAL_HTML } from "./piaget-portal-html.ts";

const PIAGET_HOST = process.env.PIAGET_HOST ?? "piaget.goldencheck.kr";

// ── 계정 (Railway Variables로 오버라이드 권장) ────────────────────
const USERS: Record<string, { pass: string; role: string }> = (() => {
  if (process.env.PIAGET_USERS_JSON) {
    try {
      return JSON.parse(process.env.PIAGET_USERS_JSON) as Record<string, { pass: string; role: string }>;
    } catch {
      /* fall through to defaults */
    }
  }
  return {
    admin: { pass: process.env.PIAGET_ADMIN_PW ?? "piaget2026!", role: "admin" },
    piaget: { pass: process.env.PIAGET_PIAGET_PW ?? "piaget2026!", role: "member" },
  };
})();

// 세션 서명키: 명시 env가 없으면 DATABASE_URL에서 안정적으로 파생(평문 미노출)
const SECRET =
  process.env.PIAGET_PORTAL_SECRET ??
  crypto.createHash("sha256").update("piaget|" + (process.env.DATABASE_URL ?? "dev")).digest("hex");

const sign = (u: string): string => crypto.createHmac("sha256", SECRET).update(u).digest("hex");
const makeToken = (u: string): string => Buffer.from(u).toString("base64url") + "." + sign(u);
function verifyToken(t: string | undefined): string | null {
  if (!t) return null;
  const i = t.lastIndexOf(".");
  if (i < 0) return null;
  let u: string;
  try {
    u = Buffer.from(t.slice(0, i), "base64url").toString();
  } catch {
    return null;
  }
  const mac = t.slice(i + 1);
  const exp = sign(u);
  if (mac.length !== exp.length) return null;
  try {
    return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(exp)) ? u : null;
  } catch {
    return null;
  }
}
function parseCookies(req: Request): Record<string, string> {
  const h = req.headers.cookie ?? "";
  const o: Record<string, string> = {};
  for (const p of h.split(";")) {
    const idx = p.indexOf("=");
    if (idx < 0) continue;
    const k = p.slice(0, idx).trim();
    if (k) o[k] = decodeURIComponent(p.slice(idx + 1).trim());
  }
  return o;
}
const currentUser = (req: Request): string | null => {
  const u = verifyToken(parseCookies(req).sid);
  return u && USERS[u] ? u : null;
};
function checkPass(u: string, p: string): boolean {
  const rec = USERS[u];
  if (!rec) return false;
  const a = Buffer.from(rec.pass);
  const b = Buffer.from(String(p ?? ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const isPiagetHost = (req: Request): boolean =>
  req.hostname === PIAGET_HOST || String(req.headers["x-forwarded-host"] ?? "").includes(PIAGET_HOST);

// ── 로드맵 & 질문 ────────────────────────────────────────────────
const PHASES = [
  { id: "P0", name: "계약·착수", weeks: "~2주", who: "공동",
    plain: "프로젝트를 공식 시작합니다. 범위·일정·담당자를 정하고 이 협업 포털을 엽니다.",
    outputs: ["착수보고서", "WBS 일정표"], gate: "착수보고 승인",
    activities: [
      { t: "착수보고", d: "프로젝트를 공식적으로 시작하는 첫 회의입니다. 목표·범위·일정·팀 구성을 고객사와 함께 확인하고 합의합니다. '무엇을, 언제까지, 누가' 하는지를 문서로 못박는 자리입니다." },
      { t: "범위·일정(WBS) 확정", d: "할 일을 잘게 쪼개(작업분해구조=WBS) 각 작업의 순서·기간·담당을 정한 일정표를 만듭니다. 이후 진행률은 모두 이 기준으로 측정합니다." },
      { t: "담당자·역할 지정", d: "고객사·수행사 양쪽에서 누가 승인하고(승인권자), 누가 실무를 하고, 누가 창구인지 정합니다. 연락이 새지 않도록 역할과 책임(R&R)을 명확히 합니다." },
      { t: "협업 포털 오픈", d: "지금 보고 계신 이 포털을 여는 작업입니다. 로드맵 공유·질문응답·문서 자동조립을 한곳에서 하도록 계정을 만들고 접근 권한을 부여합니다." },
    ] },
  { id: "P1", name: "Discovery (현황진단)", weeks: "3~4주", who: "고객사 중심",
    plain: "지금 업무를 있는 그대로 파악합니다. 인터뷰와 자료로 문제점·필요를 모읍니다.",
    outputs: ["현황분석서", "인터뷰 응답"], gate: "현황분석 리뷰",
    activities: [
      { t: "현업 인터뷰", d: "회계·영업·물류·CS 등 실제 업무 담당자를 만나 지금 일하는 방식을 듣습니다. 화면·엑셀·수기 작업까지 있는 그대로 파악하는 것이 목적입니다." },
      { t: "업무·데이터 실사", d: "이카운트·플레이오토·책별관리자 등 현재 시스템의 데이터와 화면을 직접 열어 확인합니다. 거래처·품목 코드가 시스템마다 어떻게 다른지 등 실제 데이터를 살펴봅니다." },
      { t: "AS-IS 프로세스 정리", d: "지금의 업무 흐름(예: 주문→발주→입금확인→출고)을 그림(프로세스 맵)으로 정리합니다. 어디서 손이 많이 가고 끊기는지 눈에 보이게 만드는 단계입니다." },
      { t: "페인포인트 도출", d: "인터뷰·실사에서 나온 불편·비효율·오류(예: 입금확인 수작업, 이중입력)를 목록으로 뽑고 우선순위를 매깁니다. 이것이 개선 대상 후보가 됩니다." },
    ] },
  { id: "P2", name: "요구사항 확정 (CRD)", weeks: "2주", who: "공동",
    plain: "무엇을 만들지 고객사와 합의해 확정합니다. 이때부터 범위를 변경통제로 관리합니다.",
    outputs: ["CRD 고객요구정의서"], gate: "요구사항 승인",
    activities: [
      { t: "요구사항 정의", d: "'이렇게 되면 좋겠다'를 구체적이고 검증 가능한 문장으로 정리합니다. 예: '입금 확인을 가상계좌로 자동 매칭한다'. 애매한 바람을 명확한 요건으로 바꾸는 단계입니다." },
      { t: "우선순위 합의", d: "모든 걸 한 번에 할 수 없으니 무엇을 먼저 할지 고객사와 정합니다. 효과가 크고 급한 것부터(예: 입금 자동화 1순위) 순서를 잡습니다." },
      { t: "범위 baseline 확정", d: "이번 프로젝트에서 '할 것'과 '안 할 것'의 경계를 확정해 문서로 고정합니다. 이후 추가 요청은 변경통제 절차로 관리해 일정·비용이 흔들리지 않게 합니다." },
    ] },
  { id: "P3", name: "설계 (PRD·SRD)", weeks: "3~4주", who: "수행사 중심",
    plain: "확정된 요구를 어떻게 구현할지 설계합니다. 화면·연동·권한·데이터를 그립니다.",
    outputs: ["PRD 제품요구서", "SRD 시스템요구서"], gate: "설계 승인",
    activities: [
      { t: "TO-BE 프로세스 설계", d: "개선된 미래의 업무 흐름을 새로 그립니다. AS-IS의 불편을 없앤 '앞으로 이렇게 일한다'의 청사진입니다." },
      { t: "시스템·연동 아키텍처", d: "어떤 시스템이 어떤 데이터를 주고받을지 전체 구조도를 그립니다. 이카운트↔통합허브↔플레이오토처럼 연결 방식과 주기를 정의합니다." },
      { t: "권한·계정(IAM) 설계", d: "누가 무엇을 보고/입력/승인할 수 있는지 역할별 권한을 설계합니다. 예: 회계직원은 입금, 지사는 자기 발주만. 보안·내부통제의 핵심입니다." },
      { t: "화면·데이터 설계", d: "실제 사용할 화면 레이아웃과 저장할 데이터 항목(테이블)을 설계합니다. 개발자가 그대로 만들 수 있는 수준의 도면을 만듭니다." },
    ] },
  { id: "P4", name: "구축 (Build)", weeks: "8~12주", who: "수행사 중심",
    plain: "실제로 만듭니다. 시스템 연동·데이터 표준화·자체개발·통합 대시보드를 구축합니다.",
    outputs: ["구축 산출물", "단위기능"], gate: "기능 데모",
    activities: [
      { t: "이카운트·플레이오토 등 연동", d: "각 시스템의 API로 데이터를 자동으로 주고받도록 연결 프로그램을 개발합니다. 사람이 옮겨 적던 일을 시스템이 대신하게 만듭니다." },
      { t: "기준정보(MDM) 정비", d: "거래처·품목 등 마스터 데이터의 코드를 하나의 기준으로 통일·정리합니다. 시스템마다 다른 이름·코드를 맞춰야 데이터가 섞이지 않습니다." },
      { t: "지구별 자체개발", d: "시판 솔루션으로 안 되는 지구별닷컴 필요 기능(공급사 발주·송장회신·매입정산)을 직접 개발합니다." },
      { t: "통합 대시보드", d: "회사 전체의 데이터 흐름·현황(주문·발주·입금·재고 등)을 한 화면에서 보는 경영 대시보드를 만듭니다." },
      { t: "가상계좌·입금 자동매칭", d: "거래처별 가상계좌를 발급해, 입금이 들어오면 자동으로 어느 주문 건인지 매칭합니다. 수작업 입금확인을 없애는 기능입니다." },
    ] },
  { id: "P5", name: "테스트", weeks: "3~4주", who: "고객사 검수",
    plain: "제대로 동작하는지 검증합니다. 실제 담당자가 직접 써보고 확인(UAT)합니다.",
    outputs: ["테스트 결과서", "UAT 확인서"], gate: "UAT 합격",
    activities: [
      { t: "단위·통합 테스트", d: "만든 기능을 하나씩(단위), 그리고 서로 연결해서(통합) 정상 동작하는지 개발팀이 검증합니다." },
      { t: "UAT 고객검수", d: "실제 업무 담당자가 직접 써보며 '내 업무가 되는지' 확인하는 최종 사용자 테스트(UAT)입니다. 현장 기준으로 합격·불합격을 판단합니다." },
      { t: "결함 수정", d: "테스트에서 나온 오류·미흡한 점을 고칩니다. 고치고 다시 확인하는 과정을 합격할 때까지 반복합니다." },
      { t: "성능·보안 점검", d: "사용자가 몰릴 때 느려지지 않는지(성능), 권한 없는 접근이 막히는지(보안)를 점검합니다." },
    ] },
  { id: "P6", name: "전환·안정화", weeks: "3~4주", who: "공동",
    plain: "실제 운영으로 넘깁니다. 데이터를 이관하고 초기 안정화(Hypercare)와 보완을 합니다.",
    outputs: ["이관 결과", "운영 매뉴얼"], gate: "운영 안정화 확인",
    activities: [
      { t: "데이터 이관", d: "기존 시스템의 실제 데이터(거래처·재고·미수금 등)를 새 시스템으로 옮깁니다. 누락·중복 없이 정확히 넘기는 것이 관건입니다." },
      { t: "컷오버(전환)", d: "옛 방식을 끄고 새 시스템으로 실제 운영을 전환하는 순간입니다. 주말·마감 후처럼 업무 영향이 적은 시점에 계획적으로 진행합니다." },
      { t: "Hypercare 안정화", d: "전환 직후 일정 기간 집중 지원합니다. 현장에서 나오는 문의·문제를 즉시 대응해 빠르게 안정화합니다." },
      { t: "수정·보완", d: "운영하며 발견되는 개선점을 다듬습니다. 계약상 하자보수·보완 범위 안에서 처리합니다." },
      { t: "운영 인수인계", d: "시스템 운영 방법과 매뉴얼을 고객사(또는 운영팀)에 넘겨, 스스로 운영할 수 있게 합니다." },
    ] },
];
interface Q { id: string; phase: string; domain: string; q: string; doc: string; section: string; }
const QUESTIONS: Q[] = [
  { id: "ac1", phase: "P1", domain: "회계", q: "입금 확인을 지금 어떻게 처리하나요? 하루 몇 건이고 한 건당 얼마나 걸리나요?", doc: "CRD", section: "AS-IS·페인(입금)" },
  { id: "ac2", phase: "P1", domain: "회계", q: "월마감·정산 마감 절차와 담당·소요 시간은 어떻게 되나요?", doc: "CRD", section: "마감 프로세스" },
  { id: "ac3", phase: "P1", domain: "회계", q: "이카운트에서 더존으로 어떤 데이터를 언제(주기) 넘기나요? 지금은 어떻게 하나요?", doc: "SRD", section: "더존 배치 연동" },
  { id: "or1", phase: "P1", domain: "발주·영업", q: "지사 발주는 어떤 경로로 접수되나요?(온라인/게시판/전화) 비중은?", doc: "CRD", section: "발주 채널" },
  { id: "or2", phase: "P1", domain: "발주·영업", q: "거래처(지사/기관)별 공급가(공급률) 차등이 있나요? 어떻게 관리하나요?", doc: "PRD", section: "가격엔진" },
  { id: "or3", phase: "P1", domain: "발주·영업", q: "본사가 출판사·공급사에 발주하는 절차와 발주서 양식은 어떻게 되나요?", doc: "CRD", section: "공급사 발주(지구별)" },
  { id: "cs1", phase: "P1", domain: "CS·반품", q: "반품 신청부터 환불까지 단계·담당·필요 서류는 어떻게 되나요?", doc: "PRD", section: "반품 워크플로우" },
  { id: "cs2", phase: "P1", domain: "CS·반품", q: "고객 문의는 어디로(채널) 들어오고 SLA(응대 기한) 기준이 있나요?", doc: "CRD", section: "CS 현황·SLA" },
  { id: "lo1", phase: "P1", domain: "물류", q: "송장은 어떻게 발급·입력하나요? 사용 택배사(로젠·CJ 등)와 반품 송장은?", doc: "SRD", section: "송장·택배 연동" },
  { id: "br1", phase: "P1", domain: "지사(외부)", q: "지사는 어떤 계정으로 어디에 로그인하나요?(발주 사이트/책별 홈페이지 각각)", doc: "SRD", section: "IAM·접근경로" },
  { id: "br2", phase: "P1", domain: "지사(외부)", q: "지사별 공급가가 다른 지사에게 노출되면 안 되나요?(비노출 요건)", doc: "PRD", section: "가격 비노출" },
  { id: "jg1", phase: "P1", domain: "지구별닷컴", q: "지구별닷컴은 어느 공급사에서 어떻게 사입/위탁하나요? 공급사 수는?", doc: "CRD", section: "유통 AS-IS(지구별)" },
  { id: "jg2", phase: "P1", domain: "지구별닷컴", q: "발주모아 기능 중 지구별닷컴에 실제 필요한 것은 무엇인가요?(발주·송장·매입정산)", doc: "PRD", section: "지구별 자체개발 범위" },
  { id: "pm1", phase: "P1", domain: "권한·계정", q: "역할(경영·회계·영업·CS·물류·시스템관리)별로 무엇을 보고/처리/승인해야 하나요?", doc: "SRD", section: "역할×시스템 권한" },
  { id: "pm2", phase: "P1", domain: "권한·계정", q: "입력자와 승인자를 분리해야 하는 업무(회계 마감·환불 등)는 무엇인가요?", doc: "SRD", section: "승인 체계" },
  { id: "dt1", phase: "P1", domain: "데이터", q: "거래처(원/지사/기관)·품목이 시스템마다 코드가 다른가요? 통합 기준은?", doc: "SRD", section: "MDM·마이그레이션" },
  { id: "dt2", phase: "P1", domain: "데이터", q: "최근 3개월 월 주문/발주 건수·반품률·문의량은 대략 얼마인가요?", doc: "기획서", section: "효과 baseline" },
  { id: "st1", phase: "P0", domain: "전략", q: "이번 구축에서 가장 먼저 해결되길 바라는 것(1순위)은 무엇인가요?", doc: "기획서", section: "목표·우선순위" },
  { id: "st2", phase: "P0", domain: "전략", q: "성공을 무엇으로 판단하시겠어요?(예: 입금확인 시간, 미수금, 리드타임)", doc: "기획서", section: "성공기준(KPI)" },
];
const DOCS = ["기획서", "CRD", "PRD", "SRD"];

// ── Postgres 저장 ────────────────────────────────────────────────
interface AnswerRow { question_id: string; answer: string; respondent: string | null; role: string | null; created_at: Date; }
let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS piaget_portal_answers (
           id BIGSERIAL PRIMARY KEY,
           question_id TEXT NOT NULL,
           phase TEXT, domain TEXT, question TEXT,
           answer TEXT NOT NULL,
           respondent TEXT, role TEXT, auth_user TEXT,
           doc TEXT, section TEXT,
           created_at TIMESTAMPTZ NOT NULL DEFAULT now()
         )`,
      )
      .then(() => undefined)
      .catch((err: Error) => {
        tableReady = null;
        throw err;
      });
  }
  return tableReady;
}
function fmtTs(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
async function listAnswers(): Promise<Array<{ questionId: string; answer: string; respondent: string; role: string; ts: string }>> {
  await ensureTable();
  const r = await getPool().query<AnswerRow>(
    "SELECT question_id, answer, respondent, role, created_at FROM piaget_portal_answers ORDER BY id",
  );
  return r.rows.map((row) => ({
    questionId: row.question_id,
    answer: row.answer,
    respondent: row.respondent ?? "",
    role: row.role ?? "",
    ts: fmtTs(new Date(row.created_at)),
  }));
}
async function buildDoc(type: string): Promise<string> {
  await ensureTable();
  const r = await getPool().query<AnswerRow>(
    "SELECT question_id, answer, respondent, role, created_at FROM piaget_portal_answers WHERE doc = $1 ORDER BY id",
    [type],
  );
  const bySection: Record<string, Array<{ q: string; row: AnswerRow }>> = {};
  for (const row of r.rows) {
    const q = QUESTIONS.find((x) => x.id === row.question_id);
    if (!q) continue;
    (bySection[q.section] ||= []).push({ q: q.q, row });
  }
  const titleMap: Record<string, string> = {
    기획서: "한국삐아제 ERP 구축 기획서 (자동 조립 초안)",
    CRD: "고객 요구사항 정의서 (CRD)",
    PRD: "제품 요구사항 정의서 (PRD)",
    SRD: "시스템 요구사항 정의서 (SRD)",
  };
  let md = `# ${titleMap[type] ?? type}\n\n> 협업 포털 응답 기반 자동 조립 · 응답 ${r.rows.length}건\n\n`;
  const sections = Object.keys(bySection);
  if (!sections.length) return md + "_아직 이 문서로 매핑된 응답이 없습니다. 질문에 답하면 자동으로 채워집니다._\n";
  for (const s of sections) {
    md += `## ${s}\n`;
    for (const { q, row } of bySection[s]!) {
      md += `- **${q}**\n  - ${row.answer}  \n  - _(${row.respondent || "익명"}${row.role ? "·" + row.role : ""} · ${fmtTs(new Date(row.created_at))})_\n`;
    }
    md += "\n";
  }
  return md;
}

// ── 라우터 ───────────────────────────────────────────────────────
export const piagetPortalRouter = Router();

function serveApp(req: Request, res: Response): void {
  res.type("html").send(currentUser(req) ? PORTAL_HTML : LOGIN_HTML);
}

// piaget 호스트의 루트, 또는 어느 호스트든 /piaget 경로로 프리뷰
piagetPortalRouter.get("/", (req: Request, res: Response, next: NextFunction) => {
  if (isPiagetHost(req)) return serveApp(req, res);
  next();
});
piagetPortalRouter.get(["/piaget", "/piaget/"], (req: Request, res: Response) => serveApp(req, res));

// 로그인/로그아웃
piagetPortalRouter.post("/piaget/api/login", (req: Request, res: Response) => {
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
  if (username && checkPass(username, password ?? "")) {
    const secure = String(req.headers["x-forwarded-proto"] ?? "").includes("https");
    res.cookie("sid", makeToken(username), {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 86_400_000,
    });
    res.json({ ok: true, user: username, role: USERS[username]!.role });
    return;
  }
  res.status(401).json({ ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." });
});
piagetPortalRouter.post("/piaget/api/logout", (_req: Request, res: Response) => {
  res.clearCookie("sid", { path: "/" });
  res.json({ ok: true });
});

// 보호 API
function requireUser(req: Request, res: Response): string | null {
  const u = currentUser(req);
  if (!u) {
    res.status(401).json({ ok: false, error: "auth" });
    return null;
  }
  return u;
}
piagetPortalRouter.get("/piaget/api/state", async (req: Request, res: Response) => {
  const u = requireUser(req, res);
  if (!u) return;
  try {
    const answers = await listAnswers();
    res.json({ ok: true, user: u, role: USERS[u]!.role, phases: PHASES, questions: QUESTIONS, docs: DOCS, answers });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});
piagetPortalRouter.post("/piaget/api/answer", async (req: Request, res: Response) => {
  const u = requireUser(req, res);
  if (!u) return;
  const { questionId, answer, respondent, role } = (req.body ?? {}) as {
    questionId?: string; answer?: string; respondent?: string; role?: string;
  };
  const q = QUESTIONS.find((x) => x.id === questionId);
  if (!q || !answer) {
    res.status(400).json({ ok: false, error: "질문/응답 누락" });
    return;
  }
  try {
    await ensureTable();
    await getPool().query(
      `INSERT INTO piaget_portal_answers
         (question_id, phase, domain, question, answer, respondent, role, auth_user, doc, section)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [q.id, q.phase, q.domain, q.q, answer, respondent || u, role || "", u, q.doc, q.section],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});
piagetPortalRouter.get("/piaget/api/doc/:type", async (req: Request, res: Response) => {
  const u = requireUser(req, res);
  if (!u) return;
  if (USERS[u]?.role !== "admin") {
    res.status(403).json({ ok: false, error: "admin 전용" });
    return;
  }
  try {
    res.json({ ok: true, type: req.params.type, md: await buildDoc(req.params.type) });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});
