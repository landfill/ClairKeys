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

test('opens the pitch lesson without hydration or console errors and renders actual OSMD notes', async ({ page }) => {
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
  await expect(main.getByRole('heading', { level: 1, name: '악보 읽기 1', exact: true })).toBeVisible()
  await expect(main.getByRole('heading', { level: 2 })).toHaveText(['오선', '높은음자리표', '낮은음자리표', '가운데 도', '오선과 건반 연결하기'])
  const navigation = main.getByRole('navigation', { name: '레슨 이동', exact: true })
  await expect(navigation.getByRole('link', { name: '이전 레슨: 건반', exact: true })).toHaveAttribute('href', '/learn/keyboard')
  await expect(navigation.getByRole('link', { name: '다음 레슨: 악보 읽기 2', exact: true })).toHaveAttribute('href', '/learn/reading/rhythm')
  await expect(main.getByRole('link', { name: '건반 레슨', exact: true })).toHaveAttribute('href', '/learn/keyboard')

  // Score example rendering and OSMD notes
  const score = page.locator('[data-example="treble-lines"]')
  await expect(score.getByRole('img', { name: '높은음자리표 줄 음 악보', exact: true })).toBeVisible()
  const caption = score.locator('figcaption')
  const captionId = await caption.getAttribute('id')
  expect(captionId).toBeTruthy()
  await expect(score).toHaveAttribute('aria-describedby', captionId!)
  await expect(caption).toContainText('첫째 줄에 미(4옥타브), 둘째 줄에 솔(4옥타브)')
  await expect(score.locator('svg')).toHaveCount(1)
  await expect(score.locator('svg g.vf-stavenote')).toHaveCount(5)
  await expect(score.locator('svg g.vf-timesignature')).toHaveCount(0)

  // Side-by-side on 1280x800 vs stacked on 390x844
  await page.setViewportSize({ width: 1280, height: 800 })
  const linesFig = page.locator('[data-example="treble-lines"]')
  const spacesFig = page.locator('[data-example="treble-spaces"]')
  const linesBoxWide = await linesFig.boundingBox()
  const spacesBoxWide = await spacesFig.boundingBox()
  expect(linesBoxWide).toBeTruthy()
  expect(spacesBoxWide).toBeTruthy()
  expect(Math.abs(linesBoxWide!.y - spacesBoxWide!.y)).toBeLessThanOrEqual(1.5)
  expect(linesBoxWide!.x + linesBoxWide!.width).toBeLessThanOrEqual(spacesBoxWide!.x + 1)

  await page.setViewportSize({ width: 390, height: 844 })
  const linesBoxNarrow = await linesFig.boundingBox()
  const spacesBoxNarrow = await spacesFig.boundingBox()
  expect(linesBoxNarrow).toBeTruthy()
  expect(spacesBoxNarrow).toBeTruthy()
  expect(linesBoxNarrow!.y + linesBoxNarrow!.height).toBeLessThanOrEqual(spacesBoxNarrow!.y + 1)

  await selectNotes(page)
  await expect(explorer(page).locator('[data-example="selected-note"] svg')).toHaveCount(1)

  // Total score drawings on Reading 1: 7 (6 comparative examples + 1 in explorer after selectNotes selected C3)
  await expect(page.locator('main figure[data-example]')).toHaveCount(7)

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
      await expect(figures).toHaveCount(8)
      const frames = figures.getByRole('img')
      const placeholders = await frames.evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect()
        return { top: rect.top, width: rect.width, height: rect.height }
      }))
      release()
      await expect(figures.locator('svg')).toHaveCount(8)
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
        expect(item.heightRatio).toBeGreaterThanOrEqual(width === 1280 ? 0.75 : 0.4)
        expect(item.horizontalBalance).toBeLessThanOrEqual(2)
        expect(item.verticalBalance).toBeLessThanOrEqual(2)
        expect(item.musicFitsSvg).toBe(true)
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

test('shows audio initialization failure directly below 높은음자리표 줄 음 들어 보기 in the viewport', async ({ page }) => {
  await prepare(page)
  await page.addInitScript(() => {
    const unavailable = class { constructor() { throw new Error('isolated audio initialization failure') } }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: unavailable })
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: unavailable })
  })
  await page.goto('/learn/reading')
  const button = page.getByRole('button', { name: '높은음자리표 줄 음 들어 보기', exact: true })
  await button.scrollIntoViewIfNeeded()
  await button.evaluate(element => {
    const rect = element.getBoundingClientRect()
    window.scrollBy({ top: rect.bottom - window.innerHeight, behavior: 'instant' })
  })
  await expect(button).toBeInViewport({ ratio: 0.9 })
  await button.click()
  const notice = button.locator('..').getByRole('status').filter({ hasText: '소리를 재생하지 못했어요' })
  await expect(notice).toContainText('소리를 재생하지 못했어요')
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

