/**
 * Piano Fingering Utilities
 * Assigns deterministic beginner hand and finger hints.
 * Explicit score fingering always wins; inferred values are not a claim of
 * pedagogically unique or optimal fingering for an arbitrary phrase.
 */

import type { FallingNote, Hand, Finger } from '@/types/fallingNotes';

export const FINGERING_ALGORITHM_VERSION = 'phrase-dp-v2';

/**
 * MIDI note ranges for hand assignment
 */
const HAND_RANGES = {
  LEFT_HAND_MAX: 60, // Middle C (C4) - notes below this typically left hand
  RIGHT_HAND_MIN: 60, // Middle C (C4) - notes above this typically right hand
  CROSSOVER_ZONE_START: 57, // A3
  CROSSOVER_ZONE_END: 67, // G4
} as const;

/**
 * Assign hand based on MIDI note number and musical context
 */
export function assignHand(midi: number, context?: { prevHand?: Hand; chordNotes?: number[] }): Hand {
  // Simple range-based assignment
  if (midi < HAND_RANGES.CROSSOVER_ZONE_START) return "L";
  if (midi > HAND_RANGES.CROSSOVER_ZONE_END) return "R";
  
  // In crossover zone, consider context
  if (context?.prevHand) {
    // Prefer to maintain the same hand for smooth playing
    const distanceFromMiddleC = Math.abs(midi - 60);
    if (distanceFromMiddleC <= 3) {
      return context.prevHand;
    }
  }
  
  // Default assignment based on middle C
  return midi <= 60 ? "L" : "R";
}

/**
 * Assign finger based on hand, MIDI note, and musical context
 */
export function assignFinger(
  midi: number, 
  hand: Hand, 
  context?: { 
    prevFinger?: Finger; 
    isBlackKey?: boolean; 
    chordPosition?: number;
    scalePosition?: number;
  }
): Finger {
  const isBlackKey = context?.isBlackKey ?? isBlackKeyMidi(midi);
  
  if (hand === "L") {
    return assignLeftHandFinger(midi, isBlackKey, context);
  } else {
    return assignRightHandFinger(midi, isBlackKey, context);
  }
}

/**
 * Assign finger for left hand
 */
function assignLeftHandFinger(
  midi: number, 
  isBlackKey: boolean, 
  context?: { prevFinger?: Finger; chordPosition?: number; scalePosition?: number }
): Finger {
  // Avoid thumb (1) on black keys
  if (isBlackKey) {
    // Keep the fallback deterministic so the same score always renders the
    // same fingering. The middle fingers are the conventional black-key
    // choices for either hand.
    return [2, 3, 4][positiveModulo(midi, 3)] as Finger;
  }
  
  // Scale-based fingering
  if (context?.scalePosition !== undefined) {
    const scaleFingers = [5, 4, 3, 2, 1, 3, 2, 1]; // C major scale left hand
    return scaleFingers[context.scalePosition % scaleFingers.length] as Finger;
  }
  
  // Chord-based fingering
  if (context?.chordPosition !== undefined) {
    const chordFingers = [5, 3, 1]; // Common triad fingering
    return chordFingers[context.chordPosition % chordFingers.length] as Finger;
  }
  
  // Default pattern based on range
  if (midi < 36) return 5; // Very low notes - pinky
  if (midi < 48) return [4, 5][positiveModulo(midi, 2)] as Finger; // Low notes
  if (midi < 55) return [2, 3, 4][positiveModulo(midi, 3)] as Finger; // Mid-low
  return [1, 2, 3][positiveModulo(midi, 3)] as Finger; // Upper range
}

/**
 * Assign finger for right hand
 */
