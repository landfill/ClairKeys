import {
  FALLING_TO_KEYBOARD_RATIO,
  MAX_LOOK_AHEAD_SEC,
  MIN_KEYBOARD_HEIGHT,
  MIN_LOOK_AHEAD_SEC,
  PIANO_KEY_ASPECT,
  PX_PER_SEC,
  planPlaybackGeometry,
} from '../playbackGeometry'

const lookAheadOf = (fallingHeight: number) => fallingHeight / PX_PER_SEC

describe('planPlaybackGeometry', () => {
  // The falling area used to be "whatever height is left", so the same score
  // showed 1.1s of warning on a phone and 4s on a desktop. Note speed is what a
  // player's hands learn, so it stays fixed and the look-ahead gets the cap.
  describe('a screen with height to spare', () => {
    // A 1470x746 desktop measured 680px of space and 27px keys.
    const plan = planPlaybackGeometry({ availableHeight: 680, keyWidth: 27 })

    it('measures the runway in keyboards, not in whatever height is left', () => {
      expect(plan.fallingHeight).toBe(Math.round(plan.keyboardHeight * FALLING_TO_KEYBOARD_RATIO))
      expect(plan.fallingHeight).toBe(196)
      expect(lookAheadOf(plan.fallingHeight)).toBeLessThan(MAX_LOOK_AHEAD_SEC)
    })

    it('spends the spare height on the keyboard, up to a real piano proportion', () => {
      // A white key is about 23mm by 145mm; 27px wide earns about 170px tall,
      // against the 120px the keyboard has always had.
      expect(plan.keyboardHeight).toBe(170)
    })

    it('leaves the rest as margin rather than stretching either area', () => {
      expect(plan.boxHeight).toBe(196 + 170 + 2)
      expect(plan.boxHeight).toBeLessThan(680)
    })
  })

  // The whole point. `100dvh` tracks the dynamic viewport, so a phone's address
  // bar retracting hands the layout another 50-60px — and while the falling
  // area was bounded only by a 2.5s ceiling it could never reach on a 390px
  // screen, every one of those pixels went to it. The picture grew while the
  // reader watched.
  describe('a phone whose address bar retracts mid-playback', () => {
    const withBar = planPlaybackGeometry({ availableHeight: 326, keyWidth: 24 })
    const barGone = planPlaybackGeometry({ availableHeight: 390, keyWidth: 24 })
    const taller = planPlaybackGeometry({ availableHeight: 430, keyWidth: 24 })

    it('stops growing once the keyboard has its proportion', () => {
      expect(barGone.fallingHeight).toBe(taller.fallingHeight)
      expect(barGone.keyboardHeight).toBe(taller.keyboardHeight)
    })

    it('hands the extra height to margin instead of to the notes', () => {
      expect(taller.boxHeight).toBe(barGone.boxHeight)
      expect(taller.boxHeight).toBeLessThan(430)
    })

    it('never shows more runway than about one keyboard', () => {
      for (const plan of [withBar, barGone, taller]) {
        expect(plan.fallingHeight).toBeLessThanOrEqual(
          Math.round(plan.keyboardHeight * FALLING_TO_KEYBOARD_RATIO)
        )
      }
    })
  })

  // On a phone the 2.5s ceiling never binds — a landscape viewport is roughly
  // 390px tall and the falling area could never reach 350px of it. So serving
  // the notes first left the phone with the original defect: the falling area
  // took everything, the keyboard stayed pinned at its 120px floor, and a real
  // device showed a runway far longer than the instrument. The keyboard is
  // served first now, and the notes keep a floor instead of a remainder.
  describe('a landscape phone, where the ceiling never binds', () => {
    // 390px of viewport less the 64px compact bar, less the border.
    const plan = planPlaybackGeometry({ availableHeight: 276, keyWidth: 24 })

    it('gives the keyboard its proportion before the notes take the rest', () => {
      expect(plan.keyboardHeight).toBeGreaterThan(MIN_KEYBOARD_HEIGHT)
      expect(plan.keyboardHeight).toBe(134)
    })

    it('still leaves the notes a full second of runway', () => {
      expect(lookAheadOf(plan.fallingHeight)).toBeCloseTo(MIN_LOOK_AHEAD_SEC, 6)
      expect(plan.fallingHeight).toBe(140)
    })

    it('fills the phone height exactly, with no margin to centre', () => {
      expect(plan.boxHeight).toBe(276)
      expect(plan.boxHeight - 2 - plan.keyboardHeight).toBe(plan.fallingHeight)
    })
  })

  it('reaches the full piano proportion once the notes have their floor', () => {
    // Enough height that neither bound binds: the keyboard gets exactly what a
    // real white key's shape asks for.
    const plan = planPlaybackGeometry({ availableHeight: 500, keyWidth: 24 })

    expect(plan.keyboardHeight).toBe(Math.round(24 * PIANO_KEY_ASPECT))
    expect(plan.fallingHeight).toBe(Math.round(plan.keyboardHeight * FALLING_TO_KEYBOARD_RATIO))
    expect(lookAheadOf(plan.fallingHeight)).toBeLessThan(MAX_LOOK_AHEAD_SEC)
  })

  it('never trades away the floor the notes are promised', () => {
    for (const availableHeight of [200, 276, 330, 400]) {
      const plan = planPlaybackGeometry({ availableHeight, keyWidth: 24 })
      const content = availableHeight - 2

      // Whenever the box can hold both, the notes keep at least their floor.
      if (content >= MIN_KEYBOARD_HEIGHT + MIN_LOOK_AHEAD_SEC * PX_PER_SEC) {
        expect(plan.fallingHeight).toBeGreaterThanOrEqual(MIN_LOOK_AHEAD_SEC * PX_PER_SEC)
      }
    }
  })

  it('holds the keyboard at its floor when the notes cannot spare the height', () => {
    // 200px cannot pay for both a proportional keyboard and a second of runway,
    // so the keyboard falls back to the height it has always had.
    const plan = planPlaybackGeometry({ availableHeight: 200, keyWidth: 24 })

    expect(plan.keyboardHeight).toBe(MIN_KEYBOARD_HEIGHT)
    expect(plan.fallingHeight).toBe(200 - 2 - MIN_KEYBOARD_HEIGHT)
  })

  it('keeps the keyboard at its floor when the box is smaller than the keyboard', () => {
    const plan = planPlaybackGeometry({ availableHeight: 90, keyWidth: 24 })

    expect(plan.keyboardHeight).toBe(MIN_KEYBOARD_HEIGHT)
    expect(plan.fallingHeight).toBe(0)
    expect(plan.boxHeight).toBe(90)
  })

  it('shapes the idle box by the same rule, so pressing play changes no proportion', () => {
    // The resting box stays 330px, but its keyboard is the same shape as the
    // playing one. An instrument that changes proportion on play reads as two
    // different instruments.
    const plan = planPlaybackGeometry({ availableHeight: 330, keyWidth: 24 })

    expect(plan.keyboardHeight).toBe(Math.round(24 * PIANO_KEY_ASPECT))
    expect(plan.fallingHeight).toBe(Math.round(plan.keyboardHeight * FALLING_TO_KEYBOARD_RATIO))
  })

  it('reports heights the CSS box can actually add up to', () => {
    // Above the keyboard's own floor plus the border, the box always gets the
    // height it asks for.
    for (const availableHeight of [276, 330, 500, 680, 1442]) {
      const plan = planPlaybackGeometry({ availableHeight, keyWidth: 27 })

      // The falling area is a flex child of the box, so whatever the box is
      // after its border must equal the two parts. A mismatch here is the class
      // of defect that once had notes falling through the keys.
      expect(plan.boxHeight - 2 - plan.keyboardHeight).toBe(plan.fallingHeight)
    }
  })

  it('never asks for more height than the space it was given', () => {
    for (const availableHeight of [0, 90, 121, 276, 680, 1442]) {
      const plan = planPlaybackGeometry({ availableHeight, keyWidth: 27 })

      expect(plan.boxHeight).toBeLessThanOrEqual(availableHeight)
    }
  })
})
