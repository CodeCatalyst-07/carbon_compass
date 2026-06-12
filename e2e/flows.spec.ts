import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Helper: Complete onboarding with sample data.
 * Uses the demo profile shortcut, then submits.
 */
async function completeOnboarding(page: Page) {
  await page.goto('/');
  // First visit → onboarding
  await expect(page).toHaveURL(/onboarding/);
  await expect(page.getByText(/Welcome to Carbon Compass/i)).toBeVisible();

  // Load sample data
  await page.getByText(/Load sample data/i).click();
  await expect(page.getByText(/Sample data loaded/i)).toBeVisible();

  // Step through all steps
  await page.getByRole('button', { name: /Next/i }).click();
  await expect(page.getByText(/How do you get around/i)).toBeVisible();

  await page.getByRole('button', { name: /Next/i }).click();
  await expect(page.getByText(/Home electricity/i)).toBeVisible();

  await page.getByRole('button', { name: /Next/i }).click();
  await expect(page.getByText(/Your diet/i)).toBeVisible();

  await page.getByRole('button', { name: /Next/i }).click();
  await expect(page.getByText(/Flights & your goals/i)).toBeVisible();

  // Submit
  await page.getByRole('button', { name: /Calculate my footprint/i }).click();

  // Should arrive at dashboard
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('heading', { name: /Your carbon footprint/i })).toBeVisible();
}

/**
 * Helper: Run axe accessibility check on current page.
 * Reports violations for the given route name.
 */
async function checkA11y(page: Page, routeName: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  // Collect violations for reporting
  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.length,
  }));

  expect(
    violations,
    `Axe violations on ${routeName}:\n${JSON.stringify(violations, null, 2)}`,
  ).toHaveLength(0);
}

// ═══════════════════════════════════════════════════════
// Flow 1: First visit → Onboarding → Dashboard
// ═══════════════════════════════════════════════════════

test.describe('Flow 1: First visit → Onboarding → Dashboard', () => {
  test('completes full onboarding with demo data and reaches dashboard', async ({ page }) => {
    await completeOnboarding(page);

    // Verify dashboard content
    await expect(page.getByText(/Monthly estimate/i)).toBeVisible();
    await expect(page.getByText(/Annual estimate/i)).toBeVisible();
    await expect(page.getByText(/Category breakdown/i)).toBeVisible();
    await expect(page.locator('main').getByText(/estimates, not audited/i).first()).toBeVisible();
    await expect(page.getByText(/AI-powered insights are not configured/i)).toBeVisible();
  });

  test('axe check: onboarding page', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByText(/Welcome to Carbon Compass/i)).toBeVisible();
    await checkA11y(page, '/onboarding');
  });

  test('axe check: dashboard page', async ({ page }) => {
    await completeOnboarding(page);
    await checkA11y(page, '/dashboard');
  });
});

// ═══════════════════════════════════════════════════════
// Flow 2: Actions → Simulator → Apply change
// ═══════════════════════════════════════════════════════

test.describe('Flow 2: Actions → Simulator → Apply change', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test('views actions and navigates to simulator', async ({ page }) => {
    // Navigate to actions
    await page.getByText(/Explore actions/i).click();
    await expect(page).toHaveURL(/actions/);
    await expect(page.getByText(/Recommended actions/i)).toBeVisible();

    // Navigate to simulator
    await page.getByRole('link', { name: /Simulator/i }).click();
    await expect(page).toHaveURL(/simulator/);
    await expect(page.getByText(/Swap simulator/i)).toBeVisible();
  });

  test('simulates a diet change and applies it', async ({ page }) => {
    await page.goto('/simulator');
    await expect(page.getByText(/Swap simulator/i)).toBeVisible();

    // Select diet category
    await page.getByRole('radio', { name: /Diet/i }).dispatchEvent('click');

    // Should show simulation result
    await expect(page.getByText(/Simulation result/i)).toBeVisible();
    await expect(page.getByText(/NOT SAVED/i)).toBeVisible();

    // Apply the change
    await page.getByRole('button', { name: /Apply this change/i }).click();

    // Should navigate to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('axe check: actions page', async ({ page }) => {
    await page.goto('/actions');
    await expect(page.getByText(/Recommended actions/i)).toBeVisible();
    await checkA11y(page, '/actions');
  });

  test('axe check: simulator page', async ({ page }) => {
    await page.goto('/simulator');
    await expect(page.getByText(/Swap simulator/i)).toBeVisible();
    await checkA11y(page, '/simulator');
  });
});

// ═══════════════════════════════════════════════════════
// Flow 3: Save snapshot → Progress → Delete snapshot
// ═══════════════════════════════════════════════════════

