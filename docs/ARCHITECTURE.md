# Architecture

Carbon Compass is a privacy-first, no-login carbon footprint tracking and coaching SPA.

## High-Level Design

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (Client SPA)                     │
│                                                              │
│  ┌──────────┐   ┌───────────┐   ┌─────────┐   ┌──────────┐ │
│  │  Domain   │   │  Storage   │   │   AI     │   │    UI    │ │
│  │  (pure)   │◄──│  (adapter) │   │ (client) │   │  (React) │ │
│  └──────────┘   └───────────┘   └─────────┘   └──────────┘ │
│       ▲               ▲              │              ▲        │
│       │               │              ▼              │        │
│       │               │    ┌──────────────┐         │        │
│       └───────────────┴────│ localStorage │─────────┘        │
│                            └──────────────┘                  │
└──────────────────────────────────────────────────────────────┘
                               │ (opt-in, POST /insights)
                               ▼
                   ┌─────────────────────┐
                   │  Firebase Cloud Fn   │
                   │  (Gemini 2.5 Flash)  │
                   └─────────────────────┘
```

## Directory Structure

```
src/
├── domain/                  # Pure business logic (no React imports)
│   ├── calculator/          # Per-category calculators + aggregator
│   │   ├── calculator.ts    # Aggregate: UserProfile → FootprintResult
│   │   ├── transport.ts     # Weekly distance × factor × 52
│   │   ├── electricity.ts   # Personal monthly kWh × factor × 12
│   │   ├── diet.ts          # Daily factor × 365
│   │   ├── flights.ts       # Legs × average distance × factor
│   │   └── top-drivers.ts   # Sort categories by %, take top 2
│   ├── factors/
│   │   └── registry.ts      # Centralized emission factor registry (v0.2.0)
│   ├── recommendations/
│   │   ├── actions.ts        # Action definitions with applicability guards
│   │   ├── ranker.ts         # Weighted composite scoring + ranking
│   │   ├── build-context.ts  # ApplicabilityContext factory (shared)
│   │   ├── swap-simulator.ts # "What if" transport mode swap
│   │   ├── maps-urls.ts      # Google Maps URL builders
│   │   └── types.ts          # Shared types and ranking weights
│   └── units.ts              # Conversion, formatting, validation
│
├── storage/                 # Persistence layer
│   ├── schemas.ts           # Zod schemas (versioned, v1)
│   ├── adapter.ts           # CRUD operations on localStorage
│   ├── migrations.ts        # Schema version migrations
│   ├── json-import.ts       # Import validation + preview
│   └── csv-export.ts        # Snapshot history CSV export
│
├── ai/                      # AI integration (optional)
│   ├── config.ts            # Endpoint configuration (VITE_AI_ENDPOINT)
│   ├── adapter.ts           # HTTP transport + Zod response validation
│   ├── cache.ts             # Client-side AI response cache (7-day TTL)
│   ├── use-ai-insights.ts   # React hook for AI state management
│   └── types.ts             # AI request/response schemas
│
├── ui/                      # React components and pages
│   ├── components/          # Reusable UI primitives (Button, Card, Modal, etc.)
│   ├── hooks/               # Custom hooks (useLocalStore, useToast, useReducedMotion)
│   ├── layouts/             # AppShell (header, nav, footer)
│   └── pages/               # Route pages (Dashboard, Actions, Simulator, etc.)
│
├── lib/                     # Shared utilities
│   ├── cn.ts                # Tailwind class merging (clsx + tailwind-merge)
│   ├── hash.ts              # Stable hash for AI cache keys
│   └── demo-profile.ts      # Sample data for onboarding shortcut
│
├── app.tsx                  # React Router routes + lazy loading
├── main.tsx                 # App entry point + providers
└── index.css                # Tailwind v4 @theme tokens + base styles