function assignRightHandFinger(
  midi: number, 
  isBlackKey: boolean, 
  context?: { prevFinger?: Finger; chordPosition?: number; scalePosition?: number }
): Finger {
  // Avoid thumb (1) on black keys
  if (isBlackKey) {
    return [2, 3, 4][positiveModulo(midi, 3)] as Finger;
  }
  
  // Scale-based fingering
  if (context?.scalePosition !== undefined) {
    const scaleFingers = [1, 2, 3, 1, 2, 3, 4, 5]; // C major scale right hand
    return scaleFingers[context.scalePosition % scaleFingers.length] as Finger;
  }
  
  // Chord-based fingering
  if (context?.chordPosition !== undefined) {
    const chordFingers = [1, 3, 5]; // Common triad fingering
    return chordFingers[context.chordPosition % chordFingers.length] as Finger;
  }
  
  // Default pattern based on range
  if (midi > 84) return 5; // Very high notes - pinky
  if (midi > 76) return [4, 5][positiveModulo(midi, 2)] as Finger; // High notes
  if (midi > 67) return [2, 3, 4][positiveModulo(midi, 3)] as Finger; // Mid-high
  return [1, 2, 3][positiveModulo(midi, 3)] as Finger; // Lower range
}

/** Modulo that remains usable for any numeric MIDI input, including negatives. */
function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/**
 * Check if a MIDI note number represents a black key
 */
export function isBlackKeyMidi(midi: number): boolean {
  const noteInOctave = midi % 12;
  return [1, 3, 6, 8, 10].includes(noteInOctave); // C#, D#, F#, G#, A#
}

/**
 * Preserve explicit assignments and fill gaps with deterministic beginner hints.
 */
export function addFingeringToNotes(notes: FallingNote[]): FallingNote[] {
  const enhancedNotes: FallingNote[] = [];
  let prevHand: Hand | undefined;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const hand = isValidHand(note.hand) ? note.hand : assignHand(note.midi, { prevHand });

    enhancedNotes.push({
      ...note,
      hand,
      finger: isValidFinger(note.finger) ? note.finger : undefined,
    });
    prevHand = hand;
  }

  inferHandPhrases(enhancedNotes, notes);

  enhancedNotes.forEach((note, index) => {
    if (isValidFinger(notes[index].finger)) {
      note.fingerSource = 'source';
      delete note.fingeringAlgorithm;
    } else {
      note.fingerSource = 'inferred';
      note.fingeringAlgorithm = FINGERING_ALGORITHM_VERSION;
    }
  });

  return enhancedNotes;
}

interface FingeringEvent {
  indices: number[];
  start: number;
  end: number;
  lowMidi: number;
  highMidi: number;
  /** Sounding pitches, ascending. A re-strike is an identical set, not an equal centre. */
  midis: number[];
}

interface EventCandidate {
  fingers: Finger[];
  lowSpatial: number;
  highSpatial: number;
  centerSpatial: number;
  /**
   * Where this fingering implies the hand is sitting, as a MIDI number.
   * A finger that plays a pitch pins the hand: comparing implied anchors across
   * events models hand travel without adding a DP state dimension, which would
   * take transitions from 25 to 10,000 per single-note event. (25 is the
   * single-note figure the issue measured; a chord event has `C(5,k)`
   * candidates, so chord-to-chord transitions already reach 100.)
   */
  anchor: number;
  cost: number;
}

/**
 * Semitones from the low edge of a natural hand position to each spatial finger
 * — the C-D-E-F-G five-finger shape. `spatialFinger` has already mirrored the
 * left hand, so one table serves both.
 */
const NATURAL_SPAN = [0, 2, 4, 5, 7] as const;

/** Semitones the hand absorbs by leaning rather than by travelling. */
const HAND_GIVE = 1;

/** Cost per semitone the hand actually travels. */
const HAND_TRAVEL = 2;

/**
 * Travelling means lifting off the key that is still sounding. A thumb crossing
 * is the one device that moves the hand without lifting, so it has to be priced
 * against this rather than forbidden.
 */
const LEGATO_BREAK = 9;

/** Below this spacing a break is audible; above it the hand has time to move. */
const LEGATO_WINDOW_SEC = 0.5;

/** Base cost of passing the thumb under the hand, or a finger over the thumb. */
const CROSSING_BASE = 6;

/**
 * Added per semitone the hand travels during a crossing. Weighted below
 * `HAND_TRAVEL` because travelling is what a crossing is for: the tuck is the
 * motion, so charging it the full lifted-hand rate would double-count it.
 */
