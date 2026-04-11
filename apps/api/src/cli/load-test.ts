/**
 * SignalCraft load test — submits N jobs concurrently and reports timing.
 *
 * Usage:
 *   BASE_URL=https://mktg-agent-production.up.railway.app \
 *   pnpm --filter @eduright/api exec tsx src/cli/load-test.ts [concurrency] [keyword]
 *
 * Defaults: concurrency=10, keyword="children's books"
 *
 * For each parallel slot, the script:
 *   1. POSTs /api/v1/signalcraft/run
 *   2. Polls /api/v1/signalcraft/jobs/:id every 2s for up to 5 minutes
 *   3. Records: queueLatency, totalElapsed, finalStatus, reportId
 * Then prints aggregate p50/p90/p99 + per-job table + failure list.
 *
 * Tech Spec §3.8 7.5 acceptance: P95 < 500ms for the run-submission API
 * AND error rate < 1% across the 10-job batch.
 */

export {};

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const concurrency = Number(process.argv[2] ?? "10");
const keyword = process.argv[3] ?? "children's books";
const TENANT = "00000000-0000-0000-0000-0000000007e5"; // load test tenant
const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 5 * 60 * 1000;

interface RunResult {
  slot: number;
  jobId: string | null;
  submitMs: number;
  finishMs: number | null;
  totalMs: number | null;
  status: string;
  reportId: string | null;
  error: string | null;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx] ?? 0;
}

async function runOne(slot: number): Promise<RunResult> {
  const result: RunResult = {
    slot,
    jobId: null,
    submitMs: 0,
    finishMs: null,
    totalMs: null,
    status: "submit-fail",
    reportId: null,
    error: null,
  };
  const start = Date.now();
  try {
    const submitRes = await fetch(`${BASE}/api/v1/signalcraft/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenantId: TENANT,
        keyword: `${keyword} #${slot}`,
      }),
    });
    result.submitMs = Date.now() - start;
    if (!submitRes.ok) {
      result.error = `submit HTTP ${submitRes.status}`;
      return result;
    }
    const submitJson = (await submitRes.json()) as { jobId?: string };
    if (!submitJson.jobId) {
      result.error = "missing jobId";
      return result;
    }
    result.jobId = submitJson.jobId;

    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const pollRes = await fetch(`${BASE}/api/v1/signalcraft/jobs/${result.jobId}`);
      if (!pollRes.ok) continue;
      const job = (await pollRes.json()) as {
        status: string;
        reportId: string | null;
      };
      if (job.status === "done" || job.status === "failed") {
        result.status = job.status;
        result.reportId = job.reportId;
        result.finishMs = Date.now() - start;
        result.totalMs = result.finishMs;
        return result;
      }
    }
    result.status = "timeout";
    result.totalMs = Date.now() - start;
    return result;
  } catch (err) {
    result.error = (err as Error).message;
    return result;
  }
}

console.log(`[load-test] BASE=${BASE} concurrency=${concurrency} keyword="${keyword}"`);
const startedAt = Date.now();

const slots = Array.from({ length: concurrency }, (_, i) => i + 1);
const results = await Promise.all(slots.map((s) => runOne(s)));

const totalDuration = Date.now() - startedAt;

const submitted = results.filter((r) => r.jobId !== null);
const completed = results.filter((r) => r.status === "done");
const failed = results.filter(
  (r) => r.status === "failed" || r.status === "submit-fail" || r.status === "timeout",
);
const submitTimes = submitted.map((r) => r.submitMs);
const totalTimes = completed.map((r) => r.totalMs ?? 0);

console.log("\n=== submission latency (ms) ===");
console.log(
  `  count=${submitTimes.length}  min=${Math.min(...submitTimes)}  p50=${percentile(submitTimes, 0.5)}  p95=${percentile(submitTimes, 0.95)}  max=${Math.max(...submitTimes)}`,
);
console.log("\n=== end-to-end latency (ms, completed jobs only) ===");
console.log(
  `  count=${totalTimes.length}  min=${Math.min(...totalTimes)}  p50=${percentile(totalTimes, 0.5)}  p95=${percentile(totalTimes, 0.95)}  max=${Math.max(...totalTimes)}`,
);
console.log(`\n=== outcome ===`);
console.log(`  submitted = ${submitted.length}/${concurrency}`);
console.log(`  done      = ${completed.length}`);
console.log(`  failed    = ${failed.length}`);
console.log(`  total run = ${totalDuration}ms`);

if (failed.length > 0) {
  console.log("\n--- failures ---");
  for (const f of failed) {
    console.log(
      `  slot ${f.slot}  status=${f.status}  jobId=${f.jobId ?? "—"}  err=${f.error ?? "(none)"}`,
    );
  }
}

const submissionP95 = percentile(submitTimes, 0.95);
const errorRate = failed.length / concurrency;
const passed = submissionP95 < 500 && errorRate < 0.01;
console.log(`\nAcceptance: P95 submission < 500ms ⇒ ${submissionP95}ms`);
console.log(`Acceptance: error rate    < 1%    ⇒ ${(errorRate * 100).toFixed(1)}%`);
console.log(`\nResult: ${passed ? "PASS" : "FAIL"}`);
process.exit(passed ? 0 : 1);
