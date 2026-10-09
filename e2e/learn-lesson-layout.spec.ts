import { test, expect, type Locator, type Page } from '@playwright/test'

const LESSONS = [
  { path: '/learn/keyboard', title: '건반', step: '5단계 중 1단계', hasToc: false },
  { path: '/learn/reading', title: '악보 읽기 1', step: '5단계 중 2단계', hasToc: true },
  { path: '/learn/reading/rhythm', title: '악보 읽기 2', step: '5단계 중 3단계', hasToc: true },
  { path: '/learn/hands', title: '손', step: '5단계 중 4단계', hasToc: true },
  { path: '/learn/practice', title: '연습 방법', step: '5단계 중 5단계', hasToc: true },
] as const

// 섹션 id와 제목은 용어 사전·곡 소개·다른 레슨이 링크하는 계약이다(바꾸지 않는다).
const TOC_LESSONS = [
  {
    path: '/learn/reading',
    title: '악보 읽기 1',
    sections: [
      { id: 'staff-intro', title: '오선' },
      { id: 'treble-intro', title: '높은음자리표' },
      { id: 'bass-intro', title: '낮은음자리표' },
      { id: 'middle-c-intro', title: '가운데 도' },
      { id: 'pitch-explorer', title: '오선과 건반 연결하기' },
    ],
  },
  {
    path: '/learn/reading/rhythm',
    title: '악보 읽기 2',
    sections: [
      { id: 'note-lengths', title: '음표의 길이' },
      { id: 'rest-lengths', title: '쉼표' },
      { id: 'dotted-lengths', title: '점음표' },
      { id: 'meters', title: '박자표' },
    ],
  },
  {
    path: '/learn/hands',
    title: '손',
    sections: [
      { id: 'finger-numbers', title: '손가락 번호' },
      { id: 'hand-shape', title: '기본 손 모양' },
      { id: 'five-fingers', title: '다섯 손가락 자리' },
      { id: 'playback-fingers', title: '재생 화면과 연결' },
    ],
  },
  {
    path: '/learn/practice',
    title: '연습 방법',
    sections: [
      { id: 'slow-start', title: '느리게 시작' },
      { id: 'one-hand', title: '한 손씩' },
      { id: 'ab-loop', title: 'A-B 구간 반복' },
      { id: 'wait-mode', title: '기다리기 모드' },
      { id: 'metronome', title: '메트로놈' },
      { id: 'keyboard-shortcuts', title: '키보드 단축키' },
    ],
  },
] as const

const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800, narrow: false },
  { name: '390x844', width: 390, height: 844, narrow: true },
] as const

type Section = { id: string; title: string }

/** 목차가 마운트돼 스크롤 추적과 좁은 화면 sticky가 켜질 때까지 기다린다. */
async function waitForEnhancedToc(page: Page) {
  await expect(page.locator('details[data-enhanced]')).toHaveCount(1)
}

/** 스크롤 계산은 requestAnimationFrame에서 한다. 두 프레임을 넘겨 계산이 끝나게 한다. */
async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
}

async function scrollToRatio(page: Page, ratio: number) {
  await page.evaluate(r => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * r), ratio)
  await settle(page)
}

/** 화면에 보이는 목차의 링크 범위. 넓은 화면은 옆 목차, 좁은 화면은 펼침 목록(닫혀 있어도 DOM에서 aria-current를 읽는다). */
function tocScope(page: Page, narrow: boolean) {
  return narrow ? page.locator('#mobile-lesson-toc') : page.locator('aside nav[aria-label="이 레슨의 내용"]')
}

/** 제목과 가로로 겹치면서 제목보다 위에서 시작하는 sticky·fixed 요소의 가장 아래 끝. 제목의 top이 이 값 이상이면 가려지지 않는다. */
async function coveringStickyBottom(heading: Locator) {
  return heading.evaluate(node => {
    const target = node.getBoundingClientRect()
    let bottom = 0
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (el === node || el.contains(node)) continue
      const position = getComputedStyle(el).position
      if (position !== 'sticky' && position !== 'fixed') continue
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      const overlapX = Math.min(box.right, target.right) - Math.max(box.left, target.left)
      if (overlapX <= 0 || box.top > target.top) continue
      bottom = Math.max(bottom, box.bottom)
    }
    return { top: target.top, stickyBottom: bottom }
  })
}

/**
 * Firefox + Playwright에서 sticky 요소에 locator.click()을 쓰면,
 * 클릭 전 요소를 화면에 들이는 과정에서 sticky 요소의 원래(문서 흐름 안) 위치를 향해
 * 스크롤이 잘못 튀는 부작용이 발생한다.
 * 이를 방지하기 위해 상자의 중심 좌표가 뷰포트 안인지 단언하고,
 * 그 좌표에서 document.elementFromPoint가 대상 요소이거나 그 자손인지 단언한 뒤 누른다.
 */
