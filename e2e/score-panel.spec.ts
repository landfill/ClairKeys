import { expect, test } from '@playwright/test'

// Authored notation fixture: two piano staves, whole-note measures and app fingering.
// End-to-end real OMR upload is separately recorded with the local Docker service.
const count = 16
const musicxml = `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${Array.from({ length: count }, (_, i) => `<measure number="${i + 1}">${i === 0 ? '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>' : ''}${i % 4 === 0 ? '<print new-system="yes"/>' : ''}<note id="n${i * 2}"><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><type>whole</type><staff>2</staff></note><backup><duration>4</duration></backup><note id="n${i * 2 + 1}"><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>1</staff></note></measure>`).join('')}</part></score-partwise>`
const animation = {
  version: '1.1', title: '악보 패널 회귀', composer: 'Generated fixture', duration: count * 4,
  tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, timeSignature: '4/4',
  notes: Array.from({ length: count }, (_, i) => [
    { midi: 48, start: i * 4, duration: 4, hand: 'L', staff: 2, voice: 2 },
    { midi: 64, start: i * 4, duration: 4, hand: 'R', staff: 1, voice: 1 },
  ]).flat(),
}
const artifact = {
  version: 1, musicxml, timingReferenceBpm: 60,
  measures: Array.from({ length: count }, (_, i) => ({ partIndex: 0, measureIndex: i, start: i * 4, end: (i + 1) * 4, startQuarter: i * 4, endQuarter: (i + 1) * 4 })),
  notes: animation.notes.map((_, i) => ({ xmlId: `n${i}`, noteIndex: i })),
}
async function prepare(page: import('@playwright/test').Page, hasScore = true) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('Disabled for isolated fixture') }
  })
  await page.route('**/api/sheet/125', route => route.fulfill({ json: { sheetMusic: {
    id: 125, title: animation.title, composer: animation.composer, hasScore, isPublic: false, provenance: 'omr',
    createdAt: '2026-09-20', animationDataUrl: '/score-panel-animation.json',
  } } }))
  await page.route('**/score-panel-animation.json', route => route.fulfill({ json: animation }))
  await page.route('**/api/sheet/125/score', route => route.fulfill({ json: artifact }))
  await page.goto('/sheet/125')
}

test('desktop toggle, persistence, full-measure highlight and scrolling follow existing seek', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('Mobile'), 'PC-only feature')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await prepare(page)
  const toggle = page.getByRole('button', { name: '악보 보기', exact: true })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('score-panel')).toHaveCount(0)
  await toggle.click()
  await expect(page.getByTestId('score-panel').locator('svg')).toHaveCount(1)
  const highlight = page.getByTestId('score-measure-highlight')
  await expect(highlight).toHaveAttribute('data-measure-index', '0')
  const bounds = await highlight.boundingBox()
  expect(bounds!.height).toBeGreaterThan(80) // spans both staves, not a single-note cursor
  const seek = page.locator('.playback-controls [tabindex="0"]').first()
  await seek.press('End')
  await expect(highlight).toHaveAttribute('data-measure-index', '15')
  expect(await page.getByTestId('score-panel').evaluate(e => e.scrollTop)).toBeGreaterThan(0)
  await seek.press('Home')
  await expect(highlight).toHaveAttribute('data-measure-index', '0')
  await page.reload()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(highlight).toBeVisible()
  await toggle.click()
  await expect(page.getByTestId('score-panel')).toHaveCount(0)
  await expect(page.getByTestId('playback-box')).toBeVisible()
})

test('mobile keeps two rows even with a saved desktop preference', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('Mobile'), 'Mobile-specific pointer environment')
  await page.addInitScript(() => localStorage.setItem('clairkeys.score.visible', 'true'))
  await prepare(page)
  await expect(page.getByTestId('playback-box')).toBeVisible()
  await expect(page.getByRole('button', { name: '악보 보기', exact: true })).toHaveCount(0)
  await expect(page.getByTestId('score-panel')).toHaveCount(0)
})

test('legacy sheets offer playback without the score option', async ({ page }) => {
  await prepare(page, false)
  await expect(page.getByTestId('playback-box')).toBeVisible()
  await expect(page.getByRole('button', { name: '악보 보기', exact: true })).toHaveCount(0)
})
