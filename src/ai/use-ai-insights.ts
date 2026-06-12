/**
 * React hook for AI insights.
 *
 * Amendment 10:
 * - Only fires on explicit button press (never auto)
 * - Cache hits do NOT trigger cooldown
 * - Disable duplicate requests while loading
 * - Preserve deterministic data in every state
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AI_COOLDOWN_MS } from './config';
import { lookupCache, storeInCache } from './cache';
import { httpTransport, AIAdapterError } from './adapter';
import type { AITransport } from './adapter';
import type { AIInsightsRequest, AIInsightsStatus, AIInsightsErrorKind } from './types';

interface UseAIInsightsOptions {
  /** Override transport for testing (amendment 11). */
  transport?: AITransport;
}

interface UseAIInsightsReturn {
  status: AIInsightsStatus;
  requestInsights: () => void;
  clearInsights: () => void;
}

/**
 * Hook for managing AI insights state.
 *
 * @param request - The structured request data (null if no profile)
 * @param options - Optional overrides for testing
 */
export function useAIInsights(
  request: AIInsightsRequest | null,
  options: UseAIInsightsOptions = {},
): UseAIInsightsReturn {
  const { transport = httpTransport } = options;

  const [status, setStatus] = useState<AIInsightsStatus>({ state: 'idle' });
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const startCooldown = useCallback(() => {
    setStatus((prev) => {
      // Don't overwrite success state with cooldown
      if (prev.state === 'success') return prev;
      return { state: 'cooldown', retryAfterMs: AI_COOLDOWN_MS };
    });

    cooldownTimerRef.current = setTimeout(() => {
      setStatus((prev) => {
        // Only transition from cooldown to idle
        if (prev.state === 'cooldown') return { state: 'idle' };
        return prev;
      });
      cooldownTimerRef.current = null;
    }, AI_COOLDOWN_MS);
  }, []);

  const requestInsights = useCallback(() => {
    if (!request) return;

    // Prevent duplicate requests while loading (amendment 10)
    if (isLoadingRef.current) return;

    // Check cooldown
    if (status.state === 'cooldown') return;

    // Check cache first (amendment 10: cache hits don't trigger cooldown)
    const cached = lookupCache(request);
    if (cached) {
      setStatus({ state: 'success', data: cached, fromCache: true });
      return;
    }

    // Start loading
    isLoadingRef.current = true;
    setStatus({ state: 'loading' });

    transport
      .fetch(request)
      .then((data) => {
        // Cache the validated response (amendment 10)
        storeInCache(request, data);
        setStatus({ state: 'success', data, fromCache: false });

        // Start cooldown (UX only, not security)
        startCooldown();
      })
      .catch((error) => {
        const kind: AIInsightsErrorKind = error instanceof AIAdapterError ? error.kind : 'unknown';
        const message = error instanceof AIAdapterError ? error.message : 'Something went wrong.';

        setStatus({ state: 'error', error: kind, message });
      })
      .finally(() => {
        isLoadingRef.current = false;
      });
  }, [request, status.state, transport, startCooldown]);

  const clearInsights = useCallback(() => {
    setStatus({ state: 'idle' });
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }, []);
  return { status, requestInsights, clearInsights };
}