async function clickAtCenter(page: Page, locator: Locator) {
  const box = await locator.boundingBox()
  expect(box, '클릭 대상 요소의 boundingBox가 있어야 함').toBeTruthy()
  if (!box) return

  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  const hitCheck = await locator.evaluate((el, { x, y }) => {
    const inBounds = x >= 0 && x < window.innerWidth && y >= 0 && y < window.innerHeight
    const atPoint = document.elementFromPoint(x, y)
    const hitsTarget = !!atPoint && (atPoint === el || el.contains(atPoint))
    return { inBounds, hitsTarget, innerWidth: window.innerWidth, innerHeight: window.innerHeight }
  }, { x: cx, y: cy })

  expect(hitCheck.inBounds, `중심 좌표 (${cx}, ${cy})가 뷰포트 (0..${hitCheck.innerWidth}, 0..${hitCheck.innerHeight}) 밖임`).toBe(true)
  expect(hitCheck.hitsTarget, `중심 좌표 (${cx}, ${cy})에서 대상 요소 또는 자손이 hit-test되지 않음`).toBe(true)

  await page.mouse.click(cx, cy)
}

/** 현재 섹션 표시를 단언한다. 목차 안 aria-current는 정확히 1개, 좁은 화면은 summary 글자와 펼친 목록 둘 다 본다. */
async function expectCurrentSection(page: Page, narrow: boolean, section: Section) {
  const scope = tocScope(page, narrow)
  await expect(scope.locator('a[aria-current]')).toHaveCount(1)
  await expect(scope.locator(`a[href="#${section.id}"]`)).toHaveAttribute('aria-current', 'location')
  if (!narrow) return
  const details = page.locator('details')
  const summary = details.locator('summary')
  await expect(summary.locator('span > span')).toHaveText(`· ${section.title}`)
  await clickAtCenter(page, summary)
  await expect(details).toHaveJSProperty('open', true)
  await expect(scope.getByRole('link', { name: section.title, exact: true })).toHaveAttribute('aria-current', 'location')
  await page.keyboard.press('Escape')
  await expect(details).toHaveJSProperty('open', false)
}

