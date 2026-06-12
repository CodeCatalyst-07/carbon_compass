# Demo Script

Step-by-step walkthrough for demonstrating Carbon Compass. Estimated time: 5–8 minutes.

## Prerequisites

- App running at `http://localhost:5173` (via `npm run dev`)
- Browser with localStorage cleared (or use an incognito window)
- Optional: AI Cloud Function running via emulator (see [local development guide](local-development.md))

---

## 1. Cold Start & Onboarding (1 min)

1. Open the app. You arrive at the **onboarding questionnaire** with a progress bar at the top.
2. **Welcome step:** Note the display unit selector (kg vs. tonnes).
3. Click **"Load sample data"** — the sample profile fills in realistic UK commuter values.
4. Point out the label: *"Sample data — a UK commuter with typical habits."*
5. Walk through each step:
   - **Transport:** Car (50 km/week) and Train (20 km/week) are enabled.
   - **Electricity:** 300 kWh/month household, divided by 2 people.
   - **Diet:** Regular meat eater selected, with the low-confidence caveat visible.
   - **Flights & Goals:** 4 short + 2 medium + 1 long-haul legs. Effort: Medium. Budget: Medium. 20% reduction goal.
6. Click **"Calculate my footprint"** — the app saves the profile and first snapshot, then navigates to the dashboard.

## 2. Dashboard Overview (1 min)

1. **Monthly + Annual totals** displayed in sage and green cards.
2. **Category breakdown chart** — a horizontal bar chart showing Transport, Electricity, Diet, and Flights with percentage labels.
3. **Top drivers** — two cards showing the #1 and #2 emission categories with explanations.
4. **Confidence caveat** — the permanent disclaimer: *"These are estimates, not audited measurements."*
5. Point out the **"Learn about our methodology"** link → navigates to the methodology page.

## 3. AI Insights Panel (1 min)

> Skip this section if AI is not configured. The panel will show "AI-powered insights are not configured" with a link to recommended actions.

1. The **idle state** shows a data disclosure: what data will be sent (category totals, rankings, preferences — no personal info).
2. Click **"Get AI insights"** — observe the loading skeleton.
3. On success:
   - A personalized summary of the footprint profile.
   - Per-action explanations of why each recommendation matters.
   - A 7-day starter plan (Monday through Sunday) with concrete daily tasks.
   - A caveat that all values are estimates.
   - A "Cached" badge appears on repeat requests.
4. Point out: **"Use local guidance instead"** navigates to the actions page — AI is always optional.

## 4. Recommended Actions (1 min)

1. Navigate to **Actions** page from the nav bar.
2. Actions are **ranked by a deterministic algorithm** (not AI). Each card shows:
   - Impact badge (High / Medium / Low)
   - Effort, cost, and time-horizon badges
   - An **explainable reason** ("Recommended because transport is your top emission driver")
   - **Estimated savings** with a methodology tooltip
   - **Google Maps link** ("Find nearby on Google Maps") — opens in a new tab
3. **Track actions:**
   - Click **"Plan this"** on one action — it appears in the "Your planned actions" section.
   - Click **"Mark complete"** on another — it moves to "Completed."
   - Click **"Dismiss"** on a third — it disappears from the list.
4. Return to dashboard to confirm the deterministic rankings are unchanged.

## 5. Swap Simulator (1 min)

1. Navigate to **Simulator** page.
2. Note the **SIMULATION** badge — this does not save data automatically.
3. **Transport swap:** Switch Car → Bus at 50 km/week.
   - See the savings result: current vs. alternative with annual CO₂e savings and percentage of total.
4. **Diet swap:** Switch to Vegetarian or Vegan — instant recalculation.
5. **Electricity:** Reduce from 300 to 270 kWh/month — small but meaningful savings.
6. **Flights:** Remove 2 short-haul legs — show the high impact of flight reduction.
7. Click **"Apply this change to my profile"** — profile is updated, navigate to dashboard. Note the caveat: *"Existing snapshots are not modified."*

## 6. Progress Tracking (1 min)

1. Navigate to **Progress** page.
2. The first snapshot from onboarding is visible.
3. Click **"Save a new snapshot"** — a second snapshot appears with the post-simulation values.
4. If two or more snapshots exist:
   - A **trend card** shows the change (e.g., "Down 150 kg (3.2%)").
   - The visual timeline shows relative bars.
   - An accessible summary table is available for screen readers (sr-only).
5. Click the delete icon on a snapshot → a confirmation modal appears.
6. Cancel to preserve the snapshot.

## 7. Methodology & Data Management (1 min)

1. Navigate to **About** (Methodology) page.
2. **Factor table:** All 12 emission factors with values, confidence badges, scope, and source links.
3. **How we calculate:** Plain-language explanations for each category.
4. **What's not included:** Transparent about exclusions (housing, goods, services, etc.).
5. **Privacy:**
   - "Your data stays on your device" with a shield icon.
   - All data is in localStorage — no accounts, no tracking.
   - AI data flow is opt-in and sends only aggregated totals.
6. **Data management:**
   - **Export JSON:** Downloads all data as a JSON file.
   - **Export CSV:** Downloads snapshot history for Google Sheets.
   - **Import:** Choose a JSON file → preview summary → confirm (AI cache is stripped).
   - **Clear all data:** Destructive action with a confirmation modal → resets to onboarding.

## 8. Accessibility & Responsiveness (30 sec)

1. **Skip link:** Press Tab at the top of any page — "Skip to main content" appears.
2. **Keyboard navigation:** Tab through the form fields and buttons — focus rings are visible.
3. **Mobile view:** Resize the browser to 375px — the hamburger menu appears with a slide-out panel, focus-trapped.
4. **Reduced motion:** Enable "Reduce motion" in OS settings — animations are suppressed.

---

## Key Talking Points

- **Privacy first:** All data stays on-device. No accounts. Export and delete anytime.
- **Deterministic core:** Same inputs always produce the same outputs. No AI in any calculation.
- **AI is optional:** The app works fully without AI. AI only explains — it never changes numbers or rankings.
- **Transparent methodology:** Every factor has a source, confidence level, and caveat. The app permanently says "these are estimates."
- **Google services:** Google Fonts (Inter), Google Maps links (search + directions), Gemini 2.5 Flash Lite (optional).
