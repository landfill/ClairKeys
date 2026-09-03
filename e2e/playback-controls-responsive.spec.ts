import { expect, test } from '@playwright/test'

const animation = {
  version: '1.0',
  title: '모바일 컨트롤 회귀',
  composer: '테스트 작곡가',
  duration: 3,
  tempo: 100,
  tempoSource: 'score',
  timingReferenceBpm: 100,
  timeSignature: '4/4',
  notes: [{ midi: 60, start: 0, duration: 1 }],
}

test('keeps the six labeled primary controls inside narrow viewports', async ({ page }) => {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => {
        throw new Error('service worker disabled for route fixture')
      }
    }
  })

  await page.route('**/api/sheet/1', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sheetMusic: {
          id: 1,
          title: '모바일 컨트롤 회귀',
          composer: '테스트 작곡가',
          category: null,
          isPublic: true,
          provenance: 'omr',
          availability: 'ready',
          animationDataUrl: '/playback-controls.json',
          createdAt: '2026-09-03T00:00:00.000Z',
          updatedAt: '2026-09-03T00:00:00.000Z',
          owner: null,
        },
      }),
    })
  })
  await page.route('**/playback-controls.json', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(animation),
    })
  })

  const widths = [320, 375, 390, 412, 430, 525, 550, 1024, 1440]
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/sheet/1')
    await expect(page.getByTestId('playback-primary-controls')).toBeVisible()

    const layout = await page.getByTestId('playback-primary-controls').evaluate(element => {
      const buttons = Array.from(element.querySelectorAll('button')).map(button => {
        const rect = button.getBoundingClientRect()
        return {
          label: button.textContent?.trim(),
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        }
      })
      const loop = element.querySelector('[data-testid="playback-loop"]')

      return {
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        primaryDisplay: getComputedStyle(element).display,
        loopDisplay: loop ? getComputedStyle(loop).display : null,
        buttons,
      }
    })

    expect(layout.documentWidth, `document overflow at ${width}px`).toBeLessThanOrEqual(width)
    expect(layout.bodyWidth, `body overflow at ${width}px`).toBeLessThanOrEqual(width)
    expect(layout.buttons.map(button => button.label)).toEqual([
      '재생',
      '일시정지',
      '중지',
      'A 시작',
      'B 종료',
      '초기화',
    ])
    for (const button of layout.buttons) {
      expect(button.left, `${button.label} starts outside ${width}px viewport`).toBeGreaterThanOrEqual(0)
      expect(button.right, `${button.label} ends outside ${width}px viewport`).toBeLessThanOrEqual(width)
      expect(button.width).toBeGreaterThanOrEqual(44)
      expect(button.height).toBeGreaterThanOrEqual(44)
    }

    if (width < 768) {
      expect(layout.primaryDisplay).toBe('grid')
      expect(layout.loopDisplay).toBe('grid')
    } else {
      expect(layout.primaryDisplay).toBe('flex')
      expect(layout.loopDisplay).toBe('flex')
    }
  }
})
