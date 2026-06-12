/**
 * Tests for Gemini client.
 *
 * Amendment 3/11: Uses mock transport — no real API key or network needed.
 * Tests: valid output, invalid JSON, repair failure, timeout, upstream rate limit.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGeminiClient, GeminiError } from '../gemini-client.js';

// Mock @google/genai
vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn();
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
    __mockGenerateContent: mockGenerateContent,
  };
});

// Access the mock
async function getMockGenerate() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = vi.mocked((await import('@google/genai')) as any);
  return mod.__mockGenerateContent as ReturnType<typeof vi.fn>;
}

function validResponseJson() {
  return JSON.stringify({
    summary: 'Your footprint is driven by diet and transport.',
    actionExplanations: [
      { actionId: 'action-1', explanation: 'Explanation 1' },
      { actionId: 'action-2', explanation: 'Explanation 2' },
      { actionId: 'action-3', explanation: 'Explanation 3' },
    ],
    weeklyPlan: [
      { day: 'Monday', task: 'Task 1' },
      { day: 'Tuesday', task: 'Task 2' },
      { day: 'Wednesday', task: 'Task 3' },
      { day: 'Thursday', task: 'Task 4' },
      { day: 'Friday', task: 'Task 5' },
      { day: 'Saturday', task: 'Task 6' },
      { day: 'Sunday', task: 'Task 7' },
    ],
    caveat: 'These are estimates.',
  });
}

const generateOpts = {
  systemInstruction: 'Test instruction',
  userMessage: 'Test message',
  requestId: 'test-123',
};

describe('createGeminiClient', () => {
  beforeEach(async () => {
    const mockGen = await getMockGenerate();
    mockGen.mockReset();
  });

  it('throws config error when API key is empty', () => {
    expect(() => createGeminiClient({ apiKey: '' })).toThrow(GeminiError);
  });

  it('generates successfully with valid response', async () => {
    const mockGen = await getMockGenerate();
    mockGen.mockResolvedValueOnce({ text: validResponseJson() });

    const client = createGeminiClient({ apiKey: 'test-key' });
    const result = await client.generate(generateOpts);

    expect(result.summary).toBe('Your footprint is driven by diet and transport.');
    expect(result.actionExplanations).toHaveLength(3);
    expect(result.weeklyPlan).toHaveLength(7);
  });

  it('retries once on invalid JSON then succeeds', async () => {
    const mockGen = await getMockGenerate();
    // First call: invalid JSON
    mockGen.mockResolvedValueOnce({ text: 'not json at all' });
    // Repair call: valid JSON
    mockGen.mockResolvedValueOnce({ text: validResponseJson() });

    const client = createGeminiClient({ apiKey: 'test-key' });
    const result = await client.generate(generateOpts);

    expect(result.summary).toBe('Your footprint is driven by diet and transport.');
    expect(mockGen).toHaveBeenCalledTimes(2);
  });

  it('throws malformed error when repair also fails', async () => {
    const mockGen = await getMockGenerate();
    // First call: invalid JSON
    mockGen.mockResolvedValueOnce({ text: 'bad json' });
    // Repair call: also invalid
    mockGen.mockResolvedValueOnce({ text: 'still bad' });

    const client = createGeminiClient({ apiKey: 'test-key' });
    const promise = client.generate(generateOpts);
    await expect(promise).rejects.toThrow(GeminiError);
    await expect(promise).rejects.toMatchObject({ category: 'malformed' });
  });

  it('retries once on Zod validation failure then succeeds', async () => {
    const mockGen = await getMockGenerate();
    // First call: valid JSON but missing required fields
    mockGen.mockResolvedValueOnce({ text: JSON.stringify({ summary: 'only summary' }) });
    // Repair call: complete valid response
    mockGen.mockResolvedValueOnce({ text: validResponseJson() });

    const client = createGeminiClient({ apiKey: 'test-key' });
    const result = await client.generate(generateOpts);

    expect(result.actionExplanations).toHaveLength(3);
  });

  it('throws rate-limited error on 429', async () => {
    const mockGen = await getMockGenerate();
    mockGen.mockRejectedValueOnce(new Error('429 Resource Exhausted'));

    const client = createGeminiClient({ apiKey: 'test-key' });

    try {
      await client.generate(generateOpts);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(GeminiError);
      expect((error as GeminiError).category).toBe('rate-limited');
    }
  });

  it('throws upstream error on generic SDK failure', async () => {
    const mockGen = await getMockGenerate();
    mockGen.mockRejectedValueOnce(new Error('Internal server error'));

    const client = createGeminiClient({ apiKey: 'test-key' });

    try {
      await client.generate(generateOpts);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(GeminiError);
      expect((error as GeminiError).category).toBe('upstream');
    }
  });

  it('throws timeout error when request exceeds timeout', async () => {
    const mockGen = await getMockGenerate();
    // Simulate a slow response
    mockGen.mockImplementationOnce(
      () =>
        new Promise((resolve) => setTimeout(() => resolve({ text: validResponseJson() }), 50_000)),
    );

    const client = createGeminiClient({ apiKey: 'test-key', timeoutMs: 50 });

    try {
      await client.generate(generateOpts);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(GeminiError);
      expect((error as GeminiError).category).toBe('timeout');
    }
  });
});