functions/                   # Firebase Cloud Function (server-side)
└── src/
    ├── index.ts             # HTTP handler: POST /insights
    ├── middleware.ts         # CORS, method, content-type, body size checks
    ├── rate-limiter.ts       # In-memory per-IP rate limiter
    ├── gemini-client.ts      # Gemini API wrapper + repair logic
    ├── prompt.ts             # System instruction + user message builder
    ├── cache.ts              # Server-side response cache
    └── schemas.ts            # Request/response Zod schemas + JSON Schema
```

## Dependency Rules

| Layer | May import from | Must NOT import from |
|-------|-----------------|----------------------|
| `domain/` | `storage/schemas` (types only) | `react`, `ui/`, `ai/` |
| `storage/` | `zod` | `react`, `ui/`, `ai/`, `domain/` |
| `ai/` | `storage/schemas`, `domain/factors`, `lib/` | `ui/` |
| `ui/` | All layers | — |
| `lib/` | Nothing project-internal | `react`, `ui/`, `domain/` |
| `functions/` | Its own `schemas.ts`, `@google/genai` | Any client code |

## Data Flow

### Calculation Pipeline

```
UserProfile
  ├── transport.modes[] ──→ calculateTransport() ──→ CategoryBreakdown
  ├── electricity ────────→ calculateElectricity() ─→ CategoryBreakdown
  ├── diet ───────────────→ calculateDiet() ────────→ CategoryBreakdown
  └── flights ────────────→ calculateFlights() ─────→ CategoryBreakdown
                                                           │
                                                     calculateFootprint()
                                                           │
                                                     FootprintResult
                                                     (total, breakdown,
                                                      topDrivers, version)
```

### Recommendation Pipeline

```
UserProfile + FootprintResult + TrackedActions
  │
  └──→ buildApplicabilityContext()
         │
         └──→ rankActions(context)
                ├── Filter: isApplicable(context) + not completed/dismissed
                ├── Score: impact × 0.35 + contextMatch × 0.20 + driver × 0.25 + effort × 0.10 + cost × 0.10
                └── Sort: composite score → ties by effort → ties by cost
                     │
                     └──→ RankedAction[] (with explainableReason)
```

### AI Integration (Optional)

```
Dashboard ("Get AI insights" button press)
  │
  └──→ useAIInsights hook
         ├── Check client cache (7-day TTL)
         ├── If miss: POST {totals, categoryShares, topDrivers, rankedActions, constraints}
         │            to VITE_AI_ENDPOINT
         │            └──→ Cloud Function
         │                   ├── Middleware (CORS, method, size)
         │                   ├── Rate limit (5/15min/IP, per-instance)
         │                   ├── Zod validate request body
         │                   ├── Check server cache
         │                   ├── Gemini 2.5 Flash Lite (structured JSON, 12s timeout)
         │                   ├── Zod validate + integrity check response
         │                   └──→ {summary, actionExplanations[], weeklyPlan[], caveat}
         └── Display in AI Insights Panel (text only, never HTML)
```

## Storage Design

- **Key:** `carbon-compass-data` in `localStorage`
- **Schema:** Versioned (currently v1) with Zod validation
- **Snapshots:** Capped at 52 (one per week for a year)
- **AI cache:** Entries expire after 7 days
- **Recovery:** Corrupt data is detected and reset with user notification
- **Reactivity:** `useSyncExternalStore` with a cached snapshot reference for tear-free reads

## Design System

See [DESIGN.md](../DESIGN.md) for the full design language specification. Key tokens:

- **Palette:** Sage greens, warm neutrals, deep ink
- **Typography:** Inter (400, 600, 900)
- **Radii:** `rounded-xl` (cards), `rounded-pill` (badges, buttons)
- **Spacing:** 4px base (`--spacing-xxs` through `--spacing-3xl`)
- **Components:** Card, Button, Badge, Modal, Toast, SegmentedControl, NumberInput, Toggle, Tooltip, ProgressBar, BarChart, SkipLink
