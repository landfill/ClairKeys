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
const noteName = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

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

  const rate = m.monotoneRunEvents ? (m.repositionsInMonotoneRuns.length / m.monotoneRunEvents) : 0;
  console.log(`\nhand repositions inside steady pitch motion: ${m.repositionsInMonotoneRuns.length} over ${m.monotoneRunEvents} events (${(rate * 100).toFixed(1)}%)`);
  const byBar = new Map<number, number>();
  for (const r of m.repositionsInMonotoneRuns) byBar.set(bar(r.start), (byBar.get(bar(r.start)) ?? 0) + 1);
  const worst = [...byBar].sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [b, count] of worst) console.log(`  bar ${String(b).padStart(3)}: ${count}`);
}

const only = process.argv[2];
const files = fs.readdirSync(CORPUS).filter(f => f.endsWith('.json')).sort()
  .filter(f => !only || f.includes(only));
if (files.length === 0) {
  console.error(only ? `no corpus score matches "${only}"` : 'no corpus scores found');
  process.exit(1);
}
files.forEach(report);
