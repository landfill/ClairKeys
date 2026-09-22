import { expect, test, type Page } from '@playwright/test'

// Authored notation, never a copied user score: extreme ledger lines plus
// fingering force a complete two-staff system beyond the old fixed panel.
const measures = 8
const musicxml = `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${Array.from({ length: measures }, (_, i) => `<measure number="${i + 1}">${i === 0 ? '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>' : ''}${i % 2 === 0 ? '<print new-system="yes"><staff-layout number="2"><staff-distance>180</staff-distance></staff-layout></print>' : ''}<note id="n${i * 2}"><pitch><step>A</step><octave>0</octave></pitch><duration>4</duration><voice>2</voice><type>whole</type><staff>2</staff><notations><technical><fingering>5</fingering></technical></notations></note><backup><duration>4</duration></backup><note id="n${i * 2 + 1}"><pitch><step>C</step><octave>8</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>1</staff><notations><technical><fingering>1</fingering></technical></notations></note></measure>`).join('')}</part></score-partwise>`
const notes = Array.from({ length: measures }, (_, i) => [
  { midi: 21, start: i * 4, duration: 4, hand: 'L', staff: 2, voice: 2, finger: 5 },
  { midi: 108, start: i * 4, duration: 4, hand: 'R', staff: 1, voice: 1, finger: 1 },
]).flat()
const animation = { version: '1.1', title: '세로 공간 회귀', composer: 'Authored fixture', duration: 32,
  tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, timeSignature: '4/4', notes }
const artifact = { version: 1, musicxml, timingReferenceBpm: 60,
  measures: Array.from({ length: measures }, (_, i) => ({ partIndex: 0, measureIndex: i, start: i * 4, end: (i + 1) * 4, startQuarter: i * 4, endQuarter: (i + 1) * 4 })),
  notes: notes.map((_, i) => ({ xmlId: `n${i}`, noteIndex: i })) }

async function prepare(page: Page, tall = true) {
  const animationFixture = tall ? animation : { ...animation, notes: notes.map(note => ({
    ...note, midi: note.staff === 2 ? 48 : 64,
  })) }
  const scoreFixture = tall ? artifact : { ...artifact, musicxml: musicxml
    .replaceAll('<step>A</step><octave>0</octave>', '<step>C</step><octave>3</octave>')
    .replaceAll('<step>C</step><octave>8</octave>', '<step>E</step><octave>4</octave>') }
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
  })
  await page.route('**/api/sheet/177', route => route.fulfill({ json: { sheetMusic: {
    id: 177, title: animation.title, composer: animation.composer, hasScore: true,
    isPublic: true, provenance: 'omr', createdAt: '2026-09-22', animationDataUrl: '/score-height-animation.json',
  } } }))
  await page.route('**/score-height-animation.json', route => route.fulfill({ json: animationFixture }))
  await page.route('**/api/sheet/177/score', route => route.fulfill({ json: scoreFixture }))
  await page.goto('/sheet/177')
  await page.getByRole('button', { name: '재생', exact: true }).click()
  await page.getByTestId('playback-box').waitFor()
  await page.getByRole('button', { name: '일시정지', exact: true }).click()
}

async function dimensions(page: Page) {
  return page.evaluate(() => {
    const box = document.querySelector<HTMLElement>('[data-testid="playback-box"]')!
    const keyboard = box.lastElementChild!.firstElementChild as HTMLElement
    const falling = box.firstElementChild as HTMLElement
    const panel = document.querySelector<HTMLElement>('[data-testid="score-panel"]')
    const staff = panel ? [...panel.querySelectorAll('g.staffline')] : []
    const systems = []
    for (let i = 0; i + 1 < staff.length; i += 2) {
      const a = staff[i].getBoundingClientRect(), b = staff[i + 1].getBoundingClientRect()
      systems.push(Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top))
    }
    return {
      viewport: [innerWidth, innerHeight],
      falling: falling.getBoundingClientRect().height,
      keyboard: keyboard.getBoundingClientRect().height,
      keys: [...keyboard.children].slice(0, 20).map(element => {
        const rect = element.getBoundingClientRect()
        return { x: rect.x, width: rect.width }
      }),
      octaveFonts: [...keyboard.querySelectorAll<HTMLElement>('[aria-label$="octave marker"]')]
        .map(element => getComputedStyle(element).fontSize),
      fingerFonts: [...keyboard.querySelectorAll<HTMLElement>('[aria-label*="건반 운지"]')]
        .map(element => getComputedStyle(element).fontSize),
      panelHeight: panel?.getBoundingClientRect().height ?? 0,
      clientHeight: panel?.clientHeight ?? 0,
      systems,
      boxBottom: box.getBoundingClientRect().bottom,
      documentWidth: document.documentElement.scrollWidth,
    }
  })
}

