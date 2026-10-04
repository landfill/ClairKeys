import { expect, test, type Page } from '@playwright/test'

async function prepare(page: Page) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => { throw new Error('isolated reading fixture') }
    }
  })
}
const explorer = (page: Page) => page.getByTestId('reading-explorer')

async function selectNotes(page: Page) {
  const area = explorer(page)
  await area.getByRole('button', { name: '음 선택: 레 (4옥타브)', exact: true }).click()
  await expect(area.getByRole('status', { name: '선택한 음' })).toContainText('레 · 4옥타브 · 높은음자리표 · 오선 바로 아래 칸')
  await expect(area.getByRole('button', { name: '레 (4옥타브)', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await area.getByRole('button', { name: '도 (3옥타브)', exact: true }).click()
  await expect(area.getByRole('button', { name: '음 선택: 도 (3옥타브)', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(area.getByRole('status', { name: '선택한 음' })).toContainText('도 · 3옥타브 · 낮은음자리표 · 둘째 칸')
}

test('opens the pitch and rhythm lesson without hydration or console errors and renders actual OSMD notes', async ({ page }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await prepare(page)
  const response = await page.goto('/learn/reading')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/learn\/reading$/)
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(main.getByRole('heading', { level: 1, name: '악보 읽기' })).toBeVisible()
  await expect(main.getByRole('heading', { level: 2 })).toHaveText(['오선', '높은음자리표', '낮은음자리표', '가운데 도', '오선과 건반 연결하기', '음표의 길이', '쉼표', '점음표', '박자표'])
  const navigation = main.getByRole('navigation', { name: '레슨 이동', exact: true })
  await expect(navigation.getByRole('link', { name: '이전 레슨: 건반', exact: true })).toHaveAttribute('href', '/learn/keyboard')
  await expect(navigation.getByRole('link', { name: '다음 레슨: 손', exact: true })).toHaveAttribute('href', '/learn/hands')
  await expect(main.getByRole('link', { name: '손 레슨', exact: true })).toHaveAttribute('href', '/learn/hands')
  await expect(main.getByRole('link', { name: '연습 방법 레슨', exact: true })).toHaveAttribute('href', '/learn/practice')
  const score = page.locator('[data-example="treble-lines"]')
  await expect(score.getByRole('img', { name: '높은음자리표 줄 음 악보', exact: true })).toBeVisible()
  const caption = score.locator('figcaption')
  const captionId = await caption.getAttribute('id')
  expect(captionId).toBeTruthy()
  await expect(score).toHaveAttribute('aria-describedby', captionId!)
  await expect(caption).toContainText('첫째 줄에 미(4옥타브), 둘째 줄에 솔(4옥타브)')
  await expect(score.locator('svg')).toHaveCount(1)
  // OSMD는 VexFlow의 StaveNote 그룹으로 실제 음표를 그린다.
  await expect(score.locator('svg g.vf-stavenote')).toHaveCount(5)
  await expect(score.locator('svg g.vf-timesignature')).toHaveCount(0)
  for (const id of ['note-whole', 'note-half', 'note-quarter', 'note-eighth', 'rest-whole', 'rest-half', 'rest-quarter', 'rest-eighth', 'note-dotted-half', 'note-dotted-quarter', 'meter-four', 'meter-three', 'meter-six']) {
    const rhythm = page.locator(`[data-example="${id}"]`)
    await expect(rhythm.locator('svg')).toHaveCount(1)
    const time = rhythm.locator('svg g.vf-timesignature')
    await expect(time).toHaveCount(1)
    // OSMD의 숫자 박자표는 위·아래 숫자를 각각 SVG path로 그린다.
    // C 기호 하나로 대체되지 않고 두 숫자 모두 실제 크기를 갖는다.
    await expect(time.locator('path')).toHaveCount(2)
    const digits = await time.locator('path').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }))
    expect(digits.every(digit => digit.width > 0 && digit.height > 0)).toBe(true)
  }
  await page.getByRole('button', { name: '8분의 6박자 들어 보기', exact: true }).click()
  const progress = page.getByRole('status', { name: '리듬 재생 차례', exact: true })
  await expect(progress).toContainText('8분음표', { timeout: 12000 })
  await expect(progress).toHaveCount(0, { timeout: 15000 })
  await selectNotes(page)
  await expect(explorer(page).locator('[data-example="selected-note"] svg')).toHaveCount(1)
  await page.waitForLoadState('networkidle')
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('keeps notes, staff positions and key selection working when piano samples fail', async ({ page }) => {
  await prepare(page)
  let aborted = 0
  await page.route('**/samples/piano/**', async route => { await route.abort(); aborted++ })
  try {
    await page.goto('/learn/reading')
    expect(aborted).toBe(0)
    await selectNotes(page)
    await explorer(page).getByRole('button', { name: '선택한 음 들어 보기', exact: true }).click()
    await expect.poll(() => aborted).toBe(30)
    await expect(explorer(page).getByRole('status', { name: '선택한 음' })).toContainText('도 · 3옥타브')
    await explorer(page).getByRole('button', { name: '미 (4옥타브)', exact: true }).click()
    await expect(explorer(page).getByRole('status', { name: '선택한 음' })).toContainText('미 · 4옥타브 · 높은음자리표 · 첫째 줄')
  } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }) }
})

for (const width of [320, 390]) {
  test(`fits ${width}px with scrolling confined to the keyboard`, async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/learn/reading')
    await expect(page.locator('[data-example="treble-lines"] svg')).toHaveCount(1)
    const area = explorer(page)
    const keyboard = area.getByRole('region', { name: '음높이 학습 건반 (좌우 스크롤)' })
    const fullyVisible = async (midi: number) => keyboard.evaluate((region, pitch) => {
      const bounds = region.getBoundingClientRect()
      const key = region.querySelector(`button[data-midi="${pitch}"]`)!.getBoundingClientRect()
      return key.left >= bounds.left + region.clientLeft && key.right <= bounds.left + region.clientLeft + region.clientWidth
    }, midi)
    await expect.poll(() => fullyVisible(60)).toBe(true)
    const chooseHighC = area.getByRole('button', { name: '음 선택: 도 (5옥타브)', exact: true })
    await chooseHighC.scrollIntoViewIfNeeded()
    const before = await page.evaluate(() => scrollY)
    await chooseHighC.click()
    await expect.poll(() => fullyVisible(72)).toBe(true)
    expect(await page.evaluate(() => scrollY)).toBe(before)
    await expect(chooseHighC).toBeFocused()
    await selectNotes(page)
    const table = page.getByRole('table', { name: '음표 길이 비교', exact: true })
    const tableFits = await table.evaluate(element => {
      const box = element.getBoundingClientRect()
      return box.left >= 0 && box.right <= document.documentElement.clientWidth && element.scrollWidth <= element.clientWidth
    })
    expect(tableFits).toBe(true)
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }))
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport + 1)
    expect(overflow.body).toBeLessThanOrEqual(overflow.viewport + 1)
  })
}

