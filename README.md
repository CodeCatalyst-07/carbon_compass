# Carbon Compass

A privacy-first carbon footprint awareness and action platform designed to help individuals understand, track, simulate, and reduce their personal carbon emissions through deterministic, source-backed calculations and optional AI-powered explanations.

[![CI](https://github.com/CodeCatalyst-07/carbon_compass/actions/workflows/ci.yml/badge.svg)](https://github.com/CodeCatalyst-07/carbon_compass/actions/workflows/ci.yml)
[![Vercel Deployment](https://img.shields.io/badge/Frontend-Vercel-success?style=flat-square&logo=vercel)](https://carbon-compass-alpha.vercel.app)
[![Render Backend](https://img.shields.io/badge/Backend-Render-blue?style=flat-square&logo=render)](https://carbon-compass-3ag7.onrender.com/health)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## Live Demo & Endpoints

* **Frontend App:** [https://carbon-compass-alpha.vercel.app](https://carbon-compass-alpha.vercel.app)
* **Backend Health Check:** [https://carbon-compass-3ag7.onrender.com/health](https://carbon-compass-3ag7.onrender.com/health)
* **AI Insights Endpoint:** `https://carbon-compass-3ag7.onrender.com/insights` (Used as a POST endpoint by the frontend)

---

## Problem Statement Alignment

Carbon Compass is designed directly to address the challenge: **“Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.”**

Here is how each pillar of the problem statement is mapped to the platform's core architecture:

* **Understand:**
  * **Interactive Calculator:** Estimates annual emissions across four primary categories (Transport, Electricity, Diet, Flights) in a two-minute onboarding questionnaire.
  * **Visual Category Breakdown:** Visualizes carbon shares on a live dashboard to help users understand their biggest sources of emissions.
  * **Top Drivers Identification:** Highlights the highest-emission categories automatically.
  * **Methodology Transparency:** Detailed Factor Registry page showing exactly where every conversion factor comes from (e.g. UK DESNZ, IEA, Poore & Nemecek).
* **Track:**
  * **Progress History Snapshots:** Users can take weekly snapshots of their footprint to track changes over time.
  * **Browser-First Storage:** All snapshot data is persisted locally in the browser (`localStorage`) for absolute privacy.
  * **Data Portability:** Users can download a JSON backup of their profile or export their progress history as a CSV file compatible with spreadsheet software.
* **Reduce:**
  * **Ranked Recommendations:** Suggests actionable carbon-reduction tips ranked by a multi-criteria scoring algorithm.
  * **Swap Simulator:** Interactive sandbox that lets users model behavior changes (e.g. swapping a diesel car commute for national rail or switching to a vegetarian diet) to see the exact drop in footprint before applying changes.
  * **Action Lifecycle:** Users track action statuses through Planned, Completed, or Dismissed states.
* **Personalized Insights:**
  * **Context-Aware Scoring:** Ranks actions dynamically based on user inputs (e.g. top emission driver, effort/cost settings).
  * **Optional AI Explanation Layer:** Uses Google Gemini API to analyze context and generate custom explanations, actionable reasoning, and a 7-day starter plan.

---

## Key Features

1. **Frictionless No-Login Onboarding:** Get an initial carbon footprint estimate in under two minutes with no registration required.
2. **Interactive 4-Category Calculator:** Covers Transport (commutes and vehicle types), Electricity (household usage and size), Diet (food footprint estimates), and Flights (short/medium/long-haul segments).
3. **Category Breakdown & Top Drivers:** Instant interactive charts detailing emission percentages and highlighting areas of high impact.
4. **Recommendation Ranking Engine:** Multi-factor scoring system that orders actions by emission reduction potential, cost, effort, and relevance.
5. **Action Planning & State Tracking:** Tracks action lifecycle (Planned, Completed, Dismissed) with dynamic recalculation of remaining recommendations.
6. **Swap Simulator:** Sandbox tool for modeling changes in lifestyle inputs (e.g., swapping vehicle type) before modifying your active profile.
7. **Progress Snapshots:** Stores history of carbon footprints to display a progress graph over time.
8. **JSON/CSV Import & Export:** Fully functional data export/import for data ownership.
9. **Methodology Transparency:** Real-time visibility into the factors, confidence scores, and literature sources behind every calculation.
10. **Optional AI Insights Panel:** Generates a custom analysis and 7-day starter plan using the Google Gemini API.
11. **Google Maps Action Links:** Integrates Maps navigation and search URLs directly on action cards (e.g., searching for local transit routes, bicycle paths, reuse/repair shops, or farmers' markets) without tracking location.
12. **Accessibility & Responsive Design:** Fully responsive layout built with semantic HTML landmarks, skip links, screen-reader tables, keyboard accessibility, and a modern design system.

---

## Repository Map

```
src/domain/              Pure calculator + recommendation engine (no framework imports)
src/storage/             localStorage schemas, adapters, migrations, CSV/JSON export
src/ai/                  Frontend AI adapter, client-side cache, React hook
src/ui/                  React components, pages, layouts, hooks
src/lib/                 Shared utilities (class merging, hashing, demo data)
packages/ai-core/        Shared backend AI logic: schemas, Gemini client, cache, rate-limit, middleware
server/                  Render Express backend (production AI proxy)
functions/               Optional Firebase Cloud Functions wrapper (legacy/reference)
docs/                    Architecture, methodology, deployment guides, demo script
e2e/                     Playwright end-to-end test specs
```

---

## Code Quality & Maintainability

Carbon Compass prioritises deterministic correctness, strict type safety, and explicit package boundaries. See [QUALITY.md](QUALITY.md) for the full quality philosophy and [docs/ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md) for architecture decision records.

**Key principles:**
* All carbon calculations are pure, side-effect-free TypeScript — AI never computes emissions or changes rankings.
* Zod schemas guard every external data boundary (localStorage, API requests/responses, JSON imports).
* Strict layer dependency rules prevent domain logic from importing React or UI code.
* The `@carbon-compass/ai-core` shared package is the single source of truth for backend AI logic.
* A `postbuild` secret-scan test ensures no API keys leak into the client bundle.

### Quality Commands

| Command | Scope |
|---|---|
| `npm run check` | Frontend: format + typecheck + lint + test + build |
| `npm run check:ai-core` | AI Core: format + typecheck + lint + test + build |
| `npm run check:server` | Server: builds ai-core first, then full quality gate |
| `npm run check:functions` | Functions: builds ai-core first, then full quality gate |
| `npm run check:all` | All four packages sequentially |
| `npm run test:all` | Unit/integration tests across all packages |
| `npm run build:all` | Production builds for all packages |
| `npm run lint:all` | Lint all packages |
| `npm run format:all` | Format check all packages |

### CI/CD

GitHub Actions CI runs on every push to `main` and on pull requests. Four independent jobs verify each package:

| Job | What It Checks |
|---|---|
| `frontend-quality` | Format, typecheck, lint, 255 tests, production build + secret scan |
| `ai-core-quality` | Format, typecheck, lint, 76 tests, build |
| `server-quality` | Builds ai-core → format, typecheck, lint, 12 tests, build |
| `functions-quality` | Builds ai-core → format, typecheck, lint, 10 tests, build |

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for the full workflow.


## Google Services Usage

Carbon Compass incorporates meaningful Google ecosystem integrations to elevate static carbon tracking into a smart, interactive coach:

### 1. Google Gemini API
* **Role:** Acts as an advisory explanation layer. It generates personalized insights, explaining *why* certain actions fit the user's profile and creating a tailored 7-day starter plan.
* **Architecture:** Invocations are routed via a secure backend proxy server hosted on Render. This keeps the API key safely on the server and protects the client bundle from key leakage.
* **Safety & Integrity:** Gemini responses are requested using structured JSON schemas and validated using Zod. If the response contains formatting issues, a backend self-repair routine attempts to correct it.
* **Strict Limitation:** Gemini **does not** calculate emissions or change the deterministic order of recommendations. All calculations and rankings are handled by pure, audited TypeScript functions.

### 2. Google Maps
* **Role:** Bridges the gap between carbon awareness and real-world behavior. Action cards contain dynamic, privacy-safe Google Maps deep links.
* **Usability:** Users can click to search for nearby transit directions, cycling routes, local farmers' markets, reuse/repair centers, or smart recycling options.
* **Privacy-First:** Uses standard search and navigation query parameters. **No location permissions or Maps API keys are required on the client side**, protecting user privacy.

### 3. Google Fonts
* **Role:** Integrates the *Inter* typography family directly, ensuring a clean, highly readable, and accessible UI layout.

### 4. Firebase (Local Testing / Optional Backend)
* **Role:** A complete Firebase Cloud Functions proxy wrapper is included under the `functions/` directory for local emulation and deployment testing.
* **Reference Only:** Production traffic routes through the Render web service; Firebase is maintained as an optional reference for developers wanting to run the proxy on Google Cloud Infrastructure.

---

## AI Architecture and Safety

The AI integration is built from the ground up to prioritize user privacy, data security, and system resilience:

```
+---------------------------------------------------------+
|                    Vercel Frontend                      |
|  [React 19 SPA] <--> [localStorage (No Database Needed)]|
|  (Never renders unescaped AI text as HTML)              |
+---------------------------------------------------------+
             |                                     ▲
             | POST /insights                      | Structured JSON
             | (Only aggregated totals/categories) | (Validated by Zod)
             ▼                                     |
+---------------------------------------------------------+
|                     Render Backend                      |
|               [Express Web Server Proxy]                |
|     (Zod schema validation, Rate-limiters, Cache)       |
+---------------------------------------------------------+
             |                                     ▲
             | Google GenAI SDK                    |
             | (API Key Protected on Server)       | Raw Response
             ▼                                     |
+---------------------------------------------------------+
|                   Google Gemini API                     |
|            (Model: gemini-2.5-flash-lite)               |
+---------------------------------------------------------+
```

1. **No Personal Data Exposure:** The payload sent to the backend proxy contains **no personal identifiers** (no names, emails, precise locations, or analytics trackers). It consists solely of aggregated annual carbon totals, category percentages, ranked recommendation titles, and user constraints.
2. **Server-Side API Key Management:** The Gemini API key is stored securely in Render environment variables. It is never shipped to or accessible from the frontend bundle.
3. **Structured Outputs & Schema Validation:** We enforce structured outputs using the Google GenAI SDK and validate the schema using Zod.
4. **Self-Repair Loop:** If Gemini returns a malformed response or fails validation, the proxy automatically retries with a repair prompt before returning an error to the client.
5. **No Dangerous HTML Execution:** AI text is rendered as plain React text nodes. We do not use `dangerouslySetInnerHTML` to render AI outputs, preventing XSS injection.
6. **Graceful Degradation:** The AI panel is completely optional. If the Render service is offline, cold starting, or rate-limited, the frontend gracefully disables the AI module and shows a friendly notice. The core calculator and recommendations remain 100% operational.

---

## Package Architecture

The project is structured as a monorepo with strict dependency boundaries:

| Package | Platform | Description |
|---|---|---|
| `src/` (frontend) | Vercel | React 19 SPA with Vite and Tailwind CSS v4 |
| `packages/ai-core/` | Shared library | Zod schemas, Gemini client, prompt builder, cache, rate-limiter, middleware |
| `server/` | Render | Express proxy — production AI backend |
| `functions/` | Firebase (optional/legacy) | Cloud Functions wrapper — reference implementation only |

Both `server/` and `functions/` depend on `@carbon-compass/ai-core` as a local npm package. AI logic is never duplicated. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full dependency graph and data flow.

```
               [ User Input ]
                      │
                      ▼
            [ Domain Calculator ] ──────► [ localStorage Storage ]
                      │
                      ▼
          [ Recommendation Engine ]
                      │
                      ▼
           [ Composite Score Ranker ]
            /                      \
           /                        \
          ▼                          ▼
 [ Google Maps Links ]     [ Optional AI Insights ]
 (Transit/Bicycle Routes)  (Gemini Explanation Proxy)
```

---

## Deterministic Calculation Methodology

All calculations are executed client-side using pure, testable TypeScript functions in `src/domain/calculator/`.

* **Transport:** `annual_kg_CO2e = Σ (weekly_distance_km × 52 × factor[mode])`. Supports car, bus, train, bicycle (0), and walking (0). Factors represent well-to-wheel emissions sourced from UK DESNZ 2023.
* **Electricity:** `annual_kg_CO2e = (household_kwh / household_size) × 12 × grid_factor`. Uses a global average grid factor of `0.494 kg CO2e/kWh` sourced from IEA 2023.
* **Diet:** `annual_kg_CO2e = daily_diet_factor × 365`. Focuses on daily dietary profile estimates: heavy-meat (7.19), vegetarian (3.81), and vegan (2.89) kg CO2e/day (derived from Poore & Nemecek 2018).
* **Flights:** `annual_kg_CO2e = Σ (one_way_legs × average_distance_km × factor[haul])`. Categories: short-haul (avg 1,100 km), medium-haul (avg 2,800 km), and long-haul (avg 6,500 km). Includes a `1.9x` radiative forcing multiplier per DESNZ guidelines.

Calculations link to a centralized Factor Registry ([`src/domain/factors/registry.ts`](src/domain/factors/registry.ts)) that documents factor values, versions, confidence ratings, and source citations.
*For a detailed methodology breakdown, see [docs/METHODOLOGY.md](docs/METHODOLOGY.md).*

---

## Recommendation Engine

Recommendations are ranked using a multi-criteria scoring algorithm to ensure users receive relevant, high-impact advice:

$$\text{Composite Score} = 0.35 \times \text{Impact} + 0.20 \times \text{Context Match} + 0.25 \times \text{Driver Relevance} + 0.10 \times \text{Effort} + 0.10 \times \text{Cost}$$

* **Driver Relevance:** Boosts actions that target the user's highest emission categories (e.g. flights, transport).
* **Context Match:** Filters out actions that are inapplicable (e.g. vegan users do not see meat reduction tips).
* **Lifecycle Filtering:** Excludes completed or dismissed actions from the ranked output.
* **Tie-Breaking:** Identical scores are resolved by prioritizing actions with lower effort and then lower cost.

---

## Privacy and Security

* **Zero Tracking & Analytics:** We do not use Google Analytics or other third-party tracking scripts.
* **No Database:** No user profiles, carbon estimates, or snapshots are saved on our servers. All state resides in the user's browser via `localStorage`.
* **API Key Protection:** The Gemini API key is stored strictly on the server and is never sent to the client.
* **Security Controls:** The backend features a CORS origin allowlist, request payload size limits (capped at 8 KB for AI requests), and rate limiters to protect the Render instance.
* **Automated Security Scans:** An automated build check runs a secret scanner test (`src/ai/__tests__/no-api-key-in-build.test.ts`) to ensure no API keys are accidentally compiled into the production frontend bundle.

---

## Testing Matrix

The project maintains a comprehensive automated testing suite across the entire stack:

### Unit & Integration Tests (CI-Enforced)

| Package | Tests | Coverage | Command |
|---|---|---|---|
| Frontend (`src/`) | 255 | Calculator formulas, dashboard views, simulator, state logic | `npm test` |
| AI Core (`packages/ai-core/`) | 76 | Prompt formats, JSON repair, caching, rate-limiters, Zod schemas | `cd packages/ai-core && npm test` |
| Server (`server/`) | 12 | Health endpoints, CORS, rate limiters | `cd server && npm test` |
| Functions (`functions/`) | 10 | API key resolution, endpoint wiring | `cd functions && npm test` |
| **Total** | **353** | | `npm run test:all` |

### End-to-End Tests (Local/Maintained)

| Suite | Tests | Coverage | Command |
|---|---|---|---|
| Playwright E2E | 43 | Onboarding flows, dashboard updates, data import/export, accessibility (Axe audits), desktop + mobile viewports | `npx playwright test` |

**Grand total: 396 automated tests.**

All unit and integration tests run in CI on every push and pull request. Playwright E2E tests are maintained as a local development suite.

```bash
# Full quality gate for all packages
npm run check:all

# Run all unit/integration tests
npm run test:all

# Run E2E tests locally (requires built frontend)
npm run build && npx playwright test
```

---

## Accessibility

Carbon Compass is designed to meet WCAG AA accessibility standards:
* **Semantic Landmarks:** Organized using semantic HTML5 tags (`<main>`, `<nav>`, `<section>`, `<h1>`-`<h6>`).
* **Keyboard Navigation:** Fully navigable via keyboard, with clear focus indicators on all links, buttons, and input fields.
* **Skip Link:** A "Skip to content" link allows keyboard users to bypass navigation menus.
* **Accessible Tables:** Methodology lists and registries use structured tables with correct headers (`<th>`) and captions.
* **Automated Axe Audits:** Playwright runs Axe accessibility checks on all main pages during E2E testing to ensure zero contrast or structural violations.

---

## Deployment Architecture

| Component | Platform | URL | Notes |
|---|---|---|---|
| Frontend SPA | **Vercel** | [carbon-compass-alpha.vercel.app](https://carbon-compass-alpha.vercel.app) | Static React 19 build — no SSR |
| AI Backend | **Render** | [carbon-compass-3ag7.onrender.com](https://carbon-compass-3ag7.onrender.com/health) | Express proxy to Gemini API |
| Firebase Functions | N/A | Not deployed | Optional/legacy reference only |

The frontend and backend are independently deployable. The frontend works fully without the backend — AI features degrade gracefully.

### Frontend Environment (Vercel)
* `VITE_AI_ENDPOINT` = `https://your-render-service.onrender.com/insights`

### Backend Environment (Render)
* `GEMINI_API_KEY` = Server-side only — never bundled into the client
* `GEMINI_MODEL` = `gemini-2.5-flash-lite` (Default)
* `CORS_ORIGINS` = `https://your-app.vercel.app` (Comma-separated allowed domains)
* `NODE_VERSION` = `22`

**Important:** There is no `VITE_GEMINI_API_KEY` — this is intentional by design. All API keys are backend-only.

---

## Local Development

Follow these steps to run the frontend and backend locally:

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   * Create `server/.env` using `server/.env.example` as a template.
   * Add your `GEMINI_API_KEY` from Google AI Studio.

3. **Build Shared Library:**
   ```bash
   npm run build:ai-core
   ```

4. **Start the AI Backend Server:**
   ```bash
   npm run dev:server
   # Starts Express backend at http://localhost:10000
   ```

5. **Start the Frontend App:**
   In a separate terminal, start the Vite development server pointing to the local proxy:
   ```bash
   VITE_AI_ENDPOINT=http://localhost:10000/insights npm run dev
   # Starts frontend at http://localhost:5173
   ```

---

## Documentation Links

* [Architecture Overview](docs/ARCHITECTURE.md) — Detailed design, monorepo dependency graph, and data flow.
* [Architecture Decisions](docs/ARCHITECTURE_DECISIONS.md) — ADR-style records for key design choices.
* [Calculation Methodology](docs/METHODOLOGY.md) — Formula references, factors, and ranking scores.
* [Interactive Demo Script](docs/DEMO_SCRIPT.md) — Step-by-step scripts for presenting the application.
* [Render Backend Deployment](docs/render-deployment.md) — Comprehensive guide to setting up Render services.
* [Local Development Guide](docs/local-development.md) — Instructions for setting up development environments.
* [Firebase Functions Reference](docs/firebase-setup.md) — Guide for legacy/optional Firebase setup.
* [Code Quality](QUALITY.md) — Quality philosophy, layer boundaries, test strategy, and future-changes checklist.
* [Contributing Guide](CONTRIBUTING.md) — Local setup, PR workflow, coding standards, and package boundaries.

---

## Known Limitations

* **Estimates Only:** Calculated results are carbon footprint estimates, not formal corporate audits.
* **Limited Scope:** The engine tracks four key categories (Transport, Electricity, Diet, Flights). It excludes household goods, food waste, services, and construction.
* **Global Grid Intensity Average:** Uses a single global factor (`0.494 kg CO2e/kWh`). Users in green-grid locations (e.g. Norway, France) will see over-estimations.
* **UK-Biased Transport Data:** Land transport calculations use UK DESNZ 2023 factors, which may not align with older or distinct regional vehicle fleets.
* **Free-Tier Backend Latency:** The Render free-tier backend spins down after 15 minutes of inactivity. The first AI request can take up to 50 seconds to complete (handled gracefully by frontend loading screens).
* **AI Advisory Nature:** The AI Insights are designed for educational explanation and action mapping; they are not authoritative calculation audits.

---

## Why Carbon Compass Fits the Challenge

* **Smart Dynamic Assistant:** Optional Google Gemini API integration acts as a responsive personal footprint coach, generating tailored starter plans. AI explains but never calculates emissions or changes recommendation rankings.
* **Context-Aware Recommendations:** A custom multi-criteria scoring algorithm and direct Google Maps action links make suggestions highly actionable.
* **Meaningful Google Ecosystem Integration:** Leverages Gemini (advisory explanations), Google Maps (privacy-safe local routing/directions search), Google Fonts, and optional Firebase Functions support. No Google Analytics.
* **Practical Usability:** Offers immediate value with frictionless, no-login onboarding, data portability, and progress simulation.
* **Privacy-First Architecture:** Eliminates data tracking, databases, and login requirements. User data remains on the user's device.
* **Clean, Fully-Tested Codebase:** 353 unit/integration tests + 43 Playwright E2E tests across all packages. CI enforces format, typecheck, lint, test, and build on every push.
