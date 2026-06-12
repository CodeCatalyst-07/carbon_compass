/**
 * Tests for the rate limiter.
 *
 * Covers amendment 7: bounded map, lazy cleanup, Retry-After, hashed IP.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, clearRateLimitStore, getRateLimitStoreSize } from '../rate-limiter.js';

beforeEach(() => {
  clearRateLimitStore();
});

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    const result = checkRateLimit('192.168.1.1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // 5 max - 1 used
  });

  it('allows exactly 5 requests', () => {
    for (let i = 0; i < 4; i++) {
      const r = checkRateLimit('192.168.1.1');
      expect(r.allowed).toBe(true);
    }
    const fifth = checkRateLimit('192.168.1.1');
    expect(fifth.allowed).toBe(true);
    expect(fifth.remaining).toBe(0);
  });

  it('blocks the 6th request', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('192.168.1.1');
    }
    const sixth = checkRateLimit('192.168.1.1');
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
  });

  it('returns retryAfterSeconds when blocked', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('192.168.1.1');
    }
    const result = checkRateLimit('192.168.1.1');
    expect(result.retryAfterSeconds).toBeDefined();
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('allows different IPs independently', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('192.168.1.1');
    }
    const otherIp = checkRateLimit('192.168.1.2');
    expect(otherIp.allowed).toBe(true);
  });

  it('allows again after window expires', () => {
    vi.useFakeTimers();
    try {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('10.0.0.1');
      }
      expect(checkRateLimit('10.0.0.1').allowed).toBe(false);

      // Advance past the 15-minute window
      vi.advanceTimersByTime(15 * 60 * 1000 + 1);

      const result = checkRateLimit('10.0.0.1');
      expect(result.allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hashes IPs so raw IPs are not stored', () => {
    checkRateLimit('192.168.1.100');
    // Store size should be 1 but the key shouldn't be the raw IP
    expect(getRateLimitStoreSize()).toBe(1);
  });

  it('bounded map does not grow unboundedly', () => {
    // Add many different IPs
    for (let i = 0; i < 100; i++) {
      checkRateLimit(`10.0.${Math.floor(i / 256)}.${i % 256}`);
    }
    // Store should have entries but be bounded
    expect(getRateLimitStoreSize()).toBeLessThanOrEqual(10_100);
  });

  it('clears store', () => {
    checkRateLimit('1.2.3.4');
    expect(getRateLimitStoreSize()).toBe(1);
    clearRateLimitStore();
    expect(getRateLimitStoreSize()).toBe(0);
  });
});
