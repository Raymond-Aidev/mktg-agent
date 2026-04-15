import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiAuthMe,
  apiChangePassword,
  apiForgotPassword,
  apiLogin,
  apiLogout,
  apiRegister,
  apiResendCode,
  apiUpdateProfile,
  apiResetPassword,
  apiVerifyEmail,
  EmailNotVerifiedError,
  clearToken,
  getToken,
  fetchProducts,
  createProduct,
  fetchProductDetail,
  deleteProduct,
  addKeyword,
  removeKeyword,
  fetchBuyers,
  fetchChannels,
  fetchCompetitors,
  fetchKpis,
  fetchOperatorOverview,
  fetchOverview,
  fetchSignalcraftJob,
  generateAction,
  runSignalcraft,
  type ActionResult,
  type ApiKeyword,
  type ApiProduct,
  type AuthUser,
  type Buyer,
  type ChannelData,
  type CompetitorData,
  type DashboardKpis,
  type DashboardOverview,
  type OperatorOverview,
  type SignalcraftJob,
  fetchAdminUsers,
  fetchAdminStats,
  createAdminUser,
  updateUserRole,
  deleteAdminUser,
  type AdminUser,
  type AdminStats,
  fetchTimeline,
  triggerAnalyze,
  type TimelineResponse,
} from "./api.ts";

const DEFAULT_TENANT = "00000000-0000-0000-0000-0000000000ee";

/* ══════════════════════ Types & Demo Data ══════════════════════ */

type View =
  | { screen: "landing" }
  | { screen: "products" }
  | { screen: "product-detail"; productId: string; isDemo?: boolean }
  | { screen: "keyword-report"; productId: string; keywordId: string; isDemo?: boolean }
  | {
      screen: "keyword-timeline";
      productId: string;
      keywordId: string;
      keywordName: string;
    }
  | { screen: "sample" }
  | { screen: "settings" }
  | { screen: "admin" };

const SAMPLE_REPORT_ID = "1ddac365-4031-4d55-ad25-8e1b400137c1";

interface DemoKeyword {
  id: string;
  keyword: string;
  searchVolume: number;
  sentimentScore: number;
  postCount30d: number;
  trendDirection: "up" | "flat" | "down";
  competitorDensity: "low" | "medium" | "high";
  recommendation: "invest" | "maintain" | "abandon";
  lastAnalyzed: string | null;
  reportId: string | null;
}

interface DemoProduct {
  id: string;
  name: string;
  description: string;
  keywords: DemoKeyword[];
}

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: "prod-1",
    name: "토토LP 교육",
    description: "LP레코드 기반 유아 영어 교육 프로그램 — 촉각 학습 + AI 발음 분석",
    keywords: [
      {
        id: "kw-1a",
        keyword: "키즈 LP 토토",
        searchVolume: 9400,
        sentimentScore: 0.52,
        postCount30d: 187,
        trendDirection: "up",
        competitorDensity: "low",
        recommendation: "invest",
        lastAnalyzed: "2026-04-14T06:00:00Z",
        reportId: "demo",
      },
      {
        id: "kw-1b",
        keyword: "한국삐아제",
        searchVolume: 22000,
        sentimentScore: 0.61,
        postCount30d: 520,
        trendDirection: "up",
        competitorDensity: "low",
        recommendation: "invest",
        lastAnalyzed: "2026-04-13T10:00:00Z",
        reportId: null,
      },
      {
        id: "kw-1c",
        keyword: "토토LP 후기",
        searchVolume: 6800,
        sentimentScore: 0.48,
        postCount30d: 210,
        trendDirection: "up",
        competitorDensity: "low",
        recommendation: "invest",
        lastAnalyzed: "2026-04-13T08:00:00Z",
        reportId: null,
      },
      {
        id: "kw-1d",
        keyword: "토토LP 단점",
        searchVolume: 4200,
        sentimentScore: 0.22,
        postCount30d: 145,
        trendDirection: "up",
        competitorDensity: "low",
        recommendation: "maintain",
        lastAnalyzed: "2026-04-12T14:00:00Z",
        reportId: null,
      },
      {
        id: "kw-1e",
        keyword: "유아 오디오 교구",
        searchVolume: 15600,
        sentimentScore: 0.55,
        postCount30d: 380,
        trendDirection: "up",
        competitorDensity: "high",
        recommendation: "invest",
        lastAnalyzed: "2026-04-12T10:00:00Z",
        reportId: null,
      },
      {
        id: "kw-1f",
        keyword: "동화 카드 플레이어",
        searchVolume: 8900,
        sentimentScore: 0.58,
        postCount30d: 195,
        trendDirection: "flat",
        competitorDensity: "high",
        recommendation: "maintain",
        lastAnalyzed: "2026-04-11T09:00:00Z",
        reportId: null,
      },
      {
        id: "kw-1g",
        keyword: "말하는 카드 교구",
        searchVolume: 5300,
        sentimentScore: 0.54,
        postCount30d: 125,
        trendDirection: "up",
        competitorDensity: "medium",
        recommendation: "invest",
        lastAnalyzed: "2026-04-10T16:00:00Z",
        reportId: null,
      },
      {
        id: "kw-1h",
        keyword: "유아 음악 교구 추천",
        searchVolume: 12400,
        sentimentScore: 0.62,
        postCount30d: 310,
        trendDirection: "up",
        competitorDensity: "high",
        recommendation: "invest",
        lastAnalyzed: "2026-04-10T14:00:00Z",
        reportId: null,
      },
      {
        id: "kw-1i",
        keyword: "두돌 세돌 교구 추천",
        searchVolume: 19800,
        sentimentScore: 0.65,
        postCount30d: 440,
        trendDirection: "up",
        competitorDensity: "medium",
        recommendation: "invest",
        lastAnalyzed: "2026-04-09T11:00:00Z",
        reportId: null,
      },
      {
        id: "kw-1j",
        keyword: "누리과정 교구",
        searchVolume: 7200,
        sentimentScore: 0.58,
        postCount30d: 165,
        trendDirection: "flat",
        competitorDensity: "medium",
        recommendation: "maintain",
        lastAnalyzed: "2026-04-08T09:00:00Z",
        reportId: null,
      },
    ],
  },
  {
    id: "prod-2",
    name: "초등 영어 말하기 캠프",
    description: "초등 3-6학년 대상 영어 스피킹 집중 캠프",
    keywords: [
      {
        id: "kw-2a",
        keyword: "초등 영어캠프",
        searchVolume: 12400,
        sentimentScore: 0.62,
        postCount30d: 340,
        trendDirection: "up",
        competitorDensity: "high",
        recommendation: "invest",
        lastAnalyzed: "2026-04-11T09:00:00Z",
        reportId: null,
      },
      {
        id: "kw-2b",
        keyword: "어린이 영어 말하기",
        searchVolume: 5800,
        sentimentScore: 0.45,
        postCount30d: 120,
        trendDirection: "flat",
        competitorDensity: "medium",
        recommendation: "maintain",
        lastAnalyzed: "2026-04-09T14:00:00Z",
        reportId: null,
      },
      {
        id: "kw-2c",
        keyword: "초등 스피킹 학원",
        searchVolume: 7200,
        sentimentScore: 0.55,
        postCount30d: 185,
        trendDirection: "up",
        competitorDensity: "high",
        recommendation: "invest",
        lastAnalyzed: "2026-04-10T10:00:00Z",
        reportId: null,
      },
      {
        id: "kw-2d",
        keyword: "영어캠프 후기",
        searchVolume: 4300,
        sentimentScore: 0.68,
        postCount30d: 95,
        trendDirection: "flat",
        competitorDensity: "medium",
        recommendation: "maintain",
        lastAnalyzed: "2026-04-07T16:00:00Z",
        reportId: null,
      },
    ],
  },
  {
    id: "prod-3",
    name: "수학 사고력 워크북",
    description: "초등 저학년 수학 사고력 향상 워크북 시리즈",
    keywords: [
      {
        id: "kw-3a",
        keyword: "초등 사고력 수학",
        searchVolume: 18500,
        sentimentScore: 0.51,
        postCount30d: 420,
        trendDirection: "up",
        competitorDensity: "high",
        recommendation: "invest",
        lastAnalyzed: "2026-04-12T08:00:00Z",
        reportId: null,
      },
      {
        id: "kw-3b",
        keyword: "수학 워크북 추천",
        searchVolume: 9200,
        sentimentScore: 0.58,
        postCount30d: 210,
        trendDirection: "flat",
        competitorDensity: "high",
        recommendation: "maintain",
        lastAnalyzed: "2026-04-10T12:00:00Z",
        reportId: null,
      },
      {
        id: "kw-3c",
        keyword: "저학년 수학 문제집",
        searchVolume: 11000,
        sentimentScore: 0.42,
        postCount30d: 280,
        trendDirection: "down",
        competitorDensity: "high",
        recommendation: "maintain",
        lastAnalyzed: "2026-04-09T09:00:00Z",
        reportId: null,
      },
      {
        id: "kw-3d",
        keyword: "영재 수학 교재",
        searchVolume: 3800,
        sentimentScore: 0.35,
        postCount30d: 65,
        trendDirection: "down",
        competitorDensity: "medium",
        recommendation: "abandon",
        lastAnalyzed: "2026-04-06T14:00:00Z",
        reportId: null,
      },
    ],
  },
  {
    id: "prod-4",
    name: "그림책 정기구독 박스",
    description: "0-6세 연령별 큐레이션 그림책 월간 배송",
    keywords: [
      {
        id: "kw-4a",
        keyword: "그림책 구독 서비스",
        searchVolume: 7600,
        sentimentScore: 0.65,
        postCount30d: 190,
        trendDirection: "up",
        competitorDensity: "medium",
        recommendation: "invest",
        lastAnalyzed: "2026-04-11T11:00:00Z",
        reportId: null,
      },
      {
        id: "kw-4b",
        keyword: "유아 그림책 추천",
        searchVolume: 22000,
        sentimentScore: 0.55,
        postCount30d: 510,
        trendDirection: "flat",
        competitorDensity: "high",
        recommendation: "invest",
        lastAnalyzed: "2026-04-10T09:00:00Z",
        reportId: null,
      },
      {
        id: "kw-4c",
        keyword: "아기 보드북",
        searchVolume: 15800,
        sentimentScore: 0.48,
        postCount30d: 380,
        trendDirection: "flat",
        competitorDensity: "high",
        recommendation: "maintain",
        lastAnalyzed: "2026-04-09T15:00:00Z",
        reportId: null,
      },
      {
        id: "kw-4d",
        keyword: "그림책 선물세트",
        searchVolume: 5400,
        sentimentScore: 0.6,
        postCount30d: 130,
        trendDirection: "up",
        competitorDensity: "low",
        recommendation: "invest",
        lastAnalyzed: "2026-04-08T10:00:00Z",
        reportId: null,
      },
      {
        id: "kw-4e",
        keyword: "창작 동화책",
        searchVolume: 4100,
        sentimentScore: 0.3,
        postCount30d: 70,
        trendDirection: "down",
        competitorDensity: "medium",
        recommendation: "abandon",
        lastAnalyzed: "2026-04-04T14:00:00Z",
        reportId: null,
      },
    ],
  },
];

/* ══════════════════════ Utilities ══════════════════════ */

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}
function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}
function formatInt(value: number): string {
  return value.toLocaleString();
}
function formatKrw(value: number): string {
  return `${Math.round(value).toLocaleString()} KRW`;
}

function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString();
}

function sentimentColor(score: number): string {
  if (score >= 0.5) return "var(--success)";
  if (score >= 0.3) return "var(--warning)";
  return "var(--danger)";
}

/* ══════════════════════ Toast ══════════════════════ */

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}
let toastIdSeq = 0;
let globalToastFn: ((message: string, type?: ToastType) => void) | null = null;

/** 어디서든 호출 가능한 전역 토스트 */
function showGlobalToast(message: string, type: ToastType = "success") {
  globalToastFn?.(message, type);
}

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = ++toastIdSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  useEffect(() => {
    globalToastFn = show;
    return () => {
      globalToastFn = null;
    };
  }, [show]);

  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════ App Root ══════════════════════ */

