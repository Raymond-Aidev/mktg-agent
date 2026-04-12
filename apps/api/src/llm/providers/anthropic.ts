import Anthropic from "@anthropic-ai/sdk";
import { registerProvider } from "../client.ts";
import { getPricing } from "../pricing.ts";
import type { LLMMessage, LLMProvider, LLMRequest, LLMResponse } from "../types.ts";

/**
 * Real Anthropic provider — uses the Messages API via the official SDK.
 *
 * Activation: auto-registers at module import time when
 * `ANTHROPIC_API_KEY` is set in the environment. When the key is absent
 * the module is still imported safely; it simply doesn't register
 * anything, letting the dev-fixture take over.
 *
 * System messages are split out into the top-level `system` parameter
 * (Anthropic's API expects system separately from the messages array).
 * Every call records usage via the parent client's callModel() path, so
 * the cost ledger is unaffected.
 *
 * Prompt cache: we mark the system message with
 * `cache_control: { type: "ephemeral" }` so repeated SignalCraft module
 * calls can hit the 5-minute prompt cache and pay the cached rate for
 * the shared role/constraints block. See Tech Spec §1.3.6 for the
 * caching strategy.
 */

const API_KEY = process.env.ANTHROPIC_API_KEY;

function splitMessages(messages: LLMMessage[]): {
  system: string;
  user: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const systemParts: string[] = [];
  const user: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
    } else {
      user.push({ role: m.role, content: m.content });
    }
  }
  return { system: systemParts.join("\n\n"), user };
}

async function anthropicCall(req: LLMRequest): Promise<LLMResponse> {
  if (!API_KEY) {
    throw new Error(
      "anthropic provider: ANTHROPIC_API_KEY is not set — this call should never have reached here",
    );
  }

  const client = new Anthropic({ apiKey: API_KEY });
  const pricing = getPricing(req.model);
  const apiModel = pricing.apiModelId ?? req.model;
  const { system, user } = splitMessages(req.messages);

  const started = Date.now();

  // Anthropic SDK expects system as either a string OR an array of
  // content blocks. We use the block form so we can attach cache_control
  // for prompt caching on the system block.
  const systemBlocks =
    system.length > 0
      ? [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }]
      : undefined;

  const res = await client.messages.create({
    model: apiModel,
    max_tokens: req.maxOutputTokens,
    temperature: req.temperature ?? 0.2,
    system: systemBlocks,
    messages: user,
  });

  const latencyMs = Date.now() - started;

  // Collect text content blocks.
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const usage = res.usage as {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };

  return {
    content: text,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cachedInputTokens: usage.cache_read_input_tokens ?? 0,
    stopReason: res.stop_reason ?? "end_turn",
    latencyMs,
  };
}

const anthropicProvider: LLMProvider = {
  name: "anthropic",
  call: anthropicCall,
};

// Side-effect auto-registration. Only takes effect when the env var is set,
// so local dev / CI without a key continues to use the dev-fixture.
if (API_KEY) {
  registerProvider(anthropicProvider);
  console.log(
    `[goldencheck-api] Anthropic provider registered (key prefix ${API_KEY.slice(0, 12)}…)`,
  );
}

export { anthropicProvider };
