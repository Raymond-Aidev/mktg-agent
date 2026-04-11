import { Redis, type RedisOptions } from "ioredis";
import { env } from "./env.ts";

/**
 * Shared Redis client factories. Two logical clients:
 *   - the default app client (for caching, rate limits, etc.)
 *   - a BullMQ-scoped client whose options are tuned for job processing.
 *
 * BullMQ requires `maxRetriesPerRequest: null` and `enableReadyCheck: false`
 * on the connection it uses for blocking commands. We therefore do not reuse
 * the default client for BullMQ.
 */

const BASE_OPTIONS: RedisOptions = {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableAutoPipelining: true,
};

let defaultClient: Redis | null = null;

export function getRedis(): Redis {
  if (!defaultClient) {
    if (!env.REDIS_URL) {
      throw new Error("REDIS_URL is not set — cannot create Redis client");
    }
    defaultClient = new Redis(env.REDIS_URL, BASE_OPTIONS);
  }
  return defaultClient;
}

export function createBullConnection(): Redis {
  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is not set — cannot create BullMQ Redis connection");
  }
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export async function disconnectAllRedis(): Promise<void> {
  if (defaultClient) {
    defaultClient.disconnect();
    defaultClient = null;
  }
}
