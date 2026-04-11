import type { Pool } from "pg";

/**
 * Expected revenue — Tech Spec §2.2.
 *
 * For each buyer in the pipeline:
 *   prob   = probability(leadScore) × stageMultiplier(stage)
 *   value  = buyer.custom_deal_value ?? DEFAULT_DEAL_VALUE_KRW
 *   spend  = prob × value × fx(buyer.currency → KRW)
 *
 * Returns the sum in KRW.
 */

export type CrmStage =
  | "initial_contact"
  | "meeting_scheduled"
  | "proposal_sent"
  | "negotiation"
  | "contract_review";

export const STAGE_MULTIPLIER: Record<CrmStage, number> = {
  initial_contact: 1.0,
  meeting_scheduled: 1.3,
  proposal_sent: 1.6,
  negotiation: 2.0,
  contract_review: 2.5,
};

export const DEFAULT_DEAL_VALUE_KRW = 15_000_000;

export interface PipelineBuyer {
  leadScore: number;
  stage: CrmStage;
  /** When omitted the formula falls back to DEFAULT_DEAL_VALUE_KRW. */
  customDealValue?: number;
  /** ISO-4217 code. Defaults to KRW when missing. */
  currency?: string;
}

export function probabilityFromScore(leadScore: number): number {
  if (leadScore >= 80) return 0.65; // Hot
  if (leadScore >= 60) return 0.35; // Warm
  if (leadScore >= 40) return 0.15; // Lukewarm
  return 0.05; // Cold
}

/**
 * KRW expected revenue for a list of pipeline buyers.
 * `fxToKrw` is a map from base currency to KRW rate, e.g. { USD: 1483.27 }.
 * Currencies missing from the map are passed through 1:1 (treated as KRW).
 */
export function calcExpectedRevenueKRW(
  buyers: PipelineBuyer[],
  fxToKrw: Record<string, number>,
): number {
  let sum = 0;
  for (const b of buyers) {
    const prob = probabilityFromScore(b.leadScore) * STAGE_MULTIPLIER[b.stage];
    const valueLocal = b.customDealValue ?? DEFAULT_DEAL_VALUE_KRW;
    const fx = b.currency && b.currency !== "KRW" ? (fxToKrw[b.currency] ?? 1) : 1;
    sum += prob * valueLocal * fx;
  }
  return Math.round(sum);
}

/**
 * Build the fxToKrw map from the latest fx_rates rows. Tech Spec stores
 * USD as the base, so anything quoted as USD->X is inverted to get
 * X->KRW relative to USD. We restrict to currencies the dashboard uses.
 */
export async function loadFxToKrw(
  pool: Pool,
  currencies: string[] = ["USD", "EUR", "JPY", "GBP", "CNY"],
): Promise<Record<string, number>> {
  // Fetch latest rate per (base, quote) using DISTINCT ON.
  const rows = await pool.query<{
    base: string;
    quote: string;
    rate: string;
  }>(
    `SELECT DISTINCT ON (base, quote) base, quote, rate
       FROM fx_rates
      WHERE base = 'USD'
      ORDER BY base, quote, observed_at DESC`,
  );

  const usdToX: Record<string, number> = { USD: 1 };
  for (const r of rows.rows) usdToX[r.quote] = Number(r.rate);
  const usdToKrw = usdToX["KRW"];
  if (!usdToKrw) {
    return { KRW: 1 };
  }

  const out: Record<string, number> = { KRW: 1 };
  for (const cur of currencies) {
    const usdToCur = usdToX[cur];
    if (cur === "USD") {
      out.USD = usdToKrw;
    } else if (usdToCur && usdToCur > 0) {
      // (USD/KRW) ÷ (USD/cur) = cur/KRW
      out[cur] = usdToKrw / usdToCur;
    }
  }
  return out;
}