test('keeps alternative text and the lesson interactive when the OSMD chunk cannot load', async ({ page }) => {
  await prepare(page)
  let blocked = 0
  await page.route('**/_next/static/chunks/**', async route => {
    const response = await route.fetch()
    const body = await response.text()
    // 페이지 코드와 구분해 공개 API와 악보 배치 규칙을 포함한 OSMD 청크만 차단한다.
    if (body.includes('OpenSheetMusicDisplay') && body.includes('EngravingRules')) {
      blocked++
      await route.abort()
    } else await route.fulfill({ response })
  })
  try {
    await page.goto('/learn/reading')
    await expect.poll(() => blocked).toBeGreaterThan(0)
    const example = page.locator('[data-example="treble-lines"]')
    await expect(example.getByText(/악보 그림을 불러오지 못했어요/)).toBeVisible()
    await expect(example.getByRole('img', { name: '높은음자리표 줄 음 악보', exact: true })).toBeVisible()
    await expect(example).toHaveAttribute('aria-describedby', (await example.locator('figcaption').getAttribute('id'))!)
    await expect(example.locator('figcaption')).toContainText('첫째 줄에 미')
    await selectNotes(page)
    await expect(explorer(page).getByRole('button', { name: '도 (3옥타브)', exact: true })).toHaveAttribute('aria-pressed', 'true')
  } finally {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  }
})

