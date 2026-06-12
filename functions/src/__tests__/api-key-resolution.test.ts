/**
 * Tests for API key resolution in the emulator environment.
 *
 * Amendment 14: Verifies that the emulator env fallback works correctly:
 * - Falls back to process.env.GEMINI_API_KEY when FUNCTIONS_EMULATOR=true
 * - Does NOT fall back when FUNCTIONS_EMULATOR is not set (production)
 * - Returns 503 when no key is available in any environment
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Extracted API key resolution logic — mirrors the behavior in index.ts
 * (amendment 14) so we can unit test it without spinning up the full
 * Cloud Function.
 *
 * @param secretValueFn Simulates GEMINI_API_KEY.value() behavior
 * @param env           Simulates process.env
 */
function resolveApiKey(
  secretValueFn: () => string,
  env: { FUNCTIONS_EMULATOR?: string; GEMINI_API_KEY?: string },
): string | undefined {
  let apiKey: string | undefined;

  try {
    apiKey = secretValueFn();
  } catch {
    // defineSecret.value() throws when the secret is unavailable.
    // In the emulator, try process.env as a fallback.
    if (env.FUNCTIONS_EMULATOR === 'true') {
      apiKey = env.GEMINI_API_KEY;
    }
  }

  if (!apiKey) {
    // Last-chance emulator fallback (covers empty string from .value())
    if (env.FUNCTIONS_EMULATOR === 'true') {
      apiKey = env.GEMINI_API_KEY;
    }
  }

  return apiKey || undefined;
}

describe('API key resolution (amendment 14)', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.FUNCTIONS_EMULATOR;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  // ─── Production (no emulator) ───

  it('uses defineSecret value in production', () => {
    const key = resolveApiKey(() => 'prod-secret-key', {});
    expect(key).toBe('prod-secret-key');
  });

  it('returns undefined when defineSecret throws in production (no fallback)', () => {
    const key = resolveApiKey(() => {
      throw new Error('Secret not available');
    }, {});
    expect(key).toBeUndefined();
  });

  it('returns undefined when defineSecret returns empty in production (no fallback)', () => {
    const key = resolveApiKey(() => '', { GEMINI_API_KEY: 'env-key-should-not-be-used' });
    expect(key).toBeUndefined();
  });

  it('does NOT fall back to process.env when FUNCTIONS_EMULATOR is not set', () => {
    const key = resolveApiKey(
      () => {
        throw new Error('Secret not available');
      },
      { GEMINI_API_KEY: 'env-key-should-not-be-used' },
    );
    expect(key).toBeUndefined();
  });

  // ─── Emulator (FUNCTIONS_EMULATOR=true) ───

  it('uses defineSecret value in emulator when available', () => {
    const key = resolveApiKey(() => 'secret-local-key', { FUNCTIONS_EMULATOR: 'true' });
    expect(key).toBe('secret-local-key');
  });

  it('falls back to process.env when defineSecret throws in emulator', () => {
    const key = resolveApiKey(
      () => {
        throw new Error('Secret not available');
      },
      { FUNCTIONS_EMULATOR: 'true', GEMINI_API_KEY: 'env-local-key' },
    );
    expect(key).toBe('env-local-key');
  });

  it('falls back to process.env when defineSecret returns empty in emulator', () => {
    const key = resolveApiKey(() => '', {
      FUNCTIONS_EMULATOR: 'true',
      GEMINI_API_KEY: 'env-local-key',
    });
    expect(key).toBe('env-local-key');
  });

  it('returns undefined in emulator when both defineSecret and env are missing', () => {
    const key = resolveApiKey(
      () => {
        throw new Error('Secret not available');
      },
      { FUNCTIONS_EMULATOR: 'true' },
    );
    expect(key).toBeUndefined();
  });

  // ─── 503 behavior (missing key → service not configured) ───

  it('should produce 503-triggering undefined when no key is available anywhere', () => {
    const key = resolveApiKey(() => {
      throw new Error('Secret not available');
    }, {});
    // When resolveApiKey returns undefined, index.ts returns 503
    expect(key).toBeUndefined();
  });

  it('should produce 503-triggering undefined in emulator with empty env key', () => {
    const key = resolveApiKey(
      () => {
        throw new Error('Secret not available');
      },
      { FUNCTIONS_EMULATOR: 'true', GEMINI_API_KEY: '' },
    );
    expect(key).toBeUndefined();
  });
});
