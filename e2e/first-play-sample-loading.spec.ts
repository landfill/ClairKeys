import { expect, test, type Page } from '@playwright/test'

/**
 * Issue #185: a first 재생 on a slow connection sat on an unchanged screen
 * while the recorded samples downloaded, then played the synthesised fallback
 * anyway. The samples are now fetched while the reader looks at the page, and
 * a wait that still happens is shown where the reader is looking. jsdom has no
 * network or layout, so only a real browser can show either.
 */

const animation = {
  version: '1.0',
  title: '첫 재생 샘플 대기',
  composer: '테스트 작곡가',
  duration: 20,
  tempo: 100,
  tempoSource: 'score',
  timingReferenceBpm: 100,
  timeSignature: '4/4',
  notes: Array.from({ length: 12 }, (_, index) => ({
    midi: 60 + (index % 5),
    start: index * 1.5,
    duration: 1,
  })),
}

/** Holds every sample response until `release` is called, like a slow link. */
async function serveFixture(page: Page) {
  let release!: () => void
  const released = new Promise<void>(resolve => { release = resolve })
  const sampleRequests: string[] = []

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
        animationDataUrl: '/first-play.json',
        createdAt: '2026-09-28T00:00:00.000Z',
        updatedAt: '2026-09-28T00:00:00.000Z',
        owner: null,
      },
    }),
  }))
  await page.route('**/first-play.json', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(animation),
  }))
  await page.route('**/samples/piano/**', async route => {
    sampleRequests.push(route.request().url())
    await released
    await route.continue()
  })

  return { release, sampleRequests }
}

// On a phone the setup screen puts the note area below the fold, so there the
// pressed button carries the wait; on a desktop both are on screen.
const viewports = [
  { name: 'desktop', width: 1440, height: 900, noteAreaOnScreen: true },
  { name: 'phone portrait', width: 390, height: 844, noteAreaOnScreen: false },
]

for (const viewport of viewports) {
  test(`fetches the samples before 재생 and shows the wait on ${viewport.name}`, async ({ page, browserName }) => {
    const { release, sampleRequests } = await serveFixture(page)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/sheet/1')

    const play = page.getByTestId('playback-play')
    await expect(play).toBeEnabled()
    // Prefetch starts once the page is idle, before any click.
    await expect.poll(() => sampleRequests.length, { timeout: 10000 }).toBeGreaterThan(0)

    await play.click()

    // Held samples keep the start waiting (up to SAMPLE_LOAD_WAIT_MS): the
    // pressed button and the note area both say so. A browser whose audio
    // cannot start never reaches that wait; as in playback-session-transition,
    // only headless Firefox on a runner without audio output has done that.
    const waited = await expect(play)
      .toHaveAttribute('aria-busy', 'true', { timeout: 5000 })
      .then(() => true, () => false)
    if (!waited) {
      expect(browserName, 'the start never waited for the samples in a browser that can play audio').toBe('firefox')
      await expect(page.getByTestId('compact-playback-bar')).toHaveCount(0)
      test.skip(true, 'headless firefox on this runner has no audio output, so no start waits for samples')
    }
    await expect(play).toContainText('준비 중')
    await expect(play).toBeInViewport()
    await expect(page.getByTestId('sample-loading')).toBeVisible()
    if (viewport.noteAreaOnScreen) await expect(page.getByTestId('sample-loading')).toBeInViewport()

    release()

    const started = await page
      .getByTestId('compact-playback-bar')
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true, () => false)
    expect(started, 'playback did not start after the samples were released').toBe(true)

    await expect(page.getByTestId('sample-loading')).toHaveCount(0)
    // One bank per page: the start decoded the prefetched bytes rather than
    // requesting every sample a second time.
    const unique = new Set(sampleRequests)
    expect(sampleRequests.length).toBe(unique.size)
  })
}
