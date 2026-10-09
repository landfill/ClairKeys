import { expect, test, type Page } from '@playwright/test'

async function prepare(page: Page) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => { throw new Error('isolated reading-rhythm fixture') }
    }
  })
}

test('opens the rhythm lesson without hydration or console errors and renders actual OSMD rhythm notes', async ({ page }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await prepare(page)
  const response = await page.goto('/learn/reading/rhythm')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/learn\/reading\/rhythm$/)
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(main.getByRole('heading', { level: 1, name: '악보 읽기 2', exact: true })).toBeVisible()
  await expect(main.getByRole('heading', { level: 2 })).toHaveText(['음표의 길이', '쉼표', '점음표', '박자표'])
  const navigation = main.getByRole('navigation', { name: '레슨 이동', exact: true })
  await expect(navigation.getByRole('link', { name: '이전 레슨: 악보 읽기 1', exact: true })).toHaveAttribute('href', '/learn/reading')
  await expect(navigation.getByRole('link', { name: '다음 레슨: 손', exact: true })).toHaveAttribute('href', '/learn/hands')
  await expect(main.getByRole('link', { name: '손 레슨', exact: true })).toHaveAttribute('href', '/learn/hands')
  await expect(main.getByRole('link', { name: '연습 방법 레슨', exact: true })).toHaveAttribute('href', '/learn/practice')

  // Table should be gone
  await expect(page.getByRole('table')).toHaveCount(0)

  // 4 panels rendered with initial OSMD SVGs
  const figures = page.locator('main figure[data-example]')
  await expect(figures).toHaveCount(4)
  for (let i = 0; i < 4; i++) {
    await expect(figures.nth(i).locator('svg')).toHaveCount(1)
  }

  await page.waitForLoadState('networkidle')
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('verifies each of the four rhythm panels switches aria-pressed, drawing and listen button', async ({ page }) => {
  await prepare(page)
  await page.goto('/learn/reading/rhythm')

  const panelConfigs = [
    {
      label: '음표 길이 비교',
      buttons: ['온음표', '2분음표', '4분음표', '8분음표'],
      ids: ['note-whole', 'note-half', 'note-quarter', 'note-eighth'],
    },
    {
      label: '쉼표 예시',
      buttons: ['온쉼표', '2분쉼표', '4분쉼표', '8분쉼표'],
      ids: ['rest-whole', 'rest-half', 'rest-quarter', 'rest-eighth'],
    },
    {
      label: '점음표 예시',
      buttons: ['점2분음표', '점4분음표'],
      ids: ['note-dotted-half', 'note-dotted-quarter'],
    },
    {
      label: '박자표 예시',
      buttons: ['4분의 4박자', '4분의 3박자', '8분의 6박자'],
      ids: ['meter-four', 'meter-three', 'meter-six'],
    },
  ]

  for (const config of panelConfigs) {
    const group = page.getByRole('group', { name: config.label, exact: true })
    const panelContainer = group.locator('..')
    const figure = panelContainer.locator('figure')

    for (let i = 0; i < config.buttons.length; i++) {
      const buttonName = config.buttons[i]
      const expectedId = config.ids[i]
      const btn = group.getByRole('button', { name: new RegExp(`^${buttonName}`) })

      await btn.click()

      // Exactly one button has aria-pressed="true"
      await expect(btn).toHaveAttribute('aria-pressed', 'true')
      const pressedCount = await group.locator('button[aria-pressed="true"]').count()
      expect(pressedCount).toBe(1)

      // Score drawing updates to selected example
      await expect(figure).toHaveAttribute('data-example', expectedId)
      await expect(figure).toHaveAttribute('aria-label', `${buttonName} 예시`)
      await expect(figure.locator('svg')).toHaveCount(1)

      // Time signature assertions from old spec
      const time = figure.locator('svg g.vf-timesignature')
      await expect(time).toHaveCount(1)
      await expect(time.locator('path')).toHaveCount(2)
      const digits = await time.locator('path').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      }))
      expect(digits.every(digit => digit.width > 0 && digit.height > 0)).toBe(true)

      // Listen button updates
      const listenBtn = panelContainer.getByRole('button', { name: `${buttonName} 들어 보기`, exact: true })
      await expect(listenBtn).toBeVisible()
    }
  }
})

