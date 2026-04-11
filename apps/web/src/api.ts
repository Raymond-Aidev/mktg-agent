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
