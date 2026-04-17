/**
 * FM코리아 collector (fmkorea.com 통합검색 Cheerio 파싱).
 *
 * Tech Spec §1.3.3: "클리앙·FM코리아 — Cheerio 정적 파서 (서버 렌더링),
 *                     초당 최대 2 요청, 제목·본문·추천·댓글·조회수".
 *
 * 검색 URL: https://www.fmkorea.com/search.php?mid=best&act=IS&is_keyword=<q>
 * 결과 리스트: `ul.searchResult > li` 혹은 `.searchResultList .li`
 *
 * Pure module — no database access. Self-skips gracefully on HTTP error.
 */

import * as cheerio from "cheerio";
import type { CollectArgs, Collector, RawPostDraft } from "./types.ts";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 goldencheck-bot/0.1";

function parseNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const m = raw.replace(/[^0-9]/g, "");
  return m ? Number(m) : 0;
}

export const fmKoreaCollector: Collector = {
  source: "fmkorea",
  label: "FM코리아 (통합검색)",

  async collect({ keyword, limit = 30 }: CollectArgs): Promise<RawPostDraft[]> {
    // FM코리아 통합검색: act=IS 는 "Integrated Search" 엔드포인트
    const url = `https://www.fmkorea.com/search.php?act=IS&is_keyword=${encodeURIComponent(keyword)}&sort=regdate`;
    let html: string;
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        console.warn(`[fmkorea] search HTTP ${res.status} — skipping`);
        return [];
      }
      html = await res.text();
    } catch (err) {
      console.warn(`[fmkorea] fetch failed: ${(err as Error).message}`);
      return [];
    }

    const $ = cheerio.load(html);
    const drafts: RawPostDraft[] = [];

    // FM의 검색결과 아이템은 `.searchResult li` 또는 `.bd_lst li`
    const selectors = [
      ".searchResult > li",
      ".searchResultList li",
      ".bd_lst li",
      "article.fm_best_widget li",
    ];
    const collected = $(selectors.join(","));

    collected.each((_, el) => {
      if (drafts.length >= limit) return;
      const $el = $(el);
      const title =
        $el.find(".hotdeal_var8, .title, a.hx, a.bd_title").first().text().trim() ||
        $el.find("a").first().text().trim();
      const href = $el.find("a").first().attr("href");
      const absoluteHref = href?.startsWith("http")
        ? href
        : href
          ? `https://www.fmkorea.com${href.startsWith("/") ? "" : "/"}${href}`
          : null;
      const author = $el.find(".author, .nickname, .member").first().text().trim() || null;
      const dateText = $el.find(".time, .regdate, .date").first().text().trim();
      const viewCnt = parseNumber($el.find(".m_no_hits, .hit, .view").first().text());
      const likes = parseNumber($el.find(".m_no_voted, .vote_vertical_layer .vote").first().text());
      const commentsCnt = parseNumber($el.find(".comment_count, .reply, .comment").first().text());

      if (!title || title.length < 2) return;

      let publishedAt: string | null = null;
      // FM 날짜: "2026.04.17 10:23" or "2026-04-17"
      const m = dateText.match(/(\d{4})[.-](\d{2})[.-](\d{2})(?:\s+(\d{2}):(\d{2}))?/);
      if (m) {
        const hh = m[4] ?? "00";
        const mm = m[5] ?? "00";
        publishedAt = `${m[1]}-${m[2]}-${m[3]}T${hh}:${mm}:00Z`;
      }

      drafts.push({
        source: "fmkorea",
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
        "[fmkorea] parsed 0 items — HTML structure may have changed (see dlq-playbook §2.2)",
      );
    }

    return drafts;
  },
};
