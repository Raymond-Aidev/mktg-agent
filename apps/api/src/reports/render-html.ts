/**
 * Server-side HTML renderer for SignalCraft integrated reports.
 * Produces a rich visual report with CSS charts, infographics, and
 * structured layouts. No external JS libraries — pure HTML/CSS.
 */

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  sourceModule?: string;
}

export interface ReportRow {
  id: string;
  tenant_id: string;
  job_id: string | null;
  kind: string;
  title: string;
  sections: ReportSection[];
  metadata: Record<string, unknown>;
  created_at: Date;
}

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function renderSentimentChart(mod: Record<string, unknown>): string {
  const ratio = mod.sentimentRatio as
    | { positive: number; negative: number; neutral: number }
    | undefined;
  if (!ratio) return "";
  const pos = Math.round(ratio.positive * 100);
  const neg = Math.round(ratio.negative * 100);
  const neu = Math.round(ratio.neutral * 100);

  const keywords =
    (mod.topKeywords as Array<{ term: string; count: number; sentiment: string }>) ?? [];
  const frames = (mod.frameCompetition as Array<{ label: string; share: number }>) ?? [];

  return `
    <section class="card visual-card">
      <header><h2>감성 분석</h2><span class="badge">#03</span></header>
      <div class="sentiment-visual">
        <div class="donut-container">
          <svg viewBox="0 0 120 120" class="donut">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e4e4e7" stroke-width="16"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" stroke-width="16"
              stroke-dasharray="${pos * 3.14} ${314 - pos * 3.14}" stroke-dashoffset="78.5"
              transform="rotate(-90 60 60)"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#ef4444" stroke-width="16"
              stroke-dasharray="${neg * 3.14} ${314 - neg * 3.14}"
              stroke-dashoffset="${78.5 - pos * 3.14}"
              transform="rotate(-90 60 60)"/>
          </svg>
          <div class="donut-label">
            <div class="donut-pct">${pos}%</div>
            <div class="donut-sub">긍정</div>
          </div>
        </div>
        <div class="sentiment-legend">
          <div class="legend-item"><span class="dot dot-pos"></span>긍정 ${pos}%</div>
          <div class="legend-item"><span class="dot dot-neg"></span>부정 ${neg}%</div>
          <div class="legend-item"><span class="dot dot-neu"></span>중립 ${neu}%</div>
        </div>
      </div>

      ${
        keywords.length > 0
          ? `
      <h3>주요 키워드 TOP 10</h3>
      <div class="keyword-cloud">
        ${keywords
          .slice(0, 10)
          .map((k) => {
            const maxCount = keywords[0]?.count ?? 1;
            const size = 0.75 + (k.count / maxCount) * 0.75;
            const color =
              k.sentiment === "positive"
                ? "#22c55e"
                : k.sentiment === "negative"
                  ? "#ef4444"
                  : "#a1a1aa";
            return `<span class="kw-tag" style="font-size:${size}rem;border-color:${color};color:${color}">${esc(k.term)} <small>${k.count}</small></span>`;
          })
          .join("")}
      </div>`
          : ""
      }

      ${
        frames.length > 0
          ? `
      <h3>프레임 경쟁 분석</h3>
      <div class="h-bars">
        ${frames
          .map((f) => {
            const pct = Math.round(f.share * 100);
            return `<div class="h-bar-row">
            <div class="h-bar-label">${esc(f.label)}</div>
            <div class="h-bar-track"><div class="h-bar-fill" style="width:${pct}%">${pct}%</div></div>
          </div>`;
          })
          .join("")}
      </div>`
          : ""
      }
    </section>`;
}

