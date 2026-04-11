import type { CollectArgs } from "@eduright/crawlers/category-b/types";
import { getPool } from "../infra/db.ts";
import { COLLECTORS } from "./collectors.ts";

/**
 * SignalCraft pipeline orchestrator.
 *
 * Stage layout (Tech Spec §1.3.1):
 *   Stage 1 — collect: run every registered collector in parallel, write
 *             raw_posts rows keyed to the job.
 *   Stage 2 — (TODO Phase 3 follow-up) normalize + dedup
 *   Stage 3 — (TODO Phase 4) 14 LLM modules
 *   Stage 4 — (TODO Phase 5) report rendering
 *
 * This module focuses on Stage 1 end-to-end plus the status transitions
 * on signalcraft_jobs so the /api/v1/signalcraft/jobs/:id endpoint can
 * report meaningful progress during and after the run.
 */

export interface PipelineInput {
  jobId: string;
  tenantId: string;
  keyword: string;
  regions: string[];
}

export interface PipelineResult {
  totalCollected: number;
  bySource: Record<string, number>;
  failedSources: string[];
  durationMs: number;
}

async function setStatus(
  jobId: string,
  status: string,
  extra: Partial<{
    currentStage: string;
    progressPct: number;
    errorMessage: string | null;
    startedAt: boolean;
    finishedAt: boolean;
  }> = {},
): Promise<void> {
  const pool = getPool();
  const fragments: string[] = ["status = $2"];
  const params: unknown[] = [jobId, status];
  let i = 3;
  if (extra.currentStage !== undefined) {
    fragments.push(`current_stage = $${i++}`);
    params.push(extra.currentStage);
  }
  if (extra.progressPct !== undefined) {
    fragments.push(`progress_pct = $${i++}`);
    params.push(extra.progressPct);
  }
  if (extra.errorMessage !== undefined) {
    fragments.push(`error_message = $${i++}`);
    params.push(extra.errorMessage);
  }
  if (extra.startedAt) fragments.push("started_at = COALESCE(started_at, now())");
  if (extra.finishedAt) fragments.push("finished_at = now()");
  await pool.query(`UPDATE signalcraft_jobs SET ${fragments.join(", ")} WHERE id = $1`, params);
}

async function runStage1(input: PipelineInput): Promise<PipelineResult> {
  const pool = getPool();
  const args: CollectArgs = {
    keyword: input.keyword,
    regions: input.regions,
    limit: 50,
  };

  await setStatus(input.jobId, "collecting", {
    currentStage: "stage1:collect",
    progressPct: 5,
    startedAt: true,
  });

  const bySource: Record<string, number> = {};
  const failed: string[] = [];
  let total = 0;

  const results = await Promise.allSettled(
    COLLECTORS.map(async (c) => {
      const drafts = await c.collect(args);
      return { source: c.source, drafts };
    }),
  );

  for (const r of results) {
    if (r.status === "rejected") {
      console.error(`[signalcraft:${input.jobId}] collector failed: ${r.reason}`);
      continue;
    }
    const { source, drafts } = r.value;
    if (drafts.length === 0) {
      bySource[source] = 0;
      continue;
    }
    for (const d of drafts) {
      try {
        await pool.query(
          `INSERT INTO raw_posts
             (job_id, tenant_id, source, keyword, post_id, author, content,
              likes, dislikes, comments_cnt, view_cnt, published_at, url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            input.jobId,
            input.tenantId,
            d.source,
            input.keyword,
            d.postId,
            d.author,
            d.content,
            d.likes ?? 0,
            d.dislikes ?? 0,
            d.commentsCnt ?? 0,
            d.viewCnt ?? 0,
            d.publishedAt ?? null,
            d.url ?? null,
          ],
        );
        total++;
      } catch (err) {
        console.error(
          `[signalcraft:${input.jobId}] raw_posts insert failed: ${(err as Error).message}`,
        );
        failed.push(source);
      }
    }
    bySource[source] = drafts.length;
  }

  return {
    totalCollected: total,
    bySource,
    failedSources: failed,
    durationMs: 0, // filled by caller
  };
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const started = Date.now();
  try {
    const stage1 = await runStage1(input);

    // Stage 2-4 stubs: mark the job done with progress=100 so the client
    // can poll a terminal state. Real analysis + rendering land in
    // Phase 4 and Phase 5.
    await setStatus(input.jobId, "done", {
      currentStage: "done",
      progressPct: 100,
      finishedAt: true,
    });

    return { ...stage1, durationMs: Date.now() - started };
  } catch (err) {
    const error = err as Error;
    console.error(`[signalcraft:${input.jobId}] pipeline failed: ${error.message}`);
    await setStatus(input.jobId, "failed", {
      errorMessage: error.message.slice(0, 1000),
      finishedAt: true,
    }).catch(() => {});
    throw error;
  }
}
