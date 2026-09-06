# Whole-note template experiments and model checkpoint

Date: 2026-09-06 KST. This is source-recognition evidence, not a deployed fix or full-score pass.

## Reproduction and results

Unchanged user Love_Affair_Piano_Solo.pdf SHA256
acdd4ee03f8da75493491f677519dbce4fecf0275b106caf268fa6899ea34253; native pinned Audiveris5.11.0
inside currently deployed143 image42482e26…d09e. No production settings/restart/storage writes.
Scripts and artifacts: Git-excluded local-test-data/results/whole-note-integrity/.
VM temporary root: /data/analysis/whole-heads-4jU02k; cleanup pending subsequent wrapper verification.

Exact diagnostic command shape, invoked by run_checkpoint.py with subprocess timeout300s:

```text
/opt/audiveris/bin/Audiveris -batch -step HEADS -save -output <fresh-output> -- <same-solo.pdf>
/opt/audiveris/bin/Audiveris -batch -step HEADS -save -output <fresh-output> -constant org.audiveris.omr.ui.symbol.MusicFont.defaultMusicFamily=Leland -- <same-solo.pdf>
/opt/audiveris/bin/Audiveris -batch -step PAGE -save -output <fresh-output> -constant org.audiveris.omr.ui.symbol.MusicFont.defaultMusicFamily=Leland -export -- <same-solo.pdf>
/opt/audiveris/bin/Audiveris -batch -step PAGE -save -output <fresh-output> -constant org.audiveris.omr.sheet.note.NoteHeadsBuilder.stemLessBoost=0.38 -export -- <same-solo.pdf>
```

| Run | Seconds | Exit | WHOLE_NOTE graph pages1/2 | Result |
| --- | ---: | ---: | --- | --- |
| Bravura HEADS |33.342|0|0/0|Loss occurs before/inside HEADS, not first at XML export|
| Leland HEADS |31.068|0|2/6|Eight candidates detected|
| Leland PAGE/export |54.686|0|2/6|Eight whole events survive;31 recovered,21 still absent|
| Bravura stemLessBoost0.38 PAGE |56.753|0|1/2|Incomplete recovery; not chosen|

Coordinator's exact raw-event comparison used omr.recognition_evaluation.evaluate_reference on all
printed first-part measures with empty expected-event lists, then Counter differences of
(measure,midi,staff,onset,duration) from the returned unexpected events. It reports0 removed and8 added:

| Measure | MIDI / staff | Onset | Quarter duration |
| --- | --- | ---: | ---: |
|6|63 and68 /1|0|4|
|18|35 /2|0|4|
|22|63 and68 /1|0|4|
|31|66 and68 /1;56 /2|0|4|

All439 baseline pitched events remain equal; candidate447 raw pitched events are not canonical
tie-merged counts. Existing411 canonical notes are not gold. Added G#3 tie30→31 is separately tracked;
right-hand final ties and tempo are not certified fixed. Source visual references have been checked by
coordinator; independent Opus reference remains pending at this checkpoint.

Retained graph/source locate31: no heads in the terminal stack, then MeasureFixer marks empty last
stack CAUTIONARY. Printed21 contains half/eighth notes, not whole notes; PartwiseBuilder WedgeIterators
sorts a null chord timeOffset, processMeasure catches and removes the output measure. These are
different defects. [Pinned source](https://github.com/Audiveris/audiveris/blob/9e1e55cd2746037d059345881c53e6a6754bffbd/app/src/main/java/org/audiveris/omr/score/PartwiseBuilder.java#L3691)
and [empty-last-stack rule](https://github.com/Audiveris/audiveris/blob/9e1e55cd2746037d059345881c53e6a6754bffbd/app/src/main/java/org/audiveris/omr/score/MeasureFixer.java#L247).

## Controls and rejected global change

Same Leland PAGE command, unchanged original Satie PDF and Always PDF, run sequentially:
Satie41.351s/exit0; Always65.721s/exit0. Full raw pitched-event Counter comparison:
Satie0 removed/0 added; Always5 removed (bar22) and7 added (bars22/39). No claim whether each
unreferenced Always change improves or worsens the source; this disproves a no-other-change guarantee.

```text
PYTHONPATH=omr-service python3 local-test-data/results/whole-note-integrity/compare_controls.py
```

PASS execution, but accuracy remains mixed: Love opening41/41→41/41 exact; Satie first8 printed-bar
reference23/41→23/41 not exact; Always first4 reference16/47→16/47 not exact. The Satie count here is
per printed measure and differs intentionally from the prior global-timeline9/41. Satie good300dpi
engraving was not rerun in this checkpoint. A first comparison attempt raced unfinished artifact
copy and failed FileNotFoundError; rerun after copy succeeded. No test failure is hidden as pre-existing.

## Model provenance and corrections

Orca runtime1.4.197, Run run_53f04f95438d. Actual launch receipts checked.

| Role/model | Task | Dispatch | Checkpoint |
| --- | --- | --- | --- |
|Sol gpt-5.6-sol engine review|task_c51ec8051324|ctx_16c3ae09283b|completed/released|
|Opus source reference|task_4eb2bb5b2943|ctx_53c9a49c5aec|active|
|AGY gemini-3.1-pro-high acceptance criteria|task_fce27286f754|ctx_109d658e91a2|completed; release returns external_terminal retained/no process action|
|Luna gpt-5.6-luna candidate review|task_c422508fefc9|ctx_0d1c90592bcd|completed/released|
|Sol guarded implementation|task_016582e6c77e|not started at checkpoint|registered after decisiona04a16d|

Reports: sol-engine-review.md, luna-candidate-review.md, agy-acceptance-review.md in the ignored
whole-note-integrity directory. AGY ran through a custom Orca terminal; actual TUI identified Gemini
3.1 Pro/high and worker_done provenance exists. It wrote its report into its own private brain despite
task constraints; coordinator recovered the complete report and corrections into the repository and
instructed it not to rely on private memory. No private report is needed to resume this task.

Do not repeat these model errors: Sol report was completed without consuming new HEADS evidence,
so its 'no HEADS checkpoint' conclusion is superseded. Luna's table reports raw XML divisions as if
they were onsets and advances chord notes incorrectly in its displayed added-event rows; coordinator
recomputed correct onset0/quarter-duration4 above. Its0 removed/+8 added result is independently true.
AGY's 'specific filter loss' wording is unproven; no all-score exact negative-control suite exists yet.
The coordinator rejects global Leland and uses D-052's candidate-only event-preservation contract.

No application code changed at this checkpoint. Required next gates: regression-first guarded retry,
exact native-wrapper source/control test, full service/frontend gates and independent code review.
