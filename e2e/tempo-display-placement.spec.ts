import { expect, test, type Page } from '@playwright/test'

/**
 * Issue #186: during playback the tempo readout was a fixed pill 4rem from the
 * top. On a phone held upright the player root is rotated with a transform,
 * which makes that root the pill's containing block, so the pill landed on the
 * falling-note lane and hid the notes under it. jsdom performs no layout; only
 * a real browser can say whether two boxes overlap on screen.
 */

const animation = {
  // 1.1: a 1.0 document predates tempo provenance and always reads as unknown.
  version: '1.1',
  title: '빠르기 표시 위치',
  composer: '테스트 작곡가',
  duration: 30,
  // The production report: a user-entered tempo that differs from the score,
  // which is the longest form the readout takes.
  tempo: 69,
  tempoSource: 'user',
  scoreTempo: 72,
  timingReferenceBpm: 69,
  timeSignature: '4/4',
  notes: Array.from({ length: 20 }, (_, index) => ({
    midi: 60 + (index % 5),
    start: index * 1.2,
    duration: 0.8,
  })),
}

const viewports = [
  { name: 'phone portrait 390x844 (rotated)', width: 390, height: 844, touch: true, rotated: true },
  { name: 'phone portrait 375x812 (rotated)', width: 375, height: 812, touch: true, rotated: true },
  { name: 'phone landscape 844x390', width: 844, height: 390, touch: true, rotated: false },
  { name: 'desktop 1280x720', width: 1280, height: 720, touch: false, rotated: false },
]

async function serveFixture(page: Page) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => {
        throw new Error('service worker disabled for route fixture')
      }
    }
  })
  await page.route('**/api/sheet/1', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      sheetMusic: {
        id: 1,
        title: animation.title,
        composer: animation.composer,
        category: null,
        isPublic: true,
        provenance: 'omr',
        availability: 'ready',
        animationDataUrl: '/tempo-placement.json',
        createdAt: '2026-09-28T00:00:00.000Z',
        updatedAt: '2026-09-28T00:00:00.000Z',
        owner: null,
      },
    }),
  }))
  await page.route('**/tempo-placement.json', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(animation),
  }))
}

type Box = { x: number; y: number; width: number; height: number }

/** Overlap area in CSS pixels; touching edges do not count. */
function overlap(a: Box, b: Box): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return width > 0.5 && height > 0.5 ? width * height : 0
}

for (const viewport of viewports) {
  test(`keeps the tempo readout off the notes and keys on ${viewport.name}`, async ({ browser, browserName }) => {
    // Rotation needs a coarse pointer, which only a touch context reports.
    test.skip(browserName === 'firefox' && viewport.touch, 'Firefox has no mobile emulation')
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.touch,
      isMobile: viewport.touch && browserName === 'chromium',
    })
    const page = await context.newPage()
    // Headless Chromium grants fullscreen, and a fullscreen element is forced to
    // `transform: none`, which quietly undoes the rotation under test. Without
    // lock() the player takes the CSS path an iPhone takes: no fullscreen
    // request, the transform stays.
    await page.addInitScript(() => {
      const orientation = screen.orientation as ScreenOrientation & { lock?: unknown }
      if (orientation && 'lock' in Object.getPrototypeOf(orientation)) {
        Object.defineProperty(orientation, 'lock', { value: undefined })
      }
    })
    await serveFixture(page)
    await page.goto('/sheet/1')

    await page.getByTestId('playback-play').click()
    const started = await page
      .getByTestId('compact-playback-bar')
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true, () => false)
    if (!started) {
      // Same rule as playback-session-transition: only a runner without audio
      // output may fail to start, and that has only ever been Firefox.
      expect(browserName, 'playback did not start in a browser that supports it').toBe('firefox')
      test.skip(true, 'headless firefox on this runner has no audio output')
    }

    // The rotated cases are the reported defect; one that silently stayed
    // upright would pass without testing it.
    await expect(page.locator('body')).toHaveClass(viewport.rotated ? /playback-rotated/ : /^(?!.*playback-rotated)/)

    const tempo = page.getByTestId('tempo-display')
    await expect(tempo).toBeVisible()
    await expect(tempo).toContainText('♩=69 (직접 입력)')
    await expect(tempo).toContainText('악보 표기: ♩=72')

    const tempoBox = await tempo.boundingBox()
    const playbackBox = await page.getByTestId('playback-box').boundingBox()
    const barBox = await page.getByTestId('compact-playback-bar').boundingBox()
    expect(tempoBox).not.toBeNull()
    expect(playbackBox).not.toBeNull()
    expect(barBox).not.toBeNull()

    await page.screenshot({ path: test.info().outputPath('session.png') })

    // The box holds the lane, the hit line and the keyboard: none of it may
    // sit under the readout, nor may the transport the reader is using.
    expect(overlap(tempoBox!, playbackBox!)).toBe(0)
    expect(overlap(tempoBox!, barBox!)).toBe(0)

    // Moving off the lane must not move it off the screen instead.
    expect(tempoBox!.x).toBeGreaterThanOrEqual(0)
    expect(tempoBox!.y).toBeGreaterThanOrEqual(0)
    expect(tempoBox!.x + tempoBox!.width).toBeLessThanOrEqual(viewport.width + 0.5)
    expect(tempoBox!.y + tempoBox!.height).toBeLessThanOrEqual(viewport.height + 0.5)

    await context.close()
  })
}
