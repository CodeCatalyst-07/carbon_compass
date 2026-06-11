import { describe, it, expect } from 'vitest';
import { calculateFlights } from '../flights';

describe('Flights Calculator', () => {
  it('calculates short-haul flights correctly', () => {
    const result = calculateFlights({
      shortHaulLegs: 4,
      mediumHaulLegs: 0,
      longHaulLegs: 0,
    });
    // 4 legs × 1100 km × 0.25493 = 1121.69 kg/year
    expect(result.annualKgCO2e).toBeCloseTo(1121.69, 0);
    expect(result.factorsUsed).toContain('flights.short_haul');
  });

  it('calculates long-haul flights correctly', () => {
    const result = calculateFlights({
      shortHaulLegs: 0,
      mediumHaulLegs: 0,
      longHaulLegs: 2,
    });
    // 2 legs × 6500 km × 0.19309 = 2510.17 kg/year
    expect(result.annualKgCO2e).toBeCloseTo(2510.17, 0);
  });

  it('sums all haul categories', () => {
    const result = calculateFlights({
      shortHaulLegs: 2,
      mediumHaulLegs: 2,
      longHaulLegs: 1,
    });
    // short: 2 × 1100 × 0.25493 = 560.846
    // medium: 2 × 2800 × 0.18362 = 1028.272
    // long: 1 × 6500 × 0.19309 = 1255.085
    const expected = 560.846 + 1028.272 + 1255.085;
    expect(result.annualKgCO2e).toBeCloseTo(expected, 0);
    expect(result.factorsUsed).toHaveLength(3);
  });

  it('returns zero for zero flights', () => {
    const result = calculateFlights({
      shortHaulLegs: 0,
      mediumHaulLegs: 0,
      longHaulLegs: 0,
    });
    expect(result.annualKgCO2e).toBe(0);
    expect(result.methodology).toBe('No flights reported.');
  });

  it('handles single haul category only', () => {
    const result = calculateFlights({
      shortHaulLegs: 0,
      mediumHaulLegs: 4,
      longHaulLegs: 0,
    });
    expect(result.factorsUsed).toEqual(['flights.medium_haul']);
    expect(result.annualKgCO2e).toBeCloseTo(4 * 2800 * 0.18362, 0);
  });

  it('legs are treated as one-way', () => {
    // 2 legs should NOT be doubled to 4
    const twoLegs = calculateFlights({
      shortHaulLegs: 2,
      mediumHaulLegs: 0,
      longHaulLegs: 0,
    });
    const fourLegs = calculateFlights({
      shortHaulLegs: 4,
      mediumHaulLegs: 0,
      longHaulLegs: 0,
    });
    expect(fourLegs.annualKgCO2e).toBeCloseTo(twoLegs.annualKgCO2e * 2, 1);
  });

  it('includes haul category in methodology', () => {
    const result = calculateFlights({
      shortHaulLegs: 2,
      mediumHaulLegs: 0,
      longHaulLegs: 1,
    });
    expect(result.methodology).toContain('short-haul');
    expect(result.methodology).toContain('long-haul');
  });
});
