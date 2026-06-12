# Architecture Decision Records

This document captures key architecture decisions for Carbon Compass using a lightweight ADR format. Each entry records the context, decision, and consequences so future contributors understand *why* the system is built this way.

---

## ADR-001: Deterministic Calculator Over AI Calculation

**Status:** Accepted

**Context:** Carbon footprint calculations must be auditable, reproducible, and transparent. Users and evaluators need to verify that the same inputs always produce the same outputs. AI models are non-deterministic and opaque.

**Decision:** All emission calculations are performed by pure TypeScript functions in `src/domain/calculator/`. Factors are drawn from a centralised Factor Registry with versioned values and source citations. AI is never involved in computing emissions or ranking recommendations.

**Consequences:**
- Calculations are fully testable with deterministic assertions.
- The Methodology page can display exact formulas and factor sources.
- AI features are entirely optional — the core product works without any API calls.

---

## ADR-002: Local-First No-Login Storage

**Status:** Accepted

**Context:** Privacy is a core product value. Users should be able to track their carbon footprint without creating an account, sharing personal data, or trusting a database.

**Decision:** All user data (profiles, snapshots, tracked actions) is stored in the browser via `localStorage`. No server-side database exists. Data portability is supported through JSON export/import and CSV export.

**Consequences:**
- Zero-latency reads and writes — no network dependency for the core product.
- Data is device-local: clearing browser data deletes the profile.
- No multi-device sync (acceptable trade-off for privacy).
- Storage schemas are versioned and validated with Zod to handle migrations gracefully.

---

## ADR-003: Zod at Data Boundaries

**Status:** Accepted

**Context:** The system has multiple trust boundaries — localStorage (could be corrupted or tampered with), AI API responses (non-deterministic), and JSON imports (user-provided files). Runtime type validation is essential for resilience.

**Decision:** Zod schemas guard every external data edge:
- `src/storage/schemas.ts` — localStorage read/write
- `src/storage/json-import.ts` — imported backup files
- `packages/ai-core/src/schemas.ts` — AI request and response shapes

**Consequences:**
- Corrupt localStorage data is detected and the user is prompted to reset.
- Malformed AI responses trigger the self-repair loop before failing gracefully.
- Invalid JSON imports are rejected with user-friendly error messages.
- Schema changes require explicit migration steps in `src/storage/migrations.ts`.

---

## ADR-004: Shared `packages/ai-core` Package

**Status:** Accepted

**Context:** Both the Render Express server and the Firebase Functions wrapper need the same AI logic: Zod schemas, prompt construction, Gemini client, caching, rate limiting, and middleware. Duplicating this logic across two backends would create divergence and maintenance burden.

**Decision:** Extract shared AI backend logic into `packages/ai-core/`, consumed as a local npm package (`"@carbon-compass/ai-core": "file:../packages/ai-core"`). Both `server/` and `functions/` import from this single source of truth.

**Consequences:**
- Changes to AI schemas, prompts, or validation are made once and propagated to all backends.
- The package must be built (`npm run build:ai-core`) before dependent packages can type-check or build.
- The package has its own test suite (76 tests) covering schemas, prompt building, caching, rate limiting, and JSON repair.

---

## ADR-005: Render Express Backend for Production AI

**Status:** Accepted

**Context:** The AI feature requires a backend proxy to keep the Gemini API key secure. The backend must support CORS, rate limiting, request validation, and response caching.

**Decision:** Production AI traffic routes through an Express server deployed on Render (`server/`). The server is a thin proxy that delegates all AI logic to `@carbon-compass/ai-core`.

**Consequences:**
- The Gemini API key is stored in Render environment variables — never in the client bundle.
- Render free-tier instances spin down after 15 minutes of inactivity; the first request can take up to 50 seconds (handled by frontend loading UI).
- The server is stateless and independently deployable.

---

## ADR-006: Firebase Functions Retained as Optional/Legacy Wrapper

**Status:** Accepted (legacy)

**Context:** The project originally used Firebase Cloud Functions for the AI proxy. The architecture was later migrated to Render for simpler deployment and fewer cold-start issues.

**Decision:** The `functions/` directory is retained as an optional reference implementation. It demonstrates how to deploy the same AI proxy on Google Cloud infrastructure using Firebase. Production traffic does not route through Firebase.

**Consequences:**
- Contributors wanting to deploy on Google Cloud have a working reference.
- The functions package is included in CI quality checks to prevent bitrot.
- The functions package depends on `@carbon-compass/ai-core` for AI logic — no duplication.

---

## ADR-007: AI Explains But Never Changes Totals or Rankings

**Status:** Accepted

**Context:** Users must trust that their carbon footprint numbers are accurate and consistent. If AI could modify calculations or reorder recommendations, the system would lose auditability and reproducibility.

**Decision:** The AI advisory layer generates explanations, contextual reasoning, and a 7-day starter plan. It receives pre-computed totals, category shares, and ranked action titles as read-only context. It cannot alter emission values or recommendation order.

**Consequences:**
- AI output is purely educational — users see the same numbers regardless of AI availability.
- The frontend renders AI text as plain React text nodes (no `dangerouslySetInnerHTML`), preventing XSS.
- If the AI backend is unavailable, the app degrades gracefully with full calculator and recommendation functionality intact.

---

## ADR-008: Google Maps URLs Instead of Heavy Maps API

**Status:** Accepted

**Context:** Action cards benefit from real-world context — linking users to nearby transit routes, cycling paths, farmers' markets, etc. However, embedding the Google Maps JavaScript API would add significant bundle weight, require an API key on the client, and introduce location tracking concerns.

**Decision:** Use standard Google Maps search and directions URL query parameters (e.g., `https://www.google.com/maps/search/...`). These are privacy-safe deep links that open in the user's default Maps application.

**Consequences:**
- Zero additional bundle size — URLs are plain strings.
- No Maps API key required on the client.
- No location permissions requested — the user's device handles location within Maps.
- Less rich than an embedded map, but appropriate for an action-linking use case.

---

## ADR-009: No Analytics or Tracking

**Status:** Accepted

**Context:** Carbon Compass is a privacy-first application. Adding analytics (Google Analytics, Mixpanel, etc.) would contradict the privacy promise and require cookie consent flows.

**Decision:** No analytics, telemetry, or third-party tracking scripts are included. No cookies are set. No user behaviour data is collected.

**Consequences:**
- The privacy promise is genuine and verifiable — users can inspect the network tab.
- Product decisions must rely on user feedback rather than behavioural analytics.
- No GDPR/cookie consent banner is needed.
