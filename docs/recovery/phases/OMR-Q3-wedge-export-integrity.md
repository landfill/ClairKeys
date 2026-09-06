# OMR-Q3 (wedge) — Stop the exporter from deleting a recognized measure

Status: `IN_PROGRESS`
Depends on: OMR-Q3 whole-note recovery (merged as `b9d3ac6`, deployed image `d7d6344b…106c8a`)
Scope note: this is the independent printed-measure-21 loss that
[OMR-Q3](OMR-Q3-whole-note-integrity.md) explicitly separated from the whole-note/cautionary chain.
Decision records: `D-053` and `D-054` in [DECISIONS.md](../DECISIONS.md).

## Progress

- **Historical — initial diagnostic checkpoint (superseded by later Progress entries), 2026-09-06:**
  Export-side cause chain independently reproduced from repository-resident graphs and
  logs, plus an upstream candidate for its origin (an eighth rest absent from the final graph).
  Baseline measured against AGY's reference: measure 21 scores 0 of 13, measure 22 scores 10 of 10.
  Diagnostic scripts prepared; the native run is blocked pending user approval of the VM scope. No
  production repair is implemented and no correction policy is approved.

## Objective

Printed measure 21 of the Love Affair solo exports as nothing at all: 0 of its 13 printed pitched
events reach MusicXML. All 13 heads exist in the pinned Audiveris 5.11.0 graph, but the measure's
voice/rhythm interpretation is incomplete, and a downstream export failure then deletes the whole
measure. Recover the printed events, without inventing notes, durations, voices or bars, and without
weakening any other measure.

## Verified cause

Reproduced from `local-test-data/results/whole-note-integrity/wrapper-final-love/`
(both the first Bravura result and the shipped Leland retry) with
`local-test-data/results/wedge-integrity/analyze_wedge_loss.py`:

0. **Historical pre-native hypothesis (superseded).** The printed eighth rest that separates the treble half chord
   from the three treble eighth chords is absent from the final graph: glyph `6164` (x 1972, y 956,
   22x47) sits in system 2's free-glyph list with no inter, while the engine's own accepted eighth
   rest on the same staff (inter `6279`, glyph `5915`, y 956, 23x47) is its geometric twin.
   Font-template scoring against the pinned engine's own Bravura/Leland faces puts glyph `6164` at
   `rest8th` 0.5118 (margin 0.157) versus 0.5175 (margin 0.144) for that accepted rest, with every
   accepted rest and a notehead control ranking correctly. As with the whole heads, absence in a
   completed graph cannot distinguish *never classified* from *classified and later removed*, so
   this was initially a hypothesis needing stage-specific evidence—not a licence to insert an
   inter. Ordered native checkpoints later proved SYMBOLS creates it and LINKS removes it; D-054
   now uses that engine-created inter under stricter source guards.
1. Whatever the reason for its absence, without a rest there `MeasureRhythm.createNewVoices` cannot
   time the following eighth chords: they
   are a rookie voice at a slot with no simultaneous chord on the other staff, and
   `mergeWithPreviousSlot` needs an `EQUAL` narrow-slot relation that does not exist. The retained
   log records exactly that: `MeasureRhythm.java:1044 | Measure{#6} No timeOffset for
   HeadChordInter#5339{... staff:3 slot#6 dur:1/8}`, then `StackRhythm.java:224 | S2 MeasureStack#6
   no correct rhythm`. The measure is marked `abnormal="true"` and voice 2 is serialized empty.
2. On reload, `Slot.afterReload` forwards a time offset only to chords a voice claims with
   status `BEGIN` (plus measure-rest chords). The three unclaimed chords therefore keep
   `AbstractChordInter.getTimeOffset() == null`; `timeOffset` is not persisted in the book.
3. Wedge `5835` (`DIMINUENDO`) is linked to two of those chords (`5339` LEFT, `5341` RIGHT), so
   `PartwiseBuilder$WedgeIterators` builds `TimedWedge` events with a null `timeOffset` and its
   comparator throws `NullPointerException` inside `Collections.sort`
   (`PartwiseBuilder.java:3722`, reached from `processMeasure` at line 2058).
4. `processMeasure`'s catch block (lines 2228-2234) removes the partially built measure from the
   output, so the exported number sequence is 1–20, 22–31 and the whole measure disappears.

The same structure exists in both retained graphs (Bravura first result and shipped Leland retry),
and sheet 1 has no null-time wedge end, so this accounts for exactly one lost measure. It is
unrelated to the whole-note/cautionary chain that `b9d3ac6` fixed; measure 31 is present in the
shipped output and must stay present.

## Historical candidate comparison, by how much music they recover

