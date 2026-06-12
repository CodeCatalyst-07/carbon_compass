# Render Deployment — Carbon Compass AI Backend

> **Production AI backend: Render (Express)**
> Firebase Cloud Functions (`functions/`) are optional and kept as a local/legacy reference only.
> All production AI traffic routes through this Render service.

---

## Architecture Overview

```
Frontend (Vercel)          AI Backend (Render)
─────────────────          ──────────────────────────────────────
React/Vite SPA      POST   carbon-compass-server (Express)
VITE_AI_ENDPOINT ────────► GET  /health
                            POST /insights
                              │
                              ├── @carbon-compass/ai-core
                              │     schemas · prompt · gemini-client
                              │     cache   · rate-limiter · middleware
                              │
                              └── Gemini 2.5 Flash Lite
```

---

## Render Service Setup

| Setting | Value |
|---------|-------|
| **Service type** | Web Service |
| **Runtime** | Node |
| **Region** | Choose closest to your users |
| **Root Directory** | `.` (repo root — do **not** set to `server/`) |
| **Build Command** | `npm install --prefix packages/ai-core && npm run build --prefix packages/ai-core && npm install --prefix server && npm run build --prefix server` |
| **Start Command** | `node server/dist/index.js` |
| **Health Check Path** | `/health` |
| **Node Version** | `22` (set in Environment as `NODE_VERSION=22`) |

> **Why repo root?** The build command uses `--prefix` to install and build `packages/ai-core` first, then `server`. The `file:../packages/ai-core` dependency in `server/package.json` resolves correctly when both directories exist under the same root.

---

## Required Environment Variables

Set these in the Render dashboard under **Environment → Environment Variables**.  
**Never commit real values to version control.**

| Variable | Required | Example / Default | Notes |
|----------|----------|-------------------|-------|
| `GEMINI_API_KEY` | ✅ Yes | *(secret)* | Get at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Mark as **Secret** in Render. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash-lite` | Defaults to `gemini-2.5-flash-lite` if omitted. |
| `CORS_ORIGINS` | ✅ Yes | `https://your-app.vercel.app` | Comma-separated list of allowed frontend origins. **Must include your Vercel URL.** |
| `PORT` | No | *(injected by Render)* | Render sets this automatically. Do **not** override it. |
| `NODE_VERSION` | Recommended | `22` | Pin to Node 22 to match local development. |

### Setting CORS_ORIGINS after Vercel deployment

Once your Vercel app is deployed and you know its URL:

1. Open the Render dashboard → your service → **Environment**.
2. Set `CORS_ORIGINS` to your Vercel URL plus any other allowed origins:
   ```
   https://your-app.vercel.app,https://your-app-preview.vercel.app
   ```
3. Click **Save Changes** — Render will redeploy automatically.
4. In Vercel, set `VITE_AI_ENDPOINT` to:
   ```
   https://your-render-service.onrender.com/insights
   ```

---

## Vercel Environment Variable

Set this in your Vercel project settings under **Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_AI_ENDPOINT` | `https://your-render-service.onrender.com/insights` |

> `VITE_AI_ENDPOINT` is the **only** AI-related variable in Vercel. There is no `VITE_GEMINI_API_KEY` — this is intentional. The API key never touches the frontend bundle.

---

## Local Development (Render-style)

Run the backend locally to test the full AI flow before deploying:

```bash
# 1. Build packages/ai-core first (required before server can run)
npm run build:ai-core

# 2. Create server/.env from the example
cp server/.env.example server/.env
# Edit server/.env and set GEMINI_API_KEY to your real key

# 3. Start the server (TypeScript watch mode)
npm run dev:server
# Server listens on http://localhost:10000

# 4. In a separate terminal, start the frontend pointing at the local server
VITE_AI_ENDPOINT=http://localhost:10000/insights npm run dev
```

**Verify the server is healthy:**
```bash
curl http://localhost:10000/health
# {"status":"ok","service":"carbon-compass-ai","timestamp":"..."}
```

**Verify 400 on bad input:**
```bash
curl -s -X POST http://localhost:10000/insights \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{}' | jq .error
# "Invalid request."
```

---

## Free-Tier Cold Starts ⚠️

Render free-tier Web Services **spin down after 15 minutes of inactivity** and take **up to 50 seconds** to restart on the next request.

**Mitigations:**
- Upgrade to a paid Render instance ($7/month Starter) to disable spin-down.
- The frontend handles cold starts gracefully — the AI Insights panel shows a loading state and the app is fully functional without AI features.
- Consider a `cron` job to ping `/health` every 14 minutes to keep the instance warm (use a free service like UptimeRobot).

---

## Firebase Cloud Functions (Legacy / Optional)

`functions/src/index.ts` is kept as an optional reference. It imports the same shared logic from `@carbon-compass/ai-core` but uses Firebase-specific wiring (`defineSecret`, `onRequest`).

**Firebase is NOT the production AI backend for this project.** Use it only if you need:
- Ultra-low latency from Google's infrastructure
- Firebase-managed secrets via Cloud Secret Manager
- Integration with other Firebase services

To deploy Firebase Functions, build `packages/ai-core` first:
```bash
npm run build:ai-core
cd functions && npm install && npm run build
firebase deploy --only functions
```

---

## Health Check

Render uses the health check path to determine if the service is ready:

```
GET /health
→ 200 {"status":"ok","service":"carbon-compass-ai","timestamp":"..."}
```

- Does **not** require `GEMINI_API_KEY`.
- Does **not** expose environment variables.
- Render marks the deploy as successful only after `/health` returns 200.
