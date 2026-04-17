import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";
import { listQueues } from "./queues.ts";

/**
 * Prometheus metrics registry.
 *
 * Phase 7 W22 — single shared `Registry` so the /metrics endpoint and
 * background updaters share state. We expose:
 *   - default Node.js process metrics (cpu, memory, gc, event loop lag)
 *   - per-queue depth gauges, refreshed on every /metrics scrape
 *   - http_request_duration_seconds histogram (Express middleware)
 *   - signalcraft_jobs_total counter by terminal status
 *   - llm_calls_total counter by model + status
 */

export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: "eduright_" });

export const httpRequestDuration = new Histogram({
  name: "eduright_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

export const signalcraftJobsTotal = new Counter({
  name: "eduright_signalcraft_jobs_total",
  help: "SignalCraft job terminal counts",
  labelNames: ["status"],
  registers: [registry],
});

export const llmCallsTotal = new Counter({
  name: "eduright_llm_calls_total",
  help: "LLM API call counts",
  labelNames: ["model", "status"],
  registers: [registry],
});

export const queueWaitingGauge = new Gauge({
  name: "eduright_queue_waiting_jobs",
  help: "BullMQ jobs in waiting state",
  labelNames: ["queue"],
  registers: [registry],
});
export const queueActiveGauge = new Gauge({
  name: "eduright_queue_active_jobs",
  help: "BullMQ jobs in active state",
  labelNames: ["queue"],
  registers: [registry],
});
export const queueFailedGauge = new Gauge({
  name: "eduright_queue_failed_jobs",
  help: "BullMQ jobs in failed state",
  labelNames: ["queue"],
  registers: [registry],
});

export const dlqSizeGauge = new Gauge({
  name: "eduright_dlq_size",
  help: "Pending jobs sitting in a DLQ awaiting operator action",
  labelNames: ["queue"],
  registers: [registry],
});

export const dlqMovedTotal = new Counter({
  name: "eduright_dlq_moved_total",
  help: "Jobs moved into the DLQ after exhausting BullMQ retries",
  labelNames: ["queue"],
  registers: [registry],
});

export const circuitBreakerStateGauge = new Gauge({
  name: "eduright_circuit_breaker_state",
  help: "Circuit breaker per source: 0=closed, 1=half_open, 2=open",
  labelNames: ["source"],
  registers: [registry],
});

const DLQ_NAMES = new Set(["batch-dlq", "signalcraft-dlq"]);

/**
 * Refresh queue gauges by querying BullMQ. Called on each /metrics scrape
 * so the values reflect the latest state without a polling loop.
 */
export async function refreshQueueGauges(): Promise<void> {
  try {
    const queues = listQueues();
    const counts = await Promise.all(queues.map((q) => q.getJobCounts()));
    for (let i = 0; i < queues.length; i++) {
      const q = queues[i];
      const c = counts[i];
      if (!q || !c) continue;
      queueWaitingGauge.set({ queue: q.name }, Number(c.waiting ?? 0));
      queueActiveGauge.set({ queue: q.name }, Number(c.active ?? 0));
      queueFailedGauge.set({ queue: q.name }, Number(c.failed ?? 0));
      if (DLQ_NAMES.has(q.name)) {
        // DLQ "size" = waiting + delayed (jobs not yet hand-retried).
        const size = Number(c.waiting ?? 0) + Number(c.delayed ?? 0);
        dlqSizeGauge.set({ queue: q.name }, size);
      }
    }
  } catch {
    // best-effort — leave previous values in place
  }
}

const STATE_NUM: Record<"closed" | "half_open" | "open", number> = {
  closed: 0,
  half_open: 1,
  open: 2,
};

export function setCircuitBreakerGauge(
  source: string,
  state: "closed" | "half_open" | "open",
): void {
  circuitBreakerStateGauge.set({ source }, STATE_NUM[state]);
}
