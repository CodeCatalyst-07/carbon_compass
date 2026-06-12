/**
 * Zod schemas for the /api/insights Cloud Function.
 *
 * Request validation (amendment 1):
 * - Reject out-of-range values (never silently clamp)
 * - Accept only the four known categories
 * - Require unique category and action IDs
 * - Limit array sizes strictly
 * - Cross-field validation with tolerances
 * - Strict string length limits
 *
 * Response validation (amendment 2):
 * - Every actionId must exist in supplied actions
 * - Preserve deterministic action ordering
 * - Seven unique, ordered plan days
 * - No new numeric carbon claims
 */

import { z } from 'zod';

// ─── Constants ───

export const KNOWN_CATEGORIES = ['transport', 'electricity', 'diet', 'flights'] as const;
export type KnownCategory = (typeof KNOWN_CATEGORIES)[number];

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Maximum allowed string lengths for each field type. */
export const STRING_LIMITS = {
  id: 64,
  title: 120,
  reason: 300,
  summary: 500,
  explanation: 600,
  caveat: 400,
  planTask: 300,
  factorVersion: 32,
} as const;

/** Maximum numeric bounds for validation. */
export const NUMERIC_LIMITS = {
  annualKgCO2e: { min: 0, max: 500_000 },
  monthlyKgCO2e: { min: 0, max: 50_000 },
  percentage: { min: 0, max: 100 },
  reductionGoal: { min: 0, max: 100 },
  rank: { min: 1, max: 15 },
} as const;

/** Cross-field validation tolerance (5% of annual total or 10 kg, whichever is greater). */
const CROSS_FIELD_TOLERANCE_FACTOR = 0.05;
const CROSS_FIELD_TOLERANCE_MIN_KG = 10;

// ─── Request Schema ───

const CategorySchema = z.enum(KNOWN_CATEGORIES);

const CategoryShareSchema = z
  .object({
    category: CategorySchema,
    percentage: z
      .number()
      .min(NUMERIC_LIMITS.percentage.min)
      .max(NUMERIC_LIMITS.percentage.max)
      .finite(),
    annualKgCO2e: z
      .number()
      .min(NUMERIC_LIMITS.annualKgCO2e.min)
      .max(NUMERIC_LIMITS.annualKgCO2e.max)
      .finite(),
  })
  .strict();

const TopDriverSchema = z
  .object({
    category: CategorySchema,
    percentage: z
      .number()
      .min(NUMERIC_LIMITS.percentage.min)
      .max(NUMERIC_LIMITS.percentage.max)
      .finite(),
    reason: z.string().min(1).max(STRING_LIMITS.reason),
  })
  .strict();

const RankedActionSchema = z
  .object({
    id: z.string().min(1).max(STRING_LIMITS.id),
    title: z.string().min(1).max(STRING_LIMITS.title),
    rank: z.number().int().min(NUMERIC_LIMITS.rank.min).max(NUMERIC_LIMITS.rank.max),
  })
  .strict();

const EffortPreferenceSchema = z.enum(['low', 'medium', 'high']);
const BudgetSensitivitySchema = z.enum(['low', 'medium', 'high']);

const InsightsRequestBodySchema = z
  .object({
    factorRegistryVersion: z.string().min(1).max(STRING_LIMITS.factorVersion),
    totals: z
      .object({
        annualKgCO2e: z
          .number()
          .min(NUMERIC_LIMITS.annualKgCO2e.min)
          .max(NUMERIC_LIMITS.annualKgCO2e.max)
          .finite(),
        monthlyKgCO2e: z
          .number()
          .min(NUMERIC_LIMITS.monthlyKgCO2e.min)
          .max(NUMERIC_LIMITS.monthlyKgCO2e.max)
          .finite(),
      })
      .strict(),
    categoryShares: z.array(CategoryShareSchema).min(1).max(KNOWN_CATEGORIES.length),
    topDrivers: z.array(TopDriverSchema).min(0).max(2),
    rankedActions: z.array(RankedActionSchema).min(1).max(5),
    goal: z
      .object({
        reductionGoalPercent: z
          .number()
          .min(NUMERIC_LIMITS.reductionGoal.min)
          .max(NUMERIC_LIMITS.reductionGoal.max)
          .finite()
          .nullable(),
      })
      .strict(),
    constraints: z
      .object({
        effortPreference: EffortPreferenceSchema,
        budgetSensitivity: BudgetSensitivitySchema,
      })
      .strict(),
  })
  .strict();

