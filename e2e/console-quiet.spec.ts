import { expect, test, type Page } from '@playwright/test'

/**
 * Production pages printed development logs to the reader's console (#188):
 * the service worker registration on every page, and on a sheet the Storage
 * URL of its animation file with the first 200 characters of that file. A page
 * load may still report warnings and errors, but writes no `log` messages.
 */

const animation = {
  version: '1.1', title: '콘솔 회귀', composer: 'Generated fixture', duration: 8, tempo: 60,
  notes: [
    { midi: 60, start: 0, duration: 4, hand: 'R' },
    { midi: 48, start: 4, duration: 4, hand: 'L' },
  ],
}

function collectLogs(page: Page) {
  const logs: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'log') logs.push(message.text())
  })
  return logs
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
}

for (const path of ['/', '/explore', '/learn', '/learn/practice']) {
  test(`${path} writes nothing to the console log`, async ({ page }) => {
    const logs = collectLogs(page)
    await page.goto(path)
    await settle(page)
    expect(logs).toEqual([])
  })
}

test('a sheet does not print its animation file location or contents', async ({ page }) => {
  const logs = collectLogs(page)
  await page.route('**/api/sheet/188', (route) => route.fulfill({ json: { sheetMusic: {
    id: 188, title: animation.title, composer: animation.composer, hasScore: false, isPublic: true,
    provenance: 'omr', createdAt: '2026-09-29', animationDataUrl: '/console-quiet-animation.json',
  } } }))
  await page.route('**/console-quiet-animation.json', (route) => route.fulfill({ json: animation }))
  await page.goto('/sheet/188')
  await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()
  await settle(page)
  expect(logs).toEqual([])
})
