import {
  harmonicAmplitudes,
  timbreCutoffHz,
  envelopeBreakpoints,
  MAX_PARTIAL_HZ,
  MIN_KEPT_PARTIALS,
} from '../pianoTimbre'
import { A0_MIDI, C8_MIDI, midiToFreq } from '../pianoLayout'

/**
 * Regression basis for the "low notes sound like bass noise, not piano" report.
 *
 * The playback path synthesised every note as a single `sine` oscillator behind a
 * lowpass at `frequency * 4`. A sine has exactly one partial, so the filter had
 * nothing to remove and the note carried no harmonic content at all. That is
 * inaudible as a defect in the treble — a 523 Hz sine still reads as a pitch —
 * but piano bass tone lives almost entirely in its upper partials, so A0 at
 * 27.5 Hz came out as a hum.
 *
 * These assertions are deliberately about *properties* rather than exact
 * coefficients. The point is that a spectrum exists, that it is richer in the
 * bass, and that nothing clips or aliases — not that any particular timbre is
 * the right one, which is a listening judgement no test can make.
 */

const ALL_KEYS = Array.from({ length: C8_MIDI - A0_MIDI + 1 }, (_, i) => A0_MIDI + i)

describe('harmonicAmplitudes', () => {
  it('gives every key more than one partial', () => {
    for (const midi of ALL_KEYS) {
      expect(harmonicAmplitudes(midi).length).toBeGreaterThan(1)
    }
  })

  it('gives the bass a richer spectrum than the treble', () => {
    expect(harmonicAmplitudes(A0_MIDI).length).toBeGreaterThan(
      harmonicAmplitudes(C8_MIDI).length
    )
  })

  it('never places a partial where it would alias', () => {
    for (const midi of ALL_KEYS) {
      const fundamental = midiToFreq(midi)
      const partials = harmonicAmplitudes(midi)
      const highest = fundamental * partials.length
      expect(highest).toBeLessThanOrEqual(MAX_PARTIAL_HZ)
    }
  })

  it('keeps every amplitude non-negative and the total bounded', () => {
    for (const midi of ALL_KEYS) {
      const partials = harmonicAmplitudes(midi)
      for (const amplitude of partials) {
        expect(amplitude).toBeGreaterThanOrEqual(0)
      }
      expect(partials[0]).toBeGreaterThan(0)
      const total = partials.reduce((sum, a) => sum + a, 0)
      expect(total).toBeLessThanOrEqual(1 + 1e-6)
      expect(total).toBeGreaterThan(0.5)
    }
  })

  it('weights the bass fundamental below the treble fundamental', () => {
    const share = (midi: number) => {
      const partials = harmonicAmplitudes(midi)
      return partials[0] / partials.reduce((sum, a) => sum + a, 0)
    }

    // A real piano's lowest strings put most of their energy above the
    // fundamental; that is exactly what a lone sine cannot represent.
    expect(share(A0_MIDI)).toBeLessThan(share(C8_MIDI))
  })
})

describe('timbreCutoffHz', () => {
  it('leaves the generated partials audible instead of cutting at 4x the fundamental', () => {
    for (const midi of ALL_KEYS) {
      const fundamental = midiToFreq(midi)
      // In the top octave the aliasing ceiling leaves only a handful of partials
      // in the first place, so demanding MIN_KEPT_PARTIALS there would be
      // demanding headroom above partials that do not exist. What must hold
      // everywhere is that the filter does not throw away what was generated.
      const kept = Math.min(MIN_KEPT_PARTIALS, harmonicAmplitudes(midi).length)
      expect(timbreCutoffHz(midi)).toBeGreaterThanOrEqual(fundamental * kept)

      // Where a 4th partial can exist at all, the cutoff must clear it — the old
      // `4 * f0` sat right on top of it. In the top octave `4 * f0` is already
      // past the aliasing ceiling, so there is nothing there to compare against.
      if (fundamental * 4 <= MAX_PARTIAL_HZ) {
        expect(timbreCutoffHz(midi)).toBeGreaterThan(fundamental * 4)
      }
    }
  })

  it('stays inside the audible band', () => {
    for (const midi of ALL_KEYS) {
      const cutoff = timbreCutoffHz(midi)
      expect(cutoff).toBeGreaterThan(0)
      expect(cutoff).toBeLessThanOrEqual(MAX_PARTIAL_HZ)
    }
  })

  it('does not brighten as pitch rises', () => {
    // Cutoff tracks the fundamental but is clamped, so it must never decrease
    // going up the keyboard — a treble note dimmer than a bass note would
    // invert the register balance.
    for (let i = 1; i < ALL_KEYS.length; i++) {
      expect(timbreCutoffHz(ALL_KEYS[i])).toBeGreaterThanOrEqual(
        timbreCutoffHz(ALL_KEYS[i - 1])
      )
    }
  })
})

describe('envelopeBreakpoints', () => {
  it('is silent at velocity 0', () => {
    const envelope = envelopeBreakpoints(0, 1)
    expect(envelope.peak).toBe(0)
    expect(envelope.sustain).toBe(0)
  })

  it('scales the peak with velocity', () => {
    expect(envelopeBreakpoints(1, 1).peak).toBeGreaterThan(
      envelopeBreakpoints(0.5, 1).peak
    )
  })

  it('decays after the attack rather than holding a plateau', () => {
    // A piano string is never re-energised after the hammer strike, so the
    // envelope must fall. The previous ADSR held 0.6 of peak for the whole
    // note, which is an organ, not a piano.
    const envelope = envelopeBreakpoints(1, 4)
    expect(envelope.sustain).toBeLessThan(envelope.peak)
    expect(envelope.decaySec).toBeGreaterThan(0)
  })

  it('reaches the note end before releasing, however short the note', () => {
    for (const duration of [0.05, 0.2, 1, 8]) {
      const envelope = envelopeBreakpoints(0.8, duration)
      expect(envelope.attackSec).toBeGreaterThan(0)
      expect(envelope.attackSec).toBeLessThanOrEqual(duration)
      expect(envelope.releaseSec).toBeGreaterThan(0)
    }
  })
})
