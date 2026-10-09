import { expect, test, type Locator, type Page } from '@playwright/test'

async function clickAtCenter(page: Page, locator: Locator) {
  const box = await locator.boundingBox()
  expect(box, '클릭 대상 요소의 boundingBox가 있어야 함').toBeTruthy()
  if (!box) return

  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  const hitCheck = await locator.evaluate(
    (el, { x, y }) => {
      const inBounds = x >= 0 && x < window.innerWidth && y >= 0 && y < window.innerHeight
      const atPoint = document.elementFromPoint(x, y)
      const hitsTarget = !!atPoint && (atPoint === el || el.contains(atPoint))
      return { inBounds, hitsTarget, innerWidth: window.innerWidth, innerHeight: window.innerHeight }
    },
    { x: cx, y: cy }
  )

  expect(hitCheck.inBounds, `중심 좌표 (${cx}, ${cy})가 뷰포트 (0..${hitCheck.innerWidth}, 0..${hitCheck.innerHeight}) 밖임`).toBe(true)
  expect(hitCheck.hitsTarget, `중심 좌표 (${cx}, ${cy})에서 대상 요소 또는 자손이 hit-test되지 않음`).toBe(true)

  await page.mouse.click(cx, cy)
}

test('opens a public glossary from the map and follows a term to its lesson section', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/learn')
  await page.getByRole('link', { name: '용어 사전', exact: true }).click()
  await expect(page).toHaveURL(/\/learn\/glossary$/)
  await expect(page.getByRole('heading', { level: 1, name: '용어 사전' })).toBeVisible()
  await page.getByRole('link', { name: '기다리기 모드: 연습 방법 레슨에서 보기', exact: true }).click()
  await expect(page).toHaveURL(/\/learn\/practice#wait-mode$/)
  await expect(page.getByRole('heading', { name: '기다리기 모드', exact: true })).toBeInViewport()
  await page.getByRole('navigation', { name: '레슨 이동' }).getByRole('link', { name: '용어 사전' }).click()
  await expect(page).toHaveURL(/\/learn\/glossary$/)
  expect(errors).toEqual([])
})

test('every definition links to an existing public lesson section', async ({ page, request }) => {
  const response = await page.goto('/learn/glossary')
  expect(response?.status()).toBe(200)
  const links = await page.locator('dd a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!))
  expect(links.length).toBe(25)
  const pages = new Map<string, string>()
  for (const link of links) {
    const [path, anchor] = link.split('#')
    expect(anchor).toBeTruthy()
    if (!pages.has(path)) {
      const lesson = await request.get(path)
      expect(lesson.status()).toBe(200)
      expect(new URL(lesson.url()).pathname).toBe(path)
      pages.set(path, await lesson.text())
    }
    expect(pages.get(path)).toContain(`id="${anchor}"`)
  }
})

test('category chips filter by keyboard and the glossary fits 320 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/learn/glossary')

  const practiceChip = page.getByRole('group', { name: '용어 분류' }).getByRole('button', { name: '재생과 연습' })
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    const isFocused = await practiceChip.evaluate(el => el === document.activeElement)
    if (isFocused) break
  }
  await expect(practiceChip).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(practiceChip).toHaveAttribute('aria-pressed', 'true')
  const mainHeadings = page.locator('main').getByRole('heading', { level: 2 })
  await expect(mainHeadings).toHaveCount(1)
  await expect(mainHeadings).toHaveText('재생과 연습')
  await expect(page.getByRole('status')).toHaveText('용어 6개')

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
  }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1)

  const chipContainer = page.getByRole('group', { name: '용어 분류' })
  const canScrollX = await chipContainer.evaluate(el => el.scrollWidth > el.clientWidth)
  expect(canScrollX).toBe(true)

  const allChip = page.getByRole('group', { name: '용어 분류' }).getByRole('button', { name: '전체' })
  await allChip.click()
  await expect(allChip).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status')).toHaveText('용어 25개')
})

