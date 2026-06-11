import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadData,
  saveProfile,
  addSnapshot,
  deleteSnapshot,
  setActionStatus,
  getSettings,
  updateSettings,
  deleteAllData,
  exportDataAsJSON,
  importData,
  createMemoryBackend,
  type StorageBackend,
} from '../adapter';
import {
  createDefaultStoredData,
  type UserProfile,
  type Snapshot,
  type FootprintResult,
} from '../schemas';

// ─── Helpers ───

function makeProfile(): UserProfile {
  return {
    transport: { modes: [{ mode: 'car', weeklyDistanceKm: 100 }] },
    electricity: { monthlyKwh: 300, isPersonalUsage: true, householdSize: 1 },
    diet: 'heavy-meat',
    flights: { shortHaulLegs: 2, mediumHaulLegs: 0, longHaulLegs: 0 },
    personalization: {
      reductionGoalPercent: null,
      effortPreference: 'medium',
      budgetSensitivity: 'medium',
    },
  };
}

function makeResult(): FootprintResult {
  return {
    totalAnnualKgCO2e: 5000,
    totalMonthlyKgCO2e: 416.67,
    breakdown: [
      {
        category: 'transport',
        annualKgCO2e: 2000,
        monthlyKgCO2e: 166.67,
        percentage: 40,
        factorsUsed: [],
        methodology: '',
      },
      {
        category: 'electricity',
        annualKgCO2e: 1000,
        monthlyKgCO2e: 83.33,
        percentage: 20,
        factorsUsed: [],
        methodology: '',
      },
      {
        category: 'diet',
        annualKgCO2e: 1500,
        monthlyKgCO2e: 125,
        percentage: 30,
        factorsUsed: [],
        methodology: '',
      },
      {
        category: 'flights',
        annualKgCO2e: 500,
        monthlyKgCO2e: 41.67,
        percentage: 10,
        factorsUsed: [],
        methodology: '',
      },
    ],
    topDrivers: [{ category: 'transport', percentage: 40, reason: 'Transport is 40%' }],
    factorRegistryVersion: '0.1.0',
    calculatedAt: new Date().toISOString(),
    isEstimate: true,
  };
}

function makeSnapshot(id: string, date?: string): Snapshot {
  return {
    id,
    date: date ?? new Date().toISOString(),
    result: makeResult(),
    profile: makeProfile(),
  };
}

// ─── Tests ───

