import { migrateData } from './migrations';
import {
  StoredDataSchema,
  ImportDataSchema,
  type StoredData,
  CURRENT_SCHEMA_VERSION,
} from './schemas';

/** Maximum allowed import file size: 1 MB */
const MAX_IMPORT_SIZE_BYTES = 1024 * 1024;

export interface ImportPreview {
  isValid: boolean;
  errors: string[];
  data: StoredData | null;
  summary: {
    schemaVersion: number;
    profileExists: boolean;
    snapshotCount: number;
    trackedActionCount: number;
    aiCacheCount: number;
    oldestSnapshot: string | null;
    newestSnapshot: string | null;
  } | null;
}

/**
 * Validate and preview an import file BEFORE applying it.
 * Returns a structured preview with validation errors or a summary
 * of what would be imported. Does NOT modify any stored data.
 *
 * @param jsonString - Raw JSON string from the imported file
 * @returns ImportPreview with validation results
 */
export function previewImport(jsonString: string): ImportPreview {
  const errors: string[] = [];

  // Size check
  const sizeBytes = new TextEncoder().encode(jsonString).length;
  if (sizeBytes > MAX_IMPORT_SIZE_BYTES) {
    return {
      isValid: false,
      errors: [
        `File is too large (${(sizeBytes / 1024).toFixed(0)} KB). Maximum allowed: ${MAX_IMPORT_SIZE_BYTES / 1024} KB.`,
      ],
      data: null,
      summary: null,
    };
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      isValid: false,
      errors: ['Invalid JSON: the file could not be parsed.'],
      data: null,
      summary: null,
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      isValid: false,
      errors: ['Invalid format: expected a JSON object.'],
      data: null,
      summary: null,
    };
  }

  // Check schema version exists
  const record = parsed as Record<string, unknown>;
  if (typeof record.schemaVersion !== 'number') {
    return {
      isValid: false,
      errors: ['Missing or invalid schemaVersion field.'],
      data: null,
      summary: null,
    };
  }

  // Future version check
  if (record.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      isValid: false,
      errors: [
        `Data is from a newer version (v${record.schemaVersion}) than this app supports (v${CURRENT_SCHEMA_VERSION}). Please update Carbon Compass first.`,
      ],
      data: null,
      summary: null,
    };
  }

  // Try current-version validation first
  const directResult = StoredDataSchema.safeParse(parsed);
  if (directResult.success) {
    return {
      isValid: true,
      errors: [],
      data: directResult.data,
      summary: buildSummary(directResult.data),
    };
  }

  // Try import schema (any version) + migration
  const importResult = ImportDataSchema.safeParse(parsed);
  if (importResult.success) {
    const migrated = migrateData(record);
    if (migrated) {
      return {
        isValid: true,
        errors: [],
        data: migrated,
        summary: buildSummary(migrated),
      };
    }
    errors.push('Data could not be migrated to the current schema version.');
  } else {
    // Collect specific field errors
    for (const issue of importResult.error.issues) {
      const path = issue.path.join('.');
      errors.push(`${path}: ${issue.message}`);
    }
  }

  return {
    isValid: false,
    errors: errors.length > 0 ? errors : ['Unknown validation error.'],
    data: null,
    summary: null,
  };
}

/**
 * Build a human-readable summary of import data for confirmation UI.
 */
function buildSummary(data: StoredData): ImportPreview['summary'] {
  const sortedDates = data.snapshots.map((s) => s.date).sort();

  return {
    schemaVersion: data.schemaVersion,
    profileExists: data.profile !== null,
    snapshotCount: data.snapshots.length,
    trackedActionCount: data.trackedActions.length,
    aiCacheCount: data.aiCache.length,
    oldestSnapshot: sortedDates[0] ?? null,
    newestSnapshot: sortedDates[sortedDates.length - 1] ?? null,
  };
}

/**
 * Read a File object as a string for import validation.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => {
      reject(new Error('File read error'));
    };
    reader.readAsText(file);
  });
}
