/**
 * Unit conversion and validation utilities.
 * Pure TypeScript — zero React imports.
 */

const KM_PER_MILE = 1.60934;

// ─── Distance Conversions ───

export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

// ─── Mass Conversions ───

export function kgToTonnes(kg: number): number {
  return kg / 1000;
}

export function tonnesToKg(tonnes: number): number {
  return tonnes * 1000;
}

// ─── Period Conversions ───

export function weeklyToAnnual(weekly: number): number {
  return weekly * 52;
}

export function monthlyToAnnual(monthly: number): number {
  return monthly * 12;
}

export function annualToMonthly(annual: number): number {
  return annual / 12;
}

export function dailyToAnnual(daily: number): number {
  return daily * 365;
}

// ─── Display Formatting ───

export type DisplayUnit = 'kg' | 'tonnes';

/**
 * Format a kg CO2e value for display, using the user's preferred unit.
 */
export function formatCO2e(kgCO2e: number, unit: DisplayUnit): string {
  if (unit === 'tonnes') {
    const tonnes = kgToTonnes(kgCO2e);
    if (tonnes < 0.01 && tonnes > 0) {
      return `${(tonnes * 1000).toFixed(1)} kg`;
    }
    return `${tonnes.toFixed(2)} t`;
  }
  if (kgCO2e < 1 && kgCO2e > 0) {
    return `${(kgCO2e * 1000).toFixed(0)} g`;
  }
  return `${kgCO2e.toFixed(1)} kg`;
}

// ─── Validation ───

export interface ValidationResult {
  valid: boolean;
  message: string;
}

/**
 * Validate a numeric input is a finite, non-negative number.
 */
export function validateNonNegative(value: number, fieldName: string): ValidationResult {
  if (!Number.isFinite(value)) {
    return { valid: false, message: `${fieldName} must be a valid number.` };
  }
  if (value < 0) {
    return { valid: false, message: `${fieldName} cannot be negative.` };
  }
  return { valid: true, message: '' };
}

/**
 * Validate a numeric input is a finite, positive integer.
 */
export function validatePositiveInteger(value: number, fieldName: string): ValidationResult {
  if (!Number.isFinite(value)) {
    return { valid: false, message: `${fieldName} must be a valid number.` };
  }
  if (value < 1) {
    return { valid: false, message: `${fieldName} must be at least 1.` };
  }
  if (!Number.isInteger(value)) {
    return { valid: false, message: `${fieldName} must be a whole number.` };
  }
  return { valid: true, message: '' };
}

/**
 * Clamp a value within a reasonable range with a friendly message.
 */
export function clampWithMessage(
  value: number,
  min: number,
  max: number,
  fieldName: string,
): { value: number; clamped: boolean; message: string } {
  if (value < min) {
    return { value: min, clamped: true, message: `${fieldName} adjusted to minimum (${min}).` };
  }
  if (value > max) {
    return { value: max, clamped: true, message: `${fieldName} adjusted to maximum (${max}).` };
  }
  return { value, clamped: false, message: '' };
}

// ─── Reasonable Bounds ───
// Used by the questionnaire to clamp or reject impossible values

/** Max weekly distance for any single transport mode (km) */
export const MAX_WEEKLY_DISTANCE_KM = 5000;

/** Max monthly electricity (kWh) — covers very large households */
export const MAX_MONTHLY_KWH = 10000;

/** Max flight legs per year per haul category */
export const MAX_FLIGHT_LEGS_PER_YEAR = 200;

/** Max household size */
export const MAX_HOUSEHOLD_SIZE = 20;
