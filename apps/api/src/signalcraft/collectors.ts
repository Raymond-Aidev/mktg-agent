import type { Collector } from "@eduright/crawlers/category-b/types";
import { hackerNewsCollector } from "@eduright/crawlers/category-b/hackernews";

/**
 * Active Category B collector roster.
 *
 * Only one real source for now (Hacker News). The Korean sources from
 * Tech Spec §1.3.3 (naver_news, naver_comment, youtube, dc, clien,
 * fmkorea) slot in here as they are built out in Phase 3 follow-ups.
 */
export const COLLECTORS: Collector[] = [hackerNewsCollector];
