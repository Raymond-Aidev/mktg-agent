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
} from "./api.ts";

const DEFAULT_TENANT = "00000000-0000-0000-0000-0000000000ee";

/* ══════════════════════ Types & Demo Data ══════════════════════ */

type View =
  | { screen: "landing" }
  | { screen: "products" }
  | { screen: "product-detail"; productId: string; isDemo?: boolean }
  | { screen: "keyword-report"; productId: string; keywordId: string; isDemo?: boolean }
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
    name: "어린이AI 지휘자",
    description: "AI 동작인식 기반 클래식 음악 지휘 체험 앱",
    keywords: [
      {
        id: "kw-1a",
        keyword: "어린이AI 지휘자",
        searchVolume: 8200,
        sentimentScore: 0.58,
        postCount30d: 165,
        trendDirection: "up",
        competitorDensity: "low",
        recommendation: "invest",
        lastAnalyzed: "2026-04-13T05:20:00Z",
        reportId: "demo",
      },
      {
        id: "kw-1b",
        keyword: "어린이 음악교육 앱",
        searchVolume: 14500,
        sentimentScore: 0.45,
        postCount30d: 320,
        trendDirection: "up",
        competitorDensity: "high",
        recommendation: "invest",
        lastAnalyzed: "2026-04-12T10:00:00Z",
        reportId: null,
      },
      {
        id: "kw-1c",
        keyword: "AI 클래식 교육",
        searchVolume: 3200,
        sentimentScore: 0.52,
        postCount30d: 85,
        trendDirection: "flat",
        competitorDensity: "low",
        recommendation: "maintain",
        lastAnalyzed: "2026-04-10T14:00:00Z",
        reportId: null,
      },
      {
        id: "kw-1d",
        keyword: "초등 음악 수업 앱",
        searchVolume: 9800,
        sentimentScore: 0.38,
        postCount30d: 210,
        trendDirection: "flat",
        competitorDensity: "high",
        recommendation: "maintain",
        lastAnalyzed: "2026-04-08T09:00:00Z",
        reportId: null,
      },
      {
        id: "kw-1e",
        keyword: "유아 리듬 게임",
        searchVolume: 6100,
        sentimentScore: 0.22,
        postCount30d: 145,
        trendDirection: "down",
        competitorDensity: "high",
        recommendation: "abandon",
        lastAnalyzed: "2026-04-05T11:00:00Z",
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
  const [view, setView] = useState<View>(hasToken ? { screen: "products" } : { screen: "landing" });
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
    setView({ screen: "products" });
  };

  const handleLogout = () => {
    apiLogout();
    setAuthUser(null);
    setView({ screen: "landing" });
  };

  const goBack = () => {
    if (view.screen === "keyword-report")
      setView({ screen: "product-detail", productId: view.productId });
    else if (view.screen === "product-detail") setView({ screen: "products" });
    else setView({ screen: "products" });
  };

  const currentProduct =
    view.screen === "product-detail" || view.screen === "keyword-report"
      ? (DEMO_PRODUCTS.find((p) => p.id === view.productId) ?? null)
      : null;
  const currentKeyword =
    view.screen === "keyword-report" && currentProduct
      ? (currentProduct.keywords.find((k) => k.id === view.keywordId) ?? null)
      : null;

  if (view.screen === "landing") {
    return <LandingPage onLogin={handleLogin} />;
  }

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

  return (
    <div className="app">
      <ToastContainer toasts={toasts} />
      <nav className="global-nav">
        <div className="nav-left">
          <span
            className="nav-logo"
            onClick={() => {
              setView({ screen: "products" });
            }}
          >
            GoldenCheck
          </span>
        </div>
        <div className="nav-links">
          <span
            className={`nav-link ${view.screen === "products" ? "nav-active" : ""}`}
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
          {authUser?.role === "admin" && (
            <span
              className={`nav-link ${view.screen === "admin" ? "nav-active" : ""}`}
              onClick={() => setView({ screen: "admin" })}
            >
              관리자
            </span>
          )}
        </div>
        <div className="nav-right">
          <span className="nav-user nav-user-link" onClick={() => setView({ screen: "settings" })}>
            {authUser?.name ?? authUser?.email ?? "Demo User"}
          </span>
          <button type="button" className="nav-logout" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </nav>

      <div className="app-body">
        {view.screen !== "products" &&
          view.screen !== "admin" &&
          view.screen !== "sample" &&
          view.screen !== "settings" && (
            <div className="back-row">
              <button type="button" className="back-btn" onClick={goBack}>
                ← 뒤로
              </button>
            </div>
          )}

        {view.screen === "products" && (
          <ProductsGrid
            tenantId={tenantId}
            demoProducts={DEMO_PRODUCTS}
            onSelect={(id, isDemo) => setView({ screen: "product-detail", productId: id, isDemo })}
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
            onKeywordSelect={(kw) =>
              setView({ screen: "keyword-report", productId: view.productId, keywordId: kw })
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

        {view.screen === "admin" && authUser?.role === "admin" && <AdminPanel />}

        {view.screen === "settings" && authUser && (
          <SettingsPage user={authUser} onUpdate={(u) => setAuthUser(u)} />
        )}

        {view.screen === "sample" && <SampleReportView />}
      </div>

      <footer className="app-footer">
        <a href="/terms">이용약관</a>
        <a href="/privacy">개인정보처리방침</a>
        <a href="/about">사업자 정보</a>
      </footer>
    </div>
  );
}

/* ══════════════════════ Landing Page ══════════════════════ */

function LandingPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 이메일 재설정 링크로 진입 시 모달 자동 표시
  useEffect(() => {
    if (urlResetToken) {
      setShowLogin(true);
      // URL에서 토큰 파라미터 제거
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [urlResetToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if ((isRegister || resetMode === "token") && password !== passwordConfirm) {
      setAuthError("비밀번호가 일치하지 않습니다");
      return;
    }
    setLoading(true);
    try {
      if (verifyMode) {
        const res = await apiVerifyEmail(verifyEmail, verifyCode);
        onLogin(res.user);
        return;
      }
      if (resetMode === "request") {
        await apiForgotPassword(email);
        setAuthSuccess("재설정 링크가 이메일로 발송되었습니다");
        setResetMode("token");
      } else if (resetMode === "token") {
        await apiResetPassword(resetToken, password);
        setAuthSuccess("비밀번호가 변경되었습니다. 로그인하세요.");
        setResetMode("done");
      } else if (isRegister) {
        const regRes = await apiRegister(email, password, name || undefined);
        if (regRes.requireVerification) {
          setVerifyMode(true);
          setVerifyEmail(regRes.email);
          setAuthSuccess("인증 코드가 이메일로 발송되었습니다");
        }
      } else {
        const res = await apiLogin(email, password);
        onLogin(res.user);
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
      setLoading(false);
    }
  };

  const goBackToLogin = () => {
    setResetMode("off");
    setResetToken("");
    setPassword("");
    setAuthError(null);
    setAuthSuccess(null);
  };

  const enterDemo = () => {
    clearToken();
    onLogin({
      id: "demo",
      tenantId: DEFAULT_TENANT,
      email: "demo@goldencheck.kr",
      name: "Demo User",
      role: "owner",
    });
  };

  return (
    <div className="landing">
      <nav className="landing-nav">
        <span
          className="nav-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ cursor: "pointer" }}
        >
          GoldenCheck
        </span>
        <div className="landing-nav-links">
          <a href="#features">기능</a>
          <a href="#sample">분석 샘플</a>
          <a href="#pricing">요금제</a>
          <a href="#faq">FAQ</a>
          <button
            type="button"
            className="btn-login"
            onClick={() => {
              setShowLogin(true);
              setIsRegister(false);
            }}
          >
            로그인
          </button>
        </div>
      </nav>

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
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
            <form className="login-form" onSubmit={handleSubmit}>
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
                    disabled={loading || verifyCode.length !== 6}
                  >
                    {loading ? "처리 중..." : "인증 완료"}
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
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
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </>
                  )}
                  <label>이메일</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <label>비밀번호</label>
                  <div className="pw-field">
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder={
                        isRegister ? "8자 이상, 대소문자+숫자+특수문자" : "비밀번호 입력"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                        <li className={password.length >= 8 ? "pw-ok" : ""}>8자 이상</li>
                        <li className={/[a-z]/.test(password) ? "pw-ok" : ""}>소문자</li>
                        <li className={/[A-Z]/.test(password) ? "pw-ok" : ""}>대문자</li>
                        <li className={/[0-9]/.test(password) ? "pw-ok" : ""}>숫자</li>
                        <li className={/[^a-zA-Z0-9]/.test(password) ? "pw-ok" : ""}>특수문자</li>
                      </ul>
                      <label>비밀번호 확인</label>
                      <div className="pw-field">
                        <input
                          type={showPw ? "text" : "password"}
                          placeholder="비밀번호를 다시 입력"
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
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
                  <button type="submit" className="btn-primary-lg" disabled={loading}>
                    {loading
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
            <button type="button" className="modal-close" onClick={() => setShowLogin(false)}>
              x
            </button>
          </div>
        </div>
      )}

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
          <button
            type="button"
            className="btn-primary-lg"
            onClick={() => {
              setShowLogin(true);
              setIsRegister(true);
            }}
          >
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
              예: '어린이AI 지휘자'
              <br />
              + 동작인식 / 음악교육 / 클래식앱
              <br />+ 경쟁사: JoyTunes, 야마하
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
          키워드 '어린이AI 지휘자'를 등록하고 AI 에이전트가 즉시 생성한 분석 결과입니다.
        </p>
        <div className="sample-stats">
          <div className="sample-stat">
            <div className="sample-stat-value">39%</div>
            <div className="sample-stat-label">SOV 점유율</div>
            <div className="sample-stat-sub">경쟁사 대비 1위</div>
          </div>
          <div className="sample-stat">
            <div className="sample-stat-value">58%</div>
            <div className="sample-stat-label">긍정 감성</div>
            <div className="sample-stat-sub">부정 18% / 중립 24%</div>
          </div>
          <div className="sample-stat">
            <div className="sample-stat-value">5만건</div>
            <div className="sample-stat-label">3개월 언급량</div>
            <div className="sample-stat-sub">에듀테크 최고 성장</div>
          </div>
          <div className="sample-stat sample-stat-alert">
            <div className="sample-stat-value">2.5x</div>
            <div className="sample-stat-label">가격 저항 급증</div>
            <div className="sample-stat-sub">즉시 대응 필요</div>
          </div>
        </div>

        <div className="sample-insights">
          <div className="insight-card insight-risk">
            <div className="insight-tag">리스크 자동 감지</div>
            <p>맘카페 '비싸다/해지' 언급 14건 급증 (전주 대비 2.5배)</p>
            <div className="insight-action">AI 즉시 권고: 무료 체험 14일 연장 + 연간 할인 도입</div>
          </div>
          <div className="insight-card insight-gap">
            <div className="insight-tag">경쟁사 갭 발견</div>
            <p>JoyTunes 학부모 리뷰 영상 월 8회, 평균 5만 조회</p>
            <div className="insight-action">AI 즉시 권고: 숏폼 챌린지 시리즈 선제 런칭</div>
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
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setShowLogin(true);
                setIsRegister(true);
              }}
            >
              시작하기
            </button>
          </div>
          <div className="price-card price-featured">
            <div className="price-badge">추천</div>
            <h3>Professional</h3>
            <div className="price">월 150만원</div>
            <ul>
              <li>제품 20개 / 키워드 100개</li>
              <li>무제한 분석</li>
              <li>통합 리포트 + 실행 전략</li>
              <li>리스크 시그널 실시간 알림</li>
              <li>전담 매니저</li>
            </ul>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setShowLogin(true);
                setIsRegister(true);
              }}
            >
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
        <button
          type="button"
          className="btn-primary-lg"
          onClick={() => {
            setShowLogin(true);
            setIsRegister(true);
          }}
        >
          무료 체험 시작하기
        </button>
      </section>

      <footer className="landing-footer">
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
        <h2>내 제품</h2>
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
  onKeywordSelect: (keyword: string) => void;
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
                  onClick={() => onKeywordSelect(kw.keyword)}
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
                        onKeywordSelect(kw.keyword);
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
