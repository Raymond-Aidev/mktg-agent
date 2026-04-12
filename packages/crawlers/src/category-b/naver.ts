/**
 * Naver Search API collectors — news, blog, cafe.
 *
 * Uses the Naver Open API (https://developers.naver.com/docs/serviceapi/search/news/news.md)
 * which is free with a 25,000 calls/day quota shared across all search types.
 *
 * Auth: X-Naver-Client-Id + X-Naver-Client-Secret headers.
 * Env vars: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET.
 *
 * Each search type (news, blog, cafearticle) is exported as a separate
 * Collector instance but they share the same HTTP client and rate limiter.
 *
 * Pure module — no database access.
 */

import type { CollectArgs, Collector, RawPostDraft } from "./types.ts";

const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

interface NaverSearchItem {
  title: string;
  link: string;
  description: string;
  bloggername?: string;
  bloggerlink?: string;
  cafename?: string;
  cafeurl?: string;
  pubDate?: string;
  postdate?: string;
}

interface NaverSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverSearchItem[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/?b>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

type SearchType = "news" | "blog" | "cafearticle";

async function naverSearch(
  type: SearchType,
  query: string,
  display: number,
): Promise<NaverSearchItem[]> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn(`[naver:${type}] NAVER_CLIENT_ID or NAVER_CLIENT_SECRET not set — skipping`);
    return [];
  }

  const url =
    `https://openapi.naver.com/v1/search/${type}.json?` +
    `query=${encodeURIComponent(query)}` +
    `&display=${Math.min(display, 100)}` +
    `&sort=date`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": CLIENT_ID,
      "X-Naver-Client-Secret": CLIENT_SECRET,
      accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`naver ${type} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as NaverSearchResponse;
  return Array.isArray(data.items) ? data.items : [];
}

function itemToDraft(source: string, item: NaverSearchItem, _keyword: string): RawPostDraft {
  const title = stripHtml(item.title);
  const desc = stripHtml(item.description);
  const author = item.bloggername ?? item.cafename ?? null;

  let publishedAt: string | null = null;
  if (item.pubDate) {
    try {
      publishedAt = new Date(item.pubDate).toISOString();
    } catch {
      // RFC 822 date parse fallback
    }
  } else if (item.postdate) {
    // postdate format: "20260413"
    const d = item.postdate;
    if (d.length === 8) {
      publishedAt = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T00:00:00Z`;
    }
  }

  return {
    source,
    postId: item.link,
    author,
    content: [title, desc].filter(Boolean).join("\n\n"),
    likes: 0,
    commentsCnt: 0,
    publishedAt,
    url: item.link,
  };
}

function makeNaverCollector(type: SearchType, sourceId: string, label: string): Collector {
  return {
    source: sourceId,
    label,
    async collect({ keyword, limit = 50 }: CollectArgs): Promise<RawPostDraft[]> {
      const items = await naverSearch(type, keyword, limit);
      return items.map((item) => itemToDraft(sourceId, item, keyword));
    },
  };
}

export const naverNewsCollector = makeNaverCollector("news", "naver_news", "네이버 뉴스");

export const naverBlogCollector = makeNaverCollector("blog", "naver_blog", "네이버 블로그");

export const naverCafeCollector = makeNaverCollector("cafearticle", "naver_cafe", "네이버 카페");