for (const width of [1280, 390, 320]) {
  test(`keeps panel height and document height stable across example switches at ${width}px`, async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
    await page.goto('/learn/reading/rhythm')
    await page.evaluate(() => document.fonts.ready)

    const panels = [
      { label: '음표 길이 비교', count: 4 },
      { label: '쉼표 예시', count: 4 },
      { label: '점음표 예시', count: 2 },
      { label: '박자표 예시', count: 3 },
    ]

    for (const panel of panels) {
      const group = page.getByRole('group', { name: panel.label, exact: true })
      const panelWrapper = group.locator('..')
      const buttons = group.getByRole('button')

      // Measure height for each selection
      let initialPanelHeight: number | null = null
      let initialDocHeight: number | null = null

      for (let i = 0; i < panel.count; i++) {
        await buttons.nth(i).click()
        // Wait for image ready
        await expect(panelWrapper.locator('figure [role="img"][aria-busy="true"]')).toHaveCount(0)

        const panelBox = await panelWrapper.boundingBox()
        expect(panelBox).toBeTruthy()
        const docHeight = await page.evaluate(() => document.documentElement.scrollHeight)

        if (initialPanelHeight === null) {
          initialPanelHeight = panelBox!.height
          initialDocHeight = docHeight
        } else {
          expect(
            Math.abs(panelBox!.height - initialPanelHeight),
            `${panel.label} 버튼 ${i} 선택 시 패널 높이 변화 (${panelBox!.height} vs ${initialPanelHeight})`
          ).toBeLessThanOrEqual(1.0)
          expect(
            Math.abs(docHeight - initialDocHeight!),
            `${panel.label} 버튼 ${i} 선택 시 문서 높이 변화 (${docHeight} vs ${initialDocHeight})`
          ).toBeLessThanOrEqual(1.0)
        }
      }
    }

    // 들어 보기를 눌러 리듬 재생 차례가 보이는 동안 패널 높이 = 누르기 전 높이(±1px)
    const rhythmGroup = page.getByRole('group', { name: '박자표 예시', exact: true })
    const rhythmPanel = rhythmGroup.locator('..')

    // 직전 루프에서 마지막 예시(8분의 6박자)가 선택된 채 끝났으므로 첫 예시(4분의 4박자)를 다시 선택한다
    const meterFourBtn = rhythmGroup.getByRole('button', { name: /4분의 4박자/ })
    await meterFourBtn.click()
    await expect(meterFourBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(rhythmPanel.locator('figure [role="img"][aria-busy="true"]')).toHaveCount(0)

    const beforePlayBox = await rhythmPanel.boundingBox()
    expect(beforePlayBox).toBeTruthy()
    const beforePlayDocHeight = await page.evaluate(() => document.documentElement.scrollHeight)

    const listenBtn = rhythmPanel.getByRole('button', { name: '4분의 4박자 들어 보기', exact: true })
    await listenBtn.click()
    const progress = rhythmPanel.getByRole('status', { name: '리듬 재생 차례', exact: true })
    await expect(progress).toBeVisible({ timeout: 12000 })

    const playingBox = await rhythmPanel.boundingBox()
    expect(playingBox).toBeTruthy()
    expect(Math.abs(playingBox!.height - beforePlayBox!.height)).toBeLessThanOrEqual(1.0)

    // 그 상태에서 다른 예시로 바꾼 뒤의 패널 높이 = 같은 값(±1px), 문서 높이도 같다
    const switchBtn = rhythmGroup.getByRole('button', { name: /4분의 3박자/ })
    await switchBtn.click()
    await expect(switchBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(rhythmPanel.locator('figure [role="img"][aria-busy="true"]')).toHaveCount(0)

    const switchedBox = await rhythmPanel.boundingBox()
    expect(switchedBox).toBeTruthy()
    expect(Math.abs(switchedBox!.height - beforePlayBox!.height)).toBeLessThanOrEqual(1.0)
    const switchedDocHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    expect(Math.abs(switchedDocHeight - beforePlayDocHeight)).toBeLessThanOrEqual(1.0)
  })
}

for (const width of [1280, 390, 320]) {
  test(`keeps panel height stable when audio initialization fails at ${width}px`, async ({ page }) => {
    await prepare(page)
    await page.addInitScript(() => {
      const unavailable = class { constructor() { throw new Error('isolated audio failure') } }
      Object.defineProperty(window, 'AudioContext', { configurable: true, value: unavailable })
      Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: unavailable })
    })
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
    await page.goto('/learn/reading/rhythm')
    await page.evaluate(() => document.fonts.ready)

    const group = page.getByRole('group', { name: '음표 길이 비교', exact: true })
    const panel = group.locator('..')
    await expect(panel.locator('figure [role="img"][aria-busy="true"]')).toHaveCount(0)
    const beforeBox = await panel.boundingBox()
    expect(beforeBox).toBeTruthy()

    const button = panel.getByRole('button', { name: '온음표 들어 보기', exact: true })
    await button.click()
    const notice = panel.getByRole('status').filter({ hasText: '소리를 재생하지 못했어요' })
    await expect(notice).toBeVisible()

    const afterBox = await panel.boundingBox()
    expect(afterBox).toBeTruthy()
    expect(Math.abs(afterBox!.height - beforeBox!.height)).toBeLessThanOrEqual(1.0)
  })
}

