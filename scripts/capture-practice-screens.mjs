#!/usr/bin/env node
/**
 * Captures the playback screen for the `/learn/practice` screen tour.
 *
 * The lesson points at real controls, so the pictures come from the real player:
 * the built-in "두 손 인사" course piece is served through mocked sheet routes,
 * each control is located by its role or test id, and its boxes are written next
 * to the image as percentages [left, top, width, height]. Re-run this after changing the playback screen.
 *
 *   NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 npm start   # production build
 *   node scripts/capture-practice-screens.mjs [--base http://localhost:3000]
 *
 * Use a production server: `next dev` adds a debug panel and an indicator to the page.
 * Outputs public/learn/practice/<screen>-<variant>.<hash>.webp and src/lib/learn/practiceScreenshots.json.
 * The content hash in the name keeps image optimizers and caches from serving an old capture.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const baseArg = process.argv.indexOf('--base')
const base = baseArg > 0 ? process.argv[baseArg + 1] : 'http://localhost:3000'
const imageDir = path.join(root, 'public/learn/practice')
const dataFile = path.join(root, 'src/lib/learn/practiceScreenshots.json')
const SCALE = 2
const PAD = 16
/**
 * Blank page-coloured strip added above the playing capture. Its controls sit
 * at the very top of the screen, and the lesson puts their number badges above
 * them instead of over a 40px button.
 */
const PLAYING_HEADROOM = 36

/**
 * Phones are captured as a touch device (coarse pointer), because the player
 * lays out differently for one: during playback a phone held upright turns the
 * player to landscape (usePlaybackOrientation), and the two-row compact bar is
 * for narrow mouse windows only. The playing capture is therefore the 844x390
 * landscape screen a phone actually shows. `displayWidth` tells the lesson to
 * draw that wide picture at a readable width and let it scroll sideways.
 */
const VIEWPORTS = {
  mobile: { touch: true, setup: { width: 390, height: 844 }, playing: { width: 844, height: 390 }, playingDisplayWidth: 640 },
  desktop: { touch: false, setup: { width: 1024, height: 800 }, playing: { width: 1024, height: 680 } },
}

/** Locators per hotspot id. Several locators are joined into one box. */
const SETUP_SPOTS = {
  tempo: page => [page.getByTestId('tempo-display').locator('span')],
  progress: page => [page.locator('.playback-controls > div').first()],
  transport: page => [page.getByTestId('playback-play'), page.getByTestId('playback-pause'), page.getByTestId('playback-stop')],
  loop: page => [page.getByTestId('playback-loop')],
  speed: page => [page.getByRole('combobox').first()],
  hands: page => [page.getByRole('group', { name: '연습할 손' })],
  noteNames: page => [page.locator('label').filter({ hasText: '건반에 계이름 표시' })],
  metronome: page => [page.locator('label').filter({ hasText: /^메트로놈$/ }), page.locator('label').filter({ hasText: '시작 전 준비 박자' })],
  waitMode: page => [page.locator('label').filter({ hasText: '기다리기 모드' }), page.locator('#wait-mode-description')],
  volume: page => [page.locator('#master-volume').locator('..').locator('> *')],
  colors: page => [page.getByRole('list', { name: '노트 색상' }).getByRole('listitem')],
  scoreToggle: page => [page.getByRole('button', { name: '악보 보기' })],
}

const PLAYING_SPOTS = {
  transport: page => [page.getByTestId('compact-playback-bar').getByRole('button', { name: /^(재생|일시정지)$/ })],
  loop: page => [page.getByTestId('compact-loop-controls')],
  stop: page => [page.getByRole('button', { name: '정지', exact: true })],
  progress: page => [page.getByRole('slider', { name: '재생 위치' }), page.getByTestId('compact-playback-bar').locator('span.font-mono')],
  speed: page => [page.getByRole('combobox', { name: '재생 속도' })],
  volume: page => [page.getByRole('slider', { name: '음량' }), page.getByTestId('compact-playback-bar').getByText(/^\d+%$/)],
  tempo: page => [page.getByTestId('tempo-display').locator('span')],
  scoreToggle: page => [page.getByRole('button', { name: '악보 보기' })],
  lane: page => [page.getByTestId('playback-box').locator('> div').first()],
  keyboard: page => [page.getByTestId('playback-box').locator('> div').last()],
}

