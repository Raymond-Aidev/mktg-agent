import type { Job } from "bullmq";
import { fetchCompetitors } from "@eduright/crawlers/category-a/competitors";
import { getPoolForRole } from "../../infra/db.ts";
import { upsertCategoryA } from "../upsert.ts";
import type { BatchContext } from "../runner.ts";

const CORE_COLUMNS = ["name", "country", "website", "primary_genres", "recent_titles", "notes"];

export async function competitorsHandler(_job: Job, _ctx: BatchContext) {
  const records = await fetchCompetitors();
  if (records.length === 0) {
    return { source: "open-library-publisher", collected: 0 };
  }

  const pool = getPoolForRole("batch_worker");
  let inserted = 0;
  let updated = 0;
  let noop = 0;
  let failed = 0;

  for (const r of records) {
    try {
      const result = await upsertCategoryA(pool, {
        table: "competitors",
        sourceUid: r.sourceUid,
        coreColumns: CORE_COLUMNS,
        values: {
          name: r.name,
          country: r.country,
          website: r.website,
          primary_genres: r.primaryGenres,
          recent_titles: JSON.stringify(r.recentTitles),
          notes: r.notes,
        },
      });
      if (result.action === "inserted") inserted++;
      else if (result.action === "updated") updated++;
      else noop++;
    } catch (err) {
      failed++;
      console.error(`[competitors] upsert failed for ${r.sourceUid}: ${(err as Error).message}`);
    }
  }

  return {
    source: "open-library-publisher",
    collected: inserted + updated,
    skipped: noop,
    failed,
  };
}
