import { describe, it, expect } from 'vitest';
import { calculateDiet } from '../diet';

describe('Diet Calculator', () => {
  it('calculates heavy-meat diet correctly', () => {
    const result = calculateDiet('heavy-meat');
    // 7.19 kg/day × 365 = 2624.35 kg/year
    expect(result.annualKgCO2e).toBeCloseTo(2624.35, 1);
    expect(result.category).toBe('diet');
    expect(result.factorsUsed).toContain('diet.heavy_meat');
  });

  it('calculates vegetarian diet correctly', () => {
    const result = calculateDiet('vegetarian');
    // 3.81 kg/day × 365 = 1390.65 kg/year
    expect(result.annualKgCO2e).toBeCloseTo(1390.65, 1);
  });

  it('calculates vegan diet correctly', () => {
    const result = calculateDiet('vegan');
    // 2.89 kg/day × 365 = 1054.85 kg/year
    expect(result.annualKgCO2e).toBeCloseTo(1054.85, 1);
  });

  it('vegan < vegetarian < heavy-meat', () => {
    const vegan = calculateDiet('vegan');
    const vegetarian = calculateDiet('vegetarian');
    const heavyMeat = calculateDiet('heavy-meat');
    expect(vegan.annualKgCO2e).toBeLessThan(vegetarian.annualKgCO2e);
    expect(vegetarian.annualKgCO2e).toBeLessThan(heavyMeat.annualKgCO2e);
  });

  it('includes diet type in methodology', () => {
    const result = calculateDiet('vegetarian');
    expect(result.methodology).toContain('vegetarian');
    expect(result.methodology).toContain('365 days');
  });

  it('monthly is annual/12', () => {
    const result = calculateDiet('heavy-meat');
    expect(result.monthlyKgCO2e).toBeCloseTo(result.annualKgCO2e / 12, 1);
  });
});
