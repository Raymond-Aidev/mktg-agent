/**
 * Minimal SQL migration runner.
 *
 * Scans `db/migrations/NNNN_*.sql`, applies pending migrations in order inside
 * a single transaction, and records each applied file in `schema_migrations`
 * with a sha256 checksum to detect drift.
 *
 * Usage:
 *   DATABASE_URL=... pnpm --filter @eduright/api db:migrate
 *   railway run pnpm --filter @eduright/api db:migrate
 *
 * Files named `*.rollback.sql` are ignored by the forward runner.
 */
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is required");
  process.exit(1);
}

const repoRoot = resolve(fileURLToPath(import.meta.url), "../../../../..");
const migrationsDir = join(repoRoot, "db", "migrations");

type MigrationFile = { name: string; sql: string; checksum: string };

async function loadMigrations(): Promise<MigrationFile[]> {
  const entries = await readdir(migrationsDir);
  const files = entries
    .filter((f) => /^\d{4}_.+\.sql$/.test(f) && !f.endsWith(".rollback.sql"))
    .sort();
  return Promise.all(
    files.map(async (name) => {
      const sql = await readFile(join(migrationsDir, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      return { name, sql, checksum };
    }),
  );
}

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getApplied(client: Client): Promise<Map<string, string>> {
  const res = await client.query<{ name: string; checksum: string }>(
    "SELECT name, checksum FROM schema_migrations ORDER BY name",
  );
  return new Map(res.rows.map((r) => [r.name, r.checksum]));
}

async function main(): Promise<void> {
  const migrations = await loadMigrations();
  if (migrations.length === 0) {
    console.log("[migrate] no migrations found");
    return;
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);

    let appliedCount = 0;
    for (const m of migrations) {
      const existing = applied.get(m.name);
      if (existing) {
        if (existing !== m.checksum) {
          throw new Error(
            `[migrate] checksum mismatch for ${m.name}: ` +
              `already applied but file has changed. Create a new migration instead.`,
          );
        }
        continue;
      }
      console.log(`[migrate] applying ${m.name}`);
      await client.query("BEGIN");
      try {
        await client.query(m.sql);
        await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [
          m.name,
          m.checksum,
        ]);
        await client.query("COMMIT");
        appliedCount++;
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`[migrate] failed on ${m.name}: ${(err as Error).message}`);
      }
    }
    console.log(
      `[migrate] done — ${appliedCount} applied, ${migrations.length - appliedCount} up-to-date`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
