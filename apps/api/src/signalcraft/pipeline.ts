import type { CollectArgs } from "@eduright/crawlers/category-b/types";
import { getPoolForRole } from "../infra/db.ts";
import { COLLECTORS } from "./collectors.ts";
import { runModule } from "../llm/modules/runner.ts";
import { sentimentModuleConfig } from "../llm/modules/sentiment.ts";
import { opportunityModuleConfig } from "../llm/modules/opportunity.ts";
import { strategyModuleConfig } from "../llm/modules/strategy.ts";
import { macroViewModuleConfig } from "../llm/modules/macro-view.ts";
import { summaryModuleConfig } from "../llm/modules/summary.ts";
import { integratedModuleConfig, type IntegratedOutput } from "../llm/modules/integrated.ts";

const moduleLabels: Record<string, string> = {
  "#01": "시장 여론 동향",
  "#03": "감성 분석",
  "#06": "시장 인텔리전스",
  "#07": "실행 전략",
  "#08": "핵심 요약",
  "#13": "통합 리포트",
};
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
  productKeywordId?: string;
}

export interface PipelineResult {
  totalCollected: number;
  bySource: Record<string, number>;
  failedSources: string[];
  modulesRun: string[];
  modulesFailed: string[];
  reportId: string | null;
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
  const pool = getPoolForRole("signalcraft_worker");
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
  const pool = getPoolForRole("signalcraft_worker");
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
  const pool = getPoolForRole("signalcraft_worker");
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
  const pool = getPoolForRole("signalcraft_worker");
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
  reportId: string | null;
}

