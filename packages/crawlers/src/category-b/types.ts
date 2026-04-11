/**
 * Common contract for Category B (on-demand keyword) collectors.
 *
 * Every collector is a pure async function that accepts a keyword and
 * returns an array of RawPostDraft objects, which the pipeline
 * normalizes and inserts into the raw_posts table. Collectors must not
 * touch the database.
 */

export interface CollectArgs {
  keyword: string;
  /** Optional hint — collectors may ignore or narrow results by region. */
  regions?: string[];
  /** Soft cap. Collectors should respect this when they can. */
  limit?: number;
}

export interface RawPostDraft {
  /** One of: naver_news | naver_comment | youtube | dc | clien | fmkorea | hackernews */
  source: string;
  postId: string | null;
  author: string | null;
  content: string;
  likes?: number;
  dislikes?: number;
  commentsCnt?: number;
  viewCnt?: number;
  publishedAt?: string | null; // ISO-8601
  url?: string | null;
}

export interface Collector {
  /** Stable source id used by the pipeline and raw_posts.source column. */
  source: string;
  /** Human-friendly label for logs and dashboards. */
  label: string;
  collect(args: CollectArgs): Promise<RawPostDraft[]>;
}
