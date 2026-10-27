import { existsSync } from 'node:fs'
import path from 'node:path'
import { PLAYBACK_SCREENS, spotAnchor, type ScreenVariant } from '../practiceScreens'
import screenshots from '../practiceScreenshots.json'

/** 그림이 가장 좁게 그려지는 폭(CSS px). 휴대폰 그림은 320px 화면, 데스크톱 그림은 본문 768px(여백 26px 제외). */
const NARROWEST: Record<ScreenVariant, number> = { mobile: 320 - 32 - 26, desktop: 768 - 26 }
const BADGE = 28
/** 넓은 화면에서 마우스로 볼 때만 재생기가 그리는 조작. */
const DESKTOP_ONLY = new Set(['scoreToggle'])
const SECTION_IDS = ['screen-tour', 'slow-start', 'one-hand', 'ab-loop', 'wait-mode', 'metronome', 'keyboard-shortcuts']

describe('playback screen tour data', () => {
  it('names every captured control and captures every named control', () => {
    for (const screen of PLAYBACK_SCREENS) {
      const named = screen.spots.map(spot => spot.id)
      expect(new Set(named).size).toBe(named.length)
      expect(Object.keys(screenshots)).toContain(screen.id)
      for (const variant of ['mobile', 'desktop'] as const) {
        const captured = Object.keys(screen.shots[variant].hotspots)
        const expected = variant === 'mobile' ? named.filter(id => !DESKTOP_ONLY.has(id)) : named
        expect([...captured].sort()).toEqual([...expected].sort())
      }
    }
  })

  it('points at images that exist and boxes that sit inside them', () => {
    for (const screen of PLAYBACK_SCREENS) {
      for (const shot of Object.values(screen.shots)) {
        expect(shot.src).toMatch(/^\/learn\/practice\/[a-z-]+\.[0-9a-f]{8}\.webp$/)
        expect(existsSync(path.join(process.cwd(), 'public', shot.src))).toBe(true)
        expect(shot.width).toBeGreaterThan(0)
        expect(shot.height).toBeGreaterThan(0)
        for (const rects of Object.values(shot.hotspots)) {
          expect(rects.length).toBeGreaterThan(0)
          for (const rect of rects) {
            expect(rect).toHaveLength(4)
            const [left, top, width, height] = rect
            expect(left).toBeGreaterThanOrEqual(0)
            expect(top).toBeGreaterThanOrEqual(0)
            expect(width).toBeGreaterThan(0)
            expect(height).toBeGreaterThan(0)
            expect(left + width).toBeLessThanOrEqual(100.01)
            expect(top + height).toBeLessThanOrEqual(100.01)
          }
        }
      }
    }
  })

  it('keeps every number badge clear of the others at the narrowest drawing', () => {
    for (const screen of PLAYBACK_SCREENS) {
      for (const variant of ['mobile', 'desktop'] as const) {
        const shot = screen.shots[variant]
        // 옆으로 미는 그림은 본문 폭과 상관없이 displayWidth로 그린다.
        const scale = (shot.displayWidth ?? NARROWEST[variant]) / shot.width
        const points = screen.spots
          .filter(spot => shot.hotspots[spot.id])
          .map(spot => {
            const { left, top, above } = spotAnchor(spot, shot.hotspots[spot.id], variant)
            // above 번호표는 윗변에서 4px 띄워 통째로 위에 놓인다. 가운데는 윗변보다 14 + 4px 위다.
            const lift = above ? BADGE / 2 + 4 : 0
            const y = (top / 100) * shot.height * scale - lift
            // 그림 위쪽 밖으로 나가면 잘리지는 않지만(여백 12px) 그 이상은 그림 틀을 넘는다.
            expect(y).toBeGreaterThanOrEqual(BADGE / 2 - 12)
            return { id: spot.id, x: (left / 100) * shot.width * scale, y }
          })
        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)
            if (distance < BADGE) throw new Error(`${screen.id}/${variant}: ${points[i].id} and ${points[j].id} badges overlap (${distance.toFixed(1)}px)`)
          }
        }
      }
    }
  })

  it('links only to sections of the practice lesson or to another lesson', () => {
    for (const screen of PLAYBACK_SCREENS) {
      for (const spot of screen.spots) {
        expect(spot.label.trim()).not.toBe('')
        expect(spot.description.trim()).not.toBe('')
        if (!spot.more) continue
        if (spot.more.href.startsWith('#')) expect(SECTION_IDS).toContain(spot.more.href.slice(1))
        else expect(spot.more.href).toMatch(/^\/learn\//)
      }
    }
  })

  it('anchors a badge at the start, middle, end or top of the first box', () => {
    const spot = { id: 'x', label: 'x', description: 'x', anchor: { mobile: 'end' as const, desktop: 'center' as const } }
    expect(spotAnchor(spot, [[10, 20, 40, 10]], 'mobile')).toEqual({ left: 50, top: 25, above: false })
    expect(spotAnchor(spot, [[10, 20, 40, 10]], 'desktop')).toEqual({ left: 30, top: 25, above: false })
    expect(spotAnchor({ ...spot, anchor: undefined }, [[10, 20, 40, 10], [0, 0, 5, 5]], 'mobile')).toEqual({ left: 10, top: 25, above: false })
    expect(spotAnchor({ ...spot, anchor: 'above' }, [[10, 20, 40, 10]], 'desktop')).toEqual({ left: 30, top: 20, above: true })
  })
})
