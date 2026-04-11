/**
 * rights_deals crawler — Open Library API.
 *
 * Tech Spec §1.2.1 lists Nielsen BookData (paid) as the primary source and
 * Open Library (free, no key) as the MVP fallback. Open Library does not
 * publish actual rights-transaction data, so for MVP we treat each
 * recently-published edition that has a clear original/target language
 * pair as a "potential rights opportunity" record. The schema is identical
 * either way, and the Nielsen integration can land in Phase 2 follow-up
 * by replacing this fetcher only.
 *
 * Pure module — does not touch the database.
 */

export interface RightsDealRecord {
  /** Stable Open Library work key, e.g. "/works/OL12345W" — used as source_uid */
  sourceUid: string;
  title: string;
  isbn: string | null;
  author: string | null;
  /** ISO 639-1/2 — Open Library uses 3-letter codes (eng, kor, jpn, ...) */
  originalLang: string | null;
  targetLang: string | null;
  licensor: string | null;
  licensee: string | null;
  dealDate: string | null;
  territory: string | null;
  payload: Record<string, unknown>;
}

interface OLDoc {
  key: string;
  title: string;
  author_name?: string[];
  isbn?: string[];
  language?: string[];
  publisher?: string[];
  first_publish_year?: number;
  publish_year?: number[];
  publish_country?: string[];
}

interface OLResponse {
  numFound: number;
  docs: OLDoc[];
}

const SUBJECT = "juvenile_literature";
const FIELDS = [
  "key",
  "title",
  "author_name",
  "isbn",
  "language",
  "publisher",
  "first_publish_year",
  "publish_country",
].join(",");

export interface FetchOptions {
  /** Earliest first_publish_year to include. Defaults to last 2 years. */
  sinceYear?: number;
  /** How many records to fetch in one call (Open Library cap is 100). */
  limit?: number;
}

export async function fetchRightsDeals(opts: FetchOptions = {}): Promise<RightsDealRecord[]> {
  const limit = Math.min(opts.limit ?? 50, 100);
  const sinceYear = opts.sinceYear ?? new Date().getFullYear() - 2;

  const url =
    `https://openlibrary.org/search.json?` +
    `subject=${encodeURIComponent(SUBJECT)}` +
    `&publish_year=[${sinceYear} TO *]` +
    `&fields=${FIELDS}` +
    `&limit=${limit}` +
    `&sort=new`;

  const res = await fetch(url, {
    headers: {
      "user-agent": "eduright-ai/0.0.0 (+https://github.com/Raymond-Aidev/MKTG-Agent)",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`open library responded HTTP ${res.status}`);
  }
  const body = (await res.json()) as OLResponse;
  if (!Array.isArray(body.docs)) {
    throw new Error("open library response missing docs");
  }

  return body.docs
    .filter((d) => d.key && d.title)
    .map((d) => ({
      sourceUid: d.key,
      title: d.title.slice(0, 500),
      isbn: pickIsbn13(d.isbn),
      author: d.author_name?.[0] ?? null,
      originalLang: d.language?.[0] ?? null,
      targetLang: null,
      licensor: d.publisher?.[0] ?? null,
      licensee: null,
      dealDate: d.first_publish_year ? `${d.first_publish_year}-01-01` : null,
      territory: d.publish_country?.[0] ?? null,
      payload: {
        languages: d.language ?? [],
        publishers: d.publisher ?? [],
        publish_years: d.publish_year ?? [],
      },
    }));
}

function pickIsbn13(isbns: string[] | undefined): string | null {
  if (!isbns) return null;
  const thirteen = isbns.find((i) => i.replace(/-/g, "").length === 13);
  return thirteen ?? isbns[0] ?? null;
}
