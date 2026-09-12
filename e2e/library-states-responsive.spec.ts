import { expect, test, type Locator, type Page } from '@playwright/test'
import { encode } from 'next-auth/jwt'

/**
 * Issue #146 stage 4 — 기존 상태와 반응형·키보드 포커스·확대 검증.
 *
 * 내 악보(`/library`)는 이 이슈가 "우선 개선"으로 지목한 화면인데, 브라우저로 측정한 근거가
 * 한 번도 남지 않은 유일한 화면이다. PR148이 카드 폭·버튼 줄바꿈·정렬 표시를 고쳤지만 그
 * 판정은 사람이 화면을 본 기록이었고, jest는 jsdom이라 레이아웃을 계산하지 않는다. 버튼이
 * 실제로 44px인지, 플로팅 업로드 버튼이 카드 동작을 덮는지, 200% 확대에서 문서가 가로로
 * 넘치는지는 좌표를 재야만 답이 나온다.
 *
 * 상태(로딩·빈 목록·검색 결과 없음·처리 중·변환 오류·불러오기 실패)도 여기서 함께 본다.
 * DS-7이 정한 규칙은 "무엇이 잘못됐는지 + 무엇을 하면 되는지"이고, 그 규칙을 지키는지는
 * 상태마다 실제로 화면을 만들어 봐야 확인된다.
 *
 * 200% 케이스는 이 스위트의 다른 스펙과 같이 CSS zoom이다. 브라우저 자체의 확대나 실기기와
 * 같지 않고, 이 파일은 그렇다고 주장하지 않는다.
 *
 * `/library`는 보호 라우트다. D-058이 정한 선례대로 `NEXTAUTH_SECRET`으로 세션 쿠키를 발급해
 * 화면을 띄우기만 한다 — 인증·OAuth·DB에 대해 아무것도 주장하지 않는 렌더링 fixture다.
 */

const LONG_TITLE = '아주 긴 제목을 가진 내 악보 아라베스크 제1번 다장조 연습용 편곡 최종 수정본'

type Availability = 'ready' | 'processing' | 'failed' | 'unknown'

function sheet(id: number, title: string, availability: Availability) {
  return {
    id,
    title,
    composer: id === 1 ? '클로드 아실 드뷔시 · 편곡자 이름도 짧지 않다' : `작곡가 ${id}`,
    userId: 'e2e-user',
    categoryId: 1,
    category: { id: 1, name: '클래식', userId: 'e2e-user', createdAt: '2026-09-01T00:00:00.000Z' },
    isPublic: id % 2 === 0,
    provenance: 'omr',
    availability,
    animationDataUrl: availability === 'ready' ? `/library-${id}.json` : '',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: `2026-09-0${id}T00:00:00.000Z`,
  }
}

/** 네 상태를 한 화면에 모아 둔다 — 카드가 상태마다 다른 크기를 갖는지 한 번에 드러난다. */
const sheets = [
  sheet(1, LONG_TITLE, 'ready'),
  sheet(2, '처리 중 악보', 'processing'),
  sheet(3, '변환 오류 악보', 'failed'),
  sheet(4, '확인 필요 악보', 'unknown'),
]

const viewports = [
  { name: '320 CSS pixels', width: 320, height: 800 },
  { name: 'phone portrait', width: 390, height: 844 },
  { name: 'phone landscape', width: 844, height: 390 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'large desktop', width: 1440, height: 900 },
  { name: 'large desktop with CSS zoom 200%', width: 1440, height: 900, zoom: 2 },
]

/**
 * 미들웨어가 요구하는 건 "해독되는 토큰"뿐이다(`withAuth`의 `authorized`는 `!!token`만 본다).
 * 그래서 DB도 OAuth 공급자도 필요 없다. D-058과 같은 방식이다.
 */
