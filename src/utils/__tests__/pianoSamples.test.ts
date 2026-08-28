import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
import {
  SAMPLE_MIDI_NOTES,
  SAMPLE_PEAK_GAIN,
  SAMPLE_SET_PEAK,
  SAMPLE_SET_VERSION,
  nearestSampleMidi,
  playbackRateForMidi,
  sampleUrl,
  damperReleaseSec,
} from '../pianoSamples'
import {
  SAMPLE_CREST_DB,
  SAMPLE_LEVELS,
  SAMPLE_MIXDOWN_PEAKS,
  SYNTHESISED_MIXDOWN_PEAKS,
  loudestRealisticMixdown,
  SYNTHESISED_CREST_DB,
  SYNTHESISED_VOICE_RMS,
  playedBandMedianRms,
  sampleSetPeak,
} from '../pianoSampleLevels'
import { A0_MIDI, C8_MIDI } from '../pianoLayout'
import { DEFAULT_MASTER_GAIN, MAX_MASTER_GAIN } from '@/hooks/useFallingNotesAudio'

function writeExecutable(file: string, contents: string) {
  fs.writeFileSync(file, contents)
  fs.chmodSync(file, 0o755)
}

function makeBuildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clairkeys-piano-build-'))
  const scriptDir = path.join(root, 'scripts')
  const outputDir = path.join(root, 'public', 'samples', 'piano')
  const manifestDir = path.join(root, 'src', 'utils')
  const binDir = path.join(root, 'test-bin')
  const counterFile = path.join(root, 'ffmpeg-count')

  for (const dir of [scriptDir, outputDir, manifestDir, binDir]) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.copyFileSync(
    path.join(process.cwd(), 'scripts', 'build-piano-samples.sh'),
    path.join(scriptDir, 'build-piano-samples.sh')
  )
  fs.writeFileSync(path.join(outputDir, 'LICENSE.txt'), 'license')
  fs.writeFileSync(path.join(outputDir, 'old.mp3'), 'old set')
  fs.writeFileSync(
    path.join(manifestDir, 'pianoSampleManifest.json'),
    '{\n  "version": "v1"\n}\n'
  )

  writeExecutable(path.join(binDir, 'curl'), `#!/usr/bin/env bash
set -euo pipefail
while (( $# )); do
  if [[ "$1" == "-o" ]]; then
    printf 'source' > "$2"
    exit 0
  fi
  shift
done
exit 2
`)
  writeExecutable(path.join(binDir, 'ffmpeg'), `#!/usr/bin/env bash
set -euo pipefail
count=0
if [[ -f "$PIANO_TEST_COUNTER" ]]; then
  count="$(<"$PIANO_TEST_COUNTER")"
fi
count=$((count + 1))
printf '%s' "$count" > "$PIANO_TEST_COUNTER"
if [[ "\${PIANO_TEST_FAIL_AT:-0}" == "$count" ]]; then
  exit 3
fi
output="\${!#}"
printf 'new sample %s' "$count" > "$output"
`)
  writeExecutable(path.join(binDir, 'mv'), `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${PIANO_TEST_FAIL_SWAP:-0}" == "1" && "$1" == */piano.next && "$2" == */public/samples/piano ]]; then
  exit 4
fi
exec /bin/mv "$@"
`)

  return { root, outputDir, counterFile, binDir }
}

function runBuild(
  fixture: ReturnType<typeof makeBuildFixture>,
  extraEnv: Record<string, string | undefined> = {}
) {
  return spawnSync(
    'bash',
    [path.join(fixture.root, 'scripts', 'build-piano-samples.sh')],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        ...extraEnv,
        PATH: `${fixture.binDir}:${process.env.PATH ?? ''}`,
        PIANO_TEST_COUNTER: fixture.counterFile,
      },
    }
  )
}

