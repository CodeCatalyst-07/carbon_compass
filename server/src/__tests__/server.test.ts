/**
 * Integration tests for the Express server.
 *
 * Uses supertest to exercise the full HTTP stack without a real network.
 * @google/genai is mocked so no real Gemini key is needed.
 *
 * Covers:
 *  1. GET /health — 200, no key needed, no env vars exposed
 *  2. POST /insights — missing GEMINI_API_KEY → 503
 *  3. POST /insights — invalid body → 400
 *  4. POST /insights — malformed JSON → 400
 *  5. OPTIONS /insights — allowed origin → 204 + CORS headers
 *  6. OPTIONS /insights — disallowed origin → 403
 *  7. POST /insights — disallowed origin → 403
 *  8. POST /insights — mocked Gemini success → 200 with valid shape
 *  9. No GEMINI_API_KEY value in response body or headers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';

// ─── Mock @carbon-compass/ai-core Gemini Client ───────────────────────────────
// Prevents any real network call and avoids needing a real API key.

vi.mock('@carbon-compass/ai-core', async () => {
  const actual =
    await vi.importActual<typeof import('@carbon-compass/ai-core')>('@carbon-compass/ai-core');
  const mockGenerate = vi.fn();
  return {
    ...actual,
    createGeminiClient: vi.fn().mockReturnValue({
      generate: mockGenerate,
    }),
    __mockGenerate: mockGenerate,
  };
});

async function getMockGenerate() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = vi.mocked((await import('@carbon-compass/ai-core')) as any);
  return mod.__mockGenerate as ReturnType<typeof vi.fn>;
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

/** A syntactically valid InsightsRequest body. */
const validBody = {
  factorRegistryVersion: '0.2.0',
  totals: { annualKgCO2e: 8000, monthlyKgCO2e: 667 },
  categoryShares: [
    { category: 'transport', percentage: 50, annualKgCO2e: 4000 },
    { category: 'diet', percentage: 50, annualKgCO2e: 4000 },
  ],
  topDrivers: [{ category: 'transport', percentage: 50, reason: 'High car usage.' }],
  rankedActions: [
    { id: 'action-1', title: 'Switch to EV', rank: 1 },
    { id: 'action-2', title: 'Reduce meat', rank: 2 },
  ],
  goal: { reductionGoalPercent: 20 },
  constraints: { effortPreference: 'medium', budgetSensitivity: 'medium' },
};

/** A valid Gemini response JSON string. */
function validGeminiResponse() {
  return JSON.stringify({
    summary: 'Your footprint is driven by transport and diet.',
    actionExplanations: [
      { actionId: 'action-1', explanation: 'Switching to an EV cuts transport emissions.' },
      { actionId: 'action-2', explanation: 'Reducing meat lowers your diet footprint.' },
    ],
    weeklyPlan: [
      { day: 'Monday', task: 'Research EV models available in your area.' },
      { day: 'Tuesday', task: 'Try one plant-based meal today.' },
      { day: 'Wednesday', task: 'Calculate potential EV savings.' },
      { day: 'Thursday', task: 'Cook a vegetarian dinner.' },
      { day: 'Friday', task: 'Check local EV incentives.' },
      { day: 'Saturday', task: 'Visit an EV dealership.' },
      { day: 'Sunday', task: 'Plan next week with one meatless day.' },
    ],
    caveat: 'All values are estimates based on published emission factors with known limitations.',
  });
}

// ─── Env helpers ──────────────────────────────────────────────────────────────

const FAKE_API_KEY = 'test-api-key-not-real';

function setApiKey(key: string) {
  process.env.GEMINI_API_KEY = key;
  process.env.CORS_ORIGINS = 'http://localhost:5173';
}

function clearApiKey() {
  delete process.env.GEMINI_API_KEY;
  delete process.env.CORS_ORIGINS;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status ok — no API key required', async () => {
    clearApiKey(); // no key set
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('carbon-compass-ai');
    expect(res.body.timestamp).toBeTruthy();
  });

  it('does not expose GEMINI_API_KEY or any env var in health response', async () => {
    setApiKey(FAKE_API_KEY);
    const res = await request(app).get('/health');
    const bodyStr = JSON.stringify(res.body);

    expect(bodyStr).not.toContain('GEMINI_API_KEY');
    expect(bodyStr).not.toContain(FAKE_API_KEY);
    clearApiKey();
  });
});

