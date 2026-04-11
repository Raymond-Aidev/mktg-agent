import type { Job } from "bullmq";
import { fetchMarketTrends } from "@eduright/crawlers/category-a/market-trends";
import { getPool } from "../../infra/db.ts";
import { upsertCategoryA } from "../upsert.ts";
import type { BatchContext } from "../runner.ts";

const CORE_COLUMNS = ["topic", "region", "score", "source", "observed_at", "payload"];

export async function marketTrendsHandler(_job: Job, _ctx: BatchContext) {
  const records = await fetchMarketTrends();
  if (records.length === 0) {
    return { source: "wikipedia-pageviews", collected: 0 };
  }

  const pool = getPool();
  let inserted = 0;
  let updated = 0;
  let noop = 0;
  let failed = 0;

  for (const r of records) {
    try {
      const result = await upsertCategoryA(pool, {
        table: "market_trends",
        sourceUid: r.sourceUid,
        coreColumns: CORE_COLUMNS,
        values: {
          topic: r.topic,
          region: r.region,
          score: r.score,
          source: r.source,
          observed_at: r.observedAt,
          payload: JSON.stringify(r.payload),
        },
      });
      if (result.action === "inserted") inserted++;
      else if (result.action === "updated") updated++;
      else noop++;
    } catch (err) {
      failed++;
      console.error(`[market-trends] upsert failed for ${r.sourceUid}: ${(err as Error).message}`);
    }
  }

  return {
    source: "wikipedia-pageviews",
    collected: inserted + updated,
    skipped: noop,
    failed,
  };
}
