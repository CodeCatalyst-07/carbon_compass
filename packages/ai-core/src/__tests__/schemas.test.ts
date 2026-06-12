/**
 * Tests for request/response schemas.
 *
 * Covers amendment 1 (request validation) and amendment 2 (response integrity).
 */

import { describe, it, expect } from 'vitest';
import {
  InsightsRequestSchema,
  InsightsResponseSchema,
  validateResponseIntegrity,
  KNOWN_CATEGORIES,
} from '../schemas.js';

// ─── Helpers ───

function validRequest() {
  return {
    factorRegistryVersion: '0.2.0',
    totals: { annualKgCO2e: 5000, monthlyKgCO2e: 416.7 },
    categoryShares: [
      { category: 'transport' as const, percentage: 30, annualKgCO2e: 1500 },
      { category: 'electricity' as const, percentage: 20, annualKgCO2e: 1000 },
      { category: 'diet' as const, percentage: 40, annualKgCO2e: 2000 },
      { category: 'flights' as const, percentage: 10, annualKgCO2e: 500 },
    ],
    topDrivers: [
      {
        category: 'diet' as const,
        percentage: 40,
        reason: 'Diet contributes 40% of your footprint.',
      },
    ],
    rankedActions: [
      { id: 'diet-reduce-meat', title: 'Reduce meat consumption', rank: 1 },
      { id: 'transport-reduce-car', title: 'Reduce car journeys', rank: 2 },
      { id: 'electricity-reduce-usage', title: 'Reduce electricity', rank: 3 },
    ],
    goal: { reductionGoalPercent: 20 },
    constraints: { effortPreference: 'medium' as const, budgetSensitivity: 'medium' as const },
  };
}

function validResponse() {
  return {
    summary: 'Your footprint is primarily driven by diet choices.',
    actionExplanations: [
      { actionId: 'diet-reduce-meat', explanation: 'Reducing meat lowers food emissions.' },
      { actionId: 'transport-reduce-car', explanation: 'Fewer car trips cut transport emissions.' },
      {
        actionId: 'electricity-reduce-usage',
        explanation: 'Less electricity means less grid emissions.',
      },
    ],
    weeklyPlan: [
      { day: 'Monday', task: 'Try a plant-based breakfast.' },
      { day: 'Tuesday', task: 'Walk to the nearest shop.' },
      { day: 'Wednesday', task: 'Turn off lights when leaving rooms.' },
      { day: 'Thursday', task: 'Pack a vegetarian lunch.' },
      { day: 'Friday', task: 'Use public transport for one trip.' },
      { day: 'Saturday', task: 'Cook a fully plant-based dinner.' },
      { day: 'Sunday', task: "Plan next week's meals to reduce waste." },
    ],
    caveat: 'All values are estimates based on published emission factors with known limitations.',
  };
}

// ─── Request Validation ───

