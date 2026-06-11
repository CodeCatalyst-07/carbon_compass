import { z } from 'zod';

// ─── Schema Version ───
export const CURRENT_SCHEMA_VERSION = 1;

// ─── Transport ───
export const TransportModeSchema = z.enum(['car', 'bus', 'train', 'bicycle', 'walk']);
export type TransportMode = z.infer<typeof TransportModeSchema>;

export const TransportEntrySchema = z.object({
  mode: TransportModeSchema,
  weeklyDistanceKm: z.number().nonnegative().finite(),
});

export const TransportProfileSchema = z.object({
  modes: z.array(TransportEntrySchema),
});

// ─── Electricity ───
export const ElectricityProfileSchema = z.object({
  monthlyKwh: z.number().nonnegative().finite(),
  isPersonalUsage: z.boolean(),
  householdSize: z.number().int().positive().finite(),
});

// ─── Diet ───
export const DietProfileSchema = z.enum(['heavy-meat', 'vegetarian', 'vegan']);
export type DietProfile = z.infer<typeof DietProfileSchema>;

// ─── Flights ───
export const FlightsProfileSchema = z.object({
  shortHaulLegs: z.number().int().nonnegative().finite(),
  mediumHaulLegs: z.number().int().nonnegative().finite(),
  longHaulLegs: z.number().int().nonnegative().finite(),
});

// ─── Personalization ───
export const EffortPreferenceSchema = z.enum(['low', 'medium', 'high']);
export const BudgetSensitivitySchema = z.enum(['low', 'medium', 'high']);

export const PersonalizationConstraintsSchema = z.object({
  reductionGoalPercent: z.number().nonnegative().max(100).finite().nullable(),
  effortPreference: EffortPreferenceSchema,
  budgetSensitivity: BudgetSensitivitySchema,
});

// ─── User Profile ───
export const UserProfileSchema = z.object({
  transport: TransportProfileSchema,
  electricity: ElectricityProfileSchema,
  diet: DietProfileSchema,
  flights: FlightsProfileSchema,
  personalization: PersonalizationConstraintsSchema,
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// ─── Category Breakdown ───
export const CategorySchema = z.enum(['transport', 'electricity', 'diet', 'flights']);
export type Category = z.infer<typeof CategorySchema>;

export const CategoryBreakdownSchema = z.object({
  category: CategorySchema,
  annualKgCO2e: z.number().nonnegative().finite(),
  monthlyKgCO2e: z.number().nonnegative().finite(),
  percentage: z.number().nonnegative().max(100).finite(),
  factorsUsed: z.array(z.string()),
  methodology: z.string(),
});
export type CategoryBreakdown = z.infer<typeof CategoryBreakdownSchema>;

// ─── Top Drivers ───
export const TopDriverSchema = z.object({
  category: CategorySchema,
  percentage: z.number().nonnegative().max(100).finite(),
  reason: z.string(),
});
export type TopDriver = z.infer<typeof TopDriverSchema>;

// ─── Footprint Result ───
export const FootprintResultSchema = z.object({
  totalAnnualKgCO2e: z.number().nonnegative().finite(),
  totalMonthlyKgCO2e: z.number().nonnegative().finite(),
  breakdown: z.array(CategoryBreakdownSchema),
  topDrivers: z.array(TopDriverSchema).max(2),
  factorRegistryVersion: z.string(),
  calculatedAt: z.string().datetime(),
  isEstimate: z.literal(true),
});
export type FootprintResult = z.infer<typeof FootprintResultSchema>;

// ─── Snapshot ───
export const SnapshotSchema = z.object({
  id: z.string().min(1),
  date: z.string().datetime(),
  result: FootprintResultSchema,
  profile: UserProfileSchema,
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

// ─── Action Tracking ───
export const ActionStatusSchema = z.enum(['suggested', 'planned', 'completed', 'dismissed']);
export type ActionStatus = z.infer<typeof ActionStatusSchema>;

export const TrackedActionSchema = z.object({
  actionId: z.string().min(1),
  status: ActionStatusSchema,
  plannedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  notes: z.string(),
});
export type TrackedAction = z.infer<typeof TrackedActionSchema>;

// ─── Display Unit ───
export const DisplayUnitSchema = z.enum(['kg', 'tonnes']);
export type DisplayUnit = z.infer<typeof DisplayUnitSchema>;

// ─── Settings ───
export const SettingsSchema = z.object({
  displayUnit: DisplayUnitSchema,
  createdAt: z.string().datetime(),
});
export type Settings = z.infer<typeof SettingsSchema>;

// ─── AI Cache ───
export const AICacheEntrySchema = z.object({
  requestHash: z.string(),
  factorRegistryVersion: z.string(),
  promptVersion: z.string(),
  model: z.string(),
  response: z.object({
    type: z.enum(['explanation', 'action-plan']),
    content: z.string(),
    sections: z
      .array(
        z.object({
          heading: z.string(),
          body: z.string(),
        }),
      )
      .optional(),
    generatedAt: z.string().datetime(),
  }),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type AICacheEntry = z.infer<typeof AICacheEntrySchema>;

// ─── Root Storage Schema (versioned) ───
export const StoredDataSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  profile: UserProfileSchema.nullable(),
  snapshots: z.array(SnapshotSchema),
  trackedActions: z.array(TrackedActionSchema),
  settings: SettingsSchema,
  aiCache: z.array(AICacheEntrySchema),
});
export type StoredData = z.infer<typeof StoredDataSchema>;

// ─── Import Schema ───
// Same as StoredData but allows any schemaVersion for migration
export const ImportDataSchema = z.object({
  schemaVersion: z.number().int().positive(),
  profile: UserProfileSchema.nullable(),
  snapshots: z.array(SnapshotSchema),
  trackedActions: z.array(TrackedActionSchema),
  settings: SettingsSchema,
  aiCache: z.array(AICacheEntrySchema),
});

// ─── Default State ───
export function createDefaultStoredData(): StoredData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: null,
    snapshots: [],
    trackedActions: [],
    settings: {
      displayUnit: 'kg',
      createdAt: new Date().toISOString(),
    },
    aiCache: [],
  };
}
