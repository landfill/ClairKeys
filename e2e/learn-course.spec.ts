import { expect, test } from '@playwright/test'

test('reaches the public course from hands and plays the authored score', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/learn/hands')
  await page.getByRole('link', { name: '첫 곡 코스', exact: true }).click()
  await expect(page.getByRole('list', { name: '첫 곡 순서' }).getByRole('listitem')).toHaveCount(3)
  await page.getByRole('link', { name: '도에서 솔까지', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: '도에서 솔까지' })).toBeVisible()
  await expect(page.getByText('ClairKeys 창작 연습곡', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: '원본 악보 내려받기 (MusicXML)' })).toHaveAttribute('href', '/learn/course/right-hand.musicxml')
  await expect(page.getByTestId('playback-play')).toBeEnabled()
  await page.getByTestId('playback-play').click()
  await expect(page.getByTestId('compact-playback-bar')).toBeVisible()
  await expect(page.getByRole('button', { name: '일시정지', exact: true })).toBeEnabled()
  await expect.poll(async () => Number(await page.getByRole('slider', { name: '재생 위치', exact: true }).getAttribute('aria-valuenow'))).toBeGreaterThan(0)
  await expect(page.getByRole('navigation', { name: '코스 이동' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('every course piece has public original and score assets; unknown pieces return 404', async ({ request }) => {
  for (const slug of ['right-hand', 'left-hand', 'both-hands']) {
    expect((await request.get(`/learn/course/${slug}`)).status()).toBe(200)
    const xml = await request.get(`/learn/course/${slug}.musicxml`)
    expect(xml.status()).toBe(200)
    expect(await xml.text()).toContain('<fingering>')
    const score = await request.get(`/learn/course/${slug}.score.json`)
    expect(score.status()).toBe(200)
    expect((await score.json()).musicxml).toContain('<score-partwise')
  }
  expect((await request.get('/learn/course/missing')).status()).toBe(404)
})

test('the course and player fit 320px and allow moving to the next piece', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/learn/course')
  await expect(page.getByRole('heading', { level: 1, name: '첫 곡 코스' })).toBeVisible()
  for (const path of ['/learn/course', '/learn/course/left-hand']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
    expect(width.scroll).toBeLessThanOrEqual(width.client + 1)
  }
  await page.getByRole('link', { name: '다음 곡: 두 손 인사' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '두 손 인사' })).toBeVisible()
  await expect(page.getByRole('link', { name: /다음 곡:/ })).toHaveCount(0)
})


test('renders the original notation on desktop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The existing score panel is desktop-only')
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/learn/course/both-hands')
  await page.getByRole('button', { name: '악보 보기', exact: true }).click()
  await expect(page.getByTestId('score-panel').locator('svg')).toHaveCount(1)
  await expect(page.getByTestId('score-measure-highlight')).toHaveAttribute('data-measure-index', '0')
})
