import type { CollectArgs } from "@eduright/crawlers/category-b/types";
import { getPool } from "../infra/db.ts";
import { COLLECTORS } from "./collectors.ts";
import { runModule } from "../llm/modules/runner.ts";
import { sentimentModuleConfig } from "../llm/modules/sentiment.ts";
import { macroViewModuleConfig } from "../llm/modules/macro-view.ts";
import { summaryModuleConfig } from "../llm/modules/summary.ts";
import type {
  ModuleConfig,
  ModuleContext,
  ModuleRunResult,
  RawPostForAnalysis,
} from "../llm/modules/types.ts";

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
  modulesRun: string[];
  modulesFailed: string[];
  durationMs: number;
}

interface RawPostRow {
  source: string;
  author: string | null;
  content: string;
  likes: number;
  comments_cnt: number;
  published_at: Date | null;
  url: string | null;
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

interface Stage1Result {
  totalCollected: number;
  bySource: Record<string, number>;
  failedSources: string[];
}

async function runStage1(input: PipelineInput): Promise<Stage1Result> {
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
  };
}

async function loadRawPostsForAnalysis(jobId: string): Promise<RawPostForAnalysis[]> {
  const pool = getPool();
  const res = await pool.query<RawPostRow>(
    `SELECT source, author, content, likes, comments_cnt, published_at, url
       FROM raw_posts
      WHERE job_id = $1
      ORDER BY likes DESC NULLS LAST, collected_at ASC`,
    [jobId],
  );
  return res.rows.map((r) => ({
    source: r.source,
    author: r.author,
    content: r.content,
    likes: r.likes,
    commentsCnt: r.comments_cnt,
    publishedAt: r.published_at,
    url: r.url,
  }));
}

async function persistModuleResult<T>(
  jobId: string,
  tenantId: string,
  moduleId: string,
  result: ModuleRunResult<T>,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO signalcraft_module_outputs
       (job_id, tenant_id, module_id, status, output, error_msg,
        attempts, duration_ms, model_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (job_id, module_id) DO UPDATE SET
       status      = EXCLUDED.status,
       output      = EXCLUDED.output,
       error_msg   = EXCLUDED.error_msg,
       attempts    = EXCLUDED.attempts,
       duration_ms = EXCLUDED.duration_ms,
       model_name  = EXCLUDED.model_name,
       created_at  = now()`,
    [
      jobId,
      tenantId,
      moduleId,
      result.status,
      result.output ? JSON.stringify(result.output) : null,
      result.errorMessage,
      result.attempts,
      result.durationMs,
      result.modelName,
    ],
  );
}

interface Stage3Result {
  modulesRun: string[];
  modulesFailed: string[];
}

async function runStage3(input: PipelineInput): Promise<Stage3Result> {
  await setStatus(input.jobId, "analyzing", {
    currentStage: "stage3:analyze",
    progressPct: 50,
  });

  const rawPosts = await loadRawPostsForAnalysis(input.jobId);
  if (rawPosts.length === 0) {
    return { modulesRun: [], modulesFailed: [] };
  }

  const ctx: ModuleContext = {
    jobId: input.jobId,
    tenantId: input.tenantId,
    keyword: input.keyword,
    upstreamResults: {},
    rawPosts,
  };

  const ran: string[] = [];
  const failed: string[] = [];

  // Phase 4 W10–W11: #01 + #03 are independent and run first; #08
  // (Executive Summary) reads upstream #01 and #03 results.
  // Order matters because each module's output is appended to
  // ctx.upstreamResults for subsequent modules.
  const modules: ModuleConfig<unknown>[] = [
    macroViewModuleConfig as ModuleConfig<unknown>, // #01
    sentimentModuleConfig as ModuleConfig<unknown>, // #03
    summaryModuleConfig as ModuleConfig<unknown>, // #08 — reads upstream
  ];

  for (const cfg of modules) {
    const result = await runModule(cfg, ctx);
    await persistModuleResult(input.jobId, input.tenantId, cfg.id, result);
    if (result.status === "success") {
      ran.push(cfg.id);
      ctx.upstreamResults[cfg.id] = result.output;
    } else {
      failed.push(cfg.id);
      console.error(`[signalcraft:${input.jobId}] module ${cfg.id} failed: ${result.errorMessage}`);
    }
  }

  return { modulesRun: ran, modulesFailed: failed };
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const started = Date.now();
  try {
    const stage1 = await runStage1(input);
    const stage3 = await runStage3(input);

    await setStatus(input.jobId, "done", {
      currentStage: "done",
      progressPct: 100,
      finishedAt: true,
    });

    return {
      ...stage1,
      ...stage3,
      durationMs: Date.now() - started,
    };
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
