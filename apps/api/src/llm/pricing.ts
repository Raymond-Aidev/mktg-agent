/**
 * Model pricing table (USD per 1M tokens, input/output split).
 * Source: public pricing pages as of 2026-04. Update when vendors change.
 *
 * `cached_input_rate` is the price per 1M input tokens that hit the prompt
 * cache (Anthropic). We store the effective unit cost and let the DB column
 * `cost_usd` compute the total from billed token counts.
 */

export interface ModelPricing {
  /** USD per token (not per 1M) — ready to plug into llm_usage.price_per_*. */
  inputPerToken: number;
  outputPerToken: number;
  /** Cached-input rate per token (Anthropic prompt cache hits). */
  cachedInputPerToken?: number;
  /** Vendor hint for the client dispatcher. */
  provider: "anthropic" | "google" | "mock";
  /**
   * Model identifier the vendor API actually expects. We keep the internal
   * key stable (e.g. "claude-sonnet-4-6") while letting the API id rotate
   * (e.g. pinned snapshot "claude-sonnet-4-6-20260301"). Optional — when
   * missing, providers fall back to the registry key.
   */
  apiModelId?: string;
}

const perMillion = (usd: number): number => usd / 1_000_000;

export const PRICING: Record<string, ModelPricing> = {
  // Anthropic — https://www.anthropic.com/pricing
  "claude-opus-4-6": {
    provider: "anthropic",
    inputPerToken: perMillion(15),
    outputPerToken: perMillion(75),
    cachedInputPerToken: perMillion(1.5),
  },
  "claude-sonnet-4-6": {
    provider: "anthropic",
    inputPerToken: perMillion(3),
    outputPerToken: perMillion(15),
    cachedInputPerToken: perMillion(0.3),
  },
  "claude-haiku-4-5": {
    provider: "anthropic",
    inputPerToken: perMillion(1),
    outputPerToken: perMillion(5),
    cachedInputPerToken: perMillion(0.1),
  },

  // Google Gemini — https://ai.google.dev/pricing
  "gemini-2.5-flash": {
    provider: "google",
    inputPerToken: perMillion(0.075),
    outputPerToken: perMillion(0.3),
  },
  "gemini-2.5-pro": {
    provider: "google",
    inputPerToken: perMillion(1.25),
    outputPerToken: perMillion(5),
  },

  // Test fixture — free, deterministic
  "mock-1": {
    provider: "mock",
    inputPerToken: 0,
    outputPerToken: 0,
  },
};

export function getPricing(model: string): ModelPricing {
  const p = PRICING[model];
  if (!p) {
    throw new Error(`Unknown LLM model: ${model}. Add it to src/llm/pricing.ts`);
  }
  return p;
}