/**
 * Full request schema with cross-field validation.
 */
export const InsightsRequestSchema = InsightsRequestBodySchema.superRefine((data, ctx) => {
  // 1. Unique category IDs
  const categoryIds = data.categoryShares.map((c) => c.category);
  const uniqueCategories = new Set(categoryIds);
  if (uniqueCategories.size !== categoryIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'categoryShares must contain unique category IDs.',
      path: ['categoryShares'],
    });
  }

  // 2. Unique action IDs
  const actionIds = data.rankedActions.map((a) => a.id);
  const uniqueActions = new Set(actionIds);
  if (uniqueActions.size !== actionIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'rankedActions must contain unique action IDs.',
      path: ['rankedActions'],
    });
  }

  // 3. Category totals should agree with annual total
  const categoryTotal = data.categoryShares.reduce((sum, c) => sum + c.annualKgCO2e, 0);
  const tolerance = Math.max(
    data.totals.annualKgCO2e * CROSS_FIELD_TOLERANCE_FACTOR,
    CROSS_FIELD_TOLERANCE_MIN_KG,
  );
  if (Math.abs(categoryTotal - data.totals.annualKgCO2e) > tolerance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Category totals (${categoryTotal.toFixed(1)}) must agree with annual total (${data.totals.annualKgCO2e.toFixed(1)}) within tolerance.`,
      path: ['categoryShares'],
    });
  }

  // 4. Percentages should sum to approximately 100 (±2%)
  const percentageTotal = data.categoryShares.reduce((sum, c) => sum + c.percentage, 0);
  if (data.totals.annualKgCO2e > 0 && Math.abs(percentageTotal - 100) > 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Category percentages must sum to approximately 100% (got ${percentageTotal.toFixed(1)}%).`,
      path: ['categoryShares'],
    });
  }

  // 5. Top drivers must reference supplied categories
  for (let i = 0; i < data.topDrivers.length; i++) {
    const driver = data.topDrivers[i]!;
    if (!uniqueCategories.has(driver.category)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Top driver "${driver.category}" must reference a supplied category.`,
        path: ['topDrivers', i, 'category'],
      });
    }
  }

  // 6. Actions must be ordered by rank
  for (let i = 1; i < data.rankedActions.length; i++) {
    if (data.rankedActions[i]!.rank <= data.rankedActions[i - 1]!.rank) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'rankedActions must be ordered by ascending rank.',
        path: ['rankedActions', i, 'rank'],
      });
    }
  }
});

export type InsightsRequest = z.infer<typeof InsightsRequestBodySchema>;

// ─── Response Schema ───

const ActionExplanationSchema = z
  .object({
    actionId: z.string().min(1).max(STRING_LIMITS.id),
    explanation: z.string().min(1).max(STRING_LIMITS.explanation),
  })
  .strict();

const WeeklyPlanDaySchema = z
  .object({
    day: z.string().min(1).max(20),
    task: z.string().min(1).max(STRING_LIMITS.planTask),
  })
  .strict();

export const InsightsResponseSchema = z
  .object({
    summary: z.string().min(1).max(STRING_LIMITS.summary),
    actionExplanations: z.array(ActionExplanationSchema).min(1).max(5),
    weeklyPlan: z.array(WeeklyPlanDaySchema).length(7),
    caveat: z.string().min(1).max(STRING_LIMITS.caveat),
  })
  .strict()
  .superRefine((data, ctx) => {
    const days = data.weeklyPlan.map((d) => d.day);
    for (let i = 0; i < 7; i++) {
      if (days[i] !== VALID_DAYS[i]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Weekly plan day ${i + 1} must be "${VALID_DAYS[i]}", got "${days[i]}".`,
          path: ['weeklyPlan', i, 'day'],
        });
      }
    }
  });

export type InsightsResponse = z.infer<typeof InsightsResponseSchema>;

// ─── Gemini JSON Schema ───
// Static JSON Schema for Gemini structured output (amendment 3).
// Hand-written to match InsightsResponseSchema exactly, because
// Zod v4 doesn't have a stable .toJsonSchema() API.