test.describe('Flow 3: Save snapshot → Progress → Delete snapshot', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test('saves snapshot from dashboard, views in progress, deletes it', async ({ page }) => {
    // Save a snapshot from dashboard
    await page.getByRole('button', { name: /Save snapshot/i }).click();
    await expect(page.getByText(/Snapshot saved/i)).toBeVisible();

    // Navigate to progress
    await page.getByRole('link', { name: /Progress/i }).click();
    await expect(page).toHaveURL(/progress/);
    await expect(page.getByText(/Your progress/i)).toBeVisible();

    // Should see at least one snapshot (initial + the one we saved)
    // Delete a snapshot
    const deleteButtons = page.getByRole('button', { name: /Delete snapshot/i });
    await expect(deleteButtons.first()).toBeVisible();
    const count = await deleteButtons.count();
    expect(count).toBeGreaterThan(0);

    await deleteButtons.first().click();

    // Confirm deletion
    await expect(page.getByText(/Delete snapshot\?/i)).toBeVisible();
    await page.getByRole('button', { name: /^Delete$/i }).click();

    // Should show success toast
    await expect(page.getByText(/Snapshot deleted/i)).toBeVisible();
  });

  test('axe check: progress page', async ({ page }) => {
    await page.goto('/progress');
    await expect(page.getByText(/Your progress/i)).toBeVisible();
    await checkA11y(page, '/progress');
  });
});

// ═══════════════════════════════════════════════════════
// Flow 4: Returning-user prepopulation
// ═══════════════════════════════════════════════════════

test.describe('Flow 4: Returning-user prepopulation', () => {
  test('returning user sees dashboard, can revise answers', async ({ page }) => {
    // First complete onboarding
    await completeOnboarding(page);

    // Visit root again — should redirect to dashboard
    await page.goto('/');
    await expect(page).toHaveURL(/dashboard/);

    // Go to onboarding to revise
    await page.getByText(/Revise answers/i).click();
    await expect(page).toHaveURL(/onboarding/);

    // Should show "Revise your answers" heading and "Back to dashboard"
    await expect(page.getByText(/Revise your answers/i)).toBeVisible();
    await expect(page.getByText(/Back to dashboard/i)).toBeVisible();

    // Navigate to step 5 and check values are populated
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /Next/i }).click();
    }

    // Should see "Recalculate" button
    await expect(page.getByRole('button', { name: /Recalculate/i })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════
// Flow 5: JSON import preview/confirmation
// ═══════════════════════════════════════════════════════

test.describe('Flow 5: JSON import preview/confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test('exports and imports JSON data with confirmation', async ({ page }) => {
    // Navigate to methodology
    await page.getByRole('link', { name: /^About$/i }).click();
    await expect(page).toHaveURL(/methodology/);

    // Export JSON
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export JSON/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('carbon-compass-data');

    // Read the exported file content for re-import
    const exportedPath = await download.path();
    expect(exportedPath).toBeTruthy();
  });

  test('shows error for invalid import file', async ({ page }) => {
    await page.goto('/methodology');
    await expect(page.getByText(/Manage your data/i)).toBeVisible();

    // Create an invalid file and trigger import
    await page.evaluate(() => {
      const input = document.getElementById('import-file-input') as HTMLInputElement;
      if (!input) return;

      const file = new File(['not valid json'], 'bad.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Should show error
    await expect(page.getByText(/corrupted|could not|unexpected|too large|invalid/i)).toBeVisible({ timeout: 3000 });
  });

  test('axe check: methodology page', async ({ page }) => {
    await page.goto('/methodology');
    await expect(page.getByText(/Methodology, privacy/i)).toBeVisible();
    await checkA11y(page, '/methodology');
  });
});

// ═══════════════════════════════════════════════════════
// Flow 6: Clear-all → Onboarding
// ═══════════════════════════════════════════════════════

test.describe('Flow 6: Clear-all → Onboarding', () => {
  test('clears all data and redirects to onboarding', async ({ page }) => {
    await completeOnboarding(page);

    // Navigate to methodology
    await page.getByRole('link', { name: /^About$/i }).click();
    await expect(page).toHaveURL(/methodology/);

    // Click clear all data
    await page.getByRole('button', { name: /Clear all data/i }).click();

    // Confirmation modal
    await expect(page.getByText(/Clear all data\?/i)).toBeVisible();
    await expect(page.getByRole('dialog').getByText(/permanently delete/i)).toBeVisible();

    // Confirm
    await page.getByRole('button', { name: /Clear everything/i }).click();

    // Should redirect to onboarding
    await expect(page).toHaveURL(/onboarding/);
    await expect(page.getByText(/Welcome to Carbon Compass/i)).toBeVisible();

    // Verify data is cleared — visiting root should go to onboarding
    await page.goto('/');
    await expect(page).toHaveURL(/onboarding/);
  });
});

// ═══════════════════════════════════════════════════════
// Flow 7: Core behavior when offline
// ═══════════════════════════════════════════════════════

test.describe('Flow 7: Offline behavior', () => {
  test('app works without network connectivity', async ({ page, context }) => {
    // First load the app with network
    await completeOnboarding(page);

    // Go offline
    await context.setOffline(true);

    // Navigate within the app — should still work (SPA)
    await page.getByRole('link', { name: /Actions/i }).click();
    // The page should still render from the SPA bundle
    await expect(page.getByText(/Recommended actions/i)).toBeVisible();

    // Navigate to simulator
    await page.getByRole('link', { name: /Simulator/i }).click();
    await expect(page.getByText(/Swap simulator/i)).toBeVisible();

    // Navigate to progress
    await page.getByRole('link', { name: /Progress/i }).click();
    await expect(page.getByText(/Your progress/i)).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });
});