async function signIn(page: Page) {
  const secret = process.env.NEXTAUTH_SECRET ?? 'test-secret'
  const sessionToken = await encode({
    secret,
    token: { sub: 'e2e-user', name: '연습하는 사람', email: 'e2e@example.com', databaseUserId: 'e2e-user' },
  })

  await page.context().addCookies([
    {
      name: 'next-auth.session-token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
}

interface FixtureOptions {
  /** 목록 응답. 기본은 네 상태 카드. */
  list?: unknown[]
  /** 목록 요청에 대한 HTTP 상태. 500이면 불러오기 실패 상태를 만든다. */
  status?: number
  /** 목록 응답을 늦춰 로딩 상태를 관찰 가능하게 만든다. */
  delayMs?: number
}

async function serveFixture(page: Page, options: FixtureOptions = {}) {
  await signIn(page)

  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => {
        throw new Error('service worker disabled for route fixture')
      }
    }
  })

  await page.route('**/api/auth/session**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'e2e-user', name: '연습하는 사람', email: 'e2e@example.com' },
        expires: '2099-01-01T00:00:00.000Z',
      }),
    })
  })

  await page.route('**/api/categories**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: '클래식', userId: 'e2e-user', createdAt: '2026-09-01T00:00:00.000Z' }]),
    })
  })

  // `/api/sheet`와 `/api/sheet/public`은 접두사가 같다. 글롭으로는 갈라지지 않으므로 pathname으로
  // 정확히 판정한다.
  await page.route(
    url => url.pathname === '/api/sheet',
    async route => {
      if (options.delayMs) await new Promise(resolve => setTimeout(resolve, options.delayMs))
      if (options.status && options.status >= 400) {
        await route.fulfill({ status: options.status, contentType: 'application/json', body: '{"error":"server"}' })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, sheetMusic: options.list ?? sheets }),
      })
    },
  )
}

/** 카드 그리드 안의 모든 조작 가능한 동작(주 동작 + 관리 동작). */
function cardActions(page: Page): Locator {
  return page.locator('[data-testid="library-sheet-grid"] a, [data-testid="library-sheet-grid"] button')
}

async function applyZoom(page: Page, zoom: number | undefined) {
  if (!zoom) return
  await page.evaluate(value => {
    document.documentElement.style.zoom = String(value)
  }, zoom)
}

for (const viewport of viewports) {
  test(`keeps every 내 악보 card action usable on ${viewport.name}`, async ({ page }) => {
    await serveFixture(page)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/library')
    await applyZoom(page, 'zoom' in viewport ? viewport.zoom : undefined)

    await expect(page.getByRole('heading', { level: 1, name: '내 악보' })).toBeVisible()
    const grid = page.getByTestId('library-sheet-grid')
    await expect(grid).toBeVisible()

    // 가로 넘침 없음. 긴 한글 제목과 긴 저작자 이름은 카드 안에서 줄바꿈·잘림으로 처리돼야 하고
    // 문서를 넓혀서는 안 된다.
    //
    // 확대 케이스에서 `documentElement.scrollWidth`는 WebKit에서 확대 전 좌표계를 보고해
    // 실제 넘침이 아닌 값을 낸다(PR157에서 clean main과 동일함을 확인했다). 그래서 확대
    // 케이스는 정확한 쪽인 `body.scrollWidth`만 본다.
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyWidth: document.body.scrollWidth,
    }))
    expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
    if (!('zoom' in viewport)) {
      expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
    }

    // 네 장이 모두 그려진다. 상태마다 카드가 사라지거나 합쳐지지 않는다.
    await expect(grid.locator('> *')).toHaveCount(4)

    // 모든 카드 동작이 44px 높이를 확보하고, 글자가 버튼 밖으로 새지 않는다.
    // (확대 케이스에서는 좌표가 배로 잡히므로 같은 기준이 그대로 성립한다.)
    const actions = await cardActions(page).evaluateAll(nodes =>
      nodes.map(node => {
        const rect = node.getBoundingClientRect()
        return {
          label: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 40),
          height: rect.height,
          fitsText: node.scrollWidth <= node.clientWidth + 1,
        }
      }),
    )
    expect(actions.length).toBeGreaterThanOrEqual(4)
    const scale = 'zoom' in viewport ? (viewport.zoom as number) : 1
    for (const action of actions) {
      expect(action.height, `${action.label} 높이가 44px 미만이다`).toBeGreaterThanOrEqual(43.5 * scale)
      expect(action.fitsText, `${action.label} 글자가 버튼을 넘친다`).toBe(true)
    }

    // 긴 제목은 카드 안에 머문다.
    const titleFits = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="library-sheet-grid"] > *')
      const heading = card?.querySelector('h3')
      if (!card || !heading) return null
      const cardRect = card.getBoundingClientRect()
      const titleRect = heading.getBoundingClientRect()
      return { withinLeft: titleRect.left >= cardRect.left - 1, withinRight: titleRect.right <= cardRect.right + 1 }
    })
    expect(titleFits).toEqual({ withinLeft: true, withinRight: true })

    // 목록 끝까지 내렸을 때 플로팅 업로드 버튼이 카드 동작을 덮지 않는다. 스크롤 중간에서
    // 겹치는 것은 어떤 플로팅 버튼에서나 일어나는 일이고 이슈가 요구한 것은 "하단 여백"이므로
    // 문서 끝에서 판정한다.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const occlusion = await page.evaluate(() => {
      const fab = document.querySelector('[data-testid="library-upload-fab"]')
      if (!fab) return null
      const fabRect = fab.getBoundingClientRect()
      const covered: string[] = []
      for (const node of document.querySelectorAll('[data-testid="library-sheet-grid"] a, [data-testid="library-sheet-grid"] button')) {
        const rect = node.getBoundingClientRect()
        const overlaps =
          rect.right > fabRect.left && rect.left < fabRect.right &&
          rect.bottom > fabRect.top && rect.top < fabRect.bottom
        if (overlaps) covered.push((node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 40))
      }
      return covered
    })
    expect(occlusion, '플로팅 업로드 버튼이 카드 동작을 덮는다').toEqual([])
  })
}

