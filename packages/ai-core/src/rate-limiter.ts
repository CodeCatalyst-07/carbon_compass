/**
 * In-memory rate limiter for the insights endpoint.
 *
 * Amendment 7:
 * - Does not trust raw X-Forwarded-For
 * - Normalizes/hashes the platform-derived client IP
 * - Bounded map to avoid unbounded memory growth
 * - Lazy cleanup during requests (no permanent intervals)
 * - Returns 429 with Retry-After
 * - Documented as best-effort, per-instance protection only
 *
 * LIMITATIONS (documented per amendment 7):
 * - In-memory state is per Cloud Functions instance
 * - Resets on cold start
 * - Multiple instances do not share state
 * - This is NOT a security mechanism — it's a cost/abuse guard for a demo
 */

/** Maximum entries in the rate limit map before forced eviction. */
const MAX_MAP_SIZE = 10_000;

/** Window duration in milliseconds. */
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** Maximum requests per window per IP. */
const MAX_REQUESTS = 5;

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();

/**
 * Hash/normalize an IP address for storage.
 * Uses a simple hash to avoid storing raw IPs (amendment 7/8).
 */
function hashIp(ip: string): string {
  let hash = 0x811c9dc5; // FNV-1a offset basis
  for (let i = 0; i < ip.length; i++) {
    hash ^= ip.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // FNV-1a prime
  }
  return hash.toString(36);
}

/**
 * Lazy cleanup of expired entries (amendment 7).
 * Called during requests, not on a permanent interval.
 */
function lazyCleanup(now: number): void {
  // Only clean up at most once per minute
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;

  const cutoff = now - WINDOW_MS;
  for (const [key, entry] of store) {
    // Remove entries where all timestamps are expired
    if (entry.timestamps.every((t) => t < cutoff)) {
      store.delete(key);
    }
  }
}

/**
 * Evict oldest entries if map exceeds size bound (amendment 7).
 */
function evictIfNeeded(): void {
  if (store.size <= MAX_MAP_SIZE) return;

  // Evict oldest entries (first-inserted, rough FIFO)
  const toEvict = store.size - MAX_MAP_SIZE + 100; // Evict a batch
  let evicted = 0;
  for (const key of store.keys()) {
    if (evicted >= toEvict) break;
    store.delete(key);
    evicted++;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the client can retry, if rate limited. */
  retryAfterSeconds?: number;
  /** Remaining requests in the current window. */
  remaining: number;
}

/**
 * Check rate limit for a given IP.
 *
 * @param rawIp - The client IP as provided by the platform (req.ip).
 *   The platform-derived IP is more trustworthy than raw X-Forwarded-For.
 */
export function checkRateLimit(rawIp: string): RateLimitResult {
  const now = Date.now();
  const key = hashIp(rawIp);
  const cutoff = now - WINDOW_MS;

  // Lazy cleanup
  lazyCleanup(now);
  evictIfNeeded();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t >= cutoff);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    // Calculate retry-after from the oldest timestamp in the window
    const oldestInWindow = entry.timestamps[0]!;
    const retryAfterMs = oldestInWindow + WINDOW_MS - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
      remaining: 0,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.timestamps.length,
  };
}

/** Get current store size (for testing/monitoring). */
export function getRateLimitStoreSize(): number {
  return store.size;
}

/** Clear the store (for testing). */
export function clearRateLimitStore(): void {
  store.clear();
  lastCleanup = Date.now();
}
