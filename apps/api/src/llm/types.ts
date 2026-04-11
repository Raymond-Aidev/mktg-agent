/**
 * Public surface of the LLM wrapper. Provider-specific SDK types are hidden
 * behind this abstraction so SignalCraft module code never imports Anthropic
 * or Google SDKs directly.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  /** Registered model id from src/llm/pricing.ts */
  model: string;
  messages: LLMMessage[];
  /** Hard cap on output tokens for cost safety. */
  maxOutputTokens: number;
  /** 0.0 – 1.0. Modules default to 0.2 for determinism. */
  temperature?: number;
  /** Optional JSON schema shape the caller expects back (for logging only). */
  expectedSchemaName?: string;
}

export interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  stopReason: string;
  latencyMs: number;
}

/**
 * Context attached to every LLM call so usage rows are properly attributed.
 * Any call without a tenantId is rejected — this is how we enforce multi-
 * tenant cost accounting.
 */
export interface LLMCallContext {
  tenantId: string;
  jobId?: string;
  moduleId?: string;
}

export interface LLMProvider {
  name: "anthropic" | "google" | "mock";
  call(request: LLMRequest): Promise<LLMResponse>;
}
