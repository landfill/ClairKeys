import { expect, test } from '@playwright/test'

test('opens a public glossary from the map and follows a term to its lesson section', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/learn')
  await page.getByRole('link', { name: '용어 사전', exact: true }).click()
  await expect(page).toHaveURL(/\/learn\/glossary$/)
  await expect(page.getByRole('heading', { level: 1, name: '용어 사전' })).toBeVisible()
  await page.getByRole('link', { name: '기다리기 모드 레슨에서 보기', exact: true }).click()
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
  expect(links.length).toBeGreaterThan(20)
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

test('category links work by keyboard and the glossary fits 320 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/learn/glossary')
  const category = page.getByRole('navigation', { name: '용어 분류' }).getByRole('link', { name: '재생과 연습' })
  await category.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#practice$/)
  await expect(page.getByRole('heading', { name: '재생과 연습' })).toBeInViewport()
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1)
})