test('places comparative examples and explorer scores side-by-side or stacked depending on screen width', async ({ page }) => {
  await prepare(page)

  const pairs: Array<[string, string]> = [
    ['treble-lines', 'treble-spaces'],
    ['bass-lines', 'bass-spaces'],
    ['middle-treble', 'middle-bass'],
  ]

  // 1280x800: 세 쌍 모두 나란히 (top 일치 ±1px, 첫째 right <= 둘째 left)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/learn/reading')
  await expect(page.locator('main figure[data-example] svg')).toHaveCount(8)

  for (const [id1, id2] of pairs) {
    const fig1 = page.locator(`[data-example="${id1}"]`)
    const fig2 = page.locator(`[data-example="${id2}"]`)
    const b1 = await fig1.boundingBox()
    const b2 = await fig2.boundingBox()
    expect(b1).toBeTruthy()
    expect(b2).toBeTruthy()
    expect(Math.abs(b1!.y - b2!.y), `${id1} and ${id2} should have equal top on 1280px`).toBeLessThanOrEqual(1.0)
    expect(b1!.x + b1!.width, `${id1} right <= ${id2} left on 1280px`).toBeLessThanOrEqual(b2!.x + 1.0)
  }

  // 390x844: treble, bass는 위아래, middle은 나란히
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.locator('main figure[data-example] svg')).toHaveCount(8)

  for (const [id1, id2] of [['treble-lines', 'treble-spaces'], ['bass-lines', 'bass-spaces']] as const) {
    const fig1 = page.locator(`[data-example="${id1}"]`)
    const fig2 = page.locator(`[data-example="${id2}"]`)
    const b1 = await fig1.boundingBox()
    const b2 = await fig2.boundingBox()
    expect(b1).toBeTruthy()
    expect(b2).toBeTruthy()
    expect(b2!.y, `${id2} top >= ${id1} bottom on 390px`).toBeGreaterThanOrEqual(b1!.y + b1!.height - 1.0)
  }

  const [m1, m2] = ['middle-treble', 'middle-bass']
  const mb1 = await page.locator(`[data-example="${m1}"]`).boundingBox()
  const mb2 = await page.locator(`[data-example="${m2}"]`).boundingBox()
  expect(mb1).toBeTruthy()
  expect(mb2).toBeTruthy()
  expect(Math.abs(mb1!.y - mb2!.y), 'middle-c pair should have equal top on 390px').toBeLessThanOrEqual(1.0)
  expect(mb1!.x + mb1!.width, 'middle-c first right <= second left on 390px').toBeLessThanOrEqual(mb2!.x + 1.0)

  // 390x844, 320x568: 탐색기에서 가운데 도(처음 상태)는 나란히, 다른 음(레) 선택 시 한 열 + 폭 일치
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
    await page.goto('/learn/reading')
    await expect(page.locator('main figure[data-example] svg')).toHaveCount(8)

    const area = explorer(page)
    const selNote = area.locator('[data-example="selected-note"]')
    const selBass = area.locator('[data-example="selected-middle-bass"]')
    await expect(selNote.locator('svg')).toHaveCount(1)
    await expect(selBass.locator('svg')).toHaveCount(1)

    const noteBox = await selNote.boundingBox()
    const bassBox = await selBass.boundingBox()
    expect(noteBox).toBeTruthy()
    expect(bassBox).toBeTruthy()
    expect(Math.abs(noteBox!.y - bassBox!.y), `explorer middle-c pair should have equal top at ${width}px`).toBeLessThanOrEqual(1.0)
    expect(noteBox!.x + noteBox!.width, `explorer middle-c first right <= second left at ${width}px`).toBeLessThanOrEqual(bassBox!.x + 1.0)

    // 다른 흰 건반(레) 선택
    await area.getByRole('button', { name: '음 선택: 레 (4옥타브)', exact: true }).click()
    await expect(selNote.locator('svg')).toHaveCount(1)
    await expect(selBass).toHaveCount(0)

    const newNoteBox = await selNote.boundingBox()
    const containerBox = await selNote.locator('..').boundingBox()
    expect(newNoteBox).toBeTruthy()
    expect(containerBox).toBeTruthy()
    expect(Math.abs(newNoteBox!.width - containerBox!.width), `selected-note frame width equals explorer container width at ${width}px`).toBeLessThanOrEqual(1.0)
  }
})
