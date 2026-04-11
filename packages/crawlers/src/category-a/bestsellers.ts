/**
 * bestsellers crawler — children's "popular" titles from Open Library.
 *
 * Tech Spec §1.2.1 primary sources are Amazon BSR (US/UK/DE/JP) and Kyobo
 * rankings. Both require paid or aggressively rate-limited crawling that
 * isn't viable for MVP, so this module uses Open Library's subjects
 * endpoint as a pragmatic proxy:
 *
 *   https://openlibrary.org/subjects/children.json
 *   → works[] ordered by edition_count (a reasonable popularity proxy)
 *
 * Region is fixed to "global" and category to "juvenile" until a real
 * regional source lands. The schema tolerates multiple (region, category)
 * tuples per work so swapping in BSR US later is a non-breaking change.
 *
 * Pure module — no database access.
 */

export interface BestsellerRecord {
  sourceUid: string;
  region: string;
  category: string;
  rank: number;
  title: string;
  author: string | null;
  isbn: string | null;
  priceUsd: number | null;
  observedAt: string; // YYYY-MM-DD (UTC)
  payload: Record<string, unknown>;
}

interface OLWork {
  key: string;
  title: string;
  edition_count?: number;
  cover_id?: number;
  first_publish_year?: number;
  authors?: { key: string; name: string }[];
  subject?: string[];
  availability?: { isbn?: string };
}

interface OLSubjectResponse {
  name: string;
  work_count: number;
  works: OLWork[];
}

export interface FetchOptions {
  subject?: string;
  limit?: number;
  region?: string;
}

export async function fetchBestsellers(opts: FetchOptions = {}): Promise<BestsellerRecord[]> {
  const subject = opts.subject ?? "children";
  const limit = Math.min(opts.limit ?? 50, 100);
  const region = opts.region ?? "global";

  const url = `https://openlibrary.org/subjects/${subject}.json?limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      "user-agent": "eduright-ai/0.0.0 (+https://github.com/Raymond-Aidev/MKTG-Agent)",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`open library subjects responded HTTP ${res.status}`);
  }
  const body = (await res.json()) as OLSubjectResponse;
  if (!Array.isArray(body.works)) {
    throw new Error("open library subjects response missing works");
  }

  const observedAt = new Date().toISOString().slice(0, 10);

  return body.works
    .filter((w) => w.key && w.title)
    .map((w, idx) => ({
      sourceUid: `${region}/${subject}${w.key}`,
      region,
      category: subject,
      rank: idx + 1,
      title: w.title.slice(0, 500),
      author: w.authors?.[0]?.name ?? null,
      isbn: w.availability?.isbn ?? null,
      priceUsd: null,
      observedAt,
      payload: {
        workKey: w.key,
        editionCount: w.edition_count ?? null,
        firstPublishYear: w.first_publish_year ?? null,
        subjects: (w.subject ?? []).slice(0, 10),
      },
    }));
}
