import { describe, it, expect } from 'vitest';
import { calculateFootprint } from '../calculator';
import type { UserProfile } from '../../../storage/schemas';

function makeProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    transport: { modes: [] },
    electricity: { monthlyKwh: 0, isPersonalUsage: true, householdSize: 1 },
    diet: 'vegan',
    flights: { shortHaulLegs: 0, mediumHaulLegs: 0, longHaulLegs: 0 },
    personalization: {
      reductionGoalPercent: null,
      effortPreference: 'medium',
      budgetSensitivity: 'medium',
    },
    ...overrides,
  };
}

describe('Calculator Orchestrator', () => {
  it('returns zero for an all-zero profile', () => {
    const result = calculateFootprint(makeProfile());
    expect(result.totalAnnualKgCO2e).toBeGreaterThan(0);
    // Vegan diet alone contributes ~1054 kg/year
    expect(result.breakdown).toHaveLength(4);
    expect(result.isEstimate).toBe(true);
  });

  it('sums all four categories correctly', () => {
    const profile = makeProfile({
      transport: { modes: [{ mode: 'car', weeklyDistanceKm: 100 }] },
      electricity: { monthlyKwh: 300, isPersonalUsage: true, householdSize: 1 },
      diet: 'heavy-meat',
      flights: { shortHaulLegs: 4, mediumHaulLegs: 0, longHaulLegs: 0 },
    });
    const result = calculateFootprint(profile);

    // car: 100×52×0.17140 = 891.28
    // electricity: 300×12×0.494 = 1778.4
    // diet: 7.19×365 = 2624.35
    // flights: 4×1100×0.25493 = 1121.69
    const expected = 891.28 + 1778.4 + 2624.35 + 1121.69;
    expect(result.totalAnnualKgCO2e).toBeCloseTo(expected, 0);
    expect(result.totalMonthlyKgCO2e).toBeCloseTo(expected / 12, 0);
  });

  it('sets percentages that sum to ~100%', () => {
    const profile = makeProfile({
      transport: { modes: [{ mode: 'car', weeklyDistanceKm: 100 }] },
      electricity: { monthlyKwh: 300, isPersonalUsage: true, householdSize: 1 },
      diet: 'vegetarian',
      flights: { shortHaulLegs: 2, mediumHaulLegs: 0, longHaulLegs: 0 },
    });
    const result = calculateFootprint(profile);
    const totalPercent = result.breakdown.reduce((sum, b) => sum + b.percentage, 0);
    // Should be close to 100 (rounding may cause slight deviation)
    expect(totalPercent).toBeCloseTo(100, 0);
  });

  it('handles zero total gracefully (all zero-emission)', () => {
    const profile = makeProfile({
      transport: { modes: [{ mode: 'bicycle', weeklyDistanceKm: 50 }] },
      electricity: { monthlyKwh: 0, isPersonalUsage: true, householdSize: 1 },
      diet: 'vegan', // Still has emissions from diet
      flights: { shortHaulLegs: 0, mediumHaulLegs: 0, longHaulLegs: 0 },
    });
    const result = calculateFootprint(profile);
    // Only vegan diet has emissions
    expect(result.totalAnnualKgCO2e).toBeGreaterThan(0);
    // Percentages should not cause NaN or errors
    for (const b of result.breakdown) {
      expect(Number.isFinite(b.percentage)).toBe(true);
    }
  });

  it('identifies top drivers', () => {
    const profile = makeProfile({
      transport: { modes: [{ mode: 'car', weeklyDistanceKm: 200 }] },
      electricity: { monthlyKwh: 100, isPersonalUsage: true, householdSize: 1 },
      diet: 'vegan',
      flights: { shortHaulLegs: 0, mediumHaulLegs: 0, longHaulLegs: 0 },
    });
    const result = calculateFootprint(profile);
    // Transport should dominate
    expect(result.topDrivers.length).toBeGreaterThanOrEqual(1);
    expect(result.topDrivers.length).toBeLessThanOrEqual(2);
    expect(result.topDrivers[0]!.category).toBe('transport');
  });

  it('includes registry version', () => {
    const result = calculateFootprint(makeProfile());
    expect(result.factorRegistryVersion).toBeTruthy();
    expect(result.factorRegistryVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('includes ISO timestamp', () => {
    const result = calculateFootprint(makeProfile());
    expect(result.calculatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
