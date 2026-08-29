import { isKnownDemoAnimation } from '../demoProvenance'

const scale = [
  { note: 'C4', startTime: 0, duration: 0.5, velocity: 0.8 },
  { note: 'D4', startTime: 0.5, duration: 0.5, velocity: 0.8 },
  { note: 'E4', startTime: 1, duration: 0.5, velocity: 0.8 },
  { note: 'F4', startTime: 1.5, duration: 0.5, velocity: 0.8 },
  { note: 'G4', startTime: 2, duration: 0.5, velocity: 0.8 },
  { note: 'A4', startTime: 2.5, duration: 0.5, velocity: 0.8 },
  { note: 'B4', startTime: 3, duration: 0.5, velocity: 0.8 },
  { note: 'C5', startTime: 3.5, duration: 1, velocity: 0.8 },
]

const arpeggio = [
  { note: 'C4', startTime: 0, duration: 0.25, velocity: 0.7 },
  { note: 'E4', startTime: 0.25, duration: 0.25, velocity: 0.7 },
  { note: 'G4', startTime: 0.5, duration: 0.25, velocity: 0.7 },
  { note: 'C5', startTime: 0.75, duration: 0.25, velocity: 0.8 },
  { note: 'G4', startTime: 1, duration: 0.25, velocity: 0.7 },
  { note: 'E4', startTime: 1.25, duration: 0.25, velocity: 0.7 },
  { note: 'C4', startTime: 1.5, duration: 0.5, velocity: 0.8 },
]

const simpleMelody = [
  { note: 'G4', startTime: 0, duration: 0.5, velocity: 0.8 },
  { note: 'A4', startTime: 0.5, duration: 0.5, velocity: 0.8 },
  { note: 'B4', startTime: 1, duration: 1, velocity: 0.8 },
  { note: 'C5', startTime: 2, duration: 1, velocity: 0.9 },
]

function animation(notes: unknown, overrides: Record<string, unknown> = {}) {
  return {
    tempo: 120,
    timeSignature: '4/4',
    notes,
    ...overrides,
  }
}

describe('stored demo provenance matcher', () => {
  it.each([[scale], [arpeggio], [simpleMelody]])(
    'accepts each exact historical demo sequence',
    (notes) => {
      expect(isKnownDemoAnimation(animation(notes))).toBe(true)
    }
  )

  it('rejects a score with the same pitches but a different tempo', () => {
    expect(isKnownDemoAnimation(animation(scale, { tempo: 60 }))).toBe(false)
  })

  it('rejects extra note fields because a genuine score must not be hidden on a guess', () => {
    const notes = scale.map((note, index) =>
      index === 0 ? { ...note, hand: 'right' } : note
    )

    expect(isKnownDemoAnimation(animation(notes))).toBe(false)
  })

  it('rejects malformed or merely similar payloads', () => {
    expect(isKnownDemoAnimation(null)).toBe(false)
    expect(isKnownDemoAnimation(animation(scale.slice(0, -1)))).toBe(false)
    expect(isKnownDemoAnimation(animation(scale, { timeSignature: '3/4' }))).toBe(false)
  })
})
