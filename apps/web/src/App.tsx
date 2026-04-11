import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchKpis,
  fetchSignalcraftJob,
  runSignalcraft,
  type DashboardKpis,
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
  const [data, setData] = useState<DashboardKpis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const kpis = await fetchKpis(id);
      setData(kpis);
    } catch (err) {
      setError((err as Error).message);
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>EduRights AI — Dashboard</h1>
        <span className="phase-tag">Phase 6 — W18</span>
      </header>

      <form className="tenant-switcher" onSubmit={onSubmit}>
        <label htmlFor="tenant">Tenant UUID</label>
        <input
          id="tenant"
          type="text"
          value={pendingTenant}
          onChange={(e) => setPendingTenant(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
        />
        <button type="submit">Load</button>
      </form>

      {loading && <div className="status-loading">Loading KPIs…</div>}
      {error && <div className="status-error">Error: {error}</div>}
      {!loading && !error && data && <Panels data={data} />}

      <SignalcraftPanel tenantId={tenantId} />
    </div>
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
            <div className="sc-actions">
              <a
                href={`/api/v1/reports/${job.reportId}?format=html`}
                target="_blank"
                rel="noreferrer"
              >
                📄 통합 리포트 열기
              </a>
              <a href={`/api/v1/reports/${job.reportId}`} target="_blank" rel="noreferrer">
                {}JSON
              </a>
            </div>
          )}
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
