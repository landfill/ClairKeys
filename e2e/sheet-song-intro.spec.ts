import { expect, test, type Page } from '@playwright/test'

const animation = {
  version: '1.1', title: '소개 연습곡', composer: '작곡가', duration: 14,
  tempo: 80, tempoSource: 'score', timingReferenceBpm: 80, timeSignature: '4/4',
  notes: [{ midi: 48, start: 0, duration: 12, hand: 'L' }, { midi: 72, start: 3, duration: 2, hand: 'R' }, { midi: 48, start: 4, duration: 10, hand: 'L' }],
}
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'ignoreErrors' }) })
async function fixture(page: Page, denied = false) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated song introduction fixture') }
  })
  await page.route('**/api/auth/session', route => route.fulfill({ json: {} }))
  await page.route('**/api/sheet/215', route => denied
    ? route.fulfill({ status: 403, json: { error: 'Access denied' } })
    : route.fulfill({ json: { sheetMusic: { id: 215, title: animation.title, composer: animation.composer, category: null, isPublic: true, provenance: 'omr', createdAt: '2026-10-04', hasScore: false, animationDataUrl: '/song-intro.json' } } }))
  await page.route('**/song-intro.json', route => route.fulfill({ json: animation }))
}
const intro = (page: Page) => page.getByRole('region', { name: '이 곡 소개', exact: true })
function collectErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  return errors
}

test('introduces a public song outside playback and links to a lesson without console errors', async ({ page }) => {
  const errors = collectErrors(page)
  await fixture(page)
  await page.goto('/sheet/215')
  const area = intro(page)
  await expect(area).toBeVisible()
  await expect(area).toContainText('도(3옥타브) ~ 도(5옥타브)')
  await expect(area).toContainText('0분 14초')
  await expect(area).toContainText('양손')
  await expect(area).toContainText('♩=80 (악보에서 읽음)')
  await expect(area.locator('dt').filter({ hasText: /^박자$/ })).toHaveCount(0)
  await expect(area.locator('a[href="/learn/reading/rhythm#meters"]')).toHaveCount(0)
  await expect(area).not.toContainText(/4\/4|장조|단조|음표 종류|쉼표 종류/)
  await expect(page.getByText('재생 시간', { exact: true })).toHaveCount(1)
  const player = page.locator('main [data-testid="playback-box"]').locator('xpath=../..')
  await expect(player).toHaveCount(1)
  await expect(player.getByRole('region', { name: '이 곡 소개', exact: true })).toHaveCount(0)
  await page.waitForLoadState('networkidle')
  expect(errors).toEqual([])
  await area.getByRole('link', { name: '건반 레슨에서 음역 익히기', exact: true }).click()
  await expect(page).toHaveURL(/\/learn\/keyboard$/)
  await expect(page.getByRole('heading', { level: 1, name: '건반', exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(errors).toEqual([])
})

test('retains the existing private-sheet denial and never downloads its animation or introduction', async ({ page }) => {
  await fixture(page, true)
  let animationRequests = 0
  page.on('request', request => { if (request.url().endsWith('/song-intro.json')) animationRequests++ })
  await page.goto('/sheet/215')
  await expect(page.getByText('이 악보에 접근할 권한이 없습니다.', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '로그인하고 계속하기', exact: true })).toHaveAttribute('href', '/auth/signin?callbackUrl=%2Fsheet%2F215')
  await expect(intro(page)).toHaveCount(0)
  await expect(page.getByTestId('playback-box')).toHaveCount(0)
  expect(animationRequests).toBe(0)
})

for (const width of [320, 390]) {
  test(`fits the song introduction and its lesson links at ${width}px`, async ({ page }) => {
    const errors = collectErrors(page)
    await fixture(page)
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/sheet/215')
    await expect(intro(page)).toBeVisible()
    const fits = await intro(page).evaluate(element => {
      const bounds = element.getBoundingClientRect()
      const width = document.documentElement.clientWidth
      return bounds.left >= 0 && bounds.right <= width && element.scrollWidth <= element.clientWidth && document.documentElement.scrollWidth <= width + 1 && document.body.scrollWidth <= width + 1
    })
    expect(fits).toBe(true)
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })
}

test('opens the pitch explorer anchor from the song range link', async ({ page }) => {
  await fixture(page)
  await page.goto('/sheet/215')
  await intro(page).getByRole('link', { name: '악보 읽기에서 음높이 연결하기', exact: true }).click()
  await expect(page).toHaveURL(/\/learn\/reading#pitch-explorer$/)
  const target = page.locator('#pitch-explorer')
  await expect(target).toHaveText('오선과 건반 연결하기')
  await expect(target).toBeVisible()
  await expect(target).toBeInViewport({ ratio: 1 })
})
