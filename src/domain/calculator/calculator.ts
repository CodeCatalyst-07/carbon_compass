/**
 * Footprint calculator orchestrator.
 * Pure function: UserProfile → FootprintResult
 *
 * Pipeline: profile → per-category calculators → aggregate → top drivers → result
 */

import type { UserProfile, FootprintResult, CategoryBreakdown } from '../../storage/schemas';
import { FACTOR_REGISTRY } from '../factors/registry';
import { annualToMonthly } from '../units';
import { calculateTransport } from './transport';
import { calculateElectricity } from './electricity';
import { calculateDiet } from './diet';
import { calculateFlights } from './flights';
import { identifyTopDrivers } from './top-drivers';

/**
 * Calculate the complete carbon footprint from a user profile.
 *
 * All calculations are deterministic pure functions using the factor registry.
 * No AI or external calls are involved.
 */
export function calculateFootprint(profile: UserProfile): FootprintResult {
  // 1. Run per-category calculators
  const transport = calculateTransport(profile.transport);
  const electricity = calculateElectricity(profile.electricity);
  const diet = calculateDiet(profile.diet);
  const flights = calculateFlights(profile.flights);

  // 2. Aggregate totals
  const breakdown: CategoryBreakdown[] = [transport, electricity, diet, flights];
  const totalAnnualKgCO2e = breakdown.reduce((sum, b) => sum + b.annualKgCO2e, 0);

  // 3. Calculate percentages (safe against zero total)
  if (totalAnnualKgCO2e > 0) {
    for (const b of breakdown) {
      b.percentage = Math.round((b.annualKgCO2e / totalAnnualKgCO2e) * 1000) / 10;
    }
  }

  // 4. Identify top drivers
  const topDrivers = identifyTopDrivers(breakdown, totalAnnualKgCO2e);

  return {
    totalAnnualKgCO2e,
    totalMonthlyKgCO2e: annualToMonthly(totalAnnualKgCO2e),
    breakdown,
    topDrivers,
    factorRegistryVersion: FACTOR_REGISTRY.version,
    calculatedAt: new Date().toISOString(),
    isEstimate: true,
  };
}
