import { A0_MIDI, C8_MIDI } from './pianoLayout'
import sampleManifest from './pianoSampleManifest.json'
import {
  SYNTHESISED_VOICE_RMS,
  playedBandMedianRms,
  sampleSetPeak,
} from './pianoSampleLevels'

/**
 * Which recorded piano sample plays a given note, and at what rate and level.
 *
 * The playback path synthesised every note from a harmonic `PeriodicWave` (see
 * `./pianoTimbre`). That path shares one gain envelope across the whole
 * spectrum, so every partial decays at the same rate — where a real string's
 * upper partials die in a few hundred milliseconds while the fundamental rings
 * for seconds. No choice of rolloff or master gain can produce that difference,
 * which is why the synthesised tone kept reading as an electronic beep no matter
 * how it was tuned. Recorded samples carry the behaviour instead of modelling it.
 *
 * As with `./pianoTimbre` and `./audioScheduler`, the decisions live here as pure
 * functions, separate from node construction: the previous timbre defect was
 * invisible precisely because the decision was fused with `createOscillator` and
 * could not be inspected on its own.
 */

/**
 * MIDI notes that have a recorded sample, one every minor third from A0 to C8.
 *
 * Minor-third spacing means any note is at most one semitone from a sample, so
 * the largest resampling shift is ~5.9% — small enough that the formant shift
 * ("chipmunking") is inaudible. Wider spacing would halve the download at the
 * cost of an audible timbre seam between samples.
 *
 * Files are named by these numbers rather than by note name so that no
 * note-spelling table exists to disagree with the audio (Ds4 vs D#4 vs Eb4).
 */
export const SAMPLE_MIDI_NOTES: readonly number[] = Object.freeze([
  21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75,
  78, 81, 84, 87, 90, 93, 96, 99, 102, 105, 108,
])

/** Where the built sample set is served from. */
export const SAMPLE_BASE_URL = '/samples/piano'

/**
 * Cache-busting identity of the committed sample set. Both the HTTP response
 * and service worker cache are intentionally long-lived, so rebuilding audio
 * without changing this value would strand existing users on the old bytes.
 */
export const SAMPLE_SET_VERSION = sampleManifest.version

/**
 * Loudest peak in the built sample set, as a linear amplitude.
 *
 * Measured on the built files rather than the upstream ones because folding
 * stereo to mono changes the peak — upstream A0 peaks at -7.0 dBFS and the built
 * file at -7.7 dBFS, so using the upstream number would leave the level 8% off.
 *
 * This is what bounds clipping, and it is no longer what sets the playing level:
 * the maximum belongs to A0, and normalising to it was the second half of issue
 * #60. It is derived from `pianoSampleLevels` so the two cannot drift apart.
 */
export const SAMPLE_SET_PEAK = sampleSetPeak()

/**
 * Per-voice gain applied to a sample at velocity 1.
 *
 * Derived, not tuned: it is the factor that brings the median note of the
 * playing register to the loudness of the synthesised voice it replaced. Both
 * sides of that ratio are measurements (`pianoSampleLevels`), so re-measuring a
 * rebuilt sample set moves this value on its own rather than leaving a stale
 * literal behind.
 *
 * ## Why not the peak
 *
 * It was `0.3 / SAMPLE_SET_PEAK` — the factor that made a full-velocity sample
 * peak exactly where a synthesised voice peaks. That arithmetic was correct and
 * produced a piano the user reported as too quiet (issue #60), for two reasons
 * that multiply:
 *
 * 1. **Peaks are not loudness.** These recordings carry a 20 dB crest factor
 *    against the sustained waveform's 8.8 dB, so matching the peak leaves them
 *    about 11 dB down in the quantity the ear tracks. A recorded piano is a
 *    brief hammer transient over a long decay; the tone it replaced was not.
 * 2. **The reference was A0.** Normalising to the set's maximum makes that one
 *    file the only one that reaches the target. Across C3–C6 the shortfall
 *    averaged 3.9 dB, and C5 arrived at a third of the intended level.
 *
 * ## What this deliberately does not fix
 *
 * One scalar preserves every relative difference in the set, including the
 * ±5 dB of file-to-file scatter that D-015 shows is recording variance rather
 * than the instrument's register balance. Correcting that needs a per-sample
 * table and a judgement about which differences are the piano; it is issue #61,
 * not this constant.
 */
export const SAMPLE_PEAK_GAIN = SYNTHESISED_VOICE_RMS / playedBandMedianRms()

/**
 * The sample nearest to `midi`, in semitones.
 *
 * Notes outside the sampled range clamp to the end sample rather than falling
 * back to synthesis: a MIDI file can carry notes beyond an 88-key piano, and one
 * note in a different timbre is more jarring than one note transposed further
 * than usual.
 *
 * No tie is possible for an integer MIDI note: at three-semitone spacing the
 * distances to the two neighbouring samples are (0,3), (1,2) or (2,1).
 */
export function nearestSampleMidi(midi: number): number {
  const clamped = Math.min(Math.max(midi, A0_MIDI), C8_MIDI)

  let best = SAMPLE_MIDI_NOTES[0]
  let bestDistance = Math.abs(clamped - best)

  for (const candidate of SAMPLE_MIDI_NOTES) {
    const distance = Math.abs(clamped - candidate)
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }

  return best
}

/**
 * Rate at which to play `sampleMidi`'s buffer so it sounds at `midi`.
 *
 * An `AudioBufferSourceNode` has no pitch control: resampling is the only way to
 * transpose it, which also changes the buffer's duration by the same factor. A
 * semitone up plays the buffer 5.9% faster and therefore 5.6% shorter — the
 * reason the build script's bass trim is 6.0s rather than the 5.67s a longest
 * note actually needs.
 */
export function playbackRateForMidi(midi: number, sampleMidi: number): number {
  return Math.pow(2, (midi - sampleMidi) / 12)
}

/** URL of the sample for a MIDI note that appears in `SAMPLE_MIDI_NOTES`. */
export function sampleUrl(sampleMidi: number): string {
  return `${SAMPLE_BASE_URL}/${sampleMidi}.mp3?v=${SAMPLE_SET_VERSION}`
}

/**
 * How long the note takes to fall silent once its duration ends, in seconds.
 *
 * This is the damper landing on the string, not a synthesiser release. It is the
 * only envelope a sample needs: the recording already contains the strike and
 * the decay, so applying `envelopeBreakpoints`'s attack/decay/sustain on top
 * would make the note decay twice and undo what the sample was chosen for.
 *
 * Bass dampers are heavier and take visibly longer to stop a thick string, so
 * the time shortens across the keyboard rather than being one constant.
 */
export function damperReleaseSec(midi: number): number {
  const clamped = Math.min(Math.max(midi, A0_MIDI), C8_MIDI)
  const position = (clamped - A0_MIDI) / (C8_MIDI - A0_MIDI)
  return 0.35 - 0.23 * position
}
