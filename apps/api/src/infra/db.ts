import { Pool } from "pg";
import { env } from "./env.ts";

/**
 * Lazy-initialized singleton Postgres pool.
 * Call sites should import `getPool()` rather than creating their own.
 */

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set — cannot create Postgres pool");
    }
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on("error", (err) => {
      console.error("[pg] idle client error", err);
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
