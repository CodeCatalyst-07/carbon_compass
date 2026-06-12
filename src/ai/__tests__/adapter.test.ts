/**
 * Tests for the AI adapter.
 *
 * Amendment 11: Uses mock transport — no API key or network needed.
 * Amendment 10: Cache, cooldown, offline, unconfigured, fallback.
 */

import { describe, it, expect } from 'vitest';
import { AIAdapterError, createMockTransport } from '../adapter';
import { AIInsightsResponseSchema } from '../types';

describe('AIInsightsResponseSchema', () => {
  it('accepts a valid response', () => {
    expect(
      AIInsightsResponseSchema.safeParse({
        summary: 'Test summary.',
        actionExplanations: [
          { actionId: 'a1', explanation: 'E1' },
          { actionId: 'a2', explanation: 'E2' },
          { actionId: 'a3', explanation: 'E3' },
        ],
        weeklyPlan: [
          { day: 'Monday', task: 'T1' },
          { day: 'Tuesday', task: 'T2' },
          { day: 'Wednesday', task: 'T3' },
          { day: 'Thursday', task: 'T4' },
          { day: 'Friday', task: 'T5' },
          { day: 'Saturday', task: 'T6' },
          { day: 'Sunday', task: 'T7' },
        ],
        caveat: 'Test caveat.',
      }).success,
    ).toBe(true);
  });

  it('rejects null', () => {
    expect(AIInsightsResponseSchema.safeParse(null).success).toBe(false);
  });

  it('rejects missing summary', () => {
    expect(
      AIInsightsResponseSchema.safeParse({
        actionExplanations: [],
        weeklyPlan: [],
        caveat: 'c',
      }).success,
    ).toBe(false);
  });

  it('rejects empty summary', () => {
    expect(
      AIInsightsResponseSchema.safeParse({
        summary: '',
        actionExplanations: [{ actionId: 'a', explanation: 'e' }],
        weeklyPlan: Array.from({ length: 7 }, (_, i) => ({ day: `Day ${i}`, task: 't' })),
        caveat: 'c',
      }).success,
    ).toBe(false);
  });

  it('rejects wrong weeklyPlan length', () => {
    expect(
      AIInsightsResponseSchema.safeParse({
        summary: 's',
        actionExplanations: [{ actionId: 'a', explanation: 'e' }],
        weeklyPlan: [{ day: 'Monday', task: 't' }],
        caveat: 'c',
      }).success,
    ).toBe(false);
  });

  it('rejects malformed action explanation', () => {
    expect(
      AIInsightsResponseSchema.safeParse({
        summary: 's',
        actionExplanations: [{ wrong: 'field' }],
        weeklyPlan: Array.from({ length: 7 }, (_, i) => ({ day: `Day ${i}`, task: 't' })),
        caveat: 'c',
      }).success,
    ).toBe(false);
  });

  it('accepts 1 or 2 action explanations (fewer-than-3)', () => {
    expect(
      AIInsightsResponseSchema.safeParse({
        summary: 'Test summary.',
        actionExplanations: [{ actionId: 'a1', explanation: 'E1' }],
        weeklyPlan: [
          { day: 'Monday', task: 'T1' },
          { day: 'Tuesday', task: 'T2' },
          { day: 'Wednesday', task: 'T3' },
          { day: 'Thursday', task: 'T4' },
          { day: 'Friday', task: 'T5' },
          { day: 'Saturday', task: 'T6' },
          { day: 'Sunday', task: 'T7' },
        ],
        caveat: 'Test caveat.',
      }).success,
    ).toBe(true);
  });
});

describe('createMockTransport', () => {
  it('returns mock data in success mode', async () => {
    const { transport } = createMockTransport();
    const result = await transport.fetch({
      factorRegistryVersion: '0.2.0',
      totals: { annualKgCO2e: 5000, monthlyKgCO2e: 416.7 },
      categoryShares: [],
      topDrivers: [],
      rankedActions: [],
      goal: { reductionGoalPercent: null },
      constraints: { effortPreference: 'medium', budgetSensitivity: 'medium' },
    });
    expect(result.summary).toContain('Mock');
    expect(result.actionExplanations).toHaveLength(3);
    expect(result.weeklyPlan).toHaveLength(7);
  });

  it('throws error in error mode', async () => {
    const { transport } = createMockTransport({
      nextResponse: { type: 'error', kind: 'timeout', message: 'Timed out' },
    });

    await expect(
      transport.fetch({
        factorRegistryVersion: '0.2.0',
        totals: { annualKgCO2e: 0, monthlyKgCO2e: 0 },
        categoryShares: [],
        topDrivers: [],
        rankedActions: [],
        goal: { reductionGoalPercent: null },
        constraints: { effortPreference: 'low', budgetSensitivity: 'low' },
      }),
    ).rejects.toThrow(AIAdapterError);
  });

  it('records all calls', async () => {
    const { transport, state } = createMockTransport();
    const req = {
      factorRegistryVersion: '0.2.0',
      totals: { annualKgCO2e: 1000, monthlyKgCO2e: 83.3 },
      categoryShares: [],
      topDrivers: [],
      rankedActions: [],
      goal: { reductionGoalPercent: 20 },
      constraints: { effortPreference: 'high', budgetSensitivity: 'low' },
    };
    await transport.fetch(req);
    await transport.fetch(req);
    expect(state.calls).toHaveLength(2);
  });

  it('supports 429 rate-limited error', async () => {
    const { transport } = createMockTransport({
      nextResponse: { type: 'error', kind: 'rate-limited', message: 'Rate limited' },
    });

    try {
      await transport.fetch({
        factorRegistryVersion: '0.2.0',
        totals: { annualKgCO2e: 0, monthlyKgCO2e: 0 },
        categoryShares: [],
        topDrivers: [],
        rankedActions: [],
        goal: { reductionGoalPercent: null },
        constraints: { effortPreference: 'low', budgetSensitivity: 'low' },
      });
      expect.fail('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AIAdapterError);
      expect((e as AIAdapterError).kind).toBe('rate-limited');
    }
  });

  it('supports 500 server-error', async () => {
    const { transport } = createMockTransport({
      nextResponse: { type: 'error', kind: 'server-error', message: 'Server error' },
    });

    try {
      await transport.fetch({
        factorRegistryVersion: '0.2.0',
        totals: { annualKgCO2e: 0, monthlyKgCO2e: 0 },
        categoryShares: [],
        topDrivers: [],
        rankedActions: [],
        goal: { reductionGoalPercent: null },
        constraints: { effortPreference: 'low', budgetSensitivity: 'low' },
      });
      expect.fail('Should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AIAdapterError);
      expect((e as AIAdapterError).kind).toBe('server-error');
    }
  });
});
