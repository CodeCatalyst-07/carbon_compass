# Contributing to Carbon Compass

Thank you for your interest in contributing. This guide covers the local development setup, coding standards, and expectations for pull requests.

---

## Prerequisites

- **Node.js 22** (see `.nvmrc` or `engines` fields in `package.json`)
- **npm** (ships with Node)
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/) (only needed for AI features)

---

## Local Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd carbon-compass
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Build the shared AI core package:**
   ```bash
   npm run build:ai-core
   ```

4. **Install and configure the backend (optional — only needed for AI features):**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Edit server/.env and add your GEMINI_API_KEY
   cd ..
   ```

5. **Start the backend:**
   ```bash
   npm run dev:server
   # Starts Express server at http://localhost:10000
   ```

6. **Start the frontend:**
   ```bash
   VITE_AI_ENDPOINT=http://localhost:10000/insights npm run dev
   # Starts Vite dev server at http://localhost:5173
   ```

The app works fully without the AI backend — leave `VITE_AI_ENDPOINT` empty to run without AI features.

---

## Required Commands Before PR

Run the full quality gate before opening a pull request:

```bash
npm run check:all
```

This executes format checking, type checking, linting, tests, and builds for all four packages (frontend, ai-core, server, functions). All checks must pass.

Individual package checks are also available:

| Command | Scope |
|---|---|
| `npm run check` | Frontend only |
| `npm run check:ai-core` | `packages/ai-core` only |
| `npm run check:server` | Server only (builds ai-core first) |
| `npm run check:functions` | Functions only (builds ai-core first) |

---

## Coding Standards

### TypeScript
- Strict mode is enabled across all packages.
- Use explicit return types for exported functions.
- Prefer `const` over `let`. Never use `var`.

### Formatting
- **Prettier** handles all formatting. Config is in `.prettierrc`.
- Single quotes, trailing commas, 100 character print width, 2-space indentation.
- Run `npm run format` to auto-fix formatting.

### Linting
- **ESLint** with `typescript-eslint` and `react-hooks` plugins (frontend).
- Each sub-package has its own `eslint.config.js`.

### React
- Functional components only.
- Custom hooks for shared state logic.
- No `dangerouslySetInnerHTML` for AI-generated content.

---

## Package Boundaries

The monorepo has strict dependency rules. **Do not introduce imports that violate these boundaries:**

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

See [QUALITY.md](QUALITY.md) for the rationale behind each boundary.

---

## No-Secrets Rule

**Never commit API keys, tokens, or credentials to the repository.**

- The Gemini API key belongs in `server/.env` (gitignored).
- Frontend environment variables (`VITE_*`) are bundled into the client bundle and are **public** — never put secrets in them.
- There is no `VITE_GEMINI_API_KEY` — this is intentional by design.
- An automated secret-scan test runs on every build (`postbuild` hook) to verify no API keys leak into the production bundle.

---

## Testing Expectations

### When to Write Tests
- **Domain logic changes** (calculator, recommendations, factors): Add or update unit tests in the corresponding `__tests__/` directory.
- **Storage changes** (schemas, adapters, migrations): Add integration tests with mock localStorage.
- **AI integration changes**: Add tests that mock HTTP responses and validate Zod schema parsing.
- **Backend changes**: Add supertest-based endpoint tests.

### Test Counts
Update the test count table in [QUALITY.md](QUALITY.md) whenever you add or remove tests.

### Running Tests
```bash
npm run test:all        # All unit/integration tests across all packages
npm test                # Frontend tests only
npx playwright test     # E2E tests (requires built frontend)
```

---

## Documentation Expectations

- **Architecture decisions**: Document significant design choices as new entries in [docs/ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md).
- **Quality updates**: If your change affects test counts, layer boundaries, or security controls, update [QUALITY.md](QUALITY.md).
- **Calculator methodology**: If emission factors or formulas change, update [docs/METHODOLOGY.md](docs/METHODOLOGY.md) and the Factor Registry.
- **README**: Update the README if your change affects the repository map, deployment architecture, or feature list.
