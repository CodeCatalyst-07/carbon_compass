import { describe, it, expect, beforeEach } from 'vitest';
import { loadDataWithStatus } from '../../storage/adapter';
import { createDefaultStoredData } from '../../storage/schemas';

// We directly test the loadDataWithStatus function here since
// it's the core recovery mechanism (amendment 5).
// The hook integration is tested at the component level.

describe('Corrupt storage recovery (amendment 5)', () => {
  let mockStorage: Record<string, string>;

  const mockBackend = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
  };

  beforeEach(() => {
    mockStorage = {};
  });

  it('returns fresh status when no data exists', () => {
    const result = loadDataWithStatus(mockBackend);
    expect(result.status).toBe('fresh');
    expect(result.data.profile).toBeNull();
  });

  it('returns recovered status for corrupt JSON', () => {
    mockStorage['carbon-compass-data'] = '{not valid json!!!}';
    const result = loadDataWithStatus(mockBackend);
    expect(result.status).toBe('recovered');
    expect(result.recoveryReason).toBeDefined();
    expect(result.recoveryReason).toContain('corrupted');
    expect(result.data.profile).toBeNull();
  });

  it('returns recovered status for non-object data', () => {
    mockStorage['carbon-compass-data'] = '"just a string"';
    const result = loadDataWithStatus(mockBackend);
    expect(result.status).toBe('recovered');
    expect(result.recoveryReason).toContain('unexpected format');
  });

  it('returns recovered status for data with profile that fails migration', () => {
    mockStorage['carbon-compass-data'] = JSON.stringify({
      profile: { invalid: true },
      snapshots: [],
    });
    const result = loadDataWithStatus(mockBackend);
    expect(result.status).toBe('recovered');
    expect(result.data).toBeDefined();
  });

  it('returns loaded status for valid data', () => {
    const validData = createDefaultStoredData();
    mockStorage['carbon-compass-data'] = JSON.stringify(validData);
    const result = loadDataWithStatus(mockBackend);
    expect(result.status).toBe('loaded');
    expect(result.recoveryReason).toBeUndefined();
  });

  it('provides a user-understandable recovery reason', () => {
    mockStorage['carbon-compass-data'] = 'broken';
    const result = loadDataWithStatus(mockBackend);
    expect(result.recoveryReason).toBeTruthy();
    // Should be human-readable, not a stack trace
    expect(result.recoveryReason!.length).toBeGreaterThan(10);
    expect(result.recoveryReason).not.toContain('TypeError');
    expect(result.recoveryReason).not.toContain('SyntaxError');
  });
});
