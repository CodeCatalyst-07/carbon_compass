# Calculation Methodology

This document describes every formula, emission factor, and ranking algorithm used by Carbon Compass. All calculations are deterministic — the same inputs always produce the same outputs. No AI is used for any numeric result.

## Per-Category Formulas

### Transport

```
annual_kg_CO₂e = Σ (weekly_distance_km × 52 × emission_factor[mode])
```

- Distance is **total weekly distance traveled** — not doubled for round trips.
- Each mode has its own factor. Bicycle and walk are zero.

**Worked example** (car at 50 km/week):

```
50 km × 52 weeks × 0.17140 kg CO₂e/km = 445.64 kg CO₂e/year
```

### Electricity

```
personal_monthly_kwh = household_kwh / household_size   (if reporting household usage)
annual_kg_CO₂e = personal_monthly_kwh × 12 × grid_factor
```

**Worked example** (300 kWh/month household, 2 people):

```
300 / 2 = 150 kWh personal
150 × 12 × 0.494 = 889.20 kg CO₂e/year
```

**Limitation:** Uses a single global average grid intensity (0.494 kg CO₂e/kWh, IEA 2023). Actual grid intensity varies enormously by country (e.g., Norway ≈ 0.01, Poland ≈ 0.70).

### Diet

```
annual_kg_CO₂e = daily_diet_factor × 365
```

| Diet Profile | Daily Factor (kg CO₂e) | Annual Result |
|---|---|---|
| Heavy-meat | 7.19 | 2,624 kg |
| Vegetarian | 3.81 | 1,391 kg |
| Vegan | 2.89 | 1,055 kg |

**Derivation:** Daily factors are derived estimates, not directly published values. They combine per-food-group lifecycle emissions from Poore & Nemecek 2018 (a meta-analysis of ~38,700 farms, published in *Science* 360(6392):987–992) with typical consumption pattern assumptions. Individual variation within each diet category is very large. Confidence: **low**.

### Flights

```
annual_kg_CO₂e = Σ (one_way_legs × average_distance_km × emission_factor[haul])
```

| Haul Category | Distance Range | Average Distance | Factor (kg CO₂e/pkm) |
|---|---|---|---|
| Short-haul | < 1,500 km | 1,100 km | 0.25493 |
| Medium-haul | 1,500–4,000 km | 2,800 km | 0.18362 |
| Long-haul | > 4,000 km | 6,500 km | 0.19309 |

Factors include a radiative forcing uplift (~1.9×) per UK DESNZ guidance, accounting for the enhanced climate impact of emissions at altitude.

**Worked example** (4 short-haul + 2 medium-haul + 1 long-haul legs):

```
Short:  4 × 1,100 × 0.25493 =  1,121.7 kg
Medium: 2 × 2,800 × 0.18362 =  1,028.3 kg
Long:   1 × 6,500 × 0.19309 =  1,255.1 kg
Total:                          3,405.1 kg CO₂e/year
```

### Top Drivers

1. Sort categories by percentage of total (descending).
2. Take top 0–2 where percentage > 0.
3. If total is 0, return empty array (no division by zero).

## Emission Factor Registry

All factors are stored in a centralised, versioned registry: [`src/domain/factors/registry.ts`](../src/domain/factors/registry.ts).

### Current Version: 0.2.0

| Factor | Value | Unit | Source | Confidence |
|---|---|---|---|---|
| Car (average) | 0.17140 | kg CO₂e/km | UK DESNZ 2023 | High |
| Bus (average) | 0.10312 | kg CO₂e/pkm | UK DESNZ 2023 | High |
| Train (national rail) | 0.03549 | kg CO₂e/pkm | UK DESNZ 2023 | High |
| Bicycle | 0 | kg CO₂e/km | IPCC AR6 | High |
| Walk | 0 | kg CO₂e/km | IPCC AR6 | High |
| Grid electricity | 0.494 | kg CO₂e/kWh | IEA 2023 | Medium |
| Diet: heavy-meat | 7.19 | kg CO₂e/day | Derived¹ | Low |
| Diet: vegetarian | 3.81 | kg CO₂e/day | Derived¹ | Low |
| Diet: vegan | 2.89 | kg CO₂e/day | Derived¹ | Low |
| Flights: short-haul | 0.25493 | kg CO₂e/pkm | UK DESNZ 2023 | High |
| Flights: medium-haul | 0.18362 | kg CO₂e/pkm | UK DESNZ 2023 | High |
| Flights: long-haul | 0.19309 | kg CO₂e/pkm | UK DESNZ 2023 | High |

¹ See Diet section above for derivation methodology.

### Versioning

The registry version is bumped on any factor change. The version string is stored in every `FootprintResult` and snapshot, enabling reproducibility audits.

### Source Publications

| Source | Type | Publication |
|---|---|---|
| UK DESNZ 2023 | Primary | [GHG Conversion Factors](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023) |
| IEA 2023 | Primary | [GHG Emissions from Energy](https://www.iea.org/data-and-statistics/data-tools/greenhouse-gas-emissions-from-energy-data-explorer) |
| Poore & Nemecek 2018 | Secondary (meta-analysis) | [doi:10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216) |
| IPCC AR6 WG III Ch.10 | Primary | [Transport chapter](https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-10/) |
| Our World in Data | Secondary | [Environmental Impacts of Food](https://ourworldindata.org/environmental-impacts-of-food) |

## Recommendation Ranking Algorithm

Actions are ranked by a deterministic weighted-sum formula:

```
compositeScore = 0.35 × impactScore
               + 0.20 × contextMatchScore
               + 0.25 × driverRelevanceScore
               + 0.10 × effortScore
               + 0.10 × costScore
```

### Scoring Dimensions

| Dimension | Weight | What it measures |
|---|---|---|
| Impact | 0.35 | High/medium/low impact metadata → 1.0 / 0.6 / 0.3 |
| Context match | 0.20 | Does the action match user behaviour? (e.g., car-related action for a driver) |
| Driver relevance | 0.25 | Does the action target the user's top emission category? |
| Effort | 0.10 | Adjusted for user's effort preference (easy-first vs. hard-welcome) |
| Cost | 0.10 | Adjusted for user's budget sensitivity (cost-sensitive → prefer saves-money/free) |

### Filtering Rules

1. **Applicability guards:** Each action has an `isApplicable(context)` function. Vegans never see "reduce meat" recommendations. Non-drivers never see "switch to bus" recommendations.
2. **Exclusion:** Completed and dismissed actions are filtered out.
3. **Tie-breaking:** Equal composite scores are broken by lower effort, then lower cost.

### Dynamic Savings Estimates

Some actions compute personalized savings at runtime via `estimateSavings(context)`. These use the production calculators and factor registry — no formula is duplicated in UI components.

Example: "Reduce electricity by 10%" computes `personalMonthlyKwh × 0.1 × 12 × gridFactor.value`.

## Known Limitations

1. **Single global grid factor.** Electricity emissions are significantly overestimated for users in low-carbon grids (e.g., Norway, France) and underestimated for high-carbon grids (e.g., Australia, Poland).
2. **UK-biased transport factors.** Vehicle fleet composition varies by country.
3. **Diet factor uncertainty.** Individual diets vary enormously within each profile category.
4. **Four categories only.** Housing, consumer goods, services, and water are excluded.
5. **Average flight distances.** Actual flight distances depend on specific routes.
6. **No radiative forcing uncertainty.** The 1.9× uplift is a central estimate; the range is 1.0–4.0×.

All results are permanently labelled as estimates: *"These are estimates, not audited measurements."*
