import { type StoredData, CURRENT_SCHEMA_VERSION, createDefaultStoredData } from './schemas';

/**
 * Migration functions keyed by target version.
 * Each function transforms data FROM (version - 1) TO (version).
 *
 * Currently we only have schema version 1, so no migrations exist yet.
 * When version 2 is introduced, add: migrations[2] = (data) => { ... }
 */
const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // Example for future migration:
  // 2: (data) => ({
  //   ...data,
  //   schemaVersion: 2,
  //   newField: defaultValue,
  // }),
};

/**
 * Migrate stored data from any older schema version to the current version.
 * Returns null if migration is impossible (e.g., data is from a future version).
 */
export function migrateData(data: Record<string, unknown>): StoredData | null {
  const version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;

  // Data from a future version — cannot downgrade
  if (version > CURRENT_SCHEMA_VERSION) {
    return null;
  }

  // Already current
  if (version === CURRENT_SCHEMA_VERSION) {
    return data as StoredData;
  }

  // Apply migrations sequentially
  let current = { ...data };
  for (let v = version + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const migrate = migrations[v];
    if (!migrate) {
      // Missing migration step — cannot proceed
      return null;
    }
    current = migrate(current);
  }

  return current as StoredData;
}

/**
 * Attempt to recover data from any version.
 * If migration fails, returns fresh default data.
 */
export function migrateOrDefault(data: Record<string, unknown>): StoredData {
  return migrateData(data) ?? createDefaultStoredData();
}