/** Spots the player only renders on a wide screen with a fine pointer. */
const DESKTOP_ONLY = new Set(['scoreToggle'])

/** Page coordinates: bounding boxes are viewport-relative, full-page clips are not. */
async function boxesOf(page, locators) {
  const scrollY = await page.evaluate(() => window.scrollY)
  const boxes = []
  for (const locator of locators) {
    const count = await locator.count()
    for (let i = 0; i < count; i++) {
      const item = locator.nth(i)
      if (!(await item.isVisible())) continue
      const box = await item.boundingBox()
      if (box && box.width > 0 && box.height > 0) boxes.push({ ...box, y: box.y + scrollY })
    }
  }
  return boxes
}

function union(boxes) {
  const left = Math.min(...boxes.map(b => b.x))
  const top = Math.min(...boxes.map(b => b.y))
  const right = Math.max(...boxes.map(b => b.x + b.width))
  const bottom = Math.max(...boxes.map(b => b.y + b.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** Joins boxes that sit side by side on one row (a button group); keeps the rest apart. */
function mergeTouching(boxes) {
  const rows = []
  for (const box of [...boxes].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.find(r => Math.abs(r.y - box.y) < 8 && box.x - (r.x + r.width) < 24 && box.x >= r.x)
    if (row) Object.assign(row, union([row, box]))
    else rows.push({ ...box })
  }
  return rows
}

async function locate(page, spots, variant) {
  const found = {}
  for (const [id, make] of Object.entries(spots)) {
    const boxes = await boxesOf(page, make(page))
    if (boxes.length === 0) {
      if (variant === 'mobile' && DESKTOP_ONLY.has(id)) continue
      throw new Error(`${variant}: hotspot "${id}" was not found on the playback screen`)
    }
    // Separate boxes, not their union: two checkboxes that wrap onto two rows
    // would otherwise enclose the control between them.
    found[id] = mergeTouching(boxes)
  }
  return found
}

const round = value => Math.round(value * 100) / 100

async function save(page, name, clip, spots, headroom = 0) {
  const png = await page.screenshot({ clip, fullPage: true })
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const webp = await sharp(png)
    .extend({ top: headroom * SCALE, background: parseRgb(background) })
    .webp({ quality: 82 })
    .toBuffer()
  const fileName = `${name}.${createHash('sha256').update(webp).digest('hex').slice(0, 8)}.webp`
  await writeFile(path.join(imageDir, fileName), webp)
  const width = clip.width
  const height = clip.height + headroom
  const hotspots = {}
  for (const [id, boxes] of Object.entries(spots)) {
    hotspots[id] = boxes.map(box => [
      round(((box.x - clip.x) / width) * 100),
      round(((box.y - clip.y + headroom) / height) * 100),
      round((box.width / width) * 100),
      round((box.height / height) * 100),
    ])
  }
  return { src: `/learn/practice/${fileName}`, width: Math.round(width), height: Math.round(height), hotspots }
}

function parseRgb(css) {
  const [r, g, b] = (css.match(/\d+(\.\d+)?/g) ?? ['255', '255', '255']).map(Number)
  return { r, g, b, alpha: 1 }
}

/** The boxes plus a margin, never reaching below `maxBottom` (the falling-note box under the setup controls). */
function clipAround(boxes, viewportWidth, { fullWidth = false, maxBottom = Infinity } = {}) {
  const all = union(boxes)
  const x = fullWidth ? 0 : Math.max(0, all.x - PAD)
  const right = fullWidth ? viewportWidth : Math.min(viewportWidth, all.x + all.width + PAD)
  const y = Math.max(0, all.y - PAD)
  const bottom = Math.min(all.y + all.height + PAD, maxBottom)
  return { x, y, width: right - x, height: bottom - y }
}

async function openPlayer(browser, viewport, touch) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: SCALE, hasTouch: touch, isMobile: touch })
  await page.addInitScript(() => {
    // Remembered player preferences would leak into the picture.
    try { localStorage.clear() } catch { /* storage disabled */ }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => { throw new Error('screen capture') }
    }
  })
  const course = path.join(root, 'public/learn/course')
  const animation = JSON.parse(await readFile(path.join(course, 'both-hands.animation.json'), 'utf8'))
  const score = JSON.parse(await readFile(path.join(course, 'both-hands.score.json'), 'utf8'))
  await page.route('**/api/auth/session', route => route.fulfill({ json: {} }))
  await page.route('**/api/sheet/900', route => route.fulfill({ json: { sheetMusic: {
    id: 900, title: '두 손 인사', composer: 'ClairKeys', isPublic: true, hasScore: true,
    provenance: 'builtin', createdAt: '2026-10-04', animationDataUrl: '/capture-animation.json',
  } } }))
  await page.route('**/api/sheet/900/score', route => route.fulfill({ json: score }))
  await page.route('**/api/sheet/900/practice', route => route.fulfill({ json: {} }))
  await page.route('**/capture-animation.json', route => route.fulfill({ json: animation }))
  await page.goto(`${base}/sheet/900`)
  await page.getByTestId('playback-play').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  return page
}

