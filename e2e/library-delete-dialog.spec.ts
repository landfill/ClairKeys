import { expect, test, type Page } from '@playwright/test'
import { encode } from 'next-auth/jwt'

test.use({ serviceWorkers: 'block' })

const sample = {
  id: 27,
  title: '긴 제목의 악보 — Clair de Lune 연습용 편곡',
  composer: 'Claude Debussy',
  userId: 'e2e-user',
  categoryId: 1,
  category: { id: 1, name: '클래식', userId: 'e2e-user', createdAt: '2026-09-01T00:00:00.000Z' },
  isPublic: false,
  provenance: 'omr',
  availability: 'ready',
  animationDataUrl: '/sample.json',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
}

async function fixture(page: Page) {
  const secret = process.env.NEXTAUTH_SECRET ?? 'test-secret'
  const token = await encode({ secret, token: { sub: 'e2e-user', name: '연습하는 사람', databaseUserId: 'e2e-user' } })
  await page.context().addCookies([{ name: 'next-auth.session-token', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }])
  await page.route('**/api/auth/session**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'e2e-user', name: '연습하는 사람' }, expires: '2099-01-01T00:00:00.000Z' }) }))
  await page.route('**/api/categories**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([sample.category]) }))
  await page.route(url => url.pathname === '/api/sheet', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, sheetMusic: [sample] }) }))
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }]) {
  test(`delete confirmation is legible and safe at ${viewport.width}px`, async ({ page }) => {
    await fixture(page)
    await page.setViewportSize(viewport)
    let deleteCalls = 0
    await page.route('**/api/sheet/27', route => {
      if (route.request().method() === 'DELETE') {
        deleteCalls++
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"temporary"}' })
      }
      return route.continue()
    })
    await page.goto('/library')
    await page.getByRole('button', { name: `${sample.title} 삭제` }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(sample.title)
    await expect(dialog).toContainText(sample.composer)
    await expect(dialog).toContainText('클래식')
    await expect(dialog.getByRole('button', { name: '악보 영구 삭제' })).toBeDisabled()
    const bounds = await dialog.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1)
    if (process.env.UI_CAPTURE_DIR) {
      await page.screenshot({ path: `${process.env.UI_CAPTURE_DIR}/delete-dialog-${viewport.width}.png` })
    }
    await dialog.getByRole('button', { name: '취소' }).click()
    expect(deleteCalls).toBe(0)
    await expect(page.getByRole('button', { name: `${sample.title} 삭제` })).toBeFocused()
    await page.getByRole('button', { name: `${sample.title} 삭제` }).click()
    await dialog.getByRole('checkbox', { name: '영구 삭제를 이해했습니다' }).check()
    await dialog.getByRole('button', { name: '악보 영구 삭제' }).click()
    await expect(dialog.getByRole('alert')).toContainText('삭제하지 못했습니다')
    expect(deleteCalls).toBe(1)
    await expect(dialog).toBeVisible()
  })
}

test('keeps keyboard focus inside the dialog while DELETE is pending', async ({ page }) => {
  await fixture(page)
  let finish!: () => void
  const pending = new Promise<void>(resolve => { finish = resolve })
  await page.route('**/api/sheet/27', async route => {
    if (route.request().method() !== 'DELETE') return route.continue()
    await pending
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"temporary"}' })
  })
  await page.goto('/library')
  await page.getByRole('button', { name: `${sample.title} 삭제` }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox', { name: '영구 삭제를 이해했습니다' }).check()
  await dialog.getByRole('button', { name: '악보 영구 삭제' }).click()
  await expect(dialog.getByRole('button', { name: '처리 중…' })).toBeDisabled()
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true)
  await page.keyboard.press('Tab')
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  finish()
  await expect(dialog.getByRole('alert')).toContainText('삭제하지 못했습니다')
})
