import { expect, test } from '@playwright/test'

/**
 * Issue #146 stage 3: the explore cards have to hold one reading order and stay
 * reachable at the audited sizes. jsdom performs no layout, so the jest suite can
 * only pin which fields render and that each card is a link; whether a long Korean
 * title overflows the page or the first card is pushed off the opening screen is a
 * question about real geometry, and only a real browser answers it.
 *
 * The 200% case uses CSS zoom, as the rest of this suite does. That is not the same
 * as the browser's own zoom or a real device, and this file does not claim to be.
 */

const sheets = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  title:
    index === 0
      ? '아주 긴 제목을 가진 공개 악보 아라베스크 제1번 다장조 연습용 편곡'
      : `공개 악보 ${index + 1}`,
  composer: index === 0 ? '클로드 아실 드뷔시' : `작곡가 ${index + 1}`,
  category: { id: 1, name: '클래식' },
  categoryId: 1,
  isPublic: true,
  provenance: 'omr',
  animationDataUrl: `/explore-${index + 1}.json`,
  createdAt: '2026-09-04T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
  userId: 'owner',
  owner: { id: 'owner', name: '업로더 이름이 조금 긴 계정' },
}))

const viewports = [
  { name: '320 CSS pixels', width: 320, height: 800 },
  { name: 'phone portrait', width: 390, height: 844 },
  { name: 'phone landscape', width: 844, height: 390 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'large desktop', width: 1440, height: 900 },
  { name: 'large desktop with CSS zoom 200%', width: 1440, height: 900, zoom: 2 },
]

/** Serves the public list and records every request the page makes to it. */
async function serveFixture(page: import('@playwright/test').Page) {
  const requests: URL[] = []
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => {
        throw new Error('service worker disabled for route fixture')
      }
    }
  })

  await page.route('**/api/sheet/public**', async route => {
    const url = new URL(route.request().url())
    requests.push(url)
    const search = url.searchParams.get('search')
    const matching = search ? sheets.filter(sheet => sheet.title.includes(search)) : sheets
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sheetMusic: matching,
        pagination: { total: matching.length, limit: 12, offset: 0, hasMore: false },
        categories: [{ id: 1, name: '클래식', count: sheets.length }],
      }),
    })
  })
  return requests
}

for (const viewport of viewports) {
  test(`keeps the explore cards readable and reachable on ${viewport.name}`, async ({ page }) => {
    await serveFixture(page)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/explore')
    if ('zoom' in viewport) {
      await page.evaluate(zoom => { document.documentElement.style.zoom = String(zoom) }, viewport.zoom)
    }

    await expect(page.getByRole('region', { name: '공개 악보 목록' })).toBeVisible()

    // No horizontal overflow: the long title and the long uploader name must wrap
    // or truncate inside the card rather than widening the document.
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyWidth: document.body.scrollWidth,
    }))
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
    expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)

    // Every card is a link to its own sheet, shown once (D-080), so the whole card is
    // one keyboard stop instead of an unreachable click handler.
    const cardLinks = page.locator('.public-sheet-music-browser a[href^="/sheet/"]')
    await expect(cardLinks).toHaveCount(sheets.length)

    // The first card has to be inside the opening screen; the audit's complaint was
    // that duplicated blurbs and a full-viewport wrapper pushed sheets below it.
    await expect(cardLinks.first()).toBeInViewport()

    // Card text stays inside its own card box at every size.
    const firstCardFits = await page.evaluate(() => {
      const link = document.querySelector('.public-sheet-music-browser a[href^="/sheet/"]')
      const heading = link?.querySelector('h3')
      if (!link || !heading) return null
      const card = link.getBoundingClientRect()
      const title = heading.getBoundingClientRect()
      return { withinLeft: title.left >= card.left - 1, withinRight: title.right <= card.right + 1 }
    })
    expect(firstCardFits).not.toBeNull()
    expect(firstCardFits).toEqual({ withinLeft: true, withinRight: true })
  })
}

