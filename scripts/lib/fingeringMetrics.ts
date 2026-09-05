/**
 * Measurable properties of an inferred fingering.
 *
 * These exist so that "the left hand looks wrong" becomes a number a test can
 * hold. They deliberately do not import the cost model: a metric that is
 * defined in terms of the thing it measures cannot catch that thing being
 * wrong. What they do share with the model is the physical premise that a hand
 * has one position and five fingers at fixed offsets from it — that is anatomy,
 * not a scoring choice.
 */

import type { FallingNote, Finger, Hand } from '@/types/fallingNotes';

/**
 * Semitones from the low edge of a natural hand position to each finger, from
 * the low finger upward: the C-D-E-F-G five-finger shape. Index 0 is the
 * right-hand thumb and the left-hand little finger.
 */
const NATURAL_SPAN = [0, 2, 4, 5, 7] as const;

/**
 * Largest interval each finger pair can still take, in semitones, for an adult
 * hand. Deliberately generous — these are "no longer physically available"
 * bounds, not comfort bounds, so that anything a metric flags is indisputable
 * rather than a matter of taste or hand size. Keyed low-finger-first.
 *
 * Not sourced from Parncutt et al. (1997); that paper's tables give comfort and
 * practical ranges per pair and would be the reference to adopt properly if
 * these are ever tightened. Treat the numbers below as this repository's
 * working floor until then.
 */
const MAX_REACH: Readonly<Record<string, number>> = {
  '1-2': 10, '1-3': 12, '1-4': 14, '1-5': 15,
  '2-3': 5, '2-4': 7, '2-5': 10,
  '3-4': 4, '3-5': 7,
  '4-5': 5,
};

/** Where a finger playing a pitch puts the hand, as a MIDI number. */
export function impliedAnchor(midi: number, finger: Finger, hand: Hand): number {
  const spatial = hand === 'R' ? finger : 6 - finger;
  return midi - NATURAL_SPAN[spatial - 1];
}

/** The widest interval this finger pair can still take, or null if unknown. */
export function maxReach(a: Finger, b: Finger): number | null {
  if (a === b) return 0;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return MAX_REACH[`${lo}-${hi}`] ?? null;
}

export interface ReachViolation {
  start: number;
  hand: Hand;
  lowMidi: number;
  highMidi: number;
  lowFinger: Finger;
  highFinger: Finger;
  semitones: number;
  limit: number;
}

export interface RepetitionRun {
  hand: Hand;
  finger: Finger;
  length: number;
  start: number;
  midis: number[];
}

export interface Reposition {
  hand: Hand;
  start: number;
  fromMidi: number;
  toMidi: number;
  fromFinger: Finger;
  toFinger: Finger;
  anchorMove: number;
}

export interface FingeringMetrics {
  /** Chord notes assigned a finger pair that cannot span the interval. */
  reachViolations: ReachViolation[];
  /** Runs of three or more consecutive events on one finger. */
  repetitionRuns: RepetitionRun[];
  /** Hand relocations that happen part-way through a run of steady pitch motion. */
  repositionsInMonotoneRuns: Reposition[];
  /** Events considered when counting repositions, so the count can be read as a rate. */
  monotoneRunEvents: number;
  chordPairs: number;
}

/** Semitones the hand may drift before it has genuinely relocated. */
const REPOSITION_TOLERANCE = 2;

/** Shortest pitch run worth calling directional. */
const MIN_MONOTONE_RUN = 3;

interface Event {
  start: number;
  notes: { midi: number; finger: Finger }[];
}

function handEvents(notes: FallingNote[], hand: Hand): Event[] {
  const byStart = new Map<number, { midi: number; finger: Finger }[]>();
  for (const note of notes) {
    if (note.hand !== hand || note.finger === undefined) continue;
    const bucket = byStart.get(note.start) ?? [];
    bucket.push({ midi: note.midi, finger: note.finger });
    byStart.set(note.start, bucket);
  }
  return [...byStart.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, ns]) => ({ start, notes: ns.sort((a, b) => a.midi - b.midi) }));
}

export function measureFingering(notes: FallingNote[]): FingeringMetrics {
  const reachViolations: ReachViolation[] = [];
  const repetitionRuns: RepetitionRun[] = [];
  const repositionsInMonotoneRuns: Reposition[] = [];
  let monotoneRunEvents = 0;
  let chordPairs = 0;

  for (const hand of ['L', 'R'] as const) {
    const events = handEvents(notes, hand);

    for (const event of events) {
      for (let i = 0; i < event.notes.length - 1; i += 1) {
        const low = event.notes[i];
        const high = event.notes[i + 1];
        chordPairs += 1;
        const limit = maxReach(low.finger, high.finger);
        if (limit === null) continue;
        const semitones = high.midi - low.midi;
        if (semitones > limit) {
          reachViolations.push({
            start: event.start, hand,
            lowMidi: low.midi, highMidi: high.midi,
            lowFinger: low.finger, highFinger: high.finger,
            semitones, limit,
          });
        }
      }
    }

    // Repetition and repositioning are single-line properties; a chord moves the
    // whole hand by definition and says nothing about either.
    const line = events.filter(event => event.notes.length === 1)
      .map(event => ({ start: event.start, ...event.notes[0] }));

    let runStart = 0;
    for (let i = 1; i <= line.length; i += 1) {
      if (i < line.length && line[i].finger === line[i - 1].finger) continue;
      const length = i - runStart;
      if (length >= 3) {
        repetitionRuns.push({
          hand, finger: line[runStart].finger, length,
          start: line[runStart].start,
          midis: line.slice(runStart, i).map(n => n.midi),
        });
      }
      runStart = i;
    }

    let from = 0;
    while (from < line.length - 1) {
      const direction = Math.sign(line[from + 1].midi - line[from].midi);
      let to = from + 1;
      while (to < line.length - 1 && Math.sign(line[to + 1].midi - line[to].midi) === direction) to += 1;
      const length = to - from + 1;
      if (direction !== 0 && length >= MIN_MONOTONE_RUN) {
        monotoneRunEvents += length;
        for (let i = from + 1; i <= to; i += 1) {
          const previous = impliedAnchor(line[i - 1].midi, line[i - 1].finger, hand);
          const current = impliedAnchor(line[i].midi, line[i].finger, hand);
          const anchorMove = Math.abs(current - previous);
          if (anchorMove > REPOSITION_TOLERANCE) {
            repositionsInMonotoneRuns.push({
              hand, start: line[i].start,
              fromMidi: line[i - 1].midi, toMidi: line[i].midi,
              fromFinger: line[i - 1].finger, toFinger: line[i].finger,
              anchorMove,
            });
          }
        }
      }
      from = to;
    }
  }

  return {
    reachViolations, repetitionRuns, repositionsInMonotoneRuns,
    monotoneRunEvents, chordPairs,
  };
}
