/**
 * AI adapter — fetches insights from the Cloud Function.
 *
 * Amendment 10:
 * - Validate AI response before caching or rendering
 * - Cache only successful validated responses
 * - Disable duplicate requests while loading (handled by hook)
 *
 * Amendment 11:
 * - Explicit mock transport for testing without API key or network
 */

import { AI_ENDPOINT, isAIConfigured } from './config';
import { AIInsightsResponseSchema } from './types';
import type { AIInsightsRequest, AIInsightsResponse, AIInsightsErrorKind } from './types';

/** Prompt version — must match backend PROMPT_VERSION for cache coherence. */
export const PROMPT_VERSION = '1.0.0';

/** Error class with categorized error kind. */
export class AIAdapterError extends Error {
  public readonly kind: AIInsightsErrorKind;

  constructor(message: string, kind: AIInsightsErrorKind) {
    super(message);
    this.kind = kind;
    this.name = 'AIAdapterError';
  }
}

/**
 * Transport interface for fetching AI insights.
 * Allows injecting a mock transport for testing (amendment 11).
 */
export interface AITransport {
  fetch(request: AIInsightsRequest): Promise<AIInsightsResponse>;
}

/**
 * Default HTTP transport — calls the Cloud Function.
 */
export const httpTransport: AITransport = {
  async fetch(request: AIInsightsRequest): Promise<AIInsightsResponse> {
    if (!isAIConfigured()) {
      throw new AIAdapterError('AI insights are not configured.', 'unconfigured');
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new AIAdapterError('You appear to be offline.', 'offline');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (response.status === 429) {
        throw new AIAdapterError('Too many requests. Please wait.', 'rate-limited');
      }

      if (response.status === 503) {
        throw new AIAdapterError('AI service is not configured on the server.', 'unconfigured');
      }

      if (response.status >= 500) {
        throw new AIAdapterError('Server error. Please try again later.', 'server-error');
      }

      if (!response.ok) {
        throw new AIAdapterError('Request failed.', 'unknown');
      }

      const data: unknown = await response.json();

      // Validate response structure (amendment 10)
      const parseResult = AIInsightsResponseSchema.safeParse(data);
      if (!parseResult.success) {
        throw new AIAdapterError('Invalid response from server.', 'malformed');
      }

      return parseResult.data;
    } catch (error) {
      if (error instanceof AIAdapterError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AIAdapterError('Request timed out.', 'timeout');
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AIAdapterError('Network error. Check your connection.', 'offline');
      }

      throw new AIAdapterError('Something went wrong.', 'unknown');
    } finally {
      clearTimeout(timeout);
    }
  },
};

// ─── Mock transport for testing (amendment 11) ───

export interface MockTransportState {
  calls: AIInsightsRequest[];
  nextResponse:
    | { type: 'success'; data: AIInsightsResponse }
    | { type: 'error'; kind: AIInsightsErrorKind; message: string };
}

/**
 * Create a mock transport for testing.
 * Supports configured-success, invalid-response, timeout, 429, and 500 states.
 */
export function createMockTransport(initialState?: Partial<MockTransportState>): {
  transport: AITransport;
  state: MockTransportState;
} {
  const state: MockTransportState = {
    calls: [],
    nextResponse: initialState?.nextResponse ?? {
      type: 'success',
      data: {
        summary: 'Mock summary for testing.',
        actionExplanations: [
          { actionId: 'test-action-1', explanation: 'Mock explanation 1.' },
          { actionId: 'test-action-2', explanation: 'Mock explanation 2.' },
          { actionId: 'test-action-3', explanation: 'Mock explanation 3.' },
        ],
        weeklyPlan: [
          { day: 'Monday', task: 'Mock task 1' },
          { day: 'Tuesday', task: 'Mock task 2' },
          { day: 'Wednesday', task: 'Mock task 3' },
          { day: 'Thursday', task: 'Mock task 4' },
          { day: 'Friday', task: 'Mock task 5' },
          { day: 'Saturday', task: 'Mock task 6' },
          { day: 'Sunday', task: 'Mock task 7' },
        ],
        caveat: 'Mock caveat — all values are estimates.',
      },
    },
  };

  const transport: AITransport = {
    async fetch(request: AIInsightsRequest): Promise<AIInsightsResponse> {
      state.calls.push(request);
      if (state.nextResponse.type === 'error') {
        throw new AIAdapterError(state.nextResponse.message, state.nextResponse.kind);
      }
      return state.nextResponse.data;
    },
  };

  return { transport, state };
}
