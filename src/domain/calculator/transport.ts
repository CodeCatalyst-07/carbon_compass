/**
 * Transport emissions calculator.
 * Pure function: profile → CategoryBreakdown
 *
 * Formula: Σ (mode.weeklyDistanceKm × 52 × factor[mode])
 * Distance is TOTAL WEEKLY — NOT doubled for round trips.
 */

import type { CategoryBreakdown, TransportMode } from '../../storage/schemas';
import { getFactor } from '../factors/registry';
import { weeklyToAnnual, annualToMonthly } from '../units';

const MODE_FACTOR_MAP: Record<TransportMode, string> = {
  car: 'transport.car.average',
  bus: 'transport.bus.average',
  train: 'transport.train.average',
  bicycle: 'transport.bicycle',
  walk: 'transport.walk',
};

interface TransportInput {
  modes: Array<{
    mode: TransportMode;
    weeklyDistanceKm: number;
  }>;
}

export function calculateTransport(input: TransportInput): CategoryBreakdown {
  let totalAnnualKg = 0;
  const factorsUsed: string[] = [];
  const methodologyParts: string[] = [];

  for (const entry of input.modes) {
    const factorId = MODE_FACTOR_MAP[entry.mode];
    const factor = getFactor(factorId);
    const annualKm = weeklyToAnnual(entry.weeklyDistanceKm);
    const annualKg = annualKm * factor.value;

    totalAnnualKg += annualKg;
    factorsUsed.push(factorId);

    if (entry.weeklyDistanceKm > 0) {
      methodologyParts.push(
        `${entry.mode}: ${entry.weeklyDistanceKm} km/week × 52 weeks × ${factor.value} ${factor.unit} = ${annualKg.toFixed(1)} kg CO2e/year`,
      );
    }
  }

  return {
    category: 'transport',
    annualKgCO2e: totalAnnualKg,
    monthlyKgCO2e: annualToMonthly(totalAnnualKg),
    percentage: 0, // Set by orchestrator after aggregation
    factorsUsed,
    methodology:
      methodologyParts.length > 0
        ? methodologyParts.join('; ')
        : 'No motorised transport reported.',
  };
}
