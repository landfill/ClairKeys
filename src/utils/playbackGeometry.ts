/**
 * Vertical budget for the playback view.
 *
 * Two things compete for the height between the controls and the bottom of the
 * screen: how far ahead the notes are visible, and how tall the keyboard is.
 * Letting the falling area simply take what is left made the look-ahead a
 * property of the device — roughly 1.1s on a landscape phone against 4s on a
 * desktop — which changes what a score asks of the player.
 *
 * Note speed stays fixed instead, because that is what the hands learn, and the
 * look-ahead is capped in seconds. Spare height then goes to the keyboard, up
 * to the proportion a real white key has, and anything past that is margin.
 */

export const PX_PER_SEC = 140

/** Seconds of score visible above the hit line, at most. */
export const MAX_LOOK_AHEAD_SEC = 2.5

/** The height the keyboard has always had, and its floor. */
export const MIN_KEYBOARD_HEIGHT = 120

/** A white key is about 23mm wide and 145mm long. */
export const PIANO_KEY_ASPECT = 6.3

/** The visualization box's border, which its content box does not include. */
export const BOX_BORDER = 2

export type PlaybackGeometry = {
  /** Height of the falling-note area, and the coordinate space its notes use. */
  fallingHeight: number
  /** Height of the keyboard strip below the hit line. */
  keyboardHeight: number
  /** Height of the bordered box holding both. Never exceeds what is available. */
  boxHeight: number
}

/**
 * Divide the height between the controls and the bottom of the screen.
 *
 * The falling area is served first, up to the look-ahead ceiling, so a screen
 * with no height to spare renders exactly as it did before this cap existed.
 * The keyboard then takes what the notes will not use, up to a real white key's
 * proportion, and anything past that is left for the caller to place as margin.
 *
 * @param availableHeight Content height of the wrapper the box sits in.
 * @param keyWidth White-key width the layout settled on; sets the keyboard's
 *   proportional target.
 * @returns Heights for the falling area, the keyboard, and the bordered box,
 *   where the box's content is exactly the two parts unless the space is too
 *   short for the keyboard's own floor.
 */
export function planPlaybackGeometry({
  availableHeight,
  keyWidth,
}: {
  availableHeight: number
  keyWidth: number
}): PlaybackGeometry {
  const available = Math.max(0, availableHeight)
  const maxFallingHeight = MAX_LOOK_AHEAD_SEC * PX_PER_SEC
  const content = Math.max(0, available - BOX_BORDER)

  // Only height the notes will not use may reach the keyboard. On a phone this
  // is negative, which is what keeps the keyboard at its floor there instead of
  // taking a fifth of the runway for a proportion nobody asked for.
  const spare = content - MIN_KEYBOARD_HEIGHT - maxFallingHeight
  const keyboardHeight = Math.round(
    Math.min(
      Math.max(MIN_KEYBOARD_HEIGHT, keyWidth * PIANO_KEY_ASPECT),
      MIN_KEYBOARD_HEIGHT + Math.max(0, spare)
    )
  )

  const fallingHeight = Math.max(
    0,
    Math.min(maxFallingHeight, content - keyboardHeight)
  )

  return {
    fallingHeight,
    keyboardHeight,
    // The box is a flex column, so its content has to be exactly the two parts;
    // reporting anything else is how notes end up drawn through the keys. The
    // one exception is a space too short for the keyboard's own floor, where
    // the keyboard overflows and is clipped — the behaviour that already
    // existed, kept rather than resized into something unreadable.
    boxHeight: Math.min(available, fallingHeight + keyboardHeight + BOX_BORDER),
  }
}
