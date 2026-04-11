/**
 * Lead score — Tech Spec §2.1.
 *
 * Pure function. The DB layer reads buyers + tenant content metadata,
 * builds a LeadScoreInput, and stores the resulting integer in
 * buyers.lead_score. The dashboard reads it back unchanged.
 */

export interface LeadScoreInput {
  /** Genres the buyer prefers — from buyers.genres */
  buyerGenres: string[];
  /** Genres the seller currently has in catalogue */
  sellerGenres: string[];
  /** Languages the buyer publishes in — from buyers.languages */
  buyerLanguages: string[];
  /** Languages the seller can supply (translations included) */
  sellerLanguages: string[];
  /** Year of the most recent confirmed deal with this buyer (or null) */
  lastDealYear: number | null;
  /** Number of contacts in the last 12 months */
  contactCount12m: number;
  /** Buyer's country (ISO-2 or ISO-3) — used to look up market size */
  country: string | null;
  /** Tenant-side market size index (0..1). Defaults to 0.2 if missing. */
  marketSizeIndex: Record<string, number>;
  /**
   * Latest email engagement signal:
   *   0    — never sent
   *   0.2  — sent, not opened
   *   0.5  — opened
   *   1.0  — clicked
   */
  emailEngagement: 0 | 0.2 | 0.5 | 1.0;
}

export interface LeadScoreBreakdown {
  total: number;
  components: {
    genreMatch: number;
    languageCoverage: number;
    dealRecency: number;
    contactFrequency: number;
    marketSize: number;
    engagement: number;
  };
}

function intersectionRatio(a: string[], b: string[]): number {
  if (a.length === 0) return 0;
  const setB = new Set(b.map((x) => x.toLowerCase()));
  let hit = 0;
  for (const item of a) if (setB.has(item.toLowerCase())) hit++;
  return hit / a.length;
}

function dealRecencyScore(lastDealYear: number | null): number {
  if (lastDealYear === null) return 0.1;
  const years = new Date().getFullYear() - lastDealYear;
  if (years <= 1) return 1.0;
  if (years <= 3) return 0.5;
  if (years <= 5) return 0.25;
  return 0.1;
}

function contactFrequencyScore(contacts: number): number {
  if (contacts === 0) return 0;
  if (contacts <= 2) return 0.4;
  if (contacts <= 5) return 0.7;
  return 1.0;
}

export function calcLeadScore(input: LeadScoreInput): LeadScoreBreakdown {
  const genreMatch = intersectionRatio(input.buyerGenres, input.sellerGenres);
  const languageCoverage = intersectionRatio(input.buyerLanguages, input.sellerLanguages);
  const dealRecency = dealRecencyScore(input.lastDealYear);
  const contactFrequency = contactFrequencyScore(input.contactCount12m);
  const marketSize: number = input.country ? (input.marketSizeIndex[input.country] ?? 0.2) : 0.2;
  const engagement = input.emailEngagement;

  const components = {
    genreMatch: genreMatch * 30,
    languageCoverage: languageCoverage * 20,
    dealRecency: dealRecency * 20,
    contactFrequency: contactFrequency * 15,
    marketSize: marketSize * 10,
    engagement: engagement * 5,
  };

  const total = Math.round(Object.values(components).reduce((sum, v) => sum + v, 0));

  return { total, components };
}
