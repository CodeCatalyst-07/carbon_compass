/**
 * Swap simulator — "what if I change this habit?"
 *
 * Pure function: takes current mode + distance + alternative mode →
 * calculates both CO2e values from registry → returns SwapScenario with delta.
 */

import type { TransportMode } from '../../storage/schemas';
import { getFactor } from '../factors/registry';
import { weeklyToAnnual } from '../units';

export interface SwapScenario {
  currentHabit: {
    description: string;
    annualKgCO2e: number;
  };
  alternative: {
    description: string;
    annualKgCO2e: number;
  };
  /** Positive = savings (current is higher than alternative) */
  deltaKgCO2ePerYear: number;
  /** Percentage of current emissions saved */
  deltaPercent: number;
}

const MODE_FACTOR_MAP: Record<TransportMode, string> = {
  car: 'transport.car.average',
  bus: 'transport.bus.average',
  train: 'transport.train.average',
  bicycle: 'transport.bicycle',
  walk: 'transport.walk',
};

const MODE_LABELS: Record<TransportMode, string> = {
  car: 'Driving',
  bus: 'Bus',
  train: 'Train',
  bicycle: 'Cycling',
  walk: 'Walking',
};

/**
 * Simulate swapping one transport mode for another.
 *
 * @param currentMode - Current transport mode
 * @param alternativeMode - Proposed replacement mode
 * @param weeklyDistanceKm - Weekly distance for this journey (km)
 * @param totalAnnualKgCO2e - User's total annual footprint (for % calculation)
 * @returns SwapScenario with delta
 */
export function simulateTransportSwap(
  currentMode: TransportMode,
  alternativeMode: TransportMode,
  weeklyDistanceKm: number,
  totalAnnualKgCO2e: number,
): SwapScenario {
  const currentFactor = getFactor(MODE_FACTOR_MAP[currentMode]);
  const altFactor = getFactor(MODE_FACTOR_MAP[alternativeMode]);

  const annualKm = weeklyToAnnual(weeklyDistanceKm);
  const currentAnnualKg = annualKm * currentFactor.value;
  const altAnnualKg = annualKm * altFactor.value;
  const delta = currentAnnualKg - altAnnualKg;

  return {
    currentHabit: {
      description: `${MODE_LABELS[currentMode]} ${weeklyDistanceKm} km/week`,
      annualKgCO2e: currentAnnualKg,
    },
    alternative: {
      description: `${MODE_LABELS[alternativeMode]} ${weeklyDistanceKm} km/week`,
      annualKgCO2e: altAnnualKg,
    },
    deltaKgCO2ePerYear: delta,
    deltaPercent: totalAnnualKgCO2e > 0 ? (delta / totalAnnualKgCO2e) * 100 : 0,
  };
}
