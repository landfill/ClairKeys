import { expect, test } from '@playwright/test'
import { encode } from 'next-auth/jwt'

/**
 * Issue #146 stage 3, upload form. The jest suite pins which controls exist, in which
 * order, and which labelled group each one sits in. It cannot answer the questions this
 * slice is actually about: whether 곡명 and 저작자 really share a row on a wide screen,
 * whether they really stack on a narrow one, and whether the drop area still eats the
 * opening screen. jsdom performs no layout, so those are measured here.
 *
 * This is the first spec in the suite to open a protected route. `/upload` is guarded
 * twice: `src/middleware.ts` rejects it server-side unless a decodable next-auth JWT
 * cookie is present, and `AuthGuard` then rejects it client-side unless `useSession`
 * resolves. A route fixture alone only answers the second one — the request never
 * reaches the page — so the cookie is minted here with the same `NEXTAUTH_SECRET` that
 * `.github/workflows/pr-checks.yml` already sets for this job.
 *
 * That is a rendering fixture, not a sign-in test. It proves nothing about OAuth, the
 * session callback or the database, and this file claims nothing about them. Issue #7's
 * complaint was specs that asserted behaviour nobody had built; a minted cookie asserts
 * nothing — it only gets the form on screen so its geometry can be measured.
 *
 * The 200% case uses CSS zoom, as the rest of this suite does. That is not the browser's
 * own zoom and not a real device.
 */

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
 * 그래서 DB도 OAuth 공급자도 필요 없다.
 */
async function signIn(page: import('@playwright/test').Page) {
  const secret = process.env.NEXTAUTH_SECRET ?? 'test-secret'
  const sessionToken = await encode({
    secret,
    token: {
      sub: 'e2e-user',
      name: '연습하는 사람',
      email: 'e2e@example.com',
      databaseUserId: 'e2e-user',
    },
  })

  // 호스트가 http이므로 `__Secure-` 접두사가 붙지 않은 기본 이름을 쓴다.
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

async function serveFixture(page: import('@playwright/test').Page) {
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
      body: JSON.stringify([
        { id: 1, name: '클래식' },
        { id: 2, name: '가요' },
      ]),
    })
  })
}

/** 드롭존은 `<label>` 자체다 — 파일 입력을 감싸는 label이 곧 측정 대상이다. */
function dropZone(page: import('@playwright/test').Page) {
  return page.locator('form label:has(input[type="file"])')
}

for (const viewport of viewports) {
  test(`groups the upload form and keeps it inside the page on ${viewport.name}`, async ({ page }) => {
    await serveFixture(page)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/upload')
    if ('zoom' in viewport) {
      await page.evaluate(zoom => { document.documentElement.style.zoom = String(zoom) }, viewport.zoom)
    }

    const title = page.getByLabel(/곡명/)
    await expect(title).toBeVisible()

    // 세 덩어리가 실제로 그려진다. 이름은 legend가 제공하므로 화면 없이도 같은 구분이 전달된다.
    for (const name of ['악보 파일', '곡 정보', '선택 설정']) {
      await expect(page.getByRole('group', { name })).toBeVisible()
    }

    // 한 줄로 묶든 두 줄로 묶든 문서를 옆으로 넓히면 안 된다.
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyWidth: document.body.scrollWidth,
    }))

    // `body.scrollWidth`가 이 페이지에서 믿을 수 있는 쪽이고, 모든 경우에 검사한다.
    expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)

    // 루트 엘리먼트의 스크롤 폭은 CSS zoom이 없을 때만 같은 기준으로 읽힌다. WebKit은 `zoom`이
    // 걸린 문서에서 이 값을 축소 적용 전 좌표로 돌려준다 — 1440 뷰포트에서 1982이고, 이는
    // 991(= `body.scrollWidth`)에 2를 곱한 값이지 실제 넘침이 아니다. 이 슬라이스가 만든
    // 현상인지 확인하려고 병합 전 `main`(64989c7)을 같은 WebKit으로 빌드해 측정했고, 두 값이
    // 브랜치와 정확히 같았다. Chromium에서는 두 값이 일치하므로 검사를 유지한다.
    if (!('zoom' in viewport)) {
      expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
    }

    const geometry = await page.evaluate(() => {
      const form = document.querySelector('form')
      const drop = form?.querySelector('label:has(input[type="file"])')
      const titleField = document.getElementById('sheet-title')
      const composerField = document.getElementById('sheet-composer')
      if (!drop || !titleField || !composerField) return null
      const box = (node: Element) => {
        const rect = node.getBoundingClientRect()
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height, width: rect.width }
      }
      const dropStyle = getComputedStyle(drop)
      return {
        drop: box(drop),
        dropPadding: parseFloat(dropStyle.paddingTop) + parseFloat(dropStyle.paddingBottom),
        title: box(titleField),
        composer: box(composerField),
      }
    })
    expect(geometry).not.toBeNull()
    test.info().annotations.push({ type: 'geometry', description: JSON.stringify(geometry) })

    // 드롭존이 첫 화면을 독차지하지 않는다.
    //
    // 재는 것은 전체 높이가 아니라 이 슬라이스가 실제로 줄인 세로 여백이다. 전체 높이는 안내
    // 문구가 몇 줄로 접히는지에 달려 있고, 그건 이 슬라이스가 통제하지 않는 플랫폼 폰트
    // 메트릭이 정한다 — 같은 CSS·같은 390px에서 macOS는 144px, CI의 Linux는 164px를 냈다.
    // 처음에는 높이에 상한을 뒀고 정확히 그 이유로 CI에서만 깨졌다. 여백은 어디서 재도 같다.
    // 압축 전에는 `py-10`, 위아래 합쳐 80px이었다.
    expect(geometry!.dropPadding).toBeLessThanOrEqual(56)

    // 필드는 좌우 어디로도 자기 칸 밖으로 나가지 않는다.
    expect(geometry!.title.left).toBeGreaterThanOrEqual(0)
    expect(geometry!.composer.right).toBeLessThanOrEqual(overflow.clientWidth + 1)

    // 두 칸으로 쪼갠 곳에서는 각 칸이 휴대폰이 한 칸으로 받는 폭(390px에서 308px)보다 넓어야
    // 한다(D-059). 이 단언이 `phone landscape`(844x390)를 다룬다 — 거기서는 두 칸이 유지되고
    // 각 칸이 365px다. 세로가 390px뿐인 화면에서 굳이 쌓으면 가장 부족한 자원을 더 쓰게 되고,
    // 칸은 휴대폰보다 넓으니 읽기 문제도 아니다. 기기 종류가 아니라 폭이 기준이다.
    const sideBySide =
      Math.abs(geometry!.title.top - geometry!.composer.top) <= 2 &&
      geometry!.composer.left >= geometry!.title.right
    if (sideBySide) {
      expect(geometry!.title.width).toBeGreaterThan(308)
    }
  })
}

