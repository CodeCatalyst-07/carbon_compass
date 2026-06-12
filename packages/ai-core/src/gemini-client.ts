/**
 * Gemini API client wrapper.
 *
 * Amendment 3 — Structured output:
 * - Passes actual JSON Schema via responseSchema (not just responseMimeType)
 * - Validates parsed output with Zod afterward
 * - One repair attempt on invalid JSON/schema
 *
 * Amendment 8 — Logging:
 * - Never logs prompts, AI content, or secrets
 * - Logs only request IDs, latency, model, cache status, and broad error category
 */

import { GoogleGenAI } from '@google/genai';
import {
  InsightsResponseSchema,
  INSIGHTS_RESPONSE_JSON_SCHEMA,
  type InsightsResponse,
} from './schemas.js';

/** Error thrown when Gemini interaction fails. */
export class GeminiError extends Error {
  public readonly category: 'timeout' | 'rate-limited' | 'malformed' | 'upstream' | 'config';

  constructor(
    message: string,
    category: 'timeout' | 'rate-limited' | 'malformed' | 'upstream' | 'config',
  ) {
    super(message);
    this.category = category;
    this.name = 'GeminiError';
  }
}

export interface GeminiClientOptions {
  apiKey: string;
  model?: string;
  /** Internal Gemini timeout in ms (must be shorter than Cloud Function timeout). */
  timeoutMs?: number;
}

export interface GenerateOptions {
  systemInstruction: string;
  userMessage: string;
  requestId: string;
}

/**
 * Create a Gemini client for generating insights.
 *
 * The client is created per-request inside the function handler,
 * never during global initialization (amendment 4).
 */
export function createGeminiClient(options: GeminiClientOptions) {
  const { apiKey, model = 'gemini-2.5-flash-lite', timeoutMs = 12_000 } = options;

  if (!apiKey) {
    throw new GeminiError('GEMINI_API_KEY is not configured.', 'config');
  }

  const genai = new GoogleGenAI({ apiKey });

  async function generate(opts: GenerateOptions): Promise<InsightsResponse> {
    const startTime = Date.now();

    try {
      const response = await Promise.race([
        genai.models.generateContent({
          model,
          contents: opts.userMessage,
          config: {
            systemInstruction: opts.systemInstruction,
            temperature: 0.2,
            maxOutputTokens: 1024,
            topP: 0.8,
            responseMimeType: 'application/json',
            responseSchema: INSIGHTS_RESPONSE_JSON_SCHEMA,
          },
        }),
        rejectAfterTimeout(timeoutMs),
      ]);

      const latencyMs = Date.now() - startTime;
      const text = response.text ?? '';

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        // One repair attempt (amendment 3)
        console.log(
          JSON.stringify({
            event: 'gemini_repair_attempt',
            requestId: opts.requestId,
            model,
            latencyMs,
          }),
        );
        return await repairAttempt(genai, model, opts, text, timeoutMs);
      }

      // Validate with Zod
      const zodResult = InsightsResponseSchema.safeParse(parsed);
      if (!zodResult.success) {
        // One repair attempt
        console.log(
          JSON.stringify({
            event: 'gemini_repair_attempt',
            requestId: opts.requestId,
            model,
            latencyMs,
            reason: 'zod_validation_failed',
          }),
        );
        return await repairAttempt(genai, model, opts, text, timeoutMs);
      }

      console.log(
        JSON.stringify({
          event: 'gemini_success',
          requestId: opts.requestId,
          model,
          latencyMs,
        }),
      );

      return zodResult.data;
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof GeminiError) throw error;

      // Categorize SDK errors
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
        console.log(
          JSON.stringify({
            event: 'gemini_error',
            requestId: opts.requestId,
            model,
            latencyMs,
            category: 'rate-limited',
          }),
        );
        throw new GeminiError('Gemini API rate limit exceeded.', 'rate-limited');
      }

      console.log(
        JSON.stringify({
          event: 'gemini_error',
          requestId: opts.requestId,
          model,
          latencyMs,
          category: 'upstream',
        }),
      );
      throw new GeminiError('Gemini API request failed.', 'upstream');
    }
  }

  return { generate };
}

/** Repair attempt: send back the invalid output with a correction prompt. */
async function repairAttempt(
  genai: GoogleGenAI,
  model: string,
  opts: GenerateOptions,
  invalidOutput: string,
  timeoutMs: number,
): Promise<InsightsResponse> {
  try {
    const repairMessage = [
      'The previous response was invalid JSON or did not match the required schema.',
      'Here is the invalid output:',
      '```',
      invalidOutput.slice(0, 500), // Truncate to avoid huge repair prompts
      '```',
      'Please fix it and return ONLY valid JSON matching the schema exactly.',
      'Ensure weeklyPlan has exactly 7 entries for Monday through Sunday in order.',
      `Ensure actionExplanations contains entries for the exact actionIds provided.`,
    ].join('\n');

    const response = await Promise.race([
      genai.models.generateContent({
        model,
        contents: repairMessage,
        config: {
          systemInstruction: opts.systemInstruction,
          temperature: 0.1,
          maxOutputTokens: 1024,
          topP: 0.8,
          responseMimeType: 'application/json',
          responseSchema: INSIGHTS_RESPONSE_JSON_SCHEMA,
        },
      }),
      rejectAfterTimeout(timeoutMs),
    ]);

    const text = response.text ?? '';
    const parsed = JSON.parse(text);
    const zodResult = InsightsResponseSchema.safeParse(parsed);

    if (!zodResult.success) {
      throw new GeminiError('Repair attempt produced invalid output.', 'malformed');
    }

    console.log(
      JSON.stringify({
        event: 'gemini_repair_success',
        requestId: opts.requestId,
        model,
      }),
    );

    return zodResult.data;
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    throw new GeminiError('Repair attempt failed.', 'malformed');
  }
}

/** Create a promise that rejects after the given timeout. */
function rejectAfterTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new GeminiError(`Gemini request timed out after ${ms}ms.`, 'timeout'));
    }, ms);
  });
}
