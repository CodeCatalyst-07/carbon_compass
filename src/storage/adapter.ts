import { migrateOrDefault } from './migrations';
import {
  StoredDataSchema,
  createDefaultStoredData,
  type StoredData,
  type UserProfile,
  type Snapshot,
  type ActionStatus,
  type Settings,
  type AICacheEntry,
} from './schemas';

const STORAGE_KEY = 'carbon-compass-data';
const MAX_SNAPSHOTS = 52;

// ─── Injectable Storage Interface ───

/**
 * Abstraction over key-value persistence.
 * Production uses localStorage; tests can inject a Map-based mock.
 */
export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Default browser localStorage backend. */
const browserBackend: StorageBackend = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => {
    localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
  },
};

// ─── Event System ───

type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Snapshot cache for useSyncExternalStore.
 * React's useSyncExternalStore requires getSnapshot to return the SAME
 * reference if the data hasn't changed. Without this cache, each call
 * to loadData() parses JSON and creates a new object, causing infinite
 * re-render loops.
 */
let _cachedSnapshot: StoredData | null = null;

function invalidateCache(): void {
  _cachedSnapshot = null;
}

function notifyListeners(): void {
  invalidateCache();
  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ─── Core Read / Write ───

/** Result of loading data with recovery status (amendment 5). */
export interface LoadResult {
  data: StoredData;
  /** 'loaded' = valid data, 'recovered' = corrupt data reset, 'fresh' = no stored data */
  status: 'loaded' | 'recovered' | 'fresh';
  /** Human-readable explanation when status is 'recovered'. */
  recoveryReason?: string;
}

/**
 * Load data with explicit recovery status.
 * Use this to detect corrupt storage and notify the user.
 */
export function loadDataWithStatus(backend: StorageBackend = browserBackend): LoadResult {
  try {
    const raw = backend.getItem(STORAGE_KEY);
    if (!raw) {
      return { data: createDefaultStoredData(), status: 'fresh' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        data: createDefaultStoredData(),
        status: 'recovered',
        recoveryReason:
          'Your saved data was corrupted and could not be read. A fresh start has been created.',
      };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return {
        data: createDefaultStoredData(),
        status: 'recovered',
        recoveryReason:
          'Your saved data was in an unexpected format. A fresh start has been created.',
      };
    }

    // Try direct validation first (fast path)
    const directResult = StoredDataSchema.safeParse(parsed);
    if (directResult.success) {
      return { data: directResult.data, status: 'loaded' };
    }

    // Try migration from older version
    const migrated = migrateOrDefault(parsed as Record<string, unknown>);
    // If migration fell back to defaults (no profile, no snapshots) but there WAS data, it's a recovery
    const hadData =
      (parsed as Record<string, unknown>).profile !== undefined ||
      Array.isArray((parsed as Record<string, unknown>).snapshots);
    const isRecovery = hadData && migrated.profile === null && migrated.snapshots.length === 0;

    if (isRecovery) {
      return {
        data: migrated,
        status: 'recovered',
        recoveryReason:
          'Your saved data could not be fully recovered. Some data may have been reset.',
      };
    }

    return { data: migrated, status: 'loaded' };
  } catch {
    return {
      data: createDefaultStoredData(),
      status: 'recovered',
      recoveryReason:
        'An unexpected error occurred while reading your data. A fresh start has been created.',
    };
  }
}

/**
 * Read stored data from the backend.
 * Returns a CACHED reference when using the default browser backend,
 * ensuring useSyncExternalStore reference stability.
 * Custom backends (used in tests) bypass the cache.
 */
export function loadData(backend: StorageBackend = browserBackend): StoredData {
  // Only cache for the default browser backend
  if (backend === browserBackend) {
    if (_cachedSnapshot !== null) {
      return _cachedSnapshot;
    }
    const result = loadDataWithStatus(backend);
    _cachedSnapshot = result.data;
    return _cachedSnapshot;
  }
  // Custom backends bypass cache (test environments)
  return loadDataWithStatus(backend).data;
}

/**
 * Persist data to the backend and notify listeners.
 */
function saveData(data: StoredData, backend: StorageBackend = browserBackend): void {
  backend.setItem(STORAGE_KEY, JSON.stringify(data));
  notifyListeners();
}

// ─── Profile ───

export function getProfile(backend: StorageBackend = browserBackend): UserProfile | null {
  return loadData(backend).profile;
}

export function saveProfile(profile: UserProfile, backend: StorageBackend = browserBackend): void {
  const data = loadData(backend);
  data.profile = profile;
  saveData(data, backend);
}

// ─── Snapshots ───

export function getSnapshots(backend: StorageBackend = browserBackend): Snapshot[] {
  return loadData(backend).snapshots;
}

export function addSnapshot(snapshot: Snapshot, backend: StorageBackend = browserBackend): void {
  const data = loadData(backend);
  data.snapshots.push(snapshot);

  // Cap at MAX_SNAPSHOTS — keep most recent
  if (data.snapshots.length > MAX_SNAPSHOTS) {
    data.snapshots = data.snapshots.slice(-MAX_SNAPSHOTS);
  }

  saveData(data, backend);
}

/**
 * Delete a single snapshot by ID.
 * Returns true if the snapshot was found and deleted.
 */
export function deleteSnapshot(
  snapshotId: string,
  backend: StorageBackend = browserBackend,
): boolean {
  const data = loadData(backend);
  const originalLength = data.snapshots.length;
  data.snapshots = data.snapshots.filter((s) => s.id !== snapshotId);

  if (data.snapshots.length === originalLength) {
    return false; // Not found
  }

  saveData(data, backend);
  return true;
}

// ─── Action Tracking ───

export function getTrackedActions(backend: StorageBackend = browserBackend) {
  return loadData(backend).trackedActions;
}

export function setActionStatus(
  actionId: string,
  status: ActionStatus,
  notes?: string,
  backend: StorageBackend = browserBackend,
): void {
  const data = loadData(backend);
  const existing = data.trackedActions.find((a) => a.actionId === actionId);
  const now = new Date().toISOString();

  if (existing) {
    existing.status = status;
    if (status === 'planned') existing.plannedAt = now;
    if (status === 'completed') existing.completedAt = now;
    if (notes !== undefined) existing.notes = notes;
  } else {
    data.trackedActions.push({
      actionId,
      status,
      plannedAt: status === 'planned' ? now : null,
      completedAt: status === 'completed' ? now : null,
      notes: notes ?? '',
    });
  }

  saveData(data, backend);
}

// ─── Settings ───

export function getSettings(backend: StorageBackend = browserBackend): Settings {
  return loadData(backend).settings;
}

export function updateSettings(
  updates: Partial<Settings>,
  backend: StorageBackend = browserBackend,
): void {
  const data = loadData(backend);
  data.settings = { ...data.settings, ...updates };
  saveData(data, backend);
}

// ─── AI Cache ───

export function getCachedAIResponse(
  requestHash: string,
  backend: StorageBackend = browserBackend,
): AICacheEntry | null {
  const data = loadData(backend);
  const entry = data.aiCache.find((e) => e.requestHash === requestHash);

  if (!entry) return null;

  // Check expiry
  if (new Date(entry.expiresAt) < new Date()) {
    // Expired — clean it up
    data.aiCache = data.aiCache.filter((e) => e.requestHash !== requestHash);
    saveData(data, backend);
    return null;
  }

  return entry;
}

export function cacheAIResponse(
  entry: AICacheEntry,
  backend: StorageBackend = browserBackend,
): void {
  const data = loadData(backend);

  // Remove existing entry with same hash
  data.aiCache = data.aiCache.filter((e) => e.requestHash !== entry.requestHash);
  data.aiCache.push(entry);

  // Clean expired entries
  const now = new Date();
  data.aiCache = data.aiCache.filter((e) => new Date(e.expiresAt) > now);

  saveData(data, backend);
}

export function deleteCachedAIResponse(
  requestHash: string,
  backend: StorageBackend = browserBackend,
): void {
  const data = loadData(backend);
  data.aiCache = data.aiCache.filter((e) => e.requestHash !== requestHash);
  saveData(data, backend);
}

// ─── Export / Import / Delete ───

/**
 * Export all stored data as a JSON string.
 * AI endpoint configuration is never included.
 */
export function exportDataAsJSON(backend: StorageBackend = browserBackend): string {
  const data = loadData(backend);
  return JSON.stringify(data, null, 2);
}

/**
 * Import validated data, replacing current storage entirely.
 * AI cache from imported data is stripped to prevent stale entries.
 */
export function importData(data: StoredData, backend: StorageBackend = browserBackend): void {
  // Strip AI cache from imports — it references endpoint-specific data
  const sanitized: StoredData = {
    ...data,
    aiCache: [],
  };
  saveData(sanitized, backend);
}

/**
 * Delete ALL stored data and reset to defaults.
 */
export function deleteAllData(backend: StorageBackend = browserBackend): void {
  backend.removeItem(STORAGE_KEY);
  notifyListeners();
}

/**
 * Get the current data for the useSyncExternalStore hook.
 */
export function getSnapshot(backend: StorageBackend = browserBackend): StoredData {
  return loadData(backend);
}

// ─── Test Helpers ───

/**
 * Create an in-memory storage backend for testing.
 */
export function createMemoryBackend(): StorageBackend {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}
