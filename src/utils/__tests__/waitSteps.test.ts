import { buildWaitSteps, nextWaitStep, remainingPitches } from '../waitSteps'
import { parseNoteOn } from '../midiInput'

describe('buildWaitSteps', () => {
  it('groups notes struck together into one step, in time order', () => {
    const steps = buildWaitSteps([
      { midi: 64, start: 1, duration: 1 },
      { midi: 60, start: 0, duration: 1 },
      { midi: 67, start: 1.02, duration: 1 }, // a rolled chord still counts as one step
      { midi: 72, start: 2, duration: 1 },
      { midi: 72, start: 2, duration: 0.5 }, // the same key twice is pressed once
    ])
    expect(steps).toEqual([
      { time: 0, pitches: [60] },
      { time: 1, pitches: [64, 67] },
      { time: 2, pitches: [72] },
    ])
  })

  it('has no steps for an empty piece', () => {
    expect(buildWaitSteps([])).toEqual([])
  })
})

describe('nextWaitStep', () => {
  const steps = [{ time: 0, pitches: [60] }, { time: 1, pitches: [62] }, { time: 2, pitches: [64] }]

  it('finds the first step not yet played at or after a position', () => {
    expect(nextWaitStep(steps, -Infinity)).toBe(0)
    expect(nextWaitStep(steps, 0)).toBe(1)
    expect(nextWaitStep(steps, 1.5)).toBe(2)
    expect(nextWaitStep(steps, 2)).toBe(-1)
  })
})

describe('remainingPitches', () => {
  it('lists the keys still to press, ignoring wrong ones', () => {
    expect(remainingPitches([60, 64, 67], new Set([64, 61]))).toEqual([60, 67])
    expect(remainingPitches([60], new Set([60]))).toEqual([])
  })
})

describe('parseNoteOn', () => {
  it('reads a note-on on any channel', () => {
    expect(parseNoteOn(new Uint8Array([0x90, 60, 100]))).toBe(60)
    expect(parseNoteOn(new Uint8Array([0x9f, 21, 1]))).toBe(21)
  })

  it('treats velocity zero as a release and ignores everything else', () => {
    expect(parseNoteOn(new Uint8Array([0x90, 60, 0]))).toBeNull()
    expect(parseNoteOn(new Uint8Array([0x80, 60, 64]))).toBeNull()
    expect(parseNoteOn(new Uint8Array([0xb0, 64, 127]))).toBeNull()
    expect(parseNoteOn(new Uint8Array([0xf8]))).toBeNull()
  })
})
