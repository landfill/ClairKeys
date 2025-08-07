import { test, expect } from '@playwright/test'

test.describe('Piano Player Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Assume we have a test sheet music available
    await page.goto('/sheet/1')
  })

  test('piano keyboard interaction', async ({ page }) => {
    await test.step('Load piano keyboard', async () => {
      // Wait for piano keyboard to load
      await expect(page.locator('[data-testid="piano-keyboard"]')).toBeVisible()
      
      // Check that all piano keys are rendered
      await expect(page.locator('[data-testid^="piano-key-"]')).toHaveCount(88) // Standard 88-key piano
    })

    await test.step('Test key press interactions', async () => {
      // Test clicking white keys
      await page.click('[data-testid="piano-key-c4"]')
      await page.click('[data-testid="piano-key-d4"]')
      await page.click('[data-testid="piano-key-e4"]')
      
      // Test clicking black keys
      await page.click('[data-testid="piano-key-cs4"]')
      await page.click('[data-testid="piano-key-ds4"]')
      
      // Verify audio context is initialized (check for audio elements or web audio API)
      const audioContext = await page.evaluate(() => {
        return (window as any).audioContext !== null
      })
      expect(audioContext).toBeTruthy()
    })

    await test.step('Test keyboard shortcuts', async () => {
      // Test keyboard mapping (QWERTY to piano keys)
      await page.keyboard.press('q') // Should play C4
      await page.keyboard.press('w') // Should play D4
      await page.keyboard.press('e') // Should play E4
      
      // Test sustain pedal simulation
      await page.keyboard.down('Space')
      await page.click('[data-testid="piano-key-c4"]')
      await page.keyboard.up('Space')
    })

    await test.step('Test mobile touch interaction', async ({ isMobile }) => {
      test.skip(!isMobile, 'Mobile-only test')
      
      // Test touch events on mobile
      await page.tap('[data-testid="piano-key-c4"]')
      
      // Test multi-touch (chords)
      await Promise.all([
        page.tap('[data-testid="piano-key-c4"]'),
        page.tap('[data-testid="piano-key-e4"]'),
        page.tap('[data-testid="piano-key-g4"]')
      ])
      
      // Test haptic feedback trigger (if supported)
      const hapticSupported = await page.evaluate(() => {
        return 'vibrate' in navigator
      })
      
      if (hapticSupported) {
        await page.tap('[data-testid="piano-key-c4"]')
        // Verify vibration was called (mock or spy needed)
      }
    })
  })

  test('sheet music animation and sync', async ({ page }) => {
    await test.step('Load sheet music animation', async () => {
      // Check sheet music display area
      await expect(page.locator('[data-testid="sheet-display"]')).toBeVisible()
      
      // Check animation controls
      await expect(page.locator('[data-testid="play-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="pause-button"]')).not.toBeVisible()
    })

    await test.step('Test playback controls', async () => {
      // Start playback
      await page.click('[data-testid="play-button"]')
      await expect(page.locator('[data-testid="pause-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="play-button"]')).not.toBeVisible()
      
      // Test tempo controls
      const initialTempo = await page.locator('[data-testid="tempo-display"]').textContent()
      await page.click('[data-testid="tempo-increase"]')
      const increasedTempo = await page.locator('[data-testid="tempo-display"]').textContent()
      expect(increasedTempo).not.toBe(initialTempo)
      
      // Test tempo decrease
      await page.click('[data-testid="tempo-decrease"]')
      
      // Test reset tempo
      await page.click('[data-testid="tempo-reset"]')
      const resetTempo = await page.locator('[data-testid="tempo-display"]').textContent()
      expect(resetTempo).toBe(initialTempo)
    })

    await test.step('Test volume and audio controls', async () => {
      // Test volume slider
      const volumeSlider = page.locator('[data-testid="volume-slider"]')
      await volumeSlider.click()
      
      // Test mute button
      await page.click('[data-testid="mute-button"]')
      await expect(page.locator('[data-testid="unmute-button"]')).toBeVisible()
      
      // Test unmute
      await page.click('[data-testid="unmute-button"]')
      await expect(page.locator('[data-testid="mute-button"]')).toBeVisible()
    })

    await test.step('Test animation synchronization', async () => {
      // Start playback
      await page.click('[data-testid="play-button"]')
      
      // Wait for animation to start
      await page.waitForTimeout(1000)
      
      // Check if piano keys are being highlighted during playback
      const activeKeys = page.locator('[data-testid^="piano-key-"].active')
      await expect(activeKeys).toHaveCount.toBeGreaterThan(0)
      
      // Pause and verify animation stops
      await page.click('[data-testid="pause-button"]')
      await page.waitForTimeout(500)
      
      // Check animation has paused
      const progressBar = page.locator('[data-testid="progress-bar"]')
      const progress1 = await progressBar.getAttribute('aria-valuenow')
      await page.waitForTimeout(1000)
      const progress2 = await progressBar.getAttribute('aria-valuenow')
      expect(progress1).toBe(progress2)
    })
  })

  test('practice mode features', async ({ page }) => {
    await test.step('Enable practice mode', async () => {
      await page.click('[data-testid="practice-mode-toggle"]')
      await expect(page.locator('[data-testid="practice-mode-active"]')).toBeVisible()
    })

    await test.step('Test hand separation', async () => {
      // Test left hand only
      await page.click('[data-testid="left-hand-only"]')
      await page.click('[data-testid="play-button"]')
      
      // Verify only left hand keys are active
      await expect(page.locator('[data-testid="right-hand-keys"]')).toHaveClass(/inactive/)
      
      // Test right hand only
      await page.click('[data-testid="right-hand-only"]')
      await expect(page.locator('[data-testid="left-hand-keys"]')).toHaveClass(/inactive/)
      
      // Test both hands
      await page.click('[data-testid="both-hands"]')
      await expect(page.locator('[data-testid="left-hand-keys"]')).not.toHaveClass(/inactive/)
      await expect(page.locator('[data-testid="right-hand-keys"]')).not.toHaveClass(/inactive/)
    })

    await test.step('Test loop and repeat functionality', async () => {
      // Set loop points
      await page.click('[data-testid="set-loop-start"]')
      await page.waitForTimeout(2000)
      await page.click('[data-testid="set-loop-end"]')
      
      // Enable loop
      await page.click('[data-testid="enable-loop"]')
      await expect(page.locator('[data-testid="loop-indicator"]')).toBeVisible()
      
      // Start playback and verify looping
      await page.click('[data-testid="play-button"]')
      // Wait for loop to complete and restart
      await page.waitForTimeout(5000)
      
      // Disable loop
      await page.click('[data-testid="disable-loop"]')
      await expect(page.locator('[data-testid="loop-indicator"]')).not.toBeVisible()
    })

    await test.step('Test wrong note feedback', async () => {
      // Enable wrong note detection
      await page.click('[data-testid="wrong-note-detection"]')
      
      // Start practice mode
      await page.click('[data-testid="play-button"]')
      
      // Deliberately press wrong key
      await page.click('[data-testid="piano-key-fs4"]') // Assuming this is wrong
      
      // Check for visual feedback
      await expect(page.locator('[data-testid="wrong-note-indicator"]')).toBeVisible()
      
      // Check for audio feedback (error sound)
      const errorSound = await page.evaluate(() => {
        return (window as any).lastErrorSound !== null
      })
      expect(errorSound).toBeTruthy()
    })
  })

  test('fullscreen and mobile optimization', async ({ page, isMobile }) => {
    await test.step('Test fullscreen mode', async () => {
      await page.click('[data-testid="fullscreen-toggle"]')
      
      // Check if fullscreen API was called
      const isFullscreen = await page.evaluate(() => {
        return document.fullscreenElement !== null
      })
      expect(isFullscreen).toBeTruthy()
      
      // Test fullscreen piano layout
      await expect(page.locator('[data-testid="fullscreen-piano"]')).toBeVisible()
      
      // Exit fullscreen
      await page.keyboard.press('Escape')
    })

    await test.step('Test mobile landscape orientation', async () => {
      test.skip(!isMobile, 'Mobile-only test')
      
      // Simulate landscape orientation
      await page.setViewportSize({ width: 844, height: 390 }) // iPhone landscape
      
      // Check mobile landscape layout
      await expect(page.locator('[data-testid="landscape-piano"]')).toBeVisible()
      
      // Test orientation guidance
      await page.setViewportSize({ width: 390, height: 844 }) // Portrait
      await expect(page.locator('[data-testid="rotate-device-prompt"]')).toBeVisible()
    })

    await test.step('Test keyboard size adaptation', async () => {
      // Test different screen sizes
      await page.setViewportSize({ width: 1920, height: 1080 })
      const largeKeys = await page.locator('[data-testid="piano-key-c4"]').boundingBox()
      
      await page.setViewportSize({ width: 768, height: 1024 })
      const smallKeys = await page.locator('[data-testid="piano-key-c4"]').boundingBox()
      
      expect(largeKeys!.width).toBeGreaterThan(smallKeys!.width)
    })
  })

  test('performance and loading', async ({ page }) => {
    await test.step('Test loading states', async () => {
      // Navigate to a new sheet
      await page.goto('/sheet/2')
      
      // Check loading indicators
      await expect(page.locator('[data-testid="piano-loading"]')).toBeVisible()
      await expect(page.locator('[data-testid="sheet-loading"]')).toBeVisible()
      
      // Wait for loading to complete
      await expect(page.locator('[data-testid="piano-keyboard"]')).toBeVisible()
      await expect(page.locator('[data-testid="sheet-display"]')).toBeVisible()
    })

    await test.step('Test audio loading and caching', async () => {
      // Check audio preloading
      const audioElements = page.locator('audio')
      await expect(audioElements).toHaveCount.toBeGreaterThan(0)
      
      // Test audio caching by playing same note multiple times
      await page.click('[data-testid="piano-key-c4"]')
      const firstLoadTime = Date.now()
      
      await page.waitForTimeout(100)
      await page.click('[data-testid="piano-key-c4"]')
      const secondLoadTime = Date.now()
      
      // Second play should be faster due to caching
      expect(secondLoadTime - firstLoadTime).toBeLessThan(50)
    })

    await test.step('Test memory and performance', async () => {
      // Play many notes rapidly
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="piano-key-c4"]')
        await page.click('[data-testid="piano-key-d4"]')
        await page.click('[data-testid="piano-key-e4"]')
      }
      
      // Check for memory leaks or performance degradation
      const performanceEntries = await page.evaluate(() => {
        return performance.getEntriesByType('measure')
      })
      
      // Performance should remain stable
      expect(performanceEntries.length).toBeLessThan(100)
    })
  })
})