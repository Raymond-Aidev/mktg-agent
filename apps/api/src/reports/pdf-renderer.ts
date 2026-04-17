import type { Browser, Page } from "puppeteer";
import { env } from "../infra/env.ts";

/**
 * PDF renderer — Puppeteer (headless Chromium).
 *
 * Strategy: we do NOT re-render the report here. Instead we load the
 * existing /api/v1/reports/:id?format=html endpoint over the internal
 * loopback and print it to PDF. This keeps the HTML/CSS source of truth
 * in one place (render-html.ts + React ProductReportView output already
 * match visually).
 *
 * Lazy import — puppeteer is loaded only on first call so the boot path
 * is unaffected when R2/PDF are not configured. If the module cannot be
 * resolved, we throw a clear error telling the operator how to install.
 */

let browserPromise: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  if (browserPromise) return browserPromise;
  browserPromise = (async () => {
    try {
      const mod = await import("puppeteer");
      return mod.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });
    } catch (err) {
      browserPromise = null;
      throw new Error(
        `Puppeteer unavailable: ${(err as Error).message}. ` +
          `Install with 'pnpm add puppeteer' in apps/api and ensure the Chromium ` +
          `download step succeeded during deploy.`,
      );
    }
  })();
  return browserPromise;
}

export interface PdfRenderOptions {
  /** Absolute report id; used for the PDF filename. */
  reportId: string;
  /** Optional title used as the pdf metadata (falls back to "GoldenCheck Report"). */
  title?: string;
}

/**
 * Render a report to a PDF Buffer by visiting the server-rendered HTML
 * endpoint from the API's own loopback.
 */
export async function renderReportPdf(opts: PdfRenderOptions): Promise<Buffer> {
  const base = env.INTERNAL_API_URL ?? `http://127.0.0.1:${env.PORT}`;
  const url = `${base}/api/v1/reports/${opts.reportId}?format=html`;

  const browser = await launchBrowser();
  const page: Page = await browser.newPage();
  try {
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    const res = await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });
    if (!res || !res.ok()) {
      throw new Error(`PDF fetch failed: HTTP ${res?.status() ?? "unknown"}`);
    }
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "14mm", right: "14mm" },
      displayHeaderFooter: false,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
  }
}

export async function shutdownPdfRenderer(): Promise<void> {
  if (!browserPromise) return;
  try {
    const b = await browserPromise;
    await b.close();
  } catch {
    // ignore
  } finally {
    browserPromise = null;
  }
}
