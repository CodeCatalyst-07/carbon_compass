/**
 * Flight emissions calculator.
 * Pure function: flight profile → CategoryBreakdown
 *
 * Formula: Σ (legs × averageDistanceForHaul × factor[haul])
 * Legs are ONE-WAY flight legs per year.
 */

import type { CategoryBreakdown } from '../../storage/schemas';
import { getFactor, AVERAGE_FLIGHT_DISTANCES_KM } from '../factors/registry';
import { annualToMonthly } from '../units';

interface FlightsInput {
  shortHaulLegs: number;
  mediumHaulLegs: number;
  longHaulLegs: number;
}

interface HaulConfig {
  factorId: string;
  legs: number;
  averageKm: number;
  label: string;
}

export function calculateFlights(input: FlightsInput): CategoryBreakdown {
  const hauls: HaulConfig[] = [
    {
      factorId: 'flights.short_haul',
      legs: input.shortHaulLegs,
      averageKm: AVERAGE_FLIGHT_DISTANCES_KM.shortHaul,
      label: 'short-haul',
    },
    {
      factorId: 'flights.medium_haul',
      legs: input.mediumHaulLegs,
      averageKm: AVERAGE_FLIGHT_DISTANCES_KM.mediumHaul,
      label: 'medium-haul',
    },
    {
      factorId: 'flights.long_haul',
      legs: input.longHaulLegs,
      averageKm: AVERAGE_FLIGHT_DISTANCES_KM.longHaul,
      label: 'long-haul',
    },
  ];

  let totalAnnualKg = 0;
  const factorsUsed: string[] = [];
  const methodologyParts: string[] = [];

  for (const haul of hauls) {
    if (haul.legs > 0) {
      const factor = getFactor(haul.factorId);
      const totalKm = haul.legs * haul.averageKm;
      const kgCO2e = totalKm * factor.value;

      totalAnnualKg += kgCO2e;
      factorsUsed.push(haul.factorId);

      methodologyParts.push(
        `${haul.label}: ${haul.legs} legs × ${haul.averageKm} km × ${factor.value} ${factor.unit} = ${kgCO2e.toFixed(1)} kg CO2e/year`,
      );
    }
  }

  return {
    category: 'flights',
    annualKgCO2e: totalAnnualKg,
    monthlyKgCO2e: annualToMonthly(totalAnnualKg),
    percentage: 0, // Set by orchestrator
    factorsUsed,
    methodology: methodologyParts.length > 0 ? methodologyParts.join('; ') : 'No flights reported.',
  };
}
