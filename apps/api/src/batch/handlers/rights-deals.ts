import type { Job } from "bullmq";
import { fetchRightsDeals } from "@eduright/crawlers/category-a/rights-deals";
import { getPool } from "../../infra/db.ts";
import { upsertCategoryA } from "../upsert.ts";
import type { BatchContext } from "../runner.ts";

const CORE_COLUMNS = [
  "title",
  "isbn",
  "author",
  "original_lang",
  "target_lang",
  "licensor",
  "licensee",
  "deal_date",
  "territory",
  "payload",
];

export async function rightsDealsHandler(_job: Job, _ctx: BatchContext) {
  const records = await fetchRightsDeals({ limit: 50 });
  if (records.length === 0) {
    return { source: "open-library", collected: 0 };
  }

  const pool = getPool();
  let inserted = 0;
  let updated = 0;
  let noop = 0;
  let failed = 0;

  for (const r of records) {
    try {
      const result = await upsertCategoryA(pool, {
        table: "rights_deals",
        sourceUid: r.sourceUid,
        coreColumns: CORE_COLUMNS,
        values: {
          title: r.title,
          isbn: r.isbn,
          author: r.author,
          original_lang: r.originalLang,
          target_lang: r.targetLang,
          licensor: r.licensor,
          licensee: r.licensee,
          deal_date: r.dealDate,
          territory: r.territory,
          payload: JSON.stringify(r.payload),
        },
      });
      if (result.action === "inserted") inserted++;
      else if (result.action === "updated") updated++;
      else noop++;
    } catch (err) {
      failed++;
      console.error(`[rights-deals] upsert failed for ${r.sourceUid}: ${(err as Error).message}`);
    }
  }

  return {
    source: "open-library",
    collected: inserted + updated,
    skipped: noop,
    failed,
  };
}
