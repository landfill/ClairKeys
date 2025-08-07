import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Navigate to the login page
  await page.goto('/auth/signin')

  // Fill in the login form (assuming email/password login)
  await page.fill('[data-testid="email-input"]', 'test@example.com')
  await page.fill('[data-testid="password-input"]', 'testpassword')

  // Click the login button
  await page.click('[data-testid="signin-button"]')

  // Wait for the redirect after login
  await page.waitForURL('/dashboard')

  // Verify we're logged in by checking for user-specific content
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()

  // Save the authentication state
  await page.context().storageState({ path: authFile })
})