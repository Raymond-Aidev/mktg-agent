import type { z } from "zod";
import type { LLMCallContext, LLMRequest } from "../types.ts";

/**
 * Common abstractions used by every SignalCraft analysis module (#01–#13).
 *
 * A module is the smallest unit of LLM work in Stage 3 of the pipeline.
 * Each module:
 *   1. Builds a 4-part prompt from upstream context (Tech Spec §4.1).
 *   2. Calls the LLM through callModel() so the call is recorded in
 *      llm_usage with the right tenant + module attribution.
 *   3. Validates the JSON response against its Zod schema.
 *   4. Returns a typed object the pipeline can persist or pass to a
 *      downstream module.
 */

export interface ModuleContext {
  jobId: string;
  tenantId: string;
  keyword: string;
  /** Earlier modules' outputs, keyed by module id. #13 reads everything. */
  upstreamResults: Record<string, unknown>;
  /** Posts already loaded for this job — modules slice as needed. */
  rawPosts: RawPostForAnalysis[];
}

export interface RawPostForAnalysis {
  source: string;
  author: string | null;
  content: string;
  likes: number;
  commentsCnt: number;
  publishedAt: Date | null;
  url: string | null;
}

export interface ModuleConfig<TOutput> {
  /** e.g. "#03" — used in prompt and as the storage key. */
  id: string;
  /** Human-friendly title surfaced in dashboards / logs. */
  title: string;
  /** ROLE clause of the prompt. */
  role: string;
  /** TASK clause of the prompt. */
  task: string;
  /** Highest number of raw posts to include in INPUT. */
  maxPosts: number;
  /** Output token cap, used by callModel for safety. */
  maxOutputTokens: number;
  /** LLM model id from src/llm/pricing.ts. */
  model: string;
  /** Sampling temperature. Modules default to 0.2 for determinism. */
  temperature?: number;
  /** Zod schema the model output must satisfy. */
  schema: z.ZodType<TOutput>;
  /** Display name for the schema (logged when validation fails). */
  schemaName: string;
}

export interface ModuleRunResult<TOutput> {
  status: "success" | "failed";
  output: TOutput | null;
  errorMessage: string | null;
  attempts: number;
  durationMs: number;
  modelName: string;
}

export type LLMRequestForModule = LLMRequest;
export type LLMCallContextForModule = LLMCallContext;