function renderMacroView(mod: Record<string, unknown>): string {
  const summary = (mod.summary as string) ?? "";
  const direction = (mod.overallDirection as string) ?? "neutral";
  const points =
    (mod.inflectionPoints as Array<{ date: string; event: string; impact: string }>) ?? [];
  const trend =
    (mod.dailyMentionTrend as Array<{ date: string; count: number; sentiment: string }>) ?? [];

  const directionIcon: Record<string, string> = {
    positive: "&#x25B2;",
    negative: "&#x25BC;",
    neutral: "&#x25B6;",
    mixed: "&#x25C6;",
  };
  const directionLabel: Record<string, string> = {
    positive: "상승세",
    negative: "하락세",
    neutral: "보합",
    mixed: "혼조",
  };
  const impactColor: Record<string, string> = {
    high: "#dc2626",
    medium: "#f59e0b",
    low: "#6b7280",
  };

  const maxCount = Math.max(...trend.map((t) => t.count), 1);

  return `
    <section class="card visual-card">
      <header><h2>시장 여론 동향</h2><span class="badge">#01</span></header>
      <div class="direction-banner direction-${esc(direction)}">
        <span class="direction-icon">${directionIcon[direction] ?? "&#x25B6;"}</span>
        <span class="direction-text">전체 방향: <strong>${esc(directionLabel[direction] ?? direction)}</strong></span>
      </div>
      <p class="summary-text">${esc(summary)}</p>

      ${
        trend.length > 0
          ? `
      <h3>일별 언급량 추이</h3>
      <div class="mini-chart">
        ${trend
          .map((t) => {
            const h = Math.round((t.count / maxCount) * 100);
            const color =
              t.sentiment === "positive"
                ? "#22c55e"
                : t.sentiment === "negative"
                  ? "#ef4444"
                  : "#a1a1aa";
            return `<div class="mini-bar-col">
            <div class="mini-bar" style="height:${h}%;background:${color}" title="${t.date}: ${t.count}건"></div>
            <div class="mini-bar-date">${t.date.slice(5)}</div>
          </div>`;
          })
          .join("")}
      </div>`
          : ""
      }

      ${
        points.length > 0
          ? `
      <h3>주요 변곡점</h3>
      <div class="timeline">
        ${points
          .map(
            (p) => `
          <div class="tl-item">
            <div class="tl-dot" style="background:${impactColor[p.impact] ?? "#6b7280"}"></div>
            <div class="tl-content">
              <div class="tl-date">${esc(p.date)}</div>
              <div class="tl-event">${esc(p.event)}</div>
              <span class="impact-tag impact-${esc(p.impact)}">${esc(p.impact.toUpperCase())}</span>
            </div>
          </div>`,
          )
          .join("")}
      </div>`
          : ""
      }
    </section>`;
}

