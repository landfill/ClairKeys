import { expect, test, type Page } from '@playwright/test'

/**
 * Every page shares the root SessionProvider, so one page load needs one
 * `/api/auth/session` request (#187). The sign-in page used to ask again with
 * its own getSession(), which doubled the request there and on every protected
 * path that redirects to it.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
  })
})

function countSessionRequests(page: Page) {
  const seen: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/session') seen.push(request.url())
  })
  return seen
}

// The provider fetches once on mount; a late second request would come from a
// component effect, so give effects time to run before counting.
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
}

for (const path of ['/', '/explore', '/auth/signin', '/upload']) {
  test(`a signed-out load of ${path} asks for the session once`, async ({ page }) => {
    const sessionRequests = countSessionRequests(page)
    await page.goto(path)
    await settle(page)
    expect(sessionRequests).toHaveLength(1)
  })
}

test('a signed-in reader on the sign-in page returns to the path with one session request', async ({ page }) => {
  const sessionRequests = countSessionRequests(page)
  await page.route('**/api/auth/session', (route) => route.fulfill({
    json: { user: { id: 'e2e-user', name: 'E2E', email: 'e2e@example.com' }, expires: '2999-01-01T00:00:00.000Z' },
  }))
  await page.goto('/auth/signin?callbackUrl=' + encodeURIComponent('/explore'))
  await expect(page).toHaveURL(/\/explore$/)
  await settle(page)
  expect(sessionRequests).toHaveLength(1)
})
