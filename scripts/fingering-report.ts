/**
 * Print what the inferrer does to a corpus score, so the numbers a regression
 * pins can be read and argued with.
 *
 *   npm run fingering:report                        # every corpus score
 *   npm run fingering:report -- love-affair-411     # one of them
 */

import fs from 'node:fs';
import path from 'node:path';
import { addFingeringToNotes, FINGERING_ALGORITHM_VERSION } from '../src/utils/fingeringUtils';
import { measureFingering } from './lib/fingeringMetrics';
import type { FallingNote } from '../src/types/fallingNotes';

const CORPUS = path.join(__dirname, '..', 'fixtures', 'fingering');
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** Scientific pitch notation, so a reader can find the note in the score. */
const noteName = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

/** Print one corpus score's metrics, with the bars behind each count. */
function report(file: string): void {
  const doc = JSON.parse(fs.readFileSync(path.join(CORPUS, file), 'utf8'));
  const notes: FallingNote[] = doc.notes.map((n: Record<string, unknown>) => ({
    midi: n.midi as number, start: n.start as number, duration: n.duration as number,
    hand: n.hand as FallingNote['hand'], finger: n.finger as FallingNote['finger'],
  }));
  const enhanced = addFingeringToNotes(notes);
  const m = measureFingering(enhanced);

  // Bars are only for reading the report; the metrics do not depend on them.
  const beats = Number(String(doc.timeSignature ?? '4/4').split('/')[0]) || 4;
  const barSeconds = (60 / (doc.timingReferenceBpm || doc.tempo || 60)) * beats;
  const bar = (start: number) => Math.floor(start / barSeconds) + 1;

  console.log(`\n=== ${file} — ${doc.notes.length} notes, key ${doc.keySignature ?? '?'}, ${doc.timeSignature ?? '?'}, ${FINGERING_ALGORITHM_VERSION} ===`);
  // The canonical document carries `finger: null` where the score had none, so
  // count what the inferrer treats as a fixed constraint rather than what is present.
  const supplied = notes.filter(n => [1, 2, 3, 4, 5].includes(n.finger as number)).length;
  console.log(`source fingerings: ${supplied} (the rest are inferred)`);

  console.log(`\nunreachable chord pairs: ${m.reachViolations.length} of ${m.chordPairs}`);
  for (const v of m.reachViolations.slice(0, 12)) {
    console.log(`  bar ${String(bar(v.start)).padStart(3)} ${v.hand}  ${noteName(v.lowMidi)}:${v.lowFinger} + ${noteName(v.highMidi)}:${v.highFinger}  ${v.semitones} semitones, pair limit ${v.limit}`);
  }

  console.log(`\nsame finger three or more times running: ${m.repetitionRuns.length}`);
  for (const r of m.repetitionRuns.slice(0, 12)) {
    console.log(`  bar ${String(bar(r.start)).padStart(3)} ${r.hand}  finger ${r.finger} x${r.length}  ${r.midis.map(noteName).join(' ')}`);
  }

  console.log(`\none finger asked to leap: ${m.sameFingerLeaps.length} of ${m.melodicTransitions} melodic steps`);
  for (const l of m.sameFingerLeaps.slice(0, 10)) {
    console.log(`  bar ${String(bar(l.start)).padStart(3)} ${l.hand}  finger ${l.finger} across ${l.semitones} semitones  ${noteName(l.fromMidi)} -> ${noteName(l.toMidi)}`);
  }

  console.log(`\nhand motion the fingering added, not the music: ${m.wastedHandTravel.length} of ${m.melodicTransitions}`);
  for (const j of [...m.wastedHandTravel].sort((a, b) => b.excess - a.excess).slice(0, 10)) {
    console.log(`  bar ${String(bar(j.start)).padStart(3)} ${j.hand}  ${noteName(j.fromMidi)}:${j.fromFinger} -> ${noteName(j.toMidi)}:${j.toFinger}  travelled ${j.travelled}, needed ${j.unavoidable}, wasted ${j.excess}`);
  }

  console.log(`\nlongest same-finger run: ${m.longestRepetitionRun}; runs spanning a pitch change: ${m.pitchChangingRepetitionRuns}`);

  // Descriptive only — see the note on the field. Printed so a change is visible,
  // not so it can be optimised.
  const rate = m.monotoneRunEvents ? (m.repositionsInMonotoneRuns.length / m.monotoneRunEvents) : 0;
  console.log(`\n[not a target] hand repositions inside steady pitch motion: ${m.repositionsInMonotoneRuns.length} over ${m.monotoneRunEvents} (${(rate * 100).toFixed(1)}%)`);
}

const only = process.argv[2];
const files = fs.readdirSync(CORPUS).filter(f => f.endsWith('.json')).sort()
  .filter(f => !only || f.includes(only));
if (files.length === 0) {
  console.error(only ? `no corpus score matches "${only}"` : 'no corpus scores found');
  process.exit(1);
}
files.forEach(report);
