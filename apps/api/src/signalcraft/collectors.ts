import type { Collector } from "@eduright/crawlers/category-b/types";
import { hackerNewsCollector } from "@eduright/crawlers/category-b/hackernews";
import {
  naverNewsCollector,
  naverBlogCollector,
  naverCafeCollector,
} from "@eduright/crawlers/category-b/naver";

/**
 * Active Category B collector roster (v2.0).
 *
 * Korean sources run first (P0), then English (P2).
 * Each collector self-skips when its env vars are missing, so the
 * pipeline always completes even if only a subset is configured.
 */
export const COLLECTORS: Collector[] = [
  naverNewsCollector,
  naverBlogCollector,
  naverCafeCollector,
  hackerNewsCollector,
];