test('names the loading state so it is announced instead of being a silent spinner', async ({ page }) => {
  await serveFixture(page, { delayMs: 2500 })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/library')

  const status = page.getByRole('status')
  await expect(status.first()).toBeVisible()
  await expect(status.first()).toHaveAccessibleName(/불러오는 중/)

  // 목록이 도착하면 로딩 상태는 사라진다.
  await expect(page.getByTestId('library-sheet-grid')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('says the library could not be loaded instead of claiming it is empty', async ({ page }) => {
  await serveFixture(page, { status: 500 })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/library')

  // 불러오기 실패는 "악보가 없습니다"가 아니다 — 원인이 다르면 다음 행동도 다르다.
  //
  // `getByRole('alert')`만 쓰면 Next가 라우트 전환을 읽어 주기 위해 심어 두는 빈
  // `__next-route-announcer__`가 먼저 잡힌다. `StatusState`가 그리는 `section`으로 좁힌다.
  const alert = page.locator('section[role="alert"]')
  await expect(alert).toBeVisible()
  await expect(alert).toContainText('악보 목록을 불러오지 못했습니다')
  await expect(alert.getByRole('button', { name: '다시 시도' })).toBeVisible()
  await expect(page.getByText('악보가 없습니다')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /새 악보 업로드$/ })).toHaveCount(0)
})

test('offers an upload action for an empty library and does not leave a blank screen under it', async ({ page }) => {
  await serveFixture(page, { list: [] })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/library')

  await expect(page.getByText('악보가 없습니다')).toBeVisible()
  await expect(page.getByRole('link', { name: '새 악보 업로드' })).toHaveAttribute('href', '/upload')

  // 빈 상태 카드 아래로 한 화면이 더 스크롤되면, 사용자는 목록이 더 있는지 확인하러 내려간 뒤
  // 아무것도 없는 화면을 본다. 문서 전체 높이가 아니라 카드 아래의 빈 공간을 재야 기준이 된다 —
  // 머리글·탭·검색은 정상적인 내용이고, 문제는 내용이 끝난 뒤의 여백이다.
  const gap = await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('section'))
      .find(node => node.textContent?.includes('악보가 없습니다'))
    if (!card) return null
    const rect = card.getBoundingClientRect()
    return {
      below: Math.round(document.documentElement.scrollHeight - (rect.bottom + window.scrollY)),
      client: document.documentElement.clientHeight,
    }
  })
  expect(gap).not.toBeNull()
  expect(gap!.below, `빈 상태 카드 아래 여백이 한 화면을 넘는다 (${gap!.below} vs ${gap!.client})`)
    .toBeLessThan(gap!.client)
})

