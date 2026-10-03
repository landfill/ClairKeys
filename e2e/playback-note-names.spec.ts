import { expect, test, type Page } from '@playwright/test'

const animation = {
  version: '1.1', title: '계이름 표시 회귀', composer: 'fixture', duration: 30,
  tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, timeSignature: '4/4',
  notes: Array.from({ length: 12 }, (_, i) => [
    { midi: 60 + i % 3 * 2, start: i * 2, duration: 1.5, hand: 'R', finger: 1 },
    { midi: 48 + i % 3 * 2, start: i * 2, duration: 1.5, hand: 'L', finger: 5 },
  ]).flat(),
}
const names = (page: Page) => page.locator('[data-note-label]')
const toggle = (page: Page) => page.getByRole('checkbox', { name: '건반에 계이름 표시' })

async function prepare(page: Page) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated note names fixture') }
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: undefined })
  })
  await page.route('**/api/sheet/213', route => route.fulfill({ json: { sheetMusic: {
    id: 213, title: animation.title, composer: animation.composer, hasScore: false,
    isPublic: true, provenance: 'omr', createdAt: '2026-10-04', animationDataUrl: '/note-names.json',
  } } }))
  await page.route('**/note-names.json', route => route.fulfill({ json: animation }))
  await page.goto('/sheet/213')
  await expect(page.getByTestId('playback-play')).toBeEnabled()
}
async function start(page: Page, browserName: string) {
  await page.getByTestId('playback-play').click()
  const started = await page.getByTestId('compact-playback-bar').waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)
  if (!started) {
    expect(browserName, '재생이 가능한 브라우저에서 시작하지 못함').toBe('firefox')
    test.skip(true, 'headless firefox on this runner has no audio output')
  }
}

test('defaults off, remembers on after reload and keeps labels during playback', async ({ page, browserName }) => {
  await prepare(page)
  await expect(toggle(page)).not.toBeChecked()
  await expect(names(page)).toHaveCount(0)
  await toggle(page).check()
  await expect.poll(() => names(page).count()).toBeGreaterThan(0)
  await page.reload()
  await expect(toggle(page)).toBeChecked()
  await expect.poll(() => names(page).count()).toBeGreaterThan(0)
  await start(page, browserName)
  await expect(toggle(page)).toHaveCount(0)
  await expect.poll(() => page.locator('[data-note-label]:visible').count()).toBeGreaterThan(0)
  await expect.poll(async () => Number(await page.getByRole('slider', { name: '재생 위치' }).getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(1)
})

test('can toggle both ways when preference writes are blocked', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('storage blocked') } })
  await prepare(page)
  await toggle(page).check()
  await expect.poll(() => names(page).count()).toBeGreaterThan(0)
  await toggle(page).uncheck()
  await expect(names(page)).toHaveCount(0)
})

test('decorative labels do not intercept wait-mode key clicks', async ({ page, browserName }) => {
  await prepare(page)
  await toggle(page).check()
  await page.getByRole('checkbox', { name: '기다리기 모드' }).check()
  await start(page, browserName)
  await expect(page.getByTestId('wait-prompt')).toContainText('남은 음 2개')
  await page.locator('[data-midi="60"]').click()
  await expect(page.getByTestId('wait-prompt')).toContainText('남은 음 1개')
  await page.locator('[data-midi="48"]').click()
  await expect.poll(async () => Number(await page.getByRole('slider', { name: '재생 위치' }).getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(1)
})

for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
  test(`keeps labels inside the keyboard without changing geometry at ${viewport.width}x${viewport.height}`, async ({ page, browserName }) => {
    await page.setViewportSize(viewport)
    await prepare(page)
    await toggle(page).scrollIntoViewIfNeeded()
    const keyboard = page.locator('[data-testid="playback-box"] > div:last-child')
    const lane = page.locator('[data-testid="playback-box"] > div:first-child')
    const before = { keyboard: await keyboard.boundingBox(), lane: await lane.boundingBox() }
    await toggle(page).check()
    expect({ keyboard: await keyboard.boundingBox(), lane: await lane.boundingBox() }).toEqual(before)
    const inside = async () => {
      const result = await keyboard.evaluate(region => {
        const bounds = region.getBoundingClientRect()
        const labels = [...region.querySelectorAll('[data-note-label]')].map(node => node.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0)
        return { count: labels.length, inside: labels.every(rect => rect.left >= bounds.left && rect.right <= bounds.right && rect.top >= bounds.top && rect.bottom <= bounds.bottom) }
      })
      expect(result.count).toBeGreaterThan(0)
      expect(result.inside).toBe(true)
    }
    await inside()
    await toggle(page).uncheck()
    await start(page, browserName)
    await page.getByRole('button', { name: '일시정지', exact: true }).click()
    const playingOff = { keyboard: await keyboard.boundingBox(), lane: await lane.boundingBox() }
    await page.getByRole('button', { name: '정지', exact: true }).click()
    await toggle(page).check()
    await start(page, browserName)
    await page.getByRole('button', { name: '일시정지', exact: true }).click()
    expect({ keyboard: await keyboard.boundingBox(), lane: await lane.boundingBox() }).toEqual(playingOff)
    await inside()
  })
}
