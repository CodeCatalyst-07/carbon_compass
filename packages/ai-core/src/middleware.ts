/**
 * HTTP middleware for the insights endpoint.
 *
 * Amendment 6 — HTTP and CORS:
 * - Handle OPTIONS preflight before POST enforcement
 * - Return correct Access-Control-Allow-Origin only for exact allowlisted origin
 * - Add Vary: Origin
 * - Reject disallowed Origin with 403
 * - Allow only POST and application/json
 * - Enforce body size before expensive parsing
 * - Use Cache-Control: private, no-store
 *
 * Amendment 8 — Error handling:
 * - Map failures to sanitized status codes
 * - Never return SDK error details, prompts, secrets, or stack traces
 */

/** Maximum request body size in bytes (8 KB). */
const MAX_BODY_SIZE = 8 * 1024;

/**
 * Get allowed CORS origins from configuration.
 * CORS_ORIGINS is non-secret configuration (amendment 4).
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS;
  if (envOrigins) {
    return envOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
  // Default: local development origins
  return ['http://localhost:5173', 'http://localhost:4000', 'http://localhost:5000'];
}

export interface MiddlewareRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  /** Raw body content. */
  rawBody?: Buffer;
  body?: unknown;
  ip?: string;
}

export interface MiddlewareResponse {
  status: (code: number) => MiddlewareResponse;
  set: (header: string, value: string) => MiddlewareResponse;
  json: (body: unknown) => void;
  end: () => void;
}

export interface MiddlewareResult {
  passed: boolean;
}

/**
 * Run all middleware checks.
 * Returns { passed: true } if the request should proceed.
 * Otherwise, appropriate error response has already been sent.
 */
export function runMiddleware(req: MiddlewareRequest, res: MiddlewareResponse): MiddlewareResult {
  // Always set no-store and Vary: Origin (amendment 6)
  res.set('Cache-Control', 'private, no-store');
  res.set('Vary', 'Origin');

  // 1. CORS — check origin first
  const origin = getHeader(req, 'origin');
  const allowed = getAllowedOrigins();
  const isAllowed = origin !== undefined && allowed.includes(origin);

  // Set CORS headers for allowed origins
  if (isAllowed) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
  }

  // 2. Handle OPTIONS preflight (before POST enforcement)
  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      // Disallowed origin on preflight
      res.status(403).json({ error: 'Origin not allowed.' });
      return { passed: false };
    }
    res.status(204).end();
    return { passed: false };
  }

  // 3. Reject disallowed origin with 403 (amendment 6)
  if (origin !== undefined && !isAllowed) {
    res.status(403).json({ error: 'Origin not allowed.' });
    return { passed: false };
  }

  // 4. POST only
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return { passed: false };
  }

  // 5. Content-Type check
  const contentType = getHeader(req, 'content-type') ?? '';
  if (!contentType.includes('application/json')) {
    res.status(415).json({ error: 'Unsupported media type. Use application/json.' });
    return { passed: false };
  }

  // 6. Body size check (amendment 6: enforce before expensive parsing)
  const bodySize = getBodySize(req);
  if (bodySize > MAX_BODY_SIZE) {
    res.status(413).json({ error: `Request body too large. Maximum ${MAX_BODY_SIZE} bytes.` });
    return { passed: false };
  }

  return { passed: true };
}

function getHeader(req: MiddlewareRequest, name: string): string | undefined {
  const value = req.headers[name];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function getBodySize(req: MiddlewareRequest): number {
  if (req.rawBody) return req.rawBody.length;
  // Fallback: estimate from content-length header
  const cl = getHeader(req, 'content-length');
  if (cl) return parseInt(cl, 10) || 0;
  // Last resort: estimate from parsed body
  if (req.body) return JSON.stringify(req.body).length;
  return 0;
}
