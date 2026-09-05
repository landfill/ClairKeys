# 2026-09-05 — #134 recognition-engine investigation (ongoing)

The user clarified that re-uploading existing scores is acceptable and challenged why engine recognition
had not been addressed. Work now explicitly targets PDF→MusicXML recognition, on
`codex/issue-134-recognition-quality` (phase plan `f18a0d5`). No runtime change has been selected or deployed.

## Input and isolation

- Same issue #134 attachment: `Clair_de_Lune_easy_300dpi.pdf`, SHA-256
  `34d06c77398470ea6f9bf15d9cd5724a0db94c904eb81107c5ca29d2f1be5478`.
- PDF inspection: A4 595.2×841.92pt, one 2480×3508 RGB JPEG at 300ppi, no embedded fonts/vector text.
- Baseline Audiveris scale: `interline(18,20,20) line(3,4,6) beam(11)`; 9/8 is supported by 5.11.0.
  Neither unsupported meter nor insufficient nominal DPI explains the failure.
- VM experiment root: `/data/analysis/issue134-engine-tMsls9`; local temporary root:
  `/private/tmp/clairkeys-recognition.qtu2Sl`. Source PDF and image-bearing OMR checkpoints are temporary,
  still in use, and must be removed when experiments end. No source PDF is in the repository.
- The running OMR service remains on the previously deployed image and active. Experiments use separate
  output folders and sequential JVM runs with 90s (HEADERS) / 300s (full) timeouts; no production settings change.

## Mechanism observed directly

Deployed Audiveris 5.11.0 source `HeaderTimeBuilder` classifies whole time signatures and individual
numerator/denominator glyphs. `TimeColumn.checkConsistency` rejects any value not represented in **every**
staff, then picks the largest mean grade. Debug logging was enabled only on an experimental JVM using a
temporary logback configuration for `org.audiveris.omr.sheet.time`.

Baseline debug output:

```text
upper numerator: TIME_SIX 0.75762; TIME_NINE 0.42689
lower numerator: TIME_SIX 0.99530; no surviving TIME_NINE candidate
System#1 TimeValue 9/8 not found in all standard staves
System#1 time sig grades {3/8=0.11868268491443693, 6/8=0.9106926025031745}
System#1 TimeSignature: 6/8
```

The source image plainly contains 9/8. Thus an available correct upper-staff candidate is discarded due
to the lower-staff digit misclassification. The two competing digit classes are distinct in Shape.java;
9/8 is in AbstractTimeInter's defaultTimes. Increasing the supported-meter list would do nothing.

## Experiments so far

| Variant | Observed result | Interpretation |
| --- | --- | --- |
| Default full, 300dpi adaptive 0.7/0.9 | 6/8; 133 canonical notes; 10 exported overfull measures; engine reports `no correct rhythm` for all 17 measures | Baseline |
| 400dpi alone | 6/8; 136 notes; 11 overfull measures; 41.29s | Not a solution alone. Some note-value recognition differs, so its interaction with corrected meter is being isolated. |
| GLOBAL binarization, default threshold 140 | 6/8; 134 notes; 11 overfull measures; 21.39s | No overall correction |
| Header yMargin=0 | 6/8; mean grade 0.47037, no complete 9/8 vector | Expanding the crop did not fix the digit |
| Adaptive meanCoeff=0.5 | 6/8; mean grade 0.92791 | No correction |
| Adaptive meanCoeff=0.9 | HEADERS invocation exit 1 | Not a valid improved candidate; filtered probe did not retain its full failure cause |
| Header yMargin=0.05 | upper 9 becomes stronger than 6, but lower remains 6; chosen 6/8 at 0.71680 | Cross-staff rejection still removes 9/8 |
| Header 400dpi | both numerators strongly 6 (0.99288 / 0.99796) | Scale alone does not disambiguate this digit font |

## Reference intervention — causal diagnostic, not a proposed runtime rule

Took a HEADERS-only `.omr` checkpoint, changed only selected upper numeral values/shapes and time-pair
6/8 values to the **known source** 9/8, then let the remaining Audiveris pipeline transcribe/export.
This modifies an experimental internal graph before recognition finishes; it does not patch exported
MusicXML or JSON and is not a general automatic correction policy.

Result: 9/8, **164 output notes**, one engine rhythm failure (measure 9), one exported overfull measure.
At quarter BPM 69, duration 65.0 seconds. This demonstrates a large effect of meter choice, but is **not**
proof of a correct score. Visible reference checks still show missing augmentation dots and some ties
being re-articulated in the first two bars. More notes/fewer warnings alone are insufficient success criteria.

The following controls are running at this entry:

- Resume the unmodified 300dpi HEADERS checkpoint to isolate any checkpoint/restart effect.
- Apply the same diagnostic meter intervention to a 400dpi checkpoint, keeping the same DPI on continuation
  so any reloaded grayscale image uses matching coordinates.

## Other checks and limitations

- Actual saved numerator run-tables were inspected, not merely the printed number in metadata.
- Local Tesseract 5.5.1 on raw crops and isolated glyphs did not give a confident consistent independent
  reading; it is not currently a defensible automatic override guard.
- No global 6→9 replacement, changed time signature whitelist, or warning-count minimization policy was adopted.
- Input references come from the original score image; previously retained incorrect MusicXML is not treated
  as a gold standard. The phase must establish reference-event improvement before shipping.

Sources: Audiveris 5.11.0 source files `sheet/time/TimeColumn.java`, `HeaderTimeBuilder.java`, `TimeBuilder.java`,
`sig/inter/AbstractTimeInter.java`, `TimePairInter.java`, `image/AdaptiveDescriptor.java`; official HEADERS,
SCALE, scanning and font documentation. Engine version/source build remain pinned in Dockerfile.audiveris.
