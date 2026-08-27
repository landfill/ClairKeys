/**
 * Measured levels of the built piano sample set, and of the synthesised voice it
 * replaced.
 *
 * These exist so the playback gain is *derived* from what the audio actually is
 * rather than picked and then tuned. Issue #60 came from a gain that was correct
 * arithmetic over the wrong reference: it aligned peaks, while what a listener
 * hears follows loudness, and it took its reference from the single loudest file
 * in the set rather than from a note anyone plays.
 *
 * ## How these were obtained
 *
 * Every file in `public/samples/piano/` was decoded to 16-bit PCM with macOS
 * `afconvert` and measured directly. The method was validated against the
 * independent `ffmpeg -af volumedetect` pass recorded in
 * `docs/recovery/validation/2026-08-27-piano-sample-gain-measurement.md`: all
 * thirty peaks and full-file RMS values agree within 0.1 dB.
 *
 * `SYNTHESISED_VOICE_RMS` is not a guess either. `pianoTimbre`'s
 * `harmonicAmplitudes` and `envelopeBreakpoints` are pure, so a voice was
 * rendered offline exactly as the scheduler builds it — sine-phase
 * `PeriodicWave` with `disableNormalization`, through the Web Audio lowpass
 * biquad at `timbreCutoffHz` with Q=1, under the attack/exponential-decay
 * envelope — and measured the same way.
 *
 * ## The measurement expires
 *
 * Every number here describes sample set `v1`. Rebuilding the set through
 * `scripts/build-piano-samples.sh` moves the manifest off `v1` and invalidates
 * all of it; `pianoSamples.test.ts` fails if the two drift apart, so this cannot
 * rot silently.
 */

import type { SampleLevel } from '@/types/fallingNotes'

/**
 * Window the loudness figures are taken over, in seconds.
 *
 * Chosen between two failure modes rather than for its own sake. Much shorter
 * (~0.25 s) measures little beyond the hammer transient, where both paths sit
 * near their peak, and so misses that the recording then decays while the
 * synthesised tone does not. Much longer (~1 s) is dominated by the synthesised
 * envelope's sustain plateau — the organ-like behaviour D-014 rejected — and
 * matching a recording to it would demand a gain no real piano needs. Half a
 * second is also about one quarter note at a moderate tempo.
 */
export const LOUDNESS_WINDOW_SEC = 0.5

/**
 * Register the playing gain is referenced to: C3 to C6.
 *
 * The set is 30 samples spanning A0 to C8, but a gain has to be right where the
 * music is. Referencing the whole set lets the rarely played extremes move the
 * answer, and referencing the set maximum — which is what shipped — pins the
 * level to A0 alone and leaves every other sample below target.
 */
export const PLAYED_BAND_LOW_MIDI = 48
export const PLAYED_BAND_HIGH_MIDI = 84

/**
 * Loudness one synthesised voice produces at velocity 1, as a linear RMS over
 * `LOUDNESS_WINDOW_SEC`.
 *
 * Energy mean across the same thirty notes, so the two paths are compared over
 * identical pitches. This is the reference because it is the level the user
 * accepted: PR #32 raised `DEFAULT_MASTER_GAIN` from 0.1 to 0.22 by ear against
 * this exact tone, and no complaint about loudness followed until recordings
 * replaced it.
 */
export const SYNTHESISED_VOICE_RMS = 0.07543

/**
 * Crest factor (peak minus RMS) of each path, in dB, over the same window.
 *
 * This pair is the whole of issue #60's first cause. A recorded piano is a short
 * hammer transient over a long decay; the sustained waveform it replaced is not.
 * Matching the two on peak therefore lands the recording about 11 dB lower in
 * the quantity the ear actually tracks. Kept here because the numbers are the
 * argument — without them "recordings have a higher crest factor" is an
 * assertion about waveform shape rather than a measurement.
 */
export const SAMPLE_CREST_DB = 20.0
export const SYNTHESISED_CREST_DB = 8.8

/**
 * Measured level of every built sample, keyed by the MIDI note it records.
 *
 * The spread is large and it is not all the instrument: see D-015. A smooth
 * trend across the keyboard accounts for about 10.6 dB of it and is the piano's
 * own register balance, but individual files scatter around that trend by up to
 * 5.4 dB, and 14 of the 29 adjacent minor-third steps run the wrong way. A
 * single gain cannot correct that and does not try to — it preserves every
 * relative difference exactly and only sets where the whole set sits.
 */
export const SAMPLE_LEVELS: Readonly<Record<number, SampleLevel>> = Object.freeze({
  21: { peak: 0.4112, rms: 0.12277 },
  24: { peak: 0.3661, rms: 0.11613 },
  27: { peak: 0.3997, rms: 0.12295 },
  30: { peak: 0.372, rms: 0.13364 },
  33: { peak: 0.3444, rms: 0.10466 },
  36: { peak: 0.2558, rms: 0.09499 },
  39: { peak: 0.3468, rms: 0.11735 },
  42: { peak: 0.3195, rms: 0.1237 },
  45: { peak: 0.3277, rms: 0.09849 },
  48: { peak: 0.3474, rms: 0.1068 },
  51: { peak: 0.363, rms: 0.11563 },
  54: { peak: 0.2614, rms: 0.06198 },
  57: { peak: 0.2264, rms: 0.04593 },
  60: { peak: 0.3487, rms: 0.10854 },
  63: { peak: 0.3908, rms: 0.08299 },
  66: { peak: 0.2863, rms: 0.08869 },
  69: { peak: 0.2391, rms: 0.06619 },
  72: { peak: 0.131, rms: 0.03737 },
  75: { peak: 0.1701, rms: 0.05056 },
  78: { peak: 0.2418, rms: 0.06961 },
  81: { peak: 0.2101, rms: 0.04979 },
  84: { peak: 0.264, rms: 0.03462 },
  87: { peak: 0.2743, rms: 0.05163 },
  90: { peak: 0.1847, rms: 0.03391 },
  93: { peak: 0.1562, rms: 0.02306 },
  96: { peak: 0.1923, rms: 0.02743 },
  99: { peak: 0.1034, rms: 0.01271 },
  102: { peak: 0.1875, rms: 0.01541 },
  105: { peak: 0.1252, rms: 0.01341 },
  108: { peak: 0.1101, rms: 0.01407 },
})

/** Every sampled note that falls inside the referenced playing register. */
export function playedBandLevels(): SampleLevel[] {
  return Object.entries(SAMPLE_LEVELS)
    .filter(([midi]) => {
      const n = Number(midi)
      return n >= PLAYED_BAND_LOW_MIDI && n <= PLAYED_BAND_HIGH_MIDI
    })
    .map(([, level]) => level)
}

/**
 * Loudness of the median sample in the playing register.
 *
 * The median rather than a mean, because an energy mean is carried by the few
 * loudest files and this set has outliers in both directions — the mean says the
 * register is 3.0 dB down where the typical note in it is 3.9 dB down. What a
 * listener notices is the note in the middle, not the pooled energy.
 */
export function playedBandMedianRms(): number {
  const sorted = playedBandLevels()
    .map((level) => level.rms)
    .sort((a, b) => a - b)
  const middle = sorted.length >> 1
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

/** Loudest peak anywhere in the built set, as a linear amplitude. */
export function sampleSetPeak(): number {
  return Math.max(...Object.values(SAMPLE_LEVELS).map((level) => level.peak))
}
