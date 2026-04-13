import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { getPool } from "../infra/db.ts";
import { renderReportHtml, type ReportRow } from "../reports/render-html.ts";

/**
 * Public reports API:
 *
 *   GET /api/v1/reports/:id          → JSON  (default)
 *   GET /api/v1/reports/:id?format=html → server-rendered HTML
 *
 * Auth is deferred to Phase 6 — for now we accept any caller. Phase 6
 * adds tenant scoping via JWT middleware so a tenant can only fetch
 * reports it owns.
 */

const UUID = /^[0-9a-f-]{36}$/;

export const reportsRouter: ExpressRouter = Router();

reportsRouter.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id || !UUID.test(id)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  const pool = getPool();
  const result = await pool.query<ReportRow>(
    `SELECT id, tenant_id, job_id, kind, title, sections, metadata, created_at
       FROM reports
      WHERE id = $1`,
    [id],
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "not_found" });
  }
  const row = result.rows[0];
  if (!row) {
    return res.status(404).json({ error: "not_found" });
  }

  if (req.query.format === "html") {
    const moduleOutputs: Record<string, unknown> = {};
    if (row.job_id) {
      const moRes = await pool.query<{ module_id: string; output: unknown }>(
        `SELECT module_id, output FROM signalcraft_module_outputs
          WHERE job_id = $1 AND status = 'success' AND output IS NOT NULL`,
        [row.job_id],
      );
      for (const mo of moRes.rows) {
        moduleOutputs[mo.module_id] = mo.output;
      }
    }
    res.set("content-type", "text/html; charset=utf-8");
    return res.status(200).send(renderReportHtml(row, moduleOutputs));
  }

  return res.json(row);
});
