/**
 * Piano Fingering Utilities
 * Assigns deterministic beginner hand and finger hints.
 * Explicit score fingering always wins; inferred values are not a claim of
 * pedagogically unique or optimal fingering for an arbitrary phrase.
 */

import type { FallingNote, Hand, Finger } from '@/types/fallingNotes';

export const FINGERING_ALGORITHM_VERSION = 'phrase-dp-v1';

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

  applyMajorScaleRuns(enhancedNotes, notes);

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
}

interface EventCandidate {
  fingers: Finger[];
  lowSpatial: number;
  highSpatial: number;
  centerSpatial: number;
  cost: number;
}

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
  const blackThumbs = event.indices.reduce((count, noteIndex, position) =>
    count + (isBlackKeyMidi(notes[noteIndex].midi) && fingers[position] === 1 ? 1 : 0), 0);
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
    cost: blackThumbs * 12 + Math.abs(fingerSpan - idealSpan) * 3 + shapeCost,
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
  const previousMidi = (previousEvent.lowMidi + previousEvent.highMidi) / 2;
  const midi = (event.lowMidi + event.highMidi) / 2;
  const pitchDelta = midi - previousMidi;
  const fingerDelta = candidate.centerSpatial - previous.centerSpatial;

  if (pitchDelta === 0) return Math.abs(fingerDelta) * 10;

  const distance = Math.abs(pitchDelta);
  const direction = Math.sign(pitchDelta);
  const idealSteps = distance <= 2
    ? 1
    : distance <= 5
      ? Math.min(3, Math.round(distance / 2))
      : Math.min(4, Math.round(distance / 3));
  const mismatch = Math.abs(fingerDelta - direction * idealSteps);
  const directionPenalty = fingerDelta !== 0 && Math.sign(fingerDelta) !== direction ? 10 : 0;
  // Large leaps normally move the whole hand, so exact finger-distance matching
  // matters less than keeping the direction physically coherent.
  const distanceWeight = distance > 7 ? 1 : 5;
  return mismatch * distanceWeight + directionPenalty;
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

function applyMajorScaleRuns(enhancedNotes: FallingNote[], originalNotes: FallingNote[]): void {
  const intervals = [2, 2, 1, 2, 2, 2, 1];
  // Baylor's shared pattern applies to the CAGED major keys. F major RH and
  // B major LH need different thumb crossings, so do not infer them here.
  const cagedTonics = new Set([0, 2, 4, 7, 9]);
  const rightFingers: Finger[] = [1, 2, 3, 1, 2, 3, 4, 5];
  const leftFingers: Finger[] = [5, 4, 3, 2, 1, 3, 2, 1];

  const indicesByHand: Record<Hand, number[]> = { L: [], R: [] };
  enhancedNotes.forEach((note, index) => indicesByHand[note.hand as Hand].push(index));

  (['L', 'R'] as const).forEach(hand => {
    const handIndices = indicesByHand[hand].sort((a, b) =>
      enhancedNotes[a].start - enhancedNotes[b].start || a - b
    );
    for (let start = 0; start <= handIndices.length - 8; start += 1) {
      const runIndices = handIndices.slice(start, start + 8);
      const run = runIndices.map(index => enhancedNotes[index]);
      if (!cagedTonics.has(positiveModulo(run[0].midi, 12))) continue;

      const isScale = run.every((note, index) => {
        if (index === 0) return true;
        return note.start > run[index - 1].start && note.midi - run[index - 1].midi === intervals[index - 1];
      });
      if (!isScale) continue;

      const fingers = hand === 'R' ? rightFingers : leftFingers;
      runIndices.forEach((noteIndex, index) => {
        if (!isValidFinger(originalNotes[noteIndex].finger)) {
          enhancedNotes[noteIndex].finger = fingers[index];
        }
      });
    }
  });
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