function renderOpportunity(mod: Record<string, unknown>): string {
  const sov =
    (mod.shareOfVoice as Array<{
      brand: string;
      mentions: number;
      sentimentPositive: number;
      isOurs: boolean;
    }>) ?? [];
  const positioning =
    (mod.positioning as Array<{
      brand: string;
      mentionVolume: number;
      positiveRate: number;
      distinctKeyword: string;
    }>) ?? [];
  const contentGaps =
    (mod.contentGaps as Array<{
      topic: string;
      competitorActivity: string;
      ourStatus: string;
      suggestedAction: string;
      estimatedImpact: string;
    }>) ?? [];
  const risks =
    (mod.riskSignals as Array<{
      signal: string;
      severity: string;
      evidence: string;
      suggestedResponse: string;
    }>) ?? [];
  const gaps =
    (mod.competitorGaps as Array<{ competitor: string; gap: string; ourAdvantage: string }>) ?? [];

  const totalMentions = sov.reduce((sum, s) => sum + s.mentions, 1);
  const severityColor: Record<string, string> = {
    critical: "#dc2626",
    warning: "#f59e0b",
    watch: "#6b7280",
  };
  const statusLabel: Record<string, string> = { absent: "미진행", weak: "미흡", moderate: "보통" };
  const statusColor: Record<string, string> = {
    absent: "#dc2626",
    weak: "#f59e0b",
    moderate: "#6b7280",
  };
  const impactIcon: Record<string, string> = {
    high: "&#x25CF;",
    medium: "&#x25CB;",
    low: "&#x25CB;",
  };

  return `
    <section class="card visual-card">
      <header><h2>시장 인텔리전스</h2><span class="badge">#06</span></header>

      ${
        sov.length > 0
          ? `
      <h3>SOV 점유율 (Share of Voice)</h3>
      <div class="sov-chart">
        <div class="sov-bar-stacked">
          ${sov
            .map((s) => {
              const pct = Math.round((s.mentions / totalMentions) * 100);
              const color = s.isOurs
                ? "var(--c-accent)"
                : `hsl(${sov.indexOf(s) * 60 + 180}, 40%, 65%)`;
              return `<div class="sov-segment" style="width:${pct}%;background:${color}" title="${s.brand}: ${s.mentions}건 (${pct}%)"></div>`;
            })
            .join("")}
        </div>
        <div class="sov-legend">
          ${sov
            .map((s) => {
              const pct = Math.round((s.mentions / totalMentions) * 100);
              const color = s.isOurs
                ? "var(--c-accent)"
                : `hsl(${sov.indexOf(s) * 60 + 180}, 40%, 65%)`;
              return `<div class="sov-legend-item${s.isOurs ? " sov-ours" : ""}">
              <span class="dot" style="background:${color}"></span>
              <span>${esc(s.brand)}${s.isOurs ? " ★" : ""}</span>
              <strong>${pct}%</strong>
              <span class="sov-detail">${s.mentions}건 · 긍정 ${Math.round(s.sentimentPositive * 100)}%</span>
            </div>`;
            })
            .join("")}
        </div>
      </div>`
          : ""
      }

      ${
        positioning.length > 0
          ? `
      <h3>포지셔닝 맵</h3>
      <div class="pos-map">
        <div class="pos-axis-y">긍정률 ↑</div>
        <div class="pos-grid">
          ${positioning
            .map((p) => {
              const x = Math.round(
                (p.mentionVolume / Math.max(...positioning.map((pp) => pp.mentionVolume))) * 85 + 5,
              );
              const y = Math.round((1 - p.positiveRate) * 80 + 5);
              const isOurs = sov.find((s) => s.brand === p.brand)?.isOurs ?? false;
              return `<div class="pos-dot${isOurs ? " pos-ours" : ""}" style="left:${x}%;top:${y}%">
              <div class="pos-label">${esc(p.brand)}</div>
              <div class="pos-kw">${esc(p.distinctKeyword)}</div>
            </div>`;
            })
            .join("")}
        </div>
        <div class="pos-axis-x">언급량 →</div>
      </div>`
          : ""
      }

      ${
        contentGaps.length > 0
          ? `
      <h3>콘텐츠 갭 분석</h3>
      <div class="content-gaps">
        ${contentGaps
          .map(
            (g) => `
          <div class="cgap-item">
            <div class="cgap-header">
              <span>${impactIcon[g.estimatedImpact] ?? "&#x25CB;"}</span>
              <strong>${esc(g.topic)}</strong>
              <span class="cgap-status" style="background:${statusColor[g.ourStatus] ?? "#6b7280"}">${statusLabel[g.ourStatus] ?? g.ourStatus}</span>
            </div>
            <div class="cgap-competitor">${esc(g.competitorActivity)}</div>
            <div class="cgap-action">→ ${esc(g.suggestedAction)}</div>
          </div>`,
          )
          .join("")}
      </div>`
          : ""
      }

      ${
        risks.length > 0
          ? `
      <h3>리스크 시그널</h3>
      <div class="risk-signals">
        ${risks
          .map(
            (r) => `
          <div class="rsig-item" style="border-left:4px solid ${severityColor[r.severity] ?? "#6b7280"}">
            <div class="rsig-header">
              <span class="rsig-severity" style="background:${severityColor[r.severity] ?? "#6b7280"}">${esc(r.severity.toUpperCase())}</span>
              <span>${esc(r.signal)}</span>
            </div>
            <div class="rsig-evidence">${esc(r.evidence)}</div>
            <div class="rsig-response">→ ${esc(r.suggestedResponse)}</div>
          </div>`,
          )
          .join("")}
      </div>`
          : ""
      }

      ${
        gaps.length > 0
          ? `
      <h3>경쟁사 약점 분석</h3>
      <div class="gap-table">
        <div class="gap-header"><span>경쟁사</span><span>갭</span><span>우리 강점</span></div>
        ${gaps
          .map(
            (g) => `
          <div class="gap-row">
            <span class="gap-name">${esc(g.competitor)}</span>
            <span class="gap-desc">${esc(g.gap)}</span>
            <span class="gap-adv">${esc(g.ourAdvantage)}</span>
          </div>`,
          )
          .join("")}
      </div>`
          : ""
      }
    </section>`;
}