describe('InsightsRequestSchema', () => {
  it('accepts a valid request', () => {
    const result = InsightsRequestSchema.safeParse(validRequest());
    expect(result.success).toBe(true);
  });

  it('rejects unknown fields (.strict)', () => {
    const result = InsightsRequestSchema.safeParse({
      ...validRequest(),
      unknownField: 'should fail',
    });
    expect(result.success).toBe(false);
  });

  it('rejects nested unknown fields', () => {
    const req = validRequest();
    (req.totals as Record<string, unknown>).extra = 42;
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range annualKgCO2e (does not clamp)', () => {
    const req = validRequest();
    req.totals.annualKgCO2e = 999_999;
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects negative annualKgCO2e', () => {
    const req = validRequest();
    req.totals.annualKgCO2e = -1;
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects unknown category', () => {
    const req = validRequest();
    (req.categoryShares[0] as Record<string, unknown>).category = 'unknown-category';
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('accepts only the four known categories', () => {
    expect(KNOWN_CATEGORIES).toEqual(['transport', 'electricity', 'diet', 'flights']);
  });

  it('rejects duplicate category IDs', () => {
    const req = validRequest();
    req.categoryShares = [
      { category: 'transport', percentage: 50, annualKgCO2e: 2500 },
      { category: 'transport', percentage: 50, annualKgCO2e: 2500 },
    ];
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects duplicate action IDs', () => {
    const req = validRequest();
    req.rankedActions = [
      { id: 'same-id', title: 'First', rank: 1 },
      { id: 'same-id', title: 'Second', rank: 2 },
    ];
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects more than 5 ranked actions', () => {
    const req = validRequest();
    req.rankedActions = Array.from({ length: 6 }, (_, i) => ({
      id: `action-${i}`,
      title: `Action ${i}`,
      rank: i + 1,
    }));
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects more than 2 top drivers', () => {
    const req = validRequest();
    req.topDrivers = [
      { category: 'transport', percentage: 30, reason: 'R1' },
      { category: 'diet', percentage: 40, reason: 'R2' },
      { category: 'electricity', percentage: 20, reason: 'R3' },
    ];
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects when category totals disagree with annual total', () => {
    const req = validRequest();
    // Categories sum to 5000 but annual says 10000
    req.totals.annualKgCO2e = 10000;
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects when percentages do not sum to ~100%', () => {
    const req = validRequest();
    req.categoryShares = [
      { category: 'transport', percentage: 10, annualKgCO2e: 1500 },
      { category: 'electricity', percentage: 10, annualKgCO2e: 1000 },
      { category: 'diet', percentage: 10, annualKgCO2e: 2000 },
      { category: 'flights', percentage: 10, annualKgCO2e: 500 },
    ];
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects top driver referencing non-supplied category', () => {
    const req = validRequest();
    req.categoryShares = [{ category: 'transport', percentage: 100, annualKgCO2e: 5000 }];
    req.topDrivers = [{ category: 'diet', percentage: 40, reason: 'Diet is missing from shares.' }];
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects actions not ordered by rank', () => {
    const req = validRequest();
    req.rankedActions = [
      { id: 'a1', title: 'First', rank: 3 },
      { id: 'a2', title: 'Second', rank: 1 },
    ];
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = InsightsRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects excessively long IDs', () => {
    const req = validRequest();
    req.rankedActions[0]!.id = 'a'.repeat(100);
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('rejects excessively long titles', () => {
    const req = validRequest();
    req.rankedActions[0]!.title = 'a'.repeat(200);
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it('accepts null reductionGoalPercent', () => {
    const req = validRequest();
    req.goal.reductionGoalPercent = null;
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(true);
  });

  it('accepts zero topDrivers', () => {
    const req = validRequest();
    req.topDrivers = [];
    const result = InsightsRequestSchema.safeParse(req);
    expect(result.success).toBe(true);
  });
});

// ─── Response Validation ───

describe('InsightsResponseSchema', () => {
  it('accepts a valid response', () => {
    const result = InsightsResponseSchema.safeParse(validResponse());
    expect(result.success).toBe(true);
  });

  it('accepts 1 or 2 action explanations (fewer-than-3)', () => {
    const resp = validResponse();
    resp.actionExplanations = resp.actionExplanations.slice(0, 2);
    const result = InsightsResponseSchema.safeParse(resp);
    expect(result.success).toBe(true);
  });

  it('rejects empty action explanations', () => {
    const resp = validResponse();
    resp.actionExplanations = [];
    const result = InsightsResponseSchema.safeParse(resp);
    expect(result.success).toBe(false);
  });

  it('rejects weeklyPlan with fewer than 7 days', () => {
    const resp = validResponse();
    resp.weeklyPlan = resp.weeklyPlan.slice(0, 5);
    const result = InsightsResponseSchema.safeParse(resp);
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields in response', () => {
    const result = InsightsResponseSchema.safeParse({
      ...validResponse(),
      extraField: 'nope',
    });
    expect(result.success).toBe(false);
  });

  it('rejects excessively long summary', () => {
    const resp = validResponse();
    resp.summary = 'a'.repeat(600);
    const result = InsightsResponseSchema.safeParse(resp);
    expect(result.success).toBe(false);
  });
});

// ─── Response Integrity (amendment 2) ───

describe('validateResponseIntegrity', () => {
  const suppliedIds = ['diet-reduce-meat', 'transport-reduce-car', 'electricity-reduce-usage'];

  it('passes for valid response matching supplied actions', () => {
    const result = validateResponseIntegrity(validResponse(), suppliedIds);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('fails when response contains unknown actionId', () => {
    const resp = validResponse();
    resp.actionExplanations[0]!.actionId = 'invented-action';
    const result = validateResponseIntegrity(resp, suppliedIds);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('actionId "invented-action" not in supplied actions.');
  });

  it('fails when action ordering is not preserved', () => {
    const resp = validResponse();
    // Swap order
    const temp = resp.actionExplanations[0]!;
    resp.actionExplanations[0] = resp.actionExplanations[1]!;
    resp.actionExplanations[1] = temp;
    const result = validateResponseIntegrity(resp, suppliedIds);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('preserve deterministic ranking order'))).toBe(
      true,
    );
  });

  it('fails when days are not unique', () => {
    const resp = validResponse();
    resp.weeklyPlan[1]!.day = 'Monday'; // Duplicate
    const result = validateResponseIntegrity(resp, suppliedIds);
    expect(result.valid).toBe(false);
  });

  it('fails when days are not in standard order', () => {
    const resp = validResponse();
    resp.weeklyPlan[0]!.day = 'Sunday'; // Wrong order
    resp.weeklyPlan[6]!.day = 'Monday';
    const result = validateResponseIntegrity(resp, suppliedIds);
    expect(result.valid).toBe(false);
  });

  it('fails when AI output contains numeric carbon claims', () => {
    const resp = validResponse();
    resp.actionExplanations[0]!.explanation = 'This saves 500 kg CO2e per year.';
    const result = validateResponseIntegrity(resp, suppliedIds);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('numeric carbon savings'))).toBe(true);
  });

  it('fails when AI summary contains emission factors', () => {
    const resp = validResponse();
    resp.summary = 'Your diet produces 7.19 kg CO2e per day.';
    const result = validateResponseIntegrity(resp, suppliedIds);
    expect(result.valid).toBe(false);
  });

  it('passes validateResponseIntegrity for fewer-than-3 action cases', () => {
    const resp = validResponse();
    resp.actionExplanations = resp.actionExplanations.slice(0, 1);
    const result = validateResponseIntegrity(resp, ['diet-reduce-meat']);
    expect(result.valid).toBe(true);
  });

  it('fails validateResponseIntegrity when action count mismatches supplied actions', () => {
    const resp = validResponse();
    // 3 explanations, but only 2 supplied action IDs
    const result = validateResponseIntegrity(resp, ['diet-reduce-meat', 'transport-reduce-car']);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('Expected exactly 2 action explanations'))).toBe(
      true,
    );
  });
});