test('a tall score reclaims PC margin/key length without shortening the note runway', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('Mobile'), 'PC-only score panel')
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepare(page)
  const baseline = await dimensions(page)
  await page.getByRole('button', { name: '악보 보기', exact: true }).click()
  const panel = page.getByTestId('score-panel')
  await expect(panel.locator('g.staffline')).toHaveCount(2)
  await expect.poll(async () => (await dimensions(page)).panelHeight).toBeGreaterThan(306)
  const after = await dimensions(page)
  expect(Math.max(...after.systems)).toBeGreaterThan(289)
  await expect(panel).toHaveAttribute('aria-label', '악보')
  expect(after.falling).toBeGreaterThanOrEqual(baseline.falling)
  expect(after.keyboard).toBeLessThanOrEqual(baseline.keyboard)
  expect(after.keys).toEqual(baseline.keys)
  expect(after.octaveFonts).toEqual(baseline.octaveFonts)
  expect(after.fingerFonts.every(font => font === '12px')).toBe(true)
  expect(after.boxBottom).toBeLessThanOrEqual(900)
  expect(after.documentWidth).toBeLessThanOrEqual(1440)
  await page.screenshot({ path: info.outputPath('score-height-1440.png') })
})

test('a short PC viewport keeps the runway and allows scrolling for an over-budget system', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('Mobile'), 'PC-only score panel')
  await page.setViewportSize({ width: 1280, height: 720 })
  await prepare(page)
  const baseline = await dimensions(page)
  await page.getByRole('button', { name: '악보 보기', exact: true }).click()
  const panel = page.getByTestId('score-panel')
  await expect(panel.locator('g.staffline')).toHaveCount(2)
  await expect.poll(async () => (await dimensions(page)).panelHeight).toBeGreaterThan(245)
  const after = await dimensions(page)
  await expect(panel).toHaveAttribute('aria-label', /세로로 스크롤/)
  expect(after.falling).toBe(baseline.falling)
  expect(after.keyboard).toBeLessThan(baseline.keyboard)
  expect(after.keys).toEqual(baseline.keys)
  expect(after.boxBottom).toBeLessThanOrEqual(720)
  expect(after.documentWidth).toBeLessThanOrEqual(1280)
  expect(await panel.evaluate(element => element.scrollHeight)).toBeGreaterThan(after.clientHeight)
  await panel.hover()
  await page.mouse.wheel(0, 150)
  await expect.poll(() => panel.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
})

for (const size of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test(`keeps the PC geometry and content inside ${size.width}×${size.height}`, async ({ page }, info) => {
    test.skip(info.project.name.startsWith('Mobile'), 'PC-only score panel')
    await page.setViewportSize(size)
    await prepare(page)
    const baseline = await dimensions(page)
    await page.getByRole('button', { name: '악보 보기', exact: true }).click()
    await expect(page.getByTestId('score-panel').locator('g.staffline')).toHaveCount(2)
    const after = await dimensions(page)
    expect(after.falling).toBeGreaterThanOrEqual(baseline.falling)
    expect(after.keyboard).toBeLessThanOrEqual(baseline.keyboard)
    expect(after.keys).toEqual(baseline.keys)
    expect(after.boxBottom).toBeLessThanOrEqual(size.height)
    expect(after.documentWidth).toBeLessThanOrEqual(size.width)
  })
}

test('does not enlarge an already sufficient two-staff score', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('Mobile'), 'PC-only score panel')
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepare(page, false)
  const baseline = await dimensions(page)
  await page.getByRole('button', { name: '악보 보기', exact: true }).click()
  await expect(page.getByTestId('score-panel').locator('g.staffline')).toHaveCount(2)
  const after = await dimensions(page)
  expect(Math.max(...after.systems)).toBeLessThan(after.clientHeight)
  expect(after.panelHeight).toBe(306)
  expect(after.falling).toBe(baseline.falling)
  expect(after.keyboard).toBe(baseline.keyboard)
})
