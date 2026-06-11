import { describe, it, expect } from 'vitest';
import { previewImport } from '../json-import';
import { createDefaultStoredData } from '../schemas';

describe('JSON Import Preview', () => {
  it('accepts valid current-version data', () => {
    const data = createDefaultStoredData();
    const json = JSON.stringify(data);
    const preview = previewImport(json);
    expect(preview.isValid).toBe(true);
    expect(preview.errors).toHaveLength(0);
    expect(preview.data).toBeTruthy();
    expect(preview.summary).toBeTruthy();
    expect(preview.summary!.schemaVersion).toBe(1);
  });

  it('rejects invalid JSON', () => {
    const preview = previewImport('{not valid json!!!}');
    expect(preview.isValid).toBe(false);
    expect(preview.errors[0]).toContain('Invalid JSON');
    expect(preview.data).toBeNull();
  });

  it('rejects non-object JSON', () => {
    const preview = previewImport('"just a string"');
    expect(preview.isValid).toBe(false);
    expect(preview.errors[0]).toContain('expected a JSON object');
  });

  it('rejects array JSON', () => {
    const preview = previewImport('[1, 2, 3]');
    expect(preview.isValid).toBe(false);
  });

  it('rejects missing schemaVersion', () => {
    const preview = previewImport(JSON.stringify({ profile: null }));
    expect(preview.isValid).toBe(false);
    expect(preview.errors[0]).toContain('schemaVersion');
  });

  it('rejects future schema version', () => {
    const data = createDefaultStoredData();
    const future = { ...data, schemaVersion: 999 };
    const preview = previewImport(JSON.stringify(future));
    expect(preview.isValid).toBe(false);
    expect(preview.errors[0]).toContain('newer version');
  });

  it('rejects oversized files', () => {
    // Create a string > 1MB
    const huge = JSON.stringify({ schemaVersion: 1, padding: 'x'.repeat(1024 * 1024 + 1) });
    const preview = previewImport(huge);
    expect(preview.isValid).toBe(false);
    expect(preview.errors[0]).toContain('too large');
  });

  it('generates summary for valid data', () => {
    const data = createDefaultStoredData();
    data.profile = {
      transport: { modes: [] },
      electricity: { monthlyKwh: 0, isPersonalUsage: true, householdSize: 1 },
      diet: 'vegan',
      flights: { shortHaulLegs: 0, mediumHaulLegs: 0, longHaulLegs: 0 },
      personalization: {
        reductionGoalPercent: null,
        effortPreference: 'medium',
        budgetSensitivity: 'medium',
      },
    };
    const preview = previewImport(JSON.stringify(data));
    expect(preview.summary!.profileExists).toBe(true);
    expect(preview.summary!.snapshotCount).toBe(0);
  });

  it('reports specific field errors for malformed data', () => {
    const bad = {
      schemaVersion: 1,
      profile: { transport: 'invalid' },
      snapshots: [],
      trackedActions: [],
      settings: { displayUnit: 'kg', createdAt: new Date().toISOString() },
      aiCache: [],
    };
    const preview = previewImport(JSON.stringify(bad));
    expect(preview.isValid).toBe(false);
    expect(preview.errors.length).toBeGreaterThan(0);
  });
});
