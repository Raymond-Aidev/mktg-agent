/**
 * Server-side HTML renderer for SignalCraft integrated reports.
 *
 * Phase 5 W16 deliberately keeps this in plain template literals (no
 * React, no JSX) so the API service stays a single Node process. The
 * Phase 6 React dashboard will reuse the same data shape via the JSON
 * endpoint; the Phase 5 W17 Puppeteer PDF generator will pipe the
 * output of this function through Chrome.
 */

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  sourceModule?: string;
}

export interface ReportRow {
  id: string;
  tenant_id: string;
  job_id: string | null;
  kind: string;
  title: string;
  sections: ReportSection[];
  metadata: Record<string, unknown>;
  created_at: Date;
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function renderReportHtml(report: ReportRow): string {
  const meta = report.metadata ?? {};
  const keyword = String((meta as { keyword?: string }).keyword ?? "");
  const generatedAt =
    String((meta as { generatedAt?: string }).generatedAt ?? "") || report.created_at.toISOString();
  const modulesUsed = ((meta as { modulesUsed?: string[] }).modulesUsed ?? []).join(", ");
  const confidence = String((meta as { confidence?: string }).confidence ?? "");
  const disclaimer = (meta as { disclaimer?: string }).disclaimer ?? "";

  const sections = (report.sections ?? [])
    .map(
      (s) => `
        <section class="card">
          <header>
            <h2>${escapeHtml(s.title)}</h2>
            ${s.sourceModule ? `<span class="badge">${escapeHtml(s.sourceModule)}</span>` : ""}
          </header>
          <p>${escapeHtml(s.content).replace(/\n/g, "<br>")}</p>
        </section>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(report.title)} — GoldenCheck</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Pretendard",
                   "Helvetica Neue", Arial, sans-serif;
      background: #f7f7f8;
      color: #18181b;
      line-height: 1.55;
    }
    main { max-width: 880px; margin: 0 auto; padding: 32px 24px 64px; }
    .header { margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.25; }
    .meta {
      display: flex; flex-wrap: wrap; gap: 12px;
      font-size: 13px; color: #52525b;
    }
    .meta span { background: #fff; border: 1px solid #e4e4e7; border-radius: 6px; padding: 4px 10px; }
    .card {
      background: #fff;
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 16px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .card header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; }
    .card header h2 { margin: 0; font-size: 17px; }
    .badge {
      display: inline-block;
      background: #18181b;
      color: #fff;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      letter-spacing: 0.02em;
    }
    .card p { margin: 0; color: #27272a; white-space: pre-wrap; }
    .disclaimer {
      margin-top: 32px;
      padding: 12px 16px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      color: #9a3412;
      border-radius: 8px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <main>
    <div class="header">
      <h1>${escapeHtml(report.title)}</h1>
      <div class="meta">
        ${keyword ? `<span>키워드: ${escapeHtml(keyword)}</span>` : ""}
        ${generatedAt ? `<span>생성: ${escapeHtml(generatedAt)}</span>` : ""}
        ${modulesUsed ? `<span>모듈: ${escapeHtml(modulesUsed)}</span>` : ""}
        ${confidence ? `<span>신뢰도: ${escapeHtml(confidence)}</span>` : ""}
      </div>
    </div>
    ${sections}
    ${disclaimer ? `<div class="disclaimer">${escapeHtml(String(disclaimer))}</div>` : ""}
  </main>
</body>
</html>`;
}