test('does not leave previous example rhythm turn progress under new button when switching during playback', async ({ page }) => {
  await prepare(page)
  await page.goto('/learn/reading/rhythm')

  const group = page.getByRole('group', { name: '박자표 예시', exact: true })
  const panel = group.locator('..')

  // Click 8분의 6박자 and play
  const meterSixBtn = group.getByRole('button', { name: /8분의 6박자/ })
  await meterSixBtn.click()
  const listenMeterSix = panel.getByRole('button', { name: '8분의 6박자 들어 보기', exact: true })
  await listenMeterSix.click()

  // Progress appears
  const progress = panel.getByRole('status', { name: '리듬 재생 차례', exact: true })
  await expect(progress).toContainText('8분음표', { timeout: 12000 })

  // Switch to 4분의 4박자 during playback
  const meterFourBtn = group.getByRole('button', { name: /4분의 4박자/ })
  await meterFourBtn.click()

  // The new button area must NOT show the previous progress
  await expect(panel.getByRole('status', { name: '리듬 재생 차례', exact: true })).toHaveCount(0)

  // Verify that playback schedule was cancelled and progress does not reappear
  await page.waitForTimeout(1500)
  await expect(panel.getByRole('status', { name: '리듬 재생 차례', exact: true })).toHaveCount(0)
})

test('operates panel selection and audio button using keyboard alone', async ({ page, browserName }) => {
  await prepare(page)
  await page.goto('/learn/reading/rhythm')

  const group = page.getByRole('group', { name: '점음표 예시', exact: true })
  const firstBtn = group.getByRole('button', { name: /점2분음표/ })
  const secondBtn = group.getByRole('button', { name: /점4분음표/ })

  let focused = false
  for (let step = 0; step < 80 && !focused; step++) {
    await page.keyboard.press('Tab')
    focused = await firstBtn.evaluate(node => node === document.activeElement)
  }

  if (!focused) {
    expect(browserName).toBe('webkit')
    await firstBtn.focus()
  }

  await expect(firstBtn).toBeFocused()
  await expect(firstBtn).toHaveAttribute('aria-pressed', 'true')

  // Move to second button with Tab and press with Space/Enter
  await page.keyboard.press('Tab')
  await expect(secondBtn).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(secondBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(firstBtn).toHaveAttribute('aria-pressed', 'false')

  // Tab to listen button
  const listenBtn = group.locator('..').getByRole('button', { name: '점4분음표 들어 보기', exact: true })
  await page.keyboard.press('Tab')
  await expect(listenBtn).toBeFocused()
})

test('fits 320 CSS pixels without horizontal overflow', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/learn/reading/rhythm')

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(overflow.viewport + 1)
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport + 1)
})