for (const width of [1280, 320, 390]) {
  test(`fits and centres every score drawing without a load-time layout shift at ${width}px`, async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width, height: 844 })
    let release = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    let held = 0
    await page.route('**/_next/static/chunks/**', async route => {
      const response = await route.fetch()
      const body = await response.text()
      if (body.includes('OpenSheetMusicDisplay') && body.includes('EngravingRules')) {
        held++
        await gate
      }
      await route.fulfill({ response })
    })
    try {
      await page.goto('/learn/reading', { waitUntil: 'domcontentloaded' })
      await expect.poll(() => held).toBeGreaterThan(0)
      await page.evaluate(() => document.fonts.ready)
      const figures = page.locator('main figure[data-example]')
      await expect(figures).toHaveCount(21)
      const frames = figures.getByRole('img')
      const placeholders = await frames.evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect()
        return { top: rect.top, width: rect.width, height: rect.height }
      }))
      release()
      await expect(figures.locator('svg')).toHaveCount(21)
      await expect(figures.locator('[role="img"][aria-busy="true"]')).toHaveCount(0)
      const geometry = await figures.evaluateAll(nodes => nodes.map(node => {
        const box = node.querySelector('[role="img"]')!.getBoundingClientRect()
        const svg = node.querySelector('svg')!
        const rect = svg.getBoundingClientRect()
        const music = [...svg.querySelectorAll('g.staffline')].map(group => group.getBoundingClientRect())
        return {
          frame: { top: box.top, width: box.width, height: box.height },
          inside: rect.left >= box.left && rect.right <= box.right && rect.top >= box.top && rect.bottom <= box.bottom,
          heightRatio: rect.height / box.height,
          horizontalBalance: Math.abs((rect.left - box.left) - (box.right - rect.right)),
          verticalBalance: Math.abs((rect.top - box.top) - (box.bottom - rect.bottom)),
          musicInset: music.length ? Math.min(...music.flatMap(bounds => [bounds.left - rect.left, rect.right - bounds.right, bounds.top - rect.top, rect.bottom - bounds.bottom])) : 0,
          musicFitsSvg: music.length > 0 && music.every(bounds => bounds.left >= rect.left - 1 && bounds.right <= rect.right + 1 && bounds.top >= rect.top - 1 && bounds.bottom <= rect.bottom + 1),
        }
      }))
      geometry.forEach((item, index) => {
        expect(item.frame).toEqual(placeholders[index])
        expect(item.inside).toBe(true)
        // 좁은 화면에서는 폭에 맞춰 줄이고, 넓은 화면에서는 상자 높이의 대부분을 그림에 쓴다.
        expect(item.heightRatio).toBeGreaterThanOrEqual(width === 1280 ? 0.75 : 0.4)
        expect(item.horizontalBalance).toBeLessThanOrEqual(2)
        expect(item.verticalBalance).toBeLessThanOrEqual(2)
        expect(item.musicFitsSvg).toBe(true)
        // 제품의 최소 4px 여백의 절반. 엔진 차이가 있어도 가장자리에 닿지 않는다.
        expect(item.musicInset).toBeGreaterThanOrEqual(2)
      })
    } finally { release(); await page.unrouteAll({ behavior: 'ignoreErrors' }) }
  })
}


for (const width of [1280, 390]) {
  test(`keeps the keyboard and selection guidance in place across middle-C clef changes at ${width}px`, async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/learn/reading')
    await expect(page.locator('[data-example="treble-lines"] svg')).toHaveCount(1)
    await page.evaluate(() => document.fonts.ready)
    const area = explorer(page)
    const keyboard = area.getByRole('region', { name: '음높이 학습 건반 (좌우 스크롤)' })
    const guidance = area.getByRole('status', { name: '선택한 음' })
    // 비교 중 클릭이 문서를 자동 스크롤하지 않도록 선택 버튼을 화면 안에 둔다.
    await area.evaluate(element => scrollTo(0, scrollY + element.getBoundingClientRect().top - 16))
    const initial = { keyboard: await keyboard.boundingBox(), guidance: await guidance.boundingBox() }
    expect(initial.keyboard).not.toBeNull()
    expect(initial.guidance).not.toBeNull()
    const keys = [
      { name: '음 선택: 가운데 도 (4옥타브)', midis: 60 },
      { name: '음 선택: 레 (4옥타브)', midis: 62 },
      { name: '음 선택: 시 (3옥타브)', midis: 59 },
      { name: '음 선택: 가운데 도 (4옥타브)', midis: 60 },
    ]
    for (const key of keys) {
      await area.getByRole('button', { name: key.name, exact: true }).click()
      await expect(area.locator(`button[data-midi="${key.midis}"]`)).toHaveAttribute('aria-pressed', 'true')
      await expect(area.locator('[data-example="selected-middle-bass"]')).toHaveCount(key.midis === 60 ? 1 : 0)
      expect((await keyboard.boundingBox())?.y).toBe(initial.keyboard!.y)
      expect((await guidance.boundingBox())?.y).toBe(initial.guidance!.y)
    }
    if (width === 390) {
      const box = await keyboard.boundingBox()
      expect(box!.y + box!.height).toBeLessThanOrEqual(844)
    }
  })
}

