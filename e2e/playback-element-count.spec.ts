import { expect, test, type Locator, type Page } from '@playwright/test'
import type { CanonicalAnimationData } from '../src/types/animationContract'

/**
 * controls: 기존 controlsSelector에 해당하는 화면에 보이는 조작 요소 수.
 *
 * textBlocks = 루트 안에서 자기 직계 자식으로 공백이 아닌 텍스트 노드를 가진 요소 중,
 * 조작 요소(기존 controlsSelector) 안에 있지 않고, label·option 안에 있지 않고
 * (컨트롤의 이름표는 컨트롤에 딸린 것으로 본다), 제외 영역(건반·낙하 음표 그림) 안에 있지 않고,
 * aria-hidden="true" 조상이 없고, 기존의 "보인다" 정의를 만족하는 것.
 * 리뷰에서 div·span 안내가 빠지는 것이 확인되어 예전 태그 기준에서 바꿨다.
 * 보이는 것: getBoundingClientRect의 넓이가 0보다 크고, 조상을 포함해 display가 none이 아니고
 * visibility가 hidden/collapse가 아니며 뷰포트와 겹친다.
 * belowFold: 위 두 종류 중 display·visibility로 보이지만 뷰포트 아래에 있는 수(합계에 포함).
 * keyMarks: 건반 영역에서 보이는 계이름/가운데 도 표식(noteNames), 옥타브 표식(octaveMarks), 운지(fingering).
 *
 * 루트는 main [data-testid="playback-box"]의 두 단계 부모(xpath=../..), FallingNotesPlayer 최상위 div다.
 * 제외 영역: playback-box의 마지막 자식(건반), 첫 자식의 첫 자식(낙하 음표 그림), 내부 canvas.
 * 현재 루트 1개·건반 1개·낙하 그림 1개·canvas 0개를 계측 회귀에서 검증한다.
 * 과거 제품에는 data- 표식 속성이 없으므로 기존 aria-label도 keyMarks 선택자에 포함한다.
 */
type State = 'before-play' | 'playing' | 'paused'
type Environment = 'desktop' | 'touch'
type Counts = { controls: number; textBlocks: number }
type KeyMarks = { noteNames: number; octaveMarks: number; fingering: number }
type Baseline = Record<Environment, Record<State, Counts & { keyMarks: KeyMarks }>>
// 9d18ce2에서 측정, 2026-10-04. 재생 전 counts는 화면 아래 요소까지 포함한 합계다.
const BASELINE: Baseline | null = {
  desktop: {
    'before-play': { controls: 14, textBlocks: 17, keyMarks: { noteNames: 0, octaveMarks: 0, fingering: 0 } },
    playing: { controls: 8, textBlocks: 3, keyMarks: { noteNames: 0, octaveMarks: 7, fingering: 0 } },
    paused: { controls: 8, textBlocks: 3, keyMarks: { noteNames: 0, octaveMarks: 7, fingering: 0 } },
  },
  touch: {
    'before-play': { controls: 14, textBlocks: 13, keyMarks: { noteNames: 0, octaveMarks: 0, fingering: 0 } },
    playing: { controls: 7, textBlocks: 1, keyMarks: { noteNames: 0, octaveMarks: 2, fingering: 0 } },
    paused: { controls: 7, textBlocks: 1, keyMarks: { noteNames: 0, octaveMarks: 2, fingering: 0 } },
  },
}
const MEASURE_ONLY = process.env.ELEMENT_COUNT_MEASURE_ONLY === '1'

function requireBaseline(value: Baseline | null): Baseline {
  if (value === null) throw new Error('새 계측 단위의 BASELINE이 없어 비교 검증을 실행할 수 없습니다. 측정은 ELEMENT_COUNT_MEASURE_ONLY=1로 실행하세요.')
  return value
}

