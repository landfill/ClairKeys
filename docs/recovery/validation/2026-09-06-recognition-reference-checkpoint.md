# 2026-09-06 — #134 raw-reference checkpoint; not an engine fix

## Scope and code

Work branch `codex/issue-134-recognition-quality`, pushed commit `02079e1`.
`omr.recognition_evaluation` is an offline first-part, selected-measure raw-event comparator. It compares
pitch, staff, onset and duration with multiplicity, plus meter and observed bar length. It does not merge
or validate ties, certify unreferenced bars, or change production recognition. The CLI exits 1 on mismatch.

The first bar was visually checked again against the existing temporary first-system rendering on
2026-09-06: 9/8, dotted-quarter 46 = quarter BPM 69, 4.5 quarter beats. Ten pitched raw events are stored
in `fixtures/recognition/clair-de-lune-reference.json`. In particular the last RH C5/E5 events start at
quarter 3 and last 1.5, not 1. Both source staves in this opening use treble clef; staff identity and clef
must not be treated as interchangeable.

The actual known-meter+gap0.4 MXL is preserved as base64 in
`fixtures/recognition/clair-de-lune-gap04-experiment.json`, SHA-256
`2d95f5697c954e66b8e3277ed937f86f5ed805dfd0f261fdb1a32d4a0973f99e`.
This is a deliberately rejected candidate, not golden output. No PDF is committed.

## Completed controls and experiments

All internal known-meter interventions use source-known 9/8 and are diagnostic, not automatic policies.
VM root remains `/data/analysis/issue134-engine-tMsls9`.

| Output folder | Result / limitation |
| --- | --- |
| `resume-control` | Unchanged HEADERS checkpoint resumed: 6/8, 134 canonical notes, 17 bad rhythm bars, 10 overflow warnings. Direct full run had 133: one G4 tie differs on checkpoint reload. |
| `reference-meter-test` | Known 9/8 at HEADERS: 164 notes, bad/overfull bar 9; first-bar 6/10 raw matches, length 4.0. Correct causal note-count comparison is 134→164, not 133→164. |
| `reference400` | Known 9/8 at HEADERS400, retained DPI400 on resume: 156 notes, bad bars 5/7/9; first-bar 8/10 raw matches, length 4.5. RH final dots still absent. |
| `rhythm-only-reference` | Known 9/8 on completed graph, reset RHYTHMS/PAGE: 164 notes, bad bar 9, same first-bar defects as known-meter300. Potential cheaper retry mechanism, not an accepted policy. |
| `reference-leland` | Known 9/8 + Leland: 165 notes, bad bars 5/7/9, first-bar length 4.0; no first-bar fix. |
| `reference-primus` | Known 9/8 + Primus: 164 notes, bad bar 9, first-bar length 4.0; no first-bar fix. |
| `reference-gap04` | `SymbolsBuilder.maxGap=0.4`: exit 0, bad bars 5/9; first-bar 8/10 raw matches, length 4.5; RH C5/E5 last dots absent. |
| `reference-gap02` | maxGap=0.2: exit 0, bad bars 5/9; same first-bar 8/10 and missing RH dots. |
| `reference-weight001` | minWeight=0.01: exit 0, bad bar 9; first-bar 6/10, length 4.0. |
| `reference-parts10` | maxPartCount=10: exit 0, bad bar 9; first-bar 6/10, length 4.0. |

The engine's symbol builder connects nearby fragments and limits each cluster to its seven largest
parts by default. Near the missing RH dots, saved SYMBOL glyph fragments occur at x834–841, y645/665,
and a large slur-associated glyph begins at x837,y662. This suggests segmentation/curve interaction,
but does not prove that increasing the part count or changing gap alone repairs it; those probes failed.
Source inspected directly:
[SymbolsBuilder 5.11.0](https://github.com/Audiveris/audiveris/blob/5.11.0/app/src/main/java/org/audiveris/omr/sheet/symbol/SymbolsBuilder.java).

## Numerator template probe — experimental only

Pillow-rendered Bravura/Leland 6 and 9 from the installed Audiveris jar; normalize ink bounding box,
preserve aspect ratio, largest side64 on canvas76; threshold128; best IoU over translations ±3px.

| Glyph | Bravura 6 / 9 | Leland 6 / 9 |
| --- | --- | --- |
| upper188 original 9 | .6021 / .6965 | .6045 / .6977 |
| lower197 original 9 | .6234 / .7253 | .6391 / .7258 |
| upper rotated control | .6960 / .6056 | .6934 / .6072 |
| lower rotated control | .7218 / .6230 | .7113 / .6445 |

These two actual 9 samples plus rotated controls are insufficient to choose a production threshold.
Primus uses private codepoints F041/F044, not SMuFL E086/E089. A real 6 regression is still required.
Official [sample documentation](https://github.com/Audiveris/audiveris/blob/5.11.0/docs/_pages/guides/advanced/samples.md)
links the public 5.3 training collection. Its samples.zip ID is `1q0CO8Hqat9_zmOS1TUzqoiZTqompaQZ-`;
the download/probe is pending at this checkpoint. Do not download the 453MB sheet-images archive.

## Verification actually run

```sh
PYTHONPATH=omr-service python3 -m unittest discover -s omr-service/tests -p test_recognition_evaluation.py
npm test -- --runInBand src/utils/__tests__/omrRuntimeContract.test.ts
npx tsc --noEmit
npm run lint
git diff --cached --check
```

- First test run before implementation: import failure for missing evaluator, as expected (not a passing run).
- Final evaluator: 8 tests PASS, including actual MXL hash and rejection despite correct meter/bar length.
- Jest bridge: 1 suite, 2 tests PASS (runtime Python contract plus new evaluator).
- Independent typecheck/lint PASS; whitespace check PASS. Full Jest/build/hosted CI not run for this checkpoint.
- CLI on gap0.4, gap0.2, weight0.01 and parts10: exit1 as expected; mismatches reported above.
- Production service remains active on the prior deployed image. JVM probes exited0; they used separate
  directories and 300s process timeouts. No service restart, runtime constants change or stored-score write.
- Source PDF and image-bearing OMR checkpoints are still temporarily in use and require cleanup after analysis.
