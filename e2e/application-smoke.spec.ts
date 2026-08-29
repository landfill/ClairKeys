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
        name: /가지고 있는 PDF 악보를/,
      })
    ).toBeVisible()
    // DS-2: 주 CTA 문구를 `내 악보로 시작하기`로 통일한다 (이슈 #76 완료 조건 2).
    await expect(
      main.getByRole('link', { name: '내 악보로 시작하기' })
    ).toHaveAttribute('href', '/upload')
    await expect(
      main.getByRole('link', { name: '공개 악보 탐색' })
    ).toHaveAttribute('href', '/explore')
  })

  /**
   * 이슈 #76 완료 조건 1은 관측 가능한 형태로 좁혀져 있다 — 홈 최초 뷰포트 안에 낙하 노트 결과,
   * 3단계 시각화, 주 CTA가 모두 있어야 한다. 이해도 자체는 관찰 테스트로만 확인할 수 있다.
   *
   * **`toBeVisible`과 `toBeAttached`로는 이 조건을 검사할 수 없다.** 둘 다 스크롤해야 보이는
   * 요소에도 통과한다. 이 테스트의 첫 판은 그래서 통과하면서도 실제로는 낙하 노트와 3단계가 화면
   * 밖에 있었다. 조건이 "최초 뷰포트 안"이므로 좌표를 직접 잰다.
   */
  test('puts the sample, the three steps and the CTA on the first screen', async ({ page }) => {
    const viewport = { width: 1440, height: 900 }
    await page.setViewportSize(viewport)
    await page.goto('/')

    const main = page.getByRole('main')

    /** 스크롤 위치 0에서 요소가 뷰포트 안에 온전히 들어오는지. */
    const fitsFirstScreen = async (locator: import('@playwright/test').Locator) => {
      const box = await locator.boundingBox()
      if (!box) return { ok: false, reason: 'not rendered' }
      const bottom = box.y + box.height
      return {
        ok: box.y >= 0 && bottom <= viewport.height,
        reason: `top=${Math.round(box.y)} bottom=${Math.round(bottom)} viewport=${viewport.height}`,
      }
    }

    await expect(page.evaluate(() => window.scrollY)).resolves.toBe(0)

    for (const [label, locator] of [
      ['주 CTA', main.getByRole('link', { name: '내 악보로 시작하기' })],
      ['낙하 노트 건반', main.locator('[aria-label$="octave marker"]').first()],
      ['3단계 시각화', main.getByRole('heading', { name: '어떻게 되나요' })],
    ] as const) {
      const result = await fitsFirstScreen(locator)
      expect(result.ok, `${label}이 최초 뷰포트를 벗어난다 — ${result.reason}`).toBe(true)
    }
  })

  test('lets a signed-out visitor play the sample without logging in', async ({ page }) => {
    await page.goto('/')

    const play = page.getByRole('button', { name: /재생|play/i }).first()
    await expect(play).toBeVisible()
    await play.click()

    // 로그인 화면으로 튕기지 않는다.
    await expect(page).toHaveURL(/\/$/)
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
