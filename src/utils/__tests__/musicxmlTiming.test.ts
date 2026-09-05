/** @jest-environment node */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { normalizeAnimationData } from '../animationContract'

function convert(parts: string, tempo?: number) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clairkeys-timing-'))
  const input = path.join(dir, 'score.musicxml')
  fs.writeFileSync(input, `<score-partwise>${parts}</score-partwise>`)
  try {
    return JSON.parse(execFileSync(process.env.PYTHON_BIN || 'python3', [
      '-m', 'omr.cli', input, ...(tempo === undefined ? [] : ['--tempo', String(tempo)]),
    ], { cwd: path.join(process.cwd(), 'omr-service'), encoding: 'utf8', timeout: 30000 }))
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}
const note = (step: string, duration: number) => `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>${duration}</duration></note>`
const attributes = '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>'
const mark = (bpm: number) => `<direction><sound tempo="${bpm}"/></direction>`

it('applies an in-measure tempo only after its actual position', () => {
  const data = convert(`<part id="P1"><measure number="1">${attributes}${mark(60)}${note('C',4)}</measure><measure number="2">${note('D',1)}${mark(120)}${note('E',1)}</measure></part>`)
  expect(data.notes).toMatchObject([{ start: 0, duration: 4 }, { start: 4, duration: 1 }, { start: 5, duration: 0.5 }])
})

it('integrates a held note across a tempo change located with a playback offset', () => {
  const data = convert(`<part id="P1"><measure number="1">${attributes}${mark(60)}${note('C',4)}<direction><offset sound="yes">-2</offset><sound tempo="120"/></direction></measure></part>`)
  expect(data.notes[0].duration).toBe(3)
})

it('gives sound offset priority and does not let a later first mark describe the opening', () => {
  const data = convert(`<part id="P1"><measure number="1">${attributes}<direction><offset sound="yes">3</offset><sound tempo="120"><offset>1</offset></sound></direction>${note('C',2)}</measure></part>`)
  expect(data).toMatchObject({ tempo: null, tempoSource: 'unknown', timingReferenceBpm: 60, scoreTempo: null })
  expect(data.notes[0].duration).toBe(1.5)
})

it('ignores a direction offset without sound=yes for playback', () => {
  const data = convert(`<part id="P1"><measure number="1">${attributes}${mark(60)}${note('C',1)}<direction><offset>1</offset><sound tempo="120"/></direction>${note('D',1)}</measure></part>`)
  expect(data.notes).toMatchObject([{ duration: 1 }, { start: 1, duration: 0.5 }])
})

it('uses the same in-measure tempo map and measure boundary in every part', () => {
  const data = convert(`<part id="P1"><measure number="1">${attributes}${note('C',4)}</measure><measure number="2">${note('D',1)}</measure></part><part id="P2"><measure number="1">${attributes}${mark(60)}${note('E',2)}${mark(120)}</measure><measure number="2">${note('F',1)}</measure></part>`)
  expect(data.notes.find((n: { midi: number }) => n.midi === 60)).toMatchObject({ start: 0, duration: 3 })
  expect(data.notes.find((n: { midi: number }) => n.midi === 62)).toMatchObject({ start: 3, duration: 0.5 })
  expect(data.notes.find((n: { midi: number }) => n.midi === 65)).toMatchObject({ start: 3, duration: 0.5 })
})

it('keeps an explicit user override constant through all score tempo marks', () => {
  const data = convert(`<part id="P1"><measure number="1">${attributes}${mark(60)}${note('C',1)}${mark(120)}${note('D',1)}</measure></part>`, 90)
  expect(data).toMatchObject({ tempo: 90, tempoSource: 'user', scoreTempo: 60 })
  expect(data.notes[0].duration).toBeCloseTo(2/3, 6)
  expect(data.notes[1].duration).toBeCloseTo(2/3, 6)
})

it('does not truncate fractional divisions or note durations', () => {
  const data = convert(`<part id="P1"><measure number="1"><attributes><divisions>2.5</divisions></attributes>${mark(60)}${note('C',1.25)}</measure></part>`)
  expect(data.notes[0].duration).toBe(0.5)
})

it('diagnoses overfull measures without correcting their notes or rejecting pickups', () => {
  const data = convert(`<part id="P1"><measure number="0" implicit="yes">${attributes}${note('C',1)}</measure><measure number="1">${note('D',5)}</measure></part>`)
  expect(data.metadata.timingWarnings).toEqual([{ code: 'measure-overflow', part: 'P1', measure: '1', expectedQuarters: 4, actualQuarters: 5 }])
  expect(data.notes).toMatchObject([{ duration: 1 }, { start: 1, duration: 5 }])
})

it('names unsupported repeat navigation rather than silently implying an expanded performance', () => {
  const data = convert(`<part id="P1"><measure number="1">${attributes}${note('C',4)}<barline><repeat direction="backward" times="2"/></barline></measure></part>`)
  expect(data.metadata.timingWarnings).toContainEqual({ code: 'unexpanded-navigation', part: 'P1', measure: '1' })
})

it('flags the real recognized score without rewriting any of its 133 note events', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'fixtures/musicxml-timing/clair-de-lune-recognition.json'), 'utf8'))
  const archive = Buffer.from(fixture.mxlBase64, 'base64')
  expect(createHash('sha256').update(archive).digest('hex')).toBe(fixture.mxlSha256)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clairkeys-recognition-'))
  const input = path.join(dir, 'score.mxl')
  fs.writeFileSync(input, archive)
  try {
    const data = JSON.parse(execFileSync(process.env.PYTHON_BIN || 'python3', ['-m', 'omr.cli', input, '--tempo', '46'], {
      cwd: path.join(process.cwd(), 'omr-service'), encoding: 'utf8', timeout: 30000,
    }))
    expect(data.notes).toEqual(fixture.expectedNotes)
    expect(data.metadata.timingWarnings.map((warning: { measure: string }) => warning.measure)).toEqual(fixture.expectedOverfullMeasures)
    expect(normalizeAnimationData(data).metadata?.timingWarnings).toEqual(data.metadata.timingWarnings)
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

it('resolves simultaneous part tempo conflicts deterministically and lets later directions in that part win', () => {
  const data = convert(`<part id="P1"><measure>${attributes}${mark(60)}${mark(90)}${note('C',3)}</measure></part><part id="P2"><measure>${attributes}${mark(120)}${note('D',3)}</measure></part>`)
  expect(data.tempo).toBe(90)
  expect(data.notes.map((n: { duration: number }) => n.duration)).toEqual([2, 2])
})

it('does not diagnose free meter or explicitly non-controlling measures as overfull', () => {
  const data = convert(`<part id="P1"><measure non-controlling="yes">${attributes}${note('C',5)}</measure><measure><attributes><time><senza-misura/></time></attributes>${note('D',8)}</measure></part>`)
  expect(data.metadata.timingWarnings).toBeUndefined()
})

it('preserves independent bar boundaries explicitly marked non-controlling', () => {
  const data = convert(`<part id="P1"><measure>${attributes}${note('C',3)}</measure><measure>${note('D',3)}</measure></part><part id="P2"><measure non-controlling="yes">${attributes}${note('E',4)}</measure><measure non-controlling="yes">${note('F',4)}</measure></part>`)
  expect(data.notes.find((n: { midi: number }) => n.midi === 62).start).toBe(3)
  expect(data.notes.find((n: { midi: number }) => n.midi === 65).start).toBe(4)
})
