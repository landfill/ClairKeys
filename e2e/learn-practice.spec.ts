import { expect, test } from '@playwright/test'

const topics = ['느리게 시작', '한 손씩', 'A-B 구간 반복', '기다리기 모드', '메트로놈', '키보드 단축키']

for (const width of [320, 1280]) {
  test(`opens the public practice lesson and fits ${width} CSS pixels`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const response = await page.goto('/learn/practice')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/learn\/practice$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1, name: '연습 방법' })).toBeVisible()
    await expect(page).toHaveTitle(/연습 방법/)
    await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText(topics)
    await expect(page.getByRole('link', { name: '이전 레슨: 건반' })).toHaveAttribute('href', '/learn/keyboard')
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
