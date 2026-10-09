import { expect, test, type Page } from '@playwright/test'
import { SAMPLE_MIDI_NOTES } from '../src/utils/pianoSamples'

test('loads the keyboard lesson without page or console errors, including hydration', async ({ page, browserName }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.goto('/learn/keyboard')
  if (browserName === 'chromium') {
    expect(await page.evaluate(() => typeof navigator.requestMIDIAccess)).toBe('function')
    await expect(page.getByRole('button', { name: 'MIDI 연결' })).toBeEnabled()
    await expect(page.getByText('MIDI 피아노도 연결할 수 있어요.')).toBeVisible()
  }
  await page.waitForLoadState('networkidle')
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

async function answerPractice(page: Page) {
  await page.getByRole('button', { name: '도 찾기 시작' }).click()
  const question = await page.getByTestId('do-target').textContent()
  expect(question).toMatch(/^[345]옥타브/)
  const target = (Number(question?.match(/^([345])옥타브/)?.[1]) + 1) * 12
  const wrongOctave = target === 48 ? 60 : 48
  await page.locator(`button[data-midi="${wrongOctave}"]`).click()
  await expect(page.getByRole('status', { name: '연습 결과' })).toContainText('다시')
  await page.locator(`button[data-midi="${target}"]`).click()
  await expect(page.getByRole('status', { name: '연습 결과' })).toContainText('맞음')
  await page.getByRole('button', { name: '새 문제' }).click()
  await expect(page.getByTestId('do-target')).not.toHaveText(question!)
  await expect(page.getByRole('status', { name: '연습 결과' })).not.toContainText('맞음')
}

test('opens the public keyboard lesson and displays pressed note names', async ({ page }) => {
  const response = await page.goto('/learn/keyboard')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/learn\/keyboard$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1, name: '건반' })).toBeVisible()
  await expect(page.getByRole('link', { name: '다음 레슨: 악보 읽기 1', exact: true })).toHaveAttribute('href', '/learn/reading')
  await expect(page.getByRole('navigation', { name: '레슨 이동', exact: true }).getByRole('link', { name: /이전 레슨/ })).toHaveCount(0)
  await page.getByRole('button', { name: '가운데 도 (4옥타브)' }).click()
  await expect(page.getByRole('status', { name: '누른 건반' })).toContainText('가운데 도 · 4옥타브')
  await page.getByRole('button', { name: '도 샵 (4옥타브)' }).click()
  await expect(page.getByRole('status', { name: '누른 건반' })).toContainText('도# · 4옥타브')
  await answerPractice(page)
})

test('plays a focused key using only Tab, Enter and Space', async ({ page, browserName }) => {
  await page.goto('/learn/keyboard')
  const key = page.getByRole('button', { name: '도 (3옥타브)' })
  await expect(key).toBeVisible()
  let focused = false
  for (let step = 0; step < 40 && !focused; step++) {
    await page.keyboard.press('Tab')
    focused = await key.evaluate(node => node === document.activeElement)
  }
  // WebKit의 macOS Tab 설정 예외는 기존 탐색 E2E와 같다.
  if (!focused) {
    expect(browserName).toBe('webkit')
    await key.focus()
  }
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status', { name: '누른 건반' })).toContainText('도 · 3옥타브')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: '도 샵 (3옥타브)' })).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByRole('status', { name: '누른 건반' })).toContainText('도# · 3옥타브')
})

test('keeps names and practice usable when every piano sample request fails', async ({ page }) => {
  // 서비스 워커가 샘플 요청을 대신 처리하면 page.route가 가로채지 못한다.
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => {
        throw new Error('service worker disabled for route fixture')
      }
    }
  })
  let requests = 0
  await page.route('**/samples/piano/**', async route => {
    await route.abort()
    requests++
  })
  await page.goto('/learn/keyboard')
  expect(requests).toBe(0)
  await page.getByRole('button', { name: '가운데 도 (4옥타브)' }).click()
  await expect.poll(() => requests).toBe(SAMPLE_MIDI_NOTES.length)
  await expect(page.getByRole('status', { name: '누른 건반' })).toContainText('가운데 도')
  await answerPractice(page)
  // 샘플이 모두 실패해도 합성음으로 재생하므로 소리 재생 실패 안내는 나타나지 않는다.
  await expect(page.getByText(/소리를 재생하지 못했어요/)).toHaveCount(0)
})

for (const width of [320, 390]) {
  test(`fits ${width} CSS pixels with middle C initially visible inside the keyboard`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/learn/keyboard')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    const keyboard = page.getByRole('region', { name: '학습 건반 (좌우 스크롤)' })
    expect(await keyboard.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true)
    await expect.poll(() => keyboard.evaluate(region => {
      const middleC = region.querySelector('button[data-midi="60"]')!
      const bounds = region.getBoundingClientRect()
      const key = middleC.getBoundingClientRect()
      return key.left >= bounds.left + region.clientLeft && key.right <= bounds.left + region.clientLeft + region.clientWidth
    })).toBe(true)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
    await page.getByRole('button', { name: '도 (5옥타브)' }).click()
    await expect(page.getByRole('status', { name: '누른 건반' })).toContainText('도 · 5옥타브')
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
    expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  })

}
