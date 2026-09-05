/**
 * Measurable properties of an inferred fingering.
 *
 * These exist so that "the left hand looks wrong" becomes a number a test can
 * hold. They deliberately do not import the cost model: a metric defined in the
 * terms of the thing it measures cannot catch that thing being wrong. What both
 * read is `@/utils/handReach`, which owns neither of them — it is anatomy, and
 * sharing it keeps the two from drifting apart without making the measurement
 * circular.
 */

import type { FallingNote, Finger, Hand } from '@/types/fallingNotes';
import { impliedAnchor, maxReach, NATURAL_SPAN, isThumbCrossing } from '@/utils/handReach';

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

export interface SameFingerLeap {
  hand: Hand;
  start: number;
  fromMidi: number;
  toMidi: number;
  finger: Finger;
  semitones: number;
}

export interface HandJump {
  hand: Hand;
  start: number;
  fromMidi: number;
  toMidi: number;
  fromFinger: Finger;
  toFinger: Finger;
  /** Semitones the hand actually travelled. */
  travelled: number;
  /** Semitones it had to travel for this interval, whatever the fingering. */
  unavoidable: number;
  /** The difference: motion the fingering added rather than the music. */
  excess: number;
}

export interface FingeringMetrics {
  /** Chord notes assigned a finger pair that cannot span the interval. */
  reachViolations: ReachViolation[];
  /** Runs of three or more consecutive events on one finger. */
  repetitionRuns: RepetitionRun[];
  /** Length of the longest same-finger run, or zero when there are none. */
  longestRepetitionRun: number;
  /** Same-finger runs that span more than one pitch — a lift, not a repeated note. */
  pitchChangingRepetitionRuns: number;
  /** One finger asked to take two notes further apart than it can slide. */
  sameFingerLeaps: SameFingerLeap[];
  /**
   * Hand motion the fingering added rather than the music.
   *
   * Counting raw hand travel would flag the score's own leaps: a bass drop of
   * twenty-five semitones moves the hand about twenty however it is fingered.
   * What a fingering controls is the difference between that floor and what it
   * actually asks for — choosing thumb then little finger across a fifth makes
   * the hand travel fourteen semitones for an interval that needed none.
   */
  wastedHandTravel: HandJump[];
  /**
   * Hand relocations part-way through a run of steady pitch motion.
   *
   * **Descriptive only. Do not optimise against this.** Measured against known
   * conventional fingerings it ranks them *worse* than the defects it was meant
   * to catch: on the corpus's 26-semitone left-hand arpeggio, `5 1 2 1 2` scores
   * 2 and every conventional answer scores 3. The reason is physical — a run
   * wider than the hand must relocate, the total travel is fixed by the pitch
   * span, and this only counts how many steps it is divided into. Two attempts
   * at issue #130 stage 3 were spent minimising it before that was noticed.
   */
  repositionsInMonotoneRuns: Reposition[];
  /** Events considered when counting repositions, so the count can be read as a rate. */
  monotoneRunEvents: number;
  chordPairs: number;
  /** Consecutive single-note pairs considered, so leaps and jumps read as rates. */
  melodicTransitions: number;
}

/** Semitones the hand may drift before it has genuinely relocated. */
const REPOSITION_TOLERANCE = 2;

/**
 * Widest interval one finger can take on two consecutive notes without the hand
 * lifting off. A finger slides a little; past this the note is re-struck, which
 * breaks the line whether or not the fingering looks tidy.
 */
const SAME_FINGER_SLIDE = 4;

/**
 * Hand width in semitones. An interval no wider than this needs no hand motion
 * at all — the fingers can absorb it — so any travel across one is the
 * fingering's own doing.
 */
const HAND_WIDTH = NATURAL_SPAN[NATURAL_SPAN.length - 1];

/** Wasted travel below this is ordinary give rather than a defect. */
const WASTED_TRAVEL_TOLERANCE = 2;

/** Shortest pitch run worth calling directional. */
const MIN_MONOTONE_RUN = 3;

interface Event {
  start: number;
  notes: { midi: number; finger: Finger }[];
}

/**
 * One hand's notes as simultaneity groups in time order, with the notes of each
 * group ordered low to high. Notes with no finger are dropped: an unassigned
 * note is not evidence about the assignment.
 */
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

/**
 * Measure one already-fingered score.
 *
 * Chords are judged on reach, single-note lines on repetition and on how often
 * the hand relocates mid-run; a chord says nothing about the second pair of
 * properties because moving the whole hand is what playing one involves.
 */
export function measureFingering(notes: FallingNote[]): FingeringMetrics {
  const reachViolations: ReachViolation[] = [];
  const repetitionRuns: RepetitionRun[] = [];
  const repositionsInMonotoneRuns: Reposition[] = [];
  const sameFingerLeaps: SameFingerLeap[] = [];
  const wastedHandTravel: HandJump[] = [];
  let monotoneRunEvents = 0;
  let chordPairs = 0;
  let melodicTransitions = 0;

  for (const hand of ['L', 'R'] as const) {
    const events = handEvents(notes, hand);

    for (const event of events) {
      // Every pair, not just neighbouring notes: the reach table is not
      // subadditive, so a triad whose adjacent spans both fit can still ask the
      // outer two fingers for an interval neither can reach together.
      for (let i = 0; i < event.notes.length - 1; i += 1) {
        for (let j = i + 1; j < event.notes.length; j += 1) {
          const low = event.notes[i];
          const high = event.notes[j];
          chordPairs += 1;
          const limit = maxReach(low.finger, high.finger);
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
    }

    // Repetition and repositioning are single-line properties; a chord moves the
    // whole hand by definition and says nothing about either.
    const line = events.filter(event => event.notes.length === 1)
      .map(event => ({ start: event.start, ...event.notes[0] }));

    for (let i = 1; i < line.length; i += 1) {
      const from = line[i - 1];
      const to = line[i];
      melodicTransitions += 1;
      const semitones = Math.abs(to.midi - from.midi);

      if (from.finger === to.finger && semitones > SAME_FINGER_SLIDE) {
        sameFingerLeaps.push({
          hand, start: to.start, fromMidi: from.midi, toMidi: to.midi,
          finger: to.finger, semitones,
        });
      }

      const travelled = Math.abs(impliedAnchor(to.midi, to.finger, hand) - impliedAnchor(from.midi, from.finger, hand));
      // The fingers can absorb up to one hand width, so anything beyond that is
      // forced by the interval no matter which fingers take it.
      const unavoidable = Math.max(0, semitones - HAND_WIDTH);
      const excess = travelled - unavoidable;
      // A crossing relocates the hand without lifting it, so its anchor move is
      // the mechanism working rather than motion the fingering wasted.
      const crossing = isThumbCrossing(from.midi, from.finger, to.midi, to.finger, hand);
      if (!crossing && excess > WASTED_TRAVEL_TOLERANCE) {
        wastedHandTravel.push({
          hand, start: to.start, fromMidi: from.midi, toMidi: to.midi,
          fromFinger: from.finger, toFinger: to.finger, travelled, unavoidable, excess,
        });
      }
    }

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
    reachViolations,
    repetitionRuns,
    longestRepetitionRun: repetitionRuns.reduce((longest, run) => Math.max(longest, run.length), 0),
    pitchChangingRepetitionRuns: repetitionRuns.filter(run => new Set(run.midis).size > 1).length,
    sameFingerLeaps,
    wastedHandTravel,
    repositionsInMonotoneRuns,
    monotoneRunEvents,
    chordPairs,
    melodicTransitions,
  };
}
