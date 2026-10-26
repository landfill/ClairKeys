import { expect, test } from '@playwright/test'

const topics = ['재생 화면 둘러보기', '느리게 시작', '한 손씩', 'A-B 구간 반복', '기다리기 모드', '메트로놈', '키보드 단축키']

for (const width of [320, 1280]) {
  test(`opens the public practice lesson and fits ${width} CSS pixels`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const response = await page.goto('/learn/practice')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/learn\/practice$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1, name: '연습 방법' })).toBeVisible()
    await expect(page).toHaveTitle(/연습 방법/)
    await expect(page.getByRole('main').getByText(/물리 키보드가 없으면 화면의 재생/)).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText(topics)
    await expect(page.getByRole('link', { name: '이전 레슨: 손' })).toHaveAttribute('href', '/learn/hands')
    await expect(page.getByRole('navigation', { name: '레슨 이동', exact: true }).getByRole('link', { name: /다음 레슨/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
    expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  })
}

for (const { width, variant, hidden } of [
  { width: 390, variant: 'mobile', hidden: 'desktop' },
  { width: 1280, variant: 'desktop', hidden: 'mobile' },
]) {
  test(`points at playback controls on the ${variant} capture at ${width} CSS pixels`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/learn/practice')
    const guide = page.locator('[data-screen-guide="setup"]')
    const picture = guide.locator(`[data-variant="${variant}"]`)
    await expect(picture).toBeVisible()
    await expect(guide.locator(`[data-variant="${hidden}"]`)).toBeHidden()

    const image = picture.getByRole('img')
    await image.scrollIntoViewIfNeeded()
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)

    // 번호표는 다른 번호표나 강조 상자에 가리지 않고, 누르는 자리가 44px이다.
    const badges = picture.getByRole('button', { name: /^\d+\. / })
    const count = await badges.count()
    expect(count).toBeGreaterThan(8)
    for (let i = 0; i < count; i++) {
      const badge = badges.nth(i)
      await badge.scrollIntoViewIfNeeded()
      const hit = await badge.evaluate((element: HTMLElement) => {
        const box = element.getBoundingClientRect()
        const x = box.left + box.width / 2
        const y = box.top + box.height / 2
        const at = (dx: number, dy: number) => document.elementFromPoint(x + dx, y + dy) === element
        return { center: at(0, 0), reach: at(-21, 0) || at(21, 0) || at(0, -21) || at(0, 21) }
      })
      expect(hit, await badge.getAttribute('aria-label') ?? '').toEqual({ center: true, reach: true })
    }

    await picture.getByRole('button', { name: /^4\. A-B 구간 반복$/ }).click()
    const caption = guide.locator('figcaption')
    await expect(caption).toContainText('A 시작은 지금 위치를 구간의 시작으로')
    await expect(picture.getByTestId('screen-guide-highlight')).toBeVisible()
    await caption.getByRole('link', { name: '‘A-B 구간 반복’ 설명 보기' }).click()
    await expect(page).toHaveURL(/#ab-loop$/)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
}

test('opens practice help from the playback setup screen in the same tab', async ({ page }) => {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => { throw new Error('isolated practice help fixture') }
    }
  })
  await page.route('**/api/sheet/212', route => route.fulfill({ json: { sheetMusic: {
    id: 212, title: '연습 도움말 이동', composer: 'fixture', isPublic: true,
    hasScore: false, provenance: 'omr', createdAt: '2026-10-04', animationDataUrl: '/practice-help-animation.json',
  } } }))
  await page.route('**/practice-help-animation.json', route => route.fulfill({ json: {
    version: '1.1', title: '연습 도움말 이동', composer: 'fixture', duration: 8,
    tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, timeSignature: '4/4',
    notes: [{ midi: 60, start: 0, duration: 4, hand: 'R' }, { midi: 48, start: 4, duration: 4, hand: 'L' }],
  } }))
  await page.goto('/sheet/212')
  await expect(page.getByTestId('playback-play')).toBeEnabled()
  await page.getByRole('link', { name: '연습 방법과 단축키 보기' }).click()
  await expect(page).toHaveURL(/\/learn\/practice$/)
  await expect(page.getByRole('heading', { level: 1, name: '연습 방법' })).toBeVisible()
})
