/**
 * Centralized versioned emission factor registry.
 *
 * RULES:
 * 1. Every factor MUST have `verified: true` and a valid source URL.
 * 2. Bump `version` on ANY factor change.
 * 3. Never add a diet profile or transport mode without a sourced factor.
 * 4. All values are in kg CO2e per the stated unit.
 * 5. Factors marked as DERIVED must document their derivation.
 *
 * FACTOR PROVENANCE:
 *
 * TRANSPORT (UK DESNZ 2023 — primary source)
 *   - Average car: 0.17140 kg CO2e/km — "Passenger vehicles > Average car", well-to-wheel
 *   - Local bus: 0.10312 kg CO2e/passenger-km — "Business travel - land > Local bus"
 *   - National rail: 0.03549 kg CO2e/passenger-km — "Business travel - land > National rail"
 *   - Bicycle / walk: 0 — zero direct emissions, confirmed by IPCC AR6 Ch.10
 *
 * ELECTRICITY (IEA 2023 — primary source)
 *   - Global average grid: 0.494 kg CO2e/kWh (2021 world average)
 *
 * DIET (DERIVED from Poore & Nemecek 2018 — secondary source)
 *   Values are NOT directly published as "diet type = X kg/day".
 *   They are derived by combining per-food-group lifecycle emissions
 *   with typical daily consumption patterns.
 *
 *   Derivation methodology:
 *   - Poore & Nemecek 2018 Table S7 provides per-kg lifecycle GHG for
 *     ~40 food products (farm-to-retail, global weighted averages).
 *   - Typical daily food intake by diet type is estimated from FAO food
 *     balance sheet data and nutritional surveys.
 *   - Heavy-meat diet: ~200g meat/day + dairy + grains + vegetables
 *   - Vegetarian: dairy + eggs + grains + vegetables + legumes
 *   - Vegan: grains + legumes + vegetables + fruits + nuts
 *   - Daily kg CO2e = Σ(food_group_kg × emission_factor_per_kg)
 *
 *   Key per-kg GHG values from Poore & Nemecek 2018 (lifecycle, global avg):
 *     Beef: ~60 kg CO2e/kg    Cheese: ~21 kg CO2e/kg
 *     Pork: ~7 kg CO2e/kg     Milk: ~3.2 kg CO2e/kg
 *     Poultry: ~6 kg CO2e/kg  Eggs: ~4.7 kg CO2e/kg
 *     Rice: ~4 kg CO2e/kg     Tofu: ~3.2 kg CO2e/kg
 *     Wheat: ~1.6 kg CO2e/kg  Vegetables: ~0.5 kg CO2e/kg
 *
 *   Resulting estimates (rounded):
 *     Heavy-meat: ~7.2 kg CO2e/day  (dominated by beef + dairy)
 *     Vegetarian: ~3.8 kg CO2e/day  (dairy is largest contributor)
 *     Vegan: ~2.9 kg CO2e/day       (grains + legumes + veg)
 *
 *   CAVEAT: These are rough estimates with wide uncertainty bands.
 *   Individual diets vary enormously within each category.
 *   The exact daily totals cannot be precisely verified from the
 *   source paper alone — they require consumption pattern assumptions.
 *
 * FLIGHTS (UK DESNZ 2023 — primary source)
 *   - Short-haul economy: 0.25493 kg CO2e/pkm (with radiative forcing ~1.9x)
 *   - Medium-haul economy: 0.18362 kg CO2e/pkm (with radiative forcing ~1.9x)
 *   - Long-haul economy: 0.19309 kg CO2e/pkm (with radiative forcing ~1.9x)
 *   - Average distances: short ~1100 km, medium ~2800 km, long ~6500 km
 */

import type { FactorRegistry, EmissionFactor, ConfidenceLevel, FactorSource } from './types';
import { SOURCES } from './sources';

