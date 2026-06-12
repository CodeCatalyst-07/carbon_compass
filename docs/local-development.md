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

### 2. Configure the Backend-Only Gemini Key

> [!CAUTION]
> **The Gemini API key must NEVER appear in frontend env variables.**
> Do NOT create `VITE_GEMINI_API_KEY` or any `VITE_` secret variable.
> The key belongs exclusively in backend files inside `functions/`.

You have two equivalent options for providing the key to the emulator:

**Option A — `.secret.local`** (emulator-native secrets):

```bash
cp functions/.secret.local.example functions/.secret.local
```

Edit `functions/.secret.local`:

```
GEMINI_API_KEY=your-actual-gemini-api-key
```

**Option B — `.env.local`** (emulator environment variables):

```bash
cp functions/.env.local.example functions/.env.local
```

Edit `functions/.env.local`:

```
GEMINI_API_KEY=your-actual-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash-lite
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

> **Note**: Both `functions/.secret.local` and `functions/.env.local` are gitignored.
> Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey).

### 3. Optionally Set Non-Secret Config

If you used Option A above, you can create `functions/.env` for non-secret configuration:

```
GEMINI_MODEL=gemini-2.5-flash-lite
CORS_ORIGINS=http://localhost:5173,http://localhost:5000
```

If you used Option B, these are already included in your `.env.local`.

### 4. Build and Start Functions

```bash
cd functions
npm install
npm run build
cd ..
```

### 5. Start Emulator

```bash
firebase emulators:start --only functions
```

This starts:
- Functions emulator on `http://localhost:5001`
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
> Replace `your-project-id` with the value from `.firebaserc`.

### 7. Start Frontend

In a separate terminal:

```bash
npm run dev
```

### 8. Expected Behavior

| Frontend `.env` state | What you see |
|---|---|
| `VITE_AI_ENDPOINT=` (empty) | App works normally. "Get AI Insights" button is hidden. |
| `VITE_AI_ENDPOINT=http://localhost:5001/...` | "Get AI Insights" button appears on the dashboard. |
| Emulator running + key configured | Clicking the button returns live AI insights. |
| Emulator running + key **not** configured | Clicking the button shows "AI service is not configured" (503). |

### Convenience Scripts

You can run the frontend and emulator in two terminals:

```bash
# Terminal 1 — Functions emulator
cd functions && npm run build && cd .. && firebase emulators:start --only functions

# Terminal 2 — Frontend dev server
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

## Security Checklist

Before committing, verify:

1. **No real API keys committed**: `grep -r "AIza" . --include="*.ts" --include="*.env*"`
2. **No VITE_GEMINI_API_KEY anywhere**: `grep -r "VITE_GEMINI_API_KEY" .`
3. **No secrets in dist/**: `grep -r "GEMINI_API_KEY" dist/`
4. **Frontend only uses VITE_AI_ENDPOINT**: `grep -r "VITE_" src/ | grep -v "VITE_AI_ENDPOINT"`
5. **Example files have no real keys**: Check `functions/.secret.local.example` and `functions/.env.local.example`
