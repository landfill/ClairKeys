type HistoricalDemoNote = {
  note: string
  startTime: number
  duration: number
  velocity: number
}

const NOTE_KEYS = ['duration', 'note', 'startTime', 'velocity']

/**
 * Exact note literals emitted by the pre-D-010 demo upload paths.
 *
 * These arrays are migration evidence. Changing them would make already stored
 * demo rows impossible to identify, so product code and the backfill matcher
 * deliberately share this single immutable source.
 */
export const HISTORICAL_DEMO_NOTE_SEQUENCES: readonly (readonly HistoricalDemoNote[])[] = [
  [
    { note: 'C4', startTime: 0, duration: 0.5, velocity: 0.8 },
    { note: 'D4', startTime: 0.5, duration: 0.5, velocity: 0.8 },
    { note: 'E4', startTime: 1, duration: 0.5, velocity: 0.8 },
    { note: 'F4', startTime: 1.5, duration: 0.5, velocity: 0.8 },
    { note: 'G4', startTime: 2, duration: 0.5, velocity: 0.8 },
    { note: 'A4', startTime: 2.5, duration: 0.5, velocity: 0.8 },
    { note: 'B4', startTime: 3, duration: 0.5, velocity: 0.8 },
    { note: 'C5', startTime: 3.5, duration: 1, velocity: 0.8 },
  ],
  [
    { note: 'C4', startTime: 0, duration: 0.25, velocity: 0.7 },
    { note: 'E4', startTime: 0.25, duration: 0.25, velocity: 0.7 },
    { note: 'G4', startTime: 0.5, duration: 0.25, velocity: 0.7 },
    { note: 'C5', startTime: 0.75, duration: 0.25, velocity: 0.8 },
    { note: 'G4', startTime: 1, duration: 0.25, velocity: 0.7 },
    { note: 'E4', startTime: 1.25, duration: 0.25, velocity: 0.7 },
    { note: 'C4', startTime: 1.5, duration: 0.5, velocity: 0.8 },
  ],
  [
    { note: 'G4', startTime: 0, duration: 0.5, velocity: 0.8 },
    { note: 'A4', startTime: 0.5, duration: 0.5, velocity: 0.8 },
    { note: 'B4', startTime: 1, duration: 1, velocity: 0.8 },
    { note: 'C5', startTime: 2, duration: 1, velocity: 0.9 },
  ],
]

function isExactHistoricalNote(value: unknown, expected: HistoricalDemoNote): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const record = value as Record<string, unknown>
  if (Object.keys(record).sort().join(',') !== NOTE_KEYS.join(',')) return false

  return (
    record.note === expected.note &&
    record.startTime === expected.startTime &&
    record.duration === expected.duration &&
    record.velocity === expected.velocity
  )
}

/** Returns true only for an exact pre-D-010 demo payload. */
export function isKnownDemoAnimation(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const record = value as Record<string, unknown>
  const notes = record.notes
  if (record.tempo !== 120 || record.timeSignature !== '4/4' || !Array.isArray(notes)) {
    return false
  }

  return HISTORICAL_DEMO_NOTE_SEQUENCES.some(
    (sequence) =>
      notes.length === sequence.length &&
      sequence.every((expected, index) => isExactHistoricalNote(notes[index], expected))
  )
}
