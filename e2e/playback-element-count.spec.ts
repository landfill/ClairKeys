import { expect, test, type Locator, type Page } from '@playwright/test'
import type { CanonicalAnimationData } from '../src/types/animationContract'

/**
 * 세는 단위:
 * 재생 화면 루트(FallingNotesPlayer가 그리는 영역) 안에서 화면에 보이는 것만 센다.
 * 보이는 것의 정의: getBoundingClientRect의 넓이가 0보다 크고, visibility가 hidden이 아니고,
 * display가 none이 아니고(조상 포함), 뷰포트와 겹친다.
 * 스크롤해야 보이는 것은 따로 센다 — 아래 belowFold.
 * - controls: 보이는 조작 요소 수.
 *   button, a[href], input, select, textarea, [role=slider], [role=switch], [role=checkbox], [role=tab], summary.
 *   건반(피아노 키)과 낙하 음표 캔버스는 세지 않는다(재생 대상이지 컨트롤이 아니다).
 * - textBlocks: 보이는 설명 텍스트 블록 수. 조작 요소 안에 있지 않은
 *   p, li, h1~h6, [role=note], [role=status], figcaption, dt, dd 중 텍스트가 비어 있지 않은 것.
 * - belowFold: 위 두 종류 중 display·visibility로는 보이지만 뷰포트 아래에 있어
 *   스크롤해야 보이는 것의 수(참고값).
 *
 * 루트: main [data-testid="playback-box"]의 두 단계 부모(xpath=../..).
 * playback-box → visualizationRef 래퍼 → FallingNotesPlayer 최상위 div라는 기존 구조를 쓴다.
 * 페이지 제목·악보 정보 카드·사이트 헤더·푸터를 제외하고 설정과 설명까지 포함한다.
 * 제외: [data-testid="playback-box"] > div:last-child(건반 영역),
 * [data-testid="playback-box"] > div:first-child > div:first-child(낙하 음표 그림),
 * [data-testid="playback-box"] canvas(캔버스 구현도 제외).
 * 현재 FallingNotes는 캔버스가 아닌 div 그림이다. 형제인 기다리기·카운트인 안내는 제외하지 않는다.
 * 상태 진입과 기준값 이하의 요소 수를 검증한다.
 */

// main `6b4c750` 이후 측정: 재생 전 합계는 스크롤 아래 요소도 포함한다.
const BASELINE = {
  desktop: { beforePlayTotal: 23, controls: 8, textBlocks: 0 },
  touch: { beforePlayTotal: 22, controls: 7, textBlocks: 0 },
} as const

const animation: CanonicalAnimationData = {
  version: '1.1', title: '재생 화면 요소 수 측정', composer: '측정 fixture',
  duration: 30, tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, timeSignature: '4/4',
  notes: Array.from({ length: 12 }, (_, index) => [
    { midi: 60 + [0, 2, 4][index % 3], start: index * 2, duration: 1.5, hand: 'R' as const, finger: (index % 3 + 1) as 1 | 2 | 3 },
    { midi: 48 + [0, 2, 4][index % 3], start: index * 2, duration: 1.5, hand: 'L' as const, finger: (5 - index % 3) as 3 | 4 | 5 },
  ]).flat(),
}

const controlsSelector = 'button, a[href], input, select, textarea, [role=slider], [role=switch], [role=checkbox], [role=tab], summary'
const textSelector = 'p, li, h1, h2, h3, h4, h5, h6, [role=note], [role=status], figcaption, dt, dd'
const excludedSelector = '[data-testid="playback-box"] > div:last-child, [data-testid="playback-box"] > div:first-child > div:first-child, [data-testid="playback-box"] canvas'

