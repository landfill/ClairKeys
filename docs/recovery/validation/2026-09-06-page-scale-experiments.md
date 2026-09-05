# 2026-09-06 — controlled page/scale experiment, not a shipped retry policy

Plan-only branch `codex/omr-page-scale-validation`, commit76a6b893cff6300de572aa8990bd62562bd9fece.
This work is independent of key metadata PR143. No runtime code, deployed constants or stored score changed.

## Design and primary-source checks

Use the exact TruongCa Love Affair PDF, explicitly selecting human-confirmed music pages1–2. Keep page
selection fixed and change only PDF rendering resolution300→400. This separates the text-page abort
from recognition quality; it is not an automatic non-music-page classifier or edited/re-encoded PDF.

Pinned Audiveris5.11.0 [CLI source](https://github.com/Audiveris/audiveris/blob/5.11.0/app/src/main/java/org/audiveris/omr/CLI.java)
confirms `-sheets` numbers/ranges. ImageLoading.pdfResolution was already verified in the #134 experiments.
ProcessingSwitches [source](https://github.com/Audiveris/audiveris/blob/5.11.0/app/src/main/java/org/audiveris/omr/sheet/ProcessingSwitches.java)
also confirms multiWholeHeadChords is true by default; missing whole notes are not explained by that switch being off.

Each process ran separately with the deployed3GB heap and300s timeout through the existing kill/wait
helper; no concurrent experimental JVM.600dpi was not attempted. Elapsed time measured; peak RSS was not
measured, so no peak-memory performance claim. Post-experiment host had14.6GiB available and no JVM left.

## Results

| Metric | Selected pages1–2,300dpi | Same pages,400dpi |
| --- | ---: | ---: |
| Engine exit | 0 | 0 |
| Elapsed seconds | 45.909 | 98.242 |
| Engine interline main | 21px | 28px |
| Recognized 5-line staves per page | 4 /4 | 10 /10 |
| Raw engine measure stacks per page | 4 /5 | 15 /16 |
| Exported parts | 2 (wrong structure) | 1 |
| Exported measure elements | 13 across both parts; first part9 | 30 in the piano part |
| Canonical notes | 37 | 441 |
| First3-bar raw source-reference match | 0/41 | 41/41 |
| Whole-note type elements | 0 | 0 |

400dpi restores the independently checked opening and staff/system coverage for this input. It is
not a full-score gold standard: printed final bar31 is still absent, no whole-note elements are exported,
and441 is merely the output count. Do not compare against corrupted solo411 as though411 were correct.
The timing cost more than doubles; applying400dpi unconditionally to every score is not justified.

The300dpi control illustrates why page filtering alone is insufficient: it changes failed into exit0
but produces37 notes and0/41 opening matches. It must not be presented as a successful musical repair.

## Preliminary independent page probe — not production-ready

Coordinator prototyped row/5-line grouping and a separate test of whether native text word bounding
boxes explain all dark pixels. Actual TruongCa credit page:0 staff groups,180 extracted words,84,158 dark
pixels,0 dark pixels remaining after masking text boxes. The two music-page examples retain substantial
unexplained ink and recognized staff groups. This suggests a conservative text-page distinction.

Limitations exposed by the same probe:

- Always page1 yielded only4 groups/38 line bands despite10 actual staves: the long-contiguous-run
  condition undercounts broken/antialiased staff lines. These counts are not a validated universal denominator.
- Satie's bbox output contains invalid XML glyph characters and raised ParseError. Any production path
  must safely retain/process uncertain pages rather than dropping them or making a new parse failure.
- The chosen coverage/ink thresholds are **hypotheses**, not accepted settings. No-staff detection alone
  remains insufficient proof that a page has no music.
- Corrected review arithmetic: solo image is inset, not stretched to the full page. pdfimages reports134ppi
  rather than150ppi for TruongCa; the prototype estimates solo about21.6px versus TruongCa20.7px at300dpi,
  not the Opus review's asserted24.4/20.7 controlled pair. Its threshold narrative is not adopted.

## Retained artifacts and cleanup

Git-excluded `local-test-data/results/love-affair-2026-09-06/` now contains selected-300/, selected-400/,
diagnostic-solo/ including XML, JSON, logs and debugging OMR checkpoints; original user PDFs remain in scores/.
Local helpers `profile_pdf.py` and `preflight_probe.py` preserve exact experimental commands/logic.
The shared report here records the essential protocol for clones where those local-only artifacts are absent.

After copying results, enumerated then removed only five agent-owned VM files: both staging PDFs and
the solo/selected300/selected400 image-bearing OMR archives. No PDF/PNG/OMR remains under VM
`/data/analysis/love-api-MbjIWM`; XML/JSON/logs retained. Production remains healthy on unchanged79a2328 image.

## Next implementation gate

Before adopting page/scale logic, define a safe uncertain-page fallback, bound rendering/parsing cost,
validate normal controls and run a source-aware coverage test. Then record the runtime decision and add
regression tests before integration. The current branch contains only the experiment plan, not such a policy.
Whole-note loss and printed-tempo omission remain separate source-graph investigations. D-048 boundary
behavior and D-045 fingering constraints have not been changed.
