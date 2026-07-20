import { expect, test } from '@playwright/test'

test.describe('Public application smoke checks', () => {
  test('renders the real home page with accessible navigation', async ({ page }) => {
    const response = await page.goto('/')

    expect(response?.ok()).toBe(true)
    await expect(page).toHaveTitle(/ClairKeys/)
    const main = page.getByRole('main')
    await expect(main).toHaveCount(1)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Clairkeys로 시작하는 스마트 피아노 학습/,
      })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: '시작하기' })).toHaveAttribute(
      'href',
      '/upload'
    )
    await expect(
      main.getByRole('link', { name: '공개 악보 탐색' })
    ).toHaveAttribute('href', '/explore')
  })

  test('keeps browser zoom enabled', async ({ page }) => {
    await page.goto('/')

    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveCount(1)

    const content = (await viewport.getAttribute('content')) ?? ''
    expect(content).not.toContain('maximum-scale')
    expect(content).not.toContain('user-scalable=no')
  })

  test('opens the public sheet-music explorer', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('main')
      .getByRole('link', { name: '공개 악보 탐색' })
      .click()

    await expect(page).toHaveURL(/\/explore$/)
    await expect(
      page.getByRole('heading', { level: 1, name: '공개 악보 탐색' })
    ).toBeVisible()
  })
})
