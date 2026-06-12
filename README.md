# Carbon Compass

A privacy-first carbon footprint awareness and action platform designed to help individuals understand, track, simulate, and reduce their personal carbon emissions through deterministic, source-backed calculations and optional AI-powered explanations.

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

## System Architecture

The project is structured as a monorepo consisting of:
* **`src/`:** The frontend client SPA built with React 19, Vite, and Tailwind CSS v4.
* **`server/`:** An Express backend proxy server that acts as a secure intermediary for Google Gemini API calls.
* **`packages/ai-core/`:** A shared workspace library containing the schemas, Gemini client configuration, caching layer, and rate-limiting middleware.
* **`functions/`:** An optional Firebase Cloud Functions proxy server setup (used for reference and local testing).

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
* **Security Controls:** The backend features a CORS origin allowlist, request payload size limits (capped at 1MB), and rate limiters to protect the Render instance.
* **Automated Security Scans:** An automated build check runs a secret scanner test (`src/ai/__tests__/no-api-key-in-build.test.ts`) to ensure no API keys are accidentally compiled into the production frontend bundle.

---

## Testing and Quality

The project maintains a comprehensive automated testing suite across the entire stack:

* **Frontend Unit & Integration Tests:** **255 tests** covering calculator formulas, dashboard views, simulator changes, and state logic.
* **AI Core Shared Logic Tests:** **76 tests** validating prompt formats, JSON repair routines, caching, rate-limiters, and Zod schema boundaries.
* **Render Express Server Tests:** **12 tests** covering health endpoints, CORS behaviors, and rate limiters.
* **Firebase Cloud Functions Tests:** **10 tests** validating local API key resolution.
* **Playwright End-to-End Tests:** **43 tests** verifying user flows (onboarding, dashboard updates, data import/export) and accessibility across desktop and mobile screens.

**Total Automated Tests:** **396 passing tests**

```bash
# To run the frontend and core unit/integration suite
npm test

# To check type safety and code style
npm run typecheck
npm run lint
npm run format:check
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

## Deployment Configuration

### Frontend (Vercel)
Set the following environment variable in the Vercel Dashboard:
* `VITE_AI_ENDPOINT` = `https://your-render-service.onrender.com/insights`

### Backend (Render Web Service)
Set the following variables in the Render environment settings:
* `GEMINI_API_KEY` = `your_google_gemini_api_key`
* `GEMINI_MODEL` = `gemini-2.5-flash-lite` (Default)
* `CORS_ORIGINS` = `https://your-app.vercel.app` (Comma-separated allowed domains)
* `NODE_VERSION` = `22`

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
* [Calculation Methodology](docs/METHODOLOGY.md) — Formula references, factors, and ranking scores.
* [Interactive Demo Script](docs/DEMO_SCRIPT.md) — Step-by-step scripts for presenting the application.
* [Render Backend Deployment](docs/render-deployment.md) — Comprehensive guide to setting up Render services.
* [Local Development Guide](docs/local-development.md) — Instructions for setting up development environments.
* [Firebase Functions Reference](docs/firebase-setup.md) — Guide for legacy/optional Firebase setup.

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

* **Smart Dynamic Assistant:** Optional Google Gemini API integration acts as a responsive personal footprint coach, generating tailormade starter plans.
* **Context-Aware Recommendations:** A custom multi-criteria scoring algorithm and direct Google Maps action links make suggestions highly actionable.
* **Meaningful Google Ecosystem Integration:** Leverages Gemini (advisory explanations), Google Maps (privacy-safe local routing/directions search), Google Fonts, and optional Firebase Functions support.
* **Practical Usability:** Offers immediate value with frictionless, no-login onboarding, data portability, and progress simulation.
* **Privacy-First Architecture:** Eliminates data tracking, databases, and login requirements. User data remains on the user's device.
* **Clean, Fully-Tested Codebase:** Over 390+ automated tests check calculations, integration flows, and accessibility across all major screen sizes.
