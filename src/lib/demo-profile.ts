/**
 * Demo profile factory.
 *
 * Provides a realistic sample profile for the "Load sample data" shortcut.
 * This data is ALWAYS clearly labeled as sample data in the UI.
 * Never disguise sample data as real user data.
 *
 * Represents a UK-based commuter with:
 * - 50 km/week car + 20 km/week train
 * - 300 kWh/month household electricity (2-person household)
 * - Heavy-meat diet
 * - 4 short-haul + 2 medium-haul + 1 long-haul flights/year
 * - Medium effort/budget preferences
 * - 20% reduction goal
 *
 * Estimated footprint: ~5–6 tonnes CO2e/year
 */

import type { UserProfile } from '../storage/schemas';

export const DEMO_PROFILE: UserProfile = {
  transport: {
    modes: [
      { mode: 'car', weeklyDistanceKm: 50 },
      { mode: 'train', weeklyDistanceKm: 20 },
    ],
  },
  electricity: {
    monthlyKwh: 300,
    isPersonalUsage: false,
    householdSize: 2,
  },
  diet: 'heavy-meat',
  flights: {
    shortHaulLegs: 4,
    mediumHaulLegs: 2,
    longHaulLegs: 1,
  },
  personalization: {
    reductionGoalPercent: 20,
    effortPreference: 'medium',
    budgetSensitivity: 'medium',
  },
};

/** Label shown in the UI to identify demo data. */
export const DEMO_PROFILE_LABEL = 'Sample data — a UK commuter with typical habits';