function renderStrategy(mod: Record<string, unknown>): string {
  const msg = mod.messageStrategy as
    | { primaryMessage: string; supportingMessages: string[]; tone: string; avoidTopics: string[] }
    | undefined;
  const content = mod.contentStrategy as
    | { weeklyTopics: Array<{ topic: string; channel: string; format: string; timing: string }> }
    | undefined;
  const channels =
    (mod.channelPriority as Array<{ channel: string; priority: number; reason: string }>) ?? [];
  const risks = (mod.riskMitigation as Array<{ risk: string; action: string }>) ?? [];

  const channelIcon: Record<string, string> = {
    naver_blog: "Blog",
    instagram: "IG",
    youtube: "YT",
    email: "Mail",
    other: "",
  };

  return `
    <section class="card visual-card">
      <header><h2>실행 전략</h2><span class="badge">#07</span></header>

      ${
        msg
          ? `
      <div class="msg-hero">
        <div class="msg-primary">"${esc(msg.primaryMessage)}"</div>
        <div class="msg-supporting">
          ${msg.supportingMessages.map((m) => `<span class="msg-tag">${esc(m)}</span>`).join("")}
        </div>
        <div class="msg-tone">톤앤매너: ${esc(msg.tone)}</div>
      </div>`
          : ""
      }

      ${
        content?.weeklyTopics
          ? `
      <h3>주간 콘텐츠 캘린더</h3>
      <div class="calendar-grid">
        ${content.weeklyTopics
          .map(
            (t) => `
          <div class="cal-item">
            <div class="cal-timing">${esc(t.timing)}</div>
            <div class="cal-channel">${channelIcon[t.channel] ?? ""} ${esc(t.channel)}</div>
            <div class="cal-topic">${esc(t.topic)}</div>
            <div class="cal-format">${esc(t.format)}</div>
          </div>`,
          )
          .join("")}
      </div>`
          : ""
      }

      ${
        channels.length > 0
          ? `
      <h3>채널 우선순위</h3>
      <div class="channel-bars">
        ${channels
          .map(
            (c) => `
          <div class="ch-row">
            <div class="ch-name">${esc(c.channel)}</div>
            <div class="ch-bar-track">
              <div class="ch-bar-fill" style="width:${c.priority * 10}%">
                ${c.priority}/10
              </div>
            </div>
            <div class="ch-reason">${esc(c.reason)}</div>
          </div>`,
          )
          .join("")}
      </div>`
          : ""
      }

      ${
        risks.length > 0
          ? `
      <h3>리스크 완화</h3>
      <div class="risk-list">
        ${risks
          .map(
            (r) => `
          <div class="risk-item">
            <div class="risk-label">${esc(r.risk)}</div>
            <div class="risk-action">→ ${esc(r.action)}</div>
          </div>`,
          )
          .join("")}
      </div>`
          : ""
      }
    </section>`;
}

