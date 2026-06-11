/**
 * Deterministic recommendation ranker.
 *
 * Scoring formula (weighted sum, NOT normalized against global max):
 * compositeScore = w.impact × impactScore
 *                + w.contextMatch × contextMatchScore
 *                + w.driverRelevance × driverRelevanceScore
 *                + w.effort × effortScore
 *                + w.cost × costScore
 *
 * Tie-breaking: lower effort first, then lower cost.
 *
 * Ensures:
 * - Actions for the largest category usually rank highest
 * - Completed or dismissed actions are suppressed
 * - Vegan/vegetarian users never see inapplicable meat advice
 * - Low car usage prevents generic car advice from dominating
 * - Every ranking has an explainable reason
 */

import type {
  Action,
  ApplicabilityContext,
  RankedAction,
  RankingScores,
  ImpactBand,
  EffortBand,
  CostBand,
} from './types';
import { RANKING_WEIGHTS } from './types';
import { ACTION_CATALOG } from './actions';

// ─── Score Maps ───

const IMPACT_SCORES: Record<ImpactBand, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.3,
};

const EFFORT_SCORES: Record<EffortBand, number> = {
  easy: 1.0, // Lower effort = higher score
  medium: 0.6,
  hard: 0.3,
};

const COST_SCORES: Record<CostBand, number> = {
  'saves-money': 1.0,
  free: 0.9,
  low: 0.6,
  medium: 0.4,
  high: 0.2,
};

// ─── Scoring Functions ───

function scoreImpact(action: Action): number {
  return IMPACT_SCORES[action.metadata.impact];
}

function scoreEffort(action: Action, ctx: ApplicabilityContext): number {
  const baseScore = EFFORT_SCORES[action.metadata.effort];
  // Boost easy actions when user prefers low effort
  if (ctx.effortPreference === 'low' && action.metadata.effort === 'easy') {
    return Math.min(1.0, baseScore + 0.1);
  }
  // Penalize hard actions for low-effort preference
  if (ctx.effortPreference === 'low' && action.metadata.effort === 'hard') {
    return baseScore * 0.5;
  }
  return baseScore;
}

function scoreCost(action: Action, ctx: ApplicabilityContext): number {
  const baseScore = COST_SCORES[action.metadata.cost];
  // Boost money-saving actions for budget-sensitive users
  if (ctx.budgetSensitivity === 'high' && action.metadata.cost === 'saves-money') {
    return Math.min(1.0, baseScore + 0.1);
  }
  // Penalize costly actions for budget-sensitive users
  if (
    ctx.budgetSensitivity === 'high' &&
    (action.metadata.cost === 'medium' || action.metadata.cost === 'high')
  ) {
    return baseScore * 0.5;
  }
  return baseScore;
}

function scoreContextMatch(action: Action, ctx: ApplicabilityContext): number {
  let score = 0.5; // Base relevance

  // Dynamic savings boost: if we can estimate and it's significant
  if (action.estimateSavings) {
    const savings = action.estimateSavings(ctx);
    if (savings !== null && savings > 500) score += 0.3;
    else if (savings !== null && savings > 100) score += 0.15;
  }

  // Effort preference match
  if (ctx.effortPreference === 'low' && action.metadata.effort === 'easy') score += 0.1;
  if (ctx.effortPreference === 'high' && action.metadata.effort === 'hard') score += 0.1;

  return Math.min(1.0, score);
}

function scoreDriverRelevance(action: Action, ctx: ApplicabilityContext): number {
  const actionCategory = action.category;

  // Actions matching the #1 top driver get full score
  if (ctx.topDriverCategories[0] === actionCategory) return 1.0;
  // Actions matching the #2 top driver get high score
  if (ctx.topDriverCategories[1] === actionCategory) return 0.75;
  // 'habit' actions get moderate relevance (always somewhat relevant)
  if (actionCategory === 'habit') return 0.4;
  // Other categories get low score
  return 0.2;
}

// ─── Main Ranking Function ───

function computeScores(action: Action, ctx: ApplicabilityContext): RankingScores {
  const impactScore = scoreImpact(action);
  const contextMatchScore = scoreContextMatch(action, ctx);
  const driverRelevanceScore = scoreDriverRelevance(action, ctx);
  const effortScore = scoreEffort(action, ctx);
  const costScore = scoreCost(action, ctx);

  const compositeScore =
    RANKING_WEIGHTS.impact * impactScore +
    RANKING_WEIGHTS.contextMatch * contextMatchScore +
    RANKING_WEIGHTS.driverRelevance * driverRelevanceScore +
    RANKING_WEIGHTS.effort * effortScore +
    RANKING_WEIGHTS.cost * costScore;

  return {
    impactScore,
    contextMatchScore,
    driverRelevanceScore,
    effortScore,
    costScore,
    compositeScore,
  };
}

function generateExplanation(action: Action, scores: RankingScores): string {
  const parts: string[] = [];

  if (scores.driverRelevanceScore >= 0.75) {
    parts.push(`targets your top emission source`);
  }
  if (scores.impactScore >= 0.8) {
    parts.push(`high impact`);
  }
  if (scores.effortScore >= 0.8) {
    parts.push(`easy to implement`);
  }
  if (action.metadata.cost === 'saves-money') {
    parts.push(`saves money`);
  }

  return parts.length > 0
    ? `Ranked highly because: ${parts.join(', ')}.`
    : 'Relevant to your profile.';
}

/**
 * Rank all applicable actions for the given user context.
 *
 * Filters out:
 * - Actions that fail applicability checks
 * - Actions already completed
 * - Actions already dismissed
 *
 * Returns actions sorted by composite score (descending).
 * Ties broken by: lower effort first, then lower cost.
 */
export function rankActions(
  ctx: ApplicabilityContext,
  catalog: Action[] = ACTION_CATALOG,
): RankedAction[] {
  const applicable = catalog.filter((action) => {
    // Skip completed
    if (ctx.completedActionIds.has(action.id)) return false;
    // Skip dismissed
    if (ctx.dismissedActionIds.has(action.id)) return false;
    // Check applicability
    return action.isApplicable(ctx);
  });

  const scored = applicable.map((action) => {
    const scores = computeScores(action, ctx);
    return {
      action,
      scores,
      explainableReason: generateExplanation(action, scores),
      rank: 0, // Set after sorting
    };
  });

  // Sort by composite score descending; tie-break by effort then cost
  scored.sort((a, b) => {
    const scoreDiff = b.scores.compositeScore - a.scores.compositeScore;
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

    // Tie: prefer lower effort
    const effortDiff = b.scores.effortScore - a.scores.effortScore;
    if (Math.abs(effortDiff) > 0.001) return effortDiff;

    // Still tied: prefer lower cost
    return b.scores.costScore - a.scores.costScore;
  });

  // Assign ranks
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}
