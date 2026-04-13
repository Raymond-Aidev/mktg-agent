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

export function App() {
  const [tenantId, setTenantId] = useState<string>(DEFAULT_TENANT);
  const [pendingTenant, setPendingTenant] = useState<string>(DEFAULT_TENANT);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [data, setData] = useState<DashboardKpis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showOperator, setShowOperator] = useState<boolean>(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [ov, kpis] = await Promise.all([fetchOverview(id), fetchKpis(id)]);
      setOverview(ov);
      setData(kpis);
    } catch (err) {
      setError((err as Error).message);
      setOverview(null);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tenantId);
  }, [tenantId, load]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingTenant.trim().length > 0) {
      setTenantId(pendingTenant.trim());
    }
  };

  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>GoldenCheck</h1>
          <p className="header-subtitle">교육상품 마케팅 AI 분석</p>
        </div>
        <button
          type="button"
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
          title="계정 설정"
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

      {loading && <div className="status-loading">데이터를 불러오는 중…</div>}
      {error && <div className="status-error">{error}</div>}

      {!loading && !error && overview && (
        <BusinessOverview overview={overview} tenantId={tenantId} />
      )}

      {/* ── 질문 2: 뭘 수정해야 하나? ── */}
      <ChannelCard tenantId={tenantId} />
      <CompetitorCard tenantId={tenantId} />

      {/* ── 질문 3: 더 좋은 방법은? ── */}
      <section className="section-header">
        <h2>시장 반응 분석하기</h2>
        <p>
          키워드를 입력하면 네이버 뉴스·블로그·카페에서 자동으로 여론을 수집하고, AI가 분석 리포트를
          생성합니다.
        </p>
      </section>
      <SignalcraftPanel tenantId={tenantId} />

      {/* ── 상세 (접기) ── */}
      <section className="panel collapse-section">
        <div className="op-header">
          <h2>상세 데이터</h2>
          <button type="button" onClick={() => setShowOperator(!showOperator)}>
            {showOperator ? "접기" : "바이어 · 캠페인 · 관리자"}
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

      <footer className="app-footer">
        <a href="/terms">이용약관</a>
        <a href="/privacy">개인정보처리방침</a>
        <a href="/about">사업자 정보</a>
      </footer>
    </div>
  );
}

/* ----------------------------- Business v2 ----------------------------- */

function BusinessOverview({ overview }: { overview: DashboardOverview; tenantId: string }) {
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
                긍정 {(overview.brandSentiment.positive * 100).toFixed(0)}% · 부정{" "}
                {(overview.brandSentiment.negative * 100).toFixed(0)}% · 중립{" "}
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
          마지막 분석: {new Date(overview.lastAnalyzedAt).toLocaleString()} · 키워드: "
          {overview.latestKeyword}"
        </div>
      )}
    </>
  );
}

/* ------------------------------ Channels ------------------------------- */

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
      {data.email && data.email.sent > 0 && (
        <div className="ch-email">
          <strong>이메일</strong>: 발송 {data.email.sent} · 열람 {data.email.opened} · 클릭{" "}
          {data.email.clicked} · 열람률 {(data.email.openRate * 100).toFixed(1)}%
        </div>
      )}
    </section>
  );
}

