import fs from 'fs'
import path from 'path'
import {
  SAMPLE_MIDI_NOTES,
  SAMPLE_PEAK_GAIN,
  SAMPLE_SET_PEAK,
  nearestSampleMidi,
  playbackRateForMidi,
  sampleUrl,
  damperReleaseSec,
} from '../pianoSamples'
import { A0_MIDI, C8_MIDI } from '../pianoLayout'

describe('pianoSamples', () => {
  describe('SAMPLE_MIDI_NOTES', () => {
    it('spans the keyboard at minor-third spacing', () => {
      expect(SAMPLE_MIDI_NOTES[0]).toBe(A0_MIDI)
      expect(SAMPLE_MIDI_NOTES[SAMPLE_MIDI_NOTES.length - 1]).toBe(C8_MIDI)

      for (let i = 1; i < SAMPLE_MIDI_NOTES.length; i++) {
        expect(SAMPLE_MIDI_NOTES[i] - SAMPLE_MIDI_NOTES[i - 1]).toBe(3)
      }
    })

    it('has a built mp3 on disk for every entry', () => {
      // The mapping is only correct if the file it names exists. A sample list
      // that has drifted from the built set fails silently at runtime: the fetch
      // 404s and the note falls back to synthesis, which is exactly the tone
      // this module exists to replace.
      const dir = path.join(process.cwd(), 'public', 'samples', 'piano')

      for (const midi of SAMPLE_MIDI_NOTES) {
        expect(fs.existsSync(path.join(dir, `${midi}.mp3`))).toBe(true)
      }
    })
  })

  describe('nearestSampleMidi', () => {
    it('returns the sample itself for a sampled note', () => {
      for (const midi of SAMPLE_MIDI_NOTES) {
        expect(nearestSampleMidi(midi)).toBe(midi)
      }
    })

    it('never transposes a note by more than one semitone', () => {
      // The guarantee the minor-third spacing exists to provide. Break it and
      // resampling starts shifting formants audibly.
      for (let midi = A0_MIDI; midi <= C8_MIDI; midi++) {
        expect(Math.abs(midi - nearestSampleMidi(midi))).toBeLessThanOrEqual(1)
      }
    })

    it('clamps notes outside the sampled range to the end samples', () => {
      expect(nearestSampleMidi(A0_MIDI - 12)).toBe(A0_MIDI)
      expect(nearestSampleMidi(C8_MIDI + 12)).toBe(C8_MIDI)
    })
  })

  describe('playbackRateForMidi', () => {
    it('plays a sample at its own pitch unchanged', () => {
      expect(playbackRateForMidi(60, 60)).toBe(1)
    })

    it('doubles the rate an octave up and halves it an octave down', () => {
      expect(playbackRateForMidi(72, 60)).toBeCloseTo(2, 10)
      expect(playbackRateForMidi(48, 60)).toBeCloseTo(0.5, 10)
    })

    it('shortens a buffer by at most 5.6% across the whole keyboard', () => {
      // The build script's bass trim (6.0s) is sized against this bound. If the
      // worst-case rate grows, a long low note runs off the end of its buffer
      // and goes silent before the note is over.
      let worstRate = 1
      for (let midi = A0_MIDI; midi <= C8_MIDI; midi++) {
        const rate = playbackRateForMidi(midi, nearestSampleMidi(midi))
        worstRate = Math.max(worstRate, rate)
      }

      expect(worstRate).toBeLessThanOrEqual(Math.pow(2, 1 / 12))
      expect(6.0 / worstRate).toBeGreaterThan(5.6)
    })
  })

  describe('SAMPLE_PEAK_GAIN', () => {
    it('brings a full-velocity sample to the synthesised path peak', () => {
      // `pianoTimbre`'s PEAK_GAIN is 0.3. A voice louder than that invalidates
      // the DEFAULT_MASTER_GAIN / VOICE_LIMIT headroom analysis rather than just
      // sounding loud, so this is pinned rather than left to listening.
      expect(SAMPLE_SET_PEAK * SAMPLE_PEAK_GAIN).toBeCloseTo(0.3, 2)
    })
  })

  describe('sampleUrl', () => {
    it('names the file by MIDI number under the served sample directory', () => {
      expect(sampleUrl(60)).toBe('/samples/piano/60.mp3')
    })
  })

  describe('damperReleaseSec', () => {
    it('damps the bass more slowly than the treble', () => {
      expect(damperReleaseSec(A0_MIDI)).toBeGreaterThan(damperReleaseSec(C8_MIDI))
    })

    it('stays within a plausible damper range across the keyboard', () => {
      for (let midi = A0_MIDI; midi <= C8_MIDI; midi++) {
        const release = damperReleaseSec(midi)
        expect(release).toBeGreaterThan(0.1)
        expect(release).toBeLessThanOrEqual(0.35)
      }
    })
  })
})
