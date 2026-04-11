import type { Job } from "bullmq";
import { fetchFxRates } from "@eduright/crawlers/category-a/fx-rates";
import { getPool } from "../../infra/db.ts";
import type { BatchContext } from "../runner.ts";

/**
 * Persist fx_rates rows. fx_rates uses a composite primary key
 * (base, quote, observed_at) and stores append-only snapshots — no UPDATE
 * trigger, no fingerprint. Re-running this handler for the same observation
 * date is a no-op thanks to ON CONFLICT DO NOTHING.
 */
export async function fxRatesHandler(_job: Job, _ctx: BatchContext) {
  const quotes = await fetchFxRates();

  if (quotes.length === 0) {
    return { source: "frankfurter", collected: 0 };
  }

  const pool = getPool();
  let inserted = 0;
  let skipped = 0;

  for (const q of quotes) {
    const result = await pool.query(
      `INSERT INTO fx_rates (base, quote, rate, observed_at, source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (base, quote, observed_at) DO NOTHING`,
      [q.base, q.quote, q.rate, q.observedAt.toISOString(), q.source],
    );
    if (result.rowCount && result.rowCount > 0) {
      inserted++;
    } else {
      skipped++;
    }
  }

  return { source: "frankfurter", collected: inserted, skipped };
}
