# Carbon Compass

A privacy-first, no-login carbon footprint coach that helps individuals understand, track, and reduce their personal carbon emissions through deterministic calculations and actionable recommendations.

## Purpose

Carbon Compass calculates your carbon footprint across four categories — **transport**, **electricity**, **diet**, and **flights** — then ranks personalised reduction actions and lets you simulate the impact of behaviour changes. All calculations run locally in your browser with no accounts, no tracking, and no server required for core functionality.

## Architecture

### Deterministic Core

All numeric calculations are pure TypeScript functions with zero side effects:

```
UserProfile → per-category calculators → CategoryBreakdown[] → aggregate → FootprintResult
```

- **No AI is used for any numeric calculation.** The calculation engine is fully deterministic — same inputs always produce the same outputs.
- An optional AI integration (Gemini via Firebase Cloud Function) provides explanatory text and personalised action plans, but it never influences the numbers.

### Privacy by Design

- **No accounts, no login, no server database.** All data lives in `localStorage`.
- **No tracking, no analytics.** Zero third-party scripts beyond Google Fonts.
- **No location permissions.** Google Maps links open in a new tab; the user enters their own location.
- **Export and delete anytime.** JSON export, CSV history export, and full data deletion are always available.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 6 + `@tailwindcss/vite` |
| UI | React 19 + TypeScript (strict) |
| Styling | Tailwind CSS v4 with `@theme` design tokens |
| Routing | React Router v7 (client SPA) |
| Validation | Zod (storage + API boundaries) |
| Icons | Lucide React |
| Testing | Vitest + React Testing Library |
| Formatting | Prettier |
| AI (optional) | Gemini 2.5 Flash Lite via Firebase Cloud Function |

## Calculation Methodology

### Transport

```
annual_kg_CO2e = Σ (weekly_distance_km × 52 × emission_factor[mode])
```

- Distance is **total weekly** — not doubled for round trips.
- Modes: car, bus, train, bicycle (0), walk (0).
- Factors from UK DESNZ 2023, well-to-wheel.

### Electricity

```
personal_monthly_kwh = household_kwh / household_size  (if reporting household usage)
annual_kg_CO2e = personal_monthly_kwh × 12 × grid_factor
```

- Uses IEA 2023 global average grid intensity (0.494 kg CO2e/kWh).
- **Limitation:** Single global average; actual varies enormously by country.

### Diet

```
annual_kg_CO2e = daily_diet_factor × 365
```

