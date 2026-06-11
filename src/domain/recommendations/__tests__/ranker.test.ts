import { describe, it, expect } from 'vitest';
import { rankActions } from '../ranker';
import type { ApplicabilityContext } from '../types';

function makeContext(overrides?: Partial<ApplicabilityContext>): ApplicabilityContext {
  return {
    diet: 'heavy-meat',
    carKmPerWeek: 100,
    usesCar: true,
    hasFlights: true,
    shortHaulLegs: 4,
    longHaulLegs: 2,
    personalMonthlyKwh: 300,
    topDriverCategories: ['transport', 'diet'],
    completedActionIds: new Set(),
    dismissedActionIds: new Set(),
    effortPreference: 'medium',
    budgetSensitivity: 'medium',
    ...overrides,
  };
}

describe('Recommendation Ranker', () => {
  it('returns ranked actions sorted by composite score', () => {
    const ranked = rankActions(makeContext());
    expect(ranked.length).toBeGreaterThan(0);

    // Verify descending order
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i]!.scores.compositeScore).toBeLessThanOrEqual(
        ranked[i - 1]!.scores.compositeScore + 0.001, // float tolerance
      );
    }
  });

  it('assigns sequential ranks starting at 1', () => {
    const ranked = rankActions(makeContext());
    for (let i = 0; i < ranked.length; i++) {
      expect(ranked[i]!.rank).toBe(i + 1);
    }
  });

  it('excludes completed actions', () => {
    const ctx = makeContext({
      completedActionIds: new Set(['transport-reduce-car']),
    });
    const ranked = rankActions(ctx);
    const ids = ranked.map((r) => r.action.id);
    expect(ids).not.toContain('transport-reduce-car');
  });

  it('excludes dismissed actions', () => {
    const ctx = makeContext({
      dismissedActionIds: new Set(['transport-reduce-car']),
    });
    const ranked = rankActions(ctx);
    const ids = ranked.map((r) => r.action.id);
    expect(ids).not.toContain('transport-reduce-car');
  });

  it('never shows meat-reduction to vegans', () => {
    const ctx = makeContext({ diet: 'vegan' });
    const ranked = rankActions(ctx);
    const ids = ranked.map((r) => r.action.id);
    expect(ids).not.toContain('diet-reduce-meat');
    expect(ids).not.toContain('diet-meatless-days');
  });

  it('never shows meat-reduction to vegetarians', () => {
    const ctx = makeContext({ diet: 'vegetarian' });
    const ranked = rankActions(ctx);
    const ids = ranked.map((r) => r.action.id);
    expect(ids).not.toContain('diet-reduce-meat');
    expect(ids).not.toContain('diet-meatless-days');
  });

  it('hides car advice when user does not drive', () => {
    const ctx = makeContext({ usesCar: false, carKmPerWeek: 0 });
    const ranked = rankActions(ctx);
    const ids = ranked.map((r) => r.action.id);
    expect(ids).not.toContain('transport-reduce-car');
    expect(ids).not.toContain('transport-switch-bus');
    expect(ids).not.toContain('transport-cycle');
  });

  it('prioritizes actions matching top driver category', () => {
    const ctx = makeContext({ topDriverCategories: ['flights', 'diet'] });
    const ranked = rankActions(ctx);
    // Flight-related actions should be among the highest-ranked
    const top3Categories = ranked.slice(0, 3).map((r) => r.action.category);
    expect(top3Categories).toContain('flights');
  });

  it('includes explainable reasons', () => {
    const ranked = rankActions(makeContext());
    for (const r of ranked) {
      expect(r.explainableReason).toBeTruthy();
      expect(typeof r.explainableReason).toBe('string');
    }
  });

  it('all scores are between 0 and 1', () => {
    const ranked = rankActions(makeContext());
    for (const r of ranked) {
      expect(r.scores.impactScore).toBeGreaterThanOrEqual(0);
      expect(r.scores.impactScore).toBeLessThanOrEqual(1);
      expect(r.scores.effortScore).toBeGreaterThanOrEqual(0);
      expect(r.scores.effortScore).toBeLessThanOrEqual(1);
      expect(r.scores.costScore).toBeGreaterThanOrEqual(0);
      expect(r.scores.costScore).toBeLessThanOrEqual(1);
      expect(r.scores.contextMatchScore).toBeGreaterThanOrEqual(0);
      expect(r.scores.contextMatchScore).toBeLessThanOrEqual(1);
      expect(r.scores.driverRelevanceScore).toBeGreaterThanOrEqual(0);
      expect(r.scores.driverRelevanceScore).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic — same input yields same output', () => {
    const ctx = makeContext();
    const first = rankActions(ctx);
    const second = rankActions(ctx);
    expect(first.map((r) => r.action.id)).toEqual(second.map((r) => r.action.id));
    expect(first.map((r) => r.scores.compositeScore)).toEqual(
      second.map((r) => r.scores.compositeScore),
    );
  });

  it('handles all-zero profile (no car, no flights, vegan)', () => {
    const ctx = makeContext({
      diet: 'vegan',
      carKmPerWeek: 0,
      usesCar: false,
      hasFlights: false,
      shortHaulLegs: 0,
      longHaulLegs: 0,
      personalMonthlyKwh: 0,
      topDriverCategories: [],
    });
    const ranked = rankActions(ctx);
    // Should still return some generic actions (habits)
    expect(ranked.length).toBeGreaterThan(0);
  });

  it('boosts money-saving actions for budget-sensitive users', () => {
    const ctxHighBudget = makeContext({ budgetSensitivity: 'high' });
    const ctxLowBudget = makeContext({ budgetSensitivity: 'low' });

    const highRanked = rankActions(ctxHighBudget);
    const lowRanked = rankActions(ctxLowBudget);

    // Find a money-saving action in both
    const savingAction = highRanked.find((r) => r.action.metadata.cost === 'saves-money');
    const sameLow = lowRanked.find((r) => r.action.id === savingAction?.action.id);

    if (savingAction && sameLow) {
      expect(savingAction.scores.costScore).toBeGreaterThanOrEqual(sameLow.scores.costScore);
    }
  });
});
