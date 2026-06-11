import { describe, it, expect } from 'vitest';
import { simulateTransportSwap } from '../swap-simulator';

describe('Swap Simulator', () => {
  it('calculates car→bicycle swap correctly', () => {
    const result = simulateTransportSwap('car', 'bicycle', 50, 5000);
    // car: 50 × 52 × 0.17140 = 445.64
    // bicycle: 0
    expect(result.currentHabit.annualKgCO2e).toBeCloseTo(445.64, 1);
    expect(result.alternative.annualKgCO2e).toBe(0);
    expect(result.deltaKgCO2ePerYear).toBeCloseTo(445.64, 1);
  });

  it('calculates car→bus swap correctly', () => {
    const result = simulateTransportSwap('car', 'bus', 50, 5000);
    // car: 50 × 52 × 0.17140 = 445.64
    // bus: 50 × 52 × 0.10312 = 268.112
    expect(result.deltaKgCO2ePerYear).toBeCloseTo(445.64 - 268.112, 1);
  });

  it('calculates car→train swap correctly', () => {
    const result = simulateTransportSwap('car', 'train', 100, 5000);
    // car: 100 × 52 × 0.17140 = 891.28
    // train: 100 × 52 × 0.03549 = 184.548
    expect(result.deltaKgCO2ePerYear).toBeCloseTo(891.28 - 184.548, 1);
  });

  it('returns zero delta for same-mode swap', () => {
    const result = simulateTransportSwap('car', 'car', 100, 5000);
    expect(result.deltaKgCO2ePerYear).toBe(0);
    expect(result.deltaPercent).toBe(0);
  });

  it('returns zero delta for zero distance', () => {
    const result = simulateTransportSwap('car', 'bicycle', 0, 5000);
    expect(result.deltaKgCO2ePerYear).toBe(0);
  });

  it('calculates delta percentage correctly', () => {
    const total = 5000;
    const result = simulateTransportSwap('car', 'bicycle', 50, total);
    // delta = ~445.64, percentage = 445.64 / 5000 * 100 = ~8.9%
    expect(result.deltaPercent).toBeCloseTo((result.deltaKgCO2ePerYear / total) * 100, 1);
  });

  it('handles zero total footprint without division error', () => {
    const result = simulateTransportSwap('car', 'bicycle', 50, 0);
    expect(result.deltaPercent).toBe(0);
    expect(Number.isFinite(result.deltaPercent)).toBe(true);
  });

  it('includes descriptive labels', () => {
    const result = simulateTransportSwap('car', 'train', 75, 3000);
    expect(result.currentHabit.description).toContain('Driving');
    expect(result.currentHabit.description).toContain('75');
    expect(result.alternative.description).toContain('Train');
    expect(result.alternative.description).toContain('75');
  });

  it('negative delta means alternative is higher emission', () => {
    // bus → car: bus is cheaper, so swapping to car increases emissions
    const result = simulateTransportSwap('bus', 'car', 50, 5000);
    expect(result.deltaKgCO2ePerYear).toBeLessThan(0);
  });
});
