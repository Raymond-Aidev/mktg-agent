import type { Pool } from "pg";

/**
 * SQL aggregations for the dashboard KPIs (Tech Spec §2.3–§2.6).
 *
 * Each function takes a tenantId and returns a typed shape ready for the
 * dashboard endpoint to merge into one response.
 */

export interface CampaignStats {
  campaignId: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  openRate: number;
  clickToOpenRate: number;
}

export async function getCampaignStats(
  pool: Pool,
  tenantId: string,
  windowDays = 30,
): Promise<CampaignStats[]> {
  const res = await pool.query<{
    campaign_id: string;
    sent: string;
    opened: string;
    clicked: string;
    replied: string;
    open_rate: string | null;
    click_to_open_rate: string | null;
  }>(
    `SELECT
       campaign_id::text,
       COUNT(*) FILTER (WHERE event_type = 'email.sent')    AS sent,
       COUNT(*) FILTER (WHERE event_type = 'email.opened')  AS opened,
       COUNT(*) FILTER (WHERE event_type = 'email.clicked') AS clicked,
       COUNT(*) FILTER (WHERE event_type = 'email.replied') AS replied,
       (COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.opened'))::numeric
         / NULLIF(COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.sent'), 0)
         AS open_rate,
       (COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.clicked'))::numeric
         / NULLIF(COUNT(DISTINCT buyer_id) FILTER (WHERE event_type = 'email.opened'), 0)
         AS click_to_open_rate
     FROM email_events
     WHERE tenant_id = $1
       AND occurred_at >= now() - ($2 || ' days')::interval
       AND campaign_id IS NOT NULL
     GROUP BY campaign_id
     ORDER BY sent DESC`,
    [tenantId, windowDays],
  );

  return res.rows.map((r) => ({
    campaignId: r.campaign_id,
    sent: Number(r.sent),
    opened: Number(r.opened),
    clicked: Number(r.clicked),
    replied: Number(r.replied),
    openRate: r.open_rate ? Number(r.open_rate) : 0,
    clickToOpenRate: r.click_to_open_rate ? Number(r.click_to_open_rate) : 0,
  }));
}

export interface AdoptionStat {
  agent: string;
  outputType: string;
  accepted: number;
  rejected: number;
  adoptionRate: number;
}

export async function getAdoptionStats(
  pool: Pool,
  tenantId: string,
  windowDays = 30,
): Promise<AdoptionStat[]> {
  const res = await pool.query<{
    agent: string;
    output_type: string;
    accepted: string;
    rejected: string;
    adoption_rate: string | null;
  }>(
    `SELECT
       payload->>'agent'       AS agent,
       payload->>'output_type' AS output_type,
       COUNT(*) FILTER (WHERE event_type = 'agent_output_accepted') AS accepted,
       COUNT(*) FILTER (WHERE event_type = 'agent_output_rejected') AS rejected,
       (COUNT(*) FILTER (WHERE event_type = 'agent_output_accepted'))::numeric
         / NULLIF(
             COUNT(*) FILTER (
               WHERE event_type IN ('agent_output_accepted','agent_output_rejected')
             ), 0
           ) AS adoption_rate
     FROM events
     WHERE tenant_id = $1
       AND event_type IN ('agent_output_accepted', 'agent_output_rejected')
       AND occurred_at >= now() - ($2 || ' days')::interval
     GROUP BY agent, output_type
     ORDER BY adoption_rate DESC NULLS LAST`,
    [tenantId, windowDays],
  );

  return res.rows.map((r) => ({
    agent: r.agent ?? "(unknown)",
    outputType: r.output_type ?? "(unknown)",
    accepted: Number(r.accepted),
    rejected: Number(r.rejected),
    adoptionRate: r.adoption_rate ? Number(r.adoption_rate) : 0,
  }));
}

/**
 * WAU — distinct users who performed at least one "active" event in
 * the current ISO week.
 */
export async function getWeeklyActiveUsers(pool: Pool, tenantId: string): Promise<number> {
  const res = await pool.query<{ wau: string }>(
    `SELECT COUNT(DISTINCT user_id)::int AS wau
       FROM events
      WHERE tenant_id = $1
        AND user_id IS NOT NULL
        AND event_type IN (
          'signalcraft_started','agent_output_accepted',
          'report_viewed','buyer_stage_advanced','email_draft_sent'
        )
        AND occurred_at >= date_trunc('week', now())
        AND occurred_at <  date_trunc('week', now()) + INTERVAL '7 days'`,
    [tenantId],
  );
  return Number(res.rows[0]?.wau ?? 0);
}

export interface LlmCostByModel {
  modelName: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  costUsd: number;
}

export async function getLlmCostByModel(
  pool: Pool,
  tenantId: string,
  windowDays = 30,
): Promise<LlmCostByModel[]> {
  const res = await pool.query<{
    model_name: string;
    total_input_tokens: string;
    total_output_tokens: string;
    cost_usd: string;
  }>(
    `SELECT
       model_name,
       SUM(input_tokens)::bigint  AS total_input_tokens,
       SUM(output_tokens)::bigint AS total_output_tokens,
       COALESCE(SUM(cost_usd), 0)::numeric AS cost_usd
     FROM llm_usage
     WHERE tenant_id = $1
       AND called_at >= now() - ($2 || ' days')::interval
     GROUP BY model_name
     ORDER BY cost_usd DESC`,
    [tenantId, windowDays],
  );

  return res.rows.map((r) => ({
    modelName: r.model_name,
    totalInputTokens: Number(r.total_input_tokens),
    totalOutputTokens: Number(r.total_output_tokens),
    costUsd: Number(r.cost_usd),
  }));
}

export interface PipelineSummary {
  activeBuyers: number;
  avgLeadScore: number;
}

export async function getPipelineSummary(pool: Pool, tenantId: string): Promise<PipelineSummary> {
  const res = await pool.query<{
    active_buyers: string;
    avg_lead_score: string | null;
  }>(
    `SELECT
       COUNT(*)::int                    AS active_buyers,
       AVG(lead_score)::numeric(6,2)    AS avg_lead_score
     FROM buyers
     WHERE (tenant_id = $1 OR tenant_id IS NULL)
       AND is_stale = false`,
    [tenantId],
  );
  const row = res.rows[0];
  return {
    activeBuyers: Number(row?.active_buyers ?? 0),
    avgLeadScore: row?.avg_lead_score ? Number(row.avg_lead_score) : 0,
  };
}
