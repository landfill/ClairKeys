import { expect, test, type Page } from '@playwright/test'
const xml = '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>-2</fifths></key><time><beats>3</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note id="n1"><pitch><step>C</step><octave>4</octave></pitch><duration>3</duration><type>half</type><dot/></note></measure></part></score-partwise>'
const score = { version: 1, musicxml: xml, timingReferenceBpm: 60, measures: [{ partIndex: 0, measureIndex: 0, start: 0, end: 3, startQuarter: 0, endQuarter: 3 }], notes: [{ xmlId: 'n1', noteIndex: 0 }] }
async function fixture(page: Page, version = '1.1', source: string | null = xml, fail = false) {
  await page.addInitScript(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated provenance fixture') } })
  await page.route('**/api/auth/session', route => route.fulfill({ json: {} }))
  await page.route('**/api/sheet/228', route => route.fulfill({ json: { sheetMusic: { id: 228, title: '출처 확인', composer: 'fixture', isPublic: true, provenance: 'omr', hasScore: source !== null, createdAt: '2026-10-04', animationDataUrl: '/provenance-animation.json' } } }))
  await page.route('**/provenance-animation.json', route => route.fulfill({ json: { version, title: '출처 확인', composer: 'fixture', duration: 3, tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, notes: [{ midi: 60, start: 0, duration: 3, hand: 'R' }] } }))
  let count = 0
  await page.route('**/api/sheet/228/score', route => { count++; return route.fulfill(fail ? { status: 404, json: {} } : { json: { ...score, musicxml: source } }) })
  return () => count
}
const intro = (page: Page) => page.getByRole('region', { name: '이 곡 소개', exact: true })

for (const version of ['1.0', '1.1']) {
  test(`${version}: displays only XML provenance and shares the player artifact request`, async ({ page, isMobile }, testInfo) => {
    const count = await fixture(page, version)
    await page.goto('/sheet/228')
    await expect(intro(page)).toContainText('3/4')
    await expect(intro(page)).toContainText('플랫 2개')
    await expect(intro(page).getByText('원본 악보 기준', { exact: true })).toHaveCount(2)
    await expect(intro(page)).not.toContainText(/4\/4|장조|단조/)
    if (!isMobile) {
      await page.getByRole('button', { name: '악보 보기', exact: true }).click()
      await expect(page.getByTestId('score-panel').locator('svg')).toHaveCount(1)
    }
    expect(count()).toBe(1)
    await intro(page).screenshot({ path: testInfo.outputPath('song-provenance.png') })
    await intro(page).getByRole('link', { name: '악보 읽기에서 박자표 익히기' }).click()
    await expect(page).toHaveURL(/\/learn\/reading\/rhythm#meters$/)
    await expect(page.locator('h2#meters')).toBeInViewport()
  })
}
for (const mode of ['missing', 'absent-in-xml', 'failure'] as const) {
  test(`${mode}: hides unsupported facts instead of displaying the 4/4 normalization default`, async ({ page }) => {
    await fixture(page, '1.1', mode === 'missing' ? null : mode === 'absent-in-xml' ? xml.replace(/<key>.*?<\/key>|<time>.*?<\/time>/g, '') : xml, mode === 'failure')
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/sheet/228')
    await expect(intro(page)).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(intro(page).locator('dt').filter({ hasText: /^(박자|조표)$/ })).toHaveCount(0)
    await expect(intro(page)).not.toContainText(/4\/4|원본 악보 기준/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  })
}
