/**
 * Tests for server-side cache.
 *
 * Covers amendment 9: bounded size, expiry, cache key composition.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateServerCacheKey,
  getCached,
  setCached,
  clearServerCache,
  getServerCacheSize,
} from '../cache.js';

beforeEach(() => {
  clearServerCache();
});

describe('generateServerCacheKey', () => {
  it('produces a stable key for the same inputs', () => {
    const key1 = generateServerCacheKey({
      factorRegistryVersion: '0.2.0',
      model: 'gemini-2.5-flash-lite',
      normalizedRequest: '{"a":1}',
    });
    const key2 = generateServerCacheKey({
      factorRegistryVersion: '0.2.0',
      model: 'gemini-2.5-flash-lite',
      normalizedRequest: '{"a":1}',
    });
    expect(key1).toBe(key2);
  });

  it('produces different keys for different factor versions', () => {
    const key1 = generateServerCacheKey({
      factorRegistryVersion: '0.2.0',
      model: 'gemini-2.5-flash-lite',
      normalizedRequest: '{}',
    });
    const key2 = generateServerCacheKey({
      factorRegistryVersion: '0.3.0',
      model: 'gemini-2.5-flash-lite',
      normalizedRequest: '{}',
    });
    expect(key1).not.toBe(key2);
  });

  it('produces different keys for different models', () => {
    const key1 = generateServerCacheKey({
      factorRegistryVersion: '0.2.0',
      model: 'gemini-2.5-flash-lite',
      normalizedRequest: '{}',
    });
    const key2 = generateServerCacheKey({
      factorRegistryVersion: '0.2.0',
      model: 'gemini-2.0-flash',
      normalizedRequest: '{}',
    });
    expect(key1).not.toBe(key2);
  });
});

describe('getCached / setCached', () => {
  it('returns null for cache miss', () => {
    expect(getCached('nonexistent')).toBeNull();
  });

  it('returns cached value for cache hit', () => {
    setCached('key1', '{"result":"ok"}');
    expect(getCached('key1')).toBe('{"result":"ok"}');
  });

  it('returns null for expired entry', () => {
    vi.useFakeTimers();
    try {
      setCached('key1', '{"result":"ok"}');
      // Advance past 1 hour TTL
      vi.advanceTimersByTime(61 * 60 * 1000);
      expect(getCached('key1')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('evicts oldest entry when at capacity', () => {
    // Fill cache to capacity (100)
    for (let i = 0; i < 100; i++) {
      setCached(`key-${i}`, `{"i":${i}}`);
    }
    expect(getServerCacheSize()).toBe(100);

    // Add one more — should evict the oldest
    setCached('key-new', '{"new":true}');
    expect(getServerCacheSize()).toBe(100);

    // The new entry should be present
    expect(getCached('key-new')).toBe('{"new":true}');
  });

  it('clears all entries', () => {
    setCached('k1', '{}');
    setCached('k2', '{}');
    clearServerCache();
    expect(getServerCacheSize()).toBe(0);
    expect(getCached('k1')).toBeNull();
  });
});
