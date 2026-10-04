import { expect, test, type Page } from '@playwright/test'
import { encode } from 'next-auth/jwt'

async function signedIn(page: Page) {
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET ?? 'test-secret', token: { sub: 'history-user', databaseUserId: 'history-user', name: '연습하는 사람' } })
  await page.context().addCookies([{ name: 'next-auth.session-token', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }])
  await page.route('**/api/auth/session**', route => route.fulfill({ json: { user: { id: 'history-user', name: '연습하는 사람' }, expires: '2099-01-01T00:00:00.000Z' } }))
}
const item = { sheetId: 226, title: '다시 연습할 곡', composer: '작곡가', count: 3, totalSeconds: 125, bestPercentage: 42, lastPracticedAt: '2026-10-04T01:00:00Z' }

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated history fixture') } })
})
test('guests can open learn but practice history requires sign-in and the API rejects them', async ({ page, request }) => {
  await page.goto('/learn')
  await page.getByRole('link', { name: '내 연습 기록', exact: true }).click()
  await expect(page).toHaveURL(/\/auth\/signin/)
  const response = await request.get('/api/practice')
  expect(response.status()).toBe(401)
  expect(response.headers()['cache-control']).toBe('private, no-store')
})
test('shows the reader’s song metrics, paginates and links back to the song at 320px', async ({ page }, info) => {
  await signedIn(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/practice?*', route => {
    const current = Number(new URL(route.request().url()).searchParams.get('page'))
    return route.fulfill({ json: { page: current, hasMore: current === 1, items: [{ ...item, title: current === 1 ? item.title : '다음 기록' }] } })
  })
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/practice')
  await expect(page.getByRole('heading', { level: 1, name: '내 연습 기록' })).toBeVisible()
  await expect(page.getByRole('link', { name: item.title })).toHaveAttribute('href', '/sheet/226')
  await expect(page.getByText('3회', { exact: true })).toBeVisible()
  await expect(page.getByText('2분 5초', { exact: true })).toBeVisible()
  await expect(page.getByText('42%', { exact: true })).toBeVisible()
  await expect(page.getByText('최고 재생 위치', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth + 1)).toBe(true)
  await page.getByRole('main').screenshot({ path: info.outputPath('practice-history-mobile.png') })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByRole('main').screenshot({ path: info.outputPath('practice-history-desktop.png') })
  await page.getByRole('button', { name: '다음 페이지' }).click()
  await expect(page.getByRole('link', { name: '다음 기록' })).toBeVisible()
  await expect(page.getByRole('button', { name: '다음 페이지' })).toBeDisabled()
  await page.getByRole('button', { name: '이전 페이지' }).click()
  await expect(page.getByRole('link', { name: item.title })).toBeVisible()
  expect(errors).toEqual([])
})
test('explains an empty history', async ({ page }) => {
  await signedIn(page)
  await page.route('**/api/practice?*', route => route.fulfill({ json: { page: 1, hasMore: false, items: [] } }))
  await page.goto('/practice')
  await expect(page.getByRole('heading', { name: '아직 연습 기록이 없습니다' })).toBeVisible()
  await expect(page.getByRole('link', { name: '연습할 곡 찾기' })).toHaveAttribute('href', '/explore')
})
test('retries a failed request without turning it into an empty history', async ({ page }) => {
  await signedIn(page)
  let attempts = 0
  let unavailable = true
  await page.route('**/api/practice?*', route => { attempts++; return unavailable ? route.fulfill({ status: 500, json: { error: 'Unavailable' } }) : route.fulfill({ json: { page: 1, hasMore: false, items: [item] } }) })
  await page.goto('/practice')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('연습 기록을 불러오지 못했습니다')
  await expect(page.getByText('아직 연습 기록이 없습니다')).toHaveCount(0)
  const beforeRetry = attempts
  unavailable = false
  await page.getByRole('button', { name: '다시 시도' }).click()
  await expect(page.getByRole('link', { name: item.title })).toBeVisible()
  expect(attempts).toBe(beforeRetry + 1)
})
