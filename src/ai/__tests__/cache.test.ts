import { describe, it, expect, beforeEach } from 'vitest';
import { lookupCache, storeInCache, buildCacheKey } from '../cache';
import {
  getCachedAIResponse,
  createMemoryBackend,
  type StorageBackend,
} from '../../storage/adapter';
import type { AIInsightsRequest, AIInsightsResponse } from '../types';

const mockRequest: AIInsightsRequest = {
  factorRegistryVersion: '0.2.0',
  totals: { annualKgCO2e: 5000, monthlyKgCO2e: 416.7 },
  categoryShares: [{ category: 'transport', percentage: 100, annualKgCO2e: 5000 }],
  topDrivers: [],
  rankedActions: [{ id: 'diet-reduce-meat', title: 'Reduce meat', rank: 1 }],
  goal: { reductionGoalPercent: 20 },
  constraints: { effortPreference: 'medium', budgetSensitivity: 'medium' },
};

const mockValidResponse: AIInsightsResponse = {
  summary: 'Valid summary.',
  actionExplanations: [{ actionId: 'diet-reduce-meat', explanation: 'Reducing meat is good.' }],
  weeklyPlan: [
    { day: 'Monday', task: 'Task 1' },
    { day: 'Tuesday', task: 'Task 2' },
    { day: 'Wednesday', task: 'Task 3' },
    { day: 'Thursday', task: 'Task 4' },
    { day: 'Friday', task: 'Task 5' },
    { day: 'Saturday', task: 'Task 6' },
    { day: 'Sunday', task: 'Task 7' },
  ],
  caveat: 'This is a caveat.',
};

describe('AI Cache', () => {
  let backend: StorageBackend;

  beforeEach(() => {
    backend = createMemoryBackend();
  });

  it('stores and retrieves valid cache entries', () => {
    storeInCache(mockRequest, mockValidResponse, backend);
    const cached = lookupCache(mockRequest, backend);
    expect(cached).toEqual(mockValidResponse);
  });

  it('removes corrupt cache entries and returns null on schema mismatch', () => {
    storeInCache(mockRequest, mockValidResponse, backend);

    const key = buildCacheKey(mockRequest);
    const entry = getCachedAIResponse(key, backend);
    expect(entry).not.toBeNull();

    // Corrupt the content structure (missing fields)
    const corruptEntry = {
      ...entry!,
      response: {
        ...entry!.response,
        content: JSON.stringify({ summary: 'Corrupt summary (missing other fields)' }),
      },
    };

    // Save corrupt entry manually to our memory backend
    const data = JSON.parse(backend.getItem('carbon-compass-data') || '{}');
    data.aiCache = [corruptEntry];
    backend.setItem('carbon-compass-data', JSON.stringify(data));

    // Lookup should return null and delete the corrupt cache entry
    const cached = lookupCache(mockRequest, backend);
    expect(cached).toBeNull();

    // Verify it was deleted from backend
    const deletedEntry = getCachedAIResponse(key, backend);
    expect(deletedEntry).toBeNull();
  });

  it('removes corrupt cache entries and returns null on invalid JSON syntax', () => {
    storeInCache(mockRequest, mockValidResponse, backend);
    const key = buildCacheKey(mockRequest);

    const entry = getCachedAIResponse(key, backend);
    expect(entry).not.toBeNull();

    // Corrupt with invalid JSON string syntax
    const corruptEntry = {
      ...entry!,
      response: {
        ...entry!.response,
        content: '{invalid-json',
      },
    };

    // Save corrupt entry manually to our memory backend
    const data = JSON.parse(backend.getItem('carbon-compass-data') || '{}');
    data.aiCache = [corruptEntry];
    backend.setItem('carbon-compass-data', JSON.stringify(data));

    const cached = lookupCache(mockRequest, backend);
    expect(cached).toBeNull();

    const deletedEntry = getCachedAIResponse(key, backend);
    expect(deletedEntry).toBeNull();
  });
});
