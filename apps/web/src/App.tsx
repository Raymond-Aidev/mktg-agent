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
  | { screen: "product-report"; productId: string }
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

/* ══════════════════════ Profile Dropdown ══════════════════════ */

function ProfileDropdown({
  user,
  onSettings,
  onLogout,
}: {
  user: AuthUser;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭으로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 이니셜 생성
  const name = user.name ?? user.email;
  const initials = name.length <= 2 ? name.toUpperCase() : name.slice(0, 2).toUpperCase();

  const roleLabel: Record<string, string> = { admin: "관리자", owner: "소유자" };
  const roleText = roleLabel[user.role] ?? "멤버";

  const itemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "9px 16px",
    fontSize: 13,
    border: "none",
    background: "none",
    textAlign: "left",
    cursor: "pointer",
    color: "var(--text)",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 0",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#4F46E5",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {initials}
        </div>
        <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
          {user.name ?? user.email.split("@")[0]}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            transition: "transform .2s",
            transform: open ? "rotate(180deg)" : "none",
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            width: 240,
            background: "var(--bg-card, #fff)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            zIndex: 999,
            overflow: "hidden",
          }}
        >
          {/* 프로필 정보 */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
              {user.name ?? "이름 미설정"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{user.email}</div>
            <div style={{ fontSize: 11, color: "#4F46E5", marginTop: 4, fontWeight: 500 }}>
              {roleText}
            </div>
          </div>

          {/* 메뉴 항목 */}
          <div style={{ padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
            <button
              type="button"
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-subtle, #f1f5f9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
              onClick={() => {
                setOpen(false);
                onSettings();
              }}
            >
              프로필 설정
            </button>
            <button
              type="button"
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-subtle, #f1f5f9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
              onClick={() => {
                setOpen(false);
                onSettings();
              }}
            >
              비밀번호 변경
            </button>
          </div>

          {/* 로그아웃 */}
          <div style={{ padding: "4px 0" }}>
            <button
              type="button"
              style={{ ...itemStyle, color: "var(--danger, #dc2626)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-subtle, #f1f5f9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
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
                className={`nav-link ${view.screen === "products" || view.screen === "product-detail" || view.screen === "keyword-timeline" || view.screen === "product-report" ? "nav-active" : ""}`}
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
            <ProfileDropdown
              user={authUser}
              onSettings={() => setView({ screen: "settings" })}
              onLogout={handleLogout}
            />
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
              onReportView={
                currentProduct.id === "prod-1"
                  ? () => setView({ screen: "product-report", productId: currentProduct.id })
                  : undefined
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

          {view.screen === "product-report" && (
            <ProductReportView
              productName={DEMO_PRODUCTS.find((p) => p.id === view.productId)?.name ?? ""}
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
  onReportView,
}: {
  product: DemoProduct;
  onKeywordSelect: (kwId: string) => void;
  onReportView?: () => void;
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

      {onReportView && (
        <section className="panel" style={{ textAlign: "center", padding: "24px" }}>
          <button
            type="button"
            className="btn-primary"
            style={{ width: "auto", padding: "14px 32px", fontSize: 16 }}
            onClick={onReportView}
          >
            통합 분석 리포트 보기
          </button>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            10개 연관검색어 복합 분석 — {product.name} 판매 전략 리포트
          </p>
        </section>
      )}

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

/* ══════════════════════ Product Report View (통합 리포트) ══════════════════════ */

/* ── 시각화 헬퍼 ── */
const BAR_H = 22;
const COLORS = {
  accent: "#4F46E5",
  success: "var(--success, #16a34a)",
  danger: "var(--danger, #dc2626)",
  warn: "var(--warning, #f59e0b)",
  muted: "var(--text-muted, #94a3b8)",
  bg: "var(--bg-subtle, #f1f5f9)",
};

function HBar({
  value,
  max,
  color,
  label,
  sub,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  sub?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 4 }}>
      <span
        style={{
          width: 150,
          fontWeight: 500,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          background: COLORS.bg,
          borderRadius: 4,
          height: BAR_H,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(value / max) * 100}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
            transition: "width .3s",
          }}
        />
      </div>
      <span style={{ width: 90, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
        {sub ?? value.toLocaleString()}
      </span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 140px",
        background: "var(--bg-card, #fff)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "14px 16px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
      {sub && (
        <div style={{ fontSize: 11, color: color ?? "var(--text-muted)", marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

function TagBadge({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: color + "18",
        color,
        marginRight: 6,
        marginBottom: 4,
      }}
    >
      {text}
    </span>
  );
}

function SectionPanel({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel" style={{ marginBottom: 20 }}>
      <h3
        style={{
          margin: "0 0 16px",
          fontSize: 16,
          borderBottom: "2px solid var(--accent, #4F46E5)",
          paddingBottom: 8,
          color: "var(--accent, #4F46E5)",
        }}
      >
        {num}. {title}
      </h3>
      {children}
    </section>
  );
}

function ProductReportView({ productName }: { productName: string }) {
  const totalMentions = DEMO_SOV.reduce((s, v) => s + v.mentions, 0);

  /* 가격 비교 데이터 */
  const priceData = [
    { name: "토토LP", initial: 14.8, annual: 22, ours: true },
    { name: "하티하티", initial: 7.9, annual: 18, ours: false },
    { name: "세이펜", initial: 4.9, annual: 29, ours: false },
    { name: "핑크퐁", initial: 6.9, annual: 25, ours: false },
    { name: "윤선생", initial: 0, annual: 59, ours: false },
  ];
  const maxAnnual = Math.max(...priceData.map((p) => p.annual));

  /* 키워드 퍼널 데이터 */
  const funnelData = [
    {
      stage: "인지 (미인지 시장)",
      volume: "64,500건/월",
      width: "100%",
      problem: "토토LP 노출률 18% — 세이펜(34%) 대비 절반",
    },
    {
      stage: "탐색 (브랜드 관심)",
      volume: "31,400건/월",
      rate: "전환 43%↓",
      width: "75%",
      problem: "삐아제 아는데 토토LP 페이지에 안 감",
    },
    {
      stage: "비교 (후기 탐색)",
      volume: "11,000건/월",
      rate: "이탈 62%↑",
      width: "50%",
      problem: "후기→단점 이탈 62% (업계 평균 35~40%)",
    },
    {
      stage: "구매",
      volume: "350~400건/월",
      width: "28%",
      problem: "전환율 0.54% — 업계 평균(1.2%) 절반",
    },
  ];

  /* SOV-긍정률 매트릭스 데이터 */
  const sovMatrix = DEMO_SOV.map((s) => ({
    ...s,
    x: s.mentions,
    y: s.rate,
    size: Math.max(s.mentions * 1.8, 44),
  }));

  return (
    <>
      {/* 헤더 */}
      <div className="page-title">
        <h2>{productName} — 통합 분석 리포트</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          10개 연관검색어 복합 분석 · {new Date().toLocaleDateString("ko-KR")} 기준
        </p>
      </div>

      {/* ═══ KPI 대시보드 ═══ */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <MetricCard label="월간 검색량" value="111,700" sub="10개 연관검색어 합산" />
        <MetricCard
          label="SOV (점유율)"
          value="38%"
          sub="1위 — 그러나 위태"
          color={COLORS.accent}
        />
        <MetricCard label="긍정률" value="47%" sub="경쟁 5사 중 최하위" color={COLORS.danger} />
        <MetricCard label="장바구니 이탈" value="65%" sub="가격 오해가 원인" color={COLORS.warn} />
        <MetricCard
          label="미포획 시장"
          value="32,300"
          sub="건/월 — 토토LP 미인지"
          color={COLORS.muted}
        />
        <MetricCard
          label="월 매출 잠재력"
          value="+5,870만"
          sub="전략 실행 시 추가"
          color={COLORS.success}
        />
      </div>

      {/* ═══ 1. 진단 요약 ═══ */}
      <SectionPanel num={1} title="진단 요약 — 토토LP는 지금 어디에 있는가">
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div
            style={{
              flex: "1 1 200px",
              background: "var(--card-red)",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.danger, marginBottom: 4 }}>
              인식-현실 갭
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              소비자: "14.8만원 = 최고가"
              <br />
              현실: 1년 비용은 세이펜보다 7만원 저렴
              <br />→ 91건 가격 불만, 65% 이탈
            </div>
          </div>
          <div
            style={{
              flex: "1 1 200px",
              background: "var(--card-orange)",
              border: "1px solid #fed7aa",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.warn, marginBottom: 4 }}>
              인지도-호감도 역전
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              SOV 38% 1위이나 긍정률 47% 꼴찌
              <br />
              핑크퐁 72% · 세이펜 68%
              <br />→ 광고 늘리면 부정 구전만 확대
            </div>
          </div>
          <div
            style={{
              flex: "1 1 200px",
              background: "var(--card-blue)",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, marginBottom: 4 }}>
              시장 사각지대
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              잠재 고객 32,300건/월
              <br />
              토토LP 노출률 5~19%
              <br />→ 존재 자체를 모르는 부모들
            </div>
          </div>
        </div>
        <div
          style={{
            background: "var(--card-green)",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            padding: 14,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong>결론:</strong> 광고 투자 전에{" "}
          <TagBadge text="가격 오해 해소" color={COLORS.danger} />
          <TagBadge text="긍정 후기 확보" color={COLORS.warn} />
          <TagBadge text="미인지 시장 진입" color={COLORS.accent} /> 순서로 선행해야 한다. 순서가
          바뀌면 부정 구전만 늘어난다.
        </div>
      </SectionPanel>

      {/* ═══ 2. 구매 퍼널 ═══ */}
      <SectionPanel num={2} title="소비자 인식 지도 — 구매 퍼널">
        {/* 가로 퍼널 바 */}
        <div style={{ marginBottom: 16 }}>
          {funnelData.map((f, i) => {
            const widthPct = [100, 49, 17, 6][i] ?? 10;
            const barColors = [COLORS.accent, "#6366f1", COLORS.warn, COLORS.success];
            return (
              <div key={f.stage} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 160 }}>{f.stage}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{f.volume}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      background: COLORS.bg,
                      borderRadius: 6,
                      height: 28,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${widthPct}%`,
                        height: "100%",
                        background: barColors[i],
                        borderRadius: 6,
                        minWidth: 4,
                        transition: "width .3s",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      minWidth: 50,
                      textAlign: "right",
                    }}
                  >
                    {widthPct === 100 ? "" : `${widthPct}%`}
                  </span>
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, paddingLeft: 2 }}
                >
                  {f.rate && (
                    <span style={{ color: COLORS.danger, fontWeight: 600, marginRight: 4 }}>
                      {f.rate}
                    </span>
                  )}
                  {f.problem}
                </div>
              </div>
            );
          })}
        </div>
        {/* 하단 요약 */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              flex: 1,
              minWidth: 200,
              background: "var(--card-red)",
              border: "1px solid #fecaca",
              borderRadius: 6,
              padding: 10,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <strong>최대 병목:</strong> 비교 단계에서 후기 검색자의 62%가 '단점' 검색으로 이탈 (업계
            평균 35~40%)
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 200,
              background: "var(--card-blue)",
              border: "1px solid #bfdbfe",
              borderRadius: 6,
              padding: 10,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <strong>전환율:</strong> 0.54~0.62% → 업계 평균(1.2%) 대비 절반. 비교 이탈 방지가 매출
            직결
          </div>
        </div>
      </SectionPanel>

      {/* ═══ 3. 감성 + SOV 매트릭스 ═══ */}
      <SectionPanel num={3} title="경쟁 포지션 — SOV vs 긍정률 매트릭스">
        {/* 감성 바 */}
        <div
          style={{
            display: "flex",
            height: 28,
            borderRadius: 6,
            overflow: "hidden",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: `${DEMO_SENTIMENT.positive * 100}%`,
              background: COLORS.success,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            긍정 {(DEMO_SENTIMENT.positive * 100).toFixed(0)}%
          </div>
          <div
            style={{
              width: `${DEMO_SENTIMENT.negative * 100}%`,
              background: COLORS.danger,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            부정 {(DEMO_SENTIMENT.negative * 100).toFixed(0)}%
          </div>
          <div
            style={{
              width: `${DEMO_SENTIMENT.neutral * 100}%`,
              background: "#d1d5db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            중립 {(DEMO_SENTIMENT.neutral * 100).toFixed(0)}%
          </div>
        </div>

        {/* SOV-긍정률 시각화 */}
        <div
          style={{
            position: "relative",
            height: 220,
            background: COLORS.bg,
            borderRadius: 8,
            marginTop: 16,
            padding: "20px 20px 30px 50px",
          }}
        >
          {/* 축 레이블 */}
          <div
            style={{
              position: "absolute",
              left: 4,
              top: "50%",
              transform: "rotate(-90deg) translateX(50%)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            긍정률 →
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 4,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            언급량 (SOV) →
          </div>
          {/* 사분면 라벨 */}
          <div
            style={{
              position: "absolute",
              right: 12,
              top: 8,
              fontSize: 10,
              color: COLORS.success,
              fontWeight: 600,
            }}
          >
            High SOV + High 긍정 = 이상적
          </div>
          <div
            style={{
              position: "absolute",
              right: 12,
              bottom: 32,
              fontSize: 10,
              color: COLORS.danger,
              fontWeight: 600,
            }}
          >
            High SOV + Low 긍정 = 위험
          </div>
          {/* 버블들 */}
          {sovMatrix.map((s) => {
            const xPct = Math.min(((s.x - 5) / 42) * 70 + 10, 88);
            const yPct = Math.max(90 - ((s.y - 40) / 40) * 75, 8);
            const bubbleColor = s.ours
              ? COLORS.accent
              : s.rate >= 65
                ? COLORS.success
                : s.rate >= 55
                  ? "#6366f1"
                  : COLORS.muted;
            return (
              <div
                key={s.brand}
                style={{
                  position: "absolute",
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  transform: "translate(-50%,-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    width: s.size,
                    height: s.size,
                    borderRadius: "50%",
                    background: bubbleColor,
                    border: `3px solid ${s.ours ? "#312e81" : "#e2e8f0"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "#fff",
                      fontWeight: 700,
                      textShadow: "0 1px 2px rgba(0,0,0,.4)",
                    }}
                  >
                    {s.rate}%
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: s.ours ? 700 : 500,
                    color: s.ours ? COLORS.accent : "var(--text)",
                    whiteSpace: "nowrap",
                    background: "rgba(255,255,255,.85)",
                    padding: "1px 4px",
                    borderRadius: 3,
                  }}
                >
                  {s.brand.split("(")[0].trim()} {s.mentions}건
                </span>
              </div>
            );
          })}
        </div>
        <div
          style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, textAlign: "center" }}
        >
          토토LP: SOV 1위(38%)이나 긍정률 47%로 최하위 → "논란의 중심" 포지션. 인지도 투자 전 긍정률
          개선이 선행되어야 함
        </div>
      </SectionPanel>

      {/* ═══ 4. 가격 인식 vs 현실 ═══ */}
      <SectionPanel num={4} title="가격의 진실 — 초기 가격 vs 1년 총비용">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>초기 구매 가격</div>
            {priceData.map((p) => (
              <HBar
                key={p.name + "i"}
                value={p.initial}
                max={15}
                color={p.ours ? COLORS.danger : COLORS.muted}
                label={p.name}
                sub={p.initial > 0 ? `${p.initial}만원` : "0원"}
              />
            ))}
            <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 6, textAlign: "center" }}>
              소비자 인식: "토토LP = 가장 비싸다"
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              1년 총소유비용 (TCO)
            </div>
            {[...priceData]
              .sort((a, b) => a.annual - b.annual)
              .map((p) => (
                <HBar
                  key={p.name + "a"}
                  value={p.annual}
                  max={maxAnnual}
                  color={p.ours ? COLORS.success : COLORS.muted}
                  label={p.name}
                  sub={`${p.annual}만원`}
                />
              ))}
            <div style={{ fontSize: 11, color: COLORS.success, marginTop: 6, textAlign: "center" }}>
              현실: 토토LP는 4위 — 세이펜보다 7만원 저렴
            </div>
          </div>
        </div>
        <div
          style={{
            background: "var(--card-yellow)",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: 12,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          이 오해로 인한 피해: 월 91건 가격 불만 · 장바구니 이탈률 65% · 월 추정 180세트 판매 손실
          <br />
          <strong>처방:</strong> 상세페이지 최상단에 '1년 총비용 비교 인포그래픽' 배치 + "하루
          1,644원" 프레이밍
        </div>
      </SectionPanel>

      {/* ═══ 5. 경쟁 SOV ═══ */}
      <SectionPanel num={5} title="경쟁 지형 — SOV 점유율과 전장별 승패">
        {DEMO_SOV.map((s) => (
          <HBar
            key={s.brand}
            value={s.mentions}
            max={totalMentions * 0.5}
            color={s.ours ? COLORS.accent : COLORS.muted}
            label={`${s.ours ? "★ " : ""}${s.brand}`}
            sub={`${s.mentions}건 · 긍정 ${s.rate}%`}
          />
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {[
            { kw: "유아 오디오 교구", us: 38, them: 32, who: "세이펜", win: true },
            { kw: "동화 카드 플레이어", us: 24, them: 41, who: "세이펜", win: false },
            { kw: "말하는 카드 교구", us: 19, them: 28, who: "하티하티", win: false },
          ].map((b) => (
            <div
              key={b.kw}
              style={{
                flex: "1 1 180px",
                border: `1px solid ${b.win ? "var(--card-green-border)" : "var(--card-red-border)"}`,
                borderRadius: 8,
                padding: 10,
                background: b.win ? "#f0fdf4" : "#fef2f2",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                {b.kw}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                토토LP {b.us}% vs {b.who} {b.them}%
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: b.win ? COLORS.success : COLORS.danger,
                  fontWeight: 600,
                }}
              >
                {b.win ? "우세 — 유지 필요" : "열세 — 즉시 공략"}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            토토LP의 해자 (경쟁사 모방 불가)
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <TagBadge text="촉각학습 논문 (어휘 +28%)" color={COLORS.accent} />
            <TagBadge text="교육청 인증 · 유치원 50곳" color={COLORS.success} />
            <TagBadge text="LP카드 물리적 학습 경험" color="#7c3aed" />
          </div>
        </div>
      </SectionPanel>

      {/* ═══ 6. 전환 병목 ═══ */}
      <SectionPanel num={6} title="구매 전환 병목 — 3곳의 누수">
        {[
          {
            title: "브랜드→제품 전환 단절",
            loss: "15,800건/월",
            desc: "'한국삐아제' 검색자 중 '키즈LP토토' 전환 43%. 브랜드 페이지→제품 페이지 랜딩 최적화 필요",
            color: COLORS.warn,
          },
          {
            title: "후기→부정 이탈",
            loss: "2,600건/월",
            desc: "후기→단점 전환 62% (업계 35~40%). 긍정 영상 후기 12% vs 핑크퐁 35%. 부정 콘텐츠가 SEO 1위",
            color: COLORS.danger,
          },
          {
            title: "카테고리→제품 미연결",
            loss: "32,300건/월",
            desc: "6개 카테고리 키워드 중 SOV 1위는 '유아 오디오 교구' 1곳뿐. 나머지 5곳에서 5~24% 열세",
            color: COLORS.muted,
          },
        ].map((b) => (
          <div
            key={b.title}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              marginBottom: 12,
              padding: 12,
              background: COLORS.bg,
              borderRadius: 8,
              borderLeft: `4px solid ${b.color}`,
            }}
          >
            <div style={{ minWidth: 80, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: b.color }}>{b.loss}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>유입 손실</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>{b.desc}</div>
            </div>
          </div>
        ))}
        <div
          style={{
            textAlign: "center",
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 700,
            color: COLORS.danger,
          }}
        >
          3개 병목 합산 판매 손실: 월 추정 370세트 (약 5,480만원)
        </div>
      </SectionPanel>

      {/* ═══ 7. 방치 vs 실행 시나리오 ═══ */}
      <SectionPanel num={7} title="방치 vs 실행 — 6개월 후 예측">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              flex: 1,
              minWidth: 250,
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: 14,
              background: "var(--card-red)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger, marginBottom: 10 }}>
              시나리오 A: 방치
            </div>
            {[
              { period: "1개월", metric: "부정 게시물 검색 상위 고착" },
              { period: "3개월", metric: "SOV 38%→30%, 교육청 모멘텀 소멸" },
              { period: "6개월", metric: "월 판매 350→220건, 연 매출 -2.3억" },
            ].map((r) => (
              <div
                key={r.period}
                style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}
              >
                <span style={{ fontWeight: 600, color: COLORS.danger, minWidth: 50 }}>
                  {r.period}
                </span>
                <span>{r.metric}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 250,
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: 14,
              background: "var(--card-green)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.success, marginBottom: 10 }}>
              시나리오 B: 전략 실행
            </div>
            {[
              { period: "1개월", metric: "가격 불만 40%↓, 영상 후기 12→20%" },
              { period: "3개월", metric: "SEO 3→7개, 긍정률 47→55%" },
              { period: "6개월", metric: "월 판매 350→600건, 연 매출 +4.4억" },
            ].map((r) => (
              <div
                key={r.period}
                style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}
              >
                <span style={{ fontWeight: 600, color: COLORS.success, minWidth: 50 }}>
                  {r.period}
                </span>
                <span>{r.metric}</span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            marginTop: 12,
            padding: 12,
            background: COLORS.bg,
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          <strong>6개월 격차:</strong> 연{" "}
          <span style={{ color: COLORS.success, fontWeight: 700 }}>6.7억원</span> · 투자 월
          1,200만원 · <span style={{ fontWeight: 700 }}>ROI 9.3x</span>
        </div>
      </SectionPanel>

      {/* ═══ 8. 3단계 로드맵 ═══ */}
      <SectionPanel num={8} title="통합 전략 — 3단계 로드맵">
        {[
          {
            phase: "1단계: 방어",
            period: "1~2주",
            color: COLORS.danger,
            bg: "var(--card-red)",
            items: [
              "상세페이지 '1년 총비용 비교표' 최상단",
              "2년 무상 보증 + 48시간 교환 발표",
              "맘카페 부정 게시물 팩트 답변",
              "3개월 무이자 (하루 1,644원)",
            ],
            target: "가격 불만 40%↓, 이탈률 65→45%",
          },
          {
            phase: "2단계: 전환",
            period: "3~4주",
            color: COLORS.warn,
            bg: "var(--card-yellow)",
            items: [
              "아이 반응 숏폼 월 8회",
              "VS 세이펜 비교 블로그 (네이버 SEO)",
              "네이버 쇼핑 광고 3키워드 (월 300만원)",
              "만족 구매자 후기 캠페인",
            ],
            target: "긍정률 +8%p, 월 +120세트",
          },
          {
            phase: "3단계: 확장",
            period: "5~8주",
            color: COLORS.success,
            bg: "var(--card-green)",
            items: [
              "'두돌 교구 추천' 연령별 가이드",
              "'말하는 카드 교구 TOP4' 콘텐츠",
              "교사 활용 가이드 PDF + 체험존 확대",
              "LP카드 번들팩·정기구독 상품",
            ],
            target: "잠재 시장 노출 5→25%, 월 +150세트",
          },
        ].map((p) => (
          <div
            key={p.phase}
            style={{
              marginBottom: 12,
              border: `1px solid ${p.color}30`,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: p.bg,
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 700, color: p.color, fontSize: 14 }}>{p.phase}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.period}</span>
            </div>
            <div style={{ padding: "10px 14px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {p.items.map((item) => (
                  <span
                    key={item}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      background: COLORS.bg,
                      borderRadius: 4,
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: p.color, fontWeight: 600 }}>목표: {p.target}</div>
            </div>
          </div>
        ))}
        <div
          style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0", lineHeight: 1.6 }}
        >
          <strong>순서의 이유:</strong> 방어(1단계) 없이 콘텐츠(2단계)를 만들면 "비싸다" 댓글이
          달리고, 신규 시장(3단계)에 가도 불만 선입견이 따라온다.
        </div>
      </SectionPanel>

      {/* ═══ 9. 투자와 ROI ═══ */}
      <SectionPanel num={9} title="투자 계획과 기대 수익">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "8px 6px" }}>채널</th>
              <th style={{ textAlign: "center", padding: "8px 6px" }}>우선순위</th>
              <th style={{ textAlign: "right", padding: "8px 6px" }}>월 투자</th>
              <th style={{ textAlign: "right", padding: "8px 6px" }}>ROI</th>
            </tr>
          </thead>
          <tbody>
            {[
              { ch: "네이버 블로그 SEO", pri: 10, inv: "200만", roi: "5.8x" },
              { ch: "네이버 쇼핑 광고", pri: 9, inv: "300만", roi: "4.2x" },
              { ch: "인스타 릴스", pri: 8, inv: "150만", roi: "3.5x" },
              { ch: "유튜브", pri: 7, inv: "100만", roi: "2.8x" },
              { ch: "맘카페 대응", pri: 6, inv: "50만", roi: "방어" },
              { ch: "오프라인 체험존", pri: 5, inv: "400만", roi: "2.1x" },
            ].map((r) => (
              <tr key={r.ch} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 6px" }}>{r.ch}</td>
                <td style={{ textAlign: "center", padding: "8px 6px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <div
                      style={{
                        width: `${r.pri * 8}px`,
                        height: 8,
                        background: COLORS.accent,
                        borderRadius: 4,
                      }}
                    />
                    <span style={{ fontSize: 11 }}>{r.pri}/10</span>
                  </div>
                </td>
                <td style={{ textAlign: "right", padding: "8px 6px", fontWeight: 600 }}>{r.inv}</td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "8px 6px",
                    color: COLORS.success,
                    fontWeight: 600,
                  }}
                >
                  {r.roi}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 700 }}>
              <td style={{ padding: "10px 6px" }}>합계</td>
              <td></td>
              <td style={{ textAlign: "right", padding: "10px 6px" }}>1,200만원</td>
              <td style={{ textAlign: "right", padding: "10px 6px", color: COLORS.success }}>
                4.9x
              </td>
            </tr>
          </tfoot>
        </table>
        <div
          style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}
        >
          예상 추가 매출: <strong>월 5,870만원</strong> · 손익분기점: 82세트/월
        </div>
      </SectionPanel>

      {/* ═══ 10. 30일 액션 플랜 ═══ */}
      <SectionPanel num={10} title="30일 액션 플랜">
        {[
          {
            week: "1주차",
            label: "방어 기반",
            color: COLORS.danger,
            actions: [
              "네이버 쇼핑 검색광고 3키워드 세팅 (월 300만원)",
              "상세페이지 리뉴얼: 1년 비교표 + 연구 데이터 + 인증 뱃지 + 보증",
              "맘카페 부정 게시물 공식 팩트 답변",
            ],
          },
          {
            week: "2주차",
            label: "콘텐츠 시작",
            color: COLORS.warn,
            actions: [
              "VS 세이펜 비교 블로그 발행 (네이버 SEO)",
              "아이 반응 숏폼 시리즈 런칭 (월 8회)",
              "3개월 무이자 + LP카드 5장 증정 이벤트",
            ],
          },
          {
            week: "3주차",
            label: "시장 확장",
            color: COLORS.accent,
            actions: [
              "'두돌 세돌 교구 추천' SEO 블로그 시리즈",
              "체험 후 구매 프로그램 런칭 (2주 대여→전액 차감)",
            ],
          },
          {
            week: "4주차",
            label: "확장 콘텐츠",
            color: COLORS.success,
            actions: [
              "교사 활용 가이드 PDF 제작·배포",
              "'말하는 카드 교구 TOP4 비교' 콘텐츠",
              "LP카드 번들팩 + 정기구독 상품 기획",
            ],
          },
        ].map((w) => (
          <div
            key={w.week}
            style={{ marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}
          >
            <div style={{ minWidth: 70, textAlign: "center", padding: "6px 0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: w.color }}>{w.week}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{w.label}</div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {w.actions.map((a) => (
                <div
                  key={a}
                  style={{
                    fontSize: 13,
                    padding: "6px 10px",
                    background: COLORS.bg,
                    borderRadius: 4,
                    borderLeft: `3px solid ${w.color}`,
                  }}
                >
                  {a}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 16, padding: 14, background: COLORS.bg, borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>30일 목표 KPI</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { label: "SEO 상위 10위", from: "3개", to: "7개" },
              { label: "추가 판매", from: "0", to: "+250~400세트" },
              { label: "긍정률", from: "47%", to: "52%" },
              { label: "이탈률", from: "65%", to: "50%" },
              { label: "부정/긍정 비율", from: "2:1", to: "1:1" },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  flex: "1 1 140px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{k.label}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  <span style={{ color: COLORS.danger }}>{k.from}</span>
                  <span style={{ margin: "0 4px" }}>→</span>
                  <span style={{ color: COLORS.success, fontWeight: 700 }}>{k.to}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionPanel>

      {/* 하단 */}
      <div
        style={{ textAlign: "center", padding: "20px 0", fontSize: 12, color: "var(--text-muted)" }}
      >
        본 분석은 네이버 뉴스·맘카페·HackerNews 기반 샘플 분석이며, 수치는 수집 범위 내
        추정치입니다.
      </div>
    </>
  );
}

/* ══════════════════════ Demo Report View (시드 데이터 기반) ══════════════════════ */

const DEMO_REPORT_SECTIONS = [
  {
    id: "section-1",
    title: "진단 요약 — 토토LP는 지금 어디에 있는가",
    sourceModule: "#08",
    content:
      "토토LP(한국삐아제)는 유아 오디오 교구 시장에서 가장 많이 언급되는 제품이면서, 동시에 가장 많이 불만이 제기되는 제품이다. 10개 연관검색어(월 111,700건)를 복합 분석한 결과, 토토LP의 현재 위치는 '높은 인지도 속의 낮은 전환율' — 시장은 토토LP를 알지만 사지 않는 구조적 문제가 확인된다.\n\n핵심 진단 3가지:\n\n1. [인식-현실 갭] 소비자는 토토LP를 '가장 비싼 교구(14.8만원)'로 인식하지만, 1년 총소유비용으로 보면 세이펜(29만원)·핑크퐁(25만원)보다 저렴하다. 이 오해가 91건의 가격 불만과 65% 장바구니 이탈의 핵심 원인이다.\n\n2. [인지도-호감도 역전] 온라인 언급 점유율(SOV) 38%로 1위지만, 긍정률은 47%로 경쟁 5사 중 꼴찌다. 핑크퐁(72%)·세이펜(68%)와 비교하면 '많이 알려졌지만 인상은 나쁜' 위험한 포지션이다. 지금 상태에서 광고비를 늘리면 부정 구전만 확대된다.\n\n3. [시장 사각지대] 토토LP의 잠재 고객인 '두돌 세돌 교구 탐색'(19,800건/월), '말하는 카드 교구'(5,300건), '누리과정 교구'(7,200건) 등 합산 32,300건의 검색에서 토토LP 노출률은 5~19%에 불과하다. 이 시장의 부모들은 토토LP의 존재 자체를 모른다.\n\n결론: 토토LP는 '광고 투자' 전에 '가격 오해 해소 + 긍정 후기 확보 + 미인지 시장 진입'을 선행해야 한다. 순서가 바뀌면 매출이 아니라 부정 구전이 늘어난다.",
  },
  {
    id: "section-2",
    title: "시장 속의 토토LP — 소비자 인식 지도",
    sourceModule: "#01",
    content:
      "10개 연관검색어를 토토LP에 대한 소비자 인식 단계별로 재구성하면, 토토LP가 시장에서 어떤 위치에 있는지 입체적으로 보인다.\n\n[1층: 토토LP를 전혀 모르는 시장 — 월 32,300건]\n  '두돌 세돌 교구 추천'(19,800건)·'누리과정 교구'(7,200건)·'말하는 카드 교구'(5,300건)\n  이 부모들은 교구를 찾고 있지만 토토LP가 선택지에 없다. 카테고리 검색 결과에서 세이펜·핑크퐁·하티하티가 상위를 점유하고, 토토LP는 검색 3페이지 이후에 노출된다.\n  → 잠재력: 이 시장의 감성 점수가 54~65%로 높다 — 교구에 대한 호감이 있는 상태. 토토LP가 진입하기만 하면 전환 가능성이 가장 높은 층이다.\n\n[2층: 카테고리는 알지만 토토LP를 비교 대상으로만 보는 시장 — 월 36,900건]\n  '유아 오디오 교구'(15,600건)·'동화 카드 플레이어'(8,900건)·'유아 음악 교구 추천'(12,400건)\n  이 부모들은 교구 종류를 알고 2~3개를 비교 중이다. 토토LP는 언급되지만 '비싸다'는 프레임 속에 갇혀 있다. 세이펜이 '가성비', 핑크퐁이 '캐릭터', 윤선생이 '체계'로 명확한 포지션을 가진 반면, 토토LP는 '좋다던데 비싸다'라는 모호한 인식.\n  → 핵심 문제: 비교 시점에서 토토LP의 차별점이 '촉각학습·어휘 유지율 28%'라는 데이터로 전달되지 않고 있다.\n\n[3층: 토토LP를 알고, 관심이 있는 시장 — 월 31,400건]\n  '한국삐아제'(22,000건)·'키즈 LP 토토'(9,400건)\n  브랜드 또는 제품명을 직접 검색하는 관심 고객이다. 그러나 브랜드 검색(22,000건) 대비 제품 검색(9,400건)이 43% 수준 — 삐아제를 아는 사람 중 절반 이상이 토토LP 제품 페이지에 도달하지 못한다.\n  → 핵심 문제: '한국삐아제' 검색 → 토토LP 제품 페이지 랜딩 최적화가 안 되어 있다.\n\n[4층: 구매 직전에서 이탈하는 시장 — 월 11,000건]\n  '토토LP 후기'(6,800건)·'토토LP 단점'(4,200건)\n  가장 구매에 가까운 고객이지만, 후기 탐색자의 62%가 단점 검색으로 넘어간다(업계 평균 35~40%). 즉, 후기를 찾다가 오히려 '안 사는 이유'를 발견하는 구조.\n  → 핵심 문제: 긍정 후기(특히 영상)의 절대 부족 + 가격·품질 불만이 검색 상위를 점유.",
  },
  {
    id: "section-3",
    title: "인식 vs 현실 — 토토LP가 풀어야 할 3가지 오해",
    sourceModule: "#03",
    content:
      "10개 연관검색어에서 수집된 2,677건의 게시물을 교차 분석하면, 토토LP에 대한 소비자 인식과 실제 사이에 심각한 괴리가 3곳에서 발생하고 있다. 이 오해를 풀지 않으면 어떤 마케팅도 '비싼 교구' 프레임을 강화하는 역효과를 낳는다.\n\n◆ 오해 1: '토토LP는 가장 비싼 교구다'\n  소비자 인식: 초기 가격 14.8만원 → '교구치고 너무 비싸다' (91건 불만, 전주 대비 1.8배)\n  실제 현실: 1년 총소유비용 비교\n    토토LP 22만원 < 핑크퐁 25만원 < 세이펜 29만원 < 윤선생 59만원\n  왜 오해가 생겼나: 경쟁사는 낮은 초기 가격 + 높은 유지비용 구조인데, 소비자는 초기 가격만 비교한다. 토토LP는 이 반대(높은 초기 + 낮은 유지)인데 이를 전달하는 콘텐츠가 전무하다.\n  비용: 이 오해로 인한 장바구니 이탈률 추정 65%, 월 약 180세트 판매 손실.\n  처방: 상세페이지·블로그·광고에 '1년 총비용 비교 인포그래픽' 전면 배치. '하루 1,644원'으로 프레이밍.\n\n◆ 오해 2: '토토LP는 품질이 나쁘다'\n  소비자 인식: '3개월 만에 고장' '모터 소리' 'AS 느림' (38건 불만, 별점 4.2→3.6)\n  실제 현실: 턴테이블 고장률 8%(업계 평균 5~7% 대비 약간 높은 수준). 치명적이기보다 AS 대응 속도(평균 7일)가 문제.\n  왜 오해가 확대됐나: 고가 제품이기 때문에 품질 기대치가 높고, 기대 대비 실망이 '비싸면서 고장까지'라는 복합 불만으로 증폭됐다. 소비자원 상담 40% 증가가 이를 방증.\n  비용: 별점 4.2→3.6 하락 → 네이버 쇼핑 클릭률 추정 -18%, 월 약 70세트 판매 손실.\n  처방: ① 2년 무상 보증 + 48시간 교환 정책 즉시 발표 ② 기존 구매자 무상 점검 이벤트 ③ 보증 정책을 상세페이지 구매 버튼 바로 위에 배치.\n\n◆ 오해 3: '토토LP는 LP만 틀어주는 단순한 교구다'\n  소비자 인식: '노래만 나오고 대화 연습은 안 됨'(29건), '세이펜이랑 뭐가 다른 거예요?'(44건)\n  실제 현실: AI 발음 분석(아동 음성 정확도 87%), 파닉스 체계 학습, 촉각 학습 효과(어휘 유지율 +28%), 누리과정 연계 인증 교구.\n  왜 오해가 생겼나: 공식 비교 콘텐츠 0건. 세이펜은 주 3회 비교 블로그를 발행하며 '가성비 교구' 프레임을 선점했고, 토토LP는 차별점을 설명하는 콘텐츠 자체가 없다.\n  비용: 비교 검색(44건/주)에서 세이펜으로 이탈하는 고객 → 월 약 120세트 판매 손실.\n  처방: '토토LP vs 세이펜' 데이터 기반 비교 콘텐츠 즉시 발행. 핵심: '1년 총비용 + 어휘 유지율 28%'.",
  },
  {
    id: "section-4",
    title: "경쟁 지형과 토토LP의 해자 — 어디서 이기고, 어디서 지는가",
    sourceModule: "#06",
    content:
      "10개 연관검색어에서 동시 언급되는 경쟁 교구를 추적하면, 토토LP가 실제로 경쟁하는 전장(戰場)과 각 전장에서의 승패가 드러난다.\n\n◆ 전장 1: '오디오 교구' 카테고리 — 토토LP 우세, 그러나 위태로움\n  SOV: 토토LP 38% vs 세이펜 32% (1위이나 6%p 차이)\n  토토LP 강점: 촉각학습 연구 논문, 교육청 인증, 아날로그+디지털 융합이라는 유일한 포지션\n  위협: 세이펜이 월 3회 비교 콘텐츠로 추격 중. 가격 프레임에서는 세이펜 압도적 우세.\n\n◆ 전장 2: '카드 플레이어' 카테고리 — 토토LP 열세\n  SOV: 세이펜 41% vs 토토LP 24% (세이펜이 '동화 카드 플레이어'라는 카테고리명 자체를 선점)\n  토토LP 강점: 영어 파닉스 전문 + LP카드 200장 (세이펜 호환도서 방식 대비 편의성)\n  위협: 하티하티가 7.9만원에 급부상(SOV 28%, 3개월 전 12%에서 2.3배 성장)\n\n◆ 전장 3: '연령별 교구 추천' 카테고리 — 토토LP 부재\n  SOV: 세이펜 31% · 핑크퐁 27% · 토토LP 5% 미만 (사실상 존재하지 않음)\n  이 전장의 규모: 월 19,800건(두돌 세돌) + 12,400건(음악 교구 추천) = 32,200건\n  토토LP 강점: 2~5세 타깃 연령과 완벽 부합하지만 콘텐츠 자체가 없음\n\n◆ 전장 4: '교육과정 연계' 카테고리 — 토토LP 유리한 고지\n  SOV: 윤선생 22% vs 토토LP 18% (근소차이, 교육청 인증으로 역전 가능)\n  토토LP 강점: 서울시교육청 50곳 채택이라는 유일무이한 레퍼런스\n  기회: 교사 콘텐츠 0건 → 교사 추천 콘텐츠만 확보하면 B2B+B2C 동시 역전 가능\n\n◆ 토토LP의 진짜 해자(moat)\n  경쟁사가 단기간에 모방할 수 없는 토토LP만의 자산:\n  ① 촉각학습 효과 논문 (어휘 유지율 +28%) — 연구 근거가 있는 교구는 토토LP뿐\n  ② 교육청 인증 + 유치원 50곳 채택 — B2B 레퍼런스\n  ③ LP카드라는 독특한 물리적 경험 — 캐릭터나 펜과는 본질적으로 다른 '의식적 학습 행위'\n  → 이 3가지를 모든 마케팅 메시지의 중심에 놓아야 한다. 가격 할인이 아니라 '가치 인식 전환'이 전략의 핵심.",
  },
  {
    id: "section-5",
    title: "구매 전환 병목 해부 — 알면서도 안 사는 이유",
    sourceModule: "#03",
    content:
      "토토LP의 가장 심각한 문제는 '인지도는 있는데 안 팔린다'는 것이다. 연관검색어 간 교차 분석으로 구매 전환이 끊어지는 정확한 지점 3곳을 특정했다.\n\n◆ 병목 1: 브랜드 → 제품 전환 단절 (손실 추정: 월 15,800건 유입 소실)\n  현상: '한국삐아제'(22,000건) 검색자 중 '키즈LP토토'(9,400건)로 이어지는 비율이 43%\n  원인: 한국삐아제 검색 결과에서 토토LP 제품 페이지가 아닌 브랜드 소개·다른 제품이 먼저 노출\n  해법: '한국삐아제' 검색 랜딩 페이지를 토토LP 제품 페이지로 최적화. 네이버 브랜드 검색 광고에서 토토LP를 메인 제품으로 노출.\n\n◆ 병목 2: 후기 탐색 → 부정 이탈 전환 (손실 추정: 월 2,600건의 구매 직전 고객 이탈)\n  현상: '토토LP 후기'(6,800건) → '토토LP 단점'(4,200건) 전환율 62% (업계 평균 35~40%)\n  원인 분석:\n    a) 긍정 후기 영상 비율 12% — 핑크퐁(35%)·세이펜(28%) 대비 절대 열세\n    b) 네이버 블로그 검색 1~3위가 모두 단점·비교 게시물 (긍정 콘텐츠의 SEO 부재)\n    c) 맘카페 '가성비 논란' 게시물(조회 8만)이 검색 유입의 34%를 차지\n  해법: ① 실사용 아이 반응 숏폼 월 8회 발행 → 영상 후기 비율 12%→30% ② 긍정 후기 블로그 SEO로 검색 1위 탈환 ③ 맘카페 논란 게시물에 공식 팩트 답변.\n\n◆ 병목 3: 카테고리 인지 → 제품 인지 차단 (손실 추정: 월 32,300건의 잠재 고객 미접촉)\n  현상: 교구 카테고리 검색(두돌 세돌·음악 교구·말하는 카드 등) 64,500건 중 토토LP 노출률 18%\n  원인: 카테고리 키워드 SEO에서 세이펜(34%)·핑크퐁(24%)이 상위를 독점. 토토LP는 '유아 오디오 교구'에서만 38%로 1위이고, 나머지 5개 카테고리 키워드에서는 5~24%로 열세.\n  해법: 주 2회 카테고리 키워드 타깃 블로그 SEO 콘텐츠 발행. 우선순위: '두돌 세돌 교구 추천'(19,800건) → '유아 음악 교구 추천'(12,400건) → '말하는 카드 교구'(5,300건).\n\n[종합] 3개 병목의 합산 판매 손실: 월 추정 370세트(약 5,480만원). 이 병목을 해소하는 것이 광고비 증액보다 ROI가 높다.",
  },
  {
    id: "section-6",
    title: "숨은 시장 — 아직 토토LP를 모르는 잠재 고객",
    sourceModule: "#06",
    content:
      "'유아 오디오 교구'와 직접적으로 연결되지 않는 연관검색어들 — '두돌 세돌 교구 추천', '말하는 카드 교구', '누리과정 교구' — 에서 토토LP가 거의 노출되지 않는 대규모 잠재 시장이 존재한다. 이 시장들은 감성 점수가 높고(54~65%), 아직 특정 제품에 대한 충성도가 형성되기 전이라 선점 효과가 크다.\n\n◆ 잠재 시장 1: '첫 교구를 찾는 부모' — 월 19,800건\n  이 부모들의 특성: 자녀 24~36개월, 교구 자체가 처음, 브랜드 선호도 미형성\n  현재 1위 교구: 세이펜(31%) — '가격이 부담 없다'는 이유로 추천 게시물 점유\n  토토LP 진입 전략: '두돌 아이 첫 영어, 스크린 없이 LP카드로' — 연령 맞춤 가이드 콘텐츠. 체험존 무료 체험으로 첫 접점. 이 시장에서의 감성 점수(65%)는 전체 키워드 중 최고 → 긍정적 첫인상 형성 가능.\n\n◆ 잠재 시장 2: '비디지털 교구를 원하는 부모' — 월 5,300건\n  이 부모들의 특성: 태블릿·스크린 교구에 대한 피로감, '아이 눈 건강' 걱정, 대안 적극 탐색\n  현재 1위 교구: 하티하티(28%) — 7.9만원 가성비 + 한국어 동화 카드\n  토토LP 진입 전략: 토토LP의 핵심 해자인 '스크린 없는 촉각학습'이 이 시장의 니즈와 정확히 일치. 그런데 토토LP SOV가 19%로 3위. '디지털 디톡스 영어 교육'이라는 트렌드 프레임으로 포지셔닝하면 하티하티(한국어 동화 전용) 대비 명확한 차별점.\n\n◆ 잠재 시장 3: '기관 구매 담당자' — 월 7,200건\n  이 시장의 특성: 유치원 원장·교사, 교육과정 연계 필수, 의사결정에 '공인 인증'이 핵심 기준\n  현재 1위: 윤선생(22%) — 체계적 커리큘럼 포지셔닝\n  토토LP 진입 전략: 서울시교육청 50곳 채택이라는 레퍼런스는 이미 확보. 그런데 이를 알리는 교사 콘텐츠가 0건. 교사 활용 가이드 PDF + 도입 사례 인터뷰만 발행해도 B2B 월 25세트 추가 판매 잠재력.\n\n[종합 기회] 이 3개 잠재 시장의 합산 32,300건을 공략하면, 전환율 1.5% 기준 월 485건의 추가 제품 노출 → 추정 150세트 추가 판매(약 2,220만원/월). 현재 이 시장에서 토토LP에 대한 부정적 인식이 없기 때문에, 긍정적 첫인상을 심을 수 있는 '처녀지'다.",
  },
  {
    id: "section-7",
    title: "변곡점과 모멘텀 — 지금 움직여야 하는 이유",
    sourceModule: "#01",
    content:
      "10개 연관검색어 트렌드를 종합하면, 토토LP에 유리한 외부 모멘텀과 방치하면 돌이킬 수 없는 위협이 동시에 존재한다. 향후 30일이 '선순환 진입' vs '악순환 고착'의 분기점이다.\n\n◆ 유리한 모멘텀 (지금 잡아야 할 기회)\n\n  [04-11] 교육청 누리과정 교구 선정 → 공신력 확보\n    연관검색어 '누리과정 교구' 검색량 1.4배 증가. 이 모멘텀은 2~3주 내 소멸.\n    → 즉시 활용: '교육부 인증 뱃지' 상세페이지 최상단 + 교사 추천 콘텐츠 발행\n\n  [04-09] 어휘 유지율 28% 논문 발표 → 가격 정당화 핵심 무기\n    '유아 오디오 교구' 감성 +3%p, 비교 검색에서 토토LP 언급 긍정률 일시 상승.\n    → 즉시 활용: 이 논문 수치를 모든 비교 콘텐츠의 핵심 데이터로 사용\n\n  [04-04] 교보문고 체험존 사전예약 500건/일 → 체험 수요 폭발 검증\n    체험→구매 전환율 35~40%는 온라인 전환율(0.5~0.6%)의 60배.\n    → 즉시 활용: 체험존 전국 확대(이마트·영풍문고) + 체험 후 온라인 구매 연결\n\n◆ 방치하면 악화되는 위협\n\n  [04-06] 소비자원 상담 40% 증가 + 맘카페 가성비 논란 조회 8만\n    '토토LP 단점' 검색이 1.8배 증가했고, 이 추세가 꺾이지 않으면 '부정 구전 → 검색 부정 상위 고착 → 전환율 추가 하락'의 악순환 시작.\n    → 공식 대응 없이 2주 경과 시: 부정 게시물이 네이버 검색 1~5위를 영구 점유하게 됨\n\n  세이펜 신제품 + 하티하티 급성장\n    하티하티 SOV 3개월 만에 12%→28%. 세이펜 신제품 티저 후 검색량 2.1배. 두 경쟁사가 동시에 공격하는 상황에서 토토LP가 응전하지 않으면, 6개월 내 SOV 38%→25%로 하락할 수 있다.\n\n[결론] 모멘텀(교육청 인증·논문·체험존)의 유통기한은 2~3주. 위협(부정 구전·경쟁사 공세)은 매일 누적된다. 지금이 행동 시점이다.",
  },
  {
    id: "section-8",
    title: "방치 시나리오 vs 실행 시나리오 — 6개월 후",
    sourceModule: "#07",
    content:
      "◆ 시나리오 A: 현상 유지 (아무것도 하지 않을 경우)\n\n  1개월 후: 맘카페 부정 게시물이 네이버 검색 상위 고착. 세이펜 신제품 출시로 비교 검색에서 토토LP 열세 심화.\n  3개월 후: 하티하티가 '말하는 카드 교구' 시장 SOV 40%로 장악. 토토LP 전체 SOV 38%→30%로 하락. 교육청 인증 모멘텀 소멸.\n  6개월 후: 긍정률 47%→40% 추가 하락. 부정 프레임 '비싸고 고장나는 교구' 고착. 월 판매 350건→220건 예상. 연 매출 약 2.3억 감소.\n\n◆ 시나리오 B: 이 리포트의 전략 실행\n\n  1개월 후: 가격 오해 해소 콘텐츠(1년 비용 비교표)로 가격 불만 40% 감소. 네이버 쇼핑 검색광고 가동으로 카테고리 유입 시작. 긍정 숏폼 8회 발행으로 영상 후기 비율 12%→20%.\n  3개월 후: SEO 상위 키워드 3개→7개. '두돌 세돌 교구' 시장 진입으로 신규 고객층 확보. 긍정률 47%→55% 회복. 체험 후 구매 프로그램으로 전환율 +2%p.\n  6개월 후: SOV 38%→42% 확대 + 긍정률 55%→60%. 월 판매 350건→600건. 연 매출 약 4.4억 증가.\n\n◆ 두 시나리오의 격차\n  6개월 후 연간 매출 차이: 약 6.7억원\n  필요 투자: 월 1,200만원 (6개월 합계 7,200만원)\n  투자 대비 효과: 6.7억 / 0.72억 = ROI 9.3x\n\n결론: 이 전략의 핵심은 '광고비 증액'이 아니라 '인식 전환'이다. 가격 오해를 풀고, 긍정 콘텐츠를 만들고, 미인지 시장에 진입하는 것 — 이 순서로 실행하면 월 1,200만원 투자로 연 6.7억 매출 증가가 가능하다.",
  },
  {
    id: "section-9",
    title: "통합 전략 — 3단계 시장 공략 로드맵",
    sourceModule: "#07",
    content:
      "토토LP의 문제는 '알려지지 않아서'가 아니라 '잘못 알려져서'다. 따라서 전략의 순서가 핵심이다.\n\n━━━ 1단계: 방어 — 부정 인식 차단 (1~2주) ━━━\n목표: 가격 오해 해소 + 품질 불안 해소 + 부정 구전 차단\n\n  ① 상세페이지에 '1년 총비용 비교 인포그래픽' 최상단 배치\n     메시지: '초기 14.8만원, 하지만 1년이면 세이펜보다 7만원 저렴합니다'\n  ② 2년 무상 보증 + 48시간 교환 정책 공식 발표\n     메시지: '안심하고 써보세요 — 2년 무상 보증'\n  ③ 맘카페 부정 게시물에 공식 팩트 답변 (비용 비교표 + 보증 정책 + 논문 데이터)\n  ④ 3개월 무이자 할부 도입 → '하루 1,644원' 가격 프레이밍\n  ⑤ 체험 후 구매 프로그램: 2주 대여(2만원) → 구매 시 전액 차감\n  예상 효과: 가격 불만 40% 감소, 장바구니 이탈률 65%→45%\n\n━━━ 2단계: 전환 — 긍정 콘텐츠 우위 확보 (3~4주) ━━━\n목표: 긍정률 47%→55% + 후기→단점 이탈률 62%→45% + 비교 검색 포획\n\n  ① 실구매자 아이 반응 숏폼 월 8회 (인스타 릴스 + 유튜브)\n     핵심: '아이가 LP카드를 스스로 꺼내는 순간' — 자기주도 학습의 시각적 증거\n  ② '토토LP vs 세이펜' 데이터 기반 비교 블로그 (네이버 SEO)\n     핵심: '1년 비용 + 어휘 유지율 28% + 촉각학습 논문' 3종 데이터\n  ③ 기존 만족 구매자 후기 캠페인 (포토리뷰 500원 적립)\n  ④ 네이버 쇼핑 검색광고 3개 키워드 세팅 (월 300만원)\n  예상 효과: 긍정률 +8%p, 월 추가 120세트 판매\n\n━━━ 3단계: 확장 — 미인지 시장 진입 (5~8주) ━━━\n목표: 잠재 시장 32,300건 중 토토LP 노출률 5%→25%\n\n  ① '두돌 아이 첫 영어 교구' 연령별 가이드 블로그 시리즈 (주 2회)\n  ② '말하는 카드 교구 TOP4 비교' — 하티하티 대비 차별점 부각\n  ③ 누리과정 교사 활용 가이드 PDF + 도입 사례 인터뷰 콘텐츠\n  ④ 체험존 전국 확대 (이마트·영풍문고) + 온라인 구매 연결\n  ⑤ LP카드 번들팩(6장 20% 할인) + 정기구독(월 2장 15% 할인)\n  예상 효과: 월 추가 150세트 판매, B2B 25세트 추가\n\n[왜 이 순서인가]\n1→2→3 순서를 지키는 이유: 부정 인식을 먼저 차단하지 않으면(1단계), 긍정 콘텐츠를 만들어도 '비싸다' 댓글이 달리고(2단계 무력화), 신규 시장에 들어가도 '불만 많은 교구'라는 선입견이 따라온다(3단계 무력화). 방어 → 전환 → 확장, 이 순서가 전략의 핵심이다.",
  },
  {
    id: "section-10",
    title: "투자 계획과 기대 수익 — 숫자로 보는 전략",
    sourceModule: "#07",
    content:
      "◆ 채널별 투자 배분과 ROI\n\n  네이버 블로그 SEO | 월 200만원 | 커버: 7개 키워드 | ROI 5.8x\n    학부모 교구 검색의 70%가 네이버. 가격 비교·연령별 추천·교사 추천 콘텐츠 발행.\n\n  네이버 쇼핑 검색광고 | 월 300만원 | 커버: 3개 구매 키워드 | ROI 4.2x\n    현재 광고 미집행 → 경쟁사에 구매 전환을 전량 빼앗기는 상태. 즉시 가동 필수.\n\n  인스타그램 릴스 | 월 150만원 | 커버: 후기·체험 | ROI 3.5x\n    아이 반응 숏폼 + 체험존 하이라이트. 바이럴 잠재력 극대.\n\n  유튜브 | 월 100만원 | 커버: 비교·교사 추천 | ROI 2.8x\n    비교 리뷰 + 교사 인터뷰 숏폼. 비교 검색 유입 포획.\n\n  맘카페 대응 | 월 50만원 | 커버: 부정 여론 방어 | ROI 측정 불가(방어 가치)\n    부정 게시물 모니터링 + 팩트 기반 공식 답변. 방치 시 부정 확산.\n\n  오프라인 체험존 | 월 400만원 | 커버: 체험→구매 전환 | ROI 2.1x\n    체험→구매 전환율 35~40%. 온라인 대비 60배 높은 전환율.\n\n◆ 종합\n  월 총 투자: 1,200만원\n  예상 추가 월 매출: 5,870만원 (추가 397세트 × 14.8만원)\n  예상 ROI: 4.9x\n  손익분기점: 82세트/월 (투자 대비 최소 판매량)\n  현재 월 판매: 350~400세트 → 목표: 650~750세트 (6개월 후)",
  },
  {
    id: "section-11",
    title: "30일 액션 플랜 — 누가, 무엇을, 언제",
    sourceModule: "#08",
    content:
      "◆ 1주차 — 방어 기반 구축 (부정 인식 차단)\n[즉시] 상세페이지 리뉴얼: 1년 총비용 비교 인포그래픽 + 어휘 유지율 28% 데이터 + 교육부 인증 뱃지 + 2년 무상 보증\n[즉시] 맘카페 부정 게시물 공식 답변: 비용 비교표 + 보증 정책 + 논문 데이터\n[즉시] 네이버 쇼핑 검색광고 세팅: 3개 구매 키워드 (월 300만원)\n[즉시] 2년 무상 보증 + 48시간 교환 정책 공식 발표\n\n◆ 2주차 — 전환 콘텐츠 시작\n[실행] 'VS 세이펜' 비교 블로그 발행 (네이버 SEO)\n[실행] 실구매자 아이 반응 숏폼 촬영·발행 시작 (월 8회)\n[실행] 3개월 무이자 할부 + 첫 구매 LP카드 5장 증정 이벤트\n[실행] 기존 구매자 대상 포토리뷰 캠페인 런칭\n\n◆ 3주차 — 시장 확장 진입\n[실행] '두돌 세돌 교구 추천' 연령별 가이드 블로그 시리즈\n[실행] 체험 후 구매 프로그램 런칭: 2주 대여(2만원) → 구매 시 전액 차감\n[실행] 누리과정 교사 활용 가이드 PDF 제작·배포\n\n◆ 4주차 — 확장 콘텐츠 + 상품 기획\n[실행] '말하는 카드 교구 TOP4 비교' 블로그+인스타 콘텐츠\n[실행] LP카드 번들팩(6장 20% 할인) + 정기구독(월 2장 15% 할인) 상품 기획\n[실행] 체험존 확대 후보지 선정 (이마트·영풍문고)\n\n◆ 30일 목표 KPI\n  SEO 상위 10위 키워드: 3개 → 7개\n  월 추가 판매: +250~400세트 (매출 +3,700~5,900만원)\n  긍정률: 47% → 52%\n  장바구니 이탈률: 65% → 50%\n  후기→단점 이탈률: 62% → 50%\n  부정/긍정 게시물 비율: 2:1 → 1:1",
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
