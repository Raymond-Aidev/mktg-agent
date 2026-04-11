import { createHash } from "node:crypto";

/**
 * Compute the fingerprint hash for a Category A master row.
 *
 * The fingerprint is the sha256 of the JSON-stringified subset of fields
 * that define semantic identity. Crawlers pass the fields they consider
 * "the data" — the trigger then uses this value to decide whether an
 * UPDATE represents a real change.
 *
 * Field order is normalized via key sorting so two callers cannot disagree
 * on the bytes for the same logical row.
 */
export function computeFingerprint(fields: Record<string, unknown>): string {
  const normalized = Object.keys(fields)
    .filter((k) => fields[k] !== undefined)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = fields[k];
      return acc;
    }, {});
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
