/**
 * Hacker News collector via the Algolia search API.
 *
 * This is a pragmatic MVP source for the SignalCraft pipeline while the
 * five Korean sources defined in Tech Spec §1.3.3 (naver_news,
 * naver_comment, youtube, dc, clien/fmkorea) are still being built out.
 * HN Algolia is free, no API key, very tolerant of traffic, and returns
 * a well-typed JSON payload that maps cleanly onto RawPostDraft.
 *
 * Docs: https://hn.algolia.com/api
 *
 * Pure module — no database access.
 */

import type { CollectArgs, Collector, RawPostDraft } from "./types.ts";

interface AlgoliaHit {
  objectID: string;
  title?: string;
  story_text?: string | null;
  url?: string | null;
  author?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
}

export const hackerNewsCollector: Collector = {
  source: "hackernews",
  label: "Hacker News (Algolia)",

  async collect({ keyword, limit = 50 }: CollectArgs): Promise<RawPostDraft[]> {
    const url =
      `https://hn.algolia.com/api/v1/search?` +
      `query=${encodeURIComponent(keyword)}` +
      `&tags=story` +
      `&hitsPerPage=${Math.min(limit, 100)}`;

    const res = await fetch(url, {
      headers: {
        "user-agent": "eduright-ai/0.0.0 (+https://github.com/Raymond-Aidev/MKTG-Agent)",
        accept: "application/json",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      throw new Error(`hn algolia HTTP ${res.status}`);
    }
    const body = (await res.json()) as AlgoliaResponse;
    if (!Array.isArray(body.hits)) return [];

    return body.hits
      .filter((h) => h.title && h.objectID)
      .map((h) => ({
        source: "hackernews",
        postId: h.objectID,
        author: h.author ?? null,
        content: [h.title, h.story_text].filter(Boolean).join("\n\n"),
        likes: h.points ?? 0,
        commentsCnt: h.num_comments ?? 0,
        publishedAt: h.created_at ?? null,
        url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      }));
  },
};
