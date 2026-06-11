import { describe, it, expect } from 'vitest';
import {
  milesToKm,
  kmToMiles,
  kgToTonnes,
  tonnesToKg,
  weeklyToAnnual,
  monthlyToAnnual,
  annualToMonthly,
  dailyToAnnual,
  formatCO2e,
  validateNonNegative,
  validatePositiveInteger,
  clampWithMessage,
} from '../units';

describe('Distance conversions', () => {
  it('converts miles to km', () => {
    expect(milesToKm(1)).toBeCloseTo(1.60934, 4);
    expect(milesToKm(0)).toBe(0);
    expect(milesToKm(62.1371)).toBeCloseTo(100, 0);
  });

  it('converts km to miles', () => {
    expect(kmToMiles(1.60934)).toBeCloseTo(1, 4);
    expect(kmToMiles(0)).toBe(0);
    expect(kmToMiles(100)).toBeCloseTo(62.1371, 0);
  });

  it('round-trips correctly', () => {
    expect(milesToKm(kmToMiles(42))).toBeCloseTo(42, 8);
    expect(kmToMiles(milesToKm(42))).toBeCloseTo(42, 8);
  });
});

describe('Mass conversions', () => {
  it('converts kg to tonnes', () => {
    expect(kgToTonnes(1000)).toBe(1);
    expect(kgToTonnes(0)).toBe(0);
    expect(kgToTonnes(500)).toBe(0.5);
  });

  it('converts tonnes to kg', () => {
    expect(tonnesToKg(1)).toBe(1000);
    expect(tonnesToKg(0)).toBe(0);
    expect(tonnesToKg(2.5)).toBe(2500);
  });

  it('round-trips correctly', () => {
    expect(kgToTonnes(tonnesToKg(3.14))).toBeCloseTo(3.14, 8);
  });
});

describe('Period conversions', () => {
  it('weekly to annual', () => {
    expect(weeklyToAnnual(10)).toBe(520);
    expect(weeklyToAnnual(0)).toBe(0);
  });

  it('monthly to annual', () => {
    expect(monthlyToAnnual(100)).toBe(1200);
    expect(monthlyToAnnual(0)).toBe(0);
  });

  it('annual to monthly', () => {
    expect(annualToMonthly(1200)).toBe(100);
    expect(annualToMonthly(0)).toBe(0);
  });

  it('daily to annual', () => {
    expect(dailyToAnnual(1)).toBe(365);
    expect(dailyToAnnual(0)).toBe(0);
  });

  it('monthly ↔ annual round-trips', () => {
    expect(annualToMonthly(monthlyToAnnual(42))).toBeCloseTo(42, 8);
  });
});

describe('formatCO2e', () => {
  it('formats kg values', () => {
    expect(formatCO2e(1234.5, 'kg')).toBe('1234.5 kg');
    expect(formatCO2e(100, 'kg')).toBe('100.0 kg');
  });

  it('formats small kg values as grams', () => {
    expect(formatCO2e(0.5, 'kg')).toBe('500 g');
  });

  it('formats tonnes', () => {
    expect(formatCO2e(5000, 'tonnes')).toBe('5.00 t');
    expect(formatCO2e(1234, 'tonnes')).toBe('1.23 t');
  });

  it('formats very small tonnes as kg', () => {
    expect(formatCO2e(5, 'tonnes')).toBe('5.0 kg');
  });

  it('formats zero', () => {
    expect(formatCO2e(0, 'kg')).toBe('0.0 kg');
    expect(formatCO2e(0, 'tonnes')).toBe('0.00 t');
  });
});

describe('validateNonNegative', () => {
  it('accepts valid values', () => {
    expect(validateNonNegative(0, 'test').valid).toBe(true);
    expect(validateNonNegative(100, 'test').valid).toBe(true);
  });

  it('rejects negative', () => {
    const result = validateNonNegative(-1, 'Distance');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Distance');
  });

  it('rejects NaN', () => {
    expect(validateNonNegative(NaN, 'test').valid).toBe(false);
  });

  it('rejects Infinity', () => {
    expect(validateNonNegative(Infinity, 'test').valid).toBe(false);
  });
});

describe('validatePositiveInteger', () => {
  it('accepts valid integers', () => {
    expect(validatePositiveInteger(1, 'test').valid).toBe(true);
    expect(validatePositiveInteger(100, 'test').valid).toBe(true);
  });

  it('rejects zero', () => {
    expect(validatePositiveInteger(0, 'test').valid).toBe(false);
  });

  it('rejects decimals', () => {
    expect(validatePositiveInteger(1.5, 'test').valid).toBe(false);
  });

  it('rejects negative', () => {
    expect(validatePositiveInteger(-3, 'test').valid).toBe(false);
  });
});

describe('clampWithMessage', () => {
  it('returns value unchanged when in range', () => {
    const result = clampWithMessage(50, 0, 100, 'test');
    expect(result.value).toBe(50);
    expect(result.clamped).toBe(false);
  });

  it('clamps below minimum', () => {
    const result = clampWithMessage(-5, 0, 100, 'Distance');
    expect(result.value).toBe(0);
    expect(result.clamped).toBe(true);
    expect(result.message).toContain('minimum');
  });

  it('clamps above maximum', () => {
    const result = clampWithMessage(150, 0, 100, 'Distance');
    expect(result.value).toBe(100);
    expect(result.clamped).toBe(true);
    expect(result.message).toContain('maximum');
  });
});
