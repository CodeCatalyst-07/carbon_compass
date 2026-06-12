/**
 * Tests for the useAIInsights hook.
 *
 * Amendment 10: State machine tests — idle → loading → success/error.
 * Amendment 12: Verify AI errors never alter deterministic totals.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIInsights } from '../use-ai-insights';
import { createMockTransport } from '../adapter';
import type { AIInsightsRequest } from '../types';

// Mock the cache module to avoid localStorage in tests
vi.mock('../cache', () => ({
  lookupCache: vi.fn().mockReturnValue(null),
  storeInCache: vi.fn(),
}));

const mockRequest: AIInsightsRequest = {
  factorRegistryVersion: '0.2.0',
  totals: { annualKgCO2e: 5000, monthlyKgCO2e: 416.7 },
  categoryShares: [
    { category: 'diet', percentage: 50, annualKgCO2e: 2500 },
    { category: 'transport', percentage: 30, annualKgCO2e: 1500 },
    { category: 'electricity', percentage: 15, annualKgCO2e: 750 },
    { category: 'flights', percentage: 5, annualKgCO2e: 250 },
  ],
  topDrivers: [{ category: 'diet', percentage: 50, reason: 'Diet is 50%.' }],
  rankedActions: [
    { id: 'action-1', title: 'Action 1', rank: 1 },
    { id: 'action-2', title: 'Action 2', rank: 2 },
    { id: 'action-3', title: 'Action 3', rank: 3 },
  ],
  goal: { reductionGoalPercent: 20 },
  constraints: { effortPreference: 'medium', budgetSensitivity: 'medium' },
};

describe('useAIInsights', () => {
  it('starts in idle state', () => {
    const { transport } = createMockTransport();
    const { result } = renderHook(() => useAIInsights(mockRequest, { transport }));
    expect(result.current.status.state).toBe('idle');
  });

  it('transitions to loading then success', async () => {
    const { transport } = createMockTransport();
    const { result } = renderHook(() => useAIInsights(mockRequest, { transport }));

    await act(async () => {
      result.current.requestInsights();
    });

    // Should eventually reach success
    expect(result.current.status.state).toBe('success');
    if (result.current.status.state === 'success') {
      expect(result.current.status.data.summary).toContain('Mock');
      expect(result.current.status.fromCache).toBe(false);
    }
  });

  it('transitions to error on failure', async () => {
    const { transport } = createMockTransport({
      nextResponse: { type: 'error', kind: 'server-error', message: 'Server error' },
    });

    const { result } = renderHook(() => useAIInsights(mockRequest, { transport }));

    await act(async () => {
      result.current.requestInsights();
    });

    expect(result.current.status.state).toBe('error');
    if (result.current.status.state === 'error') {
      expect(result.current.status.error).toBe('server-error');
    }
  });

  it('does nothing when request is null', async () => {
    const { transport, state } = createMockTransport();
    const { result } = renderHook(() => useAIInsights(null, { transport }));

    await act(async () => {
      result.current.requestInsights();
    });

    expect(result.current.status.state).toBe('idle');
    expect(state.calls).toHaveLength(0);
  });

  it('clearInsights resets to idle', async () => {
    const { transport } = createMockTransport();
    const { result } = renderHook(() => useAIInsights(mockRequest, { transport }));

    await act(async () => {
      result.current.requestInsights();
    });

    expect(result.current.status.state).toBe('success');

    act(() => {
      result.current.clearInsights();
    });

    expect(result.current.status.state).toBe('idle');
  });

  it('deterministic request data is never modified by AI interaction', async () => {
    const requestCopy = JSON.parse(JSON.stringify(mockRequest));
    const { transport } = createMockTransport({
      nextResponse: { type: 'error', kind: 'server-error', message: 'Error' },
    });

    const { result } = renderHook(() => useAIInsights(mockRequest, { transport }));

    await act(async () => {
      result.current.requestInsights();
    });

    // Original request data must be unchanged
    expect(mockRequest).toEqual(requestCopy);
  });

  it('supports fewer-than-3 action cases successfully', async () => {
    const fewerRequest = {
      ...mockRequest,
      rankedActions: [{ id: 'action-1', title: 'Action 1', rank: 1 }],
    };
    const { transport } = createMockTransport({
      nextResponse: {
        type: 'success',
        data: {
          summary: 'Mock summary.',
          actionExplanations: [{ actionId: 'action-1', explanation: 'Mock explanation.' }],
          weeklyPlan: [
            { day: 'Monday', task: 'Mock task 1' },
            { day: 'Tuesday', task: 'Mock task 2' },
            { day: 'Wednesday', task: 'Mock task 3' },
            { day: 'Thursday', task: 'Mock task 4' },
            { day: 'Friday', task: 'Mock task 5' },
            { day: 'Saturday', task: 'Mock task 6' },
            { day: 'Sunday', task: 'Mock task 7' },
          ],
          caveat: 'Mock caveat.',
        },
      },
    });

    const { result } = renderHook(() => useAIInsights(fewerRequest, { transport }));

    await act(async () => {
      result.current.requestInsights();
    });

    expect(result.current.status.state).toBe('success');
    if (result.current.status.state === 'success') {
      expect(result.current.status.data.actionExplanations).toHaveLength(1);
    }
  });
});
