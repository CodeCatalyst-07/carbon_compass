/**
 * Primary and secondary sources for emission factors.
 *
 * IMPORTANT: Every factor in the registry must cite a source listed here.
 * Each source documents:
 * - The organization and publication
 * - The direct URL to the publication or dataset
 * - When the publication was issued
 * - When we last accessed and verified the value
 * - How the value was extracted or derived
 *
 * Sources are categorized as PRIMARY (values taken directly from the
 * publication) or DERIVED (values calculated from primary source data
 * with a documented methodology).
 */

export const SOURCES = {
  /**
   * UK Department for Energy Security and Net Zero —
   * Greenhouse Gas Reporting: Conversion Factors 2023
   *
   * PRIMARY SOURCE for transport and aviation factors.
   * Well-to-wheel factors include upstream fuel production emissions.
   *
   * Transport factors from: "Passenger vehicles" tab
   * Aviation factors from: "Business travel - air" tab
   */
  UK_DESNZ_2023: {
    organization: 'UK DESNZ (Department for Energy Security and Net Zero)',
    publication: 'Greenhouse Gas Reporting: Conversion Factors 2023',
    url: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023',
    publicationDate: '2023-06-28',
    accessDate: '2026-06-12',
    type: 'primary' as const,
    extractionNotes:
      'Values taken from the published Excel workbook. ' +
      'Car: "Passenger vehicles > Cars (by size) > Average car" column "kg CO2e" per km. ' +
      'Bus: "Business travel - land > Local bus" per passenger-km. ' +
      'Train: "Business travel - land > National rail" per passenger-km. ' +
      'Flights: "Business travel - air > Domestic/Short-haul/Long-haul > Average passenger" per passenger-km, ' +
      'with radiative forcing uplift included (factor of ~1.9).',
  },

  /**
   * International Energy Agency — CO2 Emissions from Fuel Combustion
   *
   * PRIMARY SOURCE for global average grid electricity emission intensity.
   * Value used as default since the app does not collect user location.
   */
  IEA_2023: {
    organization: 'International Energy Agency (IEA)',
    publication:
      'CO2 Emissions from Fuel Combustion / Greenhouse Gas Emissions from Energy Data Explorer',
    url: 'https://www.iea.org/data-and-statistics/data-tools/greenhouse-gas-emissions-from-energy-data-explorer',
    publicationDate: '2023-09-01',
    accessDate: '2026-06-12',
    type: 'primary' as const,
    extractionNotes:
      'Global average grid emission intensity for electricity generation. ' +
      'Value of ~0.494 kg CO2/kWh represents the 2021 world average. ' +
      'Actual intensity varies enormously by country: from ~0.01 (Norway, hydro) to ~0.9+ (coal-heavy grids).',
  },

  /**
   * Poore & Nemecek (2018) — "Reducing food's environmental impacts
   * through producers and consumers", Science 360(6392):987–992.
   *
   * SECONDARY SOURCE for diet factors. This is a meta-analysis,
   * not a direct measurement. Diet daily totals are DERIVED from
   * this source's per-food-group emission data, not directly
   * published as "diet type = X kg CO2e/day".
   *
   * The derivation methodology is documented in the registry.
   */
  POORE_NEMECEK_2018: {
    organization: 'Poore, J. & Nemecek, T. (2018), published in Science',
    publication:
      "Reducing food's environmental impacts through producers and consumers. Science 360(6392):987–992",
    url: 'https://doi.org/10.1126/science.aaq0216',
    publicationDate: '2018-06-01',
    accessDate: '2026-06-12',
    type: 'secondary' as const,
    extractionNotes:
      'Meta-analysis of ~38,700 farms covering 40 food products representing ~90% of global protein and calorie supply. ' +
      'Per-food-group lifecycle GHG emissions (farm-to-retail) are published in the paper. ' +
      'Diet-level daily totals are NOT directly published — they are derived by combining ' +
      'per-food-group factors with typical consumption patterns. See DERIVATION_NOTES in the registry.',
  },

  /**
   * Our World in Data — Environmental Impacts of Food Production
   *
   * SECONDARY SOURCE. Provides accessible visualizations and data
   * downloads of Poore & Nemecek 2018 results. Used for cross-reference
   * and to access structured per-food-group data.
   */
  OWID_FOOD: {
    organization: 'Our World in Data (Ritchie, Rosado, & Roser)',
    publication: 'Environmental Impacts of Food Production',
    url: 'https://ourworldindata.org/environmental-impacts-of-food',
    publicationDate: '2022-01-01',
    accessDate: '2026-06-12',
    type: 'secondary' as const,
    extractionNotes:
      'Structured presentation of Poore & Nemecek 2018 data. ' +
      'Used to cross-reference per-food-group emission values. ' +
      'Per-kg lifecycle GHG values for major food groups are charted and available for download.',
  },

  /**
   * IPCC AR6 — Climate Change 2022: Mitigation of Climate Change
   *
   * Used for cross-validation of transport ordering (walk < bicycle < train < bus < car)
   * and as authoritative source for zero-emission classification of walking/cycling.
   */
  IPCC_AR6: {
    organization: 'Intergovernmental Panel on Climate Change (IPCC)',
    publication: 'AR6 Working Group III: Mitigation of Climate Change, Chapter 10 — Transport',
    url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-10/',
    publicationDate: '2022-04-04',
    accessDate: '2026-06-12',
    type: 'primary' as const,
    extractionNotes:
      'Used to confirm that walking and cycling have zero direct (tank-to-wheel) emissions. ' +
      'Transport mode emission ordering validated against Figure 10.4.',
  },
} as const;
