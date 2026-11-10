import { expect, test, type Page } from '@playwright/test'
import { encode } from 'next-auth/jwt'
import { healthySnapshotFixture, snapshotFixture } from '../fixtures/omr-monitor'

const operatorEmail = 'omr-pilot-e2e@example.test'

async function signIn(page: Page, operator: boolean) {
  const email = operator ? operatorEmail : 'ordinary@example.test'
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET ?? 'test-secret',
    token: { sub: 'monitor-e2e', databaseUserId: 'monitor-e2e', email, name: '운영 확인' } })
  await page.context().addCookies([{ name: 'next-auth.session-token', value: token,
    domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }])
  await page.route('**/api/auth/session**', route => route.fulfill({ json: {
    user: { id: 'monitor-e2e', email, name: '운영 확인' }, expires: '2099-01-01T00:00:00.000Z',
  } }))
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
  })
})

test('direct page and API access refuse a non-operator', async ({ page }) => {
  await signIn(page, false)
  await page.goto('/admin/omr')
  await expect(page.getByRole('heading', { name: 'OMR 모니터링', exact: true })).toHaveCount(0)
  const response = await page.request.get('/api/admin/omr')
  expect(response.status()).toBe(403)
  expect(response.headers()['cache-control']).toContain('no-store')
})

test('a guest cannot read the monitor API', async ({ request }) => {
  expect((await request.get('/api/admin/omr')).status()).toBe(401)
})

test('operator sees fixture data, partial collection and expired access clearly', async ({ page }, info) => {
  await signIn(page, true)
  let denied = false
  await page.route('**/api/admin/omr', route => route.fulfill(denied ? { status: 403, json: { error: 'access_denied' } } : {
    json: { checkedAt: new Date().toISOString(), webSha: 'b'.repeat(40),
      health: { status: 'ok', latencyMs: 21 }, monitor: { status: 'ok', snapshot: snapshotFixture() } },
  }))
  await page.goto('/admin/omr')
  await expect(page.getByRole('heading', { name: 'OMR 모니터링', exact: true })).toBeVisible()
  await expect(page.getByText('aaaaaaaa', { exact: true })).toBeVisible()
  await expect(page.getByText('호스트 수집기·읽기 전용 마운트 활성화 필요', { exact: false })).toBeVisible()
  const summary = page.getByRole('region', { name: '종합 상태' })
  await expect(summary.getByText('주의', { exact: true })).toBeVisible()
  await expect(summary.getByText('VM 자원을 수집하지 못함')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('monitor-fixture.png'), fullPage: true })
  denied = true
  const refresh = page.getByRole('button', { name: '새로고침', exact: true })
  await refresh.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert').filter({ hasText: '운영자 권한을 확인할 수 없습니다' })).toBeVisible()
  await expect(page.getByText('aaaaaaaa', { exact: true })).toHaveCount(0)
})

test('operator sees a healthy server at a glance', async ({ page }, info) => {
  await signIn(page, true)
  await page.route('**/api/admin/omr', route => route.fulfill({
    json: {
      checkedAt: new Date().toISOString(), webSha: 'b'.repeat(40),
      health: { status: 'ok', latencyMs: 21 },
      monitor: { status: 'ok', snapshot: healthySnapshotFixture() },
    },
  }))
  await page.goto('/admin/omr')
  await expect(page.getByRole('region', { name: '종합 상태' }).getByText('정상', { exact: true })).toBeVisible()
  await expect(page.getByRole('meter')).toHaveCount(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('monitor-healthy.png'), fullPage: true })
})

test('operator menu link is reachable on desktop and mobile', async ({ page }, info) => {
  await signIn(page, true)
  await page.goto('/')
  if (info.project.name.startsWith('Mobile')) {
    await page.getByRole('button', { name: '메뉴 열기' }).click()
  } else {
    await page.getByRole('button', { name: /운영 확인 계정 메뉴/ }).click()
  }
  const link = page.getByRole('link', { name: 'OMR 모니터링', exact: true })
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.getByRole('heading', { name: 'OMR 모니터링', exact: true })).toBeVisible()
})