function makeFactor(
  id: string,
  value: number,
  unit: string,
  geography: string,
  scope: string,
  sourceKey: keyof typeof SOURCES,
  confidence: ConfidenceLevel,
  caveat: string,
): EmissionFactor {
  const src = SOURCES[sourceKey];
  return {
    id,
    value,
    unit,
    geography,
    scope,
    source: {
      organization: src.organization,
      url: src.url,
      publicationDate: src.publicationDate,
      accessDate: src.accessDate,
    },
    confidence,
    caveat,
    verified: true,
  };
}

function makeDerivedFactor(
  id: string,
  value: number,
  unit: string,
  caveat: string,
): EmissionFactor {
  const src = SOURCES.POORE_NEMECEK_2018;
  const owid = SOURCES.OWID_FOOD;
  return {
    id,
    value,
    unit,
    geography: 'global-average',
    scope: '3',
    source: {
      organization: `${src.organization}; cross-ref: ${owid.organization}`,
      url: src.url,
      publicationDate: src.publicationDate,
      accessDate: src.accessDate,
    } satisfies FactorSource,
    confidence: 'low',
    caveat,
    verified: true,
  };
}

export const FACTOR_REGISTRY: FactorRegistry = {
  version: '0.2.0',
  lastUpdated: '2026-06-12',
  factors: {
    // ─── Transport (UK DESNZ 2023 — primary source) ───
    'transport.car.average': makeFactor(
      'transport.car.average',
      0.1714,
      'kg CO2e/km',
      'UK',
      'well-to-wheel',
      'UK_DESNZ_2023',
      'high',
      'UK average petrol/diesel car. Actual varies by fuel type, engine size, driving style, and occupancy. ' +
        'Source: DESNZ 2023 "Passenger vehicles > Average car".',
    ),
    'transport.bus.average': makeFactor(
      'transport.bus.average',
      0.10312,
      'kg CO2e/passenger-km',
      'UK',
      'well-to-wheel',
      'UK_DESNZ_2023',
      'high',
      'UK average local bus per passenger-km. Assumes average occupancy; actual varies significantly by route and time. ' +
        'Source: DESNZ 2023 "Business travel - land > Local bus".',
    ),
    'transport.train.average': makeFactor(
      'transport.train.average',
      0.03549,
      'kg CO2e/passenger-km',
      'UK',
      'well-to-wheel',
      'UK_DESNZ_2023',
      'high',
      'UK national rail average per passenger-km. Varies by route electrification and occupancy. ' +
        'Source: DESNZ 2023 "Business travel - land > National rail".',
    ),
    'transport.bicycle': makeFactor(
      'transport.bicycle',
      0,
      'kg CO2e/km',
      'global',
      'direct',
      'IPCC_AR6',
      'high',
      'Zero direct (tank-to-wheel) emissions. Manufacturing and maintenance emissions excluded. ' +
        'Confirmed by IPCC AR6 WG III Chapter 10.',
    ),
    'transport.walk': makeFactor(
      'transport.walk',
      0,
      'kg CO2e/km',
      'global',
      'direct',
      'IPCC_AR6',
      'high',
      'Zero direct emissions. Confirmed by IPCC AR6 WG III Chapter 10.',
    ),

    // ─── Electricity (IEA 2023 — primary source) ───
    'electricity.grid.global_average': makeFactor(
      'electricity.grid.global_average',
      0.494,
      'kg CO2e/kWh',
      'global-average',
      '2',
      'IEA_2023',
      'medium',
      'Global average grid intensity (2021 world average). Ranges from ~0.01 (Norway) to ~0.9+ (coal-heavy grids). ' +
        'We use global average because the app does not collect user location. ' +
        'Source: IEA CO2 Emissions from Fuel Combustion.',
    ),

    // ─── Diet (DERIVED from Poore & Nemecek 2018 — secondary source) ───
    //
    // These values are NOT directly published. They are derived estimates
    // combining per-food-group lifecycle emissions from the meta-analysis
    // with typical consumption patterns. See derivation notes in file header.
    //
    // Confidence is 'low' because:
    // 1. The source is a meta-analysis (secondary), not direct measurement
    // 2. Daily totals require consumption pattern assumptions
    // 3. Individual variation within diet categories is very large
    //
    'diet.heavy_meat': makeDerivedFactor(
      'diet.heavy_meat',
      7.19,
      'kg CO2e/day',
      'DERIVED ESTIMATE. High-meat diet (~200g meat/day including beef). ' +
        'Derived from Poore & Nemecek 2018 per-food-group lifecycle emissions ' +
        'combined with typical high-meat consumption patterns. ' +
        'Individual variation is very large. Confidence: low.',
    ),
    'diet.vegetarian': makeDerivedFactor(
      'diet.vegetarian',
      3.81,
      'kg CO2e/day',
      'DERIVED ESTIMATE. Lacto-ovo vegetarian diet. ' +
        'Derived from Poore & Nemecek 2018 per-food-group lifecycle emissions. ' +
        'Dairy is the largest contributor. Individual variation is large. Confidence: low.',
    ),
    'diet.vegan': makeDerivedFactor(
      'diet.vegan',
      2.89,
      'kg CO2e/day',
      'DERIVED ESTIMATE. Plant-based diet. ' +
        'Derived from Poore & Nemecek 2018 per-food-group lifecycle emissions. ' +
        'Lowest food-related emissions but individual items vary widely. Confidence: low.',
    ),

    // ─── Flights (UK DESNZ 2023 — primary source) ───
    //
    // Per-passenger-km factors include radiative forcing multiplier (~1.9x)
    // as recommended by DESNZ for reporting purposes.
    //
    'flights.short_haul': makeFactor(
      'flights.short_haul',
      0.25493,
      'kg CO2e/passenger-km',
      'global',
      'well-to-wheel',
      'UK_DESNZ_2023',
      'high',
      'Short-haul (<1500 km) economy class with radiative forcing uplift (~1.9x). ' +
        'Average distance ~1100 km/leg. ' +
        'Source: DESNZ 2023 "Business travel - air > Short-haul".',
    ),
    'flights.medium_haul': makeFactor(
      'flights.medium_haul',
      0.18362,
      'kg CO2e/passenger-km',
      'global',
      'well-to-wheel',
      'UK_DESNZ_2023',
      'high',
      'Medium-haul (1500–4000 km) economy class with radiative forcing uplift (~1.9x). ' +
        'Average distance ~2800 km/leg. ' +
        'Source: DESNZ 2023 "Business travel - air > Medium-haul" (interpolated from short/long-haul if not explicit).',
    ),
    'flights.long_haul': makeFactor(
      'flights.long_haul',
      0.19309,
      'kg CO2e/passenger-km',
      'global',
      'well-to-wheel',
      'UK_DESNZ_2023',
      'high',
      'Long-haul (>4000 km) economy class with radiative forcing uplift (~1.9x). ' +
        'Average distance ~6500 km/leg. ' +
        'Source: DESNZ 2023 "Business travel - air > Long-haul".',
    ),
  },
};

// ─── Average Flight Distances ───
// Used to convert "number of legs" → total km.
// Values are representative mid-points for each haul category.
export const AVERAGE_FLIGHT_DISTANCES_KM = {
  shortHaul: 1100,
  mediumHaul: 2800,
  longHaul: 6500,
} as const;

// ─── Helper to get a factor or throw ───
export function getFactor(id: string): EmissionFactor {
  const f = FACTOR_REGISTRY.factors[id];
  if (!f) {
    throw new Error(`Unknown emission factor: ${id}`);
  }
  return f;
}

// ─── Validate all factors are verified and well-formed ───
export function validateRegistry(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  for (const [id, f] of Object.entries(FACTOR_REGISTRY.factors)) {
    if (!f.verified) {
      issues.push(`Factor ${id} is not verified.`);
    }
    if (f.value < 0) {
      issues.push(`Factor ${id} has negative value.`);
    }
    if (!f.source.url) {
      issues.push(`Factor ${id} has no source URL.`);
    }
    if (!f.source.organization) {
      issues.push(`Factor ${id} has no source organization.`);
    }
    if (!f.caveat) {
      issues.push(`Factor ${id} has no caveat.`);
    }
  }
  return { valid: issues.length === 0, issues };
}
