/**
 * YouTube Data API v3 collector.
 *
 * Env: YOUTUBE_API_KEY (Google Cloud Console → APIs & Services → Credentials).
 * Quota: 10,000 units/day (default). Our per-call budget:
 *   - search.list ........... 100 units (1 call per keyword)
 *   - commentThreads.list ... 1 unit  (up to 3 calls, top-ranked videos only)
 *   → 103 units per SignalCraft job, ~97 jobs/day headroom.
 *
 * Tech Spec §1.3.3: "YouTube Data API v3 (공식), 일 할당량 10,000 units,
 *                     영상당 100 units, 할당량 초과 시 큐 대기".
 *
 * Pure module — no database access. Self-skips when env var missing.
 */

import type { CollectArgs, Collector, RawPostDraft } from "./types.ts";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const API_KEY = process.env.YOUTUBE_API_KEY;

interface YtSearchItem {
  id: { videoId?: string };
  snippet: {
    publishedAt: string;
    channelTitle: string;
    title: string;
    description: string;
  };
}

interface YtSearchResponse {
  items?: YtSearchItem[];
}

interface YtCommentItem {
  snippet: {
    topLevelComment: {
      snippet: {
        authorDisplayName: string;
        textDisplay: string;
        likeCount: number;
        publishedAt: string;
      };
    };
    totalReplyCount: number;
  };
}

interface YtCommentThreadResponse {
  items?: YtCommentItem[];
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function searchVideos(keyword: string, limit: number): Promise<YtSearchItem[]> {
  const url =
    `${API_BASE}/search?part=snippet&type=video&maxResults=${Math.min(limit, 50)}` +
    `&relevanceLanguage=ko&regionCode=KR` +
    `&q=${encodeURIComponent(keyword)}&key=${API_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new Error(`youtube search HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as YtSearchResponse;
  return Array.isArray(data.items) ? data.items : [];
}

async function fetchTopComments(videoId: string, limit = 10): Promise<YtCommentItem[]> {
  const url =
    `${API_BASE}/commentThreads?part=snippet&order=relevance` +
    `&maxResults=${Math.min(limit, 100)}&videoId=${videoId}&key=${API_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    // 403 = comments disabled; log once and move on
    if (res.status === 403) return [];
    throw new Error(`youtube comments HTTP ${res.status}`);
  }
  const data = (await res.json()) as YtCommentThreadResponse;
  return Array.isArray(data.items) ? data.items : [];
}

export const youtubeCollector: Collector = {
  source: "youtube",
  label: "YouTube (Data API v3)",
  async collect({ keyword, limit = 30 }: CollectArgs): Promise<RawPostDraft[]> {
    if (!API_KEY) {
      console.warn("[youtube] YOUTUBE_API_KEY not set — skipping");
      return [];
    }

    const videos = await searchVideos(keyword, limit);
    const drafts: RawPostDraft[] = [];

    for (const v of videos) {
      const vid = v.id.videoId;
      if (!vid) continue;
      const snip = v.snippet;
      drafts.push({
        source: "youtube",
        postId: vid,
        author: snip.channelTitle,
        content: [stripHtml(snip.title), stripHtml(snip.description)].filter(Boolean).join("\n\n"),
        likes: 0,
        commentsCnt: 0,
        publishedAt: snip.publishedAt,
        url: `https://www.youtube.com/watch?v=${vid}`,
      });
    }

    // Top 3 videos get their top comments collected (≤3 × 10 = 30 comments max).
    const topVideoIds = drafts
      .slice(0, 3)
      .map((d) => d.postId)
      .filter(Boolean) as string[];
    for (const vid of topVideoIds) {
      try {
        const comments = await fetchTopComments(vid, 10);
        for (const c of comments) {
          const cs = c.snippet.topLevelComment.snippet;
          drafts.push({
            source: "youtube",
            postId: `${vid}:${cs.authorDisplayName.slice(0, 30)}:${cs.publishedAt}`,
            author: cs.authorDisplayName,
            content: stripHtml(cs.textDisplay),
            likes: cs.likeCount ?? 0,
            commentsCnt: c.snippet.totalReplyCount ?? 0,
            publishedAt: cs.publishedAt,
            url: `https://www.youtube.com/watch?v=${vid}`,
          });
        }
      } catch (err) {
        console.warn(`[youtube] comments for ${vid} failed: ${(err as Error).message}`);
      }
    }

    return drafts;
  },
};