for (const width of [1280, 320, 390]) {
  test(`fits and centres every score drawing without a load-time layout shift at ${width}px`, async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width, height: 844 })
    let release = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    let held = 0
    await page.route('**/_next/static/chunks/**', async route => {
      const response = await route.fetch()
      const body = await response.text()
      if (body.includes('OpenSheetMusicDisplay') && body.includes('EngravingRules')) {
        held++
        await gate
      }
      await route.fulfill({ response })
    })
    try {
      await page.goto('/learn/reading/rhythm', { waitUntil: 'domcontentloaded' })
      await expect.poll(() => held).toBeGreaterThan(0)
      await page.evaluate(() => document.fonts.ready)
      const figures = page.locator('main figure[data-example]')
      await expect(figures).toHaveCount(4)
      const frames = figures.getByRole('img')
      const placeholders = await frames.evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect()
        return { top: rect.top, width: rect.width, height: rect.height }
      }))
      release()
      await expect(figures.locator('svg')).toHaveCount(4)
      await expect(figures.locator('[role="img"][aria-busy="true"]')).toHaveCount(0)
      const geometry = await figures.evaluateAll(nodes => nodes.map(node => {
        const box = node.querySelector('[role="img"]')!.getBoundingClientRect()
        const svg = node.querySelector('svg')!
        const rect = svg.getBoundingClientRect()
        const music = [...svg.querySelectorAll('g.staffline')].map(group => group.getBoundingClientRect())
        return {
          frame: { top: box.top, width: box.width, height: box.height },
          inside: rect.left >= box.left && rect.right <= box.right && rect.top >= box.top && rect.bottom <= box.bottom,
          heightRatio: rect.height / box.height,
          horizontalBalance: Math.abs((rect.left - box.left) - (box.right - rect.right)),
          verticalBalance: Math.abs((rect.top - box.top) - (box.bottom - rect.bottom)),
          musicInset: music.length ? Math.min(...music.flatMap(bounds => [bounds.left - rect.left, rect.right - bounds.right, bounds.top - rect.top, rect.bottom - bounds.bottom])) : 0,
          musicFitsSvg: music.length > 0 && music.every(bounds => bounds.left >= rect.left - 1 && bounds.right <= rect.right + 1 && bounds.top >= rect.top - 1 && bounds.bottom <= rect.bottom + 1),
        }
      }))
      geometry.forEach((item, index) => {
        expect(item.frame).toEqual(placeholders[index])
        expect(item.inside).toBe(true)
        expect(item.heightRatio).toBeGreaterThanOrEqual(width === 1280 ? 0.75 : 0.4)
        expect(item.horizontalBalance).toBeLessThanOrEqual(2)
        expect(item.verticalBalance).toBeLessThanOrEqual(2)
        expect(item.musicFitsSvg).toBe(true)
        expect(item.musicInset).toBeGreaterThanOrEqual(2)
      })

      const remainingExamples = [
        { panelLabel: '음표 길이 비교', panelIndex: 0, buttonName: '2분음표', expectedId: 'note-half' },
        { panelLabel: '음표 길이 비교', panelIndex: 0, buttonName: '4분음표', expectedId: 'note-quarter' },
        { panelLabel: '음표 길이 비교', panelIndex: 0, buttonName: '8분음표', expectedId: 'note-eighth' },
        { panelLabel: '쉼표 예시', panelIndex: 1, buttonName: '2분쉼표', expectedId: 'rest-half' },
        { panelLabel: '쉼표 예시', panelIndex: 1, buttonName: '4분쉼표', expectedId: 'rest-quarter' },
        { panelLabel: '쉼표 예시', panelIndex: 1, buttonName: '8분쉼표', expectedId: 'rest-eighth' },
        { panelLabel: '점음표 예시', panelIndex: 2, buttonName: '점4분음표', expectedId: 'note-dotted-quarter' },
        { panelLabel: '박자표 예시', panelIndex: 3, buttonName: '4분의 3박자', expectedId: 'meter-three' },
        { panelLabel: '박자표 예시', panelIndex: 3, buttonName: '8분의 6박자', expectedId: 'meter-six' },
      ]

      for (const item of remainingExamples) {
        const group = page.getByRole('group', { name: item.panelLabel, exact: true })
        const panelContainer = group.locator('..')
        const btn = group.getByRole('button', { name: new RegExp(`^${item.buttonName}`) })

        const frameBefore = await panelContainer.locator('figure [role="img"]').evaluate(node => {
          const rect = node.getBoundingClientRect()
          return { top: rect.top + window.scrollY, width: rect.width, height: rect.height }
        })

        await btn.click()

        const fig = panelContainer.locator(`figure[data-example="${item.expectedId}"]`)
        await expect(fig.locator('svg')).toHaveCount(1)
        await expect(fig.locator('[role="img"][aria-busy="true"]')).toHaveCount(0)

        const geom = await fig.evaluate(node => {
          const box = node.querySelector('[role="img"]')!.getBoundingClientRect()
          const svg = node.querySelector('svg')!
          const rect = svg.getBoundingClientRect()
          const music = [...svg.querySelectorAll('g.staffline')].map(g => g.getBoundingClientRect())
          return {
            frame: { top: box.top + window.scrollY, width: box.width, height: box.height },
            inside: rect.left >= box.left && rect.right <= box.right && rect.top >= box.top && rect.bottom <= box.bottom,
            heightRatio: rect.height / box.height,
            horizontalBalance: Math.abs((rect.left - box.left) - (box.right - rect.right)),
            verticalBalance: Math.abs((rect.top - box.top) - (box.bottom - rect.bottom)),
            musicInset: music.length ? Math.min(...music.flatMap(b => [b.left - rect.left, rect.right - b.right, b.top - rect.top, rect.bottom - b.bottom])) : 0,
            musicFitsSvg: music.length > 0 && music.every(b => b.left >= rect.left - 1 && b.right <= rect.right + 1 && b.top >= rect.top - 1 && b.bottom <= rect.bottom + 1),
          }
        })

        expect(Math.abs(geom.frame.top - frameBefore.top)).toBeLessThanOrEqual(1.0)
        expect(Math.abs(geom.frame.width - frameBefore.width)).toBeLessThanOrEqual(1.0)
        expect(Math.abs(geom.frame.height - frameBefore.height)).toBeLessThanOrEqual(1.0)

        expect(geom.inside).toBe(true)
        expect(geom.heightRatio).toBeGreaterThanOrEqual(width === 1280 ? 0.75 : 0.4)
        expect(geom.horizontalBalance).toBeLessThanOrEqual(2)
        expect(geom.verticalBalance).toBeLessThanOrEqual(2)
        expect(geom.musicFitsSvg).toBe(true)
        expect(geom.musicInset).toBeGreaterThanOrEqual(2)
      }
    } finally { release(); await page.unrouteAll({ behavior: 'ignoreErrors' }) }
  })
}

