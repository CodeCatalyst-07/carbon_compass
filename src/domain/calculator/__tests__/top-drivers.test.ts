import { describe, it, expect } from 'vitest';
import { identifyTopDrivers } from '../top-drivers';
import type { CategoryBreakdown } from '../../../storage/schemas';

function makeBreakdown(
  overrides: Partial<CategoryBreakdown> & {
    category: CategoryBreakdown['category'];
    annualKgCO2e: number;
  },
): CategoryBreakdown {
  return {
    monthlyKgCO2e: overrides.annualKgCO2e / 12,
    percentage: 0,
    factorsUsed: [],
    methodology: '',
    ...overrides,
  };
}

describe('Top Drivers', () => {
  it('returns empty array when total is 0', () => {
    const breakdown = [
      makeBreakdown({ category: 'transport', annualKgCO2e: 0 }),
      makeBreakdown({ category: 'diet', annualKgCO2e: 0 }),
    ];
    const result = identifyTopDrivers(breakdown, 0);
    expect(result).toEqual([]);
  });

  it('returns 1 driver when only one category has emissions', () => {
    const breakdown = [
      makeBreakdown({ category: 'transport', annualKgCO2e: 1000 }),
      makeBreakdown({ category: 'diet', annualKgCO2e: 0 }),
      makeBreakdown({ category: 'electricity', annualKgCO2e: 0 }),
      makeBreakdown({ category: 'flights', annualKgCO2e: 0 }),
    ];
    const result = identifyTopDrivers(breakdown, 1000);
    expect(result).toHaveLength(1);
    expect(result[0]!.category).toBe('transport');
    expect(result[0]!.percentage).toBeCloseTo(100, 0);
  });

  it('returns at most 2 drivers even with 4 categories', () => {
    const breakdown = [
      makeBreakdown({ category: 'transport', annualKgCO2e: 400 }),
      makeBreakdown({ category: 'diet', annualKgCO2e: 300 }),
      makeBreakdown({ category: 'electricity', annualKgCO2e: 200 }),
      makeBreakdown({ category: 'flights', annualKgCO2e: 100 }),
    ];
    const result = identifyTopDrivers(breakdown, 1000);
    expect(result).toHaveLength(2);
  });

  it('sorts drivers by emission magnitude descending', () => {
    const breakdown = [
      makeBreakdown({ category: 'diet', annualKgCO2e: 200 }),
      makeBreakdown({ category: 'flights', annualKgCO2e: 800 }),
    ];
    const result = identifyTopDrivers(breakdown, 1000);
    expect(result[0]!.category).toBe('flights');
    expect(result[1]!.category).toBe('diet');
  });

  it('calculates percentage correctly', () => {
    const breakdown = [
      makeBreakdown({ category: 'transport', annualKgCO2e: 450 }),
      makeBreakdown({ category: 'diet', annualKgCO2e: 550 }),
    ];
    const result = identifyTopDrivers(breakdown, 1000);
    expect(result[0]!.percentage).toBeCloseTo(55, 0);
    expect(result[1]!.percentage).toBeCloseTo(45, 0);
  });

  it('includes human-readable reason', () => {
    const breakdown = [makeBreakdown({ category: 'transport', annualKgCO2e: 1000 })];
    const result = identifyTopDrivers(breakdown, 1000);
    expect(result[0]!.reason).toContain('Personal transport');
    expect(result[0]!.reason).toContain('100%');
  });

  it('handles balanced categories', () => {
    const breakdown = [
      makeBreakdown({ category: 'transport', annualKgCO2e: 250 }),
      makeBreakdown({ category: 'electricity', annualKgCO2e: 250 }),
      makeBreakdown({ category: 'diet', annualKgCO2e: 250 }),
      makeBreakdown({ category: 'flights', annualKgCO2e: 250 }),
    ];
    const result = identifyTopDrivers(breakdown, 1000);
    expect(result).toHaveLength(2);
    // Each is 25%
    expect(result[0]!.percentage).toBeCloseTo(25, 0);
  });
});