test.describe('레슨 공통 레이아웃', () => {
  for (const lesson of LESSONS) {
    test(`위치 표시 및 레슨 헤더 확인: ${lesson.title}`, async ({ page }) => {
      await page.goto(lesson.path)
      const locationNav = page.getByRole('navigation', { name: '현재 위치' })
      await expect(locationNav).toBeVisible()
      const breadcrumbLink = locationNav.getByRole('link', { name: '배우기' })
      await expect(breadcrumbLink).toHaveAttribute('href', '/learn')
      const currentLabel = locationNav.getByText(lesson.title)
      await expect(currentLabel).toHaveAttribute('aria-current', 'page')
      await expect(page.getByText(lesson.step)).toBeVisible()
      await expect(page.getByRole('heading', { level: 1, name: lesson.title })).toBeVisible()
    })

    test(`320px 가로 넘침 없음: ${lesson.title}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 600 })
      await page.goto(lesson.path)
      const overflow = await page.evaluate(() => {
        const el = document.documentElement
        return {
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          hasOverflow: el.scrollWidth > el.clientWidth + 1,
        }
      })
      expect(overflow.hasOverflow, `${lesson.path}에서 가로 넘침 발생: ${JSON.stringify(overflow)}`).toBe(false)
    })
  }

  test('건반 레슨은 섹션이 2개라 목차가 없음', async ({ page }) => {
    await page.goto('/learn/keyboard')
    await expect(page.getByRole('navigation', { name: '이 레슨의 내용' })).toHaveCount(0)
    await expect(page.locator('details summary')).toHaveCount(0)
  })

  for (const lesson of TOC_LESSONS) {
    test(`1280x800 옆 목차가 한 개이고 맨 아래에서도 화면 안에 있음: ${lesson.title}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto(lesson.path)
      await waitForEnhancedToc(page)

      // 1280x800에서는 화면 전체에서 '이 레슨의 내용' nav가 정확히 1개만 접근 가능해야 함
      const tocNav = page.getByRole('navigation', { name: '이 레슨의 내용' })
      await expect(tocNav).toHaveCount(1)
      await expect(tocNav).toBeVisible()

      await scrollToRatio(page, 1)
      await expect(tocNav).toBeInViewport()
      await expectCurrentSection(page, false, lesson.sections[lesson.sections.length - 1])
    })

    for (const viewport of VIEWPORTS) {
      test(`목차 항목으로 다른 섹션에 도달(중간·맨 아래): ${lesson.title} ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(lesson.path)
        await waitForEnhancedToc(page)
        const scope = tocScope(page, viewport.narrow)
        const details = page.locator('details')
        const summary = details.locator('summary')
        const last = lesson.sections.length - 1

        const positions = [
          // 중간: 지금 섹션이 아닌 첫 섹션(지금이 첫 섹션이면 두 번째)으로 간다.
          { name: '페이지 중간', ratio: 0.5, pick: (activeIndex: number) => (activeIndex === 0 ? 1 : 0) },
          // 맨 아래: 지금은 마지막 섹션이다. 마지막 바로 앞 섹션으로 간다.
          { name: '페이지 맨 아래', ratio: 1, pick: () => last - 1 },
        ]

        for (const position of positions) {
          await test.step(`${position.name}에서 이동`, async () => {
            await scrollToRatio(page, position.ratio)

            let activeIndex = -1
            if (position.ratio === 1) {
              await expect(scope.locator('a[aria-current]')).toHaveAttribute('href', `#${lesson.sections[last].id}`)
              activeIndex = last
            } else {
              let lastHref: string | null = null
              await expect.poll(async () => {
                const currentLinks = scope.locator('a[aria-current]')
                const count = await currentLinks.count()
                if (count !== 1) {
                  lastHref = null
                  return null
                }
                const href = await currentLinks.getAttribute('href')
                if (href && href === lastHref) {
                  activeIndex = lesson.sections.findIndex(section => `#${section.id}` === href)
                  return href
                }
                lastHref = href
                return null
              }).not.toBeNull()
              expect(activeIndex, '스크롤 뒤 현재 섹션이 하나 표시돼야 함').toBeGreaterThanOrEqual(0)
            }

            const target = lesson.sections[position.pick(activeIndex)]
            expect(target.id).not.toBe(lesson.sections[activeIndex].id)

            if (viewport.narrow) {
              // 조작 2번: 열기 + 항목 선택
              await clickAtCenter(page, summary)
              await expect(details).toHaveJSProperty('open', true)
              const mobileNav = page.getByRole('navigation', { name: '이 레슨의 내용' })
              await expect(mobileNav).toHaveCount(1)
              await expect(mobileNav).toBeVisible()
              await clickAtCenter(page, mobileNav.getByRole('link', { name: target.title, exact: true }))
              await expect(details).toHaveJSProperty('open', false)
            } else {
              // 조작 1번: 옆 목차 항목 선택
              await clickAtCenter(page, scope.getByRole('link', { name: target.title, exact: true }))
            }

            await expect(page).toHaveURL(new RegExp(`#${target.id}$`))
            const heading = page.locator(`h2#${target.id}`)
            await expect(heading).toBeInViewport()
            const { top, stickyBottom } = await coveringStickyBottom(heading)
            expect(top, `${target.title} 제목이 붙어 있는 요소에 가려짐`).toBeGreaterThanOrEqual(stickyBottom - 0.5)
            await expectCurrentSection(page, viewport.narrow, target)
          })
        }
      })

      test(`스크롤 위치에 따라 현재 섹션 표시(위→아래, 아래→위): ${lesson.title} ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(lesson.path)
        await waitForEnhancedToc(page)
        const order = lesson.sections.map((_, index) => index)
        const passes = [
          { name: '위에서 아래로', indices: order },
          { name: '아래에서 위로', indices: [...order].reverse() },
        ]

        for (const pass of passes) {
          await test.step(pass.name, async () => {
            for (const index of pass.indices) {
              const section = lesson.sections[index]
              await test.step(section.title, async () => {
                // 제목을 기준선(120px)보다 조금 위인 100px에 둔다.
                const clamped = await page.evaluate(id => {
                  const heading = document.getElementById(id)!
                  const wanted = Math.max(0, heading.getBoundingClientRect().top + window.scrollY - 100)
                  window.scrollTo(0, wanted)
                  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
                  return atBottom && Math.abs(window.scrollY - wanted) > 1
                }, section.id)
                await settle(page)
                // 문서 끝 때문에 제목을 기준선까지 올릴 수 없으면 규칙상 마지막 섹션이 현재 섹션이다.
                const expected = clamped ? lesson.sections[lesson.sections.length - 1] : section
                if (clamped) {
                  test.info().annotations.push({ type: 'clamped', description: `${lesson.path} ${viewport.name} ${section.id}: 문서 끝이라 마지막 섹션 기대` })
                }
                await expectCurrentSection(page, viewport.narrow, expected)
              })
            }
          })
        }
      })
    }
  }

  for (const viewport of VIEWPORTS) {
    test(`해시가 붙은 주소로 들어오면 그 섹션이 현재 섹션: ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/learn/practice#metronome')
      await waitForEnhancedToc(page)
      await expect(page.locator('h2#metronome')).toBeInViewport()
      await expectCurrentSection(page, viewport.narrow, { id: 'metronome', title: '메트로놈' })
    })

    test(`문서 끝에서 고른 섹션이 위로 스크롤 후 다시 문서 끝에 오면 마지막 섹션으로 복귀: ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/learn/practice')
      await waitForEnhancedToc(page)

      // 1. 문서 맨 아래로 스크롤
      await scrollToRatio(page, 1)

      // 2. 문서 끝에서도 보이는 마지막이 아닌 섹션('메트로놈')을 목차로 고름
      const scope = tocScope(page, viewport.narrow)
      if (viewport.narrow) {
        const summary = page.locator('details summary')
        await clickAtCenter(page, summary)
        await clickAtCenter(page, scope.getByRole('link', { name: '메트로놈', exact: true }))
      } else {
        await clickAtCenter(page, scope.getByRole('link', { name: '메트로놈', exact: true }))
      }

      // 3. 고른 항목이 aria-current
      await expectCurrentSection(page, viewport.narrow, { id: 'metronome', title: '메트로놈' })

      // 4. 위로 충분히 스크롤 -> 다른 섹션이 aria-current
      await scrollToRatio(page, 0.3)
      await expect.poll(async () => {
        const href = await scope.locator('a[aria-current]').getAttribute('href')
        return href && href !== '#metronome' && href !== '#keyboard-shortcuts'
      }).toBe(true)

      // 5. 다시 맨 아래로 스크롤 -> 고른 섹션이 되살아나지 않고 마지막 섹션('키보드 단축키')이 aria-current
      await scrollToRatio(page, 1)
      await expectCurrentSection(page, viewport.narrow, { id: 'keyboard-shortcuts', title: '키보드 단축키' })
    })
  }

  test('잘못된 해시(#%)로 들어와도 레슨이 그려지고 페이지 오류가 없음', async ({ page }) => {
    const pageErrors: Error[] = []
    const consoleErrors: string[] = []
    page.on('pageerror', error => pageErrors.push(error))
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/learn/reading#%')
    await waitForEnhancedToc(page)

    await expect(page.getByRole('heading', { level: 1, name: '악보 읽기 1' })).toBeVisible()

    const scope = tocScope(page, false)
    await expect(scope.locator('a[aria-current]')).toHaveCount(1)
    await expect(scope.locator('a[aria-current]')).toHaveAttribute('href', '#staff-intro')

    expect(pageErrors, `페이지 오류 발생: ${pageErrors.map(e => e.message).join(', ')}`).toEqual([])
    expect(consoleErrors, `콘솔 오류 발생: ${consoleErrors.join(', ')}`).toEqual([])
  })

  test('스크립트 없이 390x844에서 목차를 열고 항목을 누르면 도착한 제목이 목차에 가려지지 않음', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    try {
      await page.goto('/learn/reading')
      const details = page.locator('details')
      // 스크립트가 없으면 sticky 표식이 없고 목차는 문서 흐름 안의 보통 블록이다.
      await expect(details).not.toHaveAttribute('data-enhanced')
      await expect(details).not.toHaveAttribute('open')

      await details.locator('summary').click()
      await expect(details).toHaveAttribute('open', '')

      await page.locator('#mobile-lesson-toc').getByRole('link', { name: '오선과 건반 연결하기', exact: true }).click()
      await expect(page).toHaveURL(/#pitch-explorer$/)
      const heading = page.locator('h2#pitch-explorer')
      await expect(heading).toBeInViewport()

      const headingBox = await heading.boundingBox()
      const detailsBox = await details.boundingBox()
      expect(headingBox).toBeTruthy()
      expect(detailsBox).toBeTruthy()
      if (headingBox && detailsBox) {
        const overlapX = Math.min(headingBox.x + headingBox.width, detailsBox.x + detailsBox.width) - Math.max(headingBox.x, detailsBox.x)
        const overlapY = Math.min(headingBox.y + headingBox.height, detailsBox.y + detailsBox.height) - Math.max(headingBox.y, detailsBox.y)
        expect(overlapX > 0.5 && overlapY > 0.5, `제목 ${JSON.stringify(headingBox)}과 목차 ${JSON.stringify(detailsBox)}가 겹침`).toBe(false)
      }
    } finally {
      await context.close()
    }
  })

  test('320x568에서 목차를 열면 마지막 항목까지 스크롤해 누를 수 있고 가로 넘침이 없음', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/learn/practice')
    await waitForEnhancedToc(page)
    await scrollToRatio(page, 0.5)

    const details = page.locator('details')
    await clickAtCenter(page, details.locator('summary'))
    await expect(details).toHaveJSProperty('open', true)

    const list = page.locator('#mobile-lesson-toc')
    const listBox = await list.boundingBox()
    expect(listBox).toBeTruthy()
    if (listBox) expect(listBox.y + listBox.height, '열린 목록이 화면 아래로 넘침').toBeLessThanOrEqual(568 + 0.5)

    const lastItem = list.getByRole('link', { name: '키보드 단축키', exact: true })
    await lastItem.scrollIntoViewIfNeeded()
    await expect(lastItem).toBeInViewport()

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(overflow.scrollWidth, `가로 넘침: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.clientWidth + 1)

    await clickAtCenter(page, lastItem)
    await expect(page).toHaveURL(/#keyboard-shortcuts$/)
    await expect(details).toHaveJSProperty('open', false)
    await expect(page.locator('h2#keyboard-shortcuts')).toBeInViewport()
  })

  test('1024x300에서 옆 목차의 마지막 항목까지 스크롤해 누를 수 있음', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 300 })
    await page.goto('/learn/practice')
    await waitForEnhancedToc(page)
    await scrollToRatio(page, 0.5)

    const nav = tocScope(page, false)
    await expect(nav).toBeVisible()

    const navBox = await nav.boundingBox()
    expect(navBox, 'nav의 boundingBox가 있어야 함').toBeTruthy()
    if (navBox) {
      expect(navBox.y + navBox.height, '목차가 화면 아래로 넘치지 않아야 함').toBeLessThanOrEqual(300 + 0.5)
    }

    const heights = await nav.evaluate(el => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }))
    expect(heights.scrollHeight, '안에서 스크롤할 내용이 있어야 함').toBeGreaterThan(heights.clientHeight)

    const lastItem = nav.getByRole('link', { name: '키보드 단축키', exact: true })

    const before = await page.evaluate(() => window.scrollY)
    await nav.evaluate(el => { el.scrollTop = el.scrollHeight })
    await settle(page)
    await expect(lastItem).toBeInViewport()

    const after = await page.evaluate(() => window.scrollY)
    expect(after, '목차 안 스크롤이 페이지를 움직이지 않아야 함').toBe(before)

    await clickAtCenter(page, lastItem)
    await expect(page).toHaveURL(/#keyboard-shortcuts$/)
    await expect(page.locator('h2#keyboard-shortcuts')).toBeInViewport()

    // 회귀 방지: 1280x800에서는 내부 스크롤이 생기지 않음
    await page.setViewportSize({ width: 1280, height: 800 })
    await settle(page)
    const wideHeights = await nav.evaluate(el => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }))
    expect(wideHeights.scrollHeight, '1280x800에서는 내부 스크롤이 생기지 않아야 함').toBeLessThanOrEqual(wideHeights.clientHeight)
  })

  for (const size of [{ width: 1280, height: 800 }, { width: 1024, height: 400 }]) {
    test(`옆 목차 링크의 포커스 윤곽선이 목차 스크롤 영역에 잘리지 않음: ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto('/learn/reading')
      await waitForEnhancedToc(page)

      const nav = tocScope(page, false)
      const targets = [
        { link: nav.locator('a').first(), isFirst: true, isLast: false },
        { link: nav.locator('a').last(), isFirst: false, isLast: true },
      ]

      for (const { link, isFirst, isLast } of targets) {
        await link.focus()
        if (isLast) {
          await settle(page)
        }

        const metrics = await link.evaluate(el => {
          const cs = getComputedStyle(el)
          const reach = parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset)
          const navEl = el.closest('nav')!
          const r = navEl.getBoundingClientRect()
          const left = r.left + navEl.clientLeft
          const top = r.top + navEl.clientTop
          const right = left + navEl.clientWidth
          const bottom = top + navEl.clientHeight
          const b = el.getBoundingClientRect()
          return {
            outlineStyle: cs.outlineStyle,
            reach,
            room: {
              left: b.left - left,
              right: right - b.right,
              top: b.top - top,
              bottom: bottom - b.bottom,
            },
          }
        })

        expect(metrics.outlineStyle, '포커스 윤곽선이 실제로 있어야 함').not.toBe('none')
        expect(metrics.reach, 'reach가 0보다 커야 함').toBeGreaterThan(0)
        expect(metrics.room.left, '왼쪽 윤곽선 공간이 충분해야 함').toBeGreaterThanOrEqual(metrics.reach - 0.5)
        expect(metrics.room.right, '오른쪽 윤곽선 공간이 충분해야 함').toBeGreaterThanOrEqual(metrics.reach - 0.5)
        if (isFirst) {
          expect(metrics.room.top, '첫 링크 위쪽 윤곽선 공간이 충분해야 함').toBeGreaterThanOrEqual(metrics.reach - 0.5)
        }
        if (isLast) {
          expect(metrics.room.bottom, '마지막 링크 아래쪽 윤곽선 공간이 충분해야 함').toBeGreaterThanOrEqual(metrics.reach - 0.5)
        }
      }
    })
  }

  for (const lesson of LESSONS) {
    for (const viewport of VIEWPORTS) {
      test(`main 안 링크·버튼·summary의 터치 영역이 44px 이상: ${lesson.title} ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(lesson.path)

        const { violators } = await page.evaluate(() => {
          // 예외 요소들 명시적 제외:
          // 1. 학습용 피아노 건반(button[data-midi]): 검은 건반 폭(26px)이 44px 미만인 것은 확정 예외라 폭만 뺀다. 높이는 검사한다.
          // 2. 문장 안 링크([data-lesson-prose] p a): 문장 줄 안에 있으므로 높이만 검사한다(폭은 글자 길이를 따른다).
          // 3단계에서 reading의 음 선택 및 들어 보기 버튼이 모두 44px 이상으로 개편되어 예외가 제거됨.
          const elements = Array.from(document.querySelectorAll('main a[href], main button, main summary'))
          const issues: Array<{ tag: string; text: string; height: number; width: number; problem: string }> = []
          const exemptCounts = { pianoKeyWidth: 0, proseLinkWidth: 0 }

          for (const el of elements) {
            const rect = el.getBoundingClientRect()
            // 보이지 않는 요소 스킵
            if (rect.width === 0 && rect.height === 0) continue
            const style = window.getComputedStyle(el)
            if (style.display === 'none' || style.visibility === 'hidden') continue

            const accessibleName = (el.getAttribute('aria-label') || el.textContent || '').trim()

            if (rect.height < 43.5) {
              issues.push({ tag: el.tagName, text: accessibleName.slice(0, 30), height: rect.height, width: rect.width, problem: 'height' })
            }

            if (el.matches('button[data-midi]')) {
              exemptCounts.pianoKeyWidth++
              continue
            }
            if (el.matches('[data-lesson-prose] p a')) {
              exemptCounts.proseLinkWidth++
              continue
            }
            if (rect.width < 43.5) {
              issues.push({ tag: el.tagName, text: accessibleName.slice(0, 30), height: rect.height, width: rect.width, problem: 'width' })
            }
          }
          return { violators: issues, exempt: exemptCounts }
        })

        expect(violators, `${lesson.path} ${viewport.name}에서 높이 또는 폭이 44px 미만인 인터랙티브 요소 발견`).toEqual([])
      })
    }
  }

  test('문장 안 링크가 문단의 줄 높이를 늘리지 않고 높이 44px 이상임', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    for (const path of ['/learn/reading', '/learn/reading/rhythm', '/learn/hands', '/learn/practice']) {
      await test.step(path, async () => {
        await page.goto(path)
        const results = await page.evaluate(() => {
          const inlineLinks = Array.from(document.querySelectorAll('[data-lesson-prose] p a[href]'))
          return inlineLinks.map(link => {
            const p = link.closest('p')!
            const linkStyle = window.getComputedStyle(link)
            const pStyle = window.getComputedStyle(p)
            const linkRect = link.getBoundingClientRect()
            const pRect = p.getBoundingClientRect()
            return {
              linkText: link.textContent,
              display: linkStyle.display,
              linkHeight: linkRect.height,
              pLineHeight: parseFloat(pStyle.lineHeight),
              pFontSize: parseFloat(pStyle.fontSize),
              pHeight: pRect.height,
            }
          })
        })

        expect(results.length).toBeGreaterThan(0)
        for (const res of results) {
          expect(res.display, `인라인 링크 ${res.linkText}는 inline이어야 줄 간격이 유지됨`).toBe('inline')
          expect(res.linkHeight, `인라인 링크 ${res.linkText}의 터치 영역 높이가 44px 이상이어야 함`).toBeGreaterThanOrEqual(43.5)
        }
      })
    }
  })

  for (const path of ['/learn/reading', '/learn/reading/rhythm', '/learn/hands', '/learn/practice']) {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      test(`콘텐츠 영역이 좁은 글꼴에서도 문장 안 링크 높이가 44px 이상임: ${path} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.goto(path)
        await page.addStyleTag({
          content: "[data-lesson-prose] p a { font-family: Arial, 'Liberation Sans', Helvetica, sans-serif !important; }",
        })

        const linkData = await page.evaluate(() => {
          const inlineLinks = Array.from(document.querySelectorAll('[data-lesson-prose] p a[href]'))
          return inlineLinks.map(link => {
            const style = window.getComputedStyle(link)
            const rects = Array.from(link.getClientRects()).map(r => ({
              height: r.height,
              width: r.width,
            }))
            return {
              text: link.textContent ?? '',
              fontSize: style.fontSize,
              rects,
            }
          })
        })

        expect(linkData.length, `${path}에서 문장 안 링크가 1개 이상이어야 함`).toBeGreaterThan(0)
        for (const link of linkData) {
          expect(link.fontSize, `링크 "${link.text}"의 computed font-size가 16px이어야 함`).toBe('16px')
          expect(link.rects.length, `링크 "${link.text}"의 client rects가 1개 이상이어야 함`).toBeGreaterThan(0)
          for (const rect of link.rects) {
            expect(
              rect.height,
              `링크 "${link.text}"의 높이(${rect.height}px)가 44 - 0.01 이상이어야 함`
            ).toBeGreaterThanOrEqual(44 - 0.01)
          }
        }
      })
    }
  }

  test('이전·다음 링크 배치 및 접근 가능한 이름 검증', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/learn/reading')

    const prevLink = page.getByRole('link', { name: '이전 레슨: 건반', exact: true })
    const nextLink = page.getByRole('link', { name: '다음 레슨: 악보 읽기 2', exact: true })

    await expect(prevLink).toBeVisible()
    await expect(nextLink).toBeVisible()

    const prevBox = await prevLink.boundingBox()
    const nextBox = await nextLink.boundingBox()
    expect(prevBox).toBeTruthy()
    expect(nextBox).toBeTruthy()

    if (prevBox && nextBox) {
      expect(prevBox.height).toBeGreaterThanOrEqual(44)
      expect(nextBox.height).toBeGreaterThanOrEqual(44)
      // 이전 링크의 오른쪽 끝(right) <= 다음 링크의 왼쪽 시작(left)
      expect(prevBox.x + prevBox.width).toBeLessThanOrEqual(nextBox.x + 1)
    }
  })

  test('본문 문단 computed font-size가 16px이고 문단 글 폭이 65자 안팎임', async ({ page }) => {
    for (const lesson of LESSONS) {
      await test.step(lesson.path, async () => {
        await page.setViewportSize({ width: 1280, height: 800 })
        await page.goto(lesson.path)

        const { expectedColor, bodyParagraphs, noteParagraphs } = await page.evaluate(() => {
          // --ck-ink 토큰 색상 추출용 probe 요소 생성
          const probe = document.createElement('span')
          probe.style.color = 'var(--ck-ink)'
          document.body.appendChild(probe)
          const expectedColor = window.getComputedStyle(probe).color
          document.body.removeChild(probe)

          // [data-lesson-prose] 안의 본문 문단들 (보조 설명 [data-lesson-note], status 제외)
          const ps = Array.from(document.querySelectorAll('main [data-lesson-prose] p:not([data-lesson-note]):not([role="status"])'))
          const bodyParagraphs = ps.map(p => {
            const style = window.getComputedStyle(p)
            const rect = p.getBoundingClientRect()
            const fontSize = parseFloat(style.fontSize)
            return {
              fontSize,
              color: style.color,
              widthInEm: rect.width / (fontSize || 16),
              text: p.textContent?.slice(0, 30) || '',
            }
          })

          // [data-lesson-prose] [data-lesson-note]인 보조 설명 문단들
          const notePs = Array.from(document.querySelectorAll('main [data-lesson-prose] p[data-lesson-note], main [data-lesson-prose] [data-lesson-note] p'))
          const uniqueNotePs = Array.from(new Set(notePs))
          const noteParagraphs = uniqueNotePs.map(p => {
            const style = window.getComputedStyle(p)
            const fontSize = parseFloat(style.fontSize)
            return {
              fontSize,
              text: p.textContent?.slice(0, 30) || '',
            }
          })

          return { expectedColor, bodyParagraphs, noteParagraphs }
        })

        expect(bodyParagraphs.length, `${lesson.path}에 본문 문단이 존재해야 함`).toBeGreaterThan(0)
        for (const p of bodyParagraphs) {
          expect(p.fontSize, `${lesson.path} 본문 글자 크기는 16px이어야 함: ${p.text}`).toBe(16)
          expect(p.color, `${lesson.path} 본문 글자 색상은 var(--ck-ink)와 같아야 함: ${p.text}`).toBe(expectedColor)
          // 한글 65자 안팎 (1em 기준 최대 약 68em 이하)
          expect(p.widthInEm, `${lesson.path} 본문 문단 너비 초과: ${p.text}`).toBeLessThanOrEqual(68)
        }

        expect(noteParagraphs.length, `${lesson.path}에 보조 문단이 존재해야 함`).toBeGreaterThan(0)
        for (const p of noteParagraphs) {
          expect(p.fontSize, `${lesson.path} 보조 문단 글자 크기는 14px이어야 함: ${p.text}`).toBe(14)
        }
      })
    }
  })

  test('키보드 탐색: 1280x800에서 Tab으로 목차 및 이전 링크 도달 가능', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/learn/practice')

    const tocLink = page.locator('aside').getByRole('link', { name: '메트로놈', exact: true })
    let focusedToc = false
    for (let step = 0; step < 120 && !focusedToc; step += 1) {
      await page.keyboard.press('Tab')
      focusedToc = await tocLink.evaluate(node => node === document.activeElement)
    }

    if (!focusedToc) {
      expect(browserName, 'WebKit 외 브라우저에서는 Tab으로 목차 도달 필수').toBe('webkit')
      await tocLink.focus()
    }

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#metronome$/)
    const metronomeHeading = page.locator('#metronome')
    const headingBox = await metronomeHeading.boundingBox()
    expect(headingBox).toBeTruthy()
    if (headingBox) {
      expect(headingBox.y).toBeGreaterThanOrEqual(0)
      expect(headingBox.y).toBeLessThan(800)
    }

    // 이어서 Tab만으로 이전 레슨: 손에 도달 -> Enter -> /learn/hands
    const prevLink = page.getByRole('link', { name: '이전 레슨: 손', exact: true })
    let focusedPrev = false
    for (let step = 0; step < 120 && !focusedPrev; step += 1) {
      await page.keyboard.press('Tab')
      focusedPrev = await prevLink.evaluate(node => node === document.activeElement)
    }

    if (!focusedPrev) {
      expect(browserName, 'WebKit 외 브라우저에서는 Tab으로 이전 레슨 도달 필수').toBe('webkit')
      await prevLink.focus()
    }

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/learn\/hands$/)
  })

  test('키보드 탐색: 390x844에서 Tab으로 모바일 목차 열기 및 항목 이동 가능', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/learn/practice')

    const summary = page.locator('details summary')
    let focusedSummary = false
    for (let step = 0; step < 120 && !focusedSummary; step += 1) {
      await page.keyboard.press('Tab')
      focusedSummary = await summary.evaluate(node => node === document.activeElement)
    }

    if (!focusedSummary) {
      expect(browserName, 'WebKit 외 브라우저에서는 Tab으로 summary 도달 필수').toBe('webkit')
      await summary.focus()
    }

    // Enter (또는 Space)로 열림
    await page.keyboard.press('Enter')
    const details = page.locator('details')
    await expect(details).toHaveJSProperty('open', true)

    // Tab으로 항목 도달 -> Enter -> 해시 이동, 목록 닫힘
    const mobileLink = page.locator('#mobile-lesson-toc').getByRole('link', { name: '메트로놈', exact: true })
    let focusedItem = false
    for (let step = 0; step < 120 && !focusedItem; step += 1) {
      await page.keyboard.press('Tab')
      focusedItem = await mobileLink.evaluate(node => node === document.activeElement)
    }

    if (!focusedItem) {
      expect(browserName, 'WebKit 외 브라우저에서는 Tab으로 모바일 항목 도달 필수').toBe('webkit')
      await mobileLink.focus()
    }

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#metronome$/)
    await expect(details).toHaveJSProperty('open', false)
    // 닫힌 목록 안 링크가 아니라 도착한 섹션 제목에 포커스가 있다.
    await expect(page.locator('h2#metronome')).toBeFocused()

    // summary를 클릭한 바로 다음 줄에서(대기·단언 없이) Escape를 누르면 목차가 닫히고 포커스가 summary로 돌아온다.
    await clickAtCenter(page, summary)
    await page.keyboard.press('Escape')
    await expect(details).toHaveJSProperty('open', false)
    await expect(summary).toBeFocused()
  })

  test('390x844에서 summary를 누른 직후(대기 없이) Escape를 누르면 목차가 닫히고 포커스가 summary에 유지됨', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/learn/practice')
    await waitForEnhancedToc(page)

    const details = page.locator('details')
    const summary = details.locator('summary')

    await clickAtCenter(page, summary)
    await page.keyboard.press('Escape')
    await expect(details).toHaveJSProperty('open', false)
    await expect(summary).toBeFocused()
  })

  for (const lesson of TOC_LESSONS) {
    test(`390x844 페이지 중간에서 목차를 열고 닫아도 scrollY·문서높이·현재섹션이 유지됨: ${lesson.title}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(lesson.path)
      await waitForEnhancedToc(page)

      await scrollToRatio(page, 0.5)
      const details = page.locator('details')
      const summary = details.locator('summary')
      const currentIndicator = summary.locator('span > span')

      // 간헐적 결함 방지를 위해 같은 테스트 안에서 5번 반복 검증
      for (let iter = 0; iter < 5; iter++) {
        const before = await page.evaluate(() => ({
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
        }))
        const activeTextBefore = await currentIndicator.textContent()

        await clickAtCenter(page, summary)
        await settle(page)
        await expect(details).toHaveJSProperty('open', true)

        const opened = await page.evaluate(() => ({
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
        }))
        expect(opened.scrollY, `${lesson.path} [${iter + 1}/5] 목차를 연 뒤 scrollY가 변함`).toBe(before.scrollY)
        expect(opened.scrollHeight, `${lesson.path} [${iter + 1}/5] 목차를 연 뒤 문서 높이가 변함`).toBe(before.scrollHeight)
        const activeTextOpened = await currentIndicator.textContent()
        expect(activeTextOpened, `${lesson.path} [${iter + 1}/5] 목차를 연 뒤 현재 섹션 표시가 변함`).toBe(activeTextBefore)

        await page.keyboard.press('Escape')
        await settle(page)
        await expect(details).toHaveJSProperty('open', false)

        const closed = await page.evaluate(() => ({
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
        }))
        expect(closed.scrollY, `${lesson.path} [${iter + 1}/5] 목차를 닫은 뒤 scrollY가 변함`).toBe(before.scrollY)
        expect(closed.scrollHeight, `${lesson.path} [${iter + 1}/5] 목차를 닫은 뒤 문서 높이가 변함`).toBe(before.scrollHeight)
        const activeTextClosed = await currentIndicator.textContent()
        expect(activeTextClosed, `${lesson.path} [${iter + 1}/5] 목차를 닫은 뒤 현재 섹션 표시가 변함`).toBe(activeTextBefore)
      }
    })
  }
})
