import { expect, test, type Page } from '@playwright/test'


// Observe native startup without replacing its clock or claiming playback on a
// runner whose audio backend cannot resume. The forced case locks that boundary.
async function observeAudioStart(page: Page, suspended = false) {
  await page.addInitScript(forceSuspended => {
    const host = window as typeof window & {
      webkitAudioContext?: typeof AudioContext
      __courseAudioProbe?: () => { state: string; currentTime: number; pending: boolean }
    }
    for (const Context of new Set([host.AudioContext, host.webkitAudioContext])) {
      if (!Context) continue
      const resume = Context.prototype.resume
      if (forceSuspended) Object.defineProperty(Context.prototype, 'state', { configurable: true, get: () => 'suspended' })
      Context.prototype.resume = function () {
        let pending = true
        host.__courseAudioProbe = () => ({ state: this.state, currentTime: this.currentTime, pending })
        const result = forceSuspended ? new Promise<void>(() => {}) : resume.call(this)
        void result.then(() => { pending = false }, () => { pending = false })
        return result
      }
    }
  }, suspended)
}
async function audioStartEvidence(page: Page) {
  return page.evaluate(() => (window as typeof window & {
    __courseAudioProbe?: () => { state: string; currentTime: number; pending: boolean }
  }).__courseAudioProbe?.() ?? null)
}

test('reaches the public course from hands and checks native audio startup', async ({ page, browserName }, info) => {
  await observeAudioStart(page)
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
  const started = await page.getByTestId('compact-playback-bar').waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)
  if (!started) {
    const evidence = await audioStartEvidence(page)
    await info.attach('audio-start-evidence', { body: JSON.stringify(evidence), contentType: 'application/json' })
    expect(browserName, 'Only the known Firefox runner may lack an audio backend').toBe('firefox')
    expect(evidence).toMatchObject({ state: 'suspended', pending: true })
    await expect(page.getByText('오디오를 시작하지 못했습니다. 소리 설정을 확인한 뒤 다시 재생해 주세요.', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: '도에서 솔까지' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: '코스 이동' })).toBeVisible()
    await expect(page.getByTestId('playback-play')).toBeEnabled()
    info.annotations.push({ type: 'audio-device', description: 'Native Firefox resume remained pending; verified idle course, not audible playback.' })
    expect(errors).toEqual([])
    return
  }
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

test('preserves the course when the audio device cannot resume', async ({ page }) => {
  await observeAudioStart(page, true)
  await page.goto('/learn/course/right-hand')
  await page.getByTestId('playback-play').click()
  await expect.poll(() => audioStartEvidence(page)).toMatchObject({ state: 'suspended', pending: true })
  await expect(page.getByText('오디오를 시작하지 못했습니다. 소리 설정을 확인한 뒤 다시 재생해 주세요.', { exact: true })).toBeVisible({ timeout: 6000 })
  await expect(page.getByTestId('compact-playback-bar')).toHaveCount(0)
  await expect(page.getByTestId('playback-play')).toBeEnabled()
  await expect(page.getByRole('navigation', { name: '코스 이동' })).toBeVisible()
  await page.getByRole('link', { name: '첫 곡 코스로 돌아가기' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '첫 곡 코스' })).toBeVisible()
})


test('introduces verified meter and key for all authored course pieces', async ({ page }) => {
  for (const slug of ['right-hand', 'left-hand', 'both-hands']) {
    await page.goto(`/learn/course/${slug}`)
    const intro = page.getByRole('region', { name: '이 곡 소개', exact: true })
    await expect(intro).toContainText('4/4')
    await expect(intro).toContainText('샵·플랫 없음')
    await expect(intro.getByText('원본 악보 기준', { exact: true })).toHaveCount(2)
    await expect(intro.getByRole('link', { name: '악보 읽기에서 박자표 익히기' })).toHaveAttribute('href', '/learn/reading/rhythm#meters')
  }
})
