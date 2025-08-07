import { test, expect } from '@playwright/test'

test.describe('Sheet Music Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/dashboard')
  })

  test('complete sheet music upload and management flow', async ({ page }) => {
    // Step 1: Upload a new sheet music
    await test.step('Upload sheet music', async () => {
      await page.click('[data-testid="upload-sheet-button"]')
      
      // Fill in sheet music details
      await page.fill('[data-testid="sheet-title-input"]', 'Test Piano Piece')
      await page.fill('[data-testid="sheet-composer-input"]', 'Test Composer')
      
      // Upload PDF file (mock file upload)
      const fileInput = page.locator('[data-testid="pdf-file-input"]')
      await fileInput.setInputFiles('./e2e/fixtures/sample-sheet.pdf')
      
      // Submit the upload
      await page.click('[data-testid="upload-submit-button"]')
      
      // Wait for upload to complete
      await expect(page.locator('[data-testid="upload-success-message"]')).toBeVisible()
    })

    // Step 2: Verify sheet music appears in list
    await test.step('Verify sheet music in list', async () => {
      await page.goto('/dashboard/sheets')
      
      // Check if the uploaded sheet music appears
      await expect(page.locator('[data-testid="sheet-card"]').filter({ hasText: 'Test Piano Piece' })).toBeVisible()
      await expect(page.locator('text=Test Composer')).toBeVisible()
    })

    // Step 3: Create a category and move sheet music
    await test.step('Create category and organize sheets', async () => {
      // Create new category
      await page.click('[data-testid="create-category-button"]')
      await page.fill('[data-testid="category-name-input"]', 'Classical Test')
      await page.click('[data-testid="category-create-button"]')
      
      // Move sheet to category
      const sheetCard = page.locator('[data-testid="sheet-card"]').filter({ hasText: 'Test Piano Piece' })
      await sheetCard.locator('[data-testid="move-sheet-button"]').click()
      await page.click('[data-testid="category-option"]', { hasText: 'Classical Test' })
      
      // Verify categorization
      await expect(page.locator('text=Classical Test')).toBeVisible()
    })

    // Step 4: Edit sheet music details
    await test.step('Edit sheet music', async () => {
      const sheetCard = page.locator('[data-testid="sheet-card"]').filter({ hasText: 'Test Piano Piece' })
      await sheetCard.locator('[data-testid="edit-sheet-button"]').click()
      
      // Update details
      await page.fill('[data-testid="edit-title-input"]', 'Updated Piano Piece')
      await page.fill('[data-testid="edit-composer-input"]', 'Updated Composer')
      await page.click('[data-testid="save-changes-button"]')
      
      // Verify updates
      await expect(page.locator('text=Updated Piano Piece')).toBeVisible()
      await expect(page.locator('text=Updated Composer')).toBeVisible()
    })

    // Step 5: Access sheet music player
    await test.step('Open sheet music player', async () => {
      const sheetCard = page.locator('[data-testid="sheet-card"]').filter({ hasText: 'Updated Piano Piece' })
      await sheetCard.locator('[data-testid="play-sheet-button"]').click()
      
      // Verify player interface
      await expect(page.locator('[data-testid="piano-keyboard"]')).toBeVisible()
      await expect(page.locator('[data-testid="play-controls"]')).toBeVisible()
      await expect(page.locator('[data-testid="sheet-display"]')).toBeVisible()
    })

    // Step 6: Test player controls
    await test.step('Test piano player controls', async () => {
      // Test play button
      await page.click('[data-testid="play-button"]')
      await expect(page.locator('[data-testid="pause-button"]')).toBeVisible()
      
      // Test pause button
      await page.click('[data-testid="pause-button"]')
      await expect(page.locator('[data-testid="play-button"]')).toBeVisible()
      
      // Test tempo controls
      await page.click('[data-testid="tempo-decrease"]')
      await page.click('[data-testid="tempo-increase"]')
      
      // Test volume controls
      await page.click('[data-testid="volume-slider"]')
    })

    // Step 7: Delete sheet music
    await test.step('Delete sheet music', async () => {
      await page.goto('/dashboard/sheets')
      
      const sheetCard = page.locator('[data-testid="sheet-card"]').filter({ hasText: 'Updated Piano Piece' })
      await sheetCard.locator('[data-testid="delete-sheet-button"]').click()
      
      // Confirm deletion in modal
      await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible()
      await expect(page.locator('text=이 작업은 되돌릴 수 없습니다')).toBeVisible()
      
      await page.click('[data-testid="confirm-delete-button"]')
      
      // Verify deletion
      await expect(page.locator('[data-testid="sheet-card"]').filter({ hasText: 'Updated Piano Piece' })).not.toBeVisible()
    })
  })

  test('mobile responsive interface', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    await test.step('Test mobile piano interface', async () => {
      await page.goto('/dashboard/sheets')
      
      // Check mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
      
      // Test mobile sheet card layout
      const sheetCards = page.locator('[data-testid="sheet-card"]')
      await expect(sheetCards).toHaveCount(0) // No sheets yet
      
      // Test mobile piano keyboard
      await page.goto('/sheet/1') // Assuming a test sheet exists
      await expect(page.locator('[data-testid="mobile-keyboard"]')).toBeVisible()
      
      // Test touch controls
      await page.tap('[data-testid="piano-key-c4"]')
      
      // Test fullscreen mode
      await page.click('[data-testid="fullscreen-toggle"]')
      await expect(page.locator('[data-testid="fullscreen-piano"]')).toBeVisible()
    })
  })

  test('accessibility features', async ({ page }) => {
    await test.step('Test keyboard navigation', async () => {
      await page.goto('/dashboard/sheets')
      
      // Test tab navigation
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      
      // Test ARIA labels
      await expect(page.locator('[aria-label="악보 업로드"]')).toBeVisible()
      await expect(page.locator('[aria-label="카테고리 생성"]')).toBeVisible()
    })

    await test.step('Test screen reader support', async () => {
      await page.goto('/sheet/1')
      
      // Check ARIA labels on piano keys
      await expect(page.locator('[aria-label="Piano key C4"]')).toBeVisible()
      await expect(page.locator('[role="application"]')).toBeVisible()
      
      // Check play controls accessibility
      await expect(page.locator('[aria-label="재생"]')).toBeVisible()
      await expect(page.locator('[aria-label="일시정지"]')).toBeVisible()
    })
  })

  test('error handling and edge cases', async ({ page }) => {
    await test.step('Test upload error handling', async () => {
      await page.click('[data-testid="upload-sheet-button"]')
      
      // Try to upload without required fields
      await page.click('[data-testid="upload-submit-button"]')
      await expect(page.locator('[data-testid="title-error"]')).toBeVisible()
      
      // Try to upload invalid file type
      const fileInput = page.locator('[data-testid="pdf-file-input"]')
      await fileInput.setInputFiles('./e2e/fixtures/invalid-file.txt')
      await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible()
    })

    await test.step('Test network error handling', async () => {
      // Simulate network failure
      await page.route('**/api/sheet', route => route.abort())
      
      await page.click('[data-testid="upload-sheet-button"]')
      await page.fill('[data-testid="sheet-title-input"]', 'Test')
      await page.fill('[data-testid="sheet-composer-input"]', 'Test')
      await page.click('[data-testid="upload-submit-button"]')
      
      // Check error message
      await expect(page.locator('[data-testid="network-error-message"]')).toBeVisible()
    })
  })

  test('PWA installation flow', async ({ page, context }) => {
    await test.step('Test PWA install prompt', async () => {
      // Simulate beforeinstallprompt event
      await page.evaluate(() => {
        const event = new Event('beforeinstallprompt')
        window.dispatchEvent(event)
      })
      
      // Check if install prompt appears
      await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible()
      
      // Test install button click
      await page.click('[data-testid="pwa-install-button"]')
    })

    await test.step('Test offline functionality', async () => {
      // Go offline
      await context.setOffline(true)
      
      // Navigate to a previously cached page
      await page.goto('/dashboard')
      
      // Check offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
      
      // Test cached sheet music still accessible
      await expect(page.locator('[data-testid="cached-sheets"]')).toBeVisible()
      
      // Go back online
      await context.setOffline(false)
      await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible()
    })
  })
})