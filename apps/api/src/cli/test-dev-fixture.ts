import { registerDevFixtureProviders } from "../llm/providers/dev-fixture.ts";
import { callModel } from "../llm/client.ts";
import { closePool } from "../infra/db.ts";

registerDevFixtureProviders();
console.log("dev-fixture registered");

try {
  const res = await callModel(
    {
      model: "claude-sonnet-4-6",
      messages: [{ role: "user", content: "test" }],
      maxOutputTokens: 100,
      expectedSchemaName: "SentimentSchema",
    },
    {
      tenantId: "00000000-0000-0000-0000-000000000000",
      moduleId: "#debug",
    },
  );
  console.log("OK content:", res.content.slice(0, 80));
} catch (e) {
  console.log("FAIL:", (e as Error).message);
}
await closePool();
