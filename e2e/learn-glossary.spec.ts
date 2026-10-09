import { expect, test } from '@playwright/test'

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

      const stateWhileFiltered = await page.evaluate(() => {
        const local = Object.entries(localStorage).flat().join(' ')
        const session = Object.entries(sessionStorage).flat().join(' ')
        const all = `${local} ${session} ${document.cookie} ${location.search} ${location.hash}`
        return {
          search: location.search,
          hasTerm: all.includes('박자') || all.includes(encodeURIComponent('박자')),
        }
      })
      expect(stateWhileFiltered.search).toBe('')
      expect(stateWhileFiltered.hasTerm).toBe(false)

      const scrollY = await page.evaluate(() => window.scrollY)
      expect(scrollY).toBe(0)

      const meterDt = page.locator('#term-time-signature dt')
      await expect(meterDt).toBeInViewport()

      await searchInput.fill('없는말')
      await expect(page.getByRole('status')).toHaveText('용어 0개')
      await expect(page.getByText('찾는 용어가 없어요. 다른 말로 찾아보세요.')).toBeVisible()

      await searchInput.fill('')
      await expect(page.getByRole('status')).toHaveText('용어 25개')

      await page.reload()
      await expect(page.getByRole('searchbox', { name: '용어 찾기' })).toHaveValue('')
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
