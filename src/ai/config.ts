/**
 * AI configuration.
 *
 * Amendment 13: VITE_AI_ENDPOINT is public build configuration, not a secret.
 * The frontend calls the Cloud Function which holds the API key.
 */

/**
 * AI endpoint URL.
 * Empty string or undefined means AI is unconfigured — that's fine,
 * the app works fully without it.
 */
export const AI_ENDPOINT: string =
  (typeof window !== 'undefined'
    ? (window as unknown as { __VITE_AI_ENDPOINT_OVERRIDE__?: string })
        .__VITE_AI_ENDPOINT_OVERRIDE__
    : undefined) ??
  import.meta.env.VITE_AI_ENDPOINT ??
  '';

/**
 * Client-side cooldown between AI requests (ms).
 * This is a UX measure to prevent rapid repeated clicks.
 * It is NOT a security mechanism — the server enforces its own rate limits.
 */
export const AI_COOLDOWN_MS = 30_000;

/**
 * Client-side AI cache TTL (ms) — 7 days.
 */
export const AI_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Whether AI is configured (endpoint is set). */
export function isAIConfigured(): boolean {
  return AI_ENDPOINT.length > 0;
}
