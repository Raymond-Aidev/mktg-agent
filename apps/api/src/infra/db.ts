import { Pool, type PoolClient } from "pg";
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

export type DbRole = "batch_worker" | "signalcraft_worker";

/**
 * Execute a callback under a specific DB role (SET ROLE / RESET ROLE).
 * Enforces the Category A/B write boundary defined in 0006_roles.sql.
 *
 * The connection is acquired from the shared pool. SET ROLE narrows
 * permissions for the duration of the callback; RESET ROLE restores
 * the default (Railway `postgres` owner) before the client is released.
 */
export async function withRole<T>(
  role: DbRole,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query(`SET ROLE ${role}`);
    return await fn(client);
  } finally {
    await client.query("RESET ROLE").catch(() => {});
    client.release();
  }
}

const rolePools = new Map<DbRole, Pool>();

/**
 * Return a Pool whose connections automatically run under the given role.
 * Uses the `connect` event to SET ROLE on each new pg connection, so every
 * pool.query() call inherits the correct permissions.
 */
export function getPoolForRole(role: DbRole): Pool {
  const existing = rolePools.get(role);
  if (existing) return existing;

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — cannot create Postgres pool");
  }

  const p = new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  p.on("connect", (client: PoolClient) => {
    client.query(`SET ROLE ${role}`).catch((err: Error) => {
      console.error(`[pg] SET ROLE ${role} failed: ${err.message}`);
    });
  });
  p.on("error", (err: Error) => {
    console.error(`[pg:${role}] idle client error`, err);
  });

  rolePools.set(role, p);
  return p;
}

export async function closePool(): Promise<void> {
  const closes: Promise<void>[] = [];
  if (pool) {
    closes.push(pool.end());
    pool = null;
  }
  for (const [, p] of rolePools) {
    closes.push(p.end());
  }
  rolePools.clear();
  await Promise.all(closes);
}
