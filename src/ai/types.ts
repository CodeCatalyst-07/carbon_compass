/**
 * AI insights type definitions.
 *
 * These types mirror the backend response schema.
 * Shared by the adapter, hook, and panel component.
 */

import { z } from 'zod';

export const AIInsightsResponseSchema = z
  .object({
    summary: z.string().min(1).max(500),
    actionExplanations: z
      .array(
        z
          .object({
            actionId: z.string().min(1).max(64),
            explanation: z.string().min(1).max(600),
          })
          .strict(),
      )
      .min(1)
      .max(5),
    weeklyPlan: z
      .array(
        z
          .object({
            day: z.string().min(1).max(20),
            task: z.string().min(1).max(300),
          })
          .strict(),
      )
      .length(7),
    caveat: z.string().min(1).max(400),
  })
  .strict()
  .superRefine((data, ctx) => {
    const VALID_DAYS = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
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

export type AIInsightsResponse = z.infer<typeof AIInsightsResponseSchema>;

export type AIInsightsErrorKind =
  | 'unconfigured'
  | 'offline'
  | 'rate-limited'
  | 'malformed'
  | 'timeout'
  | 'server-error'
  | 'unknown';

export type AIInsightsStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'success'; data: AIInsightsResponse; fromCache: boolean }
  | { state: 'error'; error: AIInsightsErrorKind; message: string }
  | { state: 'cooldown'; retryAfterMs: number };

/**
 * Minimal request payload sent to the AI endpoint.
 * No name, email, address, or free-form prompt.
 */
export interface AIInsightsRequest {
  factorRegistryVersion: string;
  totals: {
    annualKgCO2e: number;
    monthlyKgCO2e: number;
  };
  categoryShares: Array<{
    category: string;
    percentage: number;
    annualKgCO2e: number;
  }>;
  topDrivers: Array<{
    category: string;
    percentage: number;
    reason: string;
  }>;
  rankedActions: Array<{
    id: string;
    title: string;
    rank: number;
  }>;
  goal: {
    reductionGoalPercent: number | null;
  };
  constraints: {
    effortPreference: string;
    budgetSensitivity: string;
  };
}
