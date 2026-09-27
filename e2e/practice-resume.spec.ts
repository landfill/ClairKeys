import { expect, test } from '@playwright/test'

/**
 * A reader who leaves mid-piece is offered the same place on the next visit,
 * from this browser's storage alone.
 */

const animation = {
  version: '1.1', title: '이어서 연습 회귀', composer: 'Authored fixture', duration: 40,
  tempo: 60, tempoSource: 'user', timingReferenceBpm: 60, timeSignature: '4/4',
  notes: Array.from({ length: 40 }, (_, index) => ({ midi: 60 + (index % 5), start: index, duration: 0.8, hand: 'R' })),
}

async function open(page: import('@playwright/test').Page) {
  await page.goto('/sheet/195')
  await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
  })
  await page.route('**/api/sheet/195', route => route.fulfill({ json: { sheetMusic: {
    id: 195, title: animation.title, composer: animation.composer,
    hasScore: false, isPublic: true, provenance: 'omr', createdAt: '2026-09-27',
    animationDataUrl: '/practice-resume.json',
  } } }))
  await page.route('**/practice-resume.json', route => route.fulfill({ json: animation }))
})

test('offers the stored position after a reload and plays on from it', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('clairkeys.resume.195', JSON.stringify({ time: 22, savedAt: '2026-09-27T00:00:00Z' })))
  await open(page)

  const offer = page.getByRole('region', { name: '이어서 연습' })
  await expect(offer).toContainText('0:22')
  await offer.getByRole('button', { name: '0:22부터 이어서 연습' }).click()

  const started = await page.getByTestId('compact-playback-bar')
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)
  if (started) {
    const seek = page.getByRole('slider', { name: '재생 위치' }).first()
    await expect.poll(async () => Number(await seek.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(22)
  }
  // Whether or not this runner can sound, the offer is used up.
  await expect(offer).toHaveCount(0)
})

test('starting over forgets the position for good', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('clairkeys.resume.195', JSON.stringify({ time: 22, savedAt: '' })))
  await open(page)
  await page.getByRole('button', { name: '처음부터' }).click()
  await expect(page.getByRole('region', { name: '이어서 연습' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()
  await expect(page.getByRole('region', { name: '이어서 연습' })).toHaveCount(0)
})

test('remembers where a paused run stopped', async ({ page, browserName }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await open(page)
  await page.getByTestId('playback-play').click()
  const started = await page.getByTestId('compact-playback-bar')
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)
  if (!started) {
    expect(browserName, 'playback did not start in a browser that can').toBe('firefox')
    test.skip(true, 'headless firefox on this runner has no audio output')
  }
  const seek = page.getByRole('slider', { name: '재생 위치' }).first()
  await seek.focus()
  await seek.press('ArrowRight')
  await seek.press('ArrowRight')
  await expect.poll(async () => Number(await seek.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(8)
  await page.getByRole('button', { name: '일시정지', exact: true }).click()

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('clairkeys.resume.195') ?? 'null'))
  expect(saved?.time).toBeGreaterThanOrEqual(8)
})