async function prepare(page: Page) {
  await page.addInitScript(() => {
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

async function measure(root: Locator, environment: keyof typeof BASELINE, state: 'before-play' | 'playing' | 'paused') {
  const measurement = await root.evaluate((element, selectors) => {
    const elements: { controls: string[]; textBlocks: string[]; belowFold: { kind: string; element: string }[] } = {
      controls: [], textBlocks: [], belowFold: [],
    }
    const compact = (text: string) => text.replace(/\s+/g, ' ').trim()
    const label = (node: Element) => {
      const labelledBy = node.getAttribute('aria-labelledby')?.split(/\s+/)
        .map(id => document.getElementById(id)?.textContent || '').join(' ')
      const labels = 'labels' in node ? Array.from((node as HTMLInputElement).labels || []).map(item => item.textContent || '').join(' ') : ''
      const name = node.getAttribute('aria-label') || labelledBy || labels || (node as HTMLElement).innerText || node.textContent || node.getAttribute('title') || ''
      return `${node.tagName.toLowerCase()}: ${compact(name).slice(0, 20)}`
    }
    const collect = (selector: string, kind: 'controls' | 'textBlocks') => {
      for (const node of element.querySelectorAll(selector)) {
        if (node.closest(selectors.excluded)) continue
        if (kind === 'textBlocks' && (node.closest(selectors.controls) || !compact(node.textContent || ''))) continue
        const rect = node.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) continue
        let hidden = false
        for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor)
          if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
            hidden = true
            break
          }
        }
        if (hidden || rect.left >= window.innerWidth || rect.right <= 0) continue
        if (rect.top >= window.innerHeight) {
          elements.belowFold.push({ kind, element: label(node) })
        } else if (rect.bottom > 0) {
          elements[kind].push(label(node))
        }
      }
    }
    collect(selectors.controls, 'controls')
    collect(selectors.text, 'textBlocks')
    return {
      controls: elements.controls.length,
      textBlocks: elements.textBlocks.length,
      belowFold: elements.belowFold.length,
      elements,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    }
  }, { controls: controlsSelector, text: textSelector, excluded: excludedSelector })
  const result = { environment, project: test.info().project.name, state, ...measurement }
  const json = JSON.stringify(result)
  await test.info().attach(`element-count-${environment}-${state}.json`, { body: json, contentType: 'application/json' })
  process.stdout.write(`ELEMENT_COUNT ${json}\n`)
  const totalControls = measurement.controls + measurement.elements.belowFold.filter(item => item.kind === 'controls').length
  const totalTextBlocks = measurement.textBlocks + measurement.elements.belowFold.filter(item => item.kind === 'textBlocks').length
  const baseline = BASELINE[environment]
  if (state === 'before-play') {
    expect(totalControls + totalTextBlocks).toBeLessThanOrEqual(baseline.beforePlayTotal)
  } else {
    expect(totalControls).toBeLessThanOrEqual(baseline.controls)
    expect(totalTextBlocks).toBeLessThanOrEqual(baseline.textBlocks)
  }
}

test('measures setup, playing and paused playback elements', async ({ page }) => {
  const project = test.info().project.name
  test.skip(project !== 'chromium' && project !== 'Mobile Chrome', '측정 환경은 데스크톱 chromium과 터치 Mobile Chrome이다.')
  const environment = project === 'chromium' ? 'desktop' : 'touch'
  if (environment === 'desktop') await page.setViewportSize({ width: 1280, height: 720 })
  await prepare(page)
  const root = page.locator('main [data-testid="playback-box"]').locator('xpath=../..')
  await expect(root).toHaveCount(1)
  await expect(page.getByRole('heading', { name: animation.title, exact: true })).toBeVisible()
  await expect(root.getByTestId('playback-play')).toBeEnabled()
  await expect(root.getByTestId('playback-pause')).toBeDisabled()
  await expect(root.getByTestId('compact-playback-bar')).toHaveCount(0)
  await expect(root.getByTestId('sample-loading')).toHaveCount(0)
  await expect(root.getByRole('list', { name: '연습 방법' })).toHaveCount(0)
  await expect(root.getByRole('note', { name: '키보드 단축키' })).toHaveCount(0)
  const help = root.getByRole('link', { name: '연습 방법과 단축키 보기' })
  await expect(help).toHaveCount(1)
  await expect(help).toHaveAttribute('href', '/learn/practice')
  await measure(root, environment, 'before-play')

  await root.getByTestId('playback-play').click()
  await expect(root.getByTestId('compact-playback-bar')).toBeVisible({ timeout: 15000 })
  const pause = root.getByRole('button', { name: '일시정지', exact: true })
  await expect(pause).toBeEnabled()
  await expect(root.getByTestId('sample-loading')).toHaveCount(0)
  const position = root.getByRole('slider', { name: '재생 위치', exact: true })
  const currentTime = async () => Number(await position.getAttribute('aria-valuenow'))
  await expect.poll(currentTime).toBeGreaterThanOrEqual(1)
  const firstTime = await currentTime()
  await expect.poll(currentTime).toBeGreaterThan(firstTime)
  await expect(help).toHaveCount(0)
  await measure(root, environment, 'playing')

  await pause.click()
  await expect(root.getByRole('button', { name: '재생', exact: true })).toBeEnabled()
  await expect(root.getByRole('button', { name: '일시정지', exact: true })).toHaveCount(0)
  await expect(root.getByTestId('compact-playback-bar')).toBeVisible()
  const pausedTime = await currentTime()
  // 버튼 표시뿐 아니라 시간이 멈췄는지 확인한다.
  await page.waitForTimeout(1100)
  expect(await currentTime()).toBe(pausedTime)
  await expect(help).toHaveCount(0)
  await measure(root, environment, 'paused')
})
