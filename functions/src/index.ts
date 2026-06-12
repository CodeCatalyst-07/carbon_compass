/**
 * Carbon Compass — AI Insights Cloud Function.
 *
 * Single HTTP endpoint: POST /insights
 *
 * All shared AI logic (middleware, rate limiter, cache, schemas,
 * prompt, Gemini client) lives in @carbon-compass/ai-core.
 * This file contains only Firebase-specific wiring:
 *   - defineSecret / onRequest
 *   - Emulator env fallback (amendment 14)
 *   - Resource controls (region, timeout, memory, instances)
 *
 * Production AI backend: Render (see server/src/app.ts)
 * Firebase Cloud Functions: optional / local development reference
 *
 * Amendment 4 — Firebase secrets:
 * - GEMINI_API_KEY bound via defineSecret in onRequest options
 * - Read at runtime with GEMINI_API_KEY.value()
 * - No secret access during global initialization
 *
 * Amendment 5 — Resource controls:
 * - Explicit region, timeout, memory, minInstances, maxInstances
 * - Gemini internal timeout (12s) shorter than Cloud Function timeout (30s)
 *
 * Amendment 8 — Error handling:
 * - Sanitized status codes for all error categories
 * - Never return SDK details, prompts, secrets, or stack traces
 * - Log only operational metadata
 *
 * Amendment 14 — Emulator env fallback:
 * - In the emulator (FUNCTIONS_EMULATOR=true), fall back to process.env
 *   when defineSecret().value() throws or returns empty
 * - Allows local testing with functions/.env.local or functions/.secret.local
 * - Does not weaken production secret handling
 */

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import {
  runMiddleware,
  checkRateLimit,
  generateServerCacheKey,
  getCached,
  setCached,
  InsightsRequestSchema,
  validateResponseIntegrity,
  type InsightsResponse,
  SYSTEM_INSTRUCTION,
  buildUserMessage,
  PROMPT_VERSION,
  createGeminiClient,
  GeminiError,
} from '@carbon-compass/ai-core';

// ─── Secrets (amendment 4) ───
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// ─── Non-secret configuration (amendment 4) ───
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';

/**
 * Generate a short request ID for logging correlation.
 */
function generateRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * POST /insights — AI-powered footprint explanation.
 *
 * Amendment 5 resource controls:
 * - region: us-central1 (lowest latency to Google AI)
 * - timeoutSeconds: 30 (Gemini internal timeout is 12s)
 * - memory: 256MiB (sufficient for in-memory rate limiter and cache)
 * - minInstances: 0 (scale to zero when idle)
 * - maxInstances: 5 (conservative for a demo — reduces risk but cannot guarantee zero cost)
 */
export const insights = onRequest(
  {
    secrets: [GEMINI_API_KEY],
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
    minInstances: 0,
    maxInstances: 5,
    cors: false, // We handle CORS manually for exact origin matching
  },
  async (req, res) => {
    const requestId = generateRequestId();

    // 1. Run middleware (CORS, method, content-type, body size)
    const middlewareResult = runMiddleware(req, res);
    if (!middlewareResult.passed) return;

    // 2. Rate limiting (amendment 7)
    const clientIp = req.ip ?? '0.0.0.0';
    const rateResult = checkRateLimit(clientIp);
    if (!rateResult.allowed) {
      console.log(
        JSON.stringify({
          event: 'rate_limited',
          requestId,
        }),
      );
      res.set('Retry-After', String(rateResult.retryAfterSeconds ?? 60));
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }

    // 3. Validate request body
    const parseResult = InsightsRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.log(
        JSON.stringify({
          event: 'validation_error',
          requestId,
          fieldCount: parseResult.error.issues.length,
        }),
      );
      // Return sanitized validation errors (amendment 8: no internal details)
      const safeErrors = parseResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      res.status(400).json({ error: 'Invalid request.', details: safeErrors });
      return;
    }

    const request = parseResult.data;
    const suppliedActionIds = request.rankedActions.map((a) => a.id);

    // 4. Check server cache (amendment 9)
    const normalizedRequest = JSON.stringify(request);
    const cacheKey = generateServerCacheKey({
      factorRegistryVersion: request.factorRegistryVersion,
      model: GEMINI_MODEL,
      normalizedRequest,
    });

    const cachedResponse = getCached(cacheKey);
    if (cachedResponse) {
      console.log(
        JSON.stringify({
          event: 'cache_hit',
          requestId,
          cacheKey,
        }),
      );
      res.status(200).json(JSON.parse(cachedResponse));
      return;
    }

    // 5. Resolve API key (amendment 3, 4, 14)
    // Production: defineSecret binds the key via Cloud Secret Manager.
    // Emulator: defineSecret reads functions/.secret.local; fall back to
    //           process.env so functions/.env.local also works for local dev.
    //           The fallback only activates when FUNCTIONS_EMULATOR === 'true'.
    let apiKey: string | undefined;
    try {
      apiKey = GEMINI_API_KEY.value();
    } catch {
      // defineSecret.value() throws when the secret is unavailable.
      // In the emulator, try process.env as a fallback.
      if (process.env.FUNCTIONS_EMULATOR === 'true') {
        apiKey = process.env.GEMINI_API_KEY;
      }
    }

    if (!apiKey) {
      // Last-chance emulator fallback (covers the case where .value()
      // returns empty string but the key is in process.env).
      if (process.env.FUNCTIONS_EMULATOR === 'true') {
        apiKey = process.env.GEMINI_API_KEY;
      }
    }

    if (!apiKey) {
      console.log(
        JSON.stringify({
          event: 'config_error',
          requestId,
          reason: 'api_key_unavailable',
        }),
      );
      res.status(503).json({ error: 'AI service is not configured.' });
      return;
    }

    try {
      const client = createGeminiClient({
        apiKey,
        model: GEMINI_MODEL,
        timeoutMs: 12_000, // Shorter than Cloud Function timeout (30s) per amendment 5
      });

      const userMessage = buildUserMessage(request);

      const aiResponse: InsightsResponse = await client.generate({
        systemInstruction: SYSTEM_INSTRUCTION,
        userMessage,
        requestId,
      });

      // 6. Validate response integrity (amendment 2)
      const integrity = validateResponseIntegrity(aiResponse, suppliedActionIds);
      if (!integrity.valid) {
        console.log(
          JSON.stringify({
            event: 'integrity_violation',
            requestId,
            issues: integrity.issues,
          }),
        );
        res.status(502).json({ error: 'AI response did not meet integrity requirements.' });
        return;
      }

      // 7. Cache validated response (amendment 9)
      const responseJson = JSON.stringify(aiResponse);
      setCached(cacheKey, responseJson);

      console.log(
        JSON.stringify({
          event: 'success',
          requestId,
          cacheKey,
          promptVersion: PROMPT_VERSION,
        }),
      );

      res.status(200).json(aiResponse);
    } catch (error) {
      // Map errors to sanitized status codes (amendment 8)
      if (error instanceof GeminiError) {
        const statusMap: Record<string, number> = {
          timeout: 504,
          'rate-limited': 429,
          malformed: 502,
          upstream: 502,
          config: 503,
        };
        const status = statusMap[error.category] ?? 500;

        console.log(
          JSON.stringify({
            event: 'gemini_error',
            requestId,
            category: error.category,
          }),
        );

        if (error.category === 'rate-limited') {
          res.set('Retry-After', '60');
        }

        res.status(status).json({ error: 'AI service temporarily unavailable.' });
        return;
      }

      // Unknown error — never leak details
      console.log(
        JSON.stringify({
          event: 'unknown_error',
          requestId,
        }),
      );
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  },
);