test('finds a term within the first screen from two typed characters', async ({ page }) => {
  const viewports = [
    { name: '1280x800', width: 1280, height: 800 },
    { name: '390x844', width: 390, height: 844 },
  ]

  for (const { name, width, height } of viewports) {
    await test.step(`${name} 뷰포트에서 두 글자 검색`, async () => {
      await page.setViewportSize({ width, height })
      await page.goto('/learn/glossary')

      const searchInput = page.getByRole('searchbox', { name: '용어 찾기' })
      await searchInput.fill('박자')
      await expect(page.getByRole('status')).toHaveText('용어 4개')

      const scrollY = await page.evaluate(() => window.scrollY)
      expect(scrollY).toBe(0)

      const meterDt = page.locator('#term-time-signature dt')
      await expect(meterDt).toBeInViewport()

      await searchInput.fill('없는말')
      await expect(page.getByRole('status')).toHaveText('용어 0개')
      await expect(page.getByText('찾는 용어가 없어요. 다른 말로 찾아보세요.')).toBeVisible()

      await searchInput.fill('')
      await expect(page.getByRole('status')).toHaveText('용어 25개')

      // 입력을 '박자'로 다시 채우고 '재생과 연습' 칩 클릭
      await searchInput.fill('박자')
      const practiceChip = page.getByRole('group', { name: '용어 분류' }).getByRole('button', { name: '재생과 연습' })
      await practiceChip.scrollIntoViewIfNeeded()
      await clickAtCenter(page, practiceChip)

      await expect(page.getByRole('status')).toHaveText('용어 2개')
      await expect(practiceChip).toHaveAttribute('aria-pressed', 'true')
      await expect(page.locator('#term-metronome')).toBeVisible()
      await expect(page.locator('#term-count-in')).toBeVisible()

      // 필터가 적용된 상태에서 저장소 단언
      const stateWhileFiltered = await page.evaluate(() => {
        const localEntries = Object.entries(localStorage)
        const sessionEntries = Object.entries(sessionStorage)
        const local = localEntries.flat().join(' ')
        const session = sessionEntries.flat().join(' ')
        const all = `${local} ${session} ${document.cookie} ${location.search} ${location.hash}`
        const localKeys = Object.keys(localStorage)
        const sessionKeys = Object.keys(sessionStorage)
        return {
          search: location.search,
          hasTerm: all.includes('박자') || all.includes(encodeURIComponent('박자')),
          hasGlossaryKey: [...localKeys, ...sessionKeys].some(k => k.toLowerCase().includes('glossary')),
        }
      })
      expect(stateWhileFiltered.search).toBe('')
      expect(stateWhileFiltered.hasTerm).toBe(false)
      expect(stateWhileFiltered.hasGlossaryKey).toBe(false)

      // 필터가 걸린 채로 새로고침 후 초기화 확인
      await page.reload()
      const searchInputAfterReload = page.getByRole('searchbox', { name: '용어 찾기' })
      await expect(searchInputAfterReload).toHaveValue('')
      const allChip = page.getByRole('group', { name: '용어 분류' }).getByRole('button', { name: '전체' })
      const practiceChipAfterReload = page.getByRole('group', { name: '용어 분류' }).getByRole('button', { name: '재생과 연습' })
      await expect(allChip).toHaveAttribute('aria-pressed', 'true')
      await expect(practiceChipAfterReload).toHaveAttribute('aria-pressed', 'false')
      await expect(page.getByRole('status')).toHaveText('용어 25개')
    })
  }
})

test('lesson term links land on glossary entries that are not hidden under the sticky bar', async ({ page, request }) => {
  const glossaryHtmlResponse = await request.get('/learn/glossary')
  expect(glossaryHtmlResponse.status()).toBe(200)
  const glossaryHtml = await glossaryHtmlResponse.text()

  const lessonPaths = [
    '/learn/keyboard',
    '/learn/reading',
    '/learn/reading/rhythm',
    '/learn/hands',
    '/learn/practice',
  ]

  for (const lessonPath of lessonPaths) {
    const res = await request.get(lessonPath)
    expect(res.status()).toBe(200)
    const html = await res.text()
    const matches = [...html.matchAll(/href="\/learn\/glossary#(term-[a-z0-9-]+)"/g)]
    expect(matches.length).toBeGreaterThan(0)
    for (const match of matches) {
      const termId = match[1]
      expect(glossaryHtml).toContain(`id="${termId}"`)
    }
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/learn/reading/rhythm')
  const termLink = page.locator('a[href="/learn/glossary#term-time-signature"]')
  await termLink.click()
  await expect(page).toHaveURL(/\/learn\/glossary#term-time-signature$/)

  const termDt = page.locator('#term-time-signature dt')
  await expect(termDt).toBeInViewport()

  const { dtTop, stickyBottom } = await page.evaluate(() => {
    const dt = document.querySelector('#term-time-signature dt')!
    const stickyBar = document.querySelector('[data-glossary-controls]')!
    return {
      dtTop: dt.getBoundingClientRect().top,
      stickyBottom: stickyBar.getBoundingClientRect().bottom,
    }
  })
  expect(dtTop).toBeGreaterThanOrEqual(stickyBottom)
})
