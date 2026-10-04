import { expect, test } from '@playwright/test'

test('opens the public learning map without a sign-in redirect', async ({ page }) => {
  const response = await page.goto('/learn')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/learn$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1, name: '배우기' })).toBeVisible()
  await expect(page).toHaveTitle(/배우기/)
  const map = page.getByRole('list', { name: '학습 단계' })
  await expect(map.getByRole('listitem')).toHaveCount(4)
  await expect(map.getByRole('link')).toHaveCount(4)
  await expect(map.getByRole('link', { name: '건반' })).toHaveAttribute('href', '/learn/keyboard')
  await expect(map.getByRole('link', { name: '악보 읽기', exact: true })).toHaveAttribute('href', '/learn/reading')
  await expect(map.getByRole('link', { name: '손' })).toHaveAttribute('href', '/learn/hands')
  await expect(map.getByRole('link', { name: '연습 방법' })).toHaveAttribute('href', '/learn/practice')
  await expect(page.getByText('준비 중', { exact: true })).toHaveCount(0)
  await map.getByRole('link', { name: '건반' }).click()
  await expect(page).toHaveURL(/\/learn\/keyboard$/)
  await expect(page.getByRole('heading', { level: 1, name: '건반' })).toBeVisible()
  await page.getByRole('link', { name: '단계 지도로 돌아가기' }).click()
  await map.getByRole('link', { name: '악보 읽기', exact: true }).click()
  await expect(page).toHaveURL(/\/learn\/reading$/)
  await expect(page.getByRole('heading', { level: 1, name: '악보 읽기', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '단계 지도로 돌아가기' }).click()
  await map.getByRole('link', { name: '손' }).click()
  await expect(page).toHaveURL(/\/learn\/hands$/)
  await expect(page.getByRole('heading', { level: 1, name: '손', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '단계 지도로 돌아가기' }).click()
  await map.getByRole('link', { name: '연습 방법' }).click()
  await expect(page).toHaveURL(/\/learn\/practice$/)
  await expect(page.getByRole('heading', { level: 1, name: '연습 방법' })).toBeVisible()
})

test('opens learning from the desktop menu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  await page.getByRole('navigation', { name: '주요', exact: true }).getByRole('link', { name: '배우기' }).click()
  await expect(page).toHaveURL(/\/learn$/)
})

test('reaches learning with Tab and Enter alone', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  const link = page.getByRole('navigation', { name: '주요', exact: true }).getByRole('link', { name: '배우기' })
  await expect(link).toBeVisible()
  let focused = false
  for (let step = 0; step < 40 && !focused; step += 1) {
    await page.keyboard.press('Tab')
    focused = await link.evaluate(node => node === document.activeElement)
  }
  // WebKit은 macOS 설정에 따라 링크를 Tab 순서에서 제외한다(기존 탐색 E2E와 같은 계약).
  if (!focused) {
    expect(browserName, '배우기 링크에 키보드로 도달하지 못함').toBe('webkit')
    await link.focus()
  }
  await expect(link).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/learn$/)
})

test('opens learning from the mobile menu and fits 320 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await page.getByRole('navigation', { name: '주요 (모바일)', exact: true }).getByRole('link', { name: '배우기' }).click()
  await expect(page).toHaveURL(/\/learn$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('navigation', { name: '주요 (모바일)', exact: true })).toHaveCount(0)
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
})
