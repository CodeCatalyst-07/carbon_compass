/**
 * Diet emissions calculator.
 * Pure function: diet profile → CategoryBreakdown
 *
 * Formula: factor[dietProfile] × 365
 * Factor is daily kg CO2e from food consumption.
 */

import type { CategoryBreakdown, DietProfile } from '../../storage/schemas';
import { getFactor } from '../factors/registry';
import { dailyToAnnual, annualToMonthly } from '../units';

const DIET_FACTOR_MAP: Record<DietProfile, string> = {
  'heavy-meat': 'diet.heavy_meat',
  vegetarian: 'diet.vegetarian',
  vegan: 'diet.vegan',
};

export function calculateDiet(diet: DietProfile): CategoryBreakdown {
  const factorId = DIET_FACTOR_MAP[diet];
  const factor = getFactor(factorId);

  const annualKg = dailyToAnnual(factor.value);

  const methodology = `${diet} diet: ${factor.value} ${factor.unit} × 365 days = ${annualKg.toFixed(1)} kg CO2e/year`;

  return {
    category: 'diet',
    annualKgCO2e: annualKg,
    monthlyKgCO2e: annualToMonthly(annualKg),
    percentage: 0, // Set by orchestrator
    factorsUsed: [factorId],
    methodology,
  };
}
