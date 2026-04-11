/**
 * fx_rates crawler — currency snapshots from frankfurter.app.
 *
 * Why frankfurter:
 *   - free, no API key, no rate limit
 *   - sourced from European Central Bank reference rates (auditable)
 *   - daily updates, but cheap enough that hourly polling per Tech Spec
 *     §1.2.2 is fine — we just persist the same numbers repeatedly until
 *     the ECB publishes a fresh fix
 *
 * Pure module — does not touch the database. The api-side handler in
 * apps/api/src/batch/handlers/fx-rates.ts is responsible for upserting
 * what this returns.
 */

export interface FxQuote {
  base: string;
  quote: string;
  rate: number;
  observedAt: Date;
  source: "frankfurter";
}

const BASE = "USD";
const QUOTES = ["KRW", "EUR", "JPY", "GBP", "CNY"] as const;

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export async function fetchFxRates(): Promise<FxQuote[]> {
  const url = `https://api.frankfurter.app/latest?from=${BASE}&to=${QUOTES.join(",")}`;
  const res = await fetch(url, {
    headers: { "user-agent": "eduright-ai/0.0.0 (+https://github.com/Raymond-Aidev/MKTG-Agent)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`frankfurter responded HTTP ${res.status}`);
  }
  const body = (await res.json()) as FrankfurterResponse;
  if (!body.rates || typeof body.rates !== "object") {
    throw new Error(`frankfurter response missing rates: ${JSON.stringify(body)}`);
  }

  // ECB publishes one rate per day; observedAt is the publication date in UTC.
  const observedAt = new Date(`${body.date}T00:00:00Z`);
  const out: FxQuote[] = [];
  for (const quote of QUOTES) {
    const rate = body.rates[quote];
    if (typeof rate !== "number") continue;
    out.push({
      base: BASE,
      quote,
      rate,
      observedAt,
      source: "frankfurter",
    });
  }
  return out;
}
