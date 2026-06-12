# Code Quality

Carbon Compass prioritises deterministic correctness, strict type safety, and explicit package boundaries over complexity. Every calculation is pure TypeScript tested independently of the UI; every data boundary is guarded by Zod schemas; every AI response is validated, cached, and rate-limited before it reaches the user.

---

## Code Quality Philosophy

1. **Deterministic first.** All carbon footprint calculations are executed by pure, side-effect-free TypeScript functions. AI never computes emissions or changes recommendation rankings.
2. **Type-safe boundaries.** Zod schemas validate every external data edge — localStorage reads, API requests, API responses, JSON imports.
3. **Layered architecture.** The codebase enforces unidirectional dependency rules so domain logic remains portable and testable without React, Express, or Firebase.
4. **Shared, not duplicated.** Backend AI logic lives in a single `@carbon-compass/ai-core` package consumed by both the Render server and the optional Firebase Functions wrapper.
5. **Privacy by default.** No analytics, no tracking, no database. User data never leaves the browser unless the user explicitly requests AI insights, and even then only aggregated totals are sent.

---

## Layer Boundaries

| Layer | May Import | Must NOT Import |
|---|---|---|
| `src/domain/` | `storage/schemas` (types only) | `react`, `ui/`, `ai/` |
| `src/storage/` | `zod` | `react`, `ui/`, `ai/`, `domain/` |
| `src/ai/` | `storage/schemas`, `domain/factors`, `lib/` | `ui/` |
| `src/ui/` | All layers | — |
| `src/lib/` | Nothing project-internal | `react`, `ui/`, `domain/` |
| `packages/ai-core/` | `@google/genai`, `zod` | Any client or framework code |
| `server/` | `@carbon-compass/ai-core`, `express` | Any client code |
| `functions/` | `@carbon-compass/ai-core`, `firebase-functions` | Any client code |

---

## Deterministic Domain Logic

All calculations live in `src/domain/calculator/` and are pure functions:

- **Transport:** `annual_kg_CO2e = Σ (weekly_km × 52 × factor[mode])`
- **Electricity:** `annual_kg_CO2e = (household_kwh / household_size) × 12 × grid_factor`
- **Diet:** `annual_kg_CO2e = daily_factor × 365`
- **Flights:** `annual_kg_CO2e = Σ (legs × avg_km × factor[haul]) × 1.9 radiative forcing`

Factors link to a centralised Factor Registry (`src/domain/factors/registry.ts`) with versioned values, confidence ratings, and literature citations (UK DESNZ 2023, IEA 2023, Poore & Nemecek 2018).

---

## Shared AI Core Package

`packages/ai-core/` is the single source of truth for backend AI logic:

| Module | Responsibility |
|---|---|
| `schemas.ts` | Zod schemas for request/response + JSON Schema export |
| `prompt.ts` | System instruction + user message builder |
| `gemini-client.ts` | Gemini API wrapper + self-repair loop |
| `cache.ts` | Server-side response cache |
| `rate-limiter.ts` | In-memory per-IP rate limiter |
| `middleware.ts` | CORS, method, content-type, body-size guards |

Both `server/` and `functions/` import from `@carbon-compass/ai-core` — they never duplicate AI logic.

---

## Validation with Zod

| Boundary | Schema Location | What It Validates |
|---|---|---|
| localStorage read/write | `src/storage/schemas.ts` | User profile, snapshots, tracked actions |
| JSON import | `src/storage/json-import.ts` | Imported backup files |
| AI request (backend) | `packages/ai-core/src/schemas.ts` | Request payload shape and constraints |
| AI response (backend) | `packages/ai-core/src/schemas.ts` | Gemini structured output shape |
| AI response (frontend) | `src/ai/adapter.ts` | Validates response before rendering |

---

## Test Strategy & Current Counts

| Package | Test Type | Count | Command |
|---|---|---|---|
| Frontend (`src/`) | Unit + Integration | 255 | `npm test` |
| AI Core (`packages/ai-core/`) | Unit | 76 | `cd packages/ai-core && npm test` |
| Server (`server/`) | Unit + Integration | 12 | `cd server && npm test` |
| Functions (`functions/`) | Unit | 10 | `cd functions && npm test` |
| **Unit/Integration Total** | | **353** | `npm run test:all` |
| Frontend (E2E) | Playwright E2E | 43 | `npx playwright test` |
| **Grand Total** | | **396** | |

**Testing principles:**
- Domain calculator functions have exhaustive unit tests covering edge cases and boundary values.
- Storage adapters are tested with mock localStorage and schema migration paths.
- AI adapter tests mock HTTP responses and validate Zod parsing.
- Backend tests use supertest for Express endpoint coverage.
- Playwright E2E tests cover onboarding flows, dashboard interactions, data import/export, and accessibility audits (Axe) across desktop and mobile viewports.

**Note:** Playwright E2E tests are maintained as a local development suite and are not currently enforced in CI. All unit and integration tests run in CI on every push and pull request.

---

## Security & Privacy Safeguards

- **No tracking or analytics.** No Google Analytics, no third-party scripts, no telemetry.
- **No database.** All user data is stored in the browser via `localStorage`.
- **API key protection.** The Gemini API key is stored exclusively in server-side environment variables. It is never bundled into the client.
- **Automated secret scan.** A build-time test (`src/ai/__tests__/no-api-key-in-build.test.ts`) scans the production bundle output for leaked API key patterns. Runs automatically via `postbuild`.
- **Backend security controls.** CORS origin allowlist, 1 MB request payload size limit, per-IP rate limiting.
- **No dangerous HTML rendering.** AI responses are rendered as plain React text nodes. `dangerouslySetInnerHTML` is never used for AI content.

---

## Accessibility Safeguards

- Semantic HTML5 landmarks (`<main>`, `<nav>`, `<section>`, headings).
- Skip-to-content link for keyboard users.
- All interactive elements have keyboard focus indicators.
- Structured tables with proper `<th>` headers and captions.
- Playwright E2E suite runs Axe accessibility audits on all major pages.
- WCAG AA contrast compliance across the design system.

---

## Efficiency Choices

- **Client-side calculation.** Footprint computation runs entirely in the browser — no server round-trip for the core product.
- **localStorage persistence.** Zero-latency reads, no database overhead, instant startup.
- **Lazy-loaded routes.** React Router with `React.lazy()` for code-split page bundles.
- **AI response caching.** Client-side 7-day TTL cache prevents redundant Gemini API calls. Server-side cache provides an additional layer.
- **Minimal dependencies.** No UI framework beyond React. Tailwind CSS v4 for styling. No state management library.

---

## Deployment Separation

| Component | Platform | Purpose |
|---|---|---|
| Frontend SPA | Vercel | React 19 + Vite + Tailwind CSS v4 |
| AI Backend | Render | Express proxy to Gemini API |
| Firebase Functions | N/A (optional/legacy) | Reference implementation for Google Cloud deployment |

The frontend is a static SPA with no server-side rendering. The AI backend is a stateless Express server. These are independently deployable and independently scalable.

---

## Checklist for Future Changes

Before merging any change, verify:

- [ ] `npm run check:all` passes (format, typecheck, lint, test, build for all packages)
- [ ] No new imports that violate layer boundaries (see table above)
- [ ] Domain logic changes include corresponding unit tests
- [ ] Storage schema changes include a migration in `src/storage/migrations.ts`
- [ ] AI prompt changes are validated against Zod response schemas
- [ ] No API keys or secrets in committed files
- [ ] Test counts in this document are updated if tests were added or removed
- [ ] Architecture decisions are documented in `docs/ARCHITECTURE_DECISIONS.md`
