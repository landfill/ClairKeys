import { expect, test } from '@playwright/test'

/**
 * The page-level playback keys: space plays and pauses, the arrows move five
 * seconds, and neither ever takes a key away from a focused control. jsdom can
 * dispatch the events, but only a real browser shows that space does not also
 * scroll the page or double-activate a focused button.
 */

const animation = {
  version: '1.1', title: '단축키 회귀', composer: 'Authored fixture', duration: 30,
  tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, timeSignature: '4/4',
  notes: Array.from({ length: 24 }, (_, index) => ({
    midi: 60 + (index % 5), start: index * 1.2, duration: 0.8, hand: index % 2 ? 'L' : 'R',
  })),
}

async function prepare(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
  })
  await page.route('**/api/sheet/190', route => route.fulfill({ json: { sheetMusic: {
    id: 190, title: animation.title, composer: animation.composer,
    hasScore: false, isPublic: true, provenance: 'omr', createdAt: '2026-09-27',
    animationDataUrl: '/playback-shortcuts.json',
  } } }))
  await page.route('**/playback-shortcuts.json', route => route.fulfill({ json: animation }))
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/sheet/190')
  await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()
}

const seekValue = (page: import('@playwright/test').Page) =>
  page.getByRole('slider', { name: '재생 위치' }).first().getAttribute('aria-valuenow').then(Number)

test('space plays and pauses from the page, and the arrows move five seconds', async ({ page, browserName }, info) => {
  test.skip(info.project.name.startsWith('Mobile'), 'touch projects have no physical keyboard to press')
  await prepare(page)
  await expect(page.getByRole('note', { name: '키보드 단축키' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '연습 방법과 단축키 보기' })).toHaveAttribute('href', '/learn/practice')

  // Nothing focused: the key belongs to the page.
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Space')

  const started = await page.getByTestId('compact-playback-bar')
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)
  if (!started) {
    // Same allowance as playback-session-transition: only a runner without an
    // audio output may fail to start, and only in firefox.
    expect(browserName, 'space did not start playback in a browser that can').toBe('firefox')
    test.skip(true, 'headless firefox on this runner has no audio output')
  }

  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: '재생', exact: true })).toBeVisible()
  const paused = await seekValue(page)

  await page.keyboard.press('ArrowRight')
  await expect.poll(() => seekValue(page)).toBe(Math.min(30, paused + 5))
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => seekValue(page)).toBe(paused)
  // A playback key never scrolls the page underneath the player.
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('a focused control keeps its own keys', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('Mobile'), 'touch projects have no physical keyboard to press')
  await prepare(page)

  // Arrows on the speed select belong to the select, not the playhead. The
  // setup screen shows the playhead as the first "m:ss" readout.
  const playhead = page.getByTestId('playback-primary-controls').locator('xpath=ancestor::div[contains(@class,"playback-controls")]').locator('span').first()
  await expect(playhead).toHaveText('0:00')
  await page.getByLabel('속도:').focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(300)
  await expect(playhead).toHaveText('0:00')
  await expect(page.getByTestId('compact-playback-bar')).toHaveCount(0)

  // Space on the focused stop button activates stop once — it must not also
  // start playback through the page shortcut.
  const stop = page.getByRole('button', { name: '중지', exact: true })
  await stop.focus()
  await page.keyboard.press('Space')
  await page.waitForTimeout(500)
  await expect(page.getByTestId('compact-playback-bar')).toHaveCount(0)
})

test('links touch users to the practice lesson without an inline keyboard hint', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('Mobile'), 'only the touch projects report a coarse pointer')
  await prepare(page)
  await expect(page.getByRole('note', { name: '키보드 단축키' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '연습 방법과 단축키 보기' })).toHaveAttribute('href', '/learn/practice')
})
