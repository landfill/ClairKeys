import { expect, test, type Page, type TestInfo } from '@playwright/test'

// Temporary issue #254 instrument. Remove before the final PR. Keep the fixture
// and assertion sequence in sync with first-play-sample-loading.spec.ts.
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
    midi: 60 + (index % 5), start: index * 1.5, duration: 1,
  })),
}

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
        id: 1, title: animation.title, composer: animation.composer,
        category: null, isPublic: true, provenance: 'omr', availability: 'ready',
        animationDataUrl: '/first-play.json',
        createdAt: '2026-09-28T00:00:00.000Z',
        updatedAt: '2026-09-28T00:00:00.000Z', owner: null,
      },
    }),
  }))
  await page.route('**/first-play.json', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(animation),
  }))
  await page.route('**/samples/piano/**', async route => {
    sampleRequests.push(route.request().url())
    await released
    await route.continue()
  })
  return { release, sampleRequests }
}

type DiagnosticWindow = Window & typeof globalThis & {
  __sampleWaitDiagnostic?: {
    frames: unknown[]
    events: unknown[]
    stop: () => void
  }
}

async function installMeasurements(page: Page) {
  await page.addInitScript(() => {
    const frames: unknown[] = []
    const events: unknown[] = []
    let clickedAt: number | null = null
    let clickedButton: HTMLElement | null = null
    let frameId = 0
    let stopped = false
    let latestIntersection: {
      timeMs: number
      sinceClickMs: number
      intersectionRatio: number
      isIntersecting: boolean
      rootBounds: ReturnType<typeof rect> | null
      boundingClientRect: ReturnType<typeof rect>
      intersectionRect: ReturnType<typeof rect>
    } | null = null

    function rect(value: DOMRectReadOnly) {
      return {
        x: value.x, y: value.y, top: value.top, right: value.right,
        bottom: value.bottom, left: value.left, width: value.width, height: value.height,
      }
    }

    function sample(source: string) {
      const now = performance.now()
      const button = document.querySelector<HTMLElement>('[data-testid="playback-play"]')
      const root = clickedButton?.closest<HTMLElement>('div.w-full.mx-auto') ?? null
      const bar = document.querySelector<HTMLElement>('[data-testid="compact-playback-bar"]')
      const visual = window.visualViewport
      const buttonStyle = button ? getComputedStyle(button) : null
      const rootStyle = root ? getComputedStyle(root) : null
      const barRect = bar?.getBoundingClientRect()
      const barStyle = bar ? getComputedStyle(bar) : null
      const started = !!barRect && barRect.width > 0 && barRect.height > 0
        && barStyle?.visibility !== 'hidden' && barStyle?.display !== 'none'
      frames.push({
        source,
        timeMs: now,
        sinceClickMs: clickedAt === null ? null : now - clickedAt,
        innerViewport: { width: innerWidth, height: innerHeight },
        screen: { width: screen.width, height: screen.height, devicePixelRatio },
        visualViewport: visual ? {
          width: visual.width, height: visual.height, scale: visual.scale,
          offsetLeft: visual.offsetLeft, offsetTop: visual.offsetTop,
          pageLeft: visual.pageLeft, pageTop: visual.pageTop,
        } : null,
        scrollX, scrollY,
        document: {
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          bodyScrollHeight: document.body?.scrollHeight,
        },
        portrait: matchMedia('(orientation: portrait)').matches,
        coarsePointer: matchMedia('(pointer: coarse)').matches,
        screenOrientation: screen.orientation ? {
          type: screen.orientation.type, angle: screen.orientation.angle,
        } : null,
        bodyClasses: document.body?.className,
        rotated: document.body?.classList.contains('playback-rotated'),
        sessionActive: document.body?.classList.contains('playback-active'),
        button: button ? {
          rect: rect(button.getBoundingClientRect()),
          busy: button.getAttribute('aria-busy'), text: button.textContent,
          classes: button.className, isClickedButton: button === clickedButton,
          display: buttonStyle?.display, visibility: buttonStyle?.visibility,
          position: buttonStyle?.position, transform: buttonStyle?.transform,
        } : null,
        clickedButtonConnected: clickedButton?.isConnected,
        playerRoot: root ? {
          rect: rect(root.getBoundingClientRect()), classes: root.className,
          style: root.getAttribute('style'), transform: rootStyle?.transform,
          position: rootStyle?.position, overflow: rootStyle?.overflow,
        } : null,
        loadingPresent: !!document.querySelector('[data-testid="sample-loading"]'),
        compactBarPresent: !!bar,
        playbackStarted: started,
        // IO entries arrive asynchronously. This is the latest entry, with its
        // own timestamp; a null entry means IO has not reported yet, not ratio 0.
        intersection: latestIntersection,
      })
      return started
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        latestIntersection = {
          timeMs: entry.time,
          sinceClickMs: entry.time - (clickedAt ?? entry.time),
          intersectionRatio: entry.intersectionRatio,
          isIntersecting: entry.isIntersecting,
          rootBounds: entry.rootBounds ? rect(entry.rootBounds) : null,
          boundingClientRect: rect(entry.boundingClientRect),
          intersectionRect: rect(entry.intersectionRect),
        }
        events.push({ source: 'intersection', ...latestIntersection })
      }
    }, { threshold: [0, 0.01, 0.25, 0.5, 0.75, 1] })

    function stop() {
      if (stopped) return
      stopped = true
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }

    function frame() {
      if (stopped) return
      if (sample('frame')) {
        events.push({ source: 'playback-started', sinceClickMs: performance.now() - (clickedAt ?? 0) })
        stop()
      } else {
        frameId = requestAnimationFrame(frame)
      }
    }

    document.addEventListener('click', event => {
      const button = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-testid="playback-play"]') : null
      if (!button || clickedAt !== null) return
      clickedAt = performance.now()
      clickedButton = button
      observer.observe(button)
      // Capture before React's handler changes orientation or starts audio.
      sample('click-capture')
      frameId = requestAnimationFrame(frame)
    }, true)

    for (const name of ['resize', 'scroll', 'orientationchange']) {
      window.addEventListener(name, () => {
        if (clickedAt !== null && !stopped) sample(name)
      }, { passive: true })
    }
    for (const name of ['resize', 'scroll']) {
      window.visualViewport?.addEventListener(name, () => {
        if (clickedAt !== null && !stopped) sample(`visual-viewport-${name}`)
      }, { passive: true })
    }
    ;(window as DiagnosticWindow).__sampleWaitDiagnostic = { frames, events, stop }
  })
}

