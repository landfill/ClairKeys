import { expect, test, type Page, type Locator } from '@playwright/test'
import { SAMPLE_MIDI_NOTES } from '../src/utils/pianoSamples'

// 테스트 종료 뒤 늦은 요청의 오류가 새지 않도록 각 테스트에서 라우트를 정리한다.
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'ignoreErrors' }) })
async function prepare(page: Page) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated hands fixture') }
  })
}
const rightThumb = (page: Page) => page.getByRole('button', { name: '오른손 가운데 도 (4옥타브), 손가락 1 엄지', exact: true })
const leftLittle = (page: Page) => page.getByRole('button', { name: '왼손 도 (3옥타브), 손가락 5 새끼손가락', exact: true })

async function changeHand(page: Page) {
  await expect(page.getByRole('button', { name: /손가락 [1-5]/, exact: true })).toHaveCount(5)
  await expect(rightThumb(page)).toContainText('도 1')
  await rightThumb(page).click()
  await expect(page.getByRole('status', { name: '누른 건반', exact: true })).toContainText('오른손 1번 엄지')
  await page.getByRole('button', { name: '왼손', exact: true }).click()
  await expect(leftLittle(page)).toContainText('도 5')
  await expect(page.getByRole('button', { name: /손가락 [1-5]/, exact: true })).toHaveCount(5)
  await leftLittle(page).click()
  await expect(page.getByRole('status', { name: '누른 건반', exact: true })).toContainText('왼손 5번 새끼손가락')
}

test('opens the public hand lesson with clean hydration and mirrored finger numbers', async ({ page }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await prepare(page)
  const response = await page.goto('/learn/hands')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/learn\/hands$/)
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(main.getByRole('heading', { level: 1, name: '손', exact: true })).toBeVisible()
  await expect(main.getByRole('heading', { level: 2 })).toHaveText(['손가락 번호', '기본 손 모양', '다섯 손가락 자리', '재생 화면과 연결'])
  const navigation = page.getByRole('navigation', { name: '레슨 이동', exact: true })
  await expect(navigation.getByRole('link', { name: '이전 레슨: 악보 읽기', exact: true })).toHaveAttribute('href', '/learn/reading')
  await expect(navigation.getByRole('link', { name: '다음 레슨: 연습 방법', exact: true })).toHaveAttribute('href', '/learn/practice')
  await changeHand(page)
  await page.waitForLoadState('networkidle')
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

async function tabTo(page: Page, target: Locator, browserName: string) {
  let focused = false
  for (let step = 0; step < 60 && !focused; step++) {
    await page.keyboard.press('Tab')
    focused = await target.evaluate(node => node === document.activeElement)
  }
  if (!focused) {
    expect(browserName, '키보드로 손 선택·건반에 도달하지 못함').toBe('webkit')
    await target.focus()
  }
  await expect(target).toBeFocused()
}
test('selects a hand and sounds a numbered key with the keyboard alone', async ({ page, browserName }) => {
  await prepare(page)
  await page.goto('/learn/hands')
  const hand = page.getByRole('button', { name: '왼손', exact: true })
  await tabTo(page, hand, browserName)
  await page.keyboard.press('Enter')
  await expect(hand).toHaveAttribute('aria-pressed', 'true')
  await tabTo(page, leftLittle(page), browserName)
  await page.keyboard.press('Space')
  await expect(page.getByRole('status', { name: '누른 건반', exact: true })).toContainText('왼손 5번 새끼손가락')
})

test('keeps names and fingers working when every piano sample is aborted', async ({ page }) => {
  await prepare(page)
  let aborted = 0
  await page.route('**/samples/piano/**', async route => { await route.abort(); aborted++ })
  await page.goto('/learn/hands')
  expect(aborted).toBe(0)
  await changeHand(page)
  await expect.poll(() => aborted).toBe(SAMPLE_MIDI_NOTES.length)
  await expect(page.getByRole('status', { name: '누른 건반', exact: true })).toContainText('왼손 5번 새끼손가락')
})

for (const width of [320, 390]) {
  test(`fits ${width}px with the whole selected five-finger position initially visible`, async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/learn/hands')
    const keyboard = page.getByRole('region', { name: '다섯 손가락 자리 건반 (좌우 스크롤)', exact: true })
    const keysFit = (midis: number[]) => keyboard.evaluate((region, keys) => {
      const box = region.getBoundingClientRect()
      return keys.every(midi => {
        const key = region.querySelector(`button[data-midi="${midi}"]`)!.getBoundingClientRect()
        return key.left >= box.left + region.clientLeft && key.right <= box.left + region.clientLeft + region.clientWidth
      })
    }, midis)
    await expect.poll(() => keysFit([60, 62, 64, 65, 67])).toBe(true)
    await page.getByRole('button', { name: '왼손', exact: true }).click()
    await expect.poll(() => keysFit([48, 50, 52, 53, 55])).toBe(true)
    const size = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }))
    expect(size.document).toBeLessThanOrEqual(size.viewport + 1)
    expect(size.body).toBeLessThanOrEqual(size.viewport + 1)
  })
}

for (const storedFinger of [true, false]) {
  test(`opens finger help for ${storedFinger ? 'stored' : 'automatically inferred'} numbers on playback setup`, async ({ page }) => {
    await prepare(page)
    await page.route('**/api/sheet/214', route => route.fulfill({ json: { sheetMusic: {
      id: 214, title: '운지 도움말', composer: 'fixture', hasScore: false, isPublic: true,
      provenance: 'omr', createdAt: '2026-10-04', animationDataUrl: '/hands-help.json',
    } } }))
    await page.route('**/hands-help.json', route => route.fulfill({ json: {
      version: '1.1', title: '운지 도움말', composer: 'fixture', duration: 8,
      tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, timeSignature: '4/4',
      notes: [{ midi: 60, start: 0, duration: 4, hand: 'R', ...(storedFinger ? { finger: 1 } : {}) }, { midi: 48, start: 4, duration: 4, hand: 'L' }],
    } }))
    await page.goto('/sheet/214')
    await expect(page.getByTestId('playback-play')).toBeEnabled()
    const help = page.getByRole('link', { name: '손가락 번호 보기', exact: true })
    await expect(help).toHaveAttribute('href', '/learn/hands')
    await help.click()
    await expect(page).toHaveURL(/\/learn\/hands$/)
    await expect(page.getByRole('heading', { level: 1, name: '손', exact: true })).toBeVisible()
  })
}
