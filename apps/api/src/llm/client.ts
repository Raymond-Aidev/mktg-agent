import { getPool } from "../infra/db.ts";
import { getPricing } from "./pricing.ts";
import { mockProvider } from "./providers/mock.ts";
import type { LLMCallContext, LLMProvider, LLMRequest, LLMResponse } from "./types.ts";

/**
 * Unified LLM entry point used by all SignalCraft modules and agents.
 *
 *   const res = await callModel(
 *     { model: "claude-sonnet-4-6", messages: [...], maxOutputTokens: 2048 },
 *     { tenantId, jobId, moduleId: "#03" },
 *   );
 *
 * Guarantees:
 *   1. tenantId must be supplied — calls without it are rejected.
 *   2. Every successful call writes exactly one row to llm_usage with the
 *      correct pricing snapshot (so future price changes don't retro-rewrite
 *      history).
 *   3. Failures also write a usage row (with 0 tokens) so runaway retry
 *      loops are still visible on the cost dashboard.
 */

// Global registry: tsx can evaluate the same .ts file more than once when it
// is imported via different paths in the same process. To make registration
// resilient to this, we store the provider map directly on globalThis using
// a plain symbol, and every read/write goes through a helper that rebinds
// the live reference. Do NOT cache `REGISTRY` in a module-local binding.
const REGISTRY_KEY = Symbol.for("eduright.llm.registry");

type RegistryMap = Record<LLMProvider["name"], LLMProvider>;

function getRegistry(): RegistryMap {
  const g = globalThis as Record<symbol, unknown>;
  let reg = g[REGISTRY_KEY] as RegistryMap | undefined;
  if (!reg) {
    reg = {
      mock: mockProvider,
      anthropic: {
        name: "anthropic",
        async call() {
          throw new Error(
            'LLM provider "anthropic" is not wired yet — add the SDK integration before calling.',
          );
        },
      },
      google: {
        name: "google",
        async call() {
          throw new Error(
            'LLM provider "google" is not wired yet — add the SDK integration before calling.',
          );
        },
      },
    };
    g[REGISTRY_KEY] = reg;
  }
  return reg;
}

export function registerProvider(provider: LLMProvider): void {
  const reg = getRegistry();
  reg[provider.name] = provider;
}

async function recordUsage(
  req: LLMRequest,
  ctx: LLMCallContext,
  result: LLMResponse | null,
  error: Error | null,
): Promise<void> {
  const pricing = getPricing(req.model);
  const pool = getPool();
  await pool.query(
    `INSERT INTO llm_usage
       (tenant_id, job_id, module_id, model_name,
        input_tokens, output_tokens, cached_input_tokens,
        price_per_input_token, price_per_output_token,
        latency_ms, validation_failures)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      ctx.tenantId,
      ctx.jobId ?? null,
      ctx.moduleId ?? null,
      req.model,
      result?.inputTokens ?? 0,
      result?.outputTokens ?? 0,
      result?.cachedInputTokens ?? 0,
      pricing.inputPerToken,
      pricing.outputPerToken,
      result?.latencyMs ?? null,
      error ? JSON.stringify({ error: error.message }) : null,
    ],
  );
}

export async function callModel(req: LLMRequest, ctx: LLMCallContext): Promise<LLMResponse> {
  if (!ctx.tenantId) {
    throw new Error("callModel: tenantId is required");
  }

  const pricing = getPricing(req.model);
  const provider = getRegistry()[pricing.provider];
  if (!provider) {
    throw new Error(`No provider registered for ${pricing.provider}`);
  }

  try {
    const result = await provider.call(req);
    await recordUsage(req, ctx, result, null);
    return result;
  } catch (err) {
    await recordUsage(req, ctx, null, err as Error).catch((logErr) => {
      console.error("[llm] failed to record usage for failed call:", (logErr as Error).message);
    });
    throw err;
  }
}