export function App() {
  const [tenantId, setTenantId] = useState(DEFAULT_TENANT);
  const hasToken = !!getToken();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(hasToken);
  const [view, setView] = useState<View>({ screen: "landing" });
  const { toasts } = useToast();

  // 페이지 새로고침 시 JWT에서 사용자 정보 복원
  useEffect(() => {
    if (hasToken && !authUser) {
      apiAuthMe()
        .then((user) => {
          if (user) {
            setAuthUser(user);
            setTenantId(user.tenantId);
          } else {
            setView({ screen: "landing" });
          }
        })
        .finally(() => setAuthLoading(false));
    }
  }, []);

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
    setTenantId(user.tenantId);
    // 로그인 후 랜딩 페이지 유지 — 대시보드 탭 클릭 시 이동
  };

  const handleLogout = () => {
    apiLogout();
    setAuthUser(null);
    setView({ screen: "landing" });
  };

  const currentProduct =
    view.screen === "product-detail" || view.screen === "keyword-report"
      ? (DEMO_PRODUCTS.find((p) => p.id === view.productId) ?? null)
      : null;
  const currentKeyword =
    view.screen === "keyword-report" && currentProduct
      ? (currentProduct.keywords.find((k) => k.id === view.keywordId) ?? null)
      : null;

  // ── 로그인 모달 상태 (App 레벨) ──
  const [showLogin, setShowLogin] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const urlResetToken = new URLSearchParams(window.location.search).get("resetToken");
  const [resetMode, setResetMode] = useState<"off" | "request" | "token" | "done">(
    urlResetToken ? "token" : "off",
  );
  const [resetToken, setResetToken] = useState(urlResetToken ?? "");
  const [verifyMode, setVerifyMode] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPasswordConfirm, setLoginPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (urlResetToken) {
      setShowLogin(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [urlResetToken]);

  const closeModal = () => {
    setShowLogin(false);
    setVerifyMode(false);
    setVerifyEmail("");
    setVerifyCode("");
    setResetMode("off");
    setResetToken("");
    setAuthError(null);
    setAuthSuccess(null);
  };

  const openLogin = (register = false) => {
    closeModal();
    setShowLogin(true);
    setIsRegister(register);
  };

  const goBackToLogin = () => {
    setResetMode("off");
    setResetToken("");
    setLoginPassword("");
    setAuthError(null);
    setAuthSuccess(null);
  };

  const enterDemo = () => {
    closeModal();
    clearToken();
    handleLogin({
      id: "demo",
      tenantId: DEFAULT_TENANT,
      email: "demo@goldencheck.kr",
      name: "Demo User",
      role: "owner",
    });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if ((isRegister || resetMode === "token") && loginPassword !== loginPasswordConfirm) {
      setAuthError("비밀번호가 일치하지 않습니다");
      return;
    }
    setLoginLoading(true);
    try {
      if (verifyMode) {
        const res = await apiVerifyEmail(verifyEmail, verifyCode);
        closeModal();
        handleLogin(res.user);
        return;
      }
      if (resetMode === "request") {
        await apiForgotPassword(loginEmail);
        setAuthSuccess("재설정 링크가 이메일로 발송되었습니다");
        setResetMode("token");
      } else if (resetMode === "token") {
        await apiResetPassword(resetToken, loginPassword);
        setAuthSuccess("비밀번호가 변경되었습니다. 로그인하세요.");
        setResetMode("done");
      } else if (isRegister) {
        const regRes = await apiRegister(loginEmail, loginPassword, loginName || undefined);
        if (regRes.requireVerification) {
          setVerifyMode(true);
          setVerifyEmail(regRes.email);
          setAuthSuccess("인증 코드가 이메일로 발송되었습니다");
        }
      } else {
        const res = await apiLogin(loginEmail, loginPassword);
        closeModal();
        handleLogin(res.user);
      }
    } catch (err) {
      if (err instanceof EmailNotVerifiedError) {
        setVerifyMode(true);
        setVerifyEmail(err.email);
        setAuthSuccess("이메일 인증이 필요합니다. 인증 코드를 발송했습니다.");
        return;
      }
      setAuthError((err as Error).message);
    } finally {
      setLoginLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div
        className="app"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <p style={{ color: "#999" }}>로딩 중...</p>
      </div>
    );
  }

  const isLanding = view.screen === "landing";

  return (
    <div className={isLanding ? "landing" : "app"}>
      <ToastContainer toasts={toasts} />

      {/* ── 통합 네비게이션 ── */}
      <nav className={isLanding ? "landing-nav" : "global-nav"}>
        <div className="nav-left">
          <span
            className="nav-logo"
            onClick={() => {
              setView({ screen: "landing" });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{ cursor: "pointer" }}
          >
            <img src="/favicon.svg" alt="" className="nav-logo-icon" />
            GoldenCheck
          </span>
        </div>
        <div className={isLanding ? "landing-nav-links" : "nav-links"}>
          {authUser ? (
            <>
              <span
                className={`nav-link ${view.screen === "products" || view.screen === "product-detail" || view.screen === "keyword-timeline" ? "nav-active" : ""}`}
                onClick={() => setView({ screen: "products" })}
              >
                대시보드
              </span>
              <span
                className={`nav-link ${view.screen === "sample" ? "nav-active" : ""}`}
                onClick={() => setView({ screen: "sample" })}
              >
                분석 샘플
              </span>
              <span
                className={`nav-link ${view.screen === "settings" ? "nav-active" : ""}`}
                onClick={() => setView({ screen: "settings" })}
              >
                설정
              </span>
              {authUser.role === "admin" && (
                <span
                  className={`nav-link ${view.screen === "admin" ? "nav-active" : ""}`}
                  onClick={() => setView({ screen: "admin" })}
                >
                  관리자
                </span>
              )}
            </>
          ) : (
            <>
              <a href="#features">기능</a>
              <a href="#sample">분석 샘플</a>
              <a href="#pricing">요금제</a>
              <a href="#faq">FAQ</a>
            </>
          )}
        </div>
        <div className="nav-right">
          {authUser ? (
            <>
              <span className="nav-user">{authUser.name ?? authUser.email}</span>
              <button type="button" className="nav-logout" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <button type="button" className="btn-login" onClick={() => openLogin(false)}>
              로그인
            </button>
          )}
        </div>
      </nav>

      {/* ── 로그인/회원가입 모달 ── */}
      {showLogin && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {verifyMode
                ? "이메일 인증"
                : resetMode !== "off"
                  ? "비밀번호 재설정"
                  : isRegister
                    ? "회원가입"
                    : "로그인"}
            </h2>
            <form className="login-form" onSubmit={handleAuthSubmit}>
              {verifyMode && (
                <>
                  <p style={{ fontSize: 14, color: "#666", margin: "0 0 12px" }}>
                    <strong>{verifyEmail}</strong>로 발송된 6자리 인증 코드를 입력하세요.
                  </p>
                  <label>인증 코드</label>
                  <input
                    type="text"
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    maxLength={6}
                    style={{ textAlign: "center", letterSpacing: 8, fontSize: 20, fontWeight: 700 }}
                  />
                  {authError && <div className="auth-error">{authError}</div>}
                  {authSuccess && (
                    <div className="auth-error" style={{ color: "#059669", background: "#d1fae5" }}>
                      {authSuccess}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn-primary-lg"
                    disabled={loginLoading || verifyCode.length !== 6}
                  >
                    {loginLoading ? "처리 중..." : "인증 완료"}
                  </button>
                  <p className="login-sub">
                    <span
                      className="link"
                      onClick={async () => {
                        setAuthError(null);
                        await apiResendCode(verifyEmail);
                        setAuthSuccess("인증 코드를 재발송했습니다");
                      }}
                    >
                      인증 코드 재발송
                    </span>
                  </p>
                </>
              )}
              {!verifyMode && resetMode === "request" && (
                <>
                  <p style={{ fontSize: 14, color: "#666", margin: "0 0 12px" }}>
                    가입한 이메일을 입력하면 재설정 링크를 보내드립니다.
                  </p>
                  <label>이메일</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </>
              )}
              {!verifyMode && resetMode === "token" && (
                <>
                  <p style={{ fontSize: 14, color: "#666", margin: "0 0 12px" }}>
                    이메일로 받은 재설정 코드와 새 비밀번호를 입력하세요.
                  </p>
                  <label>재설정 코드</label>
                  <input
                    type="text"
                    placeholder="이메일에서 받은 코드를 붙여넣기"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                  />
                  <label>새 비밀번호</label>
                  <div className="pw-field">
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="8자 이상, 대소문자+숫자+특수문자"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                      {showPw ? "숨기기" : "보기"}
                    </button>
                  </div>
                  <label>비밀번호 확인</label>
                  <div className="pw-field">
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="비밀번호를 다시 입력"
                      value={loginPasswordConfirm}
                      onChange={(e) => setLoginPasswordConfirm(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                </>
              )}
              {!verifyMode && resetMode === "done" && (
                <p style={{ fontSize: 14, color: "#666", margin: "0 0 12px" }}>
                  비밀번호가 변경되었습니다. 아래 버튼을 눌러 로그인하세요.
                </p>
              )}
              {!verifyMode && resetMode === "off" && (
                <>
                  {isRegister && (
                    <>
                      <label>이름</label>
                      <input
                        type="text"
                        placeholder="홍길동"
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                      />
                    </>
                  )}
                  <label>이메일</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                  <label>비밀번호</label>
                  <div className="pw-field">
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder={
                        isRegister ? "8자 이상, 대소문자+숫자+특수문자" : "비밀번호 입력"
                      }
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      minLength={isRegister ? 8 : 1}
                    />
                    <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                      {showPw ? "숨기기" : "보기"}
                    </button>
                  </div>
                  {isRegister && (
                    <>
                      <ul className="pw-rules">
                        <li className={loginPassword.length >= 8 ? "pw-ok" : ""}>8자 이상</li>
                        <li className={/[a-z]/.test(loginPassword) ? "pw-ok" : ""}>소문자</li>
                        <li className={/[A-Z]/.test(loginPassword) ? "pw-ok" : ""}>대문자</li>
                        <li className={/[0-9]/.test(loginPassword) ? "pw-ok" : ""}>숫자</li>
                        <li className={/[^a-zA-Z0-9]/.test(loginPassword) ? "pw-ok" : ""}>
                          특수문자
                        </li>
                      </ul>
                      <label>비밀번호 확인</label>
                      <div className="pw-field">
                        <input
                          type={showPw ? "text" : "password"}
                          placeholder="비밀번호를 다시 입력"
                          value={loginPasswordConfirm}
                          onChange={(e) => setLoginPasswordConfirm(e.target.value)}
                          required
                          minLength={8}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
              {!verifyMode && authError && <div className="auth-error">{authError}</div>}
              {!verifyMode && authSuccess && (
                <div className="auth-error" style={{ color: "#059669", background: "#d1fae5" }}>
                  {authSuccess}
                </div>
              )}
              {!verifyMode &&
                (resetMode === "done" ? (
                  <button type="button" className="btn-primary-lg" onClick={goBackToLogin}>
                    로그인으로 돌아가기
                  </button>
                ) : (
                  <button type="submit" className="btn-primary-lg" disabled={loginLoading}>
                    {loginLoading
                      ? "처리 중..."
                      : resetMode === "request"
                        ? "재설정 링크 보내기"
                        : resetMode === "token"
                          ? "비밀번호 변경"
                          : isRegister
                            ? "가입하기"
                            : "로그인"}
                  </button>
                ))}
              {!verifyMode && resetMode !== "off" && resetMode !== "done" && (
                <p className="login-sub">
                  <span className="link" onClick={goBackToLogin}>
                    로그인으로 돌아가기
                  </span>
                </p>
              )}
              {!verifyMode && resetMode === "off" && (
                <>
                  <p className="login-sub">
                    {isRegister ? (
                      <>
                        이미 계정이 있으신가요?{" "}
                        <span
                          className="link"
                          onClick={() => {
                            setIsRegister(false);
                            setAuthError(null);
                          }}
                        >
                          로그인
                        </span>
                      </>
                    ) : (
                      <>
                        계정이 없으신가요?{" "}
                        <span
                          className="link"
                          onClick={() => {
                            setIsRegister(true);
                            setAuthError(null);
                          }}
                        >
                          회원가입
                        </span>
                      </>
                    )}
                  </p>
                  {!isRegister && (
                    <p className="login-sub">
                      <span
                        className="link"
                        onClick={() => {
                          setResetMode("request");
                          setAuthError(null);
                          setAuthSuccess(null);
                        }}
                      >
                        비밀번호를 잊으셨나요?
                      </span>
                    </p>
                  )}
                </>
              )}
              <p className="login-sub">
                <span className="link" onClick={enterDemo}>
                  데모 모드로 둘러보기
                </span>
              </p>
            </form>
            <button type="button" className="modal-close" onClick={closeModal}>
              x
            </button>
          </div>
        </div>
      )}

      {/* ── 메인 콘텐츠 영역 ── */}
      {isLanding && <LandingContent onOpenLogin={openLogin} />}

      {!isLanding && (
        <div className="app-body">
          {view.screen === "products" && (
            <ProductsGrid
              tenantId={tenantId}
              demoProducts={DEMO_PRODUCTS}
              onSelect={(id, isDemo) =>
                setView({ screen: "product-detail", productId: id, isDemo })
              }
            />
          )}

          {view.screen === "product-detail" && view.isDemo && currentProduct && (
            <ProductDetail
              product={currentProduct}
              onKeywordSelect={(kwId) =>
                setView({
                  screen: "keyword-report",
                  productId: currentProduct.id,
                  keywordId: kwId,
                  isDemo: true,
                })
              }
            />
          )}

          {view.screen === "product-detail" && !view.isDemo && (
            <RealProductDetail
              tenantId={tenantId}
              productId={view.productId}
              onKeywordSelect={(kwId, kwName) =>
                setView({
                  screen: "keyword-timeline",
                  productId: view.productId,
                  keywordId: kwId,
                  keywordName: kwName,
                })
              }
            />
          )}

          {view.screen === "keyword-report" && view.isDemo && currentProduct && currentKeyword && (
            <KeywordReportView keyword={currentKeyword} tenantId={tenantId} />
          )}

          {view.screen === "keyword-report" && !view.isDemo && (
            <KeywordReportView
              keyword={{
                id: view.keywordId,
                keyword: view.keywordId,
                searchVolume: 0,
                sentimentScore: 0,
                postCount30d: 0,
                trendDirection: "flat",
                competitorDensity: "medium",
                recommendation: "maintain",
                lastAnalyzed: null,
                reportId: null,
              }}
              tenantId={tenantId}
            />
          )}

          {view.screen === "keyword-timeline" && (
            <KeywordTimelineView
              tenantId={tenantId}
              productId={view.productId}
              keywordId={view.keywordId}
              keywordName={view.keywordName}
              onBack={() => setView({ screen: "product-detail", productId: view.productId })}
            />
          )}

          {view.screen === "admin" && authUser?.role === "admin" && <AdminPanel />}

          {view.screen === "settings" && authUser && (
            <SettingsPage user={authUser} onUpdate={(u) => setAuthUser(u)} />
          )}

          {view.screen === "sample" && <SampleReportView />}
        </div>
      )}

      <footer className={isLanding ? "landing-footer" : "app-footer"}>
        <div className="footer-left">GoldenCheck &copy; 2026</div>
        <div className="footer-links">
          <a href="/terms">이용약관</a>
          <a href="/privacy">개인정보처리방침</a>
          <a href="/about">사업자 정보</a>
          <a href="mailto:konnect-operation@konnect-ai.net">문의</a>
        </div>
      </footer>
    </div>
  );
}

/* ══════════════════════ Landing Content ══════════════════════ */

function LandingContent({ onOpenLogin }: { onOpenLogin: (register?: boolean) => void }) {
  return (
    <>
      {/* ── Hero ── */}
      <section className="hero hero-dark">
        <div className="hero-badge">AI Marketing Agent</div>
        <h1>
          내 브랜드 전용
          <br />
          <span className="hero-accent">실시간 AI 마케팅 에이전트</span>
        </h1>
        <p className="hero-sub">
          DB 검색이 아닙니다. 내가 등록한 키워드를, AI가 직접 크롤링하고 분석합니다.
          <br />
          기존 서비스에 없는 데이터, 실시간 이슈, 경쟁사의 오늘 움직임까지.
        </p>
        <div className="hero-cta">
          <button type="button" className="btn-primary-lg" onClick={() => onOpenLogin(true)}>
            무료로 시작하기
          </button>
          <button
            type="button"
            className="btn-secondary-lg"
            onClick={() =>
              document.getElementById("sample")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            분석 샘플 보기
          </button>
        </div>
      </section>

      {/* ── Trust Stats ── */}
      <section className="trust-bar">
        <div className="trust-item">
          <div className="trust-value">39%</div>
          <div className="trust-label">SOV 점유율 분석</div>
        </div>
        <div className="trust-item">
          <div className="trust-value">6개</div>
          <div className="trust-label">AI 분석 모듈</div>
        </div>
        <div className="trust-item">
          <div className="trust-value">실시간</div>
          <div className="trust-label">크롤링 & 분석</div>
        </div>
        <div className="trust-item">
          <div className="trust-value">10분</div>
          <div className="trust-label">리포트 자동 생성</div>
        </div>
      </section>

      {/* ── Problem / Contrast ── */}
      <section className="contrast-section" id="features">
        <h2>왜 기존 서비스로는 부족한가?</h2>
        <p className="section-desc">월 15만원대 마케팅 인텔리전스 서비스와 비교해 보세요.</p>
        <div className="contrast-grid">
          <div className="contrast-col contrast-old">
            <div className="contrast-header">기존 서비스 (DB 검색형)</div>
            <div className="contrast-item">서비스사가 미리 수집한 DB 안에서만 검색 가능</div>
            <div className="contrast-item">내 제품에 맞는 키워드 커스텀 불가</div>
            <div className="contrast-item">이미 지난 데이터 기반, 실시간 분석 불가</div>
            <div className="contrast-item">모든 고객이 같은 DB, 같은 분석 틀</div>
          </div>
          <div className="contrast-col contrast-new">
            <div className="contrast-header">마케팅 AI 에이전트 (실시간 크롤링)</div>
            <div className="contrast-item">내가 등록한 키워드를 AI가 즉시 직접 크롤링</div>
            <div className="contrast-item">제품명, 경쟁사, 연관 키워드 완전 맞춤 설정</div>
            <div className="contrast-item">분석 요청 즉시 크롤링 실행 — 진짜 실시간 데이터</div>
            <div className="contrast-item">내 브랜드 전용 AI 에이전트 — 리포트 포맷까지 커스텀</div>
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="how-section" id="how">
        <h2>이렇게 작동합니다</h2>
        <p className="section-desc">설정 한 번으로, 매일 자동 분석 리포트를 받아보세요.</p>
        <div className="steps-grid">
          <div className="step-card step-card-1">
            <div className="step-num">01</div>
            <h3>키워드 설정</h3>
            <p>제품명 + 연관 키워드 직접 등록</p>
            <div className="step-example">
              예: &apos;토토LP 교육&apos;
              <br />
              + 파닉스 / 촉각학습 / 유아영어
              <br />+ 경쟁사: 핑크퐁, 윤선생
            </div>
            <div className="step-result">내 브랜드 전용 에이전트 생성</div>
          </div>
          <div className="step-card step-card-2">
            <div className="step-num">02</div>
            <h3>AI 실시간 크롤링</h3>
            <p>등록 즉시 AI가 직접 수집 시작</p>
            <div className="step-example">
              네이버 뉴스/블로그/카페
              <br />
              커뮤니티/SNS/앱스토어 리뷰
              <br />
              경쟁사 콘텐츠 동시 수집
            </div>
            <div className="step-result">DB 검색이 아닌, 지금 이 순간 데이터</div>
          </div>
          <div className="step-card step-card-3">
            <div className="step-num">03</div>
            <h3>분석 리포트 수신</h3>
            <p>매일 아침 자동 리포트 도착</p>
            <div className="step-example">
              감성 분석 + SOV 점유율
              <br />
              경쟁사 갭 + 리스크 시그널
              <br />
              즉시 실행 콘텐츠 전략
            </div>
            <div className="step-result">읽고 바로 실행하는 액션 리포트</div>
          </div>
        </div>
      </section>

      {/* ── Live Sample Stats ── */}
      <section className="sample-section" id="sample">
        <h2>실제 분석 결과 샘플</h2>
        <p className="section-desc">
          키워드 &apos;토토LP 교육&apos;를 등록하고 AI 에이전트가 즉시 생성한 분석 결과입니다.
        </p>
        <div className="sample-stats">
          <div className="sample-stat">
            <div className="sample-stat-value">38%</div>
            <div className="sample-stat-label">SOV 점유율</div>
            <div className="sample-stat-sub">5개 경쟁 교구 대비 1위</div>
          </div>
          <div className="sample-stat">
            <div className="sample-stat-value">10개</div>
            <div className="sample-stat-label">연관 키워드</div>
            <div className="sample-stat-sub">제품·경쟁·잠재고객</div>
          </div>
          <div className="sample-stat">
            <div className="sample-stat-value">91건</div>
            <div className="sample-stat-label">가격 불만 언급</div>
            <div className="sample-stat-sub">전주 대비 1.8배</div>
          </div>
          <div className="sample-stat sample-stat-alert">
            <div className="sample-stat-value">47%</div>
            <div className="sample-stat-label">긍정률 최하위</div>
            <div className="sample-stat-sub">SOV 1위인데 긍정률 꼴찌</div>
          </div>
        </div>
        <div className="sample-insights">
          <div className="insight-card insight-risk">
            <div className="insight-tag">리스크 자동 감지</div>
            <p>
              &apos;세이펜은 5만원인데&apos; 가격 비교 불만 91건, &apos;토토LP 단점&apos; 검색 월
              4,200건 급증
            </p>
            <div className="insight-action">
              AI 즉시 권고: 3개월 무이자 할부 + 체험 후 구매 프로그램 + 윤선생 연 59만원 비교 메시지
            </div>
          </div>
          <div className="insight-card insight-gap">
            <div className="insight-tag">콘텐츠 갭 발견</div>
            <p>
              &apos;토토LP vs 세이펜&apos; 비교 질문 44건/주이나 공식 비교 콘텐츠 0건, SEO 미진입
            </p>
            <div className="insight-action">
              AI 즉시 권고: 연구 데이터 기반 비교 콘텐츠 발행 + &apos;두돌 교구 추천&apos; 19,800건
              키워드 선점
            </div>
          </div>
        </div>
        <div className="sample-report-cta">
          <a
            href={`/api/v1/reports/${SAMPLE_REPORT_ID}?format=html`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ width: "auto", padding: "14px 32px", fontSize: 15 }}
          >
            전체 분석 리포트 보기
          </a>
        </div>
        <iframe
          title="샘플 분석 리포트"
          className="sample-frame"
          src={`/api/v1/reports/${SAMPLE_REPORT_ID}?format=html`}
          style={{ maxWidth: 960, margin: "0 auto", display: "block" }}
        />
      </section>

      {/* ── Analysis Modules ── */}
      <section className="features">
        <h2>6개 AI 분석 모듈</h2>
        <p className="section-desc">
          키워드 등록 한 번으로 6가지 관점의 종합 분석을 자동 수행합니다.
        </p>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">01</div>
            <h3>거시 환경 분석</h3>
            <p>시장 트렌드, 정책 변화, 산업 동향을 자동으로 파악하고 기회와 위협을 식별합니다.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">02</div>
            <h3>감성 분석</h3>
            <p>
              네이버 뉴스/블로그/카페 여론의 긍정/부정/중립 비율과 핵심 키워드를 AI가 분석합니다.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">03</div>
            <h3>시장 인텔리전스</h3>
            <p>SOV 점유율, 경쟁 포지셔닝, 콘텐츠 갭, 리스크 시그널을 한 번에 분석합니다.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">04</div>
            <h3>실행 전략 생성</h3>
            <p>주간 콘텐츠 캘린더, 채널 우선순위, 메시지 전략을 데이터 기반으로 AI가 제안합니다.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">05</div>
            <h3>핵심 요약 리포트</h3>
            <p>Key Takeaways, 즉시 실행 과제, 리스크 완화 방안을 한 페이지로 요약합니다.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">06</div>
            <h3>통합 리포트</h3>
            <p>모든 모듈의 결과를 하나로 통합하여 컨설팅급 마케팅 리포트를 자동 생성합니다.</p>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="pricing-section" id="pricing">
        <h2>요금제</h2>
        <p className="section-desc">첫 분석 무료 — 키워드 등록 당일 결과를 확인하세요.</p>
        <div className="pricing-grid">
          <div className="price-card">
            <h3>Starter</h3>
            <div className="price">월 50만원</div>
            <ul>
              <li>제품 5개 / 키워드 20개</li>
              <li>월 10회 분석</li>
              <li>기본 리포트</li>
              <li>이메일 알림</li>
            </ul>
            <button type="button" className="btn-primary" onClick={() => onOpenLogin(true)}>
              시작하기
            </button>
          </div>
          <div className="price-card price-featured">
            <div className="price-badge">추천</div>
            <h3>Professional</h3>
            <div className="price">월 120만원</div>
            <ul>
              <li>제품 50개 / 키워드 300개</li>
              <li>무제한 분석</li>
              <li>통합 리포트 + 실행 전략</li>
              <li>리스크 시그널 실시간 알림</li>
              <li>전담 매니저</li>
            </ul>
            <button type="button" className="btn-primary" onClick={() => onOpenLogin(true)}>
              시작하기
            </button>
          </div>
          <div className="price-card">
            <h3>Enterprise</h3>
            <div className="price">문의</div>
            <ul>
              <li>무제한 제품 / 키워드</li>
              <li>API 연동 & 커스텀 리포트</li>
              <li>SLA 보장</li>
              <li>온프레미스 배포 옵션</li>
            </ul>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => (window.location.href = "mailto:konnect-operation@konnect-ai.net")}
            >
              문의하기
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="faq-section" id="faq">
        <h2>자주 묻는 질문</h2>
        <div className="faq-list">
          <details className="faq-item">
            <summary>기존 마케팅 인텔리전스 서비스와 뭐가 다른가요?</summary>
            <p>
              기존 서비스는 자사 DB에 수집된 데이터 안에서만 검색합니다. 마케팅 AI 에이전트는 내가
              정한 키워드를 AI가 직접 크롤링하므로, DB에 없는 데이터, 실시간 이슈, 경쟁사의 오늘
              움직임까지 놓치지 않습니다.
            </p>
          </details>
          <details className="faq-item">
            <summary>분석에 얼마나 걸리나요?</summary>
            <p>
              키워드 등록 후 약 10분 내외로 수집부터 6개 AI 모듈 분석, 통합 리포트 생성까지
              완료됩니다.
            </p>
          </details>
          <details className="faq-item">
            <summary>어떤 데이터를 수집하나요?</summary>
            <p>
              네이버 뉴스, 블로그, 카페, 커뮤니티, SNS, 앱스토어 리뷰 등 공개 게시물을 수집합니다.
              비공개 글이나 개인정보는 수집하지 않습니다.
            </p>
          </details>
          <details className="faq-item">
            <summary>경쟁사 분석도 가능한가요?</summary>
            <p>
              네. SOV 점유율 분석, 경쟁사 갭 분석, 포지셔닝 맵을 통해 경쟁 브랜드 대비 우리의 위치와
              공략 기회를 실시간으로 파악할 수 있습니다.
            </p>
          </details>
          <details className="faq-item">
            <summary>교육 업종 외에도 사용할 수 있나요?</summary>
            <p>
              현재는 교육 콘텐츠/출판 유통사에 최적화되어 있으며, 향후 다른 업종으로 확장할
              예정입니다.
            </p>
          </details>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="cta-section">
        <h2>
          지금 키워드를 등록하면,
          <br />
          오늘 분석 결과를 받으실 수 있습니다
        </h2>
        <div className="cta-benefits">
          <span>첫 분석 무료</span>
          <span>약정 없음</span>
          <span>완전 맞춤 설정</span>
          <span>기존 서비스 대비 직접 비교 환영</span>
        </div>
        <button type="button" className="btn-primary-lg" onClick={() => onOpenLogin(true)}>
          무료 체험 시작하기
        </button>
      </section>
    </>
  );
}

/* ══════════════════════ Breadcrumb ══════════════════════ */

/* ══════════════════════ Products Grid ══════════════════════ */

function ProductsGrid({
  tenantId,
  demoProducts,
  onSelect,
}: {
  tenantId: string;
  demoProducts: DemoProduct[];
  onSelect: (id: string, isDemo: boolean) => void;
}) {
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);

  const loadProducts = useCallback(() => {
    setLoading(true);
    fetchProducts(tenantId)
      .then(setApiProducts)
      .catch((err: unknown) => showGlobalToast((err as Error).message, "error"))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createProduct(tenantId, newName.trim(), newDesc.trim() || undefined);
      setNewName("");
      setNewDesc("");
      setShowAdd(false);
      loadProducts();
    } catch {
      /* ignore */
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!confirm("이 제품을 삭제하시겠습니까?")) return;
    await deleteProduct(tenantId, productId).catch((err: unknown) =>
      showGlobalToast((err as Error).message, "error"),
    );
    loadProducts();
  };

  return (
    <>
      <div className="page-title">
        <h2>대시보드</h2>
        <p>제품별 키워드 성과를 모니터링하고 투자 전략을 수립하세요.</p>
      </div>

      {apiProducts.length > 0 && (
        <>
          <h3 className="section-label">등록된 제품</h3>
          <div className="products-grid">
            {apiProducts.map((p) => (
              <div key={p.id} className="product-card" onClick={() => onSelect(p.id, false)}>
                <h3>{p.name}</h3>
                <p className="product-desc">{p.description ?? ""}</p>
                <div className="product-meta">
                  <span className="product-kw-count">{p.keyword_count}개 키워드</span>
                </div>
                <button
                  type="button"
                  className="card-delete-btn"
                  onClick={(e) => handleDelete(e, p.id)}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="add-product-row">
        {!showAdd ? (
          <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
            + 제품 추가
          </button>
        ) : (
          <form className="add-product-form" onSubmit={handleAdd}>
            <input
              type="text"
              placeholder="제품명"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="설명 (선택)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={adding}>
              {adding ? "추가 중..." : "추가"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>
              취소
            </button>
          </form>
        )}
      </div>

      {demoProducts.length > 0 && (
        <>
          <h3 className="section-label">샘플 제품 (데모)</h3>
          <div className="products-grid">
            {demoProducts.map((p) => {
              const kwCount = p.keywords.length;
              return (
                <div
                  key={p.id}
                  className="product-card product-card-demo"
                  onClick={() => onSelect(p.id, true)}
                >
                  <h3>{p.name}</h3>
                  <p className="product-desc">{p.description}</p>
                  <div className="product-meta">
                    <span className="product-kw-count">{kwCount}개 키워드</span>
                    <span className="demo-badge">데모</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {loading && <div className="status-loading">불러오는 중...</div>}
    </>
  );
}

/* ══════════════════════ Product Detail ══════════════════════ */

type SortKey =
  | "keyword"
  | "searchVolume"
  | "sentimentScore"
  | "postCount30d"
  | "trendDirection"
  | "recommendation";

function ProductDetail({
  product,
  onKeywordSelect,
}: {
  product: DemoProduct;
  onKeywordSelect: (kwId: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("recommendation");
  const [sortAsc, setSortAsc] = useState(true);

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const recOrder: Record<string, number> = { invest: 0, maintain: 1, abandon: 2 };
  const trendOrder: Record<string, number> = { up: 0, flat: 1, down: 2 };

  const sorted = [...product.keywords].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "keyword":
        cmp = a.keyword.localeCompare(b.keyword);
        break;
      case "searchVolume":
        cmp = a.searchVolume - b.searchVolume;
        break;
      case "sentimentScore":
        cmp = a.sentimentScore - b.sentimentScore;
        break;
      case "postCount30d":
        cmp = a.postCount30d - b.postCount30d;
        break;
      case "trendDirection":
        cmp = (trendOrder[a.trendDirection] ?? 1) - (trendOrder[b.trendDirection] ?? 1);
        break;
      case "recommendation":
        cmp = (recOrder[a.recommendation] ?? 1) - (recOrder[b.recommendation] ?? 1);
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const investCount = product.keywords.filter((k) => k.recommendation === "invest").length;
  const maintainCount = product.keywords.filter((k) => k.recommendation === "maintain").length;
  const abandonCount = product.keywords.filter((k) => k.recommendation === "abandon").length;
  const avgSentiment =
    product.keywords.reduce((s, k) => s + k.sentimentScore, 0) / product.keywords.length;
  const upCount = product.keywords.filter((k) => k.trendDirection === "up").length;

  const recLabel: Record<string, string> = { invest: "투자", maintain: "유지", abandon: "철수" };
  const trendLabel: Record<string, string> = { up: "상승", flat: "보합", down: "하락" };
  const densityLabel: Record<string, string> = { low: "낮음", medium: "보통", high: "높음" };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className={`sortable ${sortKey === field ? "sort-active" : ""}`}
      onClick={() => onSort(field)}
    >
      {label} {sortKey === field ? (sortAsc ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <>
      <div className="page-title">
        <h2>{product.name}</h2>
        <p>{product.description}</p>
      </div>

      <div className="summary-strip">
        <div className="summary-item">
          <div className="summary-value">{product.keywords.length}</div>
          <div className="summary-label">전체 키워드</div>
        </div>
        <div className="summary-item">
          <div className="summary-value" style={{ color: "var(--success)" }}>
            {investCount}
          </div>
          <div className="summary-label">투자 권장</div>
        </div>
        <div className="summary-item">
          <div className="summary-value" style={{ color: "var(--warning)" }}>
            {maintainCount}
          </div>
          <div className="summary-label">유지</div>
        </div>
        <div className="summary-item">
          <div className="summary-value" style={{ color: "var(--danger)" }}>
            {abandonCount}
          </div>
          <div className="summary-label">철수 권장</div>
        </div>
        <div className="summary-item">
          <div className="summary-value">{(avgSentiment * 100).toFixed(0)}%</div>
          <div className="summary-label">평균 감성</div>
        </div>
        <div className="summary-item">
          <div className="summary-value" style={{ color: "var(--success)" }}>
            {upCount}
          </div>
          <div className="summary-label">상승 트렌드</div>
        </div>
      </div>

      <section className="panel">
        <h2>키워드 포트폴리오</h2>
        <table className="portfolio-table">
          <thead>
            <tr>
              <SortHeader label="키워드" field="keyword" />
              <SortHeader label="검색량" field="searchVolume" />
              <SortHeader label="언급(30일)" field="postCount30d" />
              <SortHeader label="감성" field="sentimentScore" />
              <SortHeader label="트렌드" field="trendDirection" />
              <th>경쟁</th>
              <SortHeader label="판단" field="recommendation" />
              <th>최근 분석</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((kw) => (
              <tr key={kw.id} className="portfolio-row" onClick={() => onKeywordSelect(kw.id)}>
                <td className="kw-name">{kw.keyword}</td>
                <td className="num">{kw.searchVolume.toLocaleString()}</td>
                <td className="num">{kw.postCount30d}</td>
                <td>
                  <div className="sentiment-mini">
                    <div
                      className="sentiment-mini-bar"
                      style={{
                        width: `${kw.sentimentScore * 100}%`,
                        background: sentimentColor(kw.sentimentScore),
                      }}
                    />
                  </div>
                  <span className="sentiment-mini-val">
                    {(kw.sentimentScore * 100).toFixed(0)}%
                  </span>
                </td>
                <td>
                  <span className={`trend-indicator trend-${kw.trendDirection}`}>
                    {kw.trendDirection === "up" ? "▲" : kw.trendDirection === "down" ? "▼" : "—"}{" "}
                    {trendLabel[kw.trendDirection]}
                  </span>
                </td>
                <td>
                  <span className={`density-badge density-${kw.competitorDensity}`}>
                    {densityLabel[kw.competitorDensity]}
                  </span>
                </td>
                <td>
                  <span className={`rec-badge rec-${kw.recommendation}`}>
                    {recLabel[kw.recommendation]}
                  </span>
                </td>
                <td className="date-cell">{relativeDate(kw.lastAnalyzed)}</td>
                <td>
                  <button
                    type="button"
                    className="table-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onKeywordSelect(kw.id);
                    }}
                  >
                    분석 보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

/* ══════════════════════ Real Product Detail (API) ══════════════════════ */

function RealProductDetail({
  tenantId,
  productId,
  onKeywordSelect,
}: {
  tenantId: string;
  productId: string;
  onKeywordSelect: (kwId: string, kwName: string) => void;
}) {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [keywords, setKeywords] = useState<ApiKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddKw, setShowAddKw] = useState(false);
  const [newKw, setNewKw] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchProductDetail(tenantId, productId)
      .then((d) => {
        setProduct(d.product);
        setKeywords(d.keywords);
      })
      .catch((err: unknown) => showGlobalToast((err as Error).message, "error"))
      .finally(() => setLoading(false));
  }, [tenantId, productId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddKw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKw.trim()) return;
    setAdding(true);
    try {
      await addKeyword(tenantId, productId, newKw.trim());
      setNewKw("");
      setShowAddKw(false);
      load();
    } catch {
      /* ignore */
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveKw = async (e: React.MouseEvent, kwId: string) => {
    e.stopPropagation();
    await removeKeyword(tenantId, productId, kwId).catch((err: unknown) =>
      showGlobalToast((err as Error).message, "error"),
    );
    load();
  };

  if (loading) return <div className="status-loading">불러오는 중...</div>;
  if (!product) return <div className="status-error">제품을 찾을 수 없습니다.</div>;

  return (
    <>
      <div className="page-title">
        <h2>{product.name}</h2>
        <p>{product.description ?? ""}</p>
      </div>

      <div className="summary-strip">
        <div className="summary-item">
          <div className="summary-value">{keywords.length}</div>
          <div className="summary-label">키워드</div>
        </div>
        <div className="summary-item">
          <div className="summary-value">{keywords.filter((k) => k.last_analyzed).length}</div>
          <div className="summary-label">분석 완료</div>
        </div>
      </div>

      <section className="panel">
        <div className="op-header">
          <h2>키워드 목록</h2>
          {!showAddKw ? (
            <button type="button" onClick={() => setShowAddKw(true)}>
              + 키워드 추가
            </button>
          ) : (
            <form className="inline-form" onSubmit={handleAddKw}>
              <input
                type="text"
                placeholder="키워드 입력"
                value={newKw}
                onChange={(e) => setNewKw(e.target.value)}
                required
              />
              <button type="submit" disabled={adding}>
                {adding ? "..." : "추가"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddKw(false)}>
                취소
              </button>
            </form>
          )}
        </div>

        {keywords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">+</div>
            <p>등록된 키워드가 없습니다</p>
            <p className="empty-sub">키워드를 추가하면 여론 분석을 시작할 수 있습니다.</p>
          </div>
        ) : (
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>키워드</th>
                <th className="num">언급(30일)</th>
                <th>최근 분석</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw) => (
                <tr
                  key={kw.id}
                  className="portfolio-row"
                  onClick={() => onKeywordSelect(kw.id, kw.keyword)}
                >
                  <td className="kw-name">{kw.keyword}</td>
                  <td className="num">{kw.post_count_30d}</td>
                  <td className="date-cell">{relativeDate(kw.last_analyzed)}</td>
                  <td>
                    <button
                      type="button"
                      className="table-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onKeywordSelect(kw.id, kw.keyword);
                      }}
                    >
                      분석
                    </button>
                    <button
                      type="button"
                      className="table-delete-btn"
                      onClick={(e) => handleRemoveKw(e, kw.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

/* ══════════════════════ Keyword Timeline View ══════════════════════ */

function KeywordTimelineView({
  tenantId,
  productId,
  keywordId,
  keywordName,
  onBack,
}: {
  tenantId: string;
  productId: string;
  keywordId: string;
  keywordName: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const from = new Date(Date.now() - range * 86400000).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    fetchTimeline(tenantId, productId, keywordId, from, to)
      .then(setData)
      .catch((err: unknown) => showGlobalToast((err as Error).message, "error"))
      .finally(() => setLoading(false));
  }, [tenantId, productId, keywordId, range]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await triggerAnalyze(tenantId, productId, keywordId);
      showGlobalToast(`분석 시작됨 (Job: ${res.jobId.slice(0, 8)}...)`, "info");
      // 10초 후 자동 새로고침
      setTimeout(load, 10000);
    } catch (err: unknown) {
      showGlobalToast((err as Error).message, "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const points = data?.dataPoints ?? [];
  const summary = data?.summary;

  // 간단한 바 차트 — 순수 CSS
  const maxMention = Math.max(...points.map((p) => p.mention_count), 1);

  return (
    <>
      <div className="page-title">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            ← 목록
          </button>
          <h2 style={{ margin: 0 }}>{keywordName}</h2>
        </div>
        <p>시계열 분석 추이 — 감성, SOV, 언급량 변화를 추적합니다.</p>
      </div>

      {/* 기간 선택 + 분석 버튼 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {([7, 30, 90] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={range === r ? "btn-primary" : "btn-secondary"}
              style={{ padding: "6px 16px", fontSize: 13, borderRadius: 20 }}
              onClick={() => setRange(r)}
            >
              {r}일
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={handleAnalyze}
          disabled={analyzing}
          style={{ padding: "8px 20px", fontSize: 13 }}
        >
          {analyzing ? "분석 중..." : "지금 분석하기"}
        </button>
      </div>

      {loading ? (
        <div className="status-loading">불러오는 중...</div>
      ) : points.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">~</div>
          <p>아직 분석 데이터가 없습니다</p>
          <p className="empty-sub">"지금 분석하기"를 누르면 첫 분석이 시작됩니다.</p>
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          {summary && (
            <div className="summary-strip" style={{ marginBottom: 24 }}>
              <div className="summary-item">
                <div className="summary-value">{(summary.avgSentiment * 100).toFixed(1)}%</div>
                <div className="summary-label">평균 긍정률</div>
              </div>
              <div className="summary-item">
                <div
                  className="summary-value"
                  style={{
                    color:
                      summary.sentimentTrend === "up"
                        ? "var(--success)"
                        : summary.sentimentTrend === "down"
                          ? "var(--danger)"
                          : "var(--text-muted)",
                  }}
                >
                  {summary.sentimentTrend === "up"
                    ? "▲ 상승"
                    : summary.sentimentTrend === "down"
                      ? "▼ 하락"
                      : "— 안정"}
                </div>
                <div className="summary-label">감성 추이</div>
              </div>
              <div className="summary-item">
                <div className="summary-value">
                  {summary.sovChange >= 0 ? "+" : ""}
                  {(summary.sovChange * 100).toFixed(1)}%p
                </div>
                <div className="summary-label">SOV 변화</div>
              </div>
              <div className="summary-item">
                <div className="summary-value">{formatInt(summary.totalMentions)}</div>
                <div className="summary-label">총 언급</div>
              </div>
            </div>
          )}

          {/* 감성 추이 차트 */}
          <section className="panel" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>감성 분석 추이</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {points.map((p) => {
                const pos = Number(p.sentiment_positive) * 100;
                const neg = Number(p.sentiment_negative) * 100;
                const neu = Number(p.sentiment_neutral) * 100;
                return (
                  <div
                    key={p.snapshot_date}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
                  >
                    <span style={{ width: 72, color: "var(--text-muted)", flexShrink: 0 }}>
                      {p.snapshot_date.slice(5)}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        height: 18,
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pos}%`,
                          background: "var(--success)",
                          transition: "width 0.3s",
                        }}
                        title={`긍정 ${pos.toFixed(1)}%`}
                      />
                      <div
                        style={{
                          width: `${neg}%`,
                          background: "var(--danger)",
                          transition: "width 0.3s",
                        }}
                        title={`부정 ${neg.toFixed(1)}%`}
                      />
                      <div
                        style={{
                          width: `${neu}%`,
                          background: "#d1d5db",
                          transition: "width 0.3s",
                        }}
                        title={`중립 ${neu.toFixed(1)}%`}
                      />
                    </div>
                    <span
                      style={{
                        width: 48,
                        textAlign: "right",
                        fontWeight: 600,
                        color: "var(--success)",
                      }}
                    >
                      {pos.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 언급량 바 차트 */}
          <section className="panel" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>일별 언급량</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {points.map((p) => (
                <div
                  key={p.snapshot_date}
                  style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
                >
                  <span style={{ width: 72, color: "var(--text-muted)", flexShrink: 0 }}>
                    {p.snapshot_date.slice(5)}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      background: "var(--bg-subtle)",
                      borderRadius: 4,
                      height: 18,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(p.mention_count / maxMention) * 100}%`,
                        height: "100%",
                        background: "var(--accent)",
                        borderRadius: 4,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  <span style={{ width: 40, textAlign: "right", fontWeight: 600 }}>
                    {p.mention_count}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* SOV 추이 */}
          <section className="panel" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>SOV 점유율 추이</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {points.map((p) => {
                const sov = Number(p.sov_share) * 100;
                return (
                  <div
                    key={p.snapshot_date}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
                  >
                    <span style={{ width: 72, color: "var(--text-muted)", flexShrink: 0 }}>
                      {p.snapshot_date.slice(5)}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        background: "var(--bg-subtle)",
                        borderRadius: 4,
                        height: 18,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${sov}%`,
                          height: "100%",
                          background: "#3b82f6",
                          borderRadius: 4,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    <span style={{ width: 48, textAlign: "right", fontWeight: 600 }}>
                      {sov.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 데이터 테이블 */}
          <section className="panel">
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>일별 상세</h3>
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th className="num">게시물</th>
                  <th className="num">긍정</th>
                  <th className="num">부정</th>
                  <th className="num">SOV</th>
                  <th className="num">리스크</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((p) => (
                  <tr key={p.snapshot_date}>
                    <td>{p.snapshot_date}</td>
                    <td className="num">{p.post_count}</td>
                    <td className="num" style={{ color: "var(--success)" }}>
                      {(Number(p.sentiment_positive) * 100).toFixed(0)}%
                    </td>
                    <td className="num" style={{ color: "var(--danger)" }}>
                      {(Number(p.sentiment_negative) * 100).toFixed(0)}%
                    </td>
                    <td className="num">{(Number(p.sov_share) * 100).toFixed(1)}%</td>
                    <td className="num">{p.risk_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  );
}

/* ══════════════════════ Demo Report View (시드 데이터 기반) ══════════════════════ */

const DEMO_REPORT_SECTIONS = [
  {
    id: "section-1",
    title: "판매사 브리핑 — 핵심 요약",
    sourceModule: "#08",
    content:
      "키즈LP토토(한국삐아제), 유아 오디오 교구 시장 SOV 1위 — 10개 연관검색어 통합 분석 결과, '높은 인지도 + 낮은 긍정률'이라는 구조적 취약점 확인\n\n[매출 기회 규모] 10개 키워드 월간 총 검색량 111,700건. 이 중 구매 의향 키워드(후기·추천·비교) 비중 62% → 월 약 69,000건의 잠재 구매 검색 유입 가능\n[핵심 지표] 브랜드 검색('한국삐아제') 22,000건 vs 제품 검색('키즈LP토토') 9,400건 → 제품명 인지도 갭 57%. 브랜드 자산이 제품 구매로 전환되지 못하는 구간 존재\n[구매 퍼널 병목] '토토LP 후기'(6,800건) → '토토LP 단점'(4,200건) 전환율 62% → 후기 탐색자 중 62%가 단점 검색으로 이탈하는 구매 장벽 발생\n[미포획 시장] '두돌 세돌 교구 추천'(19,800건), '말하는 카드 교구'(5,300건), '누리과정 교구'(7,200건) — 합계 32,300건의 잠재 고객이 토토LP를 인지하지 못함\n[경쟁 포지션] '유아 오디오 교구' 카테고리 SOV 38% 1위이나 긍정률 47%로 최하위. '동화 카드 플레이어' 시장에서는 세이펜이 SEO 1위 장악\n[30일 매출 영향 예측] 10개 키워드 SEO/SEM 최적화 시 월 예상 유입 +12,400건, 전환율 3.2% 적용 시 월 추가 판매 약 397세트 (약 5,870만원 매출 증가 잠재력)",
  },
  {
    id: "section-2",
    title: "구매 퍼널 분석 — 검색에서 구매까지",
    sourceModule: "#01",
    content:
      "◆ 1단계: 인지 (Awareness) — 월 합산 64,500건\n  '유아 오디오 교구' 15,600건 | '유아 음악 교구 추천' 12,400건 | '두돌 세돌 교구 추천' 19,800건 | '누리과정 교구' 7,200건 | '말하는 카드 교구' 5,300건 | '동화 카드 플레이어' 8,900건\n  → 이 단계에서 토토LP 노출률 약 18% — 경쟁사 세이펜(34%) 대비 절반 수준\n  → 시사점: 카테고리 검색에서 토토LP가 선택지에 오르지 못하는 '인지 사각지대' 존재\n\n◆ 2단계: 탐색 (Consideration) — 월 합산 31,400건\n  '한국삐아제' 22,000건 | '키즈 LP 토토' 9,400건\n  → 브랜드를 아는 사람은 많지만, 제품명을 직접 검색하는 비율은 43%에 불과\n  → 시사점: '한국삐아제' 검색자 중 토토LP 제품 페이지 도달률 추정 28% — 브랜드 → 제품 전환 최적화 필요\n\n◆ 3단계: 비교/평가 (Evaluation) — 월 합산 11,000건\n  '토토LP 후기' 6,800건 | '토토LP 단점' 4,200건\n  → 후기 검색 대비 단점 검색 비율 62% — 업계 평균(35~40%) 대비 1.6배 높음\n  → 시사점: 구매 직전 이탈률이 경쟁사 대비 비정상적으로 높음. 가격·품질 불만이 주 원인\n\n◆ 퍼널 전체 전환율 추정\n  인지(64,500) → 탐색(31,400) → 비교(11,000) → 구매(추정 350~400건/월)\n  전체 전환율: 0.54~0.62% — 업계 평균(1.2%) 대비 절반 수준\n  → 최대 개선 지점: 2단계→3단계 전환 (비교 시 이탈 방지가 매출 직결)",
  },
  {
    id: "section-3",
    title: "감성 분석 — 키워드별 고객 심리",
    sourceModule: "#03",
    content:
      "종합 감성: 긍정 47% · 부정 31% · 중립 22%\n\n[키워드별 감성 온도 차이 — 판매 전략 핵심]\n• '키즈 LP 토토' (감성 52%) — 제품 경험자 중심, 긍정·부정 혼재. '아이가 좋아한다'(84건) vs '비싸다'(91건) 격전\n• '한국삐아제' (감성 61%) — 브랜드 신뢰 기반 높음. '교육 철학이 좋다'(72건), '오래된 브랜드라 안심'(58건)\n• '토토LP 후기' (감성 48%) — 구매 직전 탐색자. 긍정 후기 부족이 전환 장벽. 영상 후기 비율 12%로 경쟁사 대비 열세\n• '토토LP 단점' (감성 22%) — 부정 감성 집중. 가격(91건), 내구성(38건), 추가비용(45건) 3대 불만\n• '유아 오디오 교구' (감성 55%) — 카테고리 전체 호감. 토토LP 외 세이펜·핑크퐁 동시 언급 빈번\n• '동화 카드 플레이어' (감성 58%) — 형태 유사 교구 탐색. 세이펜 호환 도서 관련 긍정 높음\n• '말하는 카드 교구' (감성 54%) — 태블릿 대체 교구 수요. '스크린 없는 교구' 관련 긍정 상승세\n• '유아 음악 교구 추천' (감성 62%) — 구매 비교 단계. 가성비 중심 평가, 토토LP 노출 부족\n• '두돌 세돌 교구 추천' (감성 65%) — 구매 의향 가장 높은 키워드. 추천 요청 게시물 활발\n• '누리과정 교구' (감성 58%) — B2B 수요. 교사·원장 중심 전문적 평가\n\n[판매 시사점]\n• 긍정률이 가장 높은 키워드(두돌 세돌 65%, 음악 교구 62%)에 토토LP 노출이 가장 적음 → 즉각 SEO 투자 필요\n• 부정률이 높은 '단점' 키워드(22%)가 후기 키워드 대비 검색량 62% → 부정 여론 관리 시급",
  },
  {
    id: "section-4",
    title: "시장 변곡점 — 판매 영향 이벤트",
    sourceModule: "#01",
    content:
      "[2026-04-11] 서울시교육청 누리과정 연계 교구 선정 — 유치원 50곳 채택\n  판매 영향: B2B 단가 대량 구매(세트 12만원 × 평균 5세트 = 60만원/원) → '누리과정 교구' 키워드 검색량 1.4배 증가\n  액션: '교육부 인증' 뱃지 네이버 쇼핑 상세페이지 최상단 배치\n\n[2026-04-09] 유아교육연구소 '오디오 교구 어휘 유지율 28% 향상' 논문 발표\n  판매 영향: 프리미엄 가격 정당화 핵심 근거 확보. '유아 오디오 교구' 키워드 긍정 감성 3%p 상승\n  액션: 논문 핵심 수치를 상세페이지·블로그·광고 소재에 즉시 반영\n\n[2026-04-08] 한국삐아제 프리A 15억 투자 유치 발표\n  판매 영향: '한국삐아제' 검색량 일시 1.8배 급증, 기업 신뢰도 상승\n  액션: 투자 소식을 '브랜드 안정성' 메시지와 연결 — '15억 투자받은 교육 기업의 대표 교구'\n\n[2026-04-06] 소비자원 상담 건수 전월 대비 40% 증가 (플레이어 품질·AS)\n  판매 영향: '토토LP 단점' 검색 급증(+1.8배), 네이버 쇼핑 별점 4.2→3.6\n  액션: 48시간 이내 공식 대응 + 2년 무상 보증 정책 발표 → 부정 확산 차단\n\n[2026-04-04] 교보문고 키즈 체험존 사전예약 1일 500건 돌파\n  판매 영향: 오프라인 체험 수요 검증. 체험→구매 전환율 추정 35~40%\n  액션: 체험존 확대(이마트·영풍문고) + 체험 후 온라인 구매 시 LP카드 3장 추가 증정\n\n[2026-04-02] 맘카페 '토토LP 가성비 논란' 게시물 조회수 8만 돌파\n  판매 영향: '토토LP 단점' 검색 경로의 34%가 해당 게시물 유입. 부정 구전 핵심 원천\n  액션: 해당 카페에 공식 계정으로 팩트 기반 답변 (논문 데이터 + 비용 비교표 첨부)",
  },
  {
    id: "section-5",
    title: "SOV 점유율 — 경쟁 교구 비교",
    sourceModule: "#06",
    content:
      "'유아 오디오 교구' + '동화 카드 플레이어' + '말하는 카드 교구' 3개 카테고리 키워드 통합 SOV:\n\n★ 토토LP (한국삐아제): 42건 (38%) — 긍정률 47%, SOV 1위이나 긍정률 최하위\n  세이펜 (크레비스): 31건 (28%) — 긍정률 68%, 가성비·호환성으로 2위 안착\n  핑크퐁 워크북+펜: 19건 (17%) — 긍정률 72%, 캐릭터 파워로 감성 1위\n  윤선생 스마트올: 12건 (11%) — 긍정률 55%, '체계적 커리큘럼' 전문성 포지셔닝\n  하티하티 플레이어: 8건 (7%) — 긍정률 61%, '말하는 카드 교구' 키워드 급성장\n\n[SOV vs 긍정률 매트릭스 — 전략 포지션]\n• 토토LP: 高SOV + 低긍정 → '논란의 중심' 포지션 → 품질·가격 개선 없이 인지도만 올리면 역효과\n• 세이펜: 中SOV + 高긍정 → '조용한 강자' → 입소문 전환율 높음, 직접 경쟁 위협\n• 핑크퐁: 低SOV + 最高긍정 → '팬덤형' → 감성 콘텐츠 벤치마크 대상\n\n[키워드별 SOV 상세]\n• '유아 오디오 교구' — 토토LP 38% vs 세이펜 32%: 1위이나 격차 좁음\n• '동화 카드 플레이어' — 세이펜 41% vs 토토LP 24%: 세이펜이 카테고리 명칭 선점\n• '말하는 카드 교구' — 하티하티 28% vs 토토LP 19%: 신규 경쟁자가 선두\n\n핵심 시사점: '말하는 카드 교구' '동화 카드 플레이어' 2개 키워드에서 경쟁사에 SOV 뒤처짐 → 월 14,200건 검색 유입을 놓치는 중",
  },
  {
    id: "section-6",
    title: "가격 포지셔닝 분석 — 가격 장벽 해소 전략",
    sourceModule: "#06",
    content:
      "◆ 경쟁 교구 가격 구조 비교 (초기 비용 + 1년 총비용)\n\n  토토LP: 본체 14.8만원 + LP카드 월 2장(6천원) = 연 22만원\n  세이펜: 본체 4.9만원 + 호환도서 월 2만원 = 연 29만원\n  핑크퐁: 세트 6.9만원 + 추가 워크북 월 1.5만원 = 연 25만원\n  윤선생: 가입비 0원 + 월 4.9만원 × 12 = 연 59만원\n  하티하티: 본체 7.9만원 + 카드팩 월 8천원 = 연 18만원\n\n[핵심 발견] 초기 가격은 토토LP가 최고가(14.8만원)이지만, 1년 총비용은 4위(22만원)\n  → 세이펜(29만원), 핑크퐁(25만원)보다 실제로 저렴\n  → 윤선생(59만원) 대비 63% 절약\n  → 하티하티(18만원)만 토토LP보다 저렴하나 콘텐츠 양 1/3 수준\n\n[소비자 가격 인식 vs 실제 — 가장 큰 오해]\n  소비자 인식: '14.8만원 = 가장 비싼 교구' (맘카페 91건 불만)\n  실제: 1년 기준 세이펜보다 7만원 저렴, 윤선생보다 37만원 저렴\n  → 판매 시 반드시 '1년 총비용 비교표'를 전면 배치해야 가격 저항 극복 가능\n\n[가격 전략 제안]\n  ① '1년 비용 비교 인포그래픽' 상세페이지 최상단 배치\n  ② '체험 후 구매' 2주 대여(2만원) → 구매 시 대여비 전액 차감\n  ③ 3개월 무이자 할부(월 49,333원 표기) — '하루 1,644원으로 영어 교육'\n  ④ 첫 구매 LP카드 5장 추가 증정 — 초기 비용 체감 완화",
  },
  {
    id: "section-7",
    title: "고객 세그먼트 분석 — 타깃별 공략법",
    sourceModule: "#06",
    content:
      "◆ 세그먼트 A: '첫 교구 탐색형' 부모 (두돌 세돌 교구 추천, 19,800건)\n  프로필: 24~36개월 자녀, 첫 교육 교구 탐색 중, 가격 민감도 중간, 정보 수집 단계\n  현재 상태: 토토LP 인지도 극히 낮음 (키워드 내 토토LP 노출률 5% 미만)\n  공략 포인트: '두돌 아이 첫 영어, LP카드로 시작하세요' — 연령 맞춤형 가이드\n  콘텐츠: 네이버 블로그 'ㅇㅇ개월 교구 추천 TOP5' 리스트에 진입 + 체험존 유도\n\n◆ 세그먼트 B: '비교 구매형' 부모 (유아 오디오 교구, 동화 카드 플레이어, 유아 음악 교구 추천 — 합산 36,900건)\n  프로필: 교구 카테고리 인지, 2~3개 제품 비교 중, 가격 대비 효과 중시\n  현재 상태: 세이펜·핑크퐁과 직접 비교 당하는 중, 가격에서 불리\n  공략 포인트: '1년 총비용 비교표' + '어휘 유지율 28% 차이' 데이터\n  콘텐츠: 'VS 시리즈' 비교 블로그 + 유튜브 비교 리뷰\n\n◆ 세그먼트 C: '브랜드 신뢰형' 기존 팬 (한국삐아제, 22,000건)\n  프로필: 삐아제 브랜드 인지, 다른 삐아제 제품 사용 경험 가능성 높음\n  현재 상태: 브랜드 검색 중 토토LP 제품 페이지 도달률 28%로 낮음\n  공략 포인트: '한국삐아제의 대표 히트 교구' — 브랜드 신뢰를 제품 전환으로 연결\n  콘텐츠: '삐아제 교육 철학이 담긴 토토LP' 브랜드 스토리 콘텐츠\n\n◆ 세그먼트 D: '대체 교구 탐색형' 부모 (말하는 카드 교구, 5,300건)\n  프로필: 태블릿·스크린 교구 피로감, 비디지털 교구 적극 탐색\n  현재 상태: 하티하티·세이펜이 SOV 상위, 토토LP는 3위\n  공략 포인트: '스크린 없는 영어 교육, LP카드가 답입니다'\n  콘텐츠: '디지털 디톡스 교육' 트렌드 연계 콘텐츠\n\n◆ 세그먼트 E: 'B2B 기관 구매' (누리과정 교구, 7,200건)\n  프로필: 유치원 원장·교사, 교육과정 연계 필수, 대량 구매\n  현재 상태: 서울시교육청 50곳 채택 → 레퍼런스 확보 완료\n  공략 포인트: '교육부 누리과정 연계 인증 교구 — 유치원 50곳 도입'\n  콘텐츠: 교사용 활용 가이드 PDF + B2B 할인 프로그램",
  },
  {
    id: "section-7b",
    title: "콘텐츠 갭 — 판매 직결 기회",
    sourceModule: "#06",
    content:
      "■ '토토LP vs 세이펜' 비교 콘텐츠 [absent] → 매출 영향: 월 추정 120세트 이탈\n  현실: '세이펜이랑 뭐가 달라요?' 질문 44건이나 공식 비교 콘텐츠 0건\n  경쟁사: 세이펜이 네이버 블로그 '교구 비교' 시리즈 주 3회 발행, '동화 카드 플레이어' SEO 1위 장악\n  제안: '1년 총비용 비교표 + 어휘 유지율 28% 차이' 데이터 기반 비교 콘텐츠\n  KPI: 비교 키워드 유입 → 상세페이지 도달률 목표 40%\n\n■ 실구매자 아이 반응 영상 [weak] → 매출 영향: 전환율 2.1%p 개선 잠재력\n  현실: '토토LP 후기' 6,800건 검색 중 영상 콘텐츠 비율 12% (텍스트 후기 위주)\n  경쟁사: 핑크퐁 유튜브 언박싱+반응 릴스 월 12회, 평균 8만 조회\n  제안: '우리 아이가 LP카드 스스로 꺼내는 순간' 숏폼 시리즈 + 구매 링크 직결\n  KPI: 월 8회 숏폼 발행, 평균 조회수 목표 2만\n\n■ '두돌 세돌 교구 추천' 카테고리 진입 [absent] → 매출 영향: 월 19,800건 미포획\n  현실: 월 19,800건 검색되는 황금 키워드이나 토토LP 노출 0건\n  경쟁사: 세이펜·핑크퐁이 '연령별 교구 추천' SEO 상위 5개 중 3개 장악\n  제안: '두돌 아이 첫 영어, LP카드로 시작하세요' — 연령별 가이드 콘텐츠\n  KPI: 3개월 내 '두돌 교구 추천' 네이버 블로그 상위 10위 진입\n\n■ 누리과정 교사 추천 콘텐츠 [absent] → 매출 영향: B2B 월 25세트 추가 판매\n  현실: '누리과정 교구' 검색 7,200건이나 토토LP 관련 교사 콘텐츠 0건\n  제안: 유치원 50곳 채택 사례 + 교사 인터뷰 → B2B + B2C 동시 공략\n  KPI: 교사용 활용 가이드 PDF 다운로드 월 500건\n\n■ '말하는 카드 교구' 포지셔닝 [weak] → 매출 영향: 월 5,300건 잠재 유입\n  현실: 하티하티가 SOV 28%로 선두, 토토LP는 19%로 3위\n  제안: '말하는 카드 그 이상 — LP카드로 음악을 듣고, 영어를 배우는 교구' 차별화\n  KPI: '말하는 카드 교구' 키워드 SOV 30% 이상 탈환",
  },
  {
    id: "section-8",
    title: "리스크 시그널 — 판매 저해 요인",
    sourceModule: "#06",
    content:
      "[CRITICAL] 가격 저항 — 구매 전환 최대 장벽 (매출 영향: 월 추정 -180세트)\n  데이터: '토토LP 단점' 검색 4,200건/월, 맘카페 가격 불만 91건 (전주 대비 1.8배)\n  소비자 인식: '14.8만원 = 가장 비싼 교구' (실제 1년 총비용은 세이펜보다 저렴)\n  판매 대응: ① 1년 총비용 비교표 상세페이지 최상단 ② 3개월 무이자(월 49,333원) ③ 체험 후 구매 프로그램\n  예상 효과: 가격 불만 40% 감소, 전환율 +1.5%p\n\n[CRITICAL] 긍정률 최하위(47%) — SOV 1위인데 감성은 꼴찌\n  데이터: 5개 경쟁사 중 긍정률 최하위. 핑크퐁 72%, 세이펜 68% 대비 심각한 격차\n  핵심 이슈: '많이 알려졌지만 불만도 많다' → 인지도 투자가 역효과로 전환될 위험\n  판매 대응: ① 인지도 확대 전 긍정 콘텐츠 선행 ② 실구매자 후기 숏폼 집중 ③ 품질 개선 PR\n  예상 효과: 3개월 내 긍정률 55% 도달 시 전환율 +2.3%p\n\n[WARNING] 플레이어 내구성·AS 불만 — 부정 구전 확산\n  데이터: 소비자원 상담 40% 증가, 별점 4.2→3.6 하락\n  판매 대응: 2년 무상 보증 + 48시간 내 교환 보장 → 구매 시 안심 메시지\n  예상 효과: 별점 3.6→4.0 회복 시 네이버 쇼핑 클릭률 +18%\n\n[WARNING] '말하는 카드 교구' 시장에서 하티하티 급부상\n  데이터: 하티하티 SOV 28%, 3개월 전 12% → 2.3배 성장. 가격 7.9만원으로 가성비 포지셔닝\n  판매 대응: LP카드의 '음악 학습' 차별점 강화, 하티하티 대비 콘텐츠 양(200장 vs 80장) 부각\n\n[WATCH] 세이펜 신제품 출시 예고\n  데이터: 크레비스 SNS 신제품 티저 + '세이펜 신형' 검색량 2.1배 증가\n  판매 대응: 출시 전 선제적 비교 콘텐츠 발행 + '음악 학습은 세이펜이 못 하는 영역' 메시지",
  },
  {
    id: "section-8b",
    title: "경쟁 교구 갭 분석 — 판매 차별점",
    sourceModule: "#06",
    content:
      "■ 세이펜 (크레비스) — 가격: 4.9만원 | 1년 총비용: 29만원\n  강점: 가격 진입장벽 낮음, 호환 도서 1,000종+, '동화 카드 플레이어' SEO 1위\n  약점: 음악·오디오 학습 부재, 펜 분실·파손 빈번, 호환 도서 추가 비용 누적\n  토토LP 셀링포인트: '1년 쓰면 세이펜보다 7만원 저렴 + 어휘 유지율 28% 높음'\n  키워드 전투: '유아 오디오 교구' 세이펜 32% vs 토토LP 38% → 유지 필요\n\n■ 핑크퐁 워크북+펜 — 가격: 6.9만원 | 1년 총비용: 25만원\n  강점: 캐릭터 파워(긍정률 72%), 유아 연령 강력한 어필, 유튜브 연계 콘텐츠\n  약점: 캐릭터 의존, 학습 깊이 부족, 유아기 지나면 흥미 급감\n  토토LP 셀링포인트: '캐릭터 없이도 아이가 스스로 꺼내는 교구 — 자기주도 학습 습관'\n  키워드 전투: '유아 음악 교구 추천' 핑크퐁 29% vs 토토LP 15% → 공략 필요\n\n■ 윤선생 스마트올 — 가격: 월 4.9만원 | 1년 총비용: 59만원\n  강점: 체계적 커리큘럼, 강사 관리, 브랜드 인지도\n  약점: 연 59만원 고비용, 약정 해지 위약금, 교구 반납\n  토토LP 셀링포인트: '59만원 구독 vs 14.8만원 1회 구매 — 2년 쓰면 4배 절약'\n  키워드 전투: '누리과정 교구' 윤선생 22% vs 토토LP 18% → B2B 확대로 역전 가능\n\n■ 하티하티 카드 플레이어 — 가격: 7.9만원 | 1년 총비용: 18만원\n  강점: '말하는 카드 교구' SOV 1위, 가성비 포지셔닝, 한국어 동화 강점\n  약점: 영어 콘텐츠 부족(80장), 교육과정 연계 없음\n  토토LP 셀링포인트: '영어 파닉스 전문 200장 + 누리과정 연계 — 교육부 인증 교구'\n  키워드 전투: '말하는 카드 교구' 하티하티 28% vs 토토LP 19% → 열세, 즉시 공략",
  },
  {
    id: "section-9",
    title: "메시지 전략 — 세그먼트별 판매 화법",
    sourceModule: "#07",
    content:
      '핵심 메시지: "LP카드 한 장이면, 우리 아이 영어가 시작됩니다"\n\n[세그먼트별 맞춤 화법]\n\n● 첫 교구 탐색형 (두돌 세돌 추천 검색)\n• "두돌 아이 첫 영어, 스크린 없이 LP카드로 시작하세요"\n• "교육부 누리과정 연계 인증 — 유치원 50곳이 선택한 첫 영어 교구"\n• CTA: 체험존 예약 또는 2주 체험 대여\n\n● 비교 구매형 (오디오 교구·카드 플레이어 검색)\n• "세이펜 5만원 vs 토토LP 14.8만원 — 그런데 1년 쓰면 토토LP가 7만원 더 저렴합니다"\n• "어휘 유지율 28% 차이 — 이 숫자가 3배 비싼 이유입니다"\n• CTA: 1년 비용 비교표 다운로드\n\n● 브랜드 신뢰형 (한국삐아제 검색)\n• "30년 교육 철학이 담긴 한국삐아제의 대표 히트 교구"\n• "15억 투자 유치한 교육 기업의 자신작 — 토토LP"\n• CTA: 제품 상세페이지 직행\n\n● 대체 교구 탐색형 (말하는 카드 교구 검색)\n• "말하는 카드 그 이상 — 음악으로 배우는 영어, LP카드"\n• "태블릿 대신, 아이 손에 LP카드를 쥐어주세요"\n• CTA: 숏폼 영상 시청\n\n● B2B 기관 구매 (누리과정 교구 검색)\n• "서울시교육청 인증, 유치원 50곳 도입 완료"\n• "대량 구매 할인(세트당 12만원) + 교사용 활용 가이드 무상 제공"\n• CTA: B2B 상담 신청\n\n톤앤매너: 따뜻하고 신뢰감 있는, 데이터로 뒷받침하되 공감 우선',
  },
  {
    id: "section-10",
    title: "주간 콘텐츠 전략 — 키워드별 SEO 공략",
    sourceModule: "#07",
    content:
      "월 | 네이버 블로그 | '토토LP vs 세이펜 완전 비교 — 1년 총비용·학습 효과·내구성'\n  타깃 키워드: '유아 오디오 교구' '동화 카드 플레이어'\n  목표: 비교 검색 SEO 상위 3위 진입, 상세페이지 유입 +200건/월\n\n화 | 인스타그램 릴스 | '32개월 아이가 LP카드 스스로 꺼내서 틀어요 — 실사용 영상'\n  타깃 키워드: '토토LP 후기' '키즈 LP 토토'\n  목표: 릴스 평균 2만 조회, 프로필 링크 클릭 5% 전환\n\n수 | 유튜브 숏폼 | '유치원 선생님이 말하는 토토LP 누리과정 활용법'\n  타깃 키워드: '누리과정 교구'\n  목표: B2B 문의 월 15건, 교사 공유 확산\n\n목 | 네이버 블로그 | '두돌 아이 첫 영어 교구 — LP카드로 시작하는 3가지 이유'\n  타깃 키워드: '두돌 세돌 교구 추천'\n  목표: 월 19,800건 검색 중 토토LP 노출률 10% → 30% 확대\n\n금 | 인스타그램 카드뉴스 | '말하는 카드 교구 TOP4 비교 — 토토LP가 특별한 이유'\n  타깃 키워드: '말하는 카드 교구' '유아 음악 교구 추천'\n  목표: '말하는 카드 교구' 키워드 SOV 19% → 30% 상승\n\n토 | 맘카페 콘텐츠 | '교보문고 체험존 현장 반응 + 1년 비용 비교표 공유'\n  타깃 키워드: '토토LP 단점' (부정 대응)\n  목표: 가격 불만 게시물 대비 긍정 후기 비율 1:1 달성",
  },
  {
    id: "section-11",
    title: "채널 우선순위 — ROI 기반 투자 순위",
    sourceModule: "#07",
    content:
      "10/10 — 네이버 블로그 SEO (투자: 월 200만원 / 예상 ROI: 5.8x)\n  근거: 10개 키워드 중 7개가 네이버 검색 기반. 학부모 교구 검색의 70%가 네이버\n  커버 키워드: 유아 오디오 교구, 동화 카드 플레이어, 두돌 세돌 교구 추천, 유아 음악 교구 추천\n  KPI: SEO 상위 10위 키워드 3개 → 7개 확대\n\n9/10 — 네이버 쇼핑 검색광고 (투자: 월 300만원 / 예상 ROI: 4.2x)\n  근거: '유아 오디오 교구' '동화 카드 플레이어' '말하는 카드 교구' 직접 구매 의향 키워드\n  현재: 광고 미집행 상태 → 경쟁사에 구매 전환 전량 빼앗기는 중\n  KPI: 클릭당 비용 350원 이하, 구매 전환율 3.5%\n\n8/10 — 인스타그램 릴스 (투자: 월 150만원 / 예상 ROI: 3.5x)\n  근거: '토토LP 후기' 검색자의 60%가 인스타에서 추가 탐색\n  KPI: 릴스 월 8회, 평균 2만 조회, 프로필 링크 클릭 5%\n\n7/10 — 유튜브 (투자: 월 100만원 / 예상 ROI: 2.8x)\n  근거: '토토LP vs 세이펜' 비교 영상 수요 높으나 공식 콘텐츠 0건\n  KPI: 비교 리뷰 + 교사 추천 월 4회, 평균 1.5만 조회\n\n6/10 — 맘카페 (투자: 월 50만원 / 예상 ROI: 직접 측정 불가, 부정 여론 방어 가치)\n  근거: 가격 논란 발원지. 모니터링 + 공식 답변 미대응 시 부정 확산\n  KPI: 부정 게시물 대비 공식 답변율 100%, 답변 후 댓글 긍정 전환율 40%\n\n5/10 — 오프라인 체험존 (투자: 월 400만원 / 예상 ROI: 2.1x)\n  근거: 체험→구매 전환율 35~40% 검증. 체험 후 온라인 구매 유도\n  KPI: 체험존 방문 월 2,000명, 구매 전환 700건\n\n총 투자 제안: 월 1,200만원 / 예상 추가 매출: 월 5,870만원 (ROI 4.9x)",
  },
  {
    id: "section-12",
    title: "리스크 완화 — 구체적 실행 방안",
    sourceModule: "#07",
    content:
      "◆ 리스크 1: 가격 저항(14.8만원) → 장바구니 이탈률 추정 65%\n  즉시(1주): 네이버 쇼핑 상세페이지에 '1년 총비용 비교 인포그래픽' 최상단 배치\n  단기(2주): 3개월 무이자 할부 도입 + '하루 1,644원' 표기\n  단기(2주): 첫 구매 LP카드 5장 추가 증정 이벤트\n  중기(4주): 체험 후 구매 프로그램 — 2주 대여(2만원) → 구매 시 전액 차감\n  목표: 장바구니 이탈률 65% → 45%\n\n◆ 리스크 2: 긍정률 최하위(47%) → 인지도 투자 역효과 위험\n  즉시(1주): 실구매자 아이 반응 숏폼 촬영 착수 (월 8회 발행)\n  단기(2주): 기존 만족 구매자 대상 후기 캠페인 (네이버 쇼핑 포토리뷰 500원 적립)\n  중기(4주): '어휘 유지율 28%' 연구 결과 상세페이지·블로그·광고 전면 배치\n  목표: 긍정률 47% → 55% (3개월 내)\n\n◆ 리스크 3: 플레이어 내구성·AS 불만 → 별점 3.6\n  즉시(1주): 2년 무상 보증 + 48시간 내 교환 정책 공식 발표\n  단기(2주): 기존 구매자 대상 '플레이어 무상 점검 이벤트' 시행\n  중기(4주): 제조사와 내구성 개선 협의 (모터 소음·카드 인식 오류)\n  목표: 별점 3.6 → 4.0 (2개월 내)\n\n◆ 리스크 4: '말하는 카드 교구' 시장 하티하티 급부상\n  즉시(1주): 하티하티 대비 '영어 전문 200장 vs 한국어 80장' 차별점 콘텐츠\n  단기(2주): '말하는 카드 교구' 키워드 네이버 블로그 SEO 콘텐츠 발행\n  목표: SOV 19% → 30% (2개월 내)",
  },
  {
    id: "section-13",
    title: "즉시 실행 과제 — 30일 액션 플랜",
    sourceModule: "#08",
    content:
      "◆ 1주차 (즉시 실행) — 매출 직결\n[HIGH] 네이버 쇼핑 검색광고 세팅 — '유아 오디오 교구' '동화 카드 플레이어' '말하는 카드 교구' 3개 키워드 (예산 월 300만원)\n[HIGH] 상세페이지 리뉴얼 — ① 1년 총비용 비교 인포그래픽 ② 어휘 유지율 28% 연구 데이터 ③ 교육부 인증 뱃지 ④ 2년 무상 보증 안내\n[HIGH] '토토LP 단점' 맘카페 부정 게시물 공식 답변 — 팩트 기반(비용 비교표 + 보증 정책)\n\n◆ 2주차 — 콘텐츠 기반 구축\n[HIGH] '토토LP vs 세이펜' 비교 블로그 발행 — 비교 검색 유입 포획 (네이버 SEO)\n[HIGH] 실구매자 아이 반응 숏폼 시리즈 런칭 — 월 8회, 인스타 릴스 + 유튜브 숏폼\n[HIGH] 3개월 무이자 할부 + LP카드 5장 증정 이벤트 런칭\n\n◆ 3~4주차 — 시장 확장\n[HIGH] '두돌 세돌 교구 추천' SEO 블로그 시리즈 — 월 19,800건 미포획 시장 공략\n[HIGH] 체험 후 구매 프로그램 설계·런칭 — 2주 대여(2만원) → 구매 시 전액 차감\n[MEDIUM] 누리과정 교사 활용 가이드 PDF 제작 — B2B 확장 기반\n[MEDIUM] '말하는 카드 교구 TOP4 비교' 콘텐츠 — 하티하티 대비 차별점 부각\n[MEDIUM] LP카드 번들팩(6장 20% 할인) + 정기구독(월 2장 15% 할인) 상품 기획\n\n◆ 30일 목표 KPI\n• 네이버 쇼핑 키워드 SEO 상위 10위: 3개 → 7개\n• 월 추가 판매: +250~400세트 (월 매출 +3,700~5,900만원)\n• 긍정률: 47% → 52%\n• 장바구니 이탈률: 65% → 50%\n• '토토LP 단점' 부정 게시물 대비 긍정 후기 비율: 0.5 → 1.0",
  },
];

const DEMO_SENTIMENT = { positive: 0.47, negative: 0.31, neutral: 0.22 };
const DEMO_SOV = [
  { brand: "토토LP (한국삐아제)", mentions: 42, rate: 47, ours: true },
  { brand: "세이펜 (크레비스)", mentions: 31, rate: 68, ours: false },
  { brand: "핑크퐁 워크북+펜", mentions: 19, rate: 72, ours: false },
  { brand: "윤선생 스마트올", mentions: 12, rate: 55, ours: false },
  { brand: "하티하티 플레이어", mentions: 8, rate: 61, ours: false },
];

function DemoReportView({ keyword }: { keyword: DemoKeyword }) {
  const totalMentions = DEMO_SOV.reduce((s, v) => s + v.mentions, 0);

  return (
    <>
      {/* 헤더 */}
      <div className="kw-report-header">
        <div>
          <span className={`rec-badge rec-${keyword.recommendation}`}>
            {keyword.recommendation === "invest"
              ? "투자"
              : keyword.recommendation === "maintain"
                ? "유지"
                : "철수"}
          </span>
          <span className={`trend-indicator trend-${keyword.trendDirection}`}>
            {keyword.trendDirection === "up"
              ? "▲ 상승"
              : keyword.trendDirection === "down"
                ? "▼ 하락"
                : "— 보합"}
          </span>
        </div>
        <div className="kw-metrics-row">
          <span>검색량 {keyword.searchVolume.toLocaleString()}</span>
          <span>언급 {keyword.postCount30d}건</span>
          <span>감성 {(keyword.sentimentScore * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* 감성 분석 바 */}
      <section className="panel" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>브랜드 온라인 반응</h3>
        <div
          style={{
            display: "flex",
            height: 24,
            borderRadius: 6,
            overflow: "hidden",
            marginBottom: 8,
          }}
        >
          <div
            style={{ width: `${DEMO_SENTIMENT.positive * 100}%`, background: "var(--success)" }}
          />
          <div
            style={{ width: `${DEMO_SENTIMENT.negative * 100}%`, background: "var(--danger)" }}
          />
          <div style={{ width: `${DEMO_SENTIMENT.neutral * 100}%`, background: "#d1d5db" }} />
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          긍정 {(DEMO_SENTIMENT.positive * 100).toFixed(0)}% / 부정{" "}
          {(DEMO_SENTIMENT.negative * 100).toFixed(0)}% / 중립{" "}
          {(DEMO_SENTIMENT.neutral * 100).toFixed(0)}%
        </p>
      </section>

      {/* SOV 차트 */}
      <section className="panel" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>SOV 점유율 (Share of Voice)</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {DEMO_SOV.map((s) => (
            <div
              key={s.brand}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
            >
              <span
                style={{
                  width: 140,
                  fontWeight: s.ours ? 700 : 400,
                  color: s.ours ? "var(--accent)" : "var(--text)",
                }}
              >
                {s.ours ? "★ " : ""}
                {s.brand}
              </span>
              <div
                style={{
                  flex: 1,
                  background: "var(--bg-subtle)",
                  borderRadius: 4,
                  height: 18,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(s.mentions / totalMentions) * 100}%`,
                    height: "100%",
                    background: s.ours ? "var(--accent)" : "#94a3b8",
                    borderRadius: 4,
                  }}
                />
              </div>
              <span
                style={{ width: 80, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}
              >
                {s.mentions}건 ({s.rate}%)
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 리포트 섹션 렌더링 */}
      {DEMO_REPORT_SECTIONS.map((section) => (
        <section key={section.id} className="panel" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
            {section.title}
            <span
              style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8, fontWeight: 400 }}
            >
              {section.sourceModule}
            </span>
          </h3>
          <div
            style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}
          >
            {section.content}
          </div>
        </section>
      ))}

      {/* 전체 리포트 링크 */}
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <a
          href={`/api/v1/reports/${SAMPLE_REPORT_ID}?format=html`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
          style={{ width: "auto", padding: "12px 28px", display: "inline-block" }}
        >
          시각화 리포트 전체 보기
        </a>
      </div>
    </>
  );
}

/* ══════════════════════ Keyword Report View ══════════════════════ */

function KeywordReportView({ keyword, tenantId }: { keyword: DemoKeyword; tenantId: string }) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOperator, setShowOperator] = useState(false);
  const [data, setData] = useState<DashboardKpis | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchOverview(tenantId), fetchKpis(tenantId)])
      .then(([ov, kpis]) => {
        if (!cancelled) {
          setOverview(ov);
          setData(kpis);
        }
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  // reportId가 "demo"면 시드된 분석 결과를 네이티브 렌더링
  if (keyword.reportId === "demo") {
    return <DemoReportView keyword={keyword} />;
  }

  return (
    <>
      <div className="kw-report-header">
        <div>
          <span className={`rec-badge rec-${keyword.recommendation}`}>
            {keyword.recommendation === "invest"
              ? "투자"
              : keyword.recommendation === "maintain"
                ? "유지"
                : "철수"}
          </span>
          <span className={`trend-indicator trend-${keyword.trendDirection}`}>
            {keyword.trendDirection === "up"
              ? "▲ 상승"
              : keyword.trendDirection === "down"
                ? "▼ 하락"
                : "— 보합"}
          </span>
        </div>
        <div className="kw-metrics-row">
          <span>검색량 {keyword.searchVolume.toLocaleString()}</span>
          <span>언급 {keyword.postCount30d}건</span>
          <span>감성 {(keyword.sentimentScore * 100).toFixed(0)}%</span>
        </div>
      </div>

      {loading && <div className="status-loading">데이터를 불러오는 중...</div>}
      {error && <div className="status-error">{error}</div>}

      {!loading && !error && overview && <BusinessOverview overview={overview} />}

      <ChannelCard tenantId={tenantId} />
      <CompetitorCard tenantId={tenantId} />

      <section className="section-header">
        <h2>시장 반응 분석하기</h2>
        <p>이 키워드에 대한 네이버 뉴스/블로그/카페 여론을 수집하고 AI가 분석합니다.</p>
      </section>
      <SignalcraftPanel tenantId={tenantId} initialKeyword={keyword.keyword} />

      <section className="panel collapse-section">
        <div className="op-header">
          <h2>상세 데이터</h2>
          <button type="button" onClick={() => setShowOperator(!showOperator)}>
            {showOperator ? "접기" : "바이어 / 캠페인 / 관리자"}
          </button>
        </div>
        {showOperator && (
          <>
            <BuyersPanel tenantId={tenantId} />
            {data && <Panels data={data} />}
            <OperatorPanel />
          </>
        )}
      </section>
    </>
  );
}

/* ══════════════════════ Business Overview ══════════════════════ */

function BusinessOverview({ overview }: { overview: DashboardOverview }) {
  return (
    <>
      <div className="grid">
        <div className="card">
          <h3>브랜드 온라인 반응</h3>
          {overview.brandSentiment ? (
            <>
              <div className="sentiment-bar">
                <span
                  className="pos"
                  style={{ width: `${overview.brandSentiment.positive * 100}%` }}
                />
                <span
                  className="neg"
                  style={{ width: `${overview.brandSentiment.negative * 100}%` }}
                />
                <span
                  className="neu"
                  style={{ width: `${overview.brandSentiment.neutral * 100}%` }}
                />
              </div>
              <div className="subtitle">
                긍정 {(overview.brandSentiment.positive * 100).toFixed(0)}% / 부정{" "}
                {(overview.brandSentiment.negative * 100).toFixed(0)}% / 중립{" "}
                {(overview.brandSentiment.neutral * 100).toFixed(0)}%
              </div>
              {overview.brandSentiment.oneLiner && (
                <p className="one-liner">{overview.brandSentiment.oneLiner}</p>
              )}
            </>
          ) : (
            <div className="subtitle">아직 분석 결과가 없습니다. SignalCraft를 실행해주세요.</div>
          )}
        </div>
      </div>

      {overview.weeklyActions.length > 0 && (
        <section className="panel actions-panel">
          <h2>이번 주 실행 과제</h2>
          <ul className="action-list">
            {overview.weeklyActions.map((a, i) => (
              <li key={i} className={`action-item action-${a.priority}`}>
                <span className={`priority-badge badge-${a.priority}`}>{a.priority}</span>
                {a.action}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid">
        {overview.trendKeywords.length > 0 && (
          <section className="card">
            <h3>트렌드 키워드 TOP 5</h3>
            <ul className="trend-list">
              {overview.trendKeywords.map((t, i) => (
                <li key={i}>
                  <strong>{t.term}</strong>
                  <span className="trend-vol">{t.volume.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {overview.recentReports.length > 0 && (
          <section className="card">
            <h3>최근 리포트</h3>
            <ul className="report-list">
              {overview.recentReports.map((r) => (
                <li key={r.id}>
                  <a href={r.htmlUrl} target="_blank" rel="noreferrer">
                    {r.keyword ?? r.title}
                  </a>
                  <span className="report-date">{new Date(r.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {overview.lastAnalyzedAt && (
        <div className="data-freshness">
          마지막 분석: {new Date(overview.lastAnalyzedAt).toLocaleString()} / 키워드: "
          {overview.latestKeyword}"
        </div>
      )}
    </>
  );
}

/* ══════════════════════ Channels ══════════════════════ */

function ChannelCard({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchChannels(tenantId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => showGlobalToast((err as Error).message, "error"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);
  if (loading || !data || data.totalPosts === 0) return null;
  const maxPosts = Math.max(...data.channels.map((c) => c.postCount), 1);
  return (
    <section className="panel">
      <h2>채널별 성과 (최근 30일, 총 {data.totalPosts}건)</h2>
      <div className="channel-list">
        {data.channels.map((ch) => (
          <div key={ch.source} className="channel-row">
            <div className="ch-label">{ch.label}</div>
            <div className="ch-bar-wrap">
              <div className="ch-bar" style={{ width: `${(ch.postCount / maxPosts) * 100}%` }} />
              <span className="ch-count">{ch.postCount}건</span>
            </div>
            <div className="ch-engage">참여 {ch.engagementScore}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════ Competitors ══════════════════════ */

function CompetitorCard({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<CompetitorData | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCompetitors(tenantId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => showGlobalToast((err as Error).message, "error"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);
  if (loading || !data || data.competitors.length === 0) return null;
  return (
    <section className="panel">
      <h2>경쟁사 현황 ({data.totalTracked}사 추적)</h2>
      <div className="competitor-grid">
        {data.competitors.map((c) => (
          <div key={c.name} className="comp-card">
            <div className="comp-name">{c.name}</div>
            <div className="comp-meta">
              {c.country ?? "—"} / {c.genres.slice(0, 3).join(", ") || "—"}
            </div>
            <div className="comp-stat">
              신작 {c.recentTitleCount}건
              {c.topTitle && <span className="comp-title"> / {c.topTitle}</span>}
            </div>
          </div>
        ))}
      </div>
      {data.competitorGaps.length > 0 && (
        <div className="comp-gaps">
          <h3>경쟁사 약점 &amp; 우리의 기회</h3>
          {data.competitorGaps.map((g, i) => (
            <div key={i} className="gap-item">
              <strong>{g.competitor}</strong>
              <span className="gap-detail">약점: {g.gap}</span>
              <span className="gap-advantage">우리 기회: {g.ourAdvantage}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ══════════════════════ SignalCraft ══════════════════════ */

const STATUS_LABEL: Record<SignalcraftJob["status"], string> = {
  queued: "대기 중",
  collecting: "Stage 1 — 수집",
  analyzing: "Stage 3 — 분석",
  rendering: "Stage 4 — 렌더",
  done: "완료",
  failed: "실패",
};
const TERMINAL: SignalcraftJob["status"][] = ["done", "failed"];

function SignalcraftPanel({
  tenantId,
  initialKeyword,
}: {
  tenantId: string;
  initialKeyword?: string;
}) {
  const [keyword, setKeyword] = useState(initialKeyword ?? "");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SignalcraftJob | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollTimer = useRef<number | null>(null);
  const clearPoll = useCallback(() => {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);
  useEffect(() => clearPoll, [clearPoll]);
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const fresh = await fetchSignalcraftJob(jobId);
        if (cancelled) return;
        setJob(fresh);
        if (TERMINAL.includes(fresh.status)) clearPoll();
      } catch (err) {
        if (cancelled) return;
        setSubmitError((err as Error).message);
        clearPoll();
      }
    };
    void tick();
    pollTimer.current = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearPoll();
    };
  }, [jobId, clearPoll]);

  const onRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setSubmitError(null);
    setSubmitting(true);
    setJob(null);
    try {
      const res = await runSignalcraft({ tenantId, keyword: keyword.trim() });
      setJobId(res.jobId);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };
  const onReset = () => {
    clearPoll();
    setJobId(null);
    setJob(null);
    setSubmitError(null);
  };

  return (
    <section className="panel signalcraft">
      <h2>SignalCraft 실행</h2>
      <form className="sc-form" onSubmit={onRun}>
        <label htmlFor="keyword">분석 키워드</label>
        <input
          id="keyword"
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          disabled={submitting || (job !== null && !TERMINAL.includes(job.status))}
          placeholder="키워드 입력"
        />
        <button type="submit" disabled={submitting || !keyword.trim()}>
          {submitting ? "제출 중..." : "실행"}
        </button>
        {(job || submitError) && (
          <button type="button" onClick={onReset} className="btn-secondary">
            초기화
          </button>
        )}
      </form>
      {submitError && <div className="status-error">오류: {submitError}</div>}
      {job && (
        <div className="sc-status">
          <div className="sc-status-row">
            <span className={`sc-badge sc-badge-${job.status}`}>{STATUS_LABEL[job.status]}</span>
            <span className="sc-stage">{job.current_stage ?? "—"}</span>
            <span className="sc-progress">{job.progress_pct}%</span>
          </div>
          <div className="sc-progress-bar">
            <div
              className="sc-progress-fill"
              style={{ width: `${Math.max(4, job.progress_pct)}%` }}
            />
          </div>
          <div className="sc-meta">
            <span>jobId {job.id.slice(0, 8)}...</span>
            <span>keyword "{job.keyword}"</span>
            {Object.entries(job.rawPostsBySource).map(([src, c]) => (
              <span key={src}>
                {src} {c}
              </span>
            ))}
          </div>
          {job.error_message && <div className="status-error">{job.error_message}</div>}
          {job.status === "done" && job.reportId && (
            <>
              <div className="sc-actions">
                <a
                  href={`/api/v1/reports/${job.reportId}?format=html`}
                  target="_blank"
                  rel="noreferrer"
                >
                  리포트 보기
                </a>
                <a href={`/api/v1/reports/${job.reportId}`} target="_blank" rel="noreferrer">
                  JSON
                </a>
              </div>
              <ActionButtons jobId={job.id} tenantId={job.tenant_id} />
              <iframe
                key={job.reportId}
                title="SignalCraft report"
                className="sc-report-frame"
                src={`/api/v1/reports/${job.reportId}?format=html`}
              />
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ══════════════════════ Action Buttons ══════════════════════ */

function ActionButtons({ jobId, tenantId }: { jobId: string; tenantId: string }) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const onGenerate = async (actionType: "campaign_draft" | "content_calendar") => {
    setGenerating(actionType);
    setErr(null);
    setResult(null);
    try {
      setResult(await generateAction({ jobId, tenantId, actionType }));
    } catch (e) {
      setErr((e as Error).message.slice(0, 200));
    } finally {
      setGenerating(null);
    }
  };
  return (
    <div className="action-buttons">
      <div className="action-btn-row">
        <button
          type="button"
          onClick={() => onGenerate("campaign_draft")}
          disabled={generating !== null}
          className="action-btn"
        >
          {generating === "campaign_draft" ? "생성 중..." : "캠페인 초안 생성"}
        </button>
        <button
          type="button"
          onClick={() => onGenerate("content_calendar")}
          disabled={generating !== null}
          className="action-btn"
        >
          {generating === "content_calendar" ? "생성 중..." : "콘텐츠 캘린더 생성"}
        </button>
      </div>
      {err && <div className="status-error">{err}</div>}
      {result && result.output && (
        <div className="action-result">
          <h4>{result.actionType === "campaign_draft" ? "캠페인 초안" : "콘텐츠 캘린더"}</h4>
          <pre>{JSON.stringify(result.output, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ Buyers ══════════════════════ */

function BuyersPanel({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<{ total: number; buyers: Buyer[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchBuyers(tenantId, 25)
      .then((res) => {
        if (!cancelled) setData({ total: res.total, buyers: res.buyers });
      })
      .catch((e) => {
        if (!cancelled) setErr((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);
  return (
    <section className="panel">
      <h2>
        Buyers (top {data?.buyers.length ?? 0} of {data?.total ?? 0})
      </h2>
      {loading && <div className="status-loading">바이어 불러오는 중...</div>}
      {err && <div className="status-error">{err}</div>}
      {!loading && !err && data && data.buyers.length === 0 && (
        <div className="status-empty">No buyers for this tenant yet.</div>
      )}
      {!loading && !err && data && data.buyers.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Country</th>
              <th>Genres</th>
              <th className="num">Lead score</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.buyers.map((b) => (
              <tr key={b.id}>
                <td>{b.company_name}</td>
                <td>{b.country ?? "—"}</td>
                <td>{b.genres.slice(0, 4).join(", ") || "—"}</td>
                <td className="num">{b.lead_score ?? "—"}</td>
                <td>{new Date(b.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/* ══════════════════════ Operator ══════════════════════ */

function OperatorPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<OperatorOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setData(await fetchOperatorOverview());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  const onToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !data) void load();
  };
  return (
    <section className="panel">
      <div className="op-header">
        <h2>운영자 오버뷰</h2>
        <button type="button" onClick={onToggle}>
          {open ? "닫기" : "열기"}
        </button>
        {open && (
          <button type="button" onClick={load} className="btn-secondary">
            새로고침
          </button>
        )}
      </div>
      {open && loading && <div className="status-loading">불러오는 중...</div>}
      {open && err && <div className="status-error">{err}</div>}
      {open && data && (
        <div className="op-grid">
          <div className="op-card">
            <h3>시스템 상태</h3>
            <div>
              postgres: {data.health.postgres.ok ? "OK" : "FAIL"} ({data.health.postgres.latencyMs}
              ms)
            </div>
            <div>redis: {data.health.redis.ok ? "OK" : "FAIL"}</div>
          </div>
          <div className="op-card">
            <h3>큐 상태</h3>
            {Object.entries(data.queues).map(([name, c]) => (
              <div key={name}>
                <strong>{name}</strong>: w={c.waiting} a={c.active} c={c.completed} f={c.failed}
              </div>
            ))}
          </div>
          <div className="op-card">
            <h3>SignalCraft 작업 (24시간)</h3>
            {Object.entries(data.signalcraftJobs).length === 0 && <div>—</div>}
            {Object.entries(data.signalcraftJobs).map(([s, n]) => (
              <div key={s}>
                {s}: {n}
              </div>
            ))}
          </div>
          <div className="op-card op-wide">
            <h3>Category A datasets</h3>
            <table>
              <thead>
                <tr>
                  <th>Table</th>
                  <th className="num">Rows</th>
                  <th className="num">Stale</th>
                  <th>Newest</th>
                </tr>
              </thead>
              <tbody>
                {data.datasets.map((d) => (
                  <tr key={d.table}>
                    <td>{d.table}</td>
                    <td className="num">{d.rowCount}</td>
                    <td className="num">{d.staleCount}</td>
                    <td>{d.newestLastSeen ? new Date(d.newestLastSeen).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="op-card op-wide">
            <h3>LLM 비용 (7일)</h3>
            {data.llmCost.length === 0 ? (
              <div>No calls.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th className="num">Calls</th>
                    <th className="num">Input</th>
                    <th className="num">Output</th>
                    <th className="num">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.llmCost.map((c) => (
                    <tr key={c.modelName}>
                      <td>{c.modelName}</td>
                      <td className="num">{c.totalCalls}</td>
                      <td className="num">{c.totalInputTokens.toLocaleString()}</td>
                      <td className="num">{c.totalOutputTokens.toLocaleString()}</td>
                      <td className="num">${c.costUsd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="op-card op-wide">
            <h3>크롤러 실패 (24시간)</h3>
            {data.crawlerFailures.length === 0 ? (
              <div>No failures.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Code</th>
                    <th>Message</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.crawlerFailures.map((f, i) => (
                    <tr key={i}>
                      <td>{f.source}</td>
                      <td>{f.errorCode ?? "—"}</td>
                      <td>{f.errorMsg ?? "—"}</td>
                      <td>{new Date(f.failedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Panels({ data }: { data: DashboardKpis }) {
  return (
    <>
      <div className="grid">
        <div className="card">
          <h3>Active Buyers</h3>
          <div className="value">{formatInt(data.pipeline.activeBuyers)}</div>
          <div className="subtitle">avg lead score {data.pipeline.avgLeadScore}</div>
        </div>
        <div className="card">
          <h3>Weekly Active Users</h3>
          <div className="value">{formatInt(data.wau)}</div>
          <div className="subtitle">current ISO week</div>
        </div>
        <div className="card">
          <h3>Window</h3>
          <div className="value">{data.windowDays}d</div>
          <div className="subtitle">rolling KPI window</div>
        </div>
      </div>
      <section className="panel">
        <h2>FX rates (KRW)</h2>
        <div className="fx-strip">
          {Object.entries(data.fxToKrw).map(([cur, rate]) => (
            <span key={cur} className="fx-chip">
              {cur} = {rate.toFixed(2)}
            </span>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Email campaigns</h2>
        {data.campaigns.length === 0 ? (
          <div className="status-empty">No campaign events.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th className="num">Sent</th>
                <th className="num">Opened</th>
                <th className="num">Clicked</th>
                <th className="num">Replied</th>
                <th className="num">Open rate</th>
                <th className="num">CTOR</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c) => (
                <tr key={c.campaignId}>
                  <td>{c.campaignId.slice(0, 8)}...</td>
                  <td className="num">{formatInt(c.sent)}</td>
                  <td className="num">{formatInt(c.opened)}</td>
                  <td className="num">{formatInt(c.clicked)}</td>
                  <td className="num">{formatInt(c.replied)}</td>
                  <td className="num">{formatPct(c.openRate)}</td>
                  <td className="num">{formatPct(c.clickToOpenRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="panel">
        <h2>에이전트 채택률</h2>
        {data.adoption.length === 0 ? (
          <div className="status-empty">No adoption events.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Output type</th>
                <th className="num">Accepted</th>
                <th className="num">Rejected</th>
                <th className="num">Adoption rate</th>
              </tr>
            </thead>
            <tbody>
              {data.adoption.map((a, idx) => (
                <tr key={`${a.agent}:${a.outputType}:${idx}`}>
                  <td>{a.agent}</td>
                  <td>{a.outputType}</td>
                  <td className="num">{formatInt(a.accepted)}</td>
                  <td className="num">{formatInt(a.rejected)}</td>
                  <td className="num">{formatPct(a.adoptionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="panel">
        <h2>모델별 LLM 비용</h2>
        {data.llmCost.length === 0 ? (
          <div className="status-empty">No LLM calls.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Input tokens</th>
                <th className="num">Output tokens</th>
                <th className="num">Cost (USD)</th>
                <th className="num">Cost (KRW)</th>
              </tr>
            </thead>
            <tbody>
              {data.llmCost.map((m) => (
                <tr key={m.modelName}>
                  <td>{m.modelName}</td>
                  <td className="num">{formatInt(m.totalInputTokens)}</td>
                  <td className="num">{formatInt(m.totalOutputTokens)}</td>
                  <td className="num">{formatUsd(m.costUsd)}</td>
                  <td className="num">{formatKrw(m.costUsd * (data.fxToKrw.USD ?? 1300))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

/* ══════════════════════ Admin Panel ══════════════════════ */

/* ══════════════════════ Settings Page ══════════════════════ */

function SettingsPage({ user, onUpdate }: { user: AuthUser; onUpdate: (u: AuthUser) => void }) {
  const [name, setName] = useState(user.name ?? "");
  const [saving, setSaving] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiUpdateProfile(name);
      onUpdate({ ...user, name });
      showGlobalToast("이름이 변경되었습니다");
    } catch (err) {
      showGlobalToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== newPwConfirm) {
      showGlobalToast("새 비밀번호가 일치하지 않습니다", "error");
      return;
    }
    setChangingPw(true);
    try {
      await apiChangePassword(curPw, newPw);
      showGlobalToast("비밀번호가 변경되었습니다");
      setCurPw("");
      setNewPw("");
      setNewPwConfirm("");
    } catch (err) {
      showGlobalToast((err as Error).message, "error");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <>
      <div className="page-title">
        <h2>계정 설정</h2>
        <p>프로필 정보 관리 및 비밀번호 변경</p>
      </div>

      <section className="panel">
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>프로필 정보</h3>
        <form className="settings-form" onSubmit={handleNameSave}>
          <div className="settings-field">
            <label>이메일</label>
            <input type="email" value={user.email} disabled />
          </div>
          <div className="settings-field">
            <label>이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 입력"
            />
          </div>
          <div className="settings-field">
            <label>권한</label>
            <input
              type="text"
              value={user.role === "admin" ? "관리자" : user.role === "owner" ? "소유자" : "멤버"}
              disabled
            />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>비밀번호 변경</h3>
        <form className="settings-form" onSubmit={handlePwChange}>
          <div className="settings-field">
            <label>현재 비밀번호</label>
            <input
              type="password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              required
            />
          </div>
          <div className="settings-field">
            <label>새 비밀번호</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="8자 이상, 대소문자+숫자+특수문자"
              required
              minLength={8}
            />
          </div>
          <div className="settings-field">
            <label>새 비밀번호 확인</label>
            <input
              type="password"
              value={newPwConfirm}
              onChange={(e) => setNewPwConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={changingPw}>
            {changingPw ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </section>
    </>
  );
}

/* ══════════════════════ Admin Panel ══════════════════════ */

function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, s] = await Promise.all([fetchAdminUsers(), fetchAdminStats()]);
      setUsers(u.users);
      setStats(s);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await createAdminUser({
        email: newEmail,
        password: newPassword,
        name: newName || undefined,
        role: newRole,
      });
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("member");
      setShowCreate(false);
      await load();
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    await updateUserRole(userId, role).catch((err: unknown) =>
      showGlobalToast((err as Error).message, "error"),
    );
    await load();
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`${email} 계정을 삭제하시겠습니까?`)) return;
    try {
      await deleteAdminUser(userId);
      await load();
    } catch (err) {
      showGlobalToast((err as Error).message, "error");
    }
  };

  return (
    <>
      <div className="page-title">
        <h2>관리자 대시보드</h2>
        <p>회원 관리, 시스템 모니터링, 계정 생성 및 권한 관리</p>
      </div>

      {loading && <div className="status-loading">불러오는 중...</div>}
      {error && <div className="status-error">{error}</div>}

      {stats && (
        <div className="summary-strip">
          <div className="summary-item">
            <div className="summary-value">{stats.users}</div>
            <div className="summary-label">전체 회원</div>
          </div>
          <div className="summary-item">
            <div className="summary-value">{stats.products}</div>
            <div className="summary-label">등록 제품</div>
          </div>
          <div className="summary-item">
            <div className="summary-value">{stats.activeKeywords}</div>
            <div className="summary-label">활성 키워드</div>
          </div>
          <div className="summary-item">
            <div className="summary-value">{stats.jobs7d.total}</div>
            <div className="summary-label">분석 (7일)</div>
          </div>
          <div className="summary-item">
            <div className="summary-value" style={{ color: "var(--success)" }}>
              {stats.jobs7d.done}
            </div>
            <div className="summary-label">성공</div>
          </div>
          <div className="summary-item">
            <div className="summary-value" style={{ color: "var(--danger)" }}>
              {stats.jobs7d.failed}
            </div>
            <div className="summary-label">실패</div>
          </div>
          <div className="summary-item">
            <div className="summary-value">{stats.reports}</div>
            <div className="summary-label">리포트</div>
          </div>
        </div>
      )}

      <section className="panel">
        <div className="op-header">
          <h2>회원 관리 ({users.length}명)</h2>
          <button type="button" className="btn-secondary" style={{ width: "auto" }} onClick={load}>
            새로고침
          </button>
          <button type="button" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "취소" : "+ 계정 생성"}
          </button>
        </div>

        {showCreate && (
          <form className="admin-create-form" onSubmit={handleCreate}>
            <div className="admin-form-row">
              <input
                type="email"
                placeholder="이메일"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="비밀번호 (8자 이상)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <input
                type="text"
                placeholder="이름 (선택)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="member">멤버</option>
                <option value="owner">소유자</option>
                <option value="admin">관리자</option>
              </select>
              <button type="submit" disabled={creating}>
                {creating ? "생성 중..." : "생성"}
              </button>
            </div>
            {createError && <div className="auth-error">{createError}</div>}
          </form>
        )}

        {!loading && users.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>이메일</th>
                <th>이름</th>
                <th>권한</th>
                <th>테넌트 ID</th>
                <th>가입일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.name ?? "—"}</td>
                  <td>
                    <select
                      className="role-select"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="member">member</option>
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="tenant-cell">{u.tenant_id.slice(0, 8)}...</td>
                  <td className="date-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="table-delete-btn"
                      onClick={() => handleDelete(u.id, u.email)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

/* ══════════════════════ Sample Report View ══════════════════════ */

function SampleReportView() {
  return (
    <>
      <div className="page-title">
        <h2>분석 샘플</h2>
        <p>
          "토토LP 교육" 제품의 AI 마케팅 분석 리포트 샘플입니다. 실제 서비스에서 생성되는 리포트와
          동일한 형식입니다.
        </p>
      </div>
      <div className="sample-actions">
        <a
          href={`/api/v1/reports/${SAMPLE_REPORT_ID}?format=html`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
        >
          새 탭에서 보기
        </a>
        <a
          href={`/api/v1/reports/${SAMPLE_REPORT_ID}`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary"
        >
          JSON 데이터
        </a>
      </div>
      <iframe
        title="샘플 분석 리포트"
        className="sample-frame"
        src={`/api/v1/reports/${SAMPLE_REPORT_ID}?format=html`}
      />
    </>
  );
}