const animation: CanonicalAnimationData = {
  version: '1.1', title: '재생 화면 요소 수 측정', composer: '측정 fixture',
  duration: 30, tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, timeSignature: '4/4',
  notes: Array.from({ length: 12 }, (_, index) => [
    { midi: 60 + [0, 2, 4][index % 3], start: index * 2, duration: 1.5, hand: 'R' as const, finger: (index % 3 + 1) as 1 | 2 | 3 },
    { midi: 48 + [0, 2, 4][index % 3], start: index * 2, duration: 1.5, hand: 'L' as const, finger: (5 - index % 3) as 3 | 4 | 5 },
  ]).flat(),
}

const controlsSelector = 'button, a[href], input, select, textarea, [role=slider], [role=switch], [role=checkbox], [role=tab], summary'
const excludedSelector = '[data-testid="playback-box"] > div:last-child, [data-testid="playback-box"] > div:first-child > div:first-child, [data-testid="playback-box"] canvas'

async function prepare(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('clairkeys.noteNames')
    localStorage.removeItem('clairkeys.resume.212')
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => { throw new Error('isolated element count fixture') }
    }
  })
  await page.route('**/api/sheet/212', route => route.fulfill({ json: { sheetMusic: {
    id: 212, title: animation.title, composer: animation.composer,
    hasScore: false, isPublic: true, provenance: 'omr', createdAt: '2026-10-04',
    animationDataUrl: '/playback-element-count-animation.json',
  } } }))
  await page.route('**/playback-element-count-animation.json', route => route.fulfill({ json: animation }))
  await page.goto('/sheet/212')
}

// 스크롤하지 않고 한 시점의 DOM을 읽어 조작·설명·건반 표시를 같은 프레임에서 센다.
async function readMeasurement(root: Locator) {
  return root.evaluate((element, selectors) => {
    type Entry = { tag: string; name: string; text: string; inTempo: boolean }
    const elements: { controls: Entry[]; textBlocks: Entry[]; belowFold: { kind: string; element: Entry }[] } = {
      controls: [], textBlocks: [], belowFold: [],
    }
    const compact = (text: string) => text.replace(/\s+/g, ' ').trim()
    const describe = (node: Element): Entry => {
      const text = compact(node.textContent || '')
      const labelledBy = node.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ')
      const labels = 'labels' in node ? [...(node as HTMLInputElement).labels || []].map(label => label.textContent || '').join(' ') : ''
      return {
        tag: node.tagName.toLowerCase(),
        name: compact(node.getAttribute('aria-label') || labelledBy || labels || text || (node.hasAttribute('data-note-label') ? '가운데 도 표식' : '')).slice(0, 20),
        text: text.slice(0, 20),
        inTempo: node.closest('[data-testid="tempo-display"]') !== null,
      }
    }
    const visibleRect = (node: Element) => {
      const rect = node.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor)
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return null
      }
      return rect.left < innerWidth && rect.right > 0 ? rect : null
    }
    const add = (node: Element, kind: 'controls' | 'textBlocks') => {
      const rect = visibleRect(node)
      if (!rect) return
      if (rect.top >= innerHeight) elements.belowFold.push({ kind, element: describe(node) })
      else if (rect.bottom > 0) elements[kind].push(describe(node))
    }
    for (const node of element.querySelectorAll(selectors.controls)) {
      if (!node.closest(selectors.excluded)) add(node, 'controls')
    }
    for (const node of [element, ...element.querySelectorAll('*')]) {
      if (node.closest(selectors.excluded) || node.closest(selectors.controls) || node.closest('label, option, [aria-hidden="true"]')) continue
      const directText = [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && compact(child.textContent || '') !== '')
      if (directText) add(node, 'textBlocks')
    }
    const keyboard = element.querySelector('[data-testid="playback-box"] > div:last-child')
    const marks = (selector: string) => [...keyboard?.querySelectorAll(selector) || []].filter(node => {
      const rect = visibleRect(node)
      return rect && rect.top < innerHeight && rect.bottom > 0
    }).map(describe)
    const keyMarkElements = {
      noteNames: marks('[data-note-label]'),
      octaveMarks: marks('[data-octave-mark], [aria-label$=" octave marker"]'),
      fingering: marks('[data-fingering-mark], [aria-label*="번 건반 운지 "]'),
    }
    return {
      controls: elements.controls.length,
      textBlocks: elements.textBlocks.length,
      belowFold: elements.belowFold.length,
      elements,
      keyMarks: {
        noteNames: keyMarkElements.noteNames.length,
        octaveMarks: keyMarkElements.octaveMarks.length,
        fingering: keyMarkElements.fingering.length,
      },
      keyMarkElements,
      viewport: { width: innerWidth, height: innerHeight },
    }
  }, { controls: controlsSelector, excluded: excludedSelector })
}