for (const label of ['높은음자리표 줄 음 들어 보기', '점4분음표 들어 보기']) {
  test(`shows audio initialization failure directly below ${label} in the viewport`, async ({ page }) => {
    await prepare(page)
    await page.addInitScript(() => {
      const unavailable = class { constructor() { throw new Error('isolated audio initialization failure') } }
      Object.defineProperty(window, 'AudioContext', { configurable: true, value: unavailable })
      Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: unavailable })
    })
    await page.goto('/learn/reading')
    const button = page.getByRole('button', { name: label, exact: true })
    await button.scrollIntoViewIfNeeded()
    // 안내가 생길 공간 없이 버튼의 아래쪽을 뷰포트 끝에 맞춘다.
    await button.evaluate(element => {
      const rect = element.getBoundingClientRect()
      window.scrollBy({ top: rect.bottom - window.innerHeight, behavior: 'instant' })
    })
    await expect(button).toBeInViewport({ ratio: 0.9 })
    await button.click()
    const notice = button.locator('..').getByRole('status').filter({ hasText: '소리를 재생하지 못했어요' })
    await expect(notice).toContainText('소리를 재생하지 못했어요')
    // WebKit의 소수점 픽셀 반올림(0.5px 미만)을 허용한다.
    await expect(notice).toBeInViewport({ ratio: 0.95 })
    await expect(page.getByText('소리를 재생하지 못했어요', { exact: false })).toHaveCount(1)
    const buttonBox = await button.boundingBox()
    const noticeBox = await notice.boundingBox()
    expect(buttonBox).not.toBeNull()
    expect(noticeBox).not.toBeNull()
    expect(noticeBox!.y - (buttonBox!.y + buttonBox!.height)).toBeGreaterThanOrEqual(0)
    expect(noticeBox!.y - (buttonBox!.y + buttonBox!.height)).toBeLessThanOrEqual(12)
    await selectNotes(page)
  })
}


test('continues rhythm text when AudioContext resume never settles', async ({ page }) => {
  await prepare(page)
  await page.addInitScript(() => {
    const contexts = window as typeof window & { webkitAudioContext?: typeof AudioContext }
    for (const Context of [contexts.AudioContext, contexts.webkitAudioContext]) {
      if (!Context) continue
      Object.defineProperty(Context.prototype, 'state', { configurable: true, get: () => 'suspended' })
      Context.prototype.resume = () => new Promise<void>(() => {})
    }
  })
  await page.goto('/learn/reading')
  const button = page.getByRole('button', { name: '8분의 6박자 들어 보기', exact: true })
  await button.click()
  const area = button.locator('..')
  await expect(area.getByRole('status', { name: '소리 준비 상태' })).toBeVisible()
  const notice = area.getByRole('status').filter({ hasText: '소리를 재생하지 못했어요' })
  await expect(notice).toBeVisible({ timeout: 12000 })
  // WebKit의 소수점 픽셀 반올림(0.5px 미만)을 허용한다.
  await expect(notice).toBeInViewport({ ratio: 0.95 })
  await expect(area.getByRole('status', { name: '소리 준비 상태' })).toHaveCount(0)
  const progress = area.getByRole('status', { name: '리듬 재생 차례' })
  await expect(progress).toBeVisible()
  const readTurn = () => progress.evaluateAll(nodes => Number(nodes[0]?.textContent?.match(/(\d+)\/6/)?.[1] ?? 0))
  const firstTurn = await readTurn()
  expect(firstTurn).toBeGreaterThan(0)
  await expect.poll(readTurn, { intervals: [50, 100], timeout: 12000 }).toBeGreaterThan(firstTurn)
  await expect(progress).toHaveCount(0, { timeout: 12000 })
})
