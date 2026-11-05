import { expect, test } from '@playwright/test'

test('offers a paused introduction with native playback controls', async ({ page, request }) => {
  await page.goto('/')
  const video = page.getByTestId('falling-notes-result-area').getByLabel('ClairKeys 소개 영상', { exact: true })
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('controls', '')
  await expect(video).toHaveAttribute('playsinline', '')
  await expect(video).toHaveAttribute('preload', 'none')
  await expect(video).not.toHaveAttribute('autoplay')
  await expect(page.getByText('연습 화면 예시', { exact: true })).toHaveCount(0)
  await expect(video).toHaveJSProperty('paused', true)
  await expect(video).toHaveJSProperty('muted', false)
  // Native preload is a hint, not a network gate: WebKit may fetch media even
  // with preload="none". The page must still start paused, without autoplay.

  // Check the actual shipped assets, without relying on the CI browser's codecs.
  const source = video.locator('source')
  const media = await request.get((await source.getAttribute('src'))!)
  expect(media.ok()).toBe(true)
  expect(media.headers()['content-type']).toContain('video/mp4')
  const bytes = await media.body()
  expect(bytes.subarray(4, 8).toString()).toBe('ftyp')
  expect(bytes.length).toBeLessThan(4_000_000)
  const poster = await request.get((await video.getAttribute('poster'))!)
  expect(poster.ok()).toBe(true)
  expect(poster.headers()['content-type']).toContain('image/jpeg')

  for (const width of [390, 762, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const box = await video.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.02)
  }
})
