import { describe, it, expect } from 'vitest';
import { buildApplicabilityContext } from '../build-context';
import type { UserProfile, FootprintResult, TrackedAction } from '../../../storage/schemas';

function makeProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    transport: {
      modes: [
        { mode: 'car', weeklyDistanceKm: 50 },
        { mode: 'train', weeklyDistanceKm: 20 },
      ],
    },
    electricity: {
      monthlyKwh: 300,
      isPersonalUsage: false,
      householdSize: 2,
    },
    diet: 'heavy-meat',
    flights: {
      shortHaulLegs: 4,
      mediumHaulLegs: 2,
      longHaulLegs: 1,
    },
    personalization: {
      reductionGoalPercent: 20,
      effortPreference: 'medium',
      budgetSensitivity: 'medium',
    },
    ...overrides,
  };
}

function makeResult(overrides?: Partial<FootprintResult>): FootprintResult {
  return {
    totalAnnualKgCO2e: 5000,
    totalMonthlyKgCO2e: 416.67,
    breakdown: [
      {
        category: 'transport',
        annualKgCO2e: 2000,
        monthlyKgCO2e: 166.67,
        percentage: 40,
        factorsUsed: ['car-average'],
        methodology: 'test',
      },
      {
        category: 'flights',
        annualKgCO2e: 1500,
        monthlyKgCO2e: 125,
        percentage: 30,
        factorsUsed: ['short-haul'],
        methodology: 'test',
      },
    ],
    topDrivers: [
      { category: 'transport', percentage: 40, reason: 'Car usage' },
      { category: 'flights', percentage: 30, reason: 'Flight legs' },
    ],
    factorRegistryVersion: '0.2.0',
    calculatedAt: new Date().toISOString(),
    isEstimate: true,
  };
}

describe('buildApplicabilityContext', () => {
  it('extracts car distance from transport modes', () => {
    const ctx = buildApplicabilityContext(makeProfile(), makeResult(), []);
    expect(ctx.carKmPerWeek).toBe(50);
    expect(ctx.usesCar).toBe(true);
  });

  it('sets usesCar to false when no car in profile', () => {
    const profile = makeProfile({
      transport: { modes: [{ mode: 'train', weeklyDistanceKm: 30 }] },
    });
    const ctx = buildApplicabilityContext(profile, makeResult(), []);
    expect(ctx.carKmPerWeek).toBe(0);
    expect(ctx.usesCar).toBe(false);
  });

  it('computes personalMonthlyKwh by dividing household usage', () => {
    const ctx = buildApplicabilityContext(makeProfile(), makeResult(), []);
    // 300 / 2 = 150
    expect(ctx.personalMonthlyKwh).toBe(150);
  });

  it('uses raw kWh when isPersonalUsage is true', () => {
    const profile = makeProfile({
      electricity: { monthlyKwh: 200, isPersonalUsage: true, householdSize: 3 },
    });
    const ctx = buildApplicabilityContext(profile, makeResult(), []);
    expect(ctx.personalMonthlyKwh).toBe(200);
  });

  it('guards against householdSize of 0', () => {
    const profile = makeProfile({
      electricity: { monthlyKwh: 300, isPersonalUsage: false, householdSize: 0 },
    });
    const ctx = buildApplicabilityContext(profile, makeResult(), []);
    // Math.max(1, 0) = 1, so 300 / 1 = 300
    expect(ctx.personalMonthlyKwh).toBe(300);
  });

  it('aggregates flight legs to determine hasFlights', () => {
    const ctx = buildApplicabilityContext(makeProfile(), makeResult(), []);
    expect(ctx.hasFlights).toBe(true);
    expect(ctx.shortHaulLegs).toBe(4);
    expect(ctx.longHaulLegs).toBe(1);
  });

  it('sets hasFlights to false when all legs are 0', () => {
    const profile = makeProfile({
      flights: { shortHaulLegs: 0, mediumHaulLegs: 0, longHaulLegs: 0 },
    });
    const ctx = buildApplicabilityContext(profile, makeResult(), []);
    expect(ctx.hasFlights).toBe(false);
  });

  it('extracts topDriverCategories from result', () => {
    const ctx = buildApplicabilityContext(makeProfile(), makeResult(), []);
    expect(ctx.topDriverCategories).toEqual(['transport', 'flights']);
  });

  it('separates completed and dismissed action IDs', () => {
    const trackedActions: TrackedAction[] = [
      {
        actionId: 'reduce-car',
        status: 'completed',
        plannedAt: null,
        completedAt: new Date().toISOString(),
        notes: '',
      },
      {
        actionId: 'switch-diet',
        status: 'dismissed',
        plannedAt: null,
        completedAt: null,
        notes: '',
      },
      {
        actionId: 'reduce-flights',
        status: 'planned',
        plannedAt: new Date().toISOString(),
        completedAt: null,
        notes: '',
      },
    ];
    const ctx = buildApplicabilityContext(makeProfile(), makeResult(), trackedActions);
    expect(ctx.completedActionIds.has('reduce-car')).toBe(true);
    expect(ctx.dismissedActionIds.has('switch-diet')).toBe(true);
    // 'planned' should not appear in either set
    expect(ctx.completedActionIds.has('reduce-flights')).toBe(false);
    expect(ctx.dismissedActionIds.has('reduce-flights')).toBe(false);
  });

  it('passes through personalization preferences', () => {
    const ctx = buildApplicabilityContext(makeProfile(), makeResult(), []);
    expect(ctx.diet).toBe('heavy-meat');
    expect(ctx.effortPreference).toBe('medium');
    expect(ctx.budgetSensitivity).toBe('medium');
  });
});
