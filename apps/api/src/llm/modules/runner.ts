import { callModel } from "../client.ts";
import { buildModuleMessages } from "./builder.ts";
// Side-effect imports: each provider self-registers at module init when
// its activation condition is met. Order matters — the anthropic provider
// registers last so a real API key always wins over the dev-fixture.
import "../providers/dev-fixture.ts";
import "../providers/anthropic.ts";
import type { ModuleConfig, ModuleContext, ModuleRunResult } from "./types.ts";

/**
 * Run a single SignalCraft module against a SignalCraft job context.
 *
 * Behaviors:
 *   - Builds the 4-part prompt via buildModuleMessages()
 *   - Calls callModel() so the call is logged in llm_usage with the
 *     correct tenant + module attribution
 *   - Validates the response against the module's Zod schema
 *   - Retries up to maxAttempts times on JSON parse / Zod validation
 *     failure (the LLM gets the same prompt; we rely on temperature for
 *     variation)
 *   - Returns a typed ModuleRunResult — never throws
 */

export interface RunOptions {
  maxAttempts?: number;
}

function tryExtractJson(raw: string): unknown {
  let cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  // trailing comma 수정
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch {
    // 2차 시도: JSON 문자열 안의 이스케이프 안 된 줄바꿈/탭 수정
    // "key": "value with
    // newline" → "key": "value with\nnewline"
    const fixed = cleaned.replace(/"([^"]*?)"/g, (_match, content: string) => {
      const escaped = content
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
      return `"${escaped}"`;
    });
    return JSON.parse(fixed);
  }
}

export async function runModule<TOutput>(
  config: ModuleConfig<TOutput>,
  context: ModuleContext,
  options: RunOptions = {},
): Promise<ModuleRunResult<TOutput>> {
  const maxAttempts = options.maxAttempts ?? 3;
  const started = Date.now();
  const messages = buildModuleMessages({ config, context });

  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await callModel(
        {
          model: config.model,
          messages,
          maxOutputTokens: config.maxOutputTokens,
          temperature: config.temperature ?? 0.2,
          expectedSchemaName: config.schemaName,
        },
        {
          tenantId: context.tenantId,
          jobId: context.jobId,
          moduleId: config.id,
        },
      );

      let parsed: unknown;
      try {
        parsed = tryExtractJson(res.content);
      } catch (parseErr) {
        lastError = `JSON parse error: ${(parseErr as Error).message}`;
        continue;
      }

      const result = config.schema.safeParse(parsed);
      if (!result.success) {
        lastError = `Zod validation failed: ${result.error.issues
          .map((i) => `${i.path.join(".")} ${i.message}`)
          .join("; ")}`;
        continue;
      }

      return {
        status: "success",
        output: result.data,
        errorMessage: null,
        attempts: attempt,
        durationMs: Date.now() - started,
        modelName: config.model,
      };
    } catch (callErr) {
      lastError = `LLM call failed: ${(callErr as Error).message}`;
      // continue to retry
    }
  }

  return {
    status: "failed",
    output: null,
    errorMessage: lastError ?? "unknown failure",
    attempts: maxAttempts,
    durationMs: Date.now() - started,
    modelName: config.model,
  };
}
