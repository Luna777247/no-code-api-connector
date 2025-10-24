import { test, expect } from '@playwright/test'

test.describe('Connections Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to connections page
    await page.goto('/connections')
  })

  test('should display connections page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Connections')

    // Check for new connection button
    await expect(page.locator('text=New Connection')).toBeVisible()
  })

  test('should create new connection', async ({ page }) => {
    // Click create button
    await page.click('text=New Connection')

    // Fill form
    await page.fill('[name="name"]', 'E2E Test Connection')
    await page.fill('[name="baseUrl"]', 'https://jsonplaceholder.typicode.com')
    await page.selectOption('[name="method"]', 'GET')

    // Test connection
    await page.click('text=Test Connection')
    await page.waitForSelector('text=Connection successful')

    // Save connection
    await page.click('text=Save')

    // Verify redirect and success
    await expect(page).toHaveURL(/\/connections$/)
    await expect(page.locator('text=E2E Test Connection')).toBeVisible()
  })

  test('should edit existing connection', async ({ page }) => {
    // Assuming there's at least one connection
    // Click on existing connection
    await page.click('text=Test Connection')

    // Click edit button
    await page.click('text=Edit')

    // Modify name
    await page.fill('[name="name"]', 'Updated Test Connection')

    // Save changes
    await page.click('text=Save Changes')

    // Verify update
    await expect(page.locator('text=Updated Test Connection')).toBeVisible()
  })

  test('should delete connection', async ({ page }) => {
    // Click delete button
    await page.click('[data-testid="delete-connection"]')

    // Confirm deletion
    await page.click('text=Delete')

    // Verify connection removed
    await expect(page.locator('text=Test Connection')).not.toBeVisible()
  })
})