async function attachMeasurements(page: Page, testInfo: TestInfo, sampleRequests: string[]) {
  const measurements = await page.evaluate(() => {
    const state = (window as DiagnosticWindow).__sampleWaitDiagnostic
    state?.stop()
    return state ? { frames: state.frames, events: state.events } : null
  })
  await testInfo.attach('sample-wait-measurements', {
    body: JSON.stringify({
      platform: process.platform, project: testInfo.project.name,
      repeatEachIndex: testInfo.repeatEachIndex, workerIndex: testInfo.workerIndex,
      configuredViewport: { width: 1440, height: 900 }, sampleRequests, measurements,
    }, null, 2),
    contentType: 'application/json',
  })
}

test('diagnoses the sample wait on desktop Mobile Safari on Linux', async ({ page, browserName }, testInfo) => {
  test.skip(process.platform !== 'linux' || testInfo.project.name !== 'Mobile Safari', 'issue #254 Linux Mobile Safari diagnostic only')
  const { release, sampleRequests } = await serveFixture(page)
  await installMeasurements(page)
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/sheet/1')
    const play = page.getByTestId('playback-play')
    await expect(play).toBeEnabled()
    await expect.poll(() => sampleRequests.length, { timeout: 10000 }).toBeGreaterThan(0)
    await play.click()
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
    await expect(page.getByTestId('sample-loading')).toBeInViewport()
    release()
    const started = await page.getByTestId('compact-playback-bar')
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true, () => false)
    expect(started, 'playback did not start after the samples were released').toBe(true)
    await expect(page.getByTestId('sample-loading')).toHaveCount(0)
    const unique = new Set(sampleRequests)
    expect(sampleRequests.length).toBe(unique.size)
  } catch (error) {
    // Preserve the original assertion error even if artifact collection fails.
    const artifacts = await Promise.allSettled([
      attachMeasurements(page, testInfo, sampleRequests),
      page.screenshot().then(body => testInfo.attach('sample-wait-failure', {
        body, contentType: 'image/png',
      })),
    ])
    const artifactErrors = artifacts.flatMap((result, index) => result.status === 'rejected'
      ? [{ artifact: index === 0 ? 'measurements' : 'screenshot', error: String(result.reason) }]
      : [])
    if (artifactErrors.length) {
      await testInfo.attach('sample-wait-artifact-errors', {
        body: JSON.stringify(artifactErrors), contentType: 'application/json',
      }).catch(() => undefined)
    }
    throw error
  } finally {
    release()
  }
  // Successful attempts are useful controls alongside failed geometry traces.
  await attachMeasurements(page, testInfo, sampleRequests)
})
