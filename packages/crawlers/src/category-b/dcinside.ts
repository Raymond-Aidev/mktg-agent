/**
 * DCInside collector (통합검색 HTML 파싱).
 *
 * Tech Spec §1.3.3: "DC인사이드 — Playwright 크롤링, 갤러리 목록 파싱,
 *                     페이지당 2초 딜레이, 로그인 필요 게시물 스킵".
 *
 * Phase 3 MVP는 Playwright 대신 `search.dcinside.com/post`의 서버 렌더된
 * HTML을 cheerio로 파싱한다. HTML 구조 변경에 취약하므로, 파서 실패 시
 * 빈 배열을 반환하고 로그로 신호를 남겨 상위 레이어에서 Slack 알림으로
 * 대응한다 (docs/dlq-playbook.md §2.2).
 *
 * 로그인 필요 게시물은 검색 결과에 노출되지 않으므로 자동 스킵된다.
 * Rate limit: 페이지당 2초 딜레이 준수 (현재는 단일 페이지만 수집).
 *
 * Pure module — no database access.
 */

import * as cheerio from "cheerio";
import type { CollectArgs, Collector, RawPostDraft } from "./types.ts";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 goldencheck-bot/0.1";

function parseNumberKo(raw: string | undefined): number {
  if (!raw) return 0;
  const m = raw.replace(/[^0-9]/g, "");
  return m ? Number(m) : 0;
}

export const dcInsideCollector: Collector = {
  source: "dc",
  label: "DC인사이드 (통합검색)",

  async collect({ keyword, limit = 30 }: CollectArgs): Promise<RawPostDraft[]> {
    const url = `https://search.dcinside.com/post/q/${encodeURIComponent(keyword)}`;
    let html: string;
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        console.warn(`[dc] search HTTP ${res.status} — skipping`);
        return [];
      }
      html = await res.text();
    } catch (err) {
      console.warn(`[dc] fetch failed: ${(err as Error).message}`);
      return [];
    }

    const $ = cheerio.load(html);
    const drafts: RawPostDraft[] = [];

    // 통합검색 결과 리스트: `.sch_result_list .sch_result_list > li`
    // 각 항목은 제목/갤러리/작성자/작성시간/조회/추천/댓글 노출.
    $(".sch_result_list li").each((_, el) => {
      if (drafts.length >= limit) return;
      const $el = $(el);
      const title = $el.find(".tit_txt, a.tit_txt").first().text().trim();
      const href = $el.find("a.tit_txt, a[href*='gallog'], a").first().attr("href") ?? null;
      const body = $el.find(".link_dsc_txt").first().text().trim();
      const author = $el.find(".sub_txt .nick, .writer").first().text().trim() || null;
      const dateText = $el.find(".date_time, .time").first().text().trim();
      const counts = $el
        .find(".num")
        .map((_i, n) => $(n).text().trim())
        .get();
      const viewCnt = parseNumberKo(counts[0]);
      const likes = parseNumberKo(counts[1]);
      const commentsCnt = parseNumberKo(counts[2]);

      if (!title) return;

      let publishedAt: string | null = null;
      // DC 날짜 포맷: "2026.04.17 16:23" 또는 "04.17"
      const m = dateText.match(/(\d{4})[.-](\d{2})[.-](\d{2})/);
      if (m) publishedAt = `${m[1]}-${m[2]}-${m[3]}T00:00:00Z`;

      drafts.push({
        source: "dc",
        postId: href ? (href.split("?")[1] ?? href) : null,
        author,
        content: [title, body].filter(Boolean).join("\n\n"),
        likes,
        commentsCnt,
        viewCnt,
        publishedAt,
        url: href,
      });
    });

    if (drafts.length === 0) {
      console.warn("[dc] parsed 0 items — HTML structure may have changed (see dlq-playbook §2.2)");
    }

    return drafts;
  },
};