async function main() {
  if (!existsSync(imageDir)) await mkdir(imageDir, { recursive: true })
  for (const old of await readdir(imageDir)) {
    if (old.endsWith('.webp')) await rm(path.join(imageDir, old))
  }
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
  const result = { setup: {}, playing: {} }
  try {
    for (const variant of ['mobile', 'desktop']) {
      const sizes = VIEWPORTS[variant]

      const setupPage = await openPlayer(browser, sizes.setup, sizes.touch)
      const setupSpots = await locate(setupPage, SETUP_SPOTS, variant)
      const box = await setupPage.getByTestId('playback-box').boundingBox()
      const setupClip = clipAround(Object.values(setupSpots).flat(), sizes.setup.width, { maxBottom: box ? box.y - 1 : Infinity })
      result.setup[variant] = await save(setupPage, `setup-${variant}`, setupClip, setupSpots)
      await setupPage.close()

      const playPage = await openPlayer(browser, sizes.playing, sizes.touch)
      await playPage.getByTestId('playback-play').click()
      await playPage.getByTestId('compact-playback-bar').waitFor()
      // Let the first notes reach the keys, then hold the frame still.
      await playPage.waitForFunction(() => {
        const slider = document.querySelector('[aria-label="재생 위치"]')
        return Number(slider?.getAttribute('aria-valuenow') ?? 0) >= 2
      }, null, { timeout: 30_000 })
      await playPage.getByTestId('compact-playback-bar').getByRole('button', { name: '일시정지' }).click()
      await playPage.waitForTimeout(300)
      const playSpots = await locate(playPage, PLAYING_SPOTS, variant)
      const playClip = clipAround(Object.values(playSpots).flat(), sizes.playing.width, { fullWidth: true })
      result.playing[variant] = await save(playPage, `playing-${variant}`, playClip, playSpots, PLAYING_HEADROOM)
      if (sizes.playingDisplayWidth) result.playing[variant].displayWidth = sizes.playingDisplayWidth
      await playPage.close()
    }
  } finally {
    await browser.close()
  }
  await writeFile(dataFile, `${JSON.stringify(result, null, 2)}\n`)
  console.log(`wrote ${path.relative(root, dataFile)} and ${Object.keys(result).length * 2} images`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