const CROSSING_TRAVEL_WEIGHT = 0.5;

/** Crossing to or from the index finger is cramped next to 3 or 4. */
const CROSSING_INDEX_SURCHARGE = 3;

/** The thumb is the short finger: crossing it onto a black key reaches past it. */
const CROSSING_BLACK_THUMB = 8;

/** A crossing is a stepwise device. Wider than these and the hand simply leaps. */
const CROSSING_MAX_INTERVAL = 5;
const CROSSING_MAX_TRAVEL = 7;

/** Repeats closer together than this cannot be re-struck by one finger. */
const FAST_REPEAT_SEC = 0.25;

/** Holding one finger through a fast repeat. */
const REPEAT_SAME_FAST = 9;

/** Walking back out to restart a fast repeated-note group. */
const REPEAT_RESET = 4;

/**
 * Extra cost of using each finger on a fast repeat, indexed by finger - 1.
 * Repeated-note groups are played with the agile fingers; the ring and little
 * fingers neither rise nor fall quickly enough to take their turn.
 */
const FAST_REPEAT_FINGER_COST = [0, 0, 0, 3, 6] as const;

/** Changing finger on a repeat the hand had time to re-strike. */
const REPEAT_IDLE_CHANGE = 10;

/** The thumb is too short to sit comfortably on a raised key. */
const BLACK_THUMB = 12;

/** The pinky is short and weak; a black key asks it to reach and stay curled. */
const BLACK_PINKY = 5;

function inferHandPhrases(enhanced: FallingNote[], original: FallingNote[]): void {
  (['L', 'R'] as const).forEach(hand => {
    const events = buildHandEvents(enhanced, hand);
    splitPhrases(events).forEach(phrase => inferPhrase(phrase, hand, enhanced, original));
  });
}

function buildHandEvents(notes: FallingNote[], hand: Hand): FingeringEvent[] {
  const byStart = new Map<number, number[]>();
  notes.forEach((note, index) => {
    if (note.hand !== hand) return;
    const indices = byStart.get(note.start) ?? [];
    indices.push(index);
    byStart.set(note.start, indices);
  });

  return [...byStart.entries()]
    .sort(([startA], [startB]) => startA - startB)
    .map(([start, indices]) => {
      const sorted = indices.sort((a, b) => notes[a].midi - notes[b].midi || a - b);
      return {
        indices: sorted,
        start,
        end: Math.max(...sorted.map(index => start + notes[index].duration)),
        lowMidi: notes[sorted[0]].midi,
        highMidi: notes[sorted[sorted.length - 1]].midi,
        midis: sorted.map(index => notes[index].midi),
      };
    });
}

function splitPhrases(events: FingeringEvent[]): FingeringEvent[][] {
  const phrases: FingeringEvent[][] = [];
  let current: FingeringEvent[] = [];
  let phraseEnd = Number.NEGATIVE_INFINITY;

  events.forEach(event => {
    // Seconds are already baked into the canonical document. A two-second rest
    // is deliberately conservative: it resets hand position only at an audible
    // break, not between ordinary slow notes. Use the furthest sounding end in
    // the phrase: a short intervening voice must not hide a sustained note.
    if (current.length > 0 && event.start - phraseEnd >= 2) {
      phrases.push(current);
      current = [];
      phraseEnd = Number.NEGATIVE_INFINITY;
    }
    current.push(event);
    phraseEnd = Math.max(phraseEnd, event.end);
  });
  if (current.length > 0) phrases.push(current);
  return phrases;
}

