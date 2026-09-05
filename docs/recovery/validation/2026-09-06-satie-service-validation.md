# 2026-09-06 — Satie samples through the real OMR API

User requested testing local Satie samples, then added Always With Me while this validation was in
progress. No application code, deployment, library row or stored score changed. Raw inputs/results stay
under Git-excluded `local-test-data/`; only this factual summary is shared.

## Inputs and independently read reference

| Case | File | Pages | SHA-256 |
| --- | --- | ---: | --- |
| original | satie-gymnopedie-1.pdf | 2 | e2b99b96bbca71077194c903cb4e390a435756892edf37040ae9dbea4cc7492a |
| 300dpi | Premiere_Gymnopedie_300dpi.pdf | 1 | 4821b7f333a25337a4f4dd64696dc73eaf8b93d918235efc3494aa62ab392f55 |

These are different engraved layouts, not a controlled DPI-only pair. The two-page LilyPond/Mutopia
score places opening accompaniment chords on staff1; the one-page score places them on staff2. Both
print3/4, two sharps, expressive tempo text without numeric BPM, and first/second endings. Viewed every
page using Poppler renders. Reference checks cover only the first8 printed measures (41 pitched events)
and the RH F#4 tie through bars9–12, not full-score correctness or expert fingering.

Opening bars alternate bass G2/D2 at beat0 for3 quarters, chord B3/D4/F#4 or A3/C#4/F#4 at beat1 for2
quarters. Bars5–8 melody: F#5,A5; G5,F#5,C#5; B4,C#5,D5; dotted-half A4. Expected staff follows each
printed layout; staff agreement is not proof of the best physical hand assignment.

## Actual API workflow and results

Production image `ff0a347f52b92803398e617c47541cd1b1d43fa366469b9a4625b61c839415ef` (merge79a2328), healthy.
Sequential authenticated POST /process → GET /status → GET /result from inside the VM to127.0.0.1:8000;
secret read from existing container environment, never printed/copied. Supplied only file, diagnostic
title and composer; no user_id, sheet_music_id or callback_url. Therefore no callback/storage/library write.

| Case | Job | Elapsed | Notes | Duration at fallback quarter60 | Initial meter/key |
| --- | --- | ---: | ---: | ---: | --- |
| original | f2be183a-59f2-4c1e-ac15-62a86a61fc95 | 34.217s | 239 | 135s | 3/4,D |
| 300dpi | 190aba4c-02c9-4e45-9991-3bc3d4c4482a | 26.285s | 283 | 141s | 3/4,D |

Both POST200, premature result409, completed result200. Status never included animation payload;
35/27 polls, maximum loopback status latency12.574/27.589ms respectively. Both job processing directories
were removed automatically. tempo/scoreTempo=null, tempoSource=unknown, timingReferenceBpm=60 is expected
here because neither PDF prints a numeric BPM. This is not the missing-numeric-tempo defect seen in other scores.

Both outputs warn `unexpanded-navigation` for endings/repeat markings. They do not perform the repeat;
processing success does not establish musically complete playback. Numeric timings are fallback-based.

## Accuracy findings

- Global first8-bar exact pitch/onset/duration/staff matches: **original9/41, 300dpi41/41**.
- Independently reran original through production `/app` processor into retained XML:34.744s,239 notes.
  Every note dictionary and every top-level field except generated_at exactly matched the HTTP result.
  This establishes the lineage of the reproduced defect; XML is not merely guessed to belong to the upload.
- Original MXL contains45 measures; printed measure numbers **5 and13 are absent**. Remaining bars are3
  quarters long. Their absence shortens the linear timeline by6 quarters (135 instead of141 at quarter60).
  The exporter already omitted the bars; the converter is not inventing that absence.
- Original opening chords are absent in bars1,2,4 and have duration1 instead of2 in bar3. Per-measure
  comparison (ignoring global drift) matches23/41 in bars1–8. Global comparison falls to9/41 because the
  missing bar5 advances later notes. No measure-overflow warning identifies these omissions.
- Original bars9–12 RH F#4 remain four separate3-quarter notes and have no XML tie markers. 300dpi API
  correctly merges the sampled passage into MIDI66/R at quarter24 for12 quarters.

## Actual player-input fingering functions (headless)

Executed normalizeAnimationData → canonicalToFallingNotes → held-key/reach checks on actual API payloads.
All finger numbers were inferred (source supplied none). Pitch/time/hand fields remained unchanged.

| Case | Key release hints | Same-onset unreachable pairs | Sounding hand/onset conflicts | Guided held conflicts |
| --- | ---: | ---: | ---: | ---: |
| original | 47 | 15 | 44 | 6 |
| 300dpi | 43 | 0 | 65 | 0 |

Counts are pair violations or hand/onset observations, not numbers of independently wrong musical
chords. Original's first example at playback13s assigns A3/C#4/F#4/F#5 to R with fingers1/2/3/4 (21
semitones from A3 toF#5), outside the current model's reach. Staff-to-hand mismatches are0 in both inputs:
the printed upper-staff accompaniment is mapped to R; that simple rule does not establish playable hands.
The earlier held-note fix handles later onsets, not an impossible chord all starting together.

One local measured mapping call took3.002ms/1.307ms respectively; not a mobile/browser performance claim.
No rendered badge layout, audible playback timing or expert musical fingering was validated in this run.

## Local evidence and reproduction

`local-test-data/results/satie-2026-09-06/` contains raw API JSON, status traces, source references,
comparison JSON, independent MXL and analysis scripts. Input originals stay in user-controlled scores/.

Commands:

```sh
pdfinfo local-test-data/scores/satie-gymnopedie-1.pdf
pdfinfo local-test-data/scores/Premiere_Gymnopedie_300dpi.pdf
python3 local-test-data/results/satie-2026-09-06/analyze.py
PYTHONPATH=omr-service python3 local-test-data/results/satie-2026-09-06/analyze_xml.py
node --import tsx local-test-data/results/satie-2026-09-06/analyze_fingering.ts
```

For API reproduction, POST multipart file/title/composer only with the existing shared-secret header,
poll /status once per second, assert /result409 while pending then200 on completion, save animation_data.
No callback URL. Clone-local scripts/results are deliberately untracked and not available in a new clone;
this protocol and reference description preserve the essential reproduction context.

Non-fatal environment findings: requests emitted a dependency-version warning; requests still succeeded.
tsx CLI initially failed to create its sandbox IPC pipe before running analysis; `node --import tsx`
then ran successfully. Neither is counted as an application accuracy failure or hidden passing check.

VM staging root `/data/analysis/satie-api-G1Lvjr`; agent-uploaded staging PDFs/diagnostic OMR cleanup is
pending at this checkpoint. User-owned local sample originals must remain. Always With Me API has also
completed; its separate XML/reference investigation is ongoing.
