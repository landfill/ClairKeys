import type { ScoreArtifact } from '@/types/scoreArtifact'
import type { TempoSource } from '@/types/animationContract'

/** One metronome click, in the animation's song seconds. */
export interface MetronomeClick {
  time: number
  /** The first beat of a bar. Only a grid that knows where bars start sets it. */
  accent: boolean
}

const EPSILON = 1e-6

function parseMeter(timeSignature: string): { numerator: number; denominator: number } | null {
  const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(timeSignature)
  if (!match) return null
  const numerator = Number(match[1])
  const denominator = Number(match[2])
  if (numerator <= 0 || denominator <= 0) return null
  return { numerator, denominator }
}

/** 6/8, 9/8 and 12/8 are felt in dotted quarters, not in eighths. */
function isCompound(meter: { numerator: number; denominator: number }): boolean {
  return meter.denominator === 8 && meter.numerator > 3 && meter.numerator % 3 === 0
}

/** Length of one felt beat, in quarter notes. */
export function beatUnitQuarters(timeSignature: string): number {
  const meter = parseMeter(timeSignature)
  if (!meter) return 1
  return isCompound(meter) ? 1.5 : 4 / meter.denominator
}

/** How many felt beats make a bar — the length of a one-bar count-in. */
export function beatsPerBar(timeSignature: string): number {
  const meter = parseMeter(timeSignature)
  if (!meter) return 4
  return isCompound(meter) ? meter.numerator / 3 : meter.numerator
}

/**
 * Beats from the score's own measure map, so a tempo change inside the piece
 * moves the clicks with the notes. Artifact seconds are converted to the
 * animation's seconds the same way `activeScoreMeasure` converts the other way.
 * A short first bar is a pickup: it is counted from the downbeat it would have
 * had, so its clicks land on the real beats and none of them is accented.
 */
export function beatsFromScoreArtifact(
  artifact: ScoreArtifact,
  animationTimingBpm: number,
  timeSignature: string
): MetronomeClick[] {
  const measures = artifact.measures
    .filter(measure => measure.partIndex === 0)
    .sort((a, b) => a.start - b.start)
  const unit = beatUnitQuarters(timeSignature)
  const toAnimation = artifact.timingReferenceBpm / animationTimingBpm
  const beats: MetronomeClick[] = []

  measures.forEach((measure, index) => {
    const length = measure.endQuarter - measure.startQuarter
    if (!(length > 0) || !(measure.end > measure.start)) return
    const next = measures[index + 1]
    const nextLength = next ? next.endQuarter - next.startQuarter : length
    const isPickup = index === 0 && next !== undefined && length + EPSILON < nextLength
    const downbeat = isPickup ? measure.endQuarter - nextLength : measure.startQuarter
    const secondsPerQuarter = (measure.end - measure.start) / length

    for (let k = 0; ; k += 1) {
      const quarter = downbeat + k * unit
      if (quarter >= measure.endQuarter - EPSILON) break
      if (quarter < measure.startQuarter - EPSILON) continue
      const seconds = measure.start + (quarter - measure.startQuarter) * secondsPerQuarter
      beats.push({ time: round(seconds * toAnimation), accent: !isPickup && k === 0 })
    }
  })

  return beats
}

/**
 * An evenly spaced grid for seconds that were baked at one tempo. Where bars
 * start is unknown (a pickup would shift them), so nothing is accented.
 */
export function constantBeats(duration: number, bpm: number, timeSignature: string): MetronomeClick[] {
  const interval = (60 / bpm) * beatUnitQuarters(timeSignature)
  if (!(interval > 0) || !(duration >= 0)) return []
  const beats: MetronomeClick[] = []
  for (let k = 0; k * interval <= duration + EPSILON; k += 1) {
    beats.push({ time: round(k * interval), accent: false })
  }
  return beats
}

/**
 * Which grid can be trusted. A score-read tempo may change bar by bar (D-013),
 * so without the measure map the only honest answer is none.
 */
export function metronomeSource(
  tempoSource: TempoSource,
  hasScoreMeasures: boolean
): 'score' | 'constant' | null {
  if (hasScoreMeasures) return 'score'
  return tempoSource === 'score' ? null : 'constant'
}

/**
 * One bar of clicks that ends exactly where playback resumes, spaced at the
 * beat length found at that point of the grid.
 */
export function countInClicks(
  grid: MetronomeClick[],
  resumeAt: number,
  beats: number,
  fallbackInterval: number
): MetronomeClick[] {
  let interval = fallbackInterval
  if (grid.length >= 2) {
    let index = grid.findIndex(beat => beat.time >= resumeAt - EPSILON)
    if (index === -1) index = grid.length - 1
    const following = grid[index + 1]
    const preceding = grid[index - 1]
    interval = following ? following.time - grid[index].time
      : preceding ? grid[index].time - preceding.time
        : fallbackInterval
  }
  if (!(interval > 0) || beats <= 0) return []
  return Array.from({ length: beats }, (_, k) => ({
    time: round(resumeAt - (beats - k) * interval),
    accent: k === 0,
  }))
}

/** Keeps float noise out of scheduled times and test expectations. */
function round(seconds: number): number {
  return Math.round(seconds * 1e6) / 1e6
}
