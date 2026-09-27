import { expect, test, type Page } from '@playwright/test'
import { encode } from 'next-auth/jwt'

/**
 * A signed-in reader's practice run is reported when it ends and the sheet's
 * history refreshes. The API is fulfilled here; its validation and storage are
 * covered by the route tests. Session cookie per D-058.
 */

const animation = {
  version: '1.1', title: '연습 기록 회귀', composer: 'Authored fixture', duration: 60,
  tempo: 60, tempoSource: 'user', timingReferenceBpm: 60, timeSignature: '4/4',
  notes: Array.from({ length: 60 }, (_, index) => ({ midi: 60 + (index % 5), start: index, duration: 0.8, hand: 'R' })),
}

async function signedInFixture(page: Page) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
  })
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET ?? 'test-secret', token: { sub: 'e2e-user', name: '연습하는 사람', databaseUserId: 'e2e-user' } })
  await page.context().addCookies([{ name: 'next-auth.session-token', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }])
  await page.route('**/api/auth/session**', route => route.fulfill({ json: { user: { id: 'e2e-user', name: '연습하는 사람' }, expires: '2099-01-01T00:00:00.000Z' } }))
  await page.route('**/api/sheet/196', route => route.fulfill({ json: { sheetMusic: {
    id: 196, title: animation.title, composer: animation.composer,
    hasScore: false, isPublic: true, provenance: 'omr', createdAt: '2026-09-27',
    animationDataUrl: '/practice-records.json',
  } } }))
  await page.route('**/practice-records.json', route => route.fulfill({ json: animation }))
}

test('reports a finished run and shows the refreshed history', async ({ page, browserName }, info) => {
  test.skip(info.project.name.startsWith('Mobile'), 'one desktop pass per engine is enough for a 12 s run')
  test.setTimeout(60_000)
  await signedInFixture(page)
  const posted: unknown[] = []
  await page.route('**/api/sheet/196/practice', route => {
    if (route.request().method() === 'POST') {
      posted.push(route.request().postDataJSON())
      return route.fulfill({ status: 201, json: { id: 1 } })
    }
    return route.fulfill({ json: posted.length
      ? { count: 1, totalSeconds: 60, bestPercentage: 20, lastPracticedAt: '2026-09-27T01:00:00Z' }
      : { count: 0, totalSeconds: 0, bestPercentage: null, lastPracticedAt: null } })
  })

  await page.goto('/sheet/196')
  await expect(page.getByTestId('practice-summary')).toHaveText('아직 연습 기록이 없습니다')
  await expect(page.getByRole('button', { name: '로그인하고 기록 남기기' })).toHaveCount(0)

  await page.getByTestId('playback-play').click()
  const started = await page.getByTestId('compact-playback-bar')
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)
  if (!started) {
    expect(browserName, 'playback did not start in a browser that can').toBe('firefox')
    test.skip(true, 'headless firefox on this runner has no audio output')
  }
  await page.waitForTimeout(11_500)
  await page.getByRole('button', { name: '정지', exact: true }).click()

  await expect.poll(() => posted.length).toBe(1)
  const run = posted[0] as { durationSeconds: number; completedPercentage: number }
  expect(run.durationSeconds).toBeGreaterThanOrEqual(10)
  expect(run.completedPercentage).toBeGreaterThan(0)
  expect(run.completedPercentage).toBeLessThanOrEqual(100)
  await expect(page.getByTestId('practice-summary')).toContainText('1회')
})

test('tells a guest what signing in adds, without claiming a preview limit', async ({ page }) => {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
  })
  await page.route('**/api/sheet/196', route => route.fulfill({ json: { sheetMusic: {
    id: 196, title: animation.title, composer: animation.composer,
    hasScore: false, isPublic: true, provenance: 'omr', createdAt: '2026-09-27',
    animationDataUrl: '/practice-records.json',
  } } }))
  await page.route('**/practice-records.json', route => route.fulfill({ json: animation }))
  let practiceRequests = 0
  await page.route('**/api/sheet/196/practice', route => { practiceRequests += 1; return route.fulfill({ status: 401, json: {} }) })

  await page.goto('/sheet/196')
  await expect(page.getByRole('button', { name: '로그인하고 기록 남기기' })).toBeVisible()
  await expect(page.getByText('짧은 미리보기')).toHaveCount(0)
  expect(practiceRequests).toBe(0)
})