export const INSIGHTS_RESPONSE_JSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    summary: {
      type: 'string' as const,
      minLength: 1,
      maxLength: STRING_LIMITS.summary,
    },
    actionExplanations: {
      type: 'array' as const,
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'object' as const,
        properties: {
          actionId: {
            type: 'string' as const,
            minLength: 1,
            maxLength: STRING_LIMITS.id,
          },
          explanation: {
            type: 'string' as const,
            minLength: 1,
            maxLength: STRING_LIMITS.explanation,
          },
        },
        required: ['actionId', 'explanation'] as const,
        additionalProperties: false,
      },
    },
    weeklyPlan: {
      type: 'array' as const,
      minItems: 7,
      maxItems: 7,
      items: {
        type: 'object' as const,
        properties: {
          day: {
            type: 'string' as const,
            enum: [
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ] as const,
          },
          task: {
            type: 'string' as const,
            minLength: 1,
            maxLength: STRING_LIMITS.planTask,
          },
        },
        required: ['day', 'task'] as const,
        additionalProperties: false,
      },
    },
    caveat: {
      type: 'string' as const,
      minLength: 1,
      maxLength: STRING_LIMITS.caveat,
    },
  },
  required: ['summary', 'actionExplanations', 'weeklyPlan', 'caveat'] as const,
  additionalProperties: false,
};

// ─── Post-validation for AI response integrity (amendment 2) ───

/** Numbers that look like carbon savings or emission factors */
const CARBON_NUMBER_PATTERN = /\d+\.?\d*\s*(kg|tonnes?|t)\s*CO2e?/i;

export interface ResponseIntegrityResult {
  valid: boolean;
  issues: string[];
}

/**
 * Validate AI response integrity against the original request.
 * - Every actionId must exist in supplied actions
 * - Number of action explanations matches supplied actions exactly
 * - Action ordering preserved
 * - Seven unique, ordered days
 * - No new numeric carbon claims
 */
export function validateResponseIntegrity(
  response: InsightsResponse,
  suppliedActionIds: string[],
): ResponseIntegrityResult {
  const issues: string[] = [];
  const suppliedSet = new Set(suppliedActionIds);

  // 1. Every returned actionId must exist in supplied actions, and count must match exactly
  if (response.actionExplanations.length !== suppliedActionIds.length) {
    issues.push(
      `Expected exactly ${suppliedActionIds.length} action explanations, got ${response.actionExplanations.length}.`,
    );
  }

  for (const expl of response.actionExplanations) {
    if (!suppliedSet.has(expl.actionId)) {
      issues.push(`actionId "${expl.actionId}" not in supplied actions.`);
    }
  }

  // 2. Preserve deterministic action ordering
  const returnedIds = response.actionExplanations.map((e) => e.actionId);
  const returnedInSuppliedOrder = returnedIds.filter((id) => suppliedSet.has(id));
  const suppliedFiltered = suppliedActionIds.filter((id) => returnedIds.includes(id));
  for (let i = 0; i < returnedInSuppliedOrder.length; i++) {
    if (returnedInSuppliedOrder[i] !== suppliedFiltered[i]) {
      issues.push('Action explanations must preserve deterministic ranking order.');
      break;
    }
  }

  // 3. Seven unique, ordered days
  const days = response.weeklyPlan.map((d) => d.day);
  const uniqueDays = new Set(days);
  if (uniqueDays.size !== 7) {
    issues.push(`Weekly plan must have 7 unique days (got ${uniqueDays.size}).`);
  }
  for (let i = 0; i < days.length; i++) {
    if (days[i] !== VALID_DAYS[i]) {
      issues.push(`Weekly plan day ${i + 1} should be "${VALID_DAYS[i]}", got "${days[i]}".`);
      break;
    }
  }

  // 4. AI output must not contain new numeric carbon savings
  const allText = [
    response.summary,
    response.caveat,
    ...response.actionExplanations.map((e) => e.explanation),
    ...response.weeklyPlan.map((d) => d.task),
  ].join(' ');

  if (CARBON_NUMBER_PATTERN.test(allText)) {
    issues.push('AI output must not contain numeric carbon savings or emission factors.');
  }

  return { valid: issues.length === 0, issues };
}
