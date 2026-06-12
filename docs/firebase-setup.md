# Firebase Setup Guide

> **Do not deploy, enable billing, create a Firebase project, or set production secrets without explicit user approval.** This guide documents the steps needed; you must execute them yourself.

## Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- A Google Cloud / Firebase account

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Follow the project creation wizard

## 2. Upgrade to Blaze Plan

> [!WARNING]
> Cloud Functions **require the Blaze (pay-as-you-go) plan**. The free Spark plan does not support Functions.
>
> The Blaze plan includes generous free tiers:
> - Functions: 2M invocations/month free
> - Hosting: 10 GB storage, 360 MB/day transfer free
>
> The implementation sets conservative resource limits (`maxInstances: 5`, `memory: 256MiB`) to reduce cost risk, but **cannot guarantee zero cost**. Monitor your billing dashboard.

1. In the Firebase Console, go to the project's billing page
2. Select "Upgrade" and choose the Blaze plan
3. Add a billing account

## 3. Configure the Project

Update `.firebaserc` with your project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

## 4. Set Production Secrets

```bash
firebase login
firebase functions:secrets:set GEMINI_API_KEY
```

You will be prompted to enter your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

## 5. Set Non-Secret Configuration (Optional)

These environment variables are non-secret and can be configured for production by creating a `functions/.env` file in the `functions/` directory (this file is ignored by git and deployed alongside the function code):

```env
GEMINI_MODEL=gemini-2.5-flash-lite
CORS_ORIGINS=https://your-project-id.web.app
```

| Variable | Default | Description |
|---|---|---|
| `GEMINI_MODEL` | `gemini-2.5-flash-lite` | Gemini model to use |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated allowed origins |

Alternatively, you can configure these environment variables in the Google Cloud / Firebase Console for the deployed Cloud Function.

## 6. Deploy Functions

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

Note the deployed function URL (e.g., `https://us-central1-your-project-id.cloudfunctions.net/insights`).

## 7. Deploy Hosting

First, build the frontend with the AI endpoint configured:

```bash
# Set the endpoint in .env
echo "VITE_AI_ENDPOINT=https://us-central1-your-project-id.cloudfunctions.net/insights" > .env

# Build
npm run build

# Deploy
firebase deploy --only hosting
```

## 8. Verify

1. Visit your deployed site
2. Complete the questionnaire
3. On the dashboard, click "Get AI Insights"
4. Verify the AI panel shows a summary, action explanations, and 7-day plan
5. Verify deterministic recommendations are unchanged

## Selected Defaults (Amendment 13)

| Setting | Value | Rationale |
|---|---|---|
| Region | `us-central1` | Lowest latency to Google AI endpoints |
| Rate limit | 5 requests / 15 minutes per IP | Conservative for a demo; per-instance only |
| Client cache TTL | 7 days | Reduces redundant API calls for unchanged profiles |
| Function timeout | 30 seconds | Gemini internal timeout is 12s (shorter) |
| Max instances | 5 | Limits concurrent cold starts and cost |
| Memory | 256 MiB | Sufficient for in-memory rate limiter and cache |