test('tells a fruitless search apart from an empty library', async ({ page }) => {
  await serveFixture(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/library')

  await expect(page.getByTestId('library-sheet-grid')).toBeVisible()
  await page.getByLabel('내 악보 검색').fill('존재하지 않는 곡명')

  await expect(page.getByText('검색 결과가 없습니다')).toBeVisible()
  await expect(page.getByRole('link', { name: '검색 초기화' })).toBeVisible()
})

test('keeps the processing card action the same size as a playable one', async ({ page }) => {
  await serveFixture(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/library')

  const grid = page.getByTestId('library-sheet-grid')
  await expect(grid).toBeVisible()

  // 기본 정렬이 `updatedAt` 내림차순이므로 카드는 인덱스가 아니라 제목으로 찾는다.
  const sizes = await page.evaluate(titles => {
    const measure = (title: string) => {
      const card = Array.from(document.querySelectorAll('[data-testid="library-sheet-grid"] > *'))
        .find(node => node.querySelector('h3')?.textContent?.trim() === title)
      const action = card?.querySelector('a, button')
      const rect = action?.getBoundingClientRect()
      return { text: (action?.textContent || '').trim(), width: rect?.width ?? 0, height: rect?.height ?? 0 }
    }
    return { ready: measure(titles.ready), processing: measure(titles.processing) }
  }, { ready: LONG_TITLE, processing: '처리 중 악보' })

  const ready = sizes.ready
  const processing = sizes.processing
  expect(processing.text).toBe('처리 중')
  // 같은 자리의 같은 역할인데 상태에 따라 크기가 달라지면, 상태가 바뀔 때 화면이 흔들린다.
  expect(Math.abs(processing.height - ready.height)).toBeLessThanOrEqual(1)
  expect(Math.abs(processing.width - ready.width)).toBeLessThanOrEqual(1)
})

test('gives every card action a name that says which sheet it acts on', async ({ page }) => {
  await serveFixture(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/library')

  await expect(page.getByTestId('library-sheet-grid')).toBeVisible()

  // 카드가 여럿일 때 "삭제"라는 이름만 들리면 어느 악보의 삭제인지 알 수 없다. 화면 없이 쓰는
  // 사람에게는 이름이 유일해야 동작을 고를 수 있다.
  const names = await cardActions(page).evaluateAll(nodes =>
    nodes.map(node => (node.getAttribute('aria-label') || node.textContent || '').trim()),
  )
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
  expect(duplicates, `카드 동작 이름이 중복된다: ${duplicates.join(', ')}`).toEqual([])
})

test('reaches a card action with the keyboard and shows where the focus is', async ({ page, browserName }) => {
  await serveFixture(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/library')

  await expect(page.getByTestId('library-sheet-grid')).toBeVisible()
  const editButton = page.getByRole('button', { name: `${LONG_TITLE} 제목 수정` })

  let focused = false
  for (let step = 0; step < 60 && !focused; step += 1) {
    await page.keyboard.press('Tab')
    focused = await editButton.evaluate(node => node === document.activeElement)
  }

  if (!focused) {
    // WebKit은 macOS의 "Tab으로 각 항목 강조" 설정을 따라 기본적으로 링크를 탭 순서에 넣지
    // 않는다. 버튼은 들어가야 하므로, 허용 범위를 실제로 필요한 프로젝트에만 묶어 둔다.
    expect(browserName, '키보드로 카드 관리 동작에 닿지 못했다').toBe('webkit')
    await editButton.focus()
  }

  await expect(editButton).toBeFocused()
  const outline = await editButton.evaluate(node => {
    const style = getComputedStyle(node)
    return { width: style.outlineWidth, style: style.outlineStyle }
  })
  expect(outline.style).not.toBe('none')
  expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2)
})

test('opens the title editor with the keyboard and puts focus inside it', async ({ page }) => {
  await serveFixture(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/library')

  await expect(page.getByTestId('library-sheet-grid')).toBeVisible()
  const editButton = page.getByRole('button', { name: `${LONG_TITLE} 제목 수정` })
  await editButton.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('제목')).toBeFocused()

  // 취소는 목록으로 돌아가고, 제목은 바뀌지 않는다.
  await dialog.getByRole('button', { name: '취소' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 3, name: LONG_TITLE })).toBeVisible()
})
