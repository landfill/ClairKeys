import { expect, test } from '@playwright/test'

/**
 * A signed-out visit to a protected page goes through the next-auth middleware,
 * which hands the sign-in page this site's own absolute URL as `callbackUrl`.
 * The page used to drop it to "/", so the title spoke about uploading on every
 * path and a completed sign-in landed on home instead of where the reader was.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
  })
})

for (const [path, title] of [
  ['/library', '내 악보를 보려면 로그인해 주세요'],
  ['/upload', '악보를 맡기기 전에 로그인해 주세요'],
] as const) {
  test(`keeps ${path} as the return path through the middleware redirect`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(/\/auth\/signin\?callbackUrl=/)
    // The middleware really does pass an absolute URL; that is the case under test.
    const callbackUrl = new URL(page.url()).searchParams.get('callbackUrl')
    expect(callbackUrl).toMatch(/^https?:\/\//)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  })
}

test('still treats another origin as unsafe and falls back to the neutral title', async ({ page }) => {
  await page.goto('/auth/signin?callbackUrl=' + encodeURIComponent('https://evil.example/library'))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ClairKeys에 로그인해 주세요')
})
