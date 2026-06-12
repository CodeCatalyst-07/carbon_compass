/**
 * @carbon-compass/ai-core
 *
 * Shared backend AI logic for Carbon Compass.
 * Used by both:
 *   - functions/src/index.ts  (Firebase Cloud Functions — optional/legacy)
 *   - server/src/app.ts       (Express on Render — production AI backend)
 *
 * This package contains NO Firebase-specific or Express-specific code.
 */

export * from './schemas.js';
export * from './prompt.js';
export * from './gemini-client.js';
export * from './cache.js';
export * from './rate-limiter.js';
export * from './middleware.js';
