/**
 * Emission factor types for the centralized registry.
 * Pure TypeScript — zero React imports.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'demo-estimate';

export interface FactorSource {
  /** Issuing organization (e.g. "UK DESNZ") */
  organization: string;
  /** Direct URL to the published dataset or document */
  url: string;
  /** ISO date of original publication */
  publicationDate: string;
  /** ISO date when we retrieved/verified the data */
  accessDate: string;
}

export interface EmissionFactor {
  /** Unique key, e.g. "transport.car.average" */
  id: string;
  /** Numeric factor value in the specified unit */
  value: number;
  /** Unit description, e.g. "kg CO2e/km" */
  unit: string;
  /** Geographic scope, e.g. "UK" | "global-average" */
  geography: string;
  /** GHG Protocol scope: "1", "2", "3", or "well-to-wheel" */
  scope: string;
  /** Primary source metadata */
  source: FactorSource;
  /** Assessment of factor reliability */
  confidence: ConfidenceLevel;
  /** Human-readable limitation or caveat */
  caveat: string;
  /** true only after cross-checking against the primary source */
  verified: boolean;
}

export interface FactorRegistry {
  /** Semver string, bumped on any factor change */
  version: string;
  /** ISO date of last update */
  lastUpdated: string;
  /** All emission factors keyed by ID */
  factors: Record<string, EmissionFactor>;
}
