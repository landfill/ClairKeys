import type { FallingNote } from '@/types/fallingNotes'

/** One place where wait mode stops: every key struck at that moment. */
export interface WaitStep {
  /** Song seconds of the first note in the step. */
  time: number
  /** Distinct MIDI pitches, ascending. */
  pitches: number[]
}

/**
 * Notes whose onsets lie within this window of the step's first note are one
 * step. OMR onsets of a written chord agree exactly; the margin only absorbs
 * rounding and arpeggiated chords written as grace-like offsets.
 */
export const STEP_TOLERANCE_SEC = 0.03

/** Absorbs binary rounding, so a note exactly on the window's edge stays in. */
const FLOAT_SLACK = 1e-9

export function buildWaitSteps(notes: FallingNote[], tolerance = STEP_TOLERANCE_SEC): WaitStep[] {
  const sorted = [...notes].sort((a, b) => a.start - b.start)
  const steps: WaitStep[] = []
  let current: { time: number; pitches: Set<number> } | null = null
  for (const note of sorted) {
    if (!current || note.start - current.time > tolerance + FLOAT_SLACK) {
      if (current) steps.push({ time: current.time, pitches: [...current.pitches].sort((a, b) => a - b) })
      current = { time: note.start, pitches: new Set() }
    }
    current.pitches.add(note.midi)
  }
  if (current) steps.push({ time: current.time, pitches: [...current.pitches].sort((a, b) => a - b) })
  return steps
}

/** Index of the first step strictly after `playedThrough`, or -1. */
export function nextWaitStep(steps: WaitStep[], playedThrough: number): number {
  return steps.findIndex(step => step.time > playedThrough)
}

/** Pitches of a step not yet pressed. Wrong keys do not count against it. */
export function remainingPitches(expected: number[], pressed: Set<number>): number[] {
  return expected.filter(pitch => !pressed.has(pitch))
}
