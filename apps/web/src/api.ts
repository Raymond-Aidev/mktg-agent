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
