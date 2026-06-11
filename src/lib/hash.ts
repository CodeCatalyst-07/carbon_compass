/**
 * Stable hash function for AI cache keys.
 * Uses a simple djb2-based hash that produces consistent results
 * across sessions for the same input string.
 */
export function stableHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    // hash * 33 + charCode
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Generate a hash key for AI cache entries.
 * Combines request type, factor registry version, and prompt version
 * with the serialized request payload.
 */
export function generateCacheKey(params: {
  type: string;
  factorRegistryVersion: string;
  promptVersion: string;
  payload: string;
}): string {
  const combined = [
    params.type,
    params.factorRegistryVersion,
    params.promptVersion,
    params.payload,
  ].join('|');
  return stableHash(combined);
}
