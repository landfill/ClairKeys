# OMR-Q3 — Repair musical-event loss before page-selection convenience

Status: `IN_PROGRESS`
Depends on: source references and retained graphs; no dependency on OMR-Q2

## Progress

- 2026-09-06: PR144's bounded whole-note retry merged with explicit approval as b9d3ac6. Exact-image
  deployment underway. Phase remains IN_PROGRESS: independent21 exporter loss, tempo and RH ties remain.

## Objective

Repair omitted whole notes/measures and then missing note values/ties/tempo at the recognition boundary.
The user explicitly reordered work: musical integrity first, conditional400dpi second, regression at
every change; automatic page selection is deferred and is not a prerequisite.

## Evidence and first target

Love Affair solo has31 printed measures; retained output has29, missing21/31. First3 raw-reference bars
match41/41, but no whole-note types are exported. Whole-note symbols are also absent from the completed
saved graph at both solo300 and the independent TruongCa400 experiment. Completed-graph absence alone
does not distinguish failed detection from later removal.

## Work stages

1. Independently fix the source whole-note reference for sampled bars/voices and preserve an explicit
   regression fixture before implementation. Do not treat the411-note output as gold.
2. Capture the HEADS-stage graph with the unchanged engine/source and compare to final graph/XML.
   Inspect pinned5.11.0 detection/filter/export code to locate the loss. No filename patches or invented notes.
3. Implement D-052's bounded whole-note template retry regression-first. Keep initial Bravura and
   abstain outside the validated4/4/piano/terminal-cautionary scope. Preserve original musical events;
   accept only image-recognized whole additions and the recovered terminal measure. The independent
   measure21 wedge exporter exception remains a separate correction. Never pad bars or invent notes.
4. Verify the actual source events and normal Satie/Always/Love controls after each behavior change.
   Use conditional400dpi only if needed and independently shown beneficial, within existing budget/concurrency.
5. Review-ready PR, CI/review and explicit target merge/rollout approvals. Broader unresolved items stay open.

## Completion criteria

- Sampled missing whole notes/measures actually survive to MusicXML/canonical with correct pitch/time.
- No new whole-note/voice/tie corruption on controls; no warning-count-only success claim.
- No automatic deletion/skipping of uncertain/non-music pages. An unparseable page may fail clearly.
- No silently accepted corrupted result, artificial duration stretching or ungrounded fingering retuning.
- Source PDFs remain user-local/Git-excluded; VM analysis copies cleaned after work units.

## Out of scope

Automatic page-filter implementation, complete-score certification without a human reference, new
commercial runtime OMR/LLM provider, stored-score rewriting, or unrelated key metadata changes.
