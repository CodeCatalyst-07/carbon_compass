/**
 * Build artifact scan — ensures no API keys or secret markers appear in production output.
 *
 * Amendment 12: Scan for actual sentinel secret value AND variable names.
 * Must run a clean production build first.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const DIST_DIR = join(process.cwd(), 'dist');

/** Patterns that should NEVER appear in production build output. */
const FORBIDDEN_PATTERNS = [
  'GEMINI_API_KEY',
  'defineSecret',
  'your-gemini-api-key-here', // Sentinel from .secret.local.example
  'AIza', // Common Google API key prefix
];

function getAllFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

describe('no-api-key-in-build', () => {
  it('dist directory should not contain forbidden secret patterns', () => {
    expect(existsSync(DIST_DIR), 'dist/ directory does not exist. Run npm run build first.').toBe(
      true,
    );

    const files = getAllFiles(DIST_DIR);
    const violations: string[] = [];

    for (const filePath of files) {
      // Only scan text files
      if (!/\.(js|html|css|json|map|txt)$/i.test(filePath)) continue;

      const content = readFileSync(filePath, 'utf-8');

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (content.includes(pattern)) {
          const relativePath = filePath.replace(DIST_DIR, 'dist');
          violations.push(`Found "${pattern}" in ${relativePath}`);
        }
      }
    }

    expect(violations, `Secret patterns found in build:\n${violations.join('\n')}`).toHaveLength(0);
  });

  it('VITE_AI_ENDPOINT should only contain the configured URL, not secrets', () => {
    expect(existsSync(DIST_DIR), 'dist/ directory does not exist. Run npm run build first.').toBe(
      true,
    );

    const files = getAllFiles(DIST_DIR).filter((f) => /\.js$/i.test(f));

    for (const filePath of files) {
      const content = readFileSync(filePath, 'utf-8');
      // VITE_AI_ENDPOINT may appear in the build as a URL (that's fine)
      // but GEMINI_API_KEY must never appear
      expect(content).not.toContain('GEMINI_API_KEY');
    }
  });
});
