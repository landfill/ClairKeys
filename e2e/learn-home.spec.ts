import { expect, test } from '@playwright/test'

test('opens the public learning map without a sign-in redirect', async ({ page }) => {
  const response = await page.goto('/learn')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/learn$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1, name: '배우기' })).toBeVisible()
  await expect(page).toHaveTitle(/배우기/)
  const map = page.getByRole('list', { name: '학습 단계' })
  await expect(map.getByRole('listitem')).toHaveCount(5)
  await expect(map.getByRole('link')).toHaveCount(5)
  await expect(map.getByRole('link', { name: '건반' })).toHaveAttribute('href', '/learn/keyboard')
  await expect(map.getByRole('link', { name: '악보 읽기 1', exact: true })).toHaveAttribute('href', '/learn/reading')
  await expect(map.getByRole('link', { name: '악보 읽기 2', exact: true })).toHaveAttribute('href', '/learn/reading/rhythm')
  await expect(map.getByRole('link', { name: '손' })).toHaveAttribute('href', '/learn/hands')
  await expect(map.getByRole('link', { name: '연습 방법' })).toHaveAttribute('href', '/learn/practice')
  await expect(page.getByText('준비 중', { exact: true })).toHaveCount(0)
  await map.getByRole('link', { name: '건반' }).click()
  await expect(page).toHaveURL(/\/learn\/keyboard$/)
  await expect(page.getByRole('heading', { level: 1, name: '건반' })).toBeVisible()
  await page.getByRole('link', { name: '단계 지도로 돌아가기' }).click()
  await map.getByRole('link', { name: '악보 읽기 1', exact: true }).click()
  await expect(page).toHaveURL(/\/learn\/reading$/)
  await expect(page.getByRole('heading', { level: 1, name: '악보 읽기 1', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '단계 지도로 돌아가기' }).click()
  await map.getByRole('link', { name: '악보 읽기 2', exact: true }).click()
  await expect(page).toHaveURL(/\/learn\/reading\/rhythm$/)
  await expect(page.getByRole('heading', { level: 1, name: '악보 읽기 2', exact: true })).toBeVisible()
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

const CARD_TITLES = ['건반', '악보 읽기 1', '악보 읽기 2', '손', '연습 방법', '첫 곡 코스', '용어 사전', '내 연습 기록']
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

test('makes the whole area of all eight cards hit their own link', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/learn')
  const cards = page.locator('[data-learn-card]')
  await expect(cards).toHaveCount(8)
  for (const [index, title] of CARD_TITLES.entries()) {
    const card = cards.nth(index)
    await expect(card.getByRole('heading', { level: 3, name: title, exact: true })).toBeVisible()
    // stretched link는 링크의 getBoundingClientRect를 늘리지 않는다. 카드 크기와 모서리 hit-test로 본다.
    const result = await card.evaluate(node => {
      node.scrollIntoView({ block: 'center' })
      const link = node.querySelector('a[href]')
      const rect = node.getBoundingClientRect()
      const inset = 8
      const points = [
        [rect.left + inset, rect.top + inset], [rect.right - inset, rect.top + inset],
        [rect.left + inset, rect.bottom - inset], [rect.right - inset, rect.bottom - inset],
      ]
      return {
        width: rect.width,
        height: rect.height,
        hits: points.map(([x, y]) => {
          const hit = document.elementFromPoint(x, y)
          return Boolean(link && hit && (hit === link || link.contains(hit)))
        }),
      }
    })
    expect(result.width, `${title} 카드 너비`).toBeGreaterThanOrEqual(44)
    expect(result.height, `${title} 카드 높이`).toBeGreaterThanOrEqual(44)
    expect(result.hits, `${title} 카드 모서리 hit-test`).toEqual([true, true, true, true])
  }
})

test('opens a lesson by clicking the bottom-right corner of its card', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/learn')
  const card = page.locator('[data-learn-card]').filter({ has: page.getByRole('heading', { level: 3, name: '건반', exact: true }) })
  const box = await card.boundingBox()
  expect(box).not.toBeNull()
  await card.click({ position: { x: box!.width - 8, y: box!.height - 8 } })
  await expect(page).toHaveURL(/\/learn\/keyboard$/)
  await expect(page.getByRole('heading', { level: 1, name: '건반' })).toBeVisible()
})

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`stops Tab exactly once per card at ${viewport.width}x${viewport.height}`, async ({ page, browserName }) => {
    await page.setViewportSize(viewport)
    await page.goto('/learn')
    const cards = page.locator('[data-learn-card]')
    await expect(cards).toHaveCount(8)
    for (let index = 0; index < 8; index += 1) {
      await expect(cards.nth(index).locator(FOCUSABLE), `${CARD_TITLES[index]} 카드의 포커스 가능한 요소`).toHaveCount(1)
    }
    // WebKit은 macOS 설정에 따라 링크를 Tab 순서에서 제외한다(위 Tab·Enter 테스트와 같은 계약).
    if (browserName === 'webkit') return
    const stops: number[] = []
    for (let step = 0; step < 80; step += 1) {
      await page.keyboard.press('Tab')
      const stop = await page.evaluate(() => {
        const active = document.activeElement
        const card = active?.closest('[data-learn-card]')
        return card ? Array.from(document.querySelectorAll('[data-learn-card]')).indexOf(card) : -1
      })
      if (stop >= 0) stops.push(stop)
      else if (stops.length > 0) break
    }
    expect(stops).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })
}

test('shows the keyboard focus on the card container', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/learn')
  const card = page.locator('[data-learn-card]').first()
  const link = card.getByRole('link', { name: '건반', exact: true })
  const ring = () => card.evaluate(node => {
    const style = getComputedStyle(node)
    return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor} | ${style.boxShadow}`
  })
  const before = await ring()
  let focused = false
  for (let step = 0; step < 40 && !focused; step += 1) {
    await page.keyboard.press('Tab')
    focused = await link.evaluate(node => node === document.activeElement)
  }
  if (!focused) {
    expect(browserName, '건반 카드 링크에 키보드로 도달하지 못함').toBe('webkit')
    await link.focus()
  }
  await expect(link).toBeFocused()
  await expect.poll(ring).not.toBe(before)
})

