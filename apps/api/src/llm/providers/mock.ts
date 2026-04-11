import type { LLMProvider, LLMRequest, LLMResponse } from "../types.ts";

/**
 * Deterministic echo provider used for local dev and unit tests.
 *
 * Token counts follow a simple rule (1 token ≈ 4 chars) so downstream cost
 * math is still exercised without hitting a real API.
 */
export const mockProvider: LLMProvider = {
  name: "mock",
  async call(req: LLMRequest): Promise<LLMResponse> {
    const started = Date.now();
    const inputChars = req.messages.reduce((sum, m) => sum + m.content.length, 0);
    const output = `[mock-1 echo] ${req.messages.at(-1)?.content.slice(0, 120) ?? ""}`;
    return {
      content: output,
      inputTokens: Math.ceil(inputChars / 4),
      outputTokens: Math.ceil(output.length / 4),
      cachedInputTokens: 0,
      stopReason: "end_turn",
      latencyMs: Date.now() - started,
    };
  },
};