async function measure(root: Locator, enabled: boolean | null, environment: Environment, state: State) {
  const measurement = await readMeasurement(root)
  const json = JSON.stringify({ noteNames: enabled, environment, project: test.info().project.name, state, ...measurement })
  await test.info().attach(`element-count-${environment}-${state}-${enabled === null ? 'original' : enabled ? 'on' : 'off'}.json`, { body: json, contentType: 'application/json' })
  process.stdout.write(`ELEMENT_COUNT ${json}\n`)
  const counts = {
    controls: measurement.controls + measurement.elements.belowFold.filter(item => item.kind === 'controls').length,
    textBlocks: measurement.textBlocks + measurement.elements.belowFold.filter(item => item.kind === 'textBlocks').length,
  }
  if (!MEASURE_ONLY) {
    const baseline = requireBaseline(BASELINE)[environment][state]
    if (state === 'before-play') {
      expect(counts.controls).toBe(17)
      expect(counts.controls + counts.textBlocks).toBeLessThanOrEqual(baseline.controls + baseline.textBlocks)
    }
    else {
      expect(counts.controls).toBeLessThanOrEqual(baseline.controls)
      expect(counts.textBlocks).toBeLessThanOrEqual(baseline.textBlocks)
    }
    if (!enabled) {
      expect(measurement.keyMarks.noteNames).toBe(0)
      if (state !== 'before-play') {
        const total = Object.values(measurement.keyMarks).reduce((sum, count) => sum + count, 0)
        const originalTotal = Object.values(baseline.keyMarks).reduce((sum, count) => sum + count, 0)
        expect(total).toBe(originalTotal)
      }
    } else {
      expect(measurement.keyMarks.octaveMarks).toBe(0)
      if (state !== 'before-play') expect(measurement.keyMarks.noteNames).toBeGreaterThan(0)
    }
  }
  return counts
}

function playerRoot(page: Page) {
  return page.locator('main [data-testid="playback-box"]').locator('xpath=../..')
}

async function assertMeasurementScope(root: Locator) {
  await expect(root).toHaveCount(1)
  await expect(root.locator('[data-testid="playback-box"]')).toHaveCount(1)
  await expect(root.locator('[data-testid="playback-box"] > div:last-child')).toHaveCount(1)
  await expect(root.locator('[data-testid="playback-box"] > div:first-child > div:first-child')).toHaveCount(1)
  await expect(root.locator('[data-testid="playback-box"] canvas')).toHaveCount(0)
  await expect(root.locator(excludedSelector)).toHaveCount(2)
}

async function start(root: Locator) {
  await root.getByTestId('playback-play').click()
  await expect(root.getByTestId('compact-playback-bar')).toBeVisible({ timeout: 15000 })
  await expect(root.getByRole('button', { name: '일시정지', exact: true })).toBeEnabled()
  const position = root.getByRole('slider', { name: '재생 위치', exact: true })
  const currentTime = async () => Number(await position.getAttribute('aria-valuenow'))
  await expect.poll(currentTime).toBeGreaterThanOrEqual(1)
  const firstTime = await currentTime()
  await expect.poll(currentTime).toBeGreaterThan(firstTime)
  return currentTime
}