function renderSummary(mod: Record<string, unknown>): string {
  const oneLiner = (mod.oneLiner as string) ?? "";
  const takeaways = (mod.keyTakeaways as string[]) ?? [];
  const actions = (mod.criticalActions as Array<{ action: string; priority: string }>) ?? [];

  const prioColor: Record<string, string> = { high: "#dc2626", medium: "#f59e0b", low: "#6b7280" };

  return `
    <section class="card visual-card summary-card">
      <header><h2>핵심 요약</h2><span class="badge">#08</span></header>
      <div class="one-liner">${esc(oneLiner)}</div>

      ${
        takeaways.length > 0
          ? `
      <h3>Key Takeaways</h3>
      <div class="takeaway-list">
        ${takeaways.map((t, i) => `<div class="takeaway-item"><span class="takeaway-num">${i + 1}</span><span>${esc(t)}</span></div>`).join("")}
      </div>`
          : ""
      }

      ${
        actions.length > 0
          ? `
      <h3>즉시 실행 과제</h3>
      <div class="action-list">
        ${actions
          .map(
            (a) => `
          <div class="action-item">
            <span class="action-prio" style="background:${prioColor[a.priority] ?? "#6b7280"}">${esc(a.priority.toUpperCase())}</span>
            <span>${esc(a.action)}</span>
          </div>`,
          )
          .join("")}
      </div>`
          : ""
      }
    </section>`;
}

function renderFallbackSection(s: ReportSection): string {
  return `
    <section class="card">
      <header>
        <h2>${esc(s.title)}</h2>
        ${s.sourceModule ? `<span class="badge">${esc(s.sourceModule)}</span>` : ""}
      </header>
      <p>${esc(s.content).replace(/\n/g, "<br>")}</p>
    </section>`;
}