function inferPhrase(
  events: FingeringEvent[],
  hand: Hand,
  enhanced: FallingNote[],
  original: FallingNote[],
): void {
  if (events.length === 0) return;
  const candidates = events.map(event => eventCandidates(event, hand, enhanced, original));
  const costs: number[][] = candidates.map(row => row.map(() => Number.POSITIVE_INFINITY));
  const previousChoice: number[][] = candidates.map(row => row.map(() => -1));
  const openingDirection = phraseDirection(events, 0);

  candidates[0].forEach((candidate, index) => {
    const idealOpening = openingDirection > 0 ? 1 : openingDirection < 0 ? 5 : 3;
    costs[0][index] = candidate.cost + Math.abs(candidate.centerSpatial - idealOpening) * 2;
  });

  for (let eventIndex = 1; eventIndex < events.length; eventIndex += 1) {
    candidates[eventIndex].forEach((candidate, candidateIndex) => {
      candidates[eventIndex - 1].forEach((previous, priorIndex) => {
        const total = costs[eventIndex - 1][priorIndex]
          + candidate.cost
          + transitionCost(events[eventIndex - 1], previous, events[eventIndex], candidate);
        if (total < costs[eventIndex][candidateIndex]) {
          costs[eventIndex][candidateIndex] = total;
          previousChoice[eventIndex][candidateIndex] = priorIndex;
        }
      });
    });
  }

  let choice = costs[costs.length - 1].reduce(
    (best, cost, index, row) => cost < row[best] ? index : best,
    0,
  );
  for (let eventIndex = events.length - 1; eventIndex >= 0; eventIndex -= 1) {
    const event = events[eventIndex];
    const candidate = candidates[eventIndex][choice];
    event.indices.forEach((noteIndex, position) => {
      if (!isValidFinger(original[noteIndex].finger)) {
        enhanced[noteIndex].finger = candidate.fingers[position];
      }
    });
    choice = previousChoice[eventIndex][choice];
  }
}

function eventCandidates(
  event: FingeringEvent,
  hand: Hand,
  notes: FallingNote[],
  original: FallingNote[],
): EventCandidate[] {
  if (event.indices.length > 1) {
    if (event.indices.length <= 5) {
      const candidates = fingerCombinations(event.indices.length)
        .map(spatial => spatial.map(value => hand === 'R' ? value as Finger : (6 - value) as Finger))
        .filter(fingers => event.indices.every((noteIndex, position) =>
          !isValidFinger(original[noteIndex].finger) || original[noteIndex].finger === fingers[position]
        ))
        .map(fingers => makeCandidate(fingers, event, hand, notes));
      // Conflicting source annotations are still source truth. They may not be
      // physically monotonic, but silently rewriting them would be worse.
      if (candidates.length > 0) return candidates;
    }

    const conventional = getChordFingers(hand, event.indices.length);
    const preserved = event.indices.map((noteIndex, position) =>
      isValidFinger(original[noteIndex].finger)
        ? original[noteIndex].finger as Finger
        : conventional[Math.min(position, conventional.length - 1)],
    );
    return [makeCandidate(preserved, event, hand, notes)];
  }

  const noteIndex = event.indices[0];
  const fixed = original[noteIndex].finger;
  const fingers: Finger[] = isValidFinger(fixed) ? [fixed] : [1, 2, 3, 4, 5];
  return fingers.map(finger => makeCandidate([finger], event, hand, notes));
}

function makeCandidate(
  fingers: Finger[],
  event: FingeringEvent,
  hand: Hand,
  notes: FallingNote[],
): EventCandidate {
  const spatial = fingers.map(finger => spatialFinger(finger, hand));
  // The old model priced only the thumb. The pinky is the other finger whose
  // length and strength argue against a raised key, and leaving it unpriced is
  // why a descending black-key line could park 5 on C#.
  const blackKeyCost = event.indices.reduce((cost, noteIndex, position) => {
    if (!isBlackKeyMidi(notes[noteIndex].midi)) return cost;
    if (fingers[position] === 1) return cost + BLACK_THUMB;
    if (fingers[position] === 5) return cost + BLACK_PINKY;
    return cost;
  }, 0);
  const anchor = event.indices.reduce((sum, noteIndex, position) =>
    sum + notes[noteIndex].midi - NATURAL_SPAN[spatial[position] - 1], 0) / event.indices.length;
  const pitchSpan = event.highMidi - event.lowMidi;
  const fingerSpan = spatial[spatial.length - 1] - spatial[0];
  const idealSpan = event.indices.length === 1
    ? 0
    : Math.min(4, Math.max(event.indices.length - 1, Math.round(pitchSpan / 2)));
  const shapeCost = event.indices.length <= 1 || pitchSpan === 0
    ? 0
    : event.indices.reduce((cost, noteIndex, position) => {
      const pitchPosition = (notes[noteIndex].midi - event.lowMidi) / pitchSpan;
      const fingerPosition = fingerSpan === 0 ? 0 : (spatial[position] - spatial[0]) / fingerSpan;
      return cost + Math.abs(pitchPosition - fingerPosition) * 4;
    }, 0);
  return {
    fingers,
    lowSpatial: spatial[0],
    highSpatial: spatial[spatial.length - 1],
    centerSpatial: spatial.reduce((sum, value) => sum + value, 0) / spatial.length,
    anchor,
    cost: blackKeyCost + Math.abs(fingerSpan - idealSpan) * 3 + shapeCost,
  };
}