- Three profiles: heavy-meat (7.19), vegetarian (3.81), vegan (2.89) kg CO2e/day.
- **These are derived estimates** (see [Emission Factor Registry](#emission-factor-registry)).

### Flights

```
annual_kg_CO2e = Σ (one_way_legs × average_distance_km × emission_factor[haul])
```

- Haul categories: short (<1500 km, avg 1100), medium (1500–4000 km, avg 2800), long (>4000 km, avg 6500).
- Factors include radiative forcing uplift (~1.9×) per DESNZ guidance.

### Top Drivers

- Sort categories by percentage, take top 0–2 where percentage > 0.
- If total is 0, return empty array (no division by zero).

## Emission Factor Registry

All emission factors are stored in a centralised, versioned registry ([`src/domain/factors/registry.ts`](src/domain/factors/registry.ts)).

### Current Version: 0.2.0

| Factor | Value | Unit | Source | Confidence |
|--------|-------|------|--------|------------|
| Car (average) | 0.17140 | kg CO2e/km | UK DESNZ 2023 | High |
| Bus (average) | 0.10312 | kg CO2e/pkm | UK DESNZ 2023 | High |
| Train (national rail) | 0.03549 | kg CO2e/pkm | UK DESNZ 2023 | High |
| Bicycle | 0 | kg CO2e/km | IPCC AR6 | High |
| Walk | 0 | kg CO2e/km | IPCC AR6 | High |
| Grid electricity | 0.494 | kg CO2e/kWh | IEA 2023 | Medium |
| Diet: heavy-meat | 7.19 | kg CO2e/day | Derived¹ | Low |
| Diet: vegetarian | 3.81 | kg CO2e/day | Derived¹ | Low |
| Diet: vegan | 2.89 | kg CO2e/day | Derived¹ | Low |
| Flights: short-haul | 0.25493 | kg CO2e/pkm | UK DESNZ 2023 | High |
| Flights: medium-haul | 0.18362 | kg CO2e/pkm | UK DESNZ 2023 | High |
| Flights: long-haul | 0.19309 | kg CO2e/pkm | UK DESNZ 2023 | High |

¹ Diet factors are **derived estimates**, not directly published values. They combine per-food-group lifecycle emissions from Poore & Nemecek 2018 (a meta-analysis of ~38,700 farms, published in *Science* 360(6392):987–992) with typical consumption pattern assumptions. Individual variation within each diet category is very large. See derivation methodology in [`registry.ts`](src/domain/factors/registry.ts).

### Factor Sources

| Source | Type | Publication |
|--------|------|-------------|
| UK DESNZ 2023 | Primary | [GHG Conversion Factors](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023) |
| IEA 2023 | Primary | [GHG Emissions from Energy](https://www.iea.org/data-and-statistics/data-tools/greenhouse-gas-emissions-from-energy-data-explorer) |
| Poore & Nemecek 2018 | Secondary (meta-analysis) | [doi:10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216) |
| IPCC AR6 WG III Ch.10 | Primary | [Transport chapter](https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-10/) |
| Our World in Data | Secondary | [Environmental Impacts of Food](https://ourworldindata.org/environmental-impacts-of-food) |

### Versioning

The registry version is bumped on any factor change. The version is stored in every calculation result and snapshot, enabling reproducibility audits.

### Caveats

Every factor includes a human-readable caveat describing its limitations. The app permanently displays: *"These are estimates, not audited measurements."*

## Recommendation Ranking

Actions are ranked by a deterministic weighted-sum formula:

```
compositeScore = 0.35 × impactScore
               + 0.20 × contextMatchScore
               + 0.25 × driverRelevanceScore
               + 0.10 × effortScore
               + 0.10 × costScore
```

- Actions matching the user's top emission category score highest on `driverRelevanceScore`.
- Completed and dismissed actions are excluded.
- Applicability conditions prevent irrelevant advice (e.g., vegans never see meat-reduction recommendations).
- Ties are broken by lower effort, then lower cost.

## localStorage & Privacy

- All data is stored in `localStorage` under the key `carbon-compass-data`.
- Schema is versioned (currently v1) with Zod validation and migration support.
- Snapshots are capped at 52 (one per week for a year).
- AI response cache entries expire automatically.
- JSON import is validated with preview before confirmation, size-limited to 1 MB.
- CSV export includes a UTF-8 BOM for Google Sheets compatibility.

## Setup

```bash
npm install
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and production build |
| `npm run typecheck` | TypeScript strict type checking |
| `npm test` | Run all tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | ESLint check |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run preview` | Preview production build |

## Current Limitations

- **Single grid emission factor.** Uses global average (0.494 kg CO2e/kWh). Users in low-carbon grids (e.g., Norway, France) will see significantly overestimated electricity emissions.
- **UK-biased transport factors.** Car, bus, and train factors are from UK DESNZ 2023 and may not reflect other countries' vehicle fleet compositions.
- **Diet factor uncertainty.** Daily totals are derived estimates with low confidence. Individual diets vary enormously within each category.
- **No food waste, goods, or services.** Only four emission categories are covered. Housing, consumer goods, and services are excluded.
- **No dark mode yet.** Design system tokens are light-mode only.
- **No E2E tests yet.** Playwright integration is planned for Phase 7.
- **No Recharts yet.** Chart library inclusion is deferred pending bundle size review in Phase 4.
- **AI integration not yet implemented.** Firebase Cloud Function is scaffolded in the plan but not built.
