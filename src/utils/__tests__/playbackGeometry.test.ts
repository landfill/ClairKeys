import {
  MAX_LOOK_AHEAD_SEC,
  MIN_KEYBOARD_HEIGHT,
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

    it('stops the falling area at the look-ahead ceiling', () => {
      expect(lookAheadOf(plan.fallingHeight)).toBeCloseTo(MAX_LOOK_AHEAD_SEC, 6)
      expect(plan.fallingHeight).toBe(350)
    })

    it('spends the spare height on the keyboard, up to a real piano proportion', () => {
      // A white key is about 23mm by 145mm; 27px wide earns about 170px tall,
      // against the 120px the keyboard has always had.
      expect(plan.keyboardHeight).toBe(170)
    })

    it('leaves the rest as margin rather than stretching either area', () => {
      expect(plan.boxHeight).toBe(350 + 170 + 2)
      expect(plan.boxHeight).toBeLessThan(680)
    })
  })

  describe('a landscape phone, where nothing is spare', () => {
    // 390px of viewport less the 64px compact bar, less the border.
    const plan = planPlaybackGeometry({ availableHeight: 276, keyWidth: 24 })

    it('changes nothing about what a phone already showed', () => {
      expect(plan.keyboardHeight).toBe(MIN_KEYBOARD_HEIGHT)
      expect(plan.fallingHeight).toBe(276 - 2 - MIN_KEYBOARD_HEIGHT)
      expect(plan.boxHeight).toBe(276)
    })

    it('never grows the keyboard by taking from the falling area', () => {
      // 24px keys would earn a 151px keyboard, which here would cost the notes
      // a fifth of their runway.
      expect(plan.keyboardHeight).toBeLessThan(24 * 6)
      expect(lookAheadOf(plan.fallingHeight)).toBeLessThan(MAX_LOOK_AHEAD_SEC)
    })
  })

  it('grows the keyboard only as far as the spare height reaches', () => {
    // 500px sits between the two: the falling area gets its full ceiling and
    // the keyboard gets what is left, short of its proportional height.
    const plan = planPlaybackGeometry({ availableHeight: 500, keyWidth: 24 })

    expect(plan.fallingHeight).toBe(350)
    expect(plan.keyboardHeight).toBe(148)
    expect(plan.boxHeight).toBe(500)
  })

  it('keeps the keyboard at its floor when the box is smaller than the keyboard', () => {
    const plan = planPlaybackGeometry({ availableHeight: 90, keyWidth: 24 })

    expect(plan.keyboardHeight).toBe(MIN_KEYBOARD_HEIGHT)
    expect(plan.fallingHeight).toBe(0)
    expect(plan.boxHeight).toBe(90)
  })

  it('reproduces the idle box exactly, so the resting view does not move', () => {
    // The idle box is a fixed 330px: 1.5s of look-ahead plus the keyboard.
    const plan = planPlaybackGeometry({ availableHeight: 330, keyWidth: 24 })

    expect(plan.keyboardHeight).toBe(MIN_KEYBOARD_HEIGHT)
    expect(plan.fallingHeight).toBe(208)
    expect(plan.boxHeight).toBe(330)
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
