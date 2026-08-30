/** Shared A–B loop contract for both playback engines. */
export interface LoopSection {
  start: number
  end: number
}

const clamp = (time: number, duration: number) => Math.min(duration, Math.max(0, time))

/** A loop exists only after the learner has explicitly supplied distinct A and B markers. */
export function createLoopSection(start: number | null, end: number | null, duration: number): LoopSection | null {
  if (start === null || end === null || duration <= 0) return null
  const boundedStart = clamp(start, duration)
  const boundedEnd = clamp(end, duration)
  return boundedEnd > boundedStart ? { start: boundedStart, end: boundedEnd } : null
}
