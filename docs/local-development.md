# Local Development Guide

## Running Without AI (Default)

The frontend works fully without any AI configuration, Firebase CLI, or Gemini API key.

```bash
npm install
npm run dev
```

All deterministic calculations, recommendations, and features work. The AI panel shows "AI insights not configured" — this is expected.

## Running With AI (Emulator)

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Configure Secrets for Emulator

Copy the secret template and add your API key:

```bash
cp functions/.secret.local.example functions/.secret.local
```

Edit `functions/.secret.local`:

```
GEMINI_API_KEY=your-actual-gemini-api-key
```

> **Note**: Use `functions/.secret.local` (not `functions/.env`) for emulator secret overrides (amendment 4). This file is gitignored.

### 3. Optionally Set Non-Secret Config

Create `functions/.env` for non-secret configuration:

```
GEMINI_MODEL=gemini-2.5-flash-lite
CORS_ORIGINS=http://localhost:5173,http://localhost:5000
```

### 4. Build and Start Functions

```bash
cd functions
npm install
npm run build
cd ..
```

### 5. Start Emulator

```bash
firebase emulators:start
```

This starts:
- Functions emulator on `http://localhost:5001`
- Hosting emulator on `http://localhost:5000`
- Emulator UI at `http://localhost:4000`

### 6. Configure Frontend

Copy the env template:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_AI_ENDPOINT=http://localhost:5001/your-project-id/us-central1/insights
```

> `VITE_AI_ENDPOINT` is public build configuration, not a secret (amendment 13).

### 7. Start Frontend

In a separate terminal:

```bash
npm run dev
```

## Running With Mock AI (Testing Without API Key)

The codebase includes a mock AI transport (`src/ai/adapter.ts → createMockTransport`) for testing all AI states without a real API key or network:

- **configured-success**: Returns a valid mock response
- **invalid-response**: Returns malformed data
- **timeout**: Simulates a timeout error
- **429**: Simulates rate limiting
- **500**: Simulates server errors

These are used automatically by the test suite. For manual testing, you can import and use the mock transport in your development code.

## Running Tests

### Frontend Tests (No Firebase/Gemini Required)

```bash
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run format:check # Prettier
npm run test         # Vitest unit tests
```

### Functions Tests (No Firebase/Gemini Required)

```bash
cd functions
npm run typecheck
npm run lint
npm test
```

### E2E Tests

```bash
npx playwright test
```

### Production Build + Secret Scan

```bash
npm run build
grep -r "GEMINI_API_KEY" dist/ && echo "FAIL" || echo "PASS: No secrets in build"
```
