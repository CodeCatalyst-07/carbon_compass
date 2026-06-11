/**
 * Recommendation engine types.
 * Pure TypeScript — zero React imports.
 */

import type { Category } from '../../storage/schemas';

export type ImpactBand = 'high' | 'medium' | 'low';
export type EffortBand = 'easy' | 'medium' | 'hard';
export type CostBand = 'saves-money' | 'free' | 'low' | 'medium' | 'high';
export type TimeHorizon = 'immediate' | 'weeks' | 'months';
export type MapsActionType =
  | 'search'
  | 'directions-transit'
  | 'directions-bicycling'
  | 'directions-walking'
  | null;

export type ActionCategory = Category | 'habit';

export interface ActionMetadata {
  /** Estimated annual savings in kg CO2e, null when not defensible */
  estimatedSavingsKgCO2ePerYear: number | null;
  /** Confidence of savings estimate */
  savingsConfidence: 'high' | 'medium' | 'low' | null;
  /** How savings were calculated */
  savingsMethodology: string | null;
  /** How difficult is this to do? */
  effort: EffortBand;
  /** Cost impact on the user */
  cost: CostBand;
  /** How quickly benefits appear */
  timeHorizon: TimeHorizon;
  /** Impact magnitude band */
  impact: ImpactBand;
  /** Google Maps search query, if relevant */
  mapsSearchQuery: string | null;
  /** Type of Maps link to generate */
  mapsActionType: MapsActionType;
}

export interface Action {
  id: string;
  title: string;
  description: string;
  category: ActionCategory;
  rationale: string;
  /** Function that determines if this action is applicable to the user */
  isApplicable: (context: ApplicabilityContext) => boolean;
  /** Optional function to compute estimated savings from user's specific data */
  estimateSavings?: (context: ApplicabilityContext) => number | null;
  metadata: ActionMetadata;
}

export interface ApplicabilityContext {
  /** User's current diet */
  diet: 'heavy-meat' | 'vegetarian' | 'vegan';
  /** Total car distance per week (km) */
  carKmPerWeek: number;
  /** Whether user reports any car usage */
  usesCar: boolean;
  /** Whether user reports any flights */
  hasFlights: boolean;
  /** Short-haul flight legs per year */
  shortHaulLegs: number;
  /** Long-haul flight legs per year */
  longHaulLegs: number;
  /** Monthly electricity kWh (personal) */
  personalMonthlyKwh: number;
  /** IDs of the top 1-2 driver categories */
  topDriverCategories: Category[];
  /** IDs of actions already completed */
  completedActionIds: Set<string>;
  /** IDs of actions dismissed */
  dismissedActionIds: Set<string>;
  /** User's effort preference */
  effortPreference: 'low' | 'medium' | 'high';
  /** User's budget sensitivity */
  budgetSensitivity: 'low' | 'medium' | 'high';
}

export interface RankingScores {
  impactScore: number;
  contextMatchScore: number;
  driverRelevanceScore: number;
  effortScore: number;
  costScore: number;
  compositeScore: number;
}

export interface RankedAction {
  action: Action;
  rank: number;
  scores: RankingScores;
  explainableReason: string;
}

/**
 * Ranking weights — centralized and documented.
 * These control how different scoring dimensions combine.
 */
export const RANKING_WEIGHTS = {
  impact: 0.35,
  contextMatch: 0.2,
  driverRelevance: 0.25,
  effort: 0.1,
  cost: 0.1,
} as const;
