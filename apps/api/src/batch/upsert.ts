import type { Pool } from "pg";
import { computeFingerprint } from "./fingerprint.ts";

/**
 * Generic Category A master upsert that cooperates with the
 * master_row_update trigger from migration 0007.
 *
 * Behavior:
 *   1. Compute the fingerprint over `coreFields` (the fields that define
 *      semantic identity). Order is normalized inside computeFingerprint.
 *   2. Build an INSERT ... ON CONFLICT (source_uid) DO UPDATE statement.
 *   3. The trigger then decides whether the UPDATE branch is a real change
 *      or a no-op:
 *        - same fingerprint  → trigger preserves the row, bumps last_seen_at
 *        - new fingerprint   → trigger records a change_log diff, bumps
 *                              updated_at
 *
 * Caller must allowlist `table` and `coreColumns` — they are interpolated
 * into SQL identifiers without parameterization.
 *
 * Returns the action that PostgreSQL ultimately took (insert vs no-op
 * update vs real update) so callers can produce accurate counters.
 */

export interface UpsertResult {
  action: "inserted" | "noop" | "updated";
  fingerprint: string;
}

const ID_RE = /^[a-z][a-z0-9_]*$/;

function assertIdent(name: string): void {
  if (!ID_RE.test(name)) {
    throw new Error(`upsertCategoryA: unsafe identifier "${name}"`);
  }
}

export async function upsertCategoryA(
  pool: Pool,
  options: {
    table: string;
    sourceUid: string;
    coreColumns: string[];
    values: Record<string, unknown>;
  },
): Promise<UpsertResult> {
  const { table, sourceUid, coreColumns, values } = options;
  assertIdent(table);
  coreColumns.forEach(assertIdent);

  const coreFields: Record<string, unknown> = {};
  for (const c of coreColumns) coreFields[c] = values[c] ?? null;
  const fingerprint = computeFingerprint(coreFields);

  // Snapshot the row's update markers BEFORE the upsert so we can detect
  // which branch the trigger took. The trigger keeps OLD on no-op updates,
  // so updated_at stays the same. On a real update, updated_at advances.
  const before = await pool.query<{
    fingerprint: string | null;
    updated_at: Date;
  }>(`SELECT fingerprint, updated_at FROM ${table} WHERE source_uid = $1`, [sourceUid]);
  const existed = before.rowCount && before.rowCount > 0 ? before.rows[0] : null;

  const allColumns = ["source_uid", ...coreColumns, "fingerprint"];
  const placeholders = allColumns.map((_, i) => `$${i + 1}`);
  const updateSet = [...coreColumns, "fingerprint"].map((c) => `${c} = EXCLUDED.${c}`).join(", ");
  const params: unknown[] = [sourceUid, ...coreColumns.map((c) => values[c] ?? null), fingerprint];

  await pool.query(
    `INSERT INTO ${table} (${allColumns.join(", ")})
     VALUES (${placeholders.join(", ")})
     ON CONFLICT (source_uid) DO UPDATE SET ${updateSet}`,
    params,
  );

  if (!existed) return { action: "inserted", fingerprint };
  if (existed.fingerprint === fingerprint) {
    return { action: "noop", fingerprint };
  }
  return { action: "updated", fingerprint };
}
