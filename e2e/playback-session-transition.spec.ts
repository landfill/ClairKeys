import { expect, test } from '@playwright/test'

/**
 * Issue #146 item 6: the player frame and the core controls have to hold still
 * across play and pause. jsdom performs no layout, so the jest suites can only
 * pin which elements render; whether the reader's thumb still lands on the
 * transport after a pause is a question about real geometry, and only a real
 * browser answers it.
 */

const animation = {
  version: '1.0',
  title: '연습 세션 전환 회귀',
  composer: '테스트 작곡가',
  duration: 30,
  tempo: 100,
  tempoSource: 'score',
  timingReferenceBpm: 100,
  timeSignature: '4/4',
  notes: Array.from({ length: 20 }, (_, index) => ({
    midi: 60 + (index % 5),
    start: index * 1.2,
    duration: 0.8,
  })),
}

const viewports = [
  { name: 'phone portrait', width: 390, height: 844 },
  { name: 'phone landscape', width: 844, height: 390 },
  { name: 'desktop', width: 1280, height: 720 },
]

/**
 * `getByLabel` matches substrings, and this bar also carries 재생 위치 and
 * 재생 속도, so the transport has to be addressed exactly.
 */
const transport = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('button', { name, exact: true })

async function serveFixture(page: import('@playwright/test').Page) {
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
          title: animation.title,
          composer: animation.composer,
          category: null,
          isPublic: true,
          provenance: 'omr',
          availability: 'ready',
          animationDataUrl: '/session-transition.json',
          createdAt: '2026-09-08T00:00:00.000Z',
          updatedAt: '2026-09-08T00:00:00.000Z',
          owner: null,
        },
      }),
    })
  })
  await page.route('**/session-transition.json', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(animation),
    })
  })
}

for (const viewport of viewports) {
  test(`keeps the frame and the transport in place across a pause on ${viewport.name}`, async ({ page, browserName }) => {
    await serveFixture(page)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/sheet/1')

    // Setup screen: the stacked control block and the page header are here.
    await expect(page.getByTestId('playback-primary-controls')).toBeVisible()
    await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()

    await page.getByTestId('playback-play').click()

    // The session opens only when audio actually starts (D-056 decision 1), so
    // this whole transition presupposes a browser that can run an AudioContext
    // with an output. Headless Firefox on the CI runner cannot, and there is
    // then no transition left to measure.
    const started = await page
      .getByTestId('compact-playback-bar')
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true, () => false)

    if (!started) {
      // Firefox is the only project that has ever failed to start here, and
      // only on a runner with no audio output. Anywhere else, a start that
      // never happens is the regression this file exists to catch — skipping
      // it everywhere would let a broken play handler pass as "skipped".
      expect(
        browserName,
        'playback did not start in a browser project that supports it — this is a regression, not a silent runner',
      ).toBe('firefox')
      // Even in firefox, the screen must be the untouched setup screen. A
      // half-entered session means the chrome and the audio came apart.
      await expect(page.getByTestId('playback-primary-controls')).toBeVisible()
      await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()
      await expect(page.getByTestId('compact-playback-bar')).toHaveCount(0)
      test.skip(true, 'headless firefox on this runner has no audio output; the pause transition needs a sounding score')
    }

    const playingTransport = await transport(page, '일시정지').boundingBox()
    const playingBox = await page.getByTestId('playback-box').boundingBox()
    const playingBar = await page.getByTestId('compact-playback-bar').boundingBox()
    const playingOverflow = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(playingTransport).not.toBeNull()
    expect(playingBox).not.toBeNull()

    await transport(page, '일시정지').click()

    // The pause must not rebuild the screen. Same frame, same box, and the
    // transport in the same place — now offering resume.
    await expect(page.getByTestId('compact-playback-bar')).toBeVisible()
    await expect(page.getByTestId('playback-primary-controls')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: animation.title })).toHaveCount(0)

    const pausedTransport = await transport(page, '재생').boundingBox()
    const pausedBox = await page.getByTestId('playback-box').boundingBox()
    expect(pausedTransport).toEqual(playingTransport)
    expect(pausedBox).toEqual(playingBox)

    // Everything the reader might reach for while paused is still there and
    // still operable. `toBeVisible` is the wrong question at 390px: the seek
    // bar already computes to zero width there while the score is sounding,
    // which is a pre-existing narrow-width defect of the bar rather than
    // anything a pause introduces (see the parity assertion below).
    for (const control of [
      page.getByRole('slider', { name: '재생 위치' }),
      transport(page, '구간 시작 A 설정'),
      page.getByLabel('재생 속도'),
      page.getByLabel('음량 (master gain)'),
      transport(page, '정지'),
    ]) {
      await expect(control).toBeAttached()
      await expect(control).toBeEnabled()
    }

    // The bar occupies exactly what it did a moment ago, overflow included.
    // This pins the claim this change is responsible for — a pause costs the
    // layout nothing — without asserting away a defect it did not cause. The
    // compact bar overflows a 390px-wide viewport by 57px in both states; that
    // belongs to the narrow-width pass of #146, not here.
    expect(await page.getByTestId('compact-playback-bar').boundingBox()).toEqual(playingBar)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(playingOverflow)

    // Resuming puts pause back in the very slot it left.
    await transport(page, '재생').click()
    await expect(transport(page, '일시정지')).toBeVisible()
    expect(await transport(page, '일시정지').boundingBox()).toEqual(playingTransport)

    // Stop is still the one way back to the setup screen.
    await transport(page, '정지').click()
    await expect(page.getByTestId('playback-primary-controls')).toBeVisible()
    await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()
    await expect(page.getByTestId('compact-playback-bar')).toHaveCount(0)
  })
}