/* ----------------------------- Competitors ----------------------------- */

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
              {c.country ?? "—"} · {c.genres.slice(0, 3).join(", ") || "—"}
            </div>
            <div className="comp-stat">
              신작 {c.recentTitleCount}건
              {c.topTitle && <span className="comp-title"> · {c.topTitle}</span>}
            </div>
          </div>
        ))}
      </div>
      {data.competitorGaps.length > 0 && (
        <div className="comp-gaps">
          <h3>경쟁사 약점 & 우리의 기회</h3>
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

/* ----------------------------- SignalCraft ----------------------------- */

const STATUS_LABEL: Record<SignalcraftJob["status"], string> = {
  queued: "대기 중",
  collecting: "Stage 1 — 수집",
  analyzing: "Stage 3 — 분석",
  rendering: "Stage 4 — 렌더",
  done: "완료",
  failed: "실패",
};

const TERMINAL: SignalcraftJob["status"][] = ["done", "failed"];

function SignalcraftPanel({ tenantId }: { tenantId: string }) {
  const [keyword, setKeyword] = useState<string>("children's books");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SignalcraftJob | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
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
        if (TERMINAL.includes(fresh.status)) {
          clearPoll();
        }
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
          placeholder="예: children's books"
        />
        <button type="submit" disabled={submitting || !keyword.trim()}>
          {submitting ? "제출 중…" : "실행"}
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
            <span>jobId {job.id.slice(0, 8)}…</span>
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
                  새 탭에서 열기 ↗
                </a>
                <a href={`/api/v1/reports/${job.reportId}`} target="_blank" rel="noreferrer">
                  JSON 보기
                </a>
              </div>
              <ActionButtons jobId={job.id} tenantId={job.tenant_id} />
              <iframe
                key={job.reportId}
                title="SignalCraft integrated report"
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

/* ------------------------------ Action Buttons ----------------------------- */

function ActionButtons({ jobId, tenantId }: { jobId: string; tenantId: string }) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onGenerate = async (actionType: "campaign_draft" | "content_calendar") => {
    setGenerating(actionType);
    setErr(null);
    setResult(null);
    try {
      const res = await generateAction({ jobId, tenantId, actionType });
      setResult(res);
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
          {generating === "campaign_draft" ? "생성 중…" : "캠페인 초안 생성"}
        </button>
        <button
          type="button"
          onClick={() => onGenerate("content_calendar")}
          disabled={generating !== null}
          className="action-btn"
        >
          {generating === "content_calendar" ? "생성 중…" : "콘텐츠 캘린더 생성"}
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

/* -------------------------------- Buyers -------------------------------- */

function BuyersPanel({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<{ total: number; buyers: Buyer[] } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchBuyers(tenantId, 25)
      .then((res) => {
        if (cancelled) return;
        setData({ total: res.total, buyers: res.buyers });
      })
      .catch((e) => {
        if (cancelled) return;
        setErr((e as Error).message);
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
      {loading && <div className="status-loading">Loading buyers…</div>}
      {err && <div className="status-error">{err}</div>}
      {!loading && !err && data && data.buyers.length === 0 && (
        <div className="status-empty">
          No buyers for this tenant yet. Phase 2 buyers:bologna crawler is gated on legal review
          (OI-04).
        </div>
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

/* ------------------------------- Operator ------------------------------- */

function OperatorPanel() {
  const [open, setOpen] = useState<boolean>(false);
  const [data, setData] = useState<OperatorOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchOperatorOverview();
      setData(res);
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
          {open ? "닫기" : "열기 (basic auth)"}
        </button>
        {open && (
          <button type="button" onClick={load} className="btn-secondary">
            새로고침
          </button>
        )}
      </div>
      {open && loading && <div className="status-loading">Loading…</div>}
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
                <strong>{name}</strong>: w={c.waiting} a={c.active} c={c.completed} f=
                {c.failed}
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
                  <th>Newest last_seen</th>
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
            {data.llmCost.length === 0 && <div>No calls.</div>}
            {data.llmCost.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th className="num">Calls</th>
                    <th className="num">Input</th>
                    <th className="num">Output</th>
                    <th className="num">Cost (USD)</th>
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
            <h3>Recent crawler failures (24h)</h3>
            {data.crawlerFailures.length === 0 && <div>No failures.</div>}
            {data.crawlerFailures.length > 0 && (
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
        <h2>FX rates → KRW (live)</h2>
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
          <div className="status-empty">No campaign events in window.</div>
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
                  <td>{c.campaignId.slice(0, 8)}…</td>
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
          <div className="status-empty">No adoption events in window.</div>
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
          <div className="status-empty">No LLM calls in window.</div>
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