This section records the pre-implementation decision boundary. Its partial ceilings and statements
that native evidence did not yet exist are superseded by the dated Progress entries and D-054; they
remain here to show why export-only and rest-only repairs were rejected.

Export walks `measure.getVoices()` and each voice's slot entries, so chords that no voice claims are
never exported even when the measure survives. That splits the candidates cleanly:

- **Removing only the export obstacle** (null-time wedge link, or an equivalent null-safe exporter)
  recovers the voiced part only: treble voice 1 half chord and bass voice 5 — at most 7 of the 13
  printed pitched events, and far fewer exact matches: the stack's slots sit at quarter onsets
  0, 0.75, 1.25, 1.75, 2.25 where the printed bar has 0, 0.5, 1, 1.5, 2, and one bass head is read a
  diatonic step high. The predicted score is 2 exact four-field matches of 13. The three unvoiced
  treble eighth chords stay lost. This is a floor, not a completion criterion.
- **Repairing the upstream candidate** (restoring the absent eighth rest so `RHYTHMS` can time the
  treble voice) is the only candidate that could return the timed events and also remove the null
  time offsets that cause the export failure. Its ceiling is 12 of 13, not 13, because one bass head
  is independently misread. It requires stage-specific evidence for the rest, a re-run of
  `RHYTHMS`/`PAGE` on a copied graph in the shape D-049 established, and proof that no other measure
  is disturbed. None of that exists yet.

Under the obstacle-only candidate the measure also inherits the engine's rhythm defect for that
stack (`duration 17/16`, `excess 1/16`) and a bass head read a diatonic step high (graph pitch
position 5, F#2, where the printed source and the engine's own bar 19 give E2). The existing D-048
`measure-overflow` warning reports the length defect without any new metadata contract.

Giving the unvoiced chords a time offset directly, copying measure 5, or writing the measure into
the exported XML remain forbidden under D-048 and D-052.

## Work stages

1. Reproduce the cause from retained evidence and record it in the repository. (done)
2. Run the controlled diagnostics on copied graphs and report, per candidate, how many of the 13
   reference events come back and how many match on pitch, staff, onset and quarter duration
   together. No production behavior changes during this stage. (done)
3. Choose a correction policy only after those numbers exist, including whether a native engine
   correction (patched build or evidence-backed symbol recovery plus step re-run) is preferable to
   an export-only workaround. (done: D-054 selects a fail-closed native candidate, subject to its
   native acceptance evidence; export-only and rest-only partial results remain rejected)
4. Add regression coverage before any behavior change: graph fixtures reproducing the fault, guard
   tests for the accepted candidate, and runtime tests for budget, cancellation and failure fallback.
   (done for implementation scope; hosted CI remains in stage 7)
5. Implement the chosen policy for the selected recognition result, inside the existing conversion
   semaphore and the original deadline. (done; actual processor selection verified)
6. Verify against the printed reference for measure 21, not against "export produced no exception".
   Re-verify the Satie/Always/Love controls and the whole-note recovery that `b9d3ac6` delivers.
   (done for implementation: direct native candidate, actual processor selection and four
   no-region controls pass)
7. Review-ready PR, CI/review, then explicit merge and rollout approvals.

## Completion criteria

- Printed measure 21 is present in the exported MusicXML, and the recovered events are reported as a
  count of exact matches (MIDI, staff, onset and quarter duration together) against the printed
  reference, alongside the count of events still missing. A partial recovery is never recorded as
  completion of this phase.
- Every out-of-scope measure that already exported keeps identical note/rest content, voices, ties,
  slur endpoint pairing and directions. An already-exported measure may change only when it
  independently satisfies D-054's graph-and-BINARY-backed missing-ledger/false-dot signature, its
  corrected events are exact against a separately recorded printed-source reference, and no event
  remains missing or unexpected. The candidate may not drop content from any measure.
- The whole-note recovery (8 whole notes, terminal measure 31) is unchanged on the same input.
- Every residual loss and every residual pitch or rhythm error is stated in the validation record;
  no claim of a musically complete measure 21 without event-level evidence.
- Satie/Always/good-Satie controls show no note, duration, voice, tie, slur-endpoint or direction
  change; their missing measures or rhythm warnings alone must not trigger the candidate.
- Runtime stays inside the existing semaphore, deadline and cleanup rules; the source PDF is never
  tracked and analysis copies are removed after collection.

## Out of scope

Assigning voices, times or durations by hand; editing exported MusicXML directly;
padding or copying any measure (notably measure 5, whose printed content matches measure 21);
global wedge or dynamics suppression; changing DPI or page selection; the numeric tempo, right-hand
final ties and remaining recognition defects.
