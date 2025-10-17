import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Check if the page loaded (basic smoke test)
    await expect(page).toHaveTitle(/no-code-api-connector/);

    // Check for main content areas
    await expect(page.locator('main')).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    // Check for navigation elements
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Check for key navigation links
    await expect(page.getByRole('link', { name: /connections/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /mappings/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /runs/i })).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.goto('/');

      // Check that mobile layout works
      await expect(page.locator('main')).toBeVisible();

      // Check for mobile navigation (hamburger menu, etc.)
      // This will depend on the actual mobile implementation
    }
  });
});