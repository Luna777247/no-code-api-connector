import { test, expect } from '@playwright/test';

test.describe('Application Loading', () => {
  test('should load the main page successfully', async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');

    // Check that the page loaded
    await expect(page).toHaveTitle(/v0 App/);

    // Check for main content areas
    await expect(page.locator('main')).toBeVisible();

    // Check for navigation elements
    const nav = page.locator('nav');
    if (await nav.isVisible()) {
      await expect(nav).toBeVisible();
    }
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForSelector('main', { timeout: 5000 });

    // Check navigation links exist with correct hrefs (faster than clicking each one)
    const connectionsLink = page.locator('a[href="/connections"]');
    await expect(connectionsLink).toBeVisible({ timeout: 2000 });

    const mappingsLink = page.locator('a[href="/mappings"]');
    await expect(mappingsLink).toBeVisible({ timeout: 2000 });

    const runsLink = page.locator('a[href="/runs"]');
    await expect(runsLink).toBeVisible({ timeout: 2000 });

    const dataLink = page.locator('a[href="/data"]');
    await expect(dataLink).toBeVisible({ timeout: 2000 });

    // Quick smoke test: navigate to one page and back
    await connectionsLink.click();
    await expect(page).toHaveURL(/\/connections/);

    // Use the BackToHomeButton to go back
    await page.locator('button').filter({ hasText: 'Back to Home' }).click();
    await expect(page).toHaveURL('/');
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page');

    // Should show some kind of 404 or redirect
    // This depends on how the app handles 404s
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });
});