import { useSyncExternalStore, useCallback } from 'react';
import {
  subscribe,
  loadData,
  saveProfile,
  addSnapshot,
  deleteSnapshot,
  setActionStatus,
  updateSettings,
  deleteAllData,
  exportDataAsJSON,
} from '../../storage/adapter';
import type {
  StoredData,
  UserProfile,
  Snapshot,
  ActionStatus,
  Settings,
} from '../../storage/schemas';

interface LocalStoreActions {
  saveProfile: (profile: UserProfile) => void;
  addSnapshot: (snapshot: Snapshot) => void;
  deleteSnapshot: (snapshotId: string) => boolean;
  setActionStatus: (actionId: string, status: ActionStatus, notes?: string) => void;
  updateSettings: (updates: Partial<Settings>) => void;
  deleteAllData: () => void;
  exportDataAsJSON: () => string;
}

interface LocalStoreReturn extends LocalStoreActions {
  data: StoredData;
}

/**
 * React hook for localStorage-backed state management.
 * Uses useSyncExternalStore for tear-free reads and automatic
 * re-renders when storage data changes.
 */
export function useLocalStore(): LocalStoreReturn {
  const data = useSyncExternalStore(subscribe, loadData, loadData);

  return {
    data,
    saveProfile: useCallback((profile: UserProfile) => saveProfile(profile), []),
    addSnapshot: useCallback((snapshot: Snapshot) => addSnapshot(snapshot), []),
    deleteSnapshot: useCallback((snapshotId: string) => deleteSnapshot(snapshotId), []),
    setActionStatus: useCallback(
      (actionId: string, status: ActionStatus, notes?: string) =>
        setActionStatus(actionId, status, notes),
      [],
    ),
    updateSettings: useCallback((updates: Partial<Settings>) => updateSettings(updates), []),
    deleteAllData: useCallback(() => deleteAllData(), []),
    exportDataAsJSON: useCallback(() => exportDataAsJSON(), []),
  };
}
