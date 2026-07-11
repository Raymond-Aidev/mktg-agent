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
  { id: "P0", name: "계약·착수", goal: "범위·조직·포털 오픈", weeks: "~2주" },
  { id: "P1", name: "Discovery(진단)", goal: "현업 인터뷰·업무파악·실사", weeks: "3~4주" },
  { id: "P2", name: "요구사항(CRD)", goal: "고객 요구사항 확정", weeks: "2주" },
  { id: "P3", name: "설계(PRD·SRD)", goal: "TO-BE·아키텍처·권한", weeks: "3~4주" },
  { id: "P4", name: "구축(Build)", goal: "연동·MDM·자체개발·대시보드", weeks: "8~12주" },
  { id: "P5", name: "테스트", goal: "단위·통합·UAT", weeks: "3~4주" },
  { id: "P6", name: "전환·수정보완", goal: "이관·컷오버·Hypercare", weeks: "3~4주" },
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