export function renderReportHtml(
  report: ReportRow,
  moduleOutputs: Record<string, unknown> = {},
): string {
  const meta = report.metadata ?? {};
  const keyword = String((meta as { keyword?: string }).keyword ?? "");
  const generatedAt =
    String((meta as { generatedAt?: string }).generatedAt ?? "") || report.created_at.toISOString();
  const modulesUsed = ((meta as { modulesUsed?: string[] }).modulesUsed ?? []).join(", ");
  const confidence = String((meta as { confidence?: string }).confidence ?? "");
  const disclaimer = (meta as { disclaimer?: string }).disclaimer ?? "";

  const hasMods = Object.keys(moduleOutputs).length > 0;

  let body: string;
  if (hasMods) {
    const parts: string[] = [];
    if (moduleOutputs["#08"])
      parts.push(renderSummary(moduleOutputs["#08"] as Record<string, unknown>));
    if (moduleOutputs["#03"])
      parts.push(renderSentimentChart(moduleOutputs["#03"] as Record<string, unknown>));
    if (moduleOutputs["#01"])
      parts.push(renderMacroView(moduleOutputs["#01"] as Record<string, unknown>));
    if (moduleOutputs["#06"])
      parts.push(renderOpportunity(moduleOutputs["#06"] as Record<string, unknown>));
    if (moduleOutputs["#07"])
      parts.push(renderStrategy(moduleOutputs["#07"] as Record<string, unknown>));

    const rendered = new Set(["#01", "#03", "#06", "#07", "#08", "#13"]);
    for (const s of report.sections ?? []) {
      if (s.sourceModule && rendered.has(s.sourceModule)) continue;
      parts.push(renderFallbackSection(s));
    }
    body = parts.join("\n");
  } else {
    body = (report.sections ?? []).map((s) => renderFallbackSection(s)).join("\n");
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(report.title)} — GoldenCheck</title>
  <style>
    :root { color-scheme: light dark; --c-pos: #22c55e; --c-neg: #ef4444; --c-neu: #a1a1aa; --c-brand: #18181b; --c-accent: #2563eb; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Pretendard", sans-serif; background:#f4f4f5; color:#18181b; line-height:1.6; }
    main { max-width:920px; margin:0 auto; padding:32px 20px 64px; }

    /* Header */
    .report-header { margin-bottom:32px; }
    .report-header h1 { margin:0 0 12px; font-size:26px; line-height:1.3; }
    .meta { display:flex; flex-wrap:wrap; gap:8px; font-size:12px; color:#52525b; }
    .meta span { background:#fff; border:1px solid #e4e4e7; border-radius:6px; padding:3px 10px; }

    /* Cards */
    .card { background:#fff; border:1px solid #e4e4e7; border-radius:14px; padding:24px; margin-bottom:20px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
    .card header { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
    .card header h2 { margin:0; font-size:18px; }
    .card h3 { font-size:14px; text-transform:uppercase; letter-spacing:.05em; color:#71717a; margin:24px 0 12px; }
    .card p { margin:0; color:#27272a; white-space:pre-wrap; }
    .badge { display:inline-block; background:#18181b; color:#fff; font-size:11px; padding:2px 8px; border-radius:999px; }

    /* Summary card */
    .summary-card { border-left:4px solid var(--c-accent); }
    .one-liner { font-size:22px; font-weight:700; color:var(--c-brand); line-height:1.35; margin-bottom:20px; }
    .takeaway-list { display:flex; flex-direction:column; gap:10px; }
    .takeaway-item { display:flex; gap:12px; align-items:flex-start; }
    .takeaway-num { min-width:28px; height:28px; background:var(--c-accent); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; flex-shrink:0; }
    .action-list { display:flex; flex-direction:column; gap:8px; }
    .action-item { display:flex; align-items:center; gap:10px; padding:10px 14px; background:#fafafa; border-radius:8px; }
    .action-prio { color:#fff; font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; letter-spacing:.05em; flex-shrink:0; }

    /* Sentiment */
    .sentiment-visual { display:flex; align-items:center; gap:32px; margin-bottom:8px; }
    .donut-container { position:relative; width:140px; height:140px; flex-shrink:0; }
    .donut { width:100%; height:100%; }
    .donut-label { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; }
    .donut-pct { font-size:28px; font-weight:800; color:var(--c-pos); }
    .donut-sub { font-size:12px; color:#71717a; }
    .sentiment-legend { display:flex; flex-direction:column; gap:8px; }
    .legend-item { display:flex; align-items:center; gap:8px; font-size:14px; }
    .dot { width:12px; height:12px; border-radius:50%; }
    .dot-pos { background:var(--c-pos); }
    .dot-neg { background:var(--c-neg); }
    .dot-neu { background:var(--c-neu); }
    .keyword-cloud { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
    .kw-tag { display:inline-block; padding:4px 12px; border:2px solid; border-radius:20px; font-weight:600; }
    .kw-tag small { opacity:.6; font-weight:400; }

    /* Horizontal bars */
    .h-bars { display:flex; flex-direction:column; gap:8px; }
    .h-bar-row { display:flex; align-items:center; gap:12px; }
    .h-bar-label { min-width:160px; font-size:13px; text-align:right; color:#52525b; }
    .h-bar-track { flex:1; height:28px; background:#f4f4f5; border-radius:6px; overflow:hidden; }
    .h-bar-fill { height:100%; background:linear-gradient(90deg,var(--c-accent),#60a5fa); color:#fff; font-size:12px; font-weight:600; display:flex; align-items:center; padding:0 10px; border-radius:6px; min-width:40px; }

    /* Mini chart (bars) */
    .mini-chart { display:flex; align-items:flex-end; gap:3px; height:100px; padding:8px 0; }
    .mini-bar-col { display:flex; flex-direction:column; align-items:center; flex:1; height:100%; justify-content:flex-end; }
    .mini-bar { width:100%; min-height:4px; border-radius:3px 3px 0 0; transition:height .3s; }
    .mini-bar-date { font-size:10px; color:#a1a1aa; margin-top:4px; white-space:nowrap; }

    /* Timeline */
    .timeline { position:relative; padding-left:24px; border-left:2px solid #e4e4e7; }
    .tl-item { position:relative; padding:0 0 20px 16px; }
    .tl-dot { position:absolute; left:-29px; top:4px; width:12px; height:12px; border-radius:50%; border:2px solid #fff; }
    .tl-date { font-size:12px; color:#71717a; font-weight:600; }
    .tl-event { font-size:14px; margin:2px 0 4px; }
    .impact-tag { font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px; letter-spacing:.04em; }
    .impact-high { background:#fef2f2; color:#dc2626; }
    .impact-medium { background:#fffbeb; color:#d97706; }
    .impact-low { background:#f4f4f5; color:#6b7280; }

    /* Direction banner */
    .direction-banner { display:flex; align-items:center; gap:12px; padding:14px 18px; border-radius:10px; margin-bottom:16px; font-size:15px; }
    .direction-positive { background:#f0fdf4; border:1px solid #bbf7d0; }
    .direction-negative { background:#fef2f2; border:1px solid #fecaca; }
    .direction-neutral { background:#f4f4f5; border:1px solid #e4e4e7; }
    .direction-mixed { background:#fffbeb; border:1px solid #fde68a; }
    .direction-icon { font-size:18px; font-weight:700; }
    .summary-text { font-size:15px; color:#3f3f46; line-height:1.7; }

    /* Opportunity */
    .opp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
    .opp-item { background:#fafafa; border:1px solid #e4e4e7; border-radius:10px; padding:16px; }
    .opp-header { display:flex; gap:8px; align-items:center; font-size:15px; margin-bottom:8px; }
    .opp-evidence { font-size:13px; color:#52525b; margin-bottom:8px; }
    .opp-action { font-size:13px; color:var(--c-accent); font-weight:600; }

    /* SOV */
    .sov-chart { margin-bottom:16px; }
    .sov-bar-stacked { display:flex; height:32px; border-radius:8px; overflow:hidden; margin-bottom:12px; }
    .sov-segment { min-width:20px; transition:width .3s; }
    .sov-legend { display:flex; flex-direction:column; gap:6px; }
    .sov-legend-item { display:flex; align-items:center; gap:8px; font-size:13px; }
    .sov-legend-item strong { min-width:36px; }
    .sov-detail { color:#71717a; font-size:12px; }
    .sov-ours { font-weight:700; }

    /* Positioning map */
    .pos-map { position:relative; margin:16px 0; }
    .pos-axis-y { font-size:11px; color:#a1a1aa; margin-bottom:4px; }
    .pos-axis-x { font-size:11px; color:#a1a1aa; text-align:right; margin-top:4px; }
    .pos-grid { position:relative; width:100%; height:240px; background:linear-gradient(135deg,#f0fdf4 0%,#fefce8 50%,#fef2f2 100%); border:1px solid #e4e4e7; border-radius:12px; overflow:hidden; }
    .pos-dot { position:absolute; transform:translate(-50%,-50%); text-align:center; cursor:default; }
    .pos-dot::before { content:""; display:block; width:14px; height:14px; border-radius:50%; background:#a1a1aa; margin:0 auto 4px; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,.15); }
    .pos-ours::before { background:var(--c-accent); width:18px; height:18px; }
    .pos-label { font-size:12px; font-weight:700; white-space:nowrap; }
    .pos-kw { font-size:10px; color:#71717a; white-space:nowrap; }

    /* Content gaps */
    .content-gaps { display:flex; flex-direction:column; gap:12px; }
    .cgap-item { padding:14px 16px; background:#fafafa; border:1px solid #e4e4e7; border-radius:10px; }
    .cgap-header { display:flex; align-items:center; gap:8px; margin-bottom:8px; font-size:14px; }
    .cgap-status { color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; letter-spacing:.04em; }
    .cgap-competitor { font-size:13px; color:#52525b; margin-bottom:6px; }
    .cgap-action { font-size:13px; color:var(--c-accent); font-weight:600; }

    /* Risk signals */
    .risk-signals { display:flex; flex-direction:column; gap:10px; }
    .rsig-item { padding:14px 16px; background:#fff; border:1px solid #e4e4e7; border-radius:10px; }
    .rsig-header { display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:14px; }
    .rsig-severity { color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; letter-spacing:.04em; }
    .rsig-evidence { font-size:13px; color:#52525b; margin-bottom:6px; }
    .rsig-response { font-size:13px; color:var(--c-accent); font-weight:600; }

    /* Competitor gaps */
    .gap-table { font-size:13px; }
    .gap-header { display:grid; grid-template-columns:120px 1fr 1fr; gap:12px; padding:8px 12px; background:#f4f4f5; border-radius:8px 8px 0 0; font-weight:700; color:#52525b; }
    .gap-row { display:grid; grid-template-columns:120px 1fr 1fr; gap:12px; padding:10px 12px; border-bottom:1px solid #f4f4f5; }
    .gap-name { font-weight:600; }
    .gap-desc { color:#dc2626; }
    .gap-adv { color:var(--c-pos); }

    /* Strategy */
    .msg-hero { text-align:center; padding:24px; background:linear-gradient(135deg,#eff6ff,#f0fdf4); border-radius:12px; margin-bottom:16px; }
    .msg-primary { font-size:22px; font-weight:800; color:var(--c-brand); margin-bottom:14px; }
    .msg-supporting { display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin-bottom:10px; }
    .msg-tag { background:#fff; border:1px solid #e4e4e7; border-radius:20px; padding:4px 14px; font-size:13px; }
    .msg-tone { font-size:12px; color:#71717a; }

    .calendar-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:10px; }
    .cal-item { padding:14px; background:#fafafa; border:1px solid #e4e4e7; border-radius:10px; }
    .cal-timing { font-size:11px; color:#71717a; font-weight:600; text-transform:uppercase; }
    .cal-channel { font-size:13px; margin:4px 0; }
    .cal-topic { font-size:14px; font-weight:600; margin-bottom:4px; }
    .cal-format { font-size:12px; color:#71717a; }

    .channel-bars { display:flex; flex-direction:column; gap:12px; }
    .ch-row { display:flex; flex-direction:column; gap:4px; }
    .ch-name { font-weight:600; font-size:14px; }
    .ch-bar-track { height:24px; background:#f4f4f5; border-radius:6px; overflow:hidden; }
    .ch-bar-fill { height:100%; background:linear-gradient(90deg,#22c55e,#86efac); color:#18181b; font-size:12px; font-weight:700; display:flex; align-items:center; padding:0 10px; border-radius:6px; }
    .ch-reason { font-size:12px; color:#71717a; }

    .risk-list { display:flex; flex-direction:column; gap:10px; }
    .risk-item { padding:14px; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; }
    .risk-label { font-weight:600; font-size:14px; margin-bottom:4px; }
    .risk-action { font-size:13px; color:#52525b; }

    /* Disclaimer */
    .disclaimer { margin-top:32px; padding:12px 16px; background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; border-radius:8px; font-size:12px; }

    /* Print */
    @media print { body { background:#fff; } .card { break-inside:avoid; box-shadow:none; } }
    @media (max-width:600px) {
      .gap-header, .gap-row { grid-template-columns:1fr; }
      .pos-grid { height:180px; }
      .sentiment-visual { flex-direction:column; }
      .h-bar-label { min-width:auto; text-align:left; }
    }
  </style>
</head>
<body>
  <main>
    <div class="report-header">
      <h1>${esc(report.title)}</h1>
      <div class="meta">
        ${keyword ? `<span>키워드: ${esc(keyword)}</span>` : ""}
        ${generatedAt ? `<span>생성: ${esc(generatedAt)}</span>` : ""}
        ${modulesUsed ? `<span>모듈: ${esc(modulesUsed)}</span>` : ""}
        ${confidence ? `<span>신뢰도: ${esc(confidence)}</span>` : ""}
      </div>
    </div>
    ${body}
    ${disclaimer ? `<div class="disclaimer">${esc(String(disclaimer))}</div>` : ""}
  </main>
</body>
</html>`;
}
