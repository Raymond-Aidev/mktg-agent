/* ══════════════════════ Auth ══════════════════════ */

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function getToken(): string | null {
  return localStorage.getItem("gc_token");
}

export function setToken(token: string): void {
  localStorage.setItem("gc_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("gc_token");
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRegister(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResponse> {
  const res = await fetch("/api/v1/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Register failed (${res.status})`);
  }
  const data = (await res.json()) as AuthResponse;
  setToken(data.token);
  return data;
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Login failed (${res.status})`);
  }
  const data = (await res.json()) as AuthResponse;
  setToken(data.token);
  return data;
}

export function apiLogout(): void {
  clearToken();
}

export async function apiForgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch("/api/v1/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as { message: string };
}

export async function apiResetPassword(
  token: string,
  password: string,
): Promise<{ message: string }> {
  const res = await fetch("/api/v1/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Reset failed (${res.status})`);
  }
  return (await res.json()) as { message: string };
}

/* ══════════════════════ Products ══════════════════════ */

export interface ApiProduct {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  keyword_count: number;
}

export interface ApiKeyword {
  id: string;
  keyword: string;
  search_volume: number;
  status: string;
  created_at: string;
  post_count_30d: number;
  last_analyzed: string | null;
}

export async function fetchProducts(tenantId: string): Promise<ApiProduct[]> {
  const res = await fetch(`/api/v1/products?tenantId=${encodeURIComponent(tenantId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`products HTTP ${res.status}`);
  const data = (await res.json()) as { products: ApiProduct[] };
  return data.products;
}

export async function createProduct(
  tenantId: string,
  name: string,
  description?: string,
): Promise<string> {
  const res = await fetch(`/api/v1/products?tenantId=${encodeURIComponent(tenantId)}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error(`create product HTTP ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function fetchProductDetail(
  tenantId: string,
  productId: string,
): Promise<{ product: ApiProduct; keywords: ApiKeyword[] }> {
  const res = await fetch(
    `/api/v1/products/${productId}?tenantId=${encodeURIComponent(tenantId)}`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`product detail HTTP ${res.status}`);
  return (await res.json()) as { product: ApiProduct; keywords: ApiKeyword[] };
}

export async function deleteProduct(tenantId: string, productId: string): Promise<void> {
  const res = await fetch(
    `/api/v1/products/${productId}?tenantId=${encodeURIComponent(tenantId)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
  if (!res.ok) throw new Error(`delete product HTTP ${res.status}`);
}

export async function addKeyword(
  tenantId: string,
  productId: string,
  keyword: string,
  searchVolume?: number,
): Promise<string> {
  const res = await fetch(
    `/api/v1/products/${productId}/keywords?tenantId=${encodeURIComponent(tenantId)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ keyword, searchVolume }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `add keyword HTTP ${res.status}`);
  }
  return ((await res.json()) as { id: string }).id;
}

export async function removeKeyword(
  tenantId: string,
  productId: string,
  kwId: string,
): Promise<void> {
  const res = await fetch(
    `/api/v1/products/${productId}/keywords/${kwId}?tenantId=${encodeURIComponent(tenantId)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
  if (!res.ok) throw new Error(`remove keyword HTTP ${res.status}`);
}

/* ══════════════════════ Admin ══════════════════════ */

export interface AdminUser {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

export interface AdminStats {
  users: number;
  products: number;
  activeKeywords: number;
  jobs7d: { total: number; done: number; failed: number };
  reports: number;
}

export async function fetchAdminUsers(): Promise<{ total: number; users: AdminUser[] }> {
  const res = await fetch("/api/v1/admin/users", { headers: authHeaders() });
  if (!res.ok) throw new Error(`admin/users HTTP ${res.status}`);
  return (await res.json()) as { total: number; users: AdminUser[] };
}

export async function createAdminUser(data: {
  email: string;
  password: string;
  name?: string;
  role?: string;
  tenantId?: string;
}): Promise<{ id: string }> {
  const res = await fetch("/api/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as { id: string };
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(`update role HTTP ${res.status}`);
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`delete user HTTP ${res.status}`);
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch("/api/v1/admin/users/stats", { headers: authHeaders() });
  if (!res.ok) throw new Error(`admin/stats HTTP ${res.status}`);
  return (await res.json()) as AdminStats;
}

/* ══════════════════════ Dashboard ══════════════════════ */

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

/* ----------------------------- Competitors v2 ----------------------------- */

export interface CompetitorData {
  competitors: Array<{
    name: string;
    country: string | null;
    genres: string[];
    recentTitleCount: number;
    topTitle: string | null;
  }>;
  competitorGaps: Array<{
    competitor: string;
    gap: string;
    ourAdvantage: string;
  }>;
  totalTracked: number;
}

export async function fetchCompetitors(tenantId: string): Promise<CompetitorData> {
  const res = await fetch(`/api/v2/dashboard/competitors?tenantId=${encodeURIComponent(tenantId)}`);
  if (!res.ok) throw new Error(`competitors HTTP ${res.status}`);
  return (await res.json()) as CompetitorData;
}

/* -------------------------------- Channels -------------------------------- */

export interface ChannelData {
  totalPosts: number;
  channels: Array<{
    source: string;
    label: string;
    postCount: number;
    avgLikes: number;
    avgComments: number;
    totalLikes: number;
    engagementScore: number;
  }>;
  email: {
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
  } | null;
}

export async function fetchChannels(tenantId: string): Promise<ChannelData> {
  const res = await fetch(`/api/v2/dashboard/channels?tenantId=${encodeURIComponent(tenantId)}`);
  if (!res.ok) throw new Error(`channels HTTP ${res.status}`);
  return (await res.json()) as ChannelData;
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
