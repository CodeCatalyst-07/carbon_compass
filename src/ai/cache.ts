/**
 * Client-side AI response cache using localStorage.
 *
 * Amendment 10:
 * - Cache only successful validated responses
 * - Remove expired/corrupt entries
 * - Cache hits should not trigger cooldown
 */

import { generateCacheKey } from '../lib/hash';
import { getCachedAIResponse, cacheAIResponse, deleteCachedAIResponse } from '../storage/adapter';
import type { StorageBackend } from '../storage/adapter';
import { AI_CACHE_TTL_MS } from './config';
import { PROMPT_VERSION } from './adapter';
import { AIInsightsResponseSchema } from './types';
import type { AIInsightsResponse, AIInsightsRequest } from './types';

/**
 * Generate a cache key for a given AI request.
 */
export function buildCacheKey(request: AIInsightsRequest): string {
  return generateCacheKey({
    type: 'insights',
    factorRegistryVersion: request.factorRegistryVersion,
    promptVersion: PROMPT_VERSION,
    payload: JSON.stringify(request),
  });
}

/**
 * Look up a cached AI response.
 * Returns null if not cached or expired.
 */
export function lookupCache(
  request: AIInsightsRequest,
  backend?: StorageBackend,
): AIInsightsResponse | null {
  const key = buildCacheKey(request);
  const cached = getCachedAIResponse(key, backend);

  if (!cached) return null;

  // Parse the cached content
  try {
    const parsed: unknown = JSON.parse(cached.response.content);
    // Validate with Zod
    const result = AIInsightsResponseSchema.safeParse(parsed);
    if (!result.success) {
      deleteCachedAIResponse(key, backend);
      return null;
    }
    return result.data;
  } catch {
    // Corrupt cache entry — remove it
    deleteCachedAIResponse(key, backend);
    return null;
  }
}

/**
 * Store a validated AI response in the cache.
 */
export function storeInCache(
  request: AIInsightsRequest,
  response: AIInsightsResponse,
  backend?: StorageBackend,
): void {
  const key = buildCacheKey(request);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AI_CACHE_TTL_MS);

  cacheAIResponse(
    {
      requestHash: key,
      factorRegistryVersion: request.factorRegistryVersion,
      promptVersion: PROMPT_VERSION,
      model: 'server-provided', // We don't know the exact model, server decides
      response: {
        type: 'explanation',
        content: JSON.stringify(response),
        generatedAt: now.toISOString(),
      },
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
    backend,
  );
}
