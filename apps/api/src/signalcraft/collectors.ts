import type { Collector } from "@eduright/crawlers/category-b/types";
import { hackerNewsCollector } from "@eduright/crawlers/category-b/hackernews";
import {
  naverNewsCollector,
  naverBlogCollector,
  naverCafeCollector,
} from "@eduright/crawlers/category-b/naver";
import { youtubeCollector } from "@eduright/crawlers/category-b/youtube";
import { dcInsideCollector } from "@eduright/crawlers/category-b/dcinside";
import { clienCollector } from "@eduright/crawlers/category-b/clien";
import { fmKoreaCollector } from "@eduright/crawlers/category-b/fmkorea";

/**
 * Active Category B collector roster (Phase 3 complete).
 *
 * Korean sources run first (P0), then English (P2).
 * Each collector self-skips when its env vars are missing or when HTML
 * structure changes (HTML scrapers log a warning and return []), so the
 * pipeline always completes even if only a subset is configured.
 *
 * Env vars:
 *   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET — Naver Open API
 *   YOUTUBE_API_KEY                      — YouTube Data API v3
 *   (DC/Clien/FM은 공개 HTML이라 env 불필요 — User-Agent만 설정)
 */
export const COLLECTORS: Collector[] = [
  naverNewsCollector,
  naverBlogCollector,
  naverCafeCollector,
  youtubeCollector,
  dcInsideCollector,
  clienCollector,
  fmKoreaCollector,
  hackerNewsCollector,
];