test('continues rhythm text when AudioContext resume never settles', async ({ page }) => {
  await prepare(page)
  await page.addInitScript(() => {
    const contexts = window as typeof window & { webkitAudioContext?: typeof AudioContext }
    for (const Context of [contexts.AudioContext, contexts.webkitAudioContext]) {
      if (!Context) continue
      Object.defineProperty(Context.prototype, 'state', { configurable: true, get: () => 'suspended' })
      Context.prototype.resume = () => new Promise<void>(() => {})
    }
  })
  await page.goto('/learn/reading/rhythm')
  // Select meter-six first
  const group = page.getByRole('group', { name: '박자표 예시', exact: true })
  await group.getByRole('button', { name: /8분의 6박자/ }).click()
  const button = group.locator('..').getByRole('button', { name: '8분의 6박자 들어 보기', exact: true })
  await button.click()
  const area = button.locator('..')
  await expect(area.getByRole('status', { name: '소리 준비 상태' })).toBeVisible()
  const notice = area.getByRole('status').filter({ hasText: '소리를 재생하지 못했어요' })
  await expect(notice).toBeVisible({ timeout: 12000 })
  await expect(notice).toBeInViewport({ ratio: 0.95 })
  await expect(area.getByRole('status', { name: '소리 준비 상태' })).toHaveCount(0)
  const progress = area.getByRole('status', { name: '리듬 재생 차례' })
  await expect(progress).toBeVisible()
  const readTurn = () => progress.evaluateAll(nodes => Number(nodes[0]?.textContent?.match(/(\d+)\/6/)?.[1] ?? 0))
  const firstTurn = await readTurn()
  expect(firstTurn).toBeGreaterThan(0)
  await expect.poll(readTurn, { intervals: [50, 100], timeout: 12000 }).toBeGreaterThan(firstTurn)
  await expect(progress).toHaveCount(0, { timeout: 12000 })
})

