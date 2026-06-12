/**
 * Factory for ApplicabilityContext.
 *
 * Extracts the shared context-building logic used by both the dashboard
 * and actions pages into a single, testable, pure-domain function.
 * Zero React imports — this is a domain utility.
 */

import type { UserProfile, FootprintResult, TrackedAction } from '../../storage/schemas';
import type { ApplicabilityContext } from './types';

/**
 * Build an ApplicabilityContext from a user profile, footprint result,
 * and tracked actions list.
 *
 * This is the single source of truth for deriving the context that
 * drives recommendation applicability, scoring, and savings estimates.
 */
export function buildApplicabilityContext(
  profile: UserProfile,
  result: FootprintResult,
  trackedActions: readonly TrackedAction[],
): ApplicabilityContext {
  const carEntry = profile.transport.modes.find((m) => m.mode === 'car');
  const personalKwh = profile.electricity.isPersonalUsage
    ? profile.electricity.monthlyKwh
    : profile.electricity.monthlyKwh / Math.max(1, profile.electricity.householdSize);

  const completedIds = new Set<string>();
  const dismissedIds = new Set<string>();
  for (const ta of trackedActions) {
    if (ta.status === 'completed') completedIds.add(ta.actionId);
    if (ta.status === 'dismissed') dismissedIds.add(ta.actionId);
  }

  return {
    diet: profile.diet,
    carKmPerWeek: carEntry?.weeklyDistanceKm ?? 0,
    usesCar: (carEntry?.weeklyDistanceKm ?? 0) > 0,
    hasFlights:
      profile.flights.shortHaulLegs +
        profile.flights.mediumHaulLegs +
        profile.flights.longHaulLegs >
      0,
    shortHaulLegs: profile.flights.shortHaulLegs,
    longHaulLegs: profile.flights.longHaulLegs,
    personalMonthlyKwh: personalKwh,
    topDriverCategories: result.topDrivers.map((d) => d.category),
    completedActionIds: completedIds,
    dismissedActionIds: dismissedIds,
    effortPreference: profile.personalization.effortPreference,
    budgetSensitivity: profile.personalization.budgetSensitivity,
  };
}
