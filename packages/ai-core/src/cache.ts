/**
 * Server-side response cache.
 *
 * Amendment 9:
 * - Cache only successfully validated responses
 * - Bounded size and expiry
 * - Do not expose cacheable HTTP headers
 * - Cache key includes prompt version, factor version, model, and normalized request
 */

import { PROMPT_VERSION } from './prompt.js';

/** Maximum cached entries. */
const MAX_CACHE_SIZE = 100;

/** Cache TTL in milliseconds (1 hour). */
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry {
  response: string; // JSON string of validated response
  createdAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Generate a cache key from request components.
 * Uses a simple string hash (same as frontend lib/hash.ts pattern).
 */
export function generateServerCacheKey(params: {
  factorRegistryVersion: string;
  model: string;
  normalizedRequest: string;
}): string {
  const combined = [
    PROMPT_VERSION,
    params.factorRegistryVersion,
    params.model,
    params.normalizedRequest,
  ].join('|');
  return stableHash(combined);
}

function stableHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Get a cached response if it exists and is not expired.
 */
export function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check expiry
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.response;
}

/**
 * Store a validated response in the cache.
 */
export function setCached(key: string, responseJson: string): void {
  // Evict expired entries lazily
  if (cache.size >= MAX_CACHE_SIZE) {
    evictExpired();
  }

  // If still at capacity, evict oldest
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }

  cache.set(key, {
    response: responseJson,
    createdAt: Date.now(),
  });
}

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

/** Clear the cache (for testing). */
export function clearServerCache(): void {
  cache.clear();
}

/** Get current cache size (for testing). */
export function getServerCacheSize(): number {
  return cache.size;
}