function fingerCombinations(count: number): number[][] {
  const combinations: number[][] = [];
  const visit = (next: number, chosen: number[]) => {
    if (chosen.length === count) {
      combinations.push(chosen);
      return;
    }
    for (let value = next; value <= 5; value += 1) {
      visit(value + 1, [...chosen, value]);
    }
  };
  visit(1, []);
  return combinations;
}

function transitionCost(
  previousEvent: FingeringEvent,
  previous: EventCandidate,
  event: FingeringEvent,
  candidate: EventCandidate,
): number {
  const gap = Math.max(event.start - previousEvent.start, 0);

  // An identical pitch set is a re-strike, not a move. Comparing the sets rather
  // than the event centre keeps two different chords that share a centre from
  // being treated as one repeated note.
  if (samePitchSet(previousEvent, event)) return repeatCost(previous, candidate, gap);

  const travel = Math.max(0, Math.abs(candidate.anchor - previous.anchor) - HAND_GIVE);
  const sameFinger = previous.fingers.length === candidate.fingers.length
    && previous.fingers.every((finger, position) => finger === candidate.fingers[position]);

  // Re-using a finger on a different pitch needs a lift however short the move.
  // This is the line the old model was missing: a zero finger delta escaped every
  // penalty, so repeating the thumb was the cheapest way to carry on descending
  // once 5->1 had been spent.
  if (sameFinger) return travel * HAND_TRAVEL + legatoBreakCost(gap);

  if (travel === 0) return 0;

  return crossingCost(previousEvent, previous, event, candidate, travel)
    ?? travel * HAND_TRAVEL + legatoBreakCost(gap);
}

function samePitchSet(previousEvent: FingeringEvent, event: FingeringEvent): boolean {
  return previousEvent.midis.length === event.midis.length
    && previousEvent.midis.every((midi, index) => midi === event.midis[index]);
}

function legatoBreakCost(gap: number): number {
  return LEGATO_BREAK * Math.min(1, LEGATO_WINDOW_SEC / Math.max(gap, 0.01));
}

function repeatCost(previous: EventCandidate, candidate: EventCandidate, gap: number): number {
  const spatialDelta = candidate.centerSpatial - previous.centerSpatial;
  const single = previous.fingers.length === 1 && candidate.fingers.length === 1;

  // Given time, a player re-strikes with the same finger and the hand stays put.
  if (gap >= FAST_REPEAT_SEC || !single) return Math.abs(spatialDelta) * REPEAT_IDLE_CHANGE;

  // Faster than that, one finger cannot rise and fall in time; the conventional
  // answer walks inward toward the thumb (3-2-1) in either hand, which is a step
  // of -1 in finger numbers, and then resets outward.
  const agility = FAST_REPEAT_FINGER_COST[candidate.fingers[0] - 1];
  const fingerStep = candidate.fingers[0] - previous.fingers[0];
  if (fingerStep === 0) return REPEAT_SAME_FAST + agility;
  return (fingerStep === -1 ? 0 : REPEAT_RESET) + agility;
}

/**
 * Cost of a thumb crossing, or `null` when the move is not one.
 *
 * A crossing is precisely a finger move against the pitch direction, which is
 * what the old `directionPenalty` charged a flat 10 for — so the conventional
 * answer for every descending scale was also the model's most expensive one.
 */
