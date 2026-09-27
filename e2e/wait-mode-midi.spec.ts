import { expect, test } from '@playwright/test'

/**
 * Wait mode stops on each step until its keys are pressed, from a MIDI piano
 * or the on-screen keys. Web MIDI is replaced by a fake input the test drives
 * through window.__pressMidi, so the path from note-on to release is real.
 */

const animation = {
  version: '1.1', title: '기다리기 모드 회귀', composer: 'Authored fixture', duration: 6,
  tempo: 60, tempoSource: 'user', timingReferenceBpm: 60, timeSignature: '4/4',
  notes: [
    { midi: 60, start: 0.5, duration: 0.5, hand: 'R' },
    { midi: 64, start: 1.5, duration: 0.5, hand: 'R' },
    { midi: 67, start: 1.5, duration: 0.5, hand: 'R' },
    { midi: 72, start: 3, duration: 0.5, hand: 'R' },
  ],
}

async function prepare(page: import('@playwright/test').Page, withMidi: boolean) {
  await page.addInitScript((midi: boolean) => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
    if (!midi) {
      Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: undefined })
      return
    }
    const input = { name: 'Test Piano', onmidimessage: null as null | ((event: { data: Uint8Array }) => void) }
    ;(window as unknown as { __pressMidi: (note: number) => void }).__pressMidi = note =>
      input.onmidimessage?.({ data: new Uint8Array([0x90, note, 80]) })
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      configurable: true,
      value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }),
    })
  }, withMidi)
  await page.route('**/api/sheet/197', route => route.fulfill({ json: { sheetMusic: {
    id: 197, title: animation.title, composer: animation.composer,
    hasScore: false, isPublic: true, provenance: 'omr', createdAt: '2026-09-27',
    animationDataUrl: '/wait-mode.json',
  } } }))
  await page.route('**/wait-mode.json', route => route.fulfill({ json: animation }))
  await page.goto('/sheet/197')
  await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()
}

async function startOrSkip(page: import('@playwright/test').Page, browserName: string) {
  await page.getByTestId('playback-play').click()
  const started = await page.getByTestId('compact-playback-bar')
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)
  if (!started) {
    expect(browserName, 'playback did not start in a browser that can').toBe('firefox')
    test.skip(true, 'headless firefox on this runner has no audio output')
  }
}

test('waits on each step and moves on when a MIDI piano plays it', async ({ page, browserName }) => {
  await prepare(page, true)
  await page.getByRole('checkbox', { name: '기다리기 모드' }).check()
  await expect(page.getByText(/MIDI 연결됨: Test Piano/)).toBeVisible()
  await startOrSkip(page, browserName)

  const prompt = page.getByTestId('wait-prompt')
  await expect(prompt).toContainText('남은 음 1개')
  // The clock holds on the step while it waits.
  await page.waitForTimeout(800)
  await expect(prompt).toContainText('남은 음 1개')

  await page.evaluate(() => (window as unknown as { __pressMidi: (n: number) => void }).__pressMidi(61)) // wrong key
  await expect(prompt).toContainText('남은 음 1개')
  await page.evaluate(() => (window as unknown as { __pressMidi: (n: number) => void }).__pressMidi(60))
  // Next step is a two-note chord.
  await expect(prompt).toContainText('남은 음 2개')
  await page.evaluate(() => (window as unknown as { __pressMidi: (n: number) => void }).__pressMidi(67))
  await expect(prompt).toContainText('남은 음 1개')
  await page.evaluate(() => (window as unknown as { __pressMidi: (n: number) => void }).__pressMidi(64))
  // The chord is done: the piece runs on through the gap before the next step…
  await expect(prompt).toBeHidden()
  // …and stops again on the single C6 at 3 s.
  await expect(prompt).toContainText('남은 음 1개', { timeout: 5000 })
  const seek = page.getByRole('slider', { name: '재생 위치' }).first()
  await expect(seek).toHaveAttribute('aria-valuenow', '3')
})

test('plays with the on-screen keys where the browser has no MIDI', async ({ page, browserName }) => {
  await prepare(page, false)
  await page.getByRole('checkbox', { name: '기다리기 모드' }).check()
  await expect(page.getByText(/MIDI를 지원하지 않습니다/)).toBeVisible()
  await startOrSkip(page, browserName)

  const prompt = page.getByTestId('wait-prompt')
  await expect(prompt).toContainText('남은 음 1개')
  await page.locator('[data-midi="60"]').dispatchEvent('pointerdown')
  await expect(prompt).toContainText('남은 음 2개')
})
