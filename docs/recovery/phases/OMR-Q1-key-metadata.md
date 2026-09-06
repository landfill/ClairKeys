# OMR-Q1 — Preserve traditional key-signature metadata truthfully

Status: `IN_PROGRESS`
Depends on: Satie/Always/Love validation, Sol/Luna contract review, D-050

## Progress

- 2026-09-06: User-approved PR143 merged as1aa8c71 after all final-head gates passed and a late timezone
  review false positive was verified/replied/resolved. Exact-image rollout and post-merge gates underway.

## Objective

Fix the demonstrated XML fifths=-1 → JSON C defect without changing any recognized note, rhythm,
tempo or fingering. Prevent malformed key metadata from aborting otherwise valid conversion.

## Prioritized work context

The highest-impact remaining problem is PDF→MusicXML losing notes, bars, dots/ties and printed tempo.
Love's extra text page also exposes input/page failure handling. Those need source-aware experiments,
not blind padding, page dropping or filename rules. This small confirmed converter fix is the first
independent deliverable while the larger recognition design is reviewed; it is not a substitute for it.

## Work stages

1. Add failing raw-CLI regression tests for flats, explicit minor and unsupported/malformed/missing keys.
2. Implement D-050's optional-string, bounded first-key extraction contract.
3. Check canonical normalization and untouched notes/tempo/timing; keep golden metadata fixtures truthful.
4. Replay retained Always XML: keyF while all647 notes and other non-generated fields remain equal.
   Satie D and Love E remain unchanged with exact notes.
5. Independent review, focused/full tests, typecheck/lint/build, ready PR and CI. Merge and production
   rollout follow their explicit approval boundaries; no stored-score rewrite.

## Completion criteria

- All -7..7 major/minor mappings verified; absent mode uses the existing major-name convention.
- Missing/invalid/unrepresentable key is omitted, not invented as C and not a conversion failure.
- A normalizer/CLI regression gate exercises the raw metadata, not only note-comparison helpers.
- Existing valid note, tempo, timing and source-finger data are unchanged.
- No claim that this fixes missing printed tempo, omitted bars, repeats or physical hand assignment.

## Scope exclusions

Key-change maps, polymodal/transposing parts, non-traditional key-step/key-alter signatures, namespace
expansion, runtime recognition profile changes, PDF retention and inferred fingering cost changes.
