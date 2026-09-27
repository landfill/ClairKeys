import { expect, test } from '@playwright/test'

/**
 * One-hand practice: the other hand's falling notes stay visible but faded,
 * and the choice survives into a real playback session.
 */

const animation = {
  version: '1.1', title: '한 손 연습 회귀', composer: 'Authored fixture', duration: 12,
  tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, timeSignature: '4/4',
  notes: Array.from({ length: 10 }, (_, index) => ({
    midi: index % 2 ? 48 + (index % 5) : 72 + (index % 5), start: 0.2 + index * 0.4, duration: 0.6,
    hand: index % 2 ? 'L' : 'R',
  })),
}

async function prepare(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
  })
  await page.route('**/api/sheet/191', route => route.fulfill({ json: { sheetMusic: {
    id: 191, title: animation.title, composer: animation.composer,
    hasScore: false, isPublic: true, provenance: 'omr', createdAt: '2026-09-27',
    animationDataUrl: '/hand-practice.json',
  } } }))
  await page.route('**/hand-practice.json', route => route.fulfill({ json: animation }))
  await page.goto('/sheet/191')
  await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()
}

test('fades the other hand and offers to silence it', async ({ page }) => {
  await prepare(page)
  const group = page.getByRole('group', { name: '연습할 손' })
  await expect(group.getByRole('button', { name: '양손' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-dimmed]')).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: '다른 손 소리 듣기' })).toHaveCount(0)

  await group.getByRole('button', { name: '오른손' }).click()
  await expect(group.getByRole('button', { name: '오른손' })).toHaveAttribute('aria-pressed', 'true')

  // Every visible left-hand block is faded, and no right-hand block is.
  const left = page.locator('[data-hand="L"]')
  await expect(left.first()).toBeVisible()
  const leftCount = await left.count()
  await expect(page.locator('[data-hand="L"][data-dimmed]')).toHaveCount(leftCount)
  await expect(page.locator('[data-hand="R"][data-dimmed]')).toHaveCount(0)
  expect(Number(await left.first().evaluate(node => getComputedStyle(node).opacity))).toBeLessThan(0.5)

  const audible = page.getByRole('checkbox', { name: '다른 손 소리 듣기' })
  await expect(audible).toBeChecked()
  await audible.uncheck()
  await expect(audible).not.toBeChecked()

  // No horizontal overflow from the new row on a narrow phone.
  await page.setViewportSize({ width: 320, height: 800 })
  const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
  expect(widths[0]).toBeLessThanOrEqual(widths[1] + 1)
})
