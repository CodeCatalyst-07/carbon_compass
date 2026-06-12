/**
 * Tests for HTTP middleware.
 *
 * Covers amendment 6 (HTTP/CORS) and amendment 8 (error handling).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runMiddleware, type MiddlewareRequest, type MiddlewareResponse } from '../middleware.js';

function createMockReq(overrides: Partial<MiddlewareRequest> = {}): MiddlewareRequest {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:5173',
    },
    body: {},
    ...overrides,
  };
}

function createMockRes(): MiddlewareResponse & {
  _status: number;
  _headers: Record<string, string>;
  _body: unknown;
  _ended: boolean;
} {
  const res = {
    _status: 200,
    _headers: {} as Record<string, string>,
    _body: undefined as unknown,
    _ended: false,
    status(code: number) {
      res._status = code;
      return res;
    },
    set(header: string, value: string) {
      res._headers[header] = value;
      return res;
    },
    json(body: unknown) {
      res._body = body;
    },
    end() {
      res._ended = true;
    },
  };
  return res;
}

beforeEach(() => {
  // Reset CORS_ORIGINS for each test
  delete process.env.CORS_ORIGINS;
});

describe('runMiddleware', () => {
  // ─── OPTIONS preflight ───

  it('handles OPTIONS preflight for allowed origin with 204', () => {
    const req = createMockReq({ method: 'OPTIONS' });
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(false);
    expect(res._status).toBe(204);
    expect(res._ended).toBe(true);
    expect(res._headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(res._headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
  });

  it('rejects OPTIONS preflight for disallowed origin with 403', () => {
    const req = createMockReq({
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example.com', 'content-type': 'application/json' },
    });
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(false);
    expect(res._status).toBe(403);
  });

  // ─── CORS origin matching ───

  it('sets CORS headers for exact allowed origin', () => {
    const req = createMockReq();
    const res = createMockRes();
    runMiddleware(req, res);
    expect(res._headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('rejects disallowed origin with 403 (amendment 6)', () => {
    const req = createMockReq({
      headers: { origin: 'https://evil.example.com', 'content-type': 'application/json' },
    });
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(false);
    expect(res._status).toBe(403);
    expect(res._headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('does not set CORS headers for disallowed origin', () => {
    const req = createMockReq({
      headers: { origin: 'https://evil.example.com', 'content-type': 'application/json' },
    });
    const res = createMockRes();
    runMiddleware(req, res);
    expect(res._headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('allows requests without Origin header (e.g., server-to-server)', () => {
    const req = createMockReq({
      headers: { 'content-type': 'application/json' },
    });
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(true);
  });

  it('respects custom CORS_ORIGINS env var', () => {
    process.env.CORS_ORIGINS = 'https://myapp.example.com,https://staging.example.com';
    const req = createMockReq({
      headers: { origin: 'https://myapp.example.com', 'content-type': 'application/json' },
    });
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(true);
    expect(res._headers['Access-Control-Allow-Origin']).toBe('https://myapp.example.com');
  });

  // ─── Vary header ───

  it('always sets Vary: Origin', () => {
    const req = createMockReq();
    const res = createMockRes();
    runMiddleware(req, res);
    expect(res._headers['Vary']).toBe('Origin');
  });

  // ─── no-store headers ───

  it('always sets Cache-Control: private, no-store', () => {
    const req = createMockReq();
    const res = createMockRes();
    runMiddleware(req, res);
    expect(res._headers['Cache-Control']).toBe('private, no-store');
  });

  // ─── Method enforcement ───

  it('rejects GET with 405', () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(false);
    expect(res._status).toBe(405);
  });

  it('rejects PUT with 405', () => {
    const req = createMockReq({ method: 'PUT' });
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(false);
    expect(res._status).toBe(405);
  });

  // ─── Content-Type enforcement ───

  it('rejects non-JSON content type with 415', () => {
    const req = createMockReq({
      headers: { 'content-type': 'text/plain', origin: 'http://localhost:5173' },
    });
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(false);
    expect(res._status).toBe(415);
  });

  it('accepts application/json with charset', () => {
    const req = createMockReq({
      headers: {
        'content-type': 'application/json; charset=utf-8',
        origin: 'http://localhost:5173',
      },
    });
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(true);
  });

  // ─── Body size enforcement ───

  it('rejects oversized body with 413', () => {
    const req = createMockReq({
      rawBody: Buffer.alloc(9 * 1024), // 9 KB > 8 KB limit
    });
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(false);
    expect(res._status).toBe(413);
  });

  it('allows body within size limit', () => {
    const req = createMockReq({
      rawBody: Buffer.alloc(1024), // 1 KB
    });
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(true);
  });

  // ─── Passes valid requests ───

  it('passes a valid POST with JSON content type and allowed origin', () => {
    const req = createMockReq();
    const res = createMockRes();
    const result = runMiddleware(req, res);
    expect(result.passed).toBe(true);
  });
});
