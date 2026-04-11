import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { refreshQueueGauges, registry } from "../infra/metrics.ts";

/**
 * GET /metrics — Prometheus text format. Designed to be scraped by
 * Grafana Cloud (or any Prometheus-compatible collector).
 *
 * Public on purpose — Prometheus scrapers don't authenticate, but the
 * endpoint emits no business secrets, only counters / histograms /
 * gauges from the running process.
 */
export const metricsRouter: ExpressRouter = Router();

metricsRouter.get("/", async (_req: Request, res: Response) => {
  await refreshQueueGauges();
  res.set("content-type", registry.contentType);
  res.end(await registry.metrics());
});
