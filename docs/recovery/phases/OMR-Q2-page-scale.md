# OMR-Q2 — Prove page/scale recognition improvement before adopting a retry policy

Status: `IN_PROGRESS`
Depends on: Love Affair, Satie and Always real-API references; D-048/D-049 constraints

## Objective

Find and implement a bounded common recognition improvement for input/page/staff/measure loss. Do not
replace an explicit conversion failure with a musically corrupted success or claim metadata repair as OMR repair.
This work is independent of OMR-Q1 key metadata, which reached `DONE` in main after this plan was drafted.

## Experiments before policy

1. Use the unchanged TruongCa PDF and explicitly select its visually verified music pages1–2 with the
   pinned engine's supported `-sheets 1-2`. This is a diagnostic control, not an automatic page classifier.
2. Keep everything else equal: baseline300dpi versus400dpi via verified ImageLoading.pdfResolution.
   Capture engine exit/logs, page/staff/measure coverage, exported events and first3-bar source reference.
3. Bound runs to one experimental JVM, timeout300s, existing3GB heap. Record cost; do not attempt600dpi
   until lower-cost evidence and memory headroom justify it. Never modify persisted production constants.
4. If a candidate improves reference events/coverage, test normal Love solo, Satie300dpi, Satie original
   and Always controls. No warning-count-only selection, filename-specific logic, or hardcoded source notes.
5. Investigate missing whole-note events separately in saved graphs versus XML before choosing a repair.

## Runtime implementation gate

Only after measured improvement, record a new decision before implementing source-aware page/scale
selection and quality/fallback handling. Arbitrary coverage60% or target interline28–40 from a review are
not accepted thresholds. No-staff detection alone does not prove a page has no music. A poor image must
not be silently omitted. Retain the existing timeout, concurrency, original-output and source-finger safeguards.

## Completion criteria

- Actual same-source note/measure coverage improves with independently verified reference events.
- Normal controls do not regress; no unsupported success is silently stored.
- Source PDFs remain only user-local or bounded VM analysis copies; no source PDF enters Git.
- Focused/full regression and VM/API checks support a ready PR. Explicit merge/rollout approvals apply.

## Progress

- 2026-09-06: Experiment1 ran on the unchanged TruongCa music pages1-2. Selected300dpi produced37 notes
  and0 of41 opening reference matches; 400dpi produced441 notes and41 of41, with per-page staff coverage
  4->10 and raw measure stacks4/5->15/16. Cost rose45.909s->98.242s. This is measured XML improvement on
  one source, not a global400dpi policy.
- 2026-09-06: 400dpi still omits the final printed measure31 and exports no whole-note types. A preliminary
  independent page probe separates the text credit page but undercounts Always staves and fails Satie bbox
  parsing, so it is not production-ready. Evidence: [page/scale experiments](../validation/2026-09-06-page-scale-experiments.md).
- The runtime implementation gate below has NOT been passed. No400dpi or page-filter policy was deployed and
  production recognition constants are unchanged. Normal-control and fallback validation remain outstanding.

## Exclusions

Nominal-duration padding/stretching (D-048), ungrounded fingering retuning (D-045), commercial OMR API
integration, source PDF editing/re-encoding, existing stored-score migration or unrelated deployment changes.