test('navigates to moved anchors directly in /learn/reading/rhythm and verifies absence in /learn/reading', async ({ page }) => {
  await prepare(page)
  const anchors = ['note-lengths', 'rest-lengths', 'dotted-lengths', 'meters']

  // /learn/reading에는 이 네 id의 요소가 0개
  await page.goto('/learn/reading')
  for (const id of anchors) {
    await expect(page.locator(`#${id}`)).toHaveCount(0)
  }

  // /learn/reading/rhythm#<id> 각각으로 들어가면 h2#<id>가 뷰포트 안
  for (const id of anchors) {
    await page.goto(`/learn/reading/rhythm#${id}`)
    const heading = page.locator(`h2#${id}`)
    await expect(heading).toBeInViewport({ ratio: 0.5 })
  }
})

test('shows audio initialization failure directly below 점4분음표 들어 보기 in the viewport', async ({ page }) => {
  await prepare(page)
  await page.addInitScript(() => {
    const unavailable = class { constructor() { throw new Error('isolated audio initialization failure') } }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: unavailable })
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: unavailable })
  })
  await page.goto('/learn/reading/rhythm')
  const panel = page.getByRole('group', { name: '점음표 예시', exact: true })
  await panel.getByRole('button', { name: '점4분음표, 1박 반', exact: true }).click()
  const button = page.getByRole('button', { name: '점4분음표 들어 보기', exact: true })
  await button.scrollIntoViewIfNeeded()
  await button.evaluate(element => {
    const rect = element.getBoundingClientRect()
    window.scrollBy({ top: rect.bottom - window.innerHeight, behavior: 'instant' })
  })
  await expect(button).toBeInViewport({ ratio: 0.9 })
  await button.click()
  const notice = button.locator('..').getByRole('status').filter({ hasText: '소리를 재생하지 못했어요' })
  await expect(notice).toContainText('소리를 재생하지 못했어요')
  await expect(notice).toBeInViewport({ ratio: 0.95 })
  await expect(page.getByRole('status').filter({ hasText: '소리를 재생하지 못했어요' })).toHaveCount(1)
  const hiddenTemplates = page.locator('[aria-hidden="true"]', { hasText: '소리를 재생하지 못했어요' })
  await expect(hiddenTemplates).toHaveCount(4)
  const roles = await hiddenTemplates.evaluateAll(nodes => nodes.map(node => node.getAttribute('role')))
  expect(roles.every(role => role === null)).toBe(true)
  const buttonBox = await button.boundingBox()
  const noticeBox = await notice.boundingBox()
  expect(buttonBox).not.toBeNull()
  expect(noticeBox).not.toBeNull()
  expect(noticeBox!.y - (buttonBox!.y + buttonBox!.height)).toBeGreaterThanOrEqual(0)
  expect(noticeBox!.y - (buttonBox!.y + buttonBox!.height)).toBeLessThanOrEqual(12)
})