describe('Storage Adapter (injected backend)', () => {
  let backend: StorageBackend;

  beforeEach(() => {
    backend = createMemoryBackend();
  });

  describe('loadData', () => {
    it('returns default data for empty storage', () => {
      const data = loadData(backend);
      expect(data.schemaVersion).toBe(1);
      expect(data.profile).toBeNull();
      expect(data.snapshots).toEqual([]);
      expect(data.trackedActions).toEqual([]);
    });

    it('recovers from corrupt JSON', () => {
      backend.setItem('carbon-compass-data', '{invalid json!!!');
      const data = loadData(backend);
      expect(data.schemaVersion).toBe(1);
      expect(data.profile).toBeNull();
    });

    it('recovers from non-object JSON', () => {
      backend.setItem('carbon-compass-data', '"just a string"');
      const data = loadData(backend);
      expect(data.profile).toBeNull();
    });
  });

  describe('saveProfile / getProfile', () => {
    it('persists and retrieves profile', () => {
      const profile = makeProfile();
      saveProfile(profile, backend);
      const data = loadData(backend);
      expect(data.profile).toEqual(profile);
    });
  });

  describe('snapshots', () => {
    it('adds a snapshot', () => {
      const snapshot = makeSnapshot('snap-1');
      addSnapshot(snapshot, backend);
      const data = loadData(backend);
      expect(data.snapshots).toHaveLength(1);
      expect(data.snapshots[0]!.id).toBe('snap-1');
    });

    it('caps snapshots at 52', () => {
      for (let i = 0; i < 55; i++) {
        addSnapshot(makeSnapshot(`snap-${i}`), backend);
      }
      const data = loadData(backend);
      expect(data.snapshots).toHaveLength(52);
      // Should keep the most recent
      expect(data.snapshots[0]!.id).toBe('snap-3');
      expect(data.snapshots[51]!.id).toBe('snap-54');
    });

    it('deletes a snapshot by ID', () => {
      addSnapshot(makeSnapshot('snap-a'), backend);
      addSnapshot(makeSnapshot('snap-b'), backend);
      addSnapshot(makeSnapshot('snap-c'), backend);

      const deleted = deleteSnapshot('snap-b', backend);
      expect(deleted).toBe(true);

      const data = loadData(backend);
      expect(data.snapshots).toHaveLength(2);
      expect(data.snapshots.map((s) => s.id)).toEqual(['snap-a', 'snap-c']);
    });

    it('returns false when deleting non-existent snapshot', () => {
      addSnapshot(makeSnapshot('snap-1'), backend);
      const deleted = deleteSnapshot('non-existent', backend);
      expect(deleted).toBe(false);
    });

    it('can delete the only snapshot', () => {
      addSnapshot(makeSnapshot('only'), backend);
      const deleted = deleteSnapshot('only', backend);
      expect(deleted).toBe(true);
      expect(loadData(backend).snapshots).toHaveLength(0);
    });
  });

  describe('action tracking', () => {
    it('creates a new tracked action', () => {
      setActionStatus('action-1', 'planned', undefined, backend);
      const data = loadData(backend);
      expect(data.trackedActions).toHaveLength(1);
      expect(data.trackedActions[0]!.actionId).toBe('action-1');
      expect(data.trackedActions[0]!.status).toBe('planned');
      expect(data.trackedActions[0]!.plannedAt).toBeTruthy();
    });

    it('updates an existing tracked action', () => {
      setActionStatus('action-1', 'planned', undefined, backend);
      setActionStatus('action-1', 'completed', 'Done!', backend);
      const data = loadData(backend);
      expect(data.trackedActions).toHaveLength(1);
      expect(data.trackedActions[0]!.status).toBe('completed');
      expect(data.trackedActions[0]!.completedAt).toBeTruthy();
      expect(data.trackedActions[0]!.notes).toBe('Done!');
    });
  });

  describe('settings', () => {
    it('returns default settings', () => {
      const settings = getSettings(backend);
      expect(settings.displayUnit).toBe('kg');
    });

    it('updates settings partially', () => {
      updateSettings({ displayUnit: 'tonnes' }, backend);
      const settings = getSettings(backend);
      expect(settings.displayUnit).toBe('tonnes');
      expect(settings.createdAt).toBeTruthy();
    });
  });

  describe('export / import / delete', () => {
    it('exports valid JSON', () => {
      saveProfile(makeProfile(), backend);
      addSnapshot(makeSnapshot('snap-1'), backend);
      const json = exportDataAsJSON(backend);
      const parsed = JSON.parse(json);
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.profile).toBeTruthy();
      expect(parsed.snapshots).toHaveLength(1);
    });

    it('imports data replacing current storage', () => {
      saveProfile(makeProfile(), backend);
      const newData = createDefaultStoredData();
      newData.profile = { ...makeProfile(), diet: 'vegan' };
      importData(newData, backend);
      const data = loadData(backend);
      expect(data.profile?.diet).toBe('vegan');
    });

    it('strips AI cache on import', () => {
      const importMe = createDefaultStoredData();
      importMe.aiCache = [
        {
          requestHash: 'abc',
          factorRegistryVersion: '0.1.0',
          promptVersion: '1',
          model: 'test',
          response: {
            type: 'explanation',
            content: 'test',
            generatedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ];
      importData(importMe, backend);
      const data = loadData(backend);
      expect(data.aiCache).toEqual([]);
    });

    it('deleteAllData clears everything', () => {
      saveProfile(makeProfile(), backend);
      addSnapshot(makeSnapshot('snap-1'), backend);
      deleteAllData(backend);
      const data = loadData(backend);
      expect(data.profile).toBeNull();
      expect(data.snapshots).toEqual([]);
    });
  });
});
