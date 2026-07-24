import { A0_MIDI, C8_MIDI, midiToFreq } from './pianoLayout'

/**
 * Piano timbre: which partials a note carries, how bright it is, and how it decays.
 *
 * The playback path used to synthesise every note as one `sine` oscillator behind
 * a lowpass at `frequency * 4`. A sine has exactly one partial, so that filter
 * had nothing to remove — it was inert. In the treble the result still reads as a
 * pitch, but a piano's bass tone lives mostly in its upper partials, so A0 at
 * 27.5 Hz arrived as a hum rather than a struck string. That is the "low notes
 * sound like bass noise" report.
 *
 * The spectrum and envelope decisions live here as pure functions, separate from
 * oscillator construction, for the same reason `audioScheduler` split window
 * selection out of node creation: fused with `createOscillator` they cannot be
 * tested at all, and the original defect was invisible precisely because nothing
 * could look at it.
 *
 * These are approximations of a piano, not a model of one. Real strings are
 * inharmonic and their partials decay at different rates; neither is reproduced.
 * The goal is a tone that reads as a struck string across the whole keyboard.
 */

/**
 * Ceiling for any generated partial, in Hz.
 *
 * Sits below the Nyquist frequency of the lowest sample rate this runs at
 * (44.1 kHz → 22.05 kHz) with margin, so no partial can fold back as an alias.
 * It also bounds `timbreCutoffHz`, since a cutoff above the highest partial
 * would do nothing.
 */
export const MAX_PARTIAL_HZ = 16000

/**
 * How many partials the lowpass must leave audible.
 *
 * The old cutoff of `4 * f0` is the number this replaces: even if the source had
 * carried harmonics, four of them is not a piano. Bass notes need well over a
 * dozen partials before they stop sounding like a sine.
 */
export const MIN_KEPT_PARTIALS = 12

/** Lowest cutoff the filter may use, so no note loses its character entirely. */
const MIN_CUTOFF_HZ = 2600

/** Most partials generated for any one note, bounding per-note cost. */
const MAX_PARTIALS = 24

/**
 * Spectral rolloff exponent: amplitude of partial `n` falls as `1 / n ** rolloff`.
 *
 * The bass end uses a gentler exponent so upper partials stay strong, which is
 * what gives a low piano note its pitch definition. The treble rolls off harder,
 * both because real strings do and because a bright top octave is fatiguing.
 */
const BASS_ROLLOFF = 1.15
const TREBLE_ROLLOFF = 2.4

/**
 * How much the fundamental is held back in the lowest register.
 *
 * A grand piano's bottom strings are shorter than their pitch requires, so their
 * fundamental is weak and the ear infers the pitch from the partials. Applying
 * this to the whole keyboard would thin out the treble, so it fades out by the
 * middle register.
 */
const BASS_FUNDAMENTAL_SCALE = 0.45

/** 0 at A0, 1 at C8 — how far up the keyboard a note sits. */
function registerPosition(midi: number): number {
  const clamped = Math.min(Math.max(midi, A0_MIDI), C8_MIDI)
  return (clamped - A0_MIDI) / (C8_MIDI - A0_MIDI)
}

/**
 * Relative amplitudes of a note's harmonic partials, index 0 being the
 * fundamental.
 *
 * The count is limited by three things at once: the aliasing ceiling
 * (`MAX_PARTIAL_HZ`), a per-note cap (`MAX_PARTIALS`), and a floor of two so no
 * note ever degenerates back to a bare sine. The result is normalised to sum to
 * 1, which keeps a chord of many voices from clipping the master gain.
 */
export function harmonicAmplitudes(midi: number): number[] {
  const fundamental = midiToFreq(midi)
  const position = registerPosition(midi)

  const affordable = Math.floor(MAX_PARTIAL_HZ / fundamental)
  const count = Math.max(2, Math.min(MAX_PARTIALS, affordable))

  const rolloff = BASS_ROLLOFF + (TREBLE_ROLLOFF - BASS_ROLLOFF) * position

  const amplitudes: number[] = []
  for (let n = 1; n <= count; n++) {
    amplitudes.push(1 / Math.pow(n, rolloff))
  }

  // Weak fundamental in the bass, fading to none by the middle of the keyboard.
  const bassWeight = Math.max(0, 1 - position * 2)
  amplitudes[0] *= 1 - (1 - BASS_FUNDAMENTAL_SCALE) * bassWeight

  const total = amplitudes.reduce((sum, a) => sum + a, 0)
  return amplitudes.map((a) => a / total)
}

/**
 * Lowpass cutoff for a note, in Hz.
 *
 * Tracks the fundamental so higher notes stay proportionally bright, but is
 * floored so bass notes keep the partials that carry their pitch — the failure
 * the old `4 * f0` cutoff would have caused had there been anything to cut.
 * Clamped to `MAX_PARTIAL_HZ` because a cutoff above the highest partial is a
 * filter that does nothing, which is what this replaces.
 */
export function timbreCutoffHz(midi: number): number {
  const fundamental = midiToFreq(midi)
  const tracking = fundamental * MIN_KEPT_PARTIALS
  return Math.min(MAX_PARTIAL_HZ, Math.max(MIN_CUTOFF_HZ, tracking))
}

/** Amplitude envelope for one note, in seconds relative to its start. */
export interface NoteEnvelope {
  /** Peak amplitude reached at the end of the attack. */
  peak: number
  /** Amplitude the note has fallen to by the end of the decay. */
  sustain: number
  attackSec: number
  decaySec: number
  releaseSec: number
}

/** Loudest a single voice may be before the master gain stage. */
const PEAK_GAIN = 0.3

/** Fraction of peak a note has decayed to by the end of its decay phase. */
const SUSTAIN_RATIO = 0.18

const ATTACK_SEC = 0.004
const RELEASE_SEC = 0.35

/**
 * Envelope for a note of the given velocity and duration.
 *
 * A piano string receives energy once, from the hammer, and only loses it after
 * that. The previous envelope held 0.6 of peak for the note's whole length,
 * which is a sustained instrument — an organ, not a piano. Here the note decays
 * continuously toward `SUSTAIN_RATIO` instead.
 *
 * Longer notes decay more slowly, which is also how the instrument behaves: a
 * whole note in the bass rings far longer than a semiquaver in the treble. The
 * attack stays very short, since the hammer strike is close to instantaneous,
 * but is clamped so a very brief note cannot have an attack longer than itself.
 */
export function envelopeBreakpoints(
  velocity: number,
  durationSec: number
): NoteEnvelope {
  const safeDuration = Math.max(durationSec, 0)
  const attackSec = Math.min(ATTACK_SEC, safeDuration || ATTACK_SEC)
  const peak = Math.max(0, velocity) * PEAK_GAIN

  return {
    peak,
    sustain: peak * SUSTAIN_RATIO,
    attackSec,
    // Spend the note decaying rather than holding: the decay fills whatever is
    // left after the attack, with a floor so extremely short notes still audibly
    // fall instead of cutting off square.
    decaySec: Math.max(0.08, safeDuration - attackSec),
    releaseSec: RELEASE_SEC,
  }
}
