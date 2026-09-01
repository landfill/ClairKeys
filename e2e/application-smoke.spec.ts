import { expect, test } from '@playwright/test'

test.describe('Public application smoke checks', () => {
  test('lets a signed-out visitor explore a public sheet preview', async ({ page }) => {
    const animation = {
      version: '1.0', title: '공개 연습곡', composer: '검증된 작곡가', duration: 3,
      tempo: 100, tempoSource: 'score', timingReferenceBpm: 100, timeSignature: '4/4',
      notes: [{ midi: 60, start: 0, duration: 1 }],
    }
    await page.addInitScript(() => {
      // The app's service worker would otherwise serve a stale 404 before Playwright's route fixture.
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register = async () => {
          throw new Error('service worker disabled for route fixture')
        }
      }
    })
    let privateAnimationRequests = 0
    await page.route('**/*', async route => {
      const pathname = new URL(route.request().url()).pathname
      if (pathname === '/public.json') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(animation) })
      } else if (pathname === '/api/sheet/public') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, sheetMusic: [{
            id: 1, title: '공개 연습곡', composer: '검증된 작곡가', category: { id: 1, name: '클래식' },
            categoryId: 1, isPublic: true, provenance: 'omr', animationDataUrl: '/public.json',
            createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z', userId: 'owner',
            owner: { id: 'owner', name: '작곡가' },
          }], pagination: { total: 1, limit: 8, offset: 0, hasMore: false } })
        })
      } else if (pathname === '/api/sheet/1') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, sheetMusic: {
            id: 1, title: '공개 연습곡', composer: '검증된 작곡가', category: '클래식', categoryId: 1,
            isPublic: true, provenance: 'omr', availability: 'ready', animationDataUrl: '/public.json',
            createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z', owner: null,
          } })
        })
      } else if (pathname === '/api/files/animation') {
        privateAnimationRequests += 1
        await route.continue()
      } else {
        await route.continue()
      }
    })
    await page.goto('/explore')
    await page.getByText('공개 연습곡').first().click()
    await expect(page).toHaveURL(/\/sheet\/1$/)
    await expect(page.getByText(/검증된 작곡가/).first()).toBeInViewport()
    await expect(page.getByText('미리보기')).toBeVisible()
    const playButton = page.getByTestId('playback-play')
    await expect(playButton).toBeInViewport()
    await expect(playButton).toBeEnabled()
    await playButton.click()
    expect(privateAnimationRequests).toBe(0)
  })

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
   * 이슈 #76 완료 조건 1은 관측 가능한 형태로 좁혀져 있다 — 홈 최초 뷰포트 안에 낙하 노트 결과 영역,
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
      ['낙하 노트 결과 영역', main.getByTestId('falling-notes-result-area')],
      ['3단계 시각화', main.getByRole('heading', { name: '어떻게 되나요' })],
    ] as const) {
      const result = await fitsFirstScreen(locator)
      expect(result.ok, `${label}이 최초 뷰포트를 벗어난다 — ${result.reason}`).toBe(true)
    }
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

  test('opens search with one public request and no user-category request', async ({ page }) => {
    let searchRequests = 0
    let categoryRequests = 0

    await page.addInitScript(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register = async () => {
          throw new Error('service worker disabled for route fixture')
        }
      }
    })

    await page.route('**/api/sheet/public**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          sheetMusic: [],
          pagination: { total: 0, limit: 8, offset: 0, hasMore: false },
        }),
      })
    })
    await page.route('**/api/sheet/search**', async route => {
      searchRequests += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          sheetMusic: [{
            id: 105,
            title: '검색 성능 검증곡',
            composer: '검증 작곡가',
            userId: 'owner',
            categoryId: 1,
            category: { id: 1, name: '클래식' },
            isPublic: true,
            provenance: 'omr',
            animationDataUrl: '/public.json',
            createdAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-09-01T00:00:00.000Z',
            owner: { id: 'owner', name: '검증자' },
          }],
          pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
          filters: {
            categories: [{ id: 1, name: '클래식', count: 1 }],
            totalPublic: 1,
            totalPrivate: 0,
          },
        }),
      })
    })
    await page.route('**/api/categories**', async route => {
      categoryRequests += 1
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto('/explore')
    await page.getByRole('button', { name: '검색', exact: true }).click()

    await expect(page.getByPlaceholder('곡명 또는 저작자로 검색...')).toBeVisible()
    await expect(page.getByText('검색 성능 검증곡')).toBeVisible()
    // The previous mount-time parameter rewrite scheduled a second request at
    // 500 ms. Wait past that boundary before asserting the request count.
    await page.waitForTimeout(650)
    expect(searchRequests).toBe(1)
    expect(categoryRequests).toBe(0)
  })
})
