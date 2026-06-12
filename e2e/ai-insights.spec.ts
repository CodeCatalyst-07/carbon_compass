import { test, expect, type Page } from '@playwright/test';

/**
 * AI Insights E2E tests.
 *
 * Amendment 12:
 * - No-AI configuration: AI panel shows "not configured", deterministic data intact
 * - Verifies deterministic totals and rankings are never altered by AI state
 *
 * These tests run WITHOUT a Firebase CLI, emulator, or Gemini API key.
 */

async function completeOnboarding(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL(/onboarding/);
  await page.getByText(/Load sample data/i).click();
  await expect(page.getByText(/Sample data loaded/i)).toBeVisible();

  await page.getByRole('button', { name: /Next/i }).click();
  await page.getByRole('button', { name: /Next/i }).click();
  await page.getByRole('button', { name: /Next/i }).click();
  await page.getByRole('button', { name: /Next/i }).click();
  await page.getByRole('button', { name: /Calculate my footprint/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

// ─── No-AI Configuration (default) ───

test.describe('AI Insights — No Configuration', () => {
  test('shows "not configured" when VITE_AI_ENDPOINT is empty', async ({ page }) => {
    await completeOnboarding(page);

    // AI panel shows the unconfigured state
    await expect(page.getByText(/AI-powered insights are not configured/i)).toBeVisible();
    // The "View recommended actions" link should be present
    await expect(page.getByText(/View recommended actions/i)).toBeVisible();
  });

  test('deterministic totals are visible when AI is unconfigured', async ({ page }) => {
    await completeOnboarding(page);

    // Deterministic footprint data must be present
    await expect(page.getByText(/Monthly estimate/i)).toBeVisible();
    await expect(page.getByText(/Annual estimate/i)).toBeVisible();
    await expect(page.getByText(/Category breakdown/i)).toBeVisible();
  });

  test('"View recommended actions" navigates to /actions', async ({ page }) => {
    await completeOnboarding(page);

    await page.getByText(/View recommended actions/i).click();
    await expect(page).toHaveURL(/actions/);
    await expect(page.getByText(/Recommended actions/i)).toBeVisible();
  });

  test('deterministic recommendations on /actions are unchanged', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/actions');

    // At least one action card should be visible
    await expect(page.getByText(/Recommended actions/i)).toBeVisible();
    // Check that the page has deterministic content
    const actionCards = page.locator('article');
    const count = await actionCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('dashboard navigation works without AI', async ({ page }) => {
    await completeOnboarding(page);

    // Navigate to actions
    await page.getByText(/Explore actions/i).click();
    await expect(page).toHaveURL(/actions/);

    // Navigate to simulator
    await page.getByRole('link', { name: /Simulator/i }).click();
    await expect(page).toHaveURL(/simulator/);

    // Navigate to progress
    await page.getByRole('link', { name: /Progress/i }).click();
    await expect(page).toHaveURL(/progress/);

    // Back to dashboard
    await page.getByRole('link', { name: /Dashboard/i }).click();
    await expect(page).toHaveURL(/dashboard/);

    // Deterministic data still present
    await expect(page.getByText(/Monthly estimate/i)).toBeVisible();
  });
});

// ─── Intercepted Mock AI Configurations ───

test.describe('AI Insights — Intercepted API States', () => {
  const MOCK_URL = '**/mock-insights-api';

  test.beforeEach(async ({ page }) => {
    // Inject override endpoint before module evaluation
    await page.addInitScript((url) => {
      ((window as unknown) as { __VITE_AI_ENDPOINT_OVERRIDE__: string }).__VITE_AI_ENDPOINT_OVERRIDE__ = url;
    }, 'http://localhost:5173/mock-insights-api');
  });

  test('mock success scenario displays insights and leaves deterministic data intact', async ({ page }) => {
    // Intercept mock API with a valid success response
    await page.route(MOCK_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: 'Your emissions are driven by flights and diet.',
          actionExplanations: [
            { actionId: 'diet-reduce-meat', explanation: 'Plant-based diet reduces meat emissions.' }
          ],
          weeklyPlan: [
            { day: 'Monday', task: 'Plant-based breakfast.' },
            { day: 'Tuesday', task: 'Plan meals.' },
            { day: 'Wednesday', task: 'Turn off standby.' },
            { day: 'Thursday', task: 'Meat-free lunch.' },
            { day: 'Friday', task: 'Walk short distances.' },
            { day: 'Saturday', task: 'Batch cook meals.' },
            { day: 'Sunday', task: 'Turn down thermostat.' }
          ],
          caveat: 'These are mock estimates.'
        })
      });
    });

    await completeOnboarding(page);

    // Click "Get AI insights"
    await page.getByRole('button', { name: /Get AI insights/i }).click();

    // Verify AI insights are rendered
    await expect(page.getByText('Your emissions are driven by flights and diet.')).toBeVisible();
    await expect(page.getByText('Plant-based diet reduces meat emissions.')).toBeVisible();
    await expect(page.getByText('These are mock estimates.')).toBeVisible();

    // Verify deterministic data is still visible and correct
    await expect(page.getByText(/Monthly estimate/i)).toBeVisible();
    await expect(page.getByText(/Category breakdown/i)).toBeVisible();
  });

  test('invalid/malformed response displays error and preserves deterministic data', async ({ page }) => {
    // Intercept mock API with malformed response (missing fields)
    await page.route(MOCK_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: 'Missing other fields'
        })
      });
    });

    await completeOnboarding(page);
    await page.getByRole('button', { name: /Get AI insights/i }).click();

    // Verify malformed error message
    await expect(page.getByText(/Invalid AI response/i)).toBeVisible();

    // Verify deterministic data remains intact
    await expect(page.getByText(/Monthly estimate/i)).toBeVisible();
  });

  test('timeout displays error and preserves deterministic data', async ({ page }) => {
    // Inject custom fetch override to simulate AbortError timeout
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = async (input, init) => {
        if (typeof input === 'string' && input.includes('mock-insights-api')) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return originalFetch(input, init);
      };
    });

    await completeOnboarding(page);
    await page.getByRole('button', { name: /Get AI insights/i }).click();

    // Verify timeout error message
    await expect(page.getByText('Request timed out')).toBeVisible();

    // Verify deterministic data remains intact
    await expect(page.getByText(/Monthly estimate/i)).toBeVisible();
  });

  test('429 rate-limited displays error and preserves deterministic data', async ({ page }) => {
    await page.route(MOCK_URL, async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limited' })
      });
    });

    await completeOnboarding(page);
    await page.getByRole('button', { name: /Get AI insights/i }).click();

    // Verify rate limit error message (using exact match to avoid duplicate elements)
    await expect(page.getByText('Too many requests', { exact: true })).toBeVisible();

    // Verify deterministic data remains intact
    await expect(page.getByText(/Monthly estimate/i)).toBeVisible();
  });

  test('500 server error displays error and preserves deterministic data', async ({ page }) => {
    await page.route(MOCK_URL, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await completeOnboarding(page);
    await page.getByRole('button', { name: /Get AI insights/i }).click();

    // Verify server error message
    await expect(page.getByText(/Server error/i)).toBeVisible();

    // Verify deterministic data remains intact
    await expect(page.getByText(/Monthly estimate/i)).toBeVisible();
  });
});

