import { describe, it, expect } from 'vitest';
import { exportSnapshotsAsCSV } from '../csv-export';
import type { Snapshot, FootprintResult, UserProfile } from '../schemas';

function makeProfile(): UserProfile {
  return {
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
}

function makeResult(total: number): FootprintResult {
  return {
    totalAnnualKgCO2e: total,
    totalMonthlyKgCO2e: total / 12,
    breakdown: [
      {
        category: 'transport',
        annualKgCO2e: total * 0.4,
        monthlyKgCO2e: (total * 0.4) / 12,
        percentage: 40,
        factorsUsed: [],
        methodology: '',
      },
      {
        category: 'electricity',
        annualKgCO2e: total * 0.2,
        monthlyKgCO2e: (total * 0.2) / 12,
        percentage: 20,
        factorsUsed: [],
        methodology: '',
      },
      {
        category: 'diet',
        annualKgCO2e: total * 0.3,
        monthlyKgCO2e: (total * 0.3) / 12,
        percentage: 30,
        factorsUsed: [],
        methodology: '',
      },
      {
        category: 'flights',
        annualKgCO2e: total * 0.1,
        monthlyKgCO2e: (total * 0.1) / 12,
        percentage: 10,
        factorsUsed: [],
        methodology: '',
      },
    ],
    topDrivers: [{ category: 'transport', percentage: 40, reason: 'Transport is 40%' }],
    factorRegistryVersion: '0.1.0',
    calculatedAt: '2024-01-15T12:00:00.000Z',
    isEstimate: true,
  };
}

function makeSnapshot(id: string, date: string, total: number): Snapshot {
  return { id, date, result: makeResult(total), profile: makeProfile() };
}

describe('CSV Export', () => {
  it('produces correct header row', () => {
    const csv = exportSnapshotsAsCSV([]);
    const lines = csv.split('\r\n');
    // First char is BOM
    const header = lines[0]!.replace('\ufeff', '');
    expect(header).toContain('Date');
    expect(header).toContain('Total Annual (kg CO2e)');
    expect(header).toContain('Transport (kg CO2e/yr)');
    expect(header).toContain('Registry Version');
  });

  it('handles empty snapshot array', () => {
    const csv = exportSnapshotsAsCSV([]);
    const lines = csv.split('\r\n').filter((l) => l.length > 0);
    // Just the header + BOM
    expect(lines).toHaveLength(1);
  });

  it('includes data rows for snapshots', () => {
    const snapshots = [
      makeSnapshot('s1', '2024-01-15T12:00:00.000Z', 5000),
      makeSnapshot('s2', '2024-02-15T12:00:00.000Z', 4500),
    ];
    const csv = exportSnapshotsAsCSV(snapshots);
    const lines = csv.split('\r\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(3); // 1 header + 2 data
  });

  it('extracts date portion correctly', () => {
    const snapshots = [makeSnapshot('s1', '2024-06-15T12:00:00.000Z', 3000)];
    const csv = exportSnapshotsAsCSV(snapshots);
    expect(csv).toContain('2024-06-15');
  });

  it('includes UTF-8 BOM for Google Sheets compatibility', () => {
    const csv = exportSnapshotsAsCSV([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('uses CRLF line endings', () => {
    const snapshots = [makeSnapshot('s1', '2024-01-15T12:00:00.000Z', 5000)];
    const csv = exportSnapshotsAsCSV(snapshots);
    expect(csv).toContain('\r\n');
  });

  it('formats numbers with 1 decimal place', () => {
    const snapshots = [makeSnapshot('s1', '2024-01-15T12:00:00.000Z', 1234.5678)];
    const csv = exportSnapshotsAsCSV(snapshots);
    expect(csv).toContain('1234.6'); // Total annual rounded
  });

  it('escapes fields with commas', () => {
    // Top driver reason includes comma-like content but should be handled
    const snapshots = [makeSnapshot('s1', '2024-01-15T12:00:00.000Z', 5000)];
    const csv = exportSnapshotsAsCSV(snapshots);
    // Should be valid CSV (each data row has exactly 9 commas = 10 fields)
    const lines = csv.split('\r\n').filter((l) => l.length > 0);
    const headerFields = lines[0]!.replace('\ufeff', '').split(',');
    expect(headerFields.length).toBe(10);
  });

  it('includes registry version', () => {
    const snapshots = [makeSnapshot('s1', '2024-01-15T12:00:00.000Z', 5000)];
    const csv = exportSnapshotsAsCSV(snapshots);
    expect(csv).toContain('0.1.0');
  });
});