function crossingCost(
  previousEvent: FingeringEvent,
  previous: EventCandidate,
  event: FingeringEvent,
  candidate: EventCandidate,
  travel: number,
): number | null {
  // Crossing is a single-line device; a chord repositions the whole hand.
  if (previousEvent.indices.length !== 1 || event.indices.length !== 1) return null;

  const pitchDelta = event.midis[0] - previousEvent.midis[0];
  if (Math.abs(pitchDelta) > CROSSING_MAX_INTERVAL || travel > CROSSING_MAX_TRAVEL) return null;

  const fingerDelta = candidate.centerSpatial - previous.centerSpatial;
  if (Math.sign(fingerDelta) === Math.sign(pitchDelta)) return null;

  // One end must be the thumb: it is what passes under, and what the others pass
  // over. The pinky neither crosses nor is crossed.
  const from = previous.fingers[0];
  const to = candidate.fingers[0];
  const other = from === 1 ? to : to === 1 ? from : 0;
  if (other === 0 || other === 5) return null;

  const thumbMidi = from === 1 ? previousEvent.midis[0] : event.midis[0];
  return CROSSING_BASE
    + travel * CROSSING_TRAVEL_WEIGHT
    + (other === 2 ? CROSSING_INDEX_SURCHARGE : 0)
    + (isBlackKeyMidi(thumbMidi) ? CROSSING_BLACK_THUMB : 0);
}

function phraseDirection(events: FingeringEvent[], start: number): number {
  const origin = (events[start].lowMidi + events[start].highMidi) / 2;
  for (let index = start + 1; index < events.length; index += 1) {
    const next = (events[index].lowMidi + events[index].highMidi) / 2;
    if (next !== origin) return Math.sign(next - origin);
  }
  return 0;
}

function spatialFinger(finger: Finger, hand: Hand): number {
  return hand === 'R' ? finger : 6 - finger;
}

function isValidHand(hand: FallingNote['hand']): hand is Hand {
  return hand === 'L' || hand === 'R';
}

function isValidFinger(finger: FallingNote['finger']): finger is Finger {
  return finger === 1 || finger === 2 || finger === 3 || finger === 4 || finger === 5;
}

function getChordFingers(hand: Hand, noteCount: number): Finger[] {
  const right: Finger[][] = [
    [1], [1, 5], [1, 3, 5], [1, 2, 4, 5], [1, 2, 3, 4, 5],
  ];
  const left: Finger[][] = [
    [5], [5, 1], [5, 3, 1], [5, 4, 2, 1], [5, 4, 3, 2, 1],
  ];
  const patterns = hand === 'R' ? right : left;
  return patterns[Math.min(noteCount, 5) - 1] ?? patterns[4];
}

/**
 * Generate sample data with realistic fingering for testing
 */
export function generateSampleNotesWithFingering(): FallingNote[] {
  const sampleNotes: FallingNote[] = [
    // Simple C major scale - right hand
    { midi: 60, start: 0, duration: 0.5 }, // C4
    { midi: 62, start: 0.5, duration: 0.5 }, // D4
    { midi: 64, start: 1, duration: 0.5 }, // E4
    { midi: 65, start: 1.5, duration: 0.5 }, // F4
    { midi: 67, start: 2, duration: 0.5 }, // G4
    { midi: 69, start: 2.5, duration: 0.5 }, // A4
    { midi: 71, start: 3, duration: 0.5 }, // B4
    { midi: 72, start: 3.5, duration: 0.5 }, // C5
    
    // Simple bass notes - left hand
    { midi: 48, start: 0, duration: 1 }, // C3
    { midi: 43, start: 1, duration: 1 }, // G2
    { midi: 45, start: 2, duration: 1 }, // A2
    { midi: 47, start: 3, duration: 1 }, // B2
    
    // Simple chord - both hands
    { midi: 60, start: 4, duration: 1 }, // C4 - right hand
    { midi: 64, start: 4, duration: 1 }, // E4 - right hand
    { midi: 67, start: 4, duration: 1 }, // G4 - right hand
    { midi: 36, start: 4, duration: 1 }, // C2 - left hand
  ];
  
  return addFingeringToNotes(sampleNotes);
}
