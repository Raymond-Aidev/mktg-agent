import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { getPool } from "../infra/db.ts";
import { renderReportHtml, type ReportRow } from "../reports/render-html.ts";
import { renderReportPdf } from "../reports/pdf-renderer.ts";
import { getR2Url, isR2Configured, putR2Object } from "../infra/r2.ts";

/**
 * Public reports API:
 *
 *   GET  /api/v1/reports/:id               → JSON  (default)
 *   GET  /api/v1/reports/:id?format=html   → server-rendered HTML
 *   POST /api/v1/reports/:id/pdf           → Puppeteer 렌더 + R2 업로드 + URL 반환
 *   GET  /api/v1/reports/:id/pdf           → 저장된 PDF URL로 리다이렉트
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

/**
 * POST /:id/pdf — Generate PDF, upload to R2, persist key.
 *
 * Idempotent-ish: if pdf_s3_key is already set, returns 409 unless
 * ?force=1 is set. This prevents accidental re-generation bills.
 */
reportsRouter.post("/:id/pdf", async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id || !UUID.test(id)) {
    return res.status(400).json({ error: "invalid_id" });
  }
  if (!isR2Configured()) {
    return res.status(503).json({ error: "r2_not_configured" });
  }

  const pool = getPool();
  const existing = await pool.query<{ pdf_s3_key: string | null }>(
    `SELECT pdf_s3_key FROM reports WHERE id = $1`,
    [id],
  );
  if (existing.rowCount === 0) {
    return res.status(404).json({ error: "not_found" });
  }
  const current = existing.rows[0]?.pdf_s3_key ?? null;
  if (current && req.query.force !== "1") {
    return res
      .status(409)
      .json({ error: "pdf_exists", pdfKey: current, hint: "append ?force=1 to regenerate" });
  }

  try {
    const pdf = await renderReportPdf({ reportId: id });
    const key = `reports/${id}.pdf`;
    await putR2Object(key, pdf, "application/pdf");
    await pool.query(`UPDATE reports SET pdf_s3_key = $1, updated_at = now() WHERE id = $2`, [
      key,
      id,
    ]);
    const url = await getR2Url(key);
    return res.status(200).json({ pdfKey: key, url, bytes: pdf.length });
  } catch (err) {
    console.error(`[reports:${id}] pdf generation failed: ${(err as Error).message}`);
    return res.status(500).json({ error: "pdf_render_failed", detail: (err as Error).message });
  }
});

/**
 * GET /:id/pdf — Redirect caller to the stored PDF URL.
 */
reportsRouter.get("/:id/pdf", async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id || !UUID.test(id)) {
    return res.status(400).json({ error: "invalid_id" });
  }
  const pool = getPool();
  const r = await pool.query<{ pdf_s3_key: string | null }>(
    `SELECT pdf_s3_key FROM reports WHERE id = $1`,
    [id],
  );
  if (r.rowCount === 0) {
    return res.status(404).json({ error: "not_found" });
  }
  const key = r.rows[0]?.pdf_s3_key;
  if (!key) {
    return res.status(404).json({ error: "pdf_not_generated", hint: "POST to this URL first" });
  }
  if (!isR2Configured()) {
    return res.status(503).json({ error: "r2_not_configured" });
  }
  const url = await getR2Url(key);
  return res.redirect(302, url);
});
