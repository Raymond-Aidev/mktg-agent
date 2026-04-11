/**
 * competitors crawler — Open Library publisher search.
 *
 * Tech Spec §1.2.1 primary sources are Publishers Weekly, The Bookseller,
 * and CIP data — all require either paid API access or scraping article
 * content. For MVP we use Open Library's search endpoint filtered by
 * publisher name, which is free, no key, and surfaces each publisher's
 * recent catalogue + subject coverage.
 *
 * We track a fixed list of known children's / YA publishers. Adding a new
 * competitor is a one-line append to `PUBLISHERS` below.
 *
 * Pure module — no database access.
 */

export interface CompetitorRecord {
  sourceUid: string;
  name: string;
  country: string | null;
  website: string | null;
  primaryGenres: string[];
  recentTitles: RecentTitle[];
  notes: string | null;
}

export interface RecentTitle {
  title: string;
  author: string | null;
  publishYear: number | null;
  isbn: string | null;
}

interface OLDoc {
  title: string;
  author_name?: string[];
  isbn?: string[];
  subject?: string[];
  publish_place?: string[];
  first_publish_year?: number;
}

interface OLSearchResponse {
  numFound: number;
  docs: OLDoc[];
}

/** The competitor roster. `country` is a sticky hint; actual data wins. */
const PUBLISHERS: { name: string; country: string | null; website: string | null }[] = [
  { name: "Scholastic", country: "US", website: "https://www.scholastic.com" },
  {
    name: "HarperCollins Children's Books",
    country: "US",
    website: "https://www.harpercollinschildrens.com",
  },
  { name: "Penguin Random House", country: "US", website: "https://www.penguinrandomhouse.com" },
  {
    name: "Simon & Schuster Books for Young Readers",
    country: "US",
    website: "https://www.simonandschusterpublishing.com/simonandschuster-byr/",
  },
  { name: "Candlewick Press", country: "US", website: "https://www.candlewick.com" },
  { name: "Holiday House", country: "US", website: "https://holidayhouse.com" },
  { name: "Chronicle Books", country: "US", website: "https://www.chroniclebooks.com" },
  { name: "DK Children", country: "UK", website: "https://www.dk.com" },
  { name: "Usborne Publishing", country: "UK", website: "https://usborne.com" },
  {
    name: "Little, Brown Books for Young Readers",
    country: "US",
    website: "https://www.littlebrown.com",
  },
];

const FIELDS = [
  "title",
  "author_name",
  "isbn",
  "subject",
  "publish_place",
  "first_publish_year",
].join(",");

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickIsbn13(isbns: string[] | undefined): string | null {
  if (!isbns) return null;
  const thirteen = isbns.find((i) => i.replace(/-/g, "").length === 13);
  return thirteen ?? isbns[0] ?? null;
}

async function fetchPublisherDocs(name: string): Promise<OLDoc[]> {
  const url =
    `https://openlibrary.org/search.json?` +
    `publisher=${encodeURIComponent(`"${name}"`)}` +
    `&sort=new` +
    `&limit=15` +
    `&fields=${FIELDS}`;
  const res = await fetch(url, {
    headers: {
      "user-agent": "eduright-ai/0.0.0 (+https://github.com/Raymond-Aidev/MKTG-Agent)",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return [];
  const body = (await res.json()) as OLSearchResponse;
  return Array.isArray(body.docs) ? body.docs : [];
}

function topGenres(docs: OLDoc[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const d of docs) {
    for (const s of d.subject ?? []) {
      // Keep only short, human-facing subjects. Open Library has a huge
      // long tail of machine-generated tags we do not want here.
      if (s.length > 40) continue;
      if (/^[0-9]/.test(s)) continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([s]) => s);
}

export async function fetchCompetitors(): Promise<CompetitorRecord[]> {
  const out: CompetitorRecord[] = [];
  for (const pub of PUBLISHERS) {
    const docs = await fetchPublisherDocs(pub.name);
    if (docs.length === 0) {
      // Still record the competitor with empty titles so the schema row
      // exists and the operator sees the gap in bull-board.
      out.push({
        sourceUid: `openlibrary/publisher/${slugify(pub.name)}`,
        name: pub.name,
        country: pub.country,
        website: pub.website,
        primaryGenres: [],
        recentTitles: [],
        notes: "no open library results",
      });
      continue;
    }

    const recentTitles: RecentTitle[] = docs
      .slice(0, 10)
      .filter((d) => d.title)
      .map((d) => ({
        title: d.title.slice(0, 300),
        author: d.author_name?.[0] ?? null,
        publishYear: d.first_publish_year ?? null,
        isbn: pickIsbn13(d.isbn),
      }));

    const observedCountry = docs.find((d) => d.publish_place?.[0])?.publish_place?.[0] ?? null;

    out.push({
      sourceUid: `openlibrary/publisher/${slugify(pub.name)}`,
      name: pub.name,
      country: pub.country ?? observedCountry,
      website: pub.website,
      primaryGenres: topGenres(docs, 8),
      recentTitles,
      notes: null,
    });
  }
  return out;
}
