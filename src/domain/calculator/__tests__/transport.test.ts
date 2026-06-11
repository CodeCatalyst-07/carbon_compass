import { describe, it, expect } from 'vitest';
import { calculateTransport } from '../transport';

describe('Transport Calculator', () => {
  it('calculates car-only emissions correctly', () => {
    const result = calculateTransport({
      modes: [{ mode: 'car', weeklyDistanceKm: 100 }],
    });
    // 100 km/week × 52 weeks × 0.17140 kg/km = 891.28 kg/year
    expect(result.annualKgCO2e).toBeCloseTo(891.28, 1);
    expect(result.monthlyKgCO2e).toBeCloseTo(891.28 / 12, 1);
    expect(result.category).toBe('transport');
    expect(result.factorsUsed).toContain('transport.car.average');
  });

  it('sums multiple modes correctly', () => {
    const result = calculateTransport({
      modes: [
        { mode: 'car', weeklyDistanceKm: 50 },
        { mode: 'bus', weeklyDistanceKm: 30 },
        { mode: 'train', weeklyDistanceKm: 20 },
      ],
    });
    // car: 50 × 52 × 0.17140 = 445.64
    // bus: 30 × 52 × 0.10312 = 160.8672
    // train: 20 × 52 × 0.03549 = 36.9096
    const expected = 445.64 + 160.8672 + 36.9096;
    expect(result.annualKgCO2e).toBeCloseTo(expected, 1);
    expect(result.factorsUsed).toHaveLength(3);
  });

  it('returns zero for zero distance', () => {
    const result = calculateTransport({
      modes: [{ mode: 'car', weeklyDistanceKm: 0 }],
    });
    expect(result.annualKgCO2e).toBe(0);
    expect(result.monthlyKgCO2e).toBe(0);
  });

  it('returns zero for zero-emission modes only', () => {
    const result = calculateTransport({
      modes: [
        { mode: 'bicycle', weeklyDistanceKm: 50 },
        { mode: 'walk', weeklyDistanceKm: 10 },
      ],
    });
    expect(result.annualKgCO2e).toBe(0);
  });

  it('handles empty modes array', () => {
    const result = calculateTransport({ modes: [] });
    expect(result.annualKgCO2e).toBe(0);
    expect(result.methodology).toBe('No motorised transport reported.');
  });

  it('does NOT double distance (no hidden round-trip multiplier)', () => {
    const result = calculateTransport({
      modes: [{ mode: 'car', weeklyDistanceKm: 100 }],
    });
    // Should be exactly 100 × 52 × factor, not 200 × 52 × factor
    const singleTrip = 100 * 52 * 0.1714;
    expect(result.annualKgCO2e).toBeCloseTo(singleTrip, 1);
  });

  it('includes methodology text for active modes', () => {
    const result = calculateTransport({
      modes: [{ mode: 'car', weeklyDistanceKm: 50 }],
    });
    expect(result.methodology).toContain('car');
    expect(result.methodology).toContain('50 km/week');
    expect(result.methodology).toContain('52 weeks');
  });

  it('handles very large distance values without error', () => {
    const result = calculateTransport({
      modes: [{ mode: 'car', weeklyDistanceKm: 5000 }],
    });
    expect(result.annualKgCO2e).toBeCloseTo(5000 * 52 * 0.1714, 0);
    expect(Number.isFinite(result.annualKgCO2e)).toBe(true);
  });
});
