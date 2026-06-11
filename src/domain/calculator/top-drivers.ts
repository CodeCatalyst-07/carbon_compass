/**
 * Top driver identification from category breakdown.
 * Pure function: breakdown[] → 0–2 TopDriver entries.
 *
 * Rules:
 * 1. If totalAnnualKgCO2e === 0, return empty array (no division).
 * 2. Sort categories descending by percentage.
 * 3. Return at most 2 entries where percentage > 0.
 * 4. Generate human-readable reason for each.
 */

import type { CategoryBreakdown, TopDriver, Category } from '../../storage/schemas';

const CATEGORY_LABELS: Record<Category, string> = {
  transport: 'Personal transport',
  electricity: 'Home electricity',
  diet: 'Diet',
  flights: 'Air travel',
};

export function identifyTopDrivers(
  breakdown: CategoryBreakdown[],
  totalAnnualKgCO2e: number,
): TopDriver[] {
  // Zero total — no meaningful drivers
  if (totalAnnualKgCO2e === 0) {
    return [];
  }

  // Sort descending by annual emissions
  const sorted = [...breakdown]
    .filter((b) => b.annualKgCO2e > 0)
    .sort((a, b) => b.annualKgCO2e - a.annualKgCO2e);

  // Take at most 2
  const topDrivers: TopDriver[] = [];

  for (const entry of sorted.slice(0, 2)) {
    const percentage = (entry.annualKgCO2e / totalAnnualKgCO2e) * 100;
    const label = CATEGORY_LABELS[entry.category];

    topDrivers.push({
      category: entry.category,
      percentage: Math.round(percentage * 10) / 10, // 1 decimal
      reason: `${label} contributes ${Math.round(percentage)}% of your footprint.`,
    });
  }

  return topDrivers;
}