function manifestVersion(root: string): string {
  return JSON.parse(
    fs.readFileSync(path.join(root, 'src', 'utils', 'pianoSampleManifest.json'), 'utf8')
  ).version
}

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
    // This block used to assert `SAMPLE_SET_PEAK * SAMPLE_PEAK_GAIN ≈ 0.3` —
    // that a full-velocity sample reaches the synthesised path's peak. The
    // arithmetic was right and the target was wrong, which is issue #60: peaks
    // were matched while loudness is what a listener hears, and the peak in
    // question belonged to A0, so every other sample landed under it. Pinning it
    // held the defect in place, so it is replaced rather than adjusted.

    it('brings the median note of the playing register to the loudness of the tone it replaced', () => {
      // The regression. At the shipped 0.73 this lands 3.9 dB low, which is the
      // reported symptom.
      const median = playedBandMedianRms() * SAMPLE_PEAK_GAIN

      expect(median).toBeGreaterThanOrEqual(SYNTHESISED_VOICE_RMS)
      // Bounded above as well: overshooting spends the clipping headroom the
      // gain was raised inside of, and there is no listening loop tight enough
      // to catch that before it ships.
      expect(median).toBeLessThanOrEqual(SYNTHESISED_VOICE_RMS * 1.2)
    })

    it('does not correct the file-to-file scatter, which issue #61 still owns', () => {
      // Ground truth for a defect this change deliberately leaves in place. C5
      // is recorded well below both of its neighbouring samples — a dip no
      // instrument produces, since a major third up should not gain 6 dB — and a
      // single scalar moves it with everything else rather than closing it.
      //
      // If a rebuilt sample set makes this pass, the premise of #61 has changed
      // and the gain must be re-derived against the new audio.
      const belowNeighbourAverage =
        SAMPLE_LEVELS[72].rms / ((SAMPLE_LEVELS[69].rms + SAMPLE_LEVELS[75].rms) / 2)

      expect(20 * Math.log10(belowNeighbourAverage)).toBeLessThan(-3)
    })

    // A linear-summation test stood here: it counted how many voices at the set's
    // loudest peak fit under full scale, and required 12 at the default. It was
    // removed rather than retuned because the model under it is the defect —
    // real voices sum to a quarter or half of the linear figure, so the count it
    // enforced kept the bus far quieter than any clipping risk justified (issue
    // #63). Clipping is now asserted against measured mixdowns in the
    // 'master gain staging' block below.

    it('cannot clip on a single note at any reachable setting', () => {
      for (const midi of SAMPLE_MIDI_NOTES) {
        const peak = SAMPLE_LEVELS[midi].peak * SAMPLE_PEAK_GAIN * MAX_MASTER_GAIN
        expect(peak).toBeLessThan(1)
      }
    })
  })

  describe('master gain staging', () => {
    // Issue #63: the user reported that playback was still too quiet with the
    // slider at its maximum and the device at full volume. Measuring real
    // mixdowns showed why — every gain here had been derived by summing voices
    // linearly, and real chords land at a quarter to a half of that, so the bus
    // was sized for a texture that does not occur.

    it('brings a dense passage to a level a listener does not have to strain for', () => {
      // The regression. At the shipped 0.22 this is -14.5 dBFS, and the slider's
      // 0.35 ceiling only reached -10.5 — quiet enough that the user hit the top
      // of the control and still asked for more.
      const dBFS = 20 * Math.log10(SAMPLE_MIXDOWN_PEAKS.denseChord * DEFAULT_MASTER_GAIN)

      expect(dBFS).toBeGreaterThan(-8)
      // Bounded so the default still leaves the slider somewhere to go and does
      // not ship a piano that clips on the first fortissimo.
      expect(dBFS).toBeLessThan(-2)
    })

    it('cannot clip on any texture a pianist can actually play, on either path', () => {
      // Ten fingers, so twelve struck at once is already past what a performance
      // reaches; anything denser arrives through the pedal, whose staggered
      // onsets peak lower than a struck chord of the same size.
      for (const peaks of [SAMPLE_MIXDOWN_PEAKS, SYNTHESISED_MIXDOWN_PEAKS]) {
        expect(peaks.denseChord * MAX_MASTER_GAIN).toBeLessThan(1)
        expect(peaks.pedalled * MAX_MASTER_GAIN).toBeLessThan(1)
        expect(peaks.twelveSimultaneous * MAX_MASTER_GAIN).toBeLessThan(1)
      }
    })

    it('sizes the ceiling against the louder of the two paths', () => {
      // The master bus is shared, so the fallback constrains it too. Sizing on
      // the sample path alone would let a synthesised passage clip on a setting
      // the sample path made look safe.
      expect(loudestRealisticMixdown() * MAX_MASTER_GAIN).toBeLessThan(1)
      expect(loudestRealisticMixdown()).toBe(
        Math.max(
          SAMPLE_MIXDOWN_PEAKS.twelveSimultaneous,
          SYNTHESISED_MIXDOWN_PEAKS.twelveSimultaneous
        )
      )
    })

    it('leaves the slider real range above the default', () => {
      // A control whose top is a hair above its start is not a control. The
      // previous pair gave 4.0 dB, and the user ran out of it.
      const rangeDb = 20 * Math.log10(MAX_MASTER_GAIN / DEFAULT_MASTER_GAIN)

      expect(rangeDb).toBeGreaterThan(1.5)
      expect(MAX_MASTER_GAIN).toBeGreaterThan(DEFAULT_MASTER_GAIN)
    })

    it('keeps the two paths within a few dB of each other', () => {
      // D-015 matched the sample path's loudness to the synthesised one it
      // replaced. Raising a shared bus must not quietly undo that, and a large
      // gap would mean a fallback that jumps in level when samples fail.
      const gapDb =
        20 *
        Math.log10(SYNTHESISED_MIXDOWN_PEAKS.denseChord / SAMPLE_MIXDOWN_PEAKS.denseChord)

      expect(Math.abs(gapDb)).toBeLessThan(3)
    })
  })

  describe('measured levels', () => {
    it('describes exactly the notes the set ships', () => {
      // A rebuild that adds or drops a sample without re-measuring would leave
      // the gain derived from notes that no longer exist.
      expect(Object.keys(SAMPLE_LEVELS).map(Number).sort((a, b) => a - b)).toEqual([
        ...SAMPLE_MIDI_NOTES,
      ])
    })

    it('is pinned to the sample set it was taken from', () => {
      // Every figure in `pianoSampleLevels` describes v1. The build script moves
      // this version on, so a bumped manifest with unchanged measurements means
      // the gain is derived from audio that is no longer served.
      expect(SAMPLE_SET_VERSION).toBe('v1')
    })

    it('agrees with the set peak the headroom argument uses', () => {
      expect(SAMPLE_SET_PEAK).toBeCloseTo(sampleSetPeak(), 4)
    })

    it('records both paths differing by the crest factor that caused the defect', () => {
      // Not decoration: without this pair, "recordings peak higher for the same
      // loudness" is a claim about waveform shape rather than a measurement, and
      // it is the entire reason peak-matching produced a quiet piano.
      expect(SAMPLE_CREST_DB - SYNTHESISED_CREST_DB).toBeGreaterThan(10)
    })
  })

  describe('sampleUrl', () => {
    it('names the file by MIDI number under the served sample directory', () => {
      expect(sampleUrl(60)).toBe(`/samples/piano/60.mp3?v=${SAMPLE_SET_VERSION}`)
    })

    it('leaves the served set and version untouched when conversion fails', () => {
      const fixture = makeBuildFixture()
      try {
        const result = runBuild(fixture, { PIANO_TEST_FAIL_AT: '15' })

        expect(result.status).not.toBe(0)
        expect(fs.readdirSync(fixture.outputDir).sort()).toEqual([
          'LICENSE.txt',
          'old.mp3',
        ])
        expect(manifestVersion(fixture.root)).toBe('v1')
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true })
      }
    })

    it('restores the served set when the staged directory cannot be installed', () => {
      const fixture = makeBuildFixture()
      try {
        const result = runBuild(fixture, { PIANO_TEST_FAIL_SWAP: '1' })

        expect(result.status).not.toBe(0)
        expect(fs.readdirSync(fixture.outputDir).sort()).toEqual([
          'LICENSE.txt',
          'old.mp3',
        ])
        expect(manifestVersion(fixture.root)).toBe('v1')
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true })
      }
    })

    it('publishes a complete set before advancing the manifest version', () => {
      const fixture = makeBuildFixture()
      try {
        const result = runBuild(fixture)
        const files = fs.readdirSync(fixture.outputDir)

        expect(result.status).toBe(0)
        expect(files.filter((file) => file.endsWith('.mp3'))).toHaveLength(30)
        expect(files).toContain('LICENSE.txt')
        expect(files).not.toContain('old.mp3')
        expect(manifestVersion(fixture.root)).toBe('v2')
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true })
      }
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
