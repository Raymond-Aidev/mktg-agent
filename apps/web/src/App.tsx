import { useCallback, useEffect, useRef, useState } from "react";
import {
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
  type Buyer,
  type ChannelData,
  type CompetitorData,
  type DashboardKpis,
  type DashboardOverview,
  type OperatorOverview,
  type SignalcraftJob,
} from "./api.ts";

const DEFAULT_TENANT = "00000000-0000-0000-0000-0000000000ee";

/* ══════════════════════ Types & Demo Data ══════════════════════ */

type View =
  | { screen: "products" }
  | { screen: "product-detail"; productId: string }
  | { screen: "keyword-report"; productId: string; keywordId: string };

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

/* ══════════════════════ App Root ══════════════════════ */

export function App() {
  const [tenantId, setTenantId] = useState(DEFAULT_TENANT);
  const [pendingTenant, setPendingTenant] = useState(DEFAULT_TENANT);
  const [view, setView] = useState<View>({ screen: "products" });
  const [showSettings, setShowSettings] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingTenant.trim().length > 0) setTenantId(pendingTenant.trim());
  };

  const currentProduct =
    view.screen !== "products"
      ? (DEMO_PRODUCTS.find((p) => p.id === view.productId) ?? null)
      : null;
  const currentKeyword =
    view.screen === "keyword-report" && currentProduct
      ? (currentProduct.keywords.find((k) => k.id === view.keywordId) ?? null)
      : null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="header-logo" onClick={() => setView({ screen: "products" })}>
            GoldenCheck
          </h1>
          <p className="header-subtitle">교육상품 마케팅 AI 분석</p>
        </div>
        <button
          type="button"
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
        >
          설정
        </button>
      </header>

      {showSettings && (
        <form className="tenant-switcher" onSubmit={onSubmit}>
          <label htmlFor="tenant">계정 ID</label>
          <input
            id="tenant"
            type="text"
            value={pendingTenant}
            onChange={(e) => setPendingTenant(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
          />
          <button type="submit">적용</button>
        </form>
      )}

      <Breadcrumb
        view={view}
        product={currentProduct}
        keyword={currentKeyword}
        onNavigate={setView}
      />

      {view.screen === "products" && (
        <ProductsGrid
          products={DEMO_PRODUCTS}
          onSelect={(id) => setView({ screen: "product-detail", productId: id })}
        />
      )}

      {view.screen === "product-detail" && currentProduct && (
        <ProductDetail
          product={currentProduct}
          onKeywordSelect={(kwId) =>
            setView({ screen: "keyword-report", productId: currentProduct.id, keywordId: kwId })
          }
        />
      )}

      {view.screen === "keyword-report" && currentProduct && currentKeyword && (
        <KeywordReportView keyword={currentKeyword} tenantId={tenantId} />
      )}

      <footer className="app-footer">
        <a href="/terms">이용약관</a>
        <a href="/privacy">개인정보처리방침</a>
        <a href="/about">사업자 정보</a>
      </footer>
    </div>
  );
}

/* ══════════════════════ Breadcrumb ══════════════════════ */

function Breadcrumb({
  view,
  product,
  keyword,
  onNavigate,
}: {
  view: View;
  product: DemoProduct | null;
  keyword: DemoKeyword | null;
  onNavigate: (v: View) => void;
}) {
  if (view.screen === "products") return null;
  return (
    <nav className="breadcrumb">
      <span className="bc-link" onClick={() => onNavigate({ screen: "products" })}>
        내 제품
      </span>
      <span className="bc-sep">/</span>
      {view.screen === "product-detail" && product && (
        <span className="bc-current">{product.name}</span>
      )}
      {view.screen === "keyword-report" && product && (
        <>
          <span
            className="bc-link"
            onClick={() => onNavigate({ screen: "product-detail", productId: product.id })}
          >
            {product.name}
          </span>
          <span className="bc-sep">/</span>
          <span className="bc-current">{keyword?.keyword ?? ""}</span>
        </>
      )}
    </nav>
  );
}

/* ══════════════════════ Products Grid ══════════════════════ */

function ProductsGrid({
  products,
  onSelect,
}: {
  products: DemoProduct[];
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div className="page-title">
        <h2>내 제품</h2>
        <p>제품별 키워드 성과를 모니터링하고 투자 전략을 수립하세요.</p>
      </div>
      <div className="products-grid">
        {products.map((p) => {
          const investCount = p.keywords.filter((k) => k.recommendation === "invest").length;
          const abandonCount = p.keywords.filter((k) => k.recommendation === "abandon").length;
          const avgSentiment =
            p.keywords.reduce((s, k) => s + k.sentimentScore, 0) / p.keywords.length;
          return (
            <div key={p.id} className="product-card" onClick={() => onSelect(p.id)}>
              <h3>{p.name}</h3>
              <p className="product-desc">{p.description}</p>
              <div className="product-meta">
                <span className="product-kw-count">{p.keywords.length}개 키워드</span>
                <span className="product-sentiment" style={{ color: sentimentColor(avgSentiment) }}>
                  감성 {(avgSentiment * 100).toFixed(0)}%
                </span>
              </div>
              <div className="product-tags">
                {investCount > 0 && (
                  <span className="rec-badge rec-invest">투자 {investCount}</span>
                )}
                {abandonCount > 0 && (
                  <span className="rec-badge rec-abandon">철수 {abandonCount}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
      .catch(() => {})
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
      .catch(() => {})
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
      {submitError && <div className="status-error">Error: {submitError}</div>}
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
      {loading && <div className="status-loading">Loading buyers...</div>}
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
      {open && loading && <div className="status-loading">Loading...</div>}
      {open && err && <div className="status-error">{err}</div>}
      {open && data && (
        <div className="op-grid">
          <div className="op-card">
            <h3>Health</h3>
            <div>
              postgres: {data.health.postgres.ok ? "OK" : "FAIL"} ({data.health.postgres.latencyMs}
              ms)
            </div>
            <div>redis: {data.health.redis.ok ? "OK" : "FAIL"}</div>
          </div>
          <div className="op-card">
            <h3>Queues</h3>
            {Object.entries(data.queues).map(([name, c]) => (
              <div key={name}>
                <strong>{name}</strong>: w={c.waiting} a={c.active} c={c.completed} f={c.failed}
              </div>
            ))}
          </div>
          <div className="op-card">
            <h3>SignalCraft jobs (24h)</h3>
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
            <h3>LLM cost (7d)</h3>
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
            <h3>Crawler failures (24h)</h3>
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
        <h2>Agent adoption</h2>
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
        <h2>LLM cost by model</h2>
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