/** 곡명·저작자가 한 줄인지, 그때 칸이 얼마나 넓은지. */
async function requiredRow(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const title = document.getElementById('sheet-title')!.getBoundingClientRect()
    const composer = document.getElementById('sheet-composer')!.getBoundingClientRect()
    return {
      // 같은 줄이라는 건 "위가 같고, 하나가 다른 하나의 오른쪽에 있다"로만 확인할 수 있다.
      sideBySide: Math.abs(title.top - composer.top) <= 2 && composer.left >= title.right,
      stacked: composer.top >= title.bottom,
      fieldWidth: title.width,
    }
  })
}

/**
 * 쪼개는 경계를 양쪽에서 고정한다.
 *
 * 규칙은 D-059가 정한다 — "데스크톱"이나 "모바일"이 아니라 폭이다. 쪼갠 칸이 휴대폰이 한 칸으로
 * 받는 폭보다 좁아지면 쪼개는 목적이 사라지므로, 그 값을 기준선으로 삼는다. 처음에는 경계가
 * `sm`(640px)이었고 정확히 640px에서 각 칸이 263px — 390px 휴대폰의 308px보다 좁았다. 지금
 * 경계는 `md`(768px)이고, 이 테스트가 767/768 양쪽을 눌러 두므로 다시 앞당기면 깨진다.
 */
test('never splits the required row into columns narrower than a phone gets', async ({ page }) => {
  await serveFixture(page)
  await page.goto('/upload')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.getByLabel(/곡명/)).toBeVisible()
  const phone = await requiredRow(page)
  expect(phone.stacked).toBe(true)
  expect(phone.sideBySide).toBe(false)

  // 경계 바로 아래는 아직 한 줄로 쌓여 있다.
  await page.setViewportSize({ width: 767, height: 900 })
  await expect(async () => {
    expect((await requiredRow(page)).stacked).toBe(true)
  }).toPass()

  // 경계 위로 올라가면 두 칸이 되고, 그때 각 칸은 휴대폰 한 칸보다 넓어야 한다.
  await page.setViewportSize({ width: 768, height: 900 })
  await expect(async () => {
    expect((await requiredRow(page)).sideBySide).toBe(true)
  }).toPass()
  const split = await requiredRow(page)
  expect(split.fieldWidth).toBeGreaterThan(phone.fieldWidth)
})

test('puts 곡명 and 저작자 side by side on a wide screen', async ({ page }) => {
  await serveFixture(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/upload')
  await expect(page.getByLabel(/곡명/)).toBeVisible()

  expect((await requiredRow(page)).sideBySide).toBe(true)
})

test('stacks 곡명 and 저작자 on a narrow screen', async ({ page }) => {
  await serveFixture(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/upload')
  await expect(page.getByLabel(/곡명/)).toBeVisible()

  // 좁은 화면에서 두 칸으로 쪼개면 한글 제목이 두 글자마다 줄바꿈된다.
  expect((await requiredRow(page)).stacked).toBe(true)
})

test('keeps a visible focus ring on the regrouped required fields', async ({ page }) => {
  await serveFixture(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/upload')

  const title = page.getByLabel(/곡명/)
  await expect(title).toBeVisible()
  await title.focus()
  await expect(title).toBeFocused()

  // jsdom은 outline을 계산하지 못한다. globals.css는 `outline: none`이 어디에도 없어야 한다고
  // 못박고 있고, PR155에서 카드가 정확히 이 방식으로 포커스 표시를 잃은 적이 있다.
  const outline = await title.evaluate(node => {
    const style = getComputedStyle(node)
    return { width: style.outlineWidth, style: style.outlineStyle }
  })
  expect(outline.style).not.toBe('none')
  expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2)
})
