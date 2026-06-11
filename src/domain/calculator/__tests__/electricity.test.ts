import { describe, it, expect } from 'vitest';
import { calculateElectricity } from '../electricity';

describe('Electricity Calculator', () => {
  it('calculates personal usage correctly', () => {
    const result = calculateElectricity({
      monthlyKwh: 300,
      isPersonalUsage: true,
      householdSize: 1,
    });
    // 300 kWh/month × 12 × 0.494 = 1778.4 kg/year
    expect(result.annualKgCO2e).toBeCloseTo(1778.4, 1);
    expect(result.monthlyKgCO2e).toBeCloseTo(1778.4 / 12, 1);
    expect(result.category).toBe('electricity');
  });

  it('divides household usage by household size', () => {
    const result = calculateElectricity({
      monthlyKwh: 600,
      isPersonalUsage: false,
      householdSize: 3,
    });
    // Personal: 600/3 = 200 kWh/month
    // 200 × 12 × 0.494 = 1185.6 kg/year
    expect(result.annualKgCO2e).toBeCloseTo(1185.6, 1);
  });

  it('handles household size of 1 (no division needed)', () => {
    const personal = calculateElectricity({
      monthlyKwh: 300,
      isPersonalUsage: true,
      householdSize: 1,
    });
    const household = calculateElectricity({
      monthlyKwh: 300,
      isPersonalUsage: false,
      householdSize: 1,
    });
    expect(personal.annualKgCO2e).toBeCloseTo(household.annualKgCO2e, 1);
  });

  it('returns zero for zero kWh', () => {
    const result = calculateElectricity({
      monthlyKwh: 0,
      isPersonalUsage: true,
      householdSize: 1,
    });
    expect(result.annualKgCO2e).toBe(0);
  });

  it('never divides by zero (householdSize clamped to 1)', () => {
    // Math.max(1, householdSize) prevents division by zero
    const result = calculateElectricity({
      monthlyKwh: 300,
      isPersonalUsage: false,
      householdSize: 0,
    });
    // Should treat as household of 1
    expect(Number.isFinite(result.annualKgCO2e)).toBe(true);
    expect(result.annualKgCO2e).toBeCloseTo(300 * 12 * 0.494, 1);
  });

  it('includes attribution in methodology', () => {
    const household = calculateElectricity({
      monthlyKwh: 600,
      isPersonalUsage: false,
      householdSize: 4,
    });
    expect(household.methodology).toContain('÷ 4 people');

    const personal = calculateElectricity({
      monthlyKwh: 300,
      isPersonalUsage: true,
      householdSize: 1,
    });
    expect(personal.methodology).toContain('personal usage');
  });

  it('handles large kWh values', () => {
    const result = calculateElectricity({
      monthlyKwh: 10000,
      isPersonalUsage: true,
      householdSize: 1,
    });
    expect(Number.isFinite(result.annualKgCO2e)).toBe(true);
    expect(result.annualKgCO2e).toBeCloseTo(10000 * 12 * 0.494, 0);
  });
});
