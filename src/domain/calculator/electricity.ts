/**
 * Electricity emissions calculator.
 * Pure function: profile → CategoryBreakdown
 *
 * Formula: monthlyKwh × 12 × factor[electricity]
 * If !isPersonalUsage: divide by householdSize first.
 */

import type { CategoryBreakdown } from '../../storage/schemas';
import { getFactor } from '../factors/registry';
import { monthlyToAnnual, annualToMonthly } from '../units';

interface ElectricityInput {
  monthlyKwh: number;
  isPersonalUsage: boolean;
  householdSize: number;
}

export function calculateElectricity(input: ElectricityInput): CategoryBreakdown {
  const factorId = 'electricity.grid.global_average';
  const factor = getFactor(factorId);

  // If household usage, attribute per person
  const personalMonthlyKwh = input.isPersonalUsage
    ? input.monthlyKwh
    : input.monthlyKwh / Math.max(1, input.householdSize);

  const annualKwh = monthlyToAnnual(personalMonthlyKwh);
  const annualKg = annualKwh * factor.value;

  const attribution = input.isPersonalUsage
    ? 'personal usage'
    : `household usage ÷ ${input.householdSize} people`;

  const methodology =
    `${input.monthlyKwh} kWh/month (${attribution}) → ` +
    `${personalMonthlyKwh.toFixed(1)} kWh/month personal × 12 months × ` +
    `${factor.value} ${factor.unit} = ${annualKg.toFixed(1)} kg CO2e/year`;

  return {
    category: 'electricity',
    annualKgCO2e: annualKg,
    monthlyKgCO2e: annualToMonthly(annualKg),
    percentage: 0, // Set by orchestrator
    factorsUsed: [factorId],
    methodology,
  };
}
