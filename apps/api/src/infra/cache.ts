import { getRedis } from "./redis.ts";

/**
 * Tiny Redis-backed cache helper.
 *
 * Key scheme (docs/Technical_Specification_v1.0.md §1.3.6):
 *   cache:ref:{table}:{key}                — Category A master reads (TTL 1h)
 *   cache:signalcraft:posts:{hash}         — raw_posts per (keyword,regions)
 *   cache:signalcraft:module:{id}:{hash}   — LLM module outputs (TTL 24h)
 */

export const CACHE_TTL = {
  REF: 60 * 60, // 1 hour — Category A reference reads
  SIGNALCRAFT_POSTS: 6 * 60 * 60, // 6 hours — raw_posts reuse
  SIGNALCRAFT_MODULE: 24 * 60 * 60, // 24 hours — LLM outputs
} as const;

export function cacheKey(parts: (string | number)[]): string {
  return parts.map((p) => String(p)).join(":");
}

/**
 * Fetch-through cache. If the key exists, return its JSON-parsed value.
 * Otherwise call `fetcher`, store the result with TTL, and return it.
 *
 * Safe for `undefined`/`null` returns from the fetcher — we only cache when
 * the fetcher resolves with a non-undefined value.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();
  if (redis.status !== "ready" && redis.status !== "connecting") {
    await redis.connect();
  }

  const cached = await redis.get(key);
  if (cached !== null) {
    try {
      return JSON.parse(cached) as T;
    } catch {
      // Corrupt payload — fall through and refresh.
    }
  }

  const fresh = await fetcher();
  if (fresh !== undefined) {
    await redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds);
  }
  return fresh;
}

export async function invalidateCache(keyPattern: string): Promise<number> {
  const redis = getRedis();
  const stream = redis.scanStream({ match: keyPattern, count: 100 });
  let deleted = 0;
  for await (const keys of stream) {
    if (Array.isArray(keys) && keys.length > 0) {
      deleted += await redis.del(...keys);
    }
  }
  return deleted;
}
