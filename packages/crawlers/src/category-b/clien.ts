/**
 * Clien collector (clien.net 검색 결과 Cheerio 파싱).
 *
 * Tech Spec §1.3.3: "클리앙·FM코리아 — Cheerio 정적 파서 (서버 렌더링),
 *                     초당 최대 2 요청, 제목·본문·추천·댓글·조회수".
 *
 * 검색 URL: https://www.clien.net/service/search?q=<q>&sort=recency
 * 결과 리스트: `.contents_jirum .list_item`
 *
 * Pure module — no database access. Self-skips gracefully on HTTP error.
 */

import * as cheerio from "cheerio";
import type { CollectArgs, Collector, RawPostDraft } from "./types.ts";

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 goldencheck-bot/0.1";

function parseNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const m = raw.replace(/[^0-9]/g, "");
  return m ? Number(m) : 0;
}

export const clienCollector: Collector = {
  source: "clien",
  label: "Clien (검색)",

  async collect({ keyword, limit = 30 }: CollectArgs): Promise<RawPostDraft[]> {
    const url = `https://www.clien.net/service/search?q=${encodeURIComponent(keyword)}&sort=recency`;
    let html: string;
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        console.warn(`[clien] search HTTP ${res.status} — skipping`);
        return [];
      }
      html = await res.text();
    } catch (err) {
      console.warn(`[clien] fetch failed: ${(err as Error).message}`);
      return [];
    }

    const $ = cheerio.load(html);
    const drafts: RawPostDraft[] = [];

    // Clien 검색결과 아이템은 `.list_item .list_title` 등으로 구성
    $(".list_item").each((_, el) => {
      if (drafts.length >= limit) return;
      const $el = $(el);
      const title = $el
        .find(".list_subject .subject_fixed, .list_title, a.list_subject")
        .first()
        .text()
        .trim();
      const href = $el.find("a.list_subject, a[href*='/service/board']").first().attr("href");
      const absoluteHref = href?.startsWith("http")
        ? href
        : href
          ? `https://www.clien.net${href}`
          : null;
      const author = $el.find(".nickname, .list_author").first().text().trim() || null;
      const dateText =
        $el.find(".timestamp, .list_time").first().attr("title") ??
        $el.find(".timestamp, .list_time").first().text().trim();
      const symNums = $el
        .find(".list_symph, .list_hit, .list_reply, .rSymph05, .hit, .reply_count")
        .map((_i, n) => $(n).text().trim())
        .get();
      // Best-effort mapping: 추천 / 조회 / 댓글 순으로 흔히 노출
      const likes = parseNumber(symNums[0]);
      const viewCnt = parseNumber(symNums[1]);
      const commentsCnt = parseNumber(symNums[2]);

      if (!title) return;

      let publishedAt: string | null = null;
      // Clien: "2026-04-17 10:23:11" 또는 상대시간 ("1시간 전")
      const m = dateText?.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
      if (m) publishedAt = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00Z`;

      drafts.push({
        source: "clien",
        postId: absoluteHref ?? null,
        author,
        content: title,
        likes,
        viewCnt,
        commentsCnt,
        publishedAt,
        url: absoluteHref,
      });
    });

    if (drafts.length === 0) {
      console.warn(
        "[clien] parsed 0 items — HTML structure may have changed (see dlq-playbook §2.2)",
      );
    }

    return drafts;
  },
};
