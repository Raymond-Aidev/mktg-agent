import type { Job } from "bullmq";
import { fetchBestsellers } from "@eduright/crawlers/category-a/bestsellers";
import { getPoolForRole } from "../../infra/db.ts";
import { upsertCategoryA } from "../upsert.ts";
import type { BatchContext } from "../runner.ts";

const CORE_COLUMNS = [
  "region",
  "category",
  "rank",
  "title",
  "author",
  "isbn",
  "price_usd",
  "observed_at",
  "payload",
];

export async function bestsellersHandler(_job: Job, _ctx: BatchContext) {
  const records = await fetchBestsellers({ subject: "children", limit: 50 });
  if (records.length === 0) {
    return { source: "open-library-subjects", collected: 0 };
  }

  const pool = getPoolForRole("batch_worker");
  let inserted = 0;
  let updated = 0;
  let noop = 0;
  let failed = 0;

  for (const r of records) {
    try {
      const result = await upsertCategoryA(pool, {
        table: "bestsellers",
        sourceUid: r.sourceUid,
        coreColumns: CORE_COLUMNS,
        values: {
          region: r.region,
          category: r.category,
          rank: r.rank,
          title: r.title,
          author: r.author,
          isbn: r.isbn,
          price_usd: r.priceUsd,
          observed_at: r.observedAt,
          payload: JSON.stringify(r.payload),
        },
      });
      if (result.action === "inserted") inserted++;
      else if (result.action === "updated") updated++;
      else noop++;
    } catch (err) {
      failed++;
      console.error(`[bestsellers] upsert failed for ${r.sourceUid}: ${(err as Error).message}`);
    }
  }

  return {
    source: "open-library-subjects",
    collected: inserted + updated,
    skipped: noop,
    failed,
  };
}