test('reaches and opens the first explore card with the keyboard alone', async ({ page, browserName }) => {
  await serveFixture(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/explore')

  await expect(page.getByRole('region', { name: '공개 악보 목록' })).toBeVisible()

  const firstCard = page.locator('.public-sheet-music-browser a[href^="/sheet/"]').first()
  await expect(firstCard).toHaveAttribute('href', '/sheet/1')

  // Tab until focus lands on the first card, rather than assuming a fixed tab index.
  let focused = false
  for (let step = 0; step < 40 && !focused; step += 1) {
    await page.keyboard.press('Tab')
    focused = await firstCard.evaluate(node => node === document.activeElement)
  }

  // jsdom cannot compute an outline, so the focus indicator is measured here. globals.css
  // states that `outline: none` must not appear anywhere; a card that only deepens its
  // shadow on focus is not a keyboard focus indicator.
  if (focused) {
    const outline = await firstCard.evaluate(node => {
      const style = getComputedStyle(node)
      return { width: style.outlineWidth, style: style.outlineStyle }
    })
    expect(outline.style).not.toBe('none')
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2)
  }

  if (!focused) {
    // WebKit follows the macOS "press Tab to highlight each item" setting and does
    // not put links in the tab order by default. That is a platform behaviour, not
    // this page's defect. Anywhere else an unreachable card IS the regression this
    // test exists to catch, so the allowance is pinned to the one project that has
    // ever needed it instead of skipping everywhere.
    expect(
      browserName,
      'the first explore card never took keyboard focus in a browser that tabs to links — that is the regression, not a platform setting',
    ).toBe('webkit')
    // Even in WebKit the card must be a real, followable link rather than a click handler.
    await firstCard.focus()
    await expect(firstCard).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/sheet\/1$/)
    return
  }

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/sheet\/1$/)
})

// #197: the browse and search tabs listed the same sheets from two endpoints.
// One screen now holds the list and its conditions, and opening it is one request.
test('finds public sheets on one screen with one request on open', async ({ page }) => {
  const requests = await serveFixture(page)
  await page.goto('/explore')

  await expect(page.getByRole('region', { name: '공개 악보 목록' })).toBeVisible()
  await expect(page.getByTestId('explore-tabs')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '탐색', exact: true })).toHaveCount(0)
  // The old search tab rewrote its parameters on mount and asked again at
  // 500 ms; wait past that before counting.
  await page.waitForTimeout(650)
  expect(requests.map(url => url.pathname)).toEqual(['/api/sheet/public'])

  const category = page.getByLabel('카테고리')
  await category.selectOption('1')
  await expect.poll(() => requests.at(-1)?.searchParams.get('categoryId')).toBe('1')

  const box = page.getByRole('searchbox', { name: '곡명 또는 저작자로 검색' })
  await box.fill('아라베스크')
  await expect.poll(() => requests.at(-1)?.searchParams.get('search')).toBe('아라베스크')
  await expect(page.locator('.public-sheet-music-browser a[href^="/sheet/"]')).toHaveCount(1)

  // Both conditions hold together on the same screen.
  expect(requests.at(-1)?.searchParams.get('categoryId')).toBe('1')
  await expect(category).toHaveValue('1')
  await expect(box).toHaveValue('아라베스크')
})

test('leaves a modified click to the browser instead of navigating in place', async ({ page }) => {
  await serveFixture(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/explore')

  await expect(page.getByRole('region', { name: '공개 악보 목록' })).toBeVisible()
  const firstCard = page.locator('.public-sheet-music-browser a[href^="/sheet/"]').first()

  // The explore page supplies onSheetMusicClick, so an unconditional preventDefault would
  // turn a new-tab request into an in-place router push and defeat the point of the links.
  const context = page.context()
  const before = page.url()
  await firstCard.click({ modifiers: ['ControlOrMeta'] })
  await expect(page).toHaveURL(before)

  // Close anything the browser did open for the new-tab request.
  for (const other of context.pages()) {
    if (other !== page) await other.close()
  }

  // A plain activation still navigates.
  await firstCard.click()
  await expect(page).toHaveURL(/\/sheet\/1$/)
})
