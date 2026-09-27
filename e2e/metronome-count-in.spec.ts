import { expect, test } from '@playwright/test'

/**
 * The metronome and the count-in schedule real Web Audio clicks on the
 * playback clock. OscillatorNode.start is wrapped to record each click's pitch
 * (1320 Hz beat, 1760 Hz accent), so the test hears nothing but can count what
 * the browser was asked to play.
 */

const animation = (tempoSource: 'user' | 'score') => ({
  version: '1.1', title: `메트로놈 ${tempoSource}`, composer: 'Authored fixture', duration: 12,
  tempo: 120, tempoSource, timingReferenceBpm: 120, timeSignature: '4/4',
  notes: Array.from({ length: 16 }, (_, index) => ({ midi: 60 + (index % 5), start: index * 0.5, duration: 0.4, hand: 'R' })),
})

async function prepare(page: import('@playwright/test').Page, tempoSource: 'user' | 'score') {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
    const clicks: number[] = []
    ;(window as unknown as { __clicks: number[] }).__clicks = clicks
    const start = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (this: OscillatorNode, ...args: [number?]) {
      const hz = this.frequency.value
      if (hz === 1320 || hz === 1760) clicks.push(hz)
      return start.apply(this, args)
    }
    try { localStorage.clear() } catch { /* storage disabled */ }
  })
  const id = tempoSource === 'user' ? 192 : 193
  await page.route(`**/api/sheet/${id}`, route => route.fulfill({ json: { sheetMusic: {
    id, title: `메트로놈 ${tempoSource}`, composer: 'Authored fixture',
    hasScore: false, isPublic: true, provenance: 'omr', createdAt: '2026-09-27',
    animationDataUrl: `/metronome-${tempoSource}.json`,
  } } }))
  await page.route(`**/metronome-${tempoSource}.json`, route => route.fulfill({ json: animation(tempoSource) }))
  await page.goto(`/sheet/${id}`)
  await expect(page.getByRole('heading', { name: `메트로놈 ${tempoSource}` })).toBeVisible()
}

const clickCount = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __clicks: number[] }).__clicks.length)

async function startOrSkip(page: import('@playwright/test').Page, browserName: string) {
  await page.getByTestId('playback-play').click()
  const started = await page.getByTestId('compact-playback-bar')
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)
  if (!started) {
    expect(browserName, 'playback did not start in a browser that can').toBe('firefox')
    test.skip(true, 'headless firefox on this runner has no audio output')
  }
}

test('counts one bar in, holding the picture, before the music starts', async ({ page, browserName }) => {
  await prepare(page, 'user')
  await page.getByRole('checkbox', { name: '시작 전 준비 박자' }).check()
  await startOrSkip(page, browserName)

  // At 120 BPM a 4/4 count-in lasts two seconds; the countdown shows over the notes.
  await expect(page.getByTestId('count-in')).toBeVisible()
  const seek = page.getByRole('slider', { name: '재생 위치' }).first()
  await expect(seek).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByTestId('count-in')).toBeHidden({ timeout: 6000 })
  expect(await clickCount(page)).toBe(4)
  await expect.poll(async () => Number(await seek.getAttribute('aria-valuenow')), { timeout: 5000 }).toBeGreaterThan(0)
})

test('clicks on every beat while the metronome is on', async ({ page, browserName }) => {
  await prepare(page, 'user')
  await page.getByRole('checkbox', { name: '메트로놈' }).check()
  await startOrSkip(page, browserName)
  // Scheduled 1.5 s ahead at 120 BPM: at least three beats are queued at once.
  await expect.poll(() => clickCount(page), { timeout: 5000 }).toBeGreaterThanOrEqual(3)
})

test('refuses the metronome for a score-read tempo without the measure map', async ({ page }) => {
  await prepare(page, 'score')
  await expect(page.getByRole('checkbox', { name: '메트로놈' })).toBeDisabled()
  await expect(page.getByText(/박자 정보가 없어/)).toBeVisible()
})

test('follows the score measure map for a score-read tempo, accenting each downbeat', async ({ page, browserName }) => {
  // Two 4/4 bars at 120 BPM, then the tempo halves: the clicks must follow.
  const measures = [
    { partIndex: 0, measureIndex: 0, start: 0, end: 2, startQuarter: 0, endQuarter: 4 },
    { partIndex: 0, measureIndex: 1, start: 2, end: 6, startQuarter: 4, endQuarter: 8 },
  ]
  let scoreRequests = 0
  await page.route('**/api/sheet/194/score', route => {
    scoreRequests += 1
    return route.fulfill({ json: {
      version: 1, timingReferenceBpm: 120, measures, notes: [],
      musicxml: '<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list><part id="P1"><measure number="1"/></part></score-partwise>',
    } })
  })
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
    const clicks: number[] = []
    ;(window as unknown as { __clicks: number[] }).__clicks = clicks
    const start = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (this: OscillatorNode, ...args: [number?]) {
      const hz = this.frequency.value
      if (hz === 1320 || hz === 1760) clicks.push(hz)
      return start.apply(this, args)
    }
    try { localStorage.clear() } catch { /* storage disabled */ }
  })
  await page.route('**/api/sheet/194', route => route.fulfill({ json: { sheetMusic: {
    id: 194, title: '메트로놈 악보', composer: 'Authored fixture', hasScore: true,
    isPublic: true, provenance: 'omr', createdAt: '2026-09-27', animationDataUrl: '/metronome-score.json',
  } } }))
  await page.route('**/metronome-score.json', route => route.fulfill({ json: { ...animation('score'), title: '메트로놈 악보', duration: 6 } }))
  await page.goto('/sheet/194')
  await expect(page.getByRole('heading', { name: '메트로놈 악보' })).toBeVisible()

  // Offered because the measure map may still arrive; switching it on fetches it.
  const metronome = page.getByRole('checkbox', { name: '메트로놈' })
  await expect(metronome).toBeEnabled()
  await metronome.check()
  await expect.poll(() => scoreRequests).toBe(1)
  await startOrSkip(page, browserName)

  // The first bar's four quick beats are queued at once (1.5 s look-ahead):
  // accent first, then plain beats.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __clicks: number[] }).__clicks.slice(0, 3)), { timeout: 5000 })
    .toEqual([1760, 1320, 1320])
})
