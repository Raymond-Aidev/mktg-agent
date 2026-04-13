export interface DashboardKpis {
  tenantId: string;
  windowDays: number;
  pipeline: {
    activeBuyers: number;
    avgLeadScore: number;
  };
  campaigns: Array<{
    campaignId: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    openRate: number;
    clickToOpenRate: number;
  }>;
  adoption: Array<{
    agent: string;
    outputType: string;
    accepted: number;
    rejected: number;
    adoptionRate: number;
  }>;
  wau: number;
  llmCost: Array<{
    modelName: string;
    totalInputTokens: number;
    totalOutputTokens: number;
    costUsd: number;
  }>;
  fxToKrw: Record<string, number>;
}

export async function fetchKpis(tenantId: string): Promise<DashboardKpis> {
  const res = await fetch(`/api/v1/dashboard/kpis?tenantId=${encodeURIComponent(tenantId)}`);
  if (!res.ok) {
    throw new Error(`dashboard/kpis HTTP ${res.status}`);
  }
  return (await res.json()) as DashboardKpis;
}

/* ----------------------------- Dashboard v2 ----------------------------- */

export interface DashboardOverview {
  tenantId: string;
  estimatedRevenue: {
    amount: number;
    currency: string;
    activeBuyers: number;
    avgLeadScore: number;
  };
  brandSentiment: {
    positive: number;
    negative: number;
    neutral: number;
    oneLiner: string | null;
    confidence: string | null;
  } | null;
  weeklyActions: Array<{ action: string; priority: string }>;
  trendKeywords: Array<{ term: string; volume: number; direction: string }>;
  latestKeyword: string | null;
  lastAnalyzedAt: string | null;
  recentReports: Array<{
    id: string;
    title: string;
    kind: string;
    keyword: string | null;
    createdAt: string;
    htmlUrl: string;
  }>;
  dataFreshness: Record<string, string | null>;
}

export async function fetchOverview(tenantId: string): Promise<DashboardOverview> {
  const res = await fetch(`/api/v2/dashboard/overview?tenantId=${encodeURIComponent(tenantId)}`);
  if (!res.ok) {
    throw new Error(`dashboard/overview HTTP ${res.status}`);
  }
  return (await res.json()) as DashboardOverview;
}

/* ----------------------------- SignalCraft ----------------------------- */

export interface SignalcraftRunBody {
  tenantId: string;
  keyword: string;
  regions?: string[];
  modules?: string[];
}

export interface SignalcraftRunResponse {
  jobId: string;
  estimatedMinutes: number;
}

export interface SignalcraftJob {
  id: string;
  tenant_id: string;
  keyword: string;
  regions: string[];
  modules_requested: string[];
  status: "queued" | "collecting" | "analyzing" | "rendering" | "done" | "failed";
  current_stage: string | null;
  progress_pct: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  rawPostsBySource: Record<string, number>;
  reportId: string | null;
}

export async function runSignalcraft(body: SignalcraftRunBody): Promise<SignalcraftRunResponse> {
  const res = await fetch("/api/v1/signalcraft/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`signalcraft/run HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as SignalcraftRunResponse;
}

export async function fetchSignalcraftJob(id: string): Promise<SignalcraftJob> {
  const res = await fetch(`/api/v1/signalcraft/jobs/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`signalcraft/jobs/${id} HTTP ${res.status}`);
  }
  return (await res.json()) as SignalcraftJob;
}

/* -------------------------------- Actions -------------------------------- */

export interface ActionResult {
  actionId: string;
  actionType: string;
  status: string;
  output: Record<string, unknown>;
}

export async function generateAction(body: {
  jobId: string;
  tenantId: string;
  actionType: "campaign_draft" | "content_calendar";
}): Promise<ActionResult> {
  const res = await fetch("/api/v2/actions/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`actions/generate HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as ActionResult;
}

/* -------------------------------- Buyers -------------------------------- */

export interface Buyer {
  id: string;
  source_uid: string;
  company_name: string;
  country: string | null;
  city: string | null;
  contact_name: string | null;
  contact_email: string | null;
  genres: string[];
  languages: string[];
  lead_score: number | null;
  last_contacted: string | null;
  source_url: string | null;
  updated_at: string;
}

export interface BuyersResponse {
  tenantId: string;
  limit: number;
  offset: number;
  total: number;
  buyers: Buyer[];
}

export async function fetchBuyers(tenantId: string, limit = 25): Promise<BuyersResponse> {
  const res = await fetch(`/api/v1/buyers?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`);
  if (!res.ok) {
    throw new Error(`buyers HTTP ${res.status}`);
  }
  return (await res.json()) as BuyersResponse;
}

/* ------------------------------- Operator ------------------------------- */

export interface OperatorOverview {
  health: {
    postgres: { ok: boolean; latencyMs: number };
    redis: { ok: boolean };
  };
  datasets: Array<{
    table: string;
    rowCount: number;
    newestLastSeen: string | null;
    oldestLastSeen: string | null;
    staleCount: number;
  }>;
  crawlerFailures: Array<{
    source: string;
    errorCode: string | null;
    errorMsg: string | null;
    attempt: number;
    failedAt: string;
  }>;
  queues: Record<string, Record<string, number>>;
  llmCost: Array<{
    modelName: string;
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    costUsd: number;
  }>;
  signalcraftJobs: Record<string, number>;
  generatedAt: string;
}

export async function fetchOperatorOverview(): Promise<OperatorOverview> {
  // Browser will prompt for basic auth on first request
  const res = await fetch("/admin/operator/overview");
  if (!res.ok) {
    throw new Error(`operator/overview HTTP ${res.status}`);
  }
  return (await res.json()) as OperatorOverview;
}