describe('POST /insights — GEMINI_API_KEY missing → 503', () => {
  beforeEach(() => {
    clearApiKey();
    process.env.CORS_ORIGINS = 'http://localhost:5173';
  });
  afterEach(clearApiKey);

  it('returns 503 when GEMINI_API_KEY is not set', async () => {
    const res = await request(app)
      .post('/insights')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(validBody));

    expect(res.status).toBe(503);
    expect(res.body.error).toBeTruthy();
    // Must not leak the key name as a value hint
    expect(JSON.stringify(res.body)).not.toContain('GEMINI_API_KEY');
  });
});

describe('POST /insights — invalid request body → 400', () => {
  beforeEach(() => setApiKey(FAKE_API_KEY));
  afterEach(clearApiKey);

  it('returns 400 for an empty body', async () => {
    const res = await request(app)
      .post('/insights')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send('{}');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request.');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/insights')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ factorRegistryVersion: '0.2.0' }));

    expect(res.status).toBe(400);
  });
});

describe('POST /insights — malformed JSON → 400', () => {
  beforeEach(() => setApiKey(FAKE_API_KEY));
  afterEach(clearApiKey);

  it('returns 400 for malformed JSON body', async () => {
    const res = await request(app)
      .post('/insights')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send('{this is not json');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Malformed');
  });
});

describe('OPTIONS /insights — CORS preflight', () => {
  afterEach(clearApiKey);

  it('responds 204 for allowed origin without Content-Type', async () => {
    process.env.CORS_ORIGINS = 'http://localhost:5173';

    const res = await request(app).options('/insights').set('Origin', 'http://localhost:5173');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    clearApiKey();
  });

  it('responds 403 for disallowed origin on preflight', async () => {
    process.env.CORS_ORIGINS = 'http://localhost:5173';

    const res = await request(app).options('/insights').set('Origin', 'https://evil.example.com');

    expect(res.status).toBe(403);
    clearApiKey();
  });
});

describe('POST /insights — disallowed origin → 403', () => {
  beforeEach(() => setApiKey(FAKE_API_KEY));
  afterEach(clearApiKey);

  it('returns 403 for a disallowed origin', async () => {
    const res = await request(app)
      .post('/insights')
      .set('Origin', 'https://evil.example.com')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(validBody));

    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('POST /insights — mocked Gemini success → 200', () => {
  beforeEach(async () => {
    setApiKey(FAKE_API_KEY);
    const mockGen = await getMockGenerate();
    mockGen.mockReset();
    mockGen.mockResolvedValue(JSON.parse(validGeminiResponse()));
  });
  afterEach(clearApiKey);

  it('returns 200 with a valid response shape on Gemini success', async () => {
    const res = await request(app)
      .post('/insights')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(validBody));

    expect(res.status).toBe(200);
    expect(typeof res.body.summary).toBe('string');
    expect(Array.isArray(res.body.actionExplanations)).toBe(true);
    expect(res.body.actionExplanations).toHaveLength(2);
    expect(Array.isArray(res.body.weeklyPlan)).toBe(true);
    expect(res.body.weeklyPlan).toHaveLength(7);
    expect(typeof res.body.caveat).toBe('string');
  });
});

describe('Security — no secret leakage in responses', () => {
  beforeEach(() => setApiKey(FAKE_API_KEY));
  afterEach(clearApiKey);

  it('does not expose GEMINI_API_KEY in 400 error response', async () => {
    const res = await request(app)
      .post('/insights')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send('{}');

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain(FAKE_API_KEY);
    expect(bodyStr).not.toContain('GEMINI_API_KEY');
    // No VITE_ prefixed keys either
    expect(bodyStr).not.toContain('VITE_');
  });

  it('does not expose GEMINI_API_KEY in response headers', async () => {
    const res = await request(app)
      .post('/insights')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send('{}');

    const headersStr = JSON.stringify(res.headers);
    expect(headersStr).not.toContain(FAKE_API_KEY);
  });
});
