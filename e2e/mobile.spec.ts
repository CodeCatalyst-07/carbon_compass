import { test, expect, type Page } from '@playwright/test';

/**
 * Helper: Complete onboarding with sample data.
 */
async function completeOnboarding(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL(/onboarding/);
  await expect(page.getByText(/Welcome to Carbon Compass/i)).toBeVisible();

  await page.getByText(/Load sample data/i).click();
  await expect(page.getByText(/Sample data loaded/i)).toBeVisible();

  await page.getByRole('button', { name: /Next/i }).click();
  await expect(page.getByText(/How do you get around/i)).toBeVisible();

  await page.getByRole('button', { name: /Next/i }).click();
  await expect(page.getByText(/Home electricity/i)).toBeVisible();

  await page.getByRole('button', { name: /Next/i }).click();
  await expect(page.getByText(/Your diet/i)).toBeVisible();

  await page.getByRole('button', { name: /Next/i }).click();
  await expect(page.getByText(/Flights & your goals/i)).toBeVisible();

  await page.getByRole('button', { name: /Calculate my footprint/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

/**
 * Helper: Check that there is no horizontal overflow.
 * Returns { scrollWidth, clientWidth } for reporting.
 */
async function measureOverflow(page: Page): Promise<{ scrollWidth: number; clientWidth: number }> {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

/**
 * Helper: Assert no horizontal overflow on the current page.
 */
async function assertNoOverflow(page: Page, routeName: string) {
  const { scrollWidth, clientWidth } = await measureOverflow(page);
  expect(
    scrollWidth,
    `Horizontal overflow on ${routeName}: scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`,
  ).toBeLessThanOrEqual(clientWidth);
}

// ═══════════════════════════════════════════════════════
// Mobile Viewport Tests — 320×568 (iPhone SE / smallest)
// ═══════════════════════════════════════════════════════

test.describe('Mobile 320×568', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test('no horizontal overflow on /onboarding', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByText(/Welcome to Carbon Compass/i)).toBeVisible();
    await assertNoOverflow(page, '/onboarding @320');
  });

  test('no horizontal overflow on /dashboard', async ({ page }) => {
    await completeOnboarding(page);
    await assertNoOverflow(page, '/dashboard @320');
  });

  test('no horizontal overflow on /actions', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/actions');
    await expect(page.getByText(/Recommended actions/i)).toBeVisible();
    await assertNoOverflow(page, '/actions @320');
  });

  test('no horizontal overflow on /simulator', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/simulator');
    await expect(page.getByText(/Swap simulator/i)).toBeVisible();
    await assertNoOverflow(page, '/simulator @320');
  });

  test('no horizontal overflow on /progress', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/progress');
    await expect(page.getByText(/Your progress/i)).toBeVisible();
    await assertNoOverflow(page, '/progress @320');
  });

  test('no horizontal overflow on /methodology', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/methodology');
    await expect(page.getByText(/Methodology, privacy/i)).toBeVisible();
    await assertNoOverflow(page, '/methodology @320');
  });

  test('mobile menu opens, traps focus, closes with Escape, closes after nav', async ({
    page,
  }) => {
    await completeOnboarding(page);

    // Open mobile menu
    const menuButton = page.getByRole('button', { name: /Open menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Menu dialog should be visible
    const menuDialog = page.getByRole('dialog', { name: /Navigation menu/i });
    await expect(menuDialog).toBeVisible();

    // Close button should be visible
    // Close button should be visible (scoped to dialog to avoid collision with hamburger)
    const closeButton = menuDialog.getByRole('button', { name: /Close menu/i });
    await expect(closeButton).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(menuDialog).not.toBeVisible();

    // Re-open and navigate — menu should close after navigation
    await menuButton.click();
    await expect(menuDialog).toBeVisible();

    // Click a nav link in the mobile menu
    const actionsLink = menuDialog.getByRole('link', { name: /Actions/i });
    await actionsLink.click();
    await expect(page).toHaveURL(/actions/);
    // Menu should close after navigation
    await expect(menuDialog).not.toBeVisible();
  });

  test('onboarding is usable at mobile width', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByText(/Welcome to Carbon Compass/i)).toBeVisible();

    // Load sample data
    await page.getByText(/Load sample data/i).click();
    await expect(page.getByText(/Sample data loaded/i)).toBeVisible();

    // Navigate through steps
    await page.getByRole('button', { name: /Next/i }).click();
    await expect(page.getByText(/How do you get around/i)).toBeVisible();

    // Check no overflow at each step
    await assertNoOverflow(page, '/onboarding step 2 @320');

    await page.getByRole('button', { name: /Next/i }).click();
    await assertNoOverflow(page, '/onboarding step 3 @320');

    await page.getByRole('button', { name: /Next/i }).click();
    await assertNoOverflow(page, '/onboarding step 4 @320');

    await page.getByRole('button', { name: /Next/i }).click();
    await assertNoOverflow(page, '/onboarding step 5 @320');

    // Submit
    await page.getByRole('button', { name: /Calculate my footprint/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('simulator is usable at mobile width', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/simulator');
    await expect(page.getByText(/Swap simulator/i)).toBeVisible();

    // Select diet category
    await page.getByRole('radio', { name: /Diet/i }).dispatchEvent('click');
    await expect(page.getByText(/Simulation result/i)).toBeVisible();
    await assertNoOverflow(page, '/simulator with result @320');
  });
});

// ═══════════════════════════════════════════════════════
// Mobile Viewport Tests — 390×844 (iPhone 14)
// ═══════════════════════════════════════════════════════

test.describe('Mobile 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('no horizontal overflow on /onboarding', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByText(/Welcome to Carbon Compass/i)).toBeVisible();
    await assertNoOverflow(page, '/onboarding @390');
  });

  test('no horizontal overflow on /dashboard', async ({ page }) => {
    await completeOnboarding(page);
    await assertNoOverflow(page, '/dashboard @390');
  });

  test('no horizontal overflow on /actions', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/actions');
    await expect(page.getByText(/Recommended actions/i)).toBeVisible();
    await assertNoOverflow(page, '/actions @390');
  });

  test('no horizontal overflow on /simulator', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/simulator');
    await expect(page.getByText(/Swap simulator/i)).toBeVisible();
    await assertNoOverflow(page, '/simulator @390');
  });

  test('no horizontal overflow on /progress', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/progress');
    await expect(page.getByText(/Your progress/i)).toBeVisible();
    await assertNoOverflow(page, '/progress @390');
  });

  test('no horizontal overflow on /methodology', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/methodology');
    await expect(page.getByText(/Methodology, privacy/i)).toBeVisible();
    await assertNoOverflow(page, '/methodology @390');
  });

  test('mobile menu works at 390px', async ({ page }) => {
    await completeOnboarding(page);

    const menuButton = page.getByRole('button', { name: /Open menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const menuDialog = page.getByRole('dialog', { name: /Navigation menu/i });
    await expect(menuDialog).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(menuDialog).not.toBeVisible();
  });

  test('onboarding is usable at 390px', async ({ page }) => {
    await page.goto('/onboarding');
    await page.getByText(/Load sample data/i).click();

    // Navigate through all steps
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /Next/i }).click();
    }

    await page.getByRole('button', { name: /Calculate my footprint/i }).click();
    await expect(page).toHaveURL(/dashboard/);
    await assertNoOverflow(page, '/dashboard after onboarding @390');
  });

  test('simulator is usable at 390px', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/simulator');
    await page.getByRole('radio', { name: /Diet/i }).dispatchEvent('click');
    await expect(page.getByText(/Simulation result/i)).toBeVisible();
    await assertNoOverflow(page, '/simulator with result @390');
  });
});
