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

for (const path of ['/', '/explore', '/learn', '/learn/keyboard', '/learn/reading', '/learn/reading/rhythm', '/learn/hands', '/learn/practice']) {
  test(`${path} writes nothing to the console log`, async ({ page }) => {
    const logs = collectLogs(page)
    await page.goto(path)
    await settle(page)
    expect(logs).toEqual([])
  })
}

/**
 * The sheet fixture, served at the browser-context level (#222).
 *
 * The service worker claims the page as soon as it activates (`skipWaiting` +
 * `clients.claim` in `public/sw.js`) and handles every non-API path. Once it is in
 * control the animation request leaves from the worker, and `page.route` never sees
 * a worker's request: the real server answered 404 and the sheet title never
 * rendered, whenever the worker won the race against the page's own fetches. Routes
 * on the context also answer requests made by the worker, so the fixture is served
 * either way and the worker stays on, which this file needs (it guards the
 * registration log, D-093).
 */
async function serveSheet(page: Page) {
  const context = page.context()
  await context.route('**/api/sheet/188', (route) => route.fulfill({ json: { sheetMusic: {
    id: 188, title: animation.title, composer: animation.composer, hasScore: false, isPublic: true,
    provenance: 'omr', createdAt: '2026-09-29', animationDataUrl: '/console-quiet-animation.json',
  } } }))
  await context.route('**/console-quiet-animation.json', (route) => route.fulfill({ json: animation }))
}

test('a sheet does not print its animation file location or contents', async ({ page }) => {
  const logs = collectLogs(page)
  await serveSheet(page)
  await page.goto('/sheet/188')
  await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()
  await settle(page)
  expect(logs).toEqual([])
})

// The race in #222 made deterministic: open the sheet only after the worker controls
// the tab, which is what a returning visitor's browser does on every load.
test('a sheet still loads its fixture once the service worker controls the page', async ({ page }, info) => {
  test.skip(!['chromium', 'Mobile Chrome'].includes(info.project.name), 'the flake was seen on Chromium, where the worker takes control')
  const logs = collectLogs(page)
  const animationResponses: boolean[] = []
  page.on('response', (response) => {
    if (new URL(response.url()).pathname === '/console-quiet-animation.json') animationResponses.push(response.fromServiceWorker())
  })
  await serveSheet(page)
  await page.goto('/')
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await page.goto('/sheet/188')
  await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()
  // Proves the case was exercised: the animation request went through the worker.
  expect(animationResponses).toEqual([true])
  await settle(page)
  expect(logs).toEqual([])
})
