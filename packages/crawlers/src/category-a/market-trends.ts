/**
 * market_trends crawler — Wikipedia Pageviews API.
 *
 * Tech Spec §1.2.1 lists Google Trends (pytrends), Statista RSS, and
 * IBISWorld as the primary sources. pytrends is Python-only and Google has
 * been hostile to scraping; Statista RSS is paywalled; IBISWorld is paid.
 *
 * Wikipedia Pageviews is free, no key, and gives daily article view counts
 * — a defensible proxy for public interest in a topic. We track a fixed
 * list of articles relevant to the children's-book / educational publishing
 * market and compute a 7-day rolling average as the trend score.
 *
 * Pure module — no database access.
 *
 * Docs: https://wikimedia.org/api/rest_v1/#/Pageviews%20data
 */

export interface MarketTrendRecord {
  sourceUid: string;
  topic: string;
  region: string;
  score: number;
  source: string;
  observedAt: string; // YYYY-MM-DD
  payload: Record<string, unknown>;
}

interface PageviewItem {
  project: string;
  article: string;
  timestamp: string; // YYYYMMDDHH
  views: number;
}

interface PageviewResponse {
  items: PageviewItem[];
}

/** Articles tracked. Add or remove freely — source_uid is per article. */
const ARTICLES: { article: string; topic: string }[] = [
  { article: "Children's_literature", topic: "Children's literature" },
  { article: "Picture_book", topic: "Picture book" },
  { article: "Young_adult_fiction", topic: "Young adult fiction" },
  { article: "Graphic_novel", topic: "Graphic novel" },
  { article: "Manga", topic: "Manga" },
];

const PROJECT = "en.wikipedia";

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function fetchPageviewsForArticle(article: string): Promise<PageviewItem[]> {
  // Wikimedia returns at most 60 days per call. We ask for the last 14 days.
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1); // exclude today (incomplete)
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 13); // 14 days inclusive

  const url =
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/` +
    `${PROJECT}/all-access/all-agents/${encodeURIComponent(article)}/daily/` +
    `${formatDate(start)}/${formatDate(end)}`;

  const res = await fetch(url, {
    headers: {
      "user-agent": "eduright-ai/0.0.0 (+https://github.com/Raymond-Aidev/MKTG-Agent)",
      accept: "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    if (res.status === 404) return []; // No data for this article — skip
    throw new Error(`wikimedia pageviews HTTP ${res.status} for article=${article}`);
  }
  const body = (await res.json()) as PageviewResponse;
  return Array.isArray(body.items) ? body.items : [];
}

export async function fetchMarketTrends(): Promise<MarketTrendRecord[]> {
  const observedAt = new Date().toISOString().slice(0, 10);
  const out: MarketTrendRecord[] = [];

  for (const { article, topic } of ARTICLES) {
    const items = await fetchPageviewsForArticle(article);
    if (items.length === 0) continue;

    const dailyViews = items.map((i) => i.views);
    const last7 = dailyViews.slice(-7);
    const avg7d = last7.length > 0 ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
    const total14d = dailyViews.reduce((a, b) => a + b, 0);

    out.push({
      sourceUid: `wikipedia/en/${article}`,
      topic,
      region: "global",
      score: Math.round(avg7d * 100) / 100,
      source: "wikipedia-pageviews",
      observedAt,
      payload: {
        article,
        project: PROJECT,
        avg7d: Math.round(avg7d),
        total14d,
        dailyViews,
        windowStart: items[0]?.timestamp,
        windowEnd: items[items.length - 1]?.timestamp,
      },
    });
  }

  return out;
}
