/**
 * Carbon Compass — Express AI Backend.
 *
 * Production AI backend deployed on Render.
 * Firebase Cloud Functions (functions/src/index.ts) are optional/legacy.
 *
 * All shared AI logic is imported from @carbon-compass/ai-core:
 *   middleware, rate-limiter, cache, schemas, prompt, gemini-client.
 *
 * Body parsing strategy:
 *   express.raw({ type: 'application/json', limit: '8kb' }) receives the
 *   raw Buffer before any parsing. runMiddleware() uses rawBody for the
 *   body-size check. JSON is parsed manually after middleware passes so
 *   that malformed JSON yields a sanitized 400, not an Express default.
 *
 * No-origin requests (server-to-server):
 *   Requests without an Origin header bypass CORS checks and are allowed.
 *   This is intentional and consistent with how browsers work — only
 *   browser cross-origin requests include the Origin header.
 *   Documented here so behaviour is explicit, not accidental.
 *
 * Security guarantees:
 *   - GEMINI_API_KEY never appears in any response body or header.
 *   - No prompts, stack traces, or SDK internals leak to clients.
 *   - GET /health does not require GEMINI_API_KEY and does not expose env vars.
 */

import express, { type Request, type Response } from 'express';
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
  type MiddlewareRequest,
} from '@carbon-compass/ai-core';

// ─── Configuration ───────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';

// ─── Helper ──────────────────────────────────────────────────────────────────

function generateRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── App ─────────────────────────────────────────────────────────────────────

const app = express();

/**
 * Use express.raw so we get the Buffer before any JSON parsing.
 * runMiddleware() uses rawBody.length for the 8 KB body-size guard.
 * JSON is parsed manually after middleware passes.
 */
app.use(
  express.raw({
    type: 'application/json',
    limit: '8kb',
  }),
);

// ─── GET /health ─────────────────────────────────────────────────────────────

/**
 * Health check — must respond 200 without requiring GEMINI_API_KEY.
 * Never exposes env vars in the response.
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'carbon-compass-ai',
    timestamp: new Date().toISOString(),
  });
});

// ─── POST /insights ──────────────────────────────────────────────────────────

app.all('/insights', async (req: Request, res: Response) => {
  const requestId = generateRequestId();

  // Build the middleware-compatible request shape.
  // rawBody is the Buffer provided by express.raw(); middleware uses it for
  // the body-size check so we never rely on content-length estimation.
  const middlewareReq: MiddlewareRequest = {
    method: req.method,
    headers: req.headers as Record<string, string | string[] | undefined>,
    rawBody: Buffer.isBuffer(req.body) ? req.body : undefined,
    ip: req.ip,
  };

  // 1. CORS, OPTIONS preflight, method + content-type + body-size checks.
  //    OPTIONS requests work without Content-Type (checked before step 5 in middleware).
  const middlewareResult = runMiddleware(middlewareReq, res);
  if (!middlewareResult.passed) return;

  // 2. Rate limiting.
  const clientIp = req.ip ?? '0.0.0.0';
  const rateResult = checkRateLimit(clientIp);
  if (!rateResult.allowed) {
    console.log(JSON.stringify({ event: 'rate_limited', requestId }));
    res.set('Retry-After', String(rateResult.retryAfterSeconds ?? 60));
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  // 3. Parse JSON body — manually, so malformed JSON yields a sanitized 400.
  let rawBody: Buffer | undefined;
  if (Buffer.isBuffer(req.body)) {
    rawBody = req.body;
  }

  let parsedBody: unknown;
  if (rawBody && rawBody.length > 0) {
    try {
      parsedBody = JSON.parse(rawBody.toString('utf8'));
    } catch {
      console.log(JSON.stringify({ event: 'json_parse_error', requestId }));
      res.status(400).json({ error: 'Malformed JSON body.' });
      return;
    }
  } else {
    parsedBody = {};
  }

  // 4. Zod request validation.
  const parseResult = InsightsRequestSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    console.log(
      JSON.stringify({
        event: 'validation_error',
        requestId,
        fieldCount: parseResult.error.issues.length,
      }),
    );
    const safeErrors = parseResult.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json({ error: 'Invalid request.', details: safeErrors });
    return;
  }

  const request = parseResult.data;
  const suppliedActionIds = request.rankedActions.map((a) => a.id);

  // 5. In-memory response cache.
  const normalizedRequest = JSON.stringify(request);
  const cacheKey = generateServerCacheKey({
    factorRegistryVersion: request.factorRegistryVersion,
    model: GEMINI_MODEL,
    normalizedRequest,
  });

  const cachedResponse = getCached(cacheKey);
  if (cachedResponse) {
    console.log(JSON.stringify({ event: 'cache_hit', requestId, cacheKey }));
    res.status(200).json(JSON.parse(cachedResponse));
    return;
  }

  // 6. Resolve API key — read from env only; no Firebase defineSecret here.
  //    GEMINI_API_KEY must never appear in any response body or header.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log(
      JSON.stringify({ event: 'config_error', requestId, reason: 'api_key_unavailable' }),
    );
    res.status(503).json({ error: 'AI service is not configured.' });
    return;
  }

  // 7. Gemini call + response validation.
  try {
    const client = createGeminiClient({
      apiKey,
      model: GEMINI_MODEL,
      timeoutMs: 25_000, // 25s — shorter than Render's 30s request timeout
    });

    const userMessage = buildUserMessage(request);

    const aiResponse: InsightsResponse = await client.generate({
      systemInstruction: SYSTEM_INSTRUCTION,
      userMessage,
      requestId,
    });

    // 8. Response integrity validation.
    const integrity = validateResponseIntegrity(aiResponse, suppliedActionIds);
    if (!integrity.valid) {
      console.log(
        JSON.stringify({ event: 'integrity_violation', requestId, issues: integrity.issues }),
      );
      res.status(502).json({ error: 'AI response did not meet integrity requirements.' });
      return;
    }

    // 9. Cache and return.
    const responseJson = JSON.stringify(aiResponse);
    setCached(cacheKey, responseJson);

    console.log(
      JSON.stringify({ event: 'success', requestId, cacheKey, promptVersion: PROMPT_VERSION }),
    );

    res.status(200).json(aiResponse);
  } catch (error) {
    // Map to sanitized status codes — never leak SDK details, prompts, or secrets.
    if (error instanceof GeminiError) {
      const statusMap: Record<string, number> = {
        timeout: 504,
        'rate-limited': 429,
        malformed: 502,
        upstream: 502,
        config: 503,
      };
      const status = statusMap[error.category] ?? 500;

      console.log(JSON.stringify({ event: 'gemini_error', requestId, category: error.category }));

      if (error.category === 'rate-limited') {
        res.set('Retry-After', '60');
      }

      res.status(status).json({ error: 'AI service temporarily unavailable.' });
      return;
    }

    console.log(JSON.stringify({ event: 'unknown_error', requestId }));
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

export default app;