async function runStage3(input: PipelineInput): Promise<Stage3Result> {
  await setStatus(input.jobId, "analyzing", {
    currentStage: "stage3:analyze",
    progressPct: 50,
  });

  const rawPosts = await loadRawPostsForAnalysis(input.jobId);
  if (rawPosts.length === 0) {
    return { modulesRun: [], modulesFailed: [], reportId: null };
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

  // v2.0 module execution order (PRD v2.0 §5, Tech Spec v2.0 §4.1):
  //   #03 Sentiment  → "잘 되고 있나?" (감정 분포)
  //   #06 Opportunity → "뭘 수정해야 하나?" (기회 발굴, reads #03)
  //   #07 Strategy    → "더 좋은 방법은?" (실행 전략, reads #03 + #06)
  //   #08 Summary     → BLUF + 액션 (reads all above)
  //   #01 Macro View  → 여론 서사 (독립)
  //   #13 Integrated  → 통합 리포트 (reads everything)
  const modules: ModuleConfig<unknown>[] = [
    sentimentModuleConfig as ModuleConfig<unknown>, // #03
    opportunityModuleConfig as ModuleConfig<unknown>, // #06
    strategyModuleConfig as ModuleConfig<unknown>, // #07
    summaryModuleConfig as ModuleConfig<unknown>, // #08
    macroViewModuleConfig as ModuleConfig<unknown>, // #01
    integratedModuleConfig as ModuleConfig<unknown>, // #13
  ];

  let integratedOutput: IntegratedOutput | null = null;

  for (const cfg of modules) {
    const result = await runModule(cfg, ctx);
    await persistModuleResult(input.jobId, input.tenantId, cfg.id, result);
    if (result.status === "success") {
      ran.push(cfg.id);
      ctx.upstreamResults[cfg.id] = result.output;
      if (cfg.id === "#13") {
        integratedOutput = result.output as IntegratedOutput;
      }
    } else {
      failed.push(cfg.id);
      console.error(`[signalcraft:${input.jobId}] module ${cfg.id} failed: ${result.errorMessage}`);
    }
  }

  let reportId: string | null = null;
  if (integratedOutput) {
    reportId = await persistReport(input, integratedOutput, ran);
  } else if (ran.length > 0) {
    // #13 실패 시 성공한 모듈로 기본 리포트 생성
    const fallbackIntegrated: IntegratedOutput = {
      title: `${input.keyword} SignalCraft 분석 리포트`,
      sections: ran
        .filter((id) => id !== "#13")
        .map((id, i) => ({
          id: `section-${i + 1}`,
          title: moduleLabels[id] ?? id,
          content: "개별 모듈 분석 결과는 리포트 시각화 섹션에서 확인하세요.",
          sourceModule: id,
        })),
      metadata: {
        keyword: input.keyword,
        generatedAt: new Date().toISOString(),
        modulesUsed: ran,
      },
      confidence: "medium",
    };
    reportId = await persistReport(input, fallbackIntegrated, ran);
  }

  return { modulesRun: ran, modulesFailed: failed, reportId };
}

async function persistReport(
  input: PipelineInput,
  integrated: IntegratedOutput,
  modulesUsed: string[],
): Promise<string | null> {
  const pool = getPoolForRole("signalcraft_worker");
  try {
    const res = await pool.query<{ id: string }>(
      `INSERT INTO reports
         (tenant_id, job_id, kind, title, sections, metadata)
       VALUES ($1, $2, 'signalcraft_integrated', $3, $4, $5)
       RETURNING id`,
      [
        input.tenantId,
        input.jobId,
        integrated.title,
        JSON.stringify(integrated.sections),
        JSON.stringify({
          ...integrated.metadata,
          modulesUsed,
          confidence: integrated.confidence,
          disclaimer: integrated.disclaimer,
        }),
      ],
    );
    return res.rows[0]?.id ?? null;
  } catch (err) {
    console.error(`[signalcraft:${input.jobId}] persistReport failed: ${(err as Error).message}`);
    return null;
  }
}

/**
 * 시계열 스냅샷 저장 — 파이프라인 완료 후 1키워드 1일 1행 기록.
 * productKeywordId가 있을 때만 실행.
 */
async function persistSnapshot(
  input: PipelineInput,
  upstreamResults: Record<string, unknown>,
  postCount: number,
): Promise<void> {
  if (!input.productKeywordId) return;

  const pool = getPoolForRole("signalcraft_worker");
  try {
    // Extract metrics from module outputs
    const sentiment = upstreamResults["#03"] as
      | { sentimentRatio?: { positive?: number; negative?: number; neutral?: number } }
      | undefined;
    const opportunity = upstreamResults["#06"] as
      | {
          shareOfVoice?: Array<{ brand: string; mentions: number; isOurs?: boolean }>;
          riskSignals?: unknown[];
        }
      | undefined;

    const sp = sentiment?.sentimentRatio?.positive ?? 0;
    const sn = sentiment?.sentimentRatio?.negative ?? 0;
    const sneu = sentiment?.sentimentRatio?.neutral ?? 0;

    // SOV: find our brand
    let sovShare = 0;
    let sovRank = 0;
    let mentionCount = 0;
    if (opportunity?.shareOfVoice) {
      const sorted = [...opportunity.shareOfVoice].sort((a, b) => b.mentions - a.mentions);
      mentionCount = sorted.reduce((s, v) => s + v.mentions, 0);
      const oursIdx = sorted.findIndex((v) => v.isOurs);
      if (oursIdx >= 0 && mentionCount > 0) {
        sovRank = oursIdx + 1;
        sovShare = sorted[oursIdx]!.mentions / mentionCount;
      }
    }
    const riskCount = opportunity?.riskSignals?.length ?? 0;

    const today = new Date().toISOString().slice(0, 10);

    await pool.query(
      `INSERT INTO keyword_snapshots
         (product_keyword_id, tenant_id, keyword, snapshot_date, job_id,
          post_count, sentiment_positive, sentiment_negative, sentiment_neutral,
          sov_share, sov_rank, mention_count, risk_count, module_outputs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (product_keyword_id, snapshot_date) DO UPDATE SET
         job_id = EXCLUDED.job_id,
         post_count = EXCLUDED.post_count,
         sentiment_positive = EXCLUDED.sentiment_positive,
         sentiment_negative = EXCLUDED.sentiment_negative,
         sentiment_neutral = EXCLUDED.sentiment_neutral,
         sov_share = EXCLUDED.sov_share,
         sov_rank = EXCLUDED.sov_rank,
         mention_count = EXCLUDED.mention_count,
         risk_count = EXCLUDED.risk_count,
         module_outputs = EXCLUDED.module_outputs`,
      [
        input.productKeywordId,
        input.tenantId,
        input.keyword,
        today,
        input.jobId,
        postCount,
        sp,
        sn,
        sneu,
        sovShare,
        sovRank,
        mentionCount,
        riskCount,
        JSON.stringify(upstreamResults),
      ],
    );
    console.log(
      `[signalcraft:${input.jobId}] snapshot saved for keyword ${input.keyword} (${today})`,
    );
  } catch (err) {
    console.error(`[signalcraft:${input.jobId}] persistSnapshot failed: ${(err as Error).message}`);
  }
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const started = Date.now();
  try {
    const stage1 = await runStage1(input);
    const stage3 = await runStage3(input);

    // 시계열 스냅샷 저장 (productKeywordId가 있을 때만)
    if (input.productKeywordId && stage3.modulesRun.length > 0) {
      const pool = getPoolForRole("signalcraft_worker");
      const moRes = await pool.query<{ module_id: string; output: unknown }>(
        `SELECT module_id, output FROM signalcraft_module_outputs
         WHERE job_id = $1 AND status = 'success'`,
        [input.jobId],
      );
      const upstreamResults: Record<string, unknown> = {};
      for (const row of moRes.rows) {
        upstreamResults[row.module_id] = row.output;
      }
      await persistSnapshot(input, upstreamResults, stage1.totalCollected);
    }

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
