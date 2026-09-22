import { expect, test } from '@playwright/test'

const animation = {
  version: '1.1', title: '실제 재생 모드', composer: 'Authored fixture', duration: 8,
  tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, timeSignature: '4/4',
  notes: [
    { midi: 60, start: 0, duration: 4, hand: 'R' },
    { midi: 48, start: 4, duration: 4, hand: 'L' },
  ],
}

async function prepare(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = async () => { throw new Error('isolated fixture') }
  })
  await page.route('**/api/sheet/184', route => route.fulfill({ json: { sheetMusic: {
    id: 184, title: animation.title, composer: animation.composer,
    hasScore: false, isPublic: true, provenance: 'omr', createdAt: '2026-09-22',
    animationDataUrl: '/playback-mode-animation.json',
  } } }))
  await page.route('**/playback-mode-animation.json', route => route.fulfill({ json: animation }))
  await page.goto('/sheet/184')
}

test('sheet setup presents only functioning playback controls', async ({ page }, info) => {
  await prepare(page)
  await expect(page.getByRole('heading', { name: animation.title })).toBeVisible()
  await expect(page.getByText('전체 설정')).toHaveCount(0)
  await expect(page.getByLabel('모드:')).toHaveCount(0)
  await expect(page.getByText('⏸️ 일시정지')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '재생', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '일시정지', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '중지', exact: true })).toBeVisible()
  await expect(page.getByLabel('속도:')).toBeVisible()
  await expect(page.getByRole('slider', { name: '음량 (master gain)' })).toBeVisible()
  if (info.project.name === 'chromium' || info.project.name === 'Mobile Chrome') {
    await page.screenshot({ path: info.outputPath('playback-setup.png') })
  }
})
