// First visit: link throttled from the start, no service worker, reader looks at the page for READ_MS, then presses 재생.
import { createRequire } from 'node:module'
const { chromium } = createRequire('/Users/h0977/dev/ClairKeys/package.json')('@playwright/test')
const [url, profile] = [process.argv[2], process.argv[3]]
const READ_MS = Number(process.env.READ_MS ?? 3000)
// Chrome DevTools presets: Fast 4G 9 Mbps / 60 ms (approx.), Slow 4G 1.6 Mbps / 150 ms.
const net = { fast4g: [9 * 1024 * 1024 / 8, 60], slow4g: [1.6 * 1024 * 1024 / 8, 150] }[profile]
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.enable')
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: net[1], downloadThroughput: net[0], uploadThroughput: net[0] })
const animation = { version: '1.0', title: 'A/B', composer: 'x', duration: 30, tempo: 100, tempoSource: 'score', timingReferenceBpm: 100, timeSignature: '4/4',
  notes: Array.from({ length: 20 }, (_, i) => ({ midi: 60 + (i % 5), start: i * 1.5, duration: 1 })) }
await page.route('**/api/sheet/1', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, sheetMusic: {
  id: 1, title: 'A/B', composer: 'x', category: null, isPublic: true, provenance: 'omr', availability: 'ready', animationDataUrl: '/ab.json',
  createdAt: '2026-09-28T00:00:00.000Z', updatedAt: '2026-09-28T00:00:00.000Z', owner: null } }) }))
await page.route('**/ab.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(animation) }))
let clickAt = 0, before = 0
page.on('request', r => { if (r.url().includes('/samples/piano/') && !clickAt) before++ })
await page.goto(url, { waitUntil: 'load', timeout: 120000 })
const play = page.getByRole('button', { name: '재생', exact: true }).first()
await play.waitFor({ state: 'visible', timeout: 60000 })
await page.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === '재생'); return b && !b.disabled }, null, { timeout: 60000 })
await page.waitForTimeout(READ_MS)
clickAt = Date.now()
await play.click()
const slider = page.getByRole('slider', { name: '재생 위치' }).first()
await page.waitForFunction(() => {
  const s = [...document.querySelectorAll('[role="slider"]')].find(e => e.getAttribute('aria-label') === '재생 위치')
  return s && !(s.getAttribute('aria-valuetext') ?? '').startsWith('0:00')
}, null, { timeout: 60000, polling: 50 })
const left = Date.now() - clickAt
const status = await page.locator('[role="status"][aria-live="polite"]').first().textContent()
console.log(JSON.stringify({ profile, samplesRequestedBeforeClick: before, clickToLeave000ms: left, status }))
await browser.close()
