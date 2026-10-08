import { test, expect } from '@playwright/test'

const LESSONS = [
  { path: '/learn/keyboard', title: '건반', step: '4단계 중 1단계', hasToc: false },
  { path: '/learn/reading', title: '악보 읽기', step: '4단계 중 2단계', hasToc: true },
  { path: '/learn/hands', title: '손', step: '4단계 중 3단계', hasToc: true },
  { path: '/learn/practice', title: '연습 방법', step: '4단계 중 4단계', hasToc: true },
] as const

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

  for (const lesson of LESSONS.filter(l => l.hasToc)) {
    test(`1280x800 데스크톱 목차 스크롤 및 앵커 이동: ${lesson.title}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto(lesson.path)

      // 1280x800에서는 화면 전체에서 '이 레슨의 내용' nav가 정확히 1개만 접근 가능해야 함
      const tocNav = page.getByRole('navigation', { name: '이 레슨의 내용' })
      await expect(tocNav).toHaveCount(1)
      await expect(tocNav).toBeVisible()

      // 스크롤 맨 아래로 이동 후에도 sticky 목차가 뷰포트 안에 남아 있는지 확인
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(300)
      const tocBox = await tocNav.boundingBox()
      expect(tocBox).toBeTruthy()
      if (tocBox) {
        expect(tocBox.y).toBeGreaterThanOrEqual(0)
        expect(tocBox.y).toBeLessThan(800)
      }

      // 목차 항목 클릭 시 해당 섹션 제목으로 이동하고 붙어 있는 요소에 가려지지 않음
      const firstSectionLink = tocNav.getByRole('link').first()
      const targetHref = await firstSectionLink.getAttribute('href')
      expect(targetHref).toBeTruthy()
      const targetId = targetHref!.replace('#', '')
      const heading = page.locator(`#${targetId}`)

      await firstSectionLink.click()
      await page.waitForTimeout(300)
      const headingBox = await heading.boundingBox()
      expect(headingBox).toBeTruthy()
      if (headingBox) {
        expect(headingBox.y).toBeGreaterThanOrEqual(0)
      }
    })

    test(`390x844 모바일에서 두 번 이하 조작으로 다른 섹션 이동: ${lesson.title}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(lesson.path)

      // 페이지 중간으로 스크롤한 뒤 열기 버튼 확인
      await page.evaluate(() => window.scrollTo(0, 500))
      await page.waitForTimeout(200)

      const details = page.locator('details')
      const summary = details.locator('summary')
      await expect(summary).toBeVisible()

      // 조작 1: summary 클릭하여 details 열기
      await summary.click()
      await expect(details).toHaveJSProperty('open', true)

      // 목차를 연 상태로 getByRole('navigation', { name: '이 레슨의 내용' })이 정확히 1개 보임
      const mobileNav = page.getByRole('navigation', { name: '이 레슨의 내용' })
      await expect(mobileNav).toHaveCount(1)
      await expect(mobileNav).toBeVisible()

      // practice 레슨인 경우 메트로놈 링크가 접근성 트리에서 찾아짐
      if (lesson.path === '/learn/practice') {
        await expect(mobileNav.getByRole('link', { name: '메트로놈' })).toBeVisible()
      }

      // 조작 2: 목록 항목 선택하여 다른 섹션으로 이동
      const lastLink = mobileNav.getByRole('link').last()
      await lastLink.click()

      // 고른 뒤 목록이 자동으로 닫힘
      await expect(details).toHaveJSProperty('open', false)
    })
  }

  test('네 레슨의 main 안 모든 링크와 버튼의 높이가 44px 이상임', async ({ page }) => {
    for (const lesson of LESSONS) {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto(lesson.path)

      const { violators, exempt } = await page.evaluate(() => {
        // 예외 요소들 명시적 제외:
        // 1. 학습용 피아노 건반: 검은 건반은 폭만 예외(26px)이고 높이는 44px 이상이어야 함.
        // 2. reading 페이지의 들어 보기 및 음 선택 버튼 (3단계 전환형 패널 개편 대상, 총 35개):
        //    - noteSelect (15개): ReadingExplorer C3~C5 흰 건반(48~72) 음 선택 버튼 ([role="group"][aria-label="음 선택"] 내부)
        //    - listen (20개): 이름이 '들어 보기'로 끝나는 버튼
        //        * reading.ts 악보 예시 6개 (높은음자리표 줄/칸 2개, 낮은음자리표 줄/칸 2개, 가운데 도 2개)
        //        * ReadingExplorer 선택한 음 들어 보기 1개
        //        * rhythm.ts 리듬 예시 13개 (음표 4개, 쉼표 4개, 점음표 2개, 박자표 3개)
        const elements = Array.from(document.querySelectorAll('main a[href], main button, main summary'))
        const issues: Array<{ tag: string; text: string; height: number; width: number; selector: string }> = []
        const exemptCounts = { noteSelect: 0, listen: 0 }

        for (const el of elements) {
          const rect = el.getBoundingClientRect()
          // 보이지 않는 요소 스킵
          if (rect.width === 0 && rect.height === 0) continue
          const style = window.getComputedStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden') continue

          const accessibleName = (el.getAttribute('aria-label') || el.textContent || '').trim()

          // 3단계 대상 reading 음 선택 및 들어 보기 버튼 예외 처리
          const isNoteSelect = !!el.closest('[role="group"][aria-label="음 선택"]')
          const isAudioPreview = el.tagName === 'BUTTON' && accessibleName.endsWith('들어 보기')

          if (isNoteSelect) {
            exemptCounts.noteSelect++
            continue
          }
          if (isAudioPreview) {
            exemptCounts.listen++
            continue
          }

          if (rect.height < 43.5) {
            issues.push({
              tag: el.tagName,
              text: accessibleName.slice(0, 30),
              height: rect.height,
              width: rect.width,
              selector: el.className,
            })
          }
        }
        return { violators: issues, exempt: exemptCounts }
      })

      if (lesson.path === '/learn/reading') {
        expect(exempt.noteSelect).toBe(15)
        expect(exempt.listen).toBe(20)
      } else {
        expect(exempt.noteSelect).toBe(0)
        expect(exempt.listen).toBe(0)
      }

      expect(violators, `${lesson.path}에서 높이 44px 미만인 인터랙티브 요소 발견`).toEqual([])
    }
  })

  test('문장 안 링크가 문단의 줄 높이를 늘리지 않고 높이 44px 이상임', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    for (const path of ['/learn/reading', '/learn/hands', '/learn/practice']) {
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
    }
  })

  test('이전·다음 링크 배치 및 접근 가능한 이름 검증', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/learn/reading')

    const prevLink = page.getByRole('link', { name: '이전 레슨: 건반', exact: true })
    const nextLink = page.getByRole('link', { name: '다음 레슨: 손', exact: true })

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
    expect(page.url()).toContain('#metronome')
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
    expect(page.url()).toContain('#metronome')
    await expect(details).toHaveJSProperty('open', false)
  })
})