test('measures setup, playing and paused playback elements', async ({ page }) => {
  const project = test.info().project.name
  test.skip(project !== 'chromium' && project !== 'Mobile Chrome', '측정 환경은 데스크톱 chromium과 터치 Mobile Chrome이다.')
  if (!MEASURE_ONLY) requireBaseline(BASELINE)
  const environment: Environment = project === 'chromium' ? 'desktop' : 'touch'
  if (environment === 'desktop') await page.setViewportSize({ width: 1280, height: 720 })
  const off: Counts[] = []
  // 측정 전용에서는 과거 제품의 토글·링크를 찾거나 조작하지 않는다.
  for (const enabled of MEASURE_ONLY ? [null] : [false, true]) {
    const results: Counts[] = []
    await prepare(page)
    const root = playerRoot(page)
    if (!MEASURE_ONLY) {
      await assertMeasurementScope(root)
      await page.getByRole('checkbox', { name: '건반에 계이름 표시' }).setChecked(Boolean(enabled))
      await expect(root.getByRole('list', { name: '연습 방법' })).toHaveCount(0)
      await expect(root.getByRole('note', { name: '키보드 단축키' })).toHaveCount(0)
      await expect(root.getByRole('link', { name: '연습 방법과 단축키 보기' })).toHaveCount(1)
      await expect(root.getByRole('link', { name: '연습 방법과 단축키 보기' })).toHaveAttribute('href', '/learn/practice')
      await expect(root.getByRole('link', { name: '손가락 번호 보기' })).toHaveAttribute('href', '/learn/hands')
    }
    await page.evaluate(() => scrollTo(0, 0))
    await expect(root.getByTestId('playback-play')).toBeEnabled()
    await expect(root.getByTestId('playback-pause')).toBeDisabled()
    results.push(await measure(root, enabled, environment, 'before-play'))
    const currentTime = await start(root)
    if (!MEASURE_ONLY) {
      await expect(root.getByRole('link', { name: '연습 방법과 단축키 보기' })).toHaveCount(0)
      await expect(root.getByRole('link', { name: '손가락 번호 보기' })).toHaveCount(0)
    }
    results.push(await measure(root, enabled, environment, 'playing'))
    await root.getByRole('button', { name: '일시정지', exact: true }).click()
    await expect(root.getByRole('button', { name: '재생', exact: true })).toBeEnabled()
    const pausedTime = await currentTime()
    await page.waitForTimeout(1100)
    expect(await currentTime()).toBe(pausedTime)
    if (!MEASURE_ONLY) {
      await expect(root.getByRole('link', { name: '연습 방법과 단축키 보기' })).toHaveCount(0)
      await expect(root.getByRole('link', { name: '손가락 번호 보기' })).toHaveCount(0)
    }
    results.push(await measure(root, enabled, environment, 'paused'))
    if (!MEASURE_ONLY) {
      if (!enabled) off.push(...results)
      else expect(results).toEqual(off)
    }
  }
})

test('measurement includes tempo and exactly one injected div text block', async ({ page }) => {
  test.skip(MEASURE_ONLY || !['chromium', 'Mobile Chrome'].includes(test.info().project.name), '계측 회귀는 측정 전용 모드가 아닌 두 측정 환경에서 수행한다.')
  await page.setViewportSize({ width: 1280, height: 720 })
  await prepare(page)
  const root = playerRoot(page)
  await assertMeasurementScope(root)
  await start(root)
  await root.getByRole('button', { name: '일시정지', exact: true }).click()
  await expect(root.getByTestId('tempo-display')).toBeVisible()
  const before = await readMeasurement(root)
  expect(before.elements.textBlocks.some(item => item.inTempo)).toBe(true)
  await root.evaluate(element => {
    const text = document.createElement('div')
    text.textContent = '계측 회귀용 설명'
    text.style.cssText = 'position: absolute; left: 10px; top: 100px; width: 200px; height: 20px; z-index: 9999'
    element.appendChild(text)
  })
  const after = await readMeasurement(root)
  expect(after.textBlocks).toBe(before.textBlocks + 1)
  expect(after.elements.textBlocks.some(item => item.text === '계측 회귀용 설명')).toBe(true)
})
