# 2026-09-06 — automatic internal meter retry (partial #134 repair)

## Scope and revision

Code `ff1084c751d3ffc95b22c56c32ec69c76f30e3ab` on `codex/issue-134-recognition-quality`.
Earlier raw-reference evaluator/fixtures: `02079e1`. D-049 and the phase plan are on the same work branch.
No PR, merge or production deployment is claimed at this checkpoint.

The implementation does change recognition: it uses two selected numerator images to decide whether
to reinterpret an internal 6/8 graph as 9/8 and reruns Audiveris RHYTHMS/PAGE. It does not patch exported
MusicXML or JSON. Triggers are restricted to widespread overflow, one page, one part with two 5-line
staves and the pinned 5.11.0 graph representation. Success selection additionally preserves part/measure
structure, staff/pitch multiplicity and sound/metronome tempo marks, and requires fewer overflows.
Those safeguards do not certify missing dots, ties, all notes or the full score.

## Official labeled digit corpus

Source is the public samples.zip linked by Audiveris's
[sample documentation](https://github.com/Audiveris/audiveris/blob/5.11.0/docs/_pages/guides/advanced/samples.md).
Drive 5.3 folder `1VQBu9QDDcvY9epk7dxFFcforDVlzBCx-`, file `1q0CO8Hqat9_zmOS1TUzqoiZTqompaQZ-`.
Archive bytes 4,717,276, SHA-256 `9aa7a0fb1e809400c7104f08b2531df534d2eb78d72204d4e1db3a227227fac5`.
Only labeled run descriptors were downloaded, **not** the sheet-images archive. Dataset labels were not
independently hand-reviewed; they are a regression corpus, not proof that every future digit is classified correctly.

The isolated prototype and actual `omr.time_numeral` produced the same proposals:

| Label | Samples | Nine proposals |
| --- | ---: | ---: |
| 1 | 2 | 0 |
| 2 | 345 | 0 |
| 3 | 691 | 0 |
| 4 | 1,275 | 0 |
| 5 | 12 | 0 |
| 6 | 268 | 0 |
| 7 | 10 | 0 |
| 8 | 406 | 0 |
| 9 | 39 | 23 |
| Total | 3,048 | 23 |

Both actual #134 numerator glyphs pass the same predeclared hypothesis (nine IoU>=.65, margin over six>=.08):
upper `.6976545842 / .0931348102`, lower `.7257995736 / .0867079272` (nine score / margin).
Sixteen labeled nines abstain; no non-nine proposals among 3,009 samples. No threshold was retuned after
this corpus run. Isolated numerator descriptors from the user-supplied score are retained as a tiny
fixture; no source PDF or complete page image is in the repository.

Reproduction against the deployed jar and temporary sample archive:

```sh
PYTHONPATH=omr-service python3 scripts/recognition/probe_meter_templates.py \
  /path/to/audiveris-5.3-samples.zip /opt/audiveris/lib/app/audiveris.jar \
  --all-digits --runtime --report /path/to/runtime-all-digit-report.json
```

Optional `--omr /path/to/checkpoint.omr` also reports selected numerator scores. Full metric report is
temporarily at VM `/data/analysis/issue134-engine-tMsls9/runtime-all-digit-report.json`; no archive of
external training samples is committed. Script uses existing Pillow/engine fonts, not a remote OCR API.

## Automatic same-PDF run

The exact #134 PDF hash is unchanged from the earlier reference checkpoint. Production modules were
not replaced. An isolated candidate package was passed through `PYTHONPATH` to an additional Python
process, which invokes sequential JVMs and writes only inside the analysis tree.

V1 actual automatic run (before the final additional tempo-mark guard and startup-budget accounting):

- Processor source printed `/data/analysis/issue134-engine-tMsls9/candidate/omr/audiveris.py`.
- Full PDF→initial XML→image evidence→copied graph→engine retry→selected XML: **28.604s**.
- Selected `/data/analysis/issue134-engine-tMsls9/automatic-retry-v1/meter-retry-nqo8qose/retry.mxl`.
- Meter9/8, 163 canonical notes, one overflow (bar9:5 quarters vs4.5). Initial XML has ten overflows.
- First-bar raw events still **6/10**, length4.0, missing dots on final RH C5/E5 and LH E4/G4 half notes.
  This automatic output is not the earlier reference-only 164-note experiment; keep the measurements distinct.
- `tempo=null` and `scoreTempo=null` triggered a separate before/after audit. Both initial and retried XML
  retain `<sound tempo="69">` and dotted-quarter46; **both** have opening_tempo=None. The fresh engine
  output attaches the direction after the start. It is not caused by the retry and is not repaired here.
- Final guard comparison on those exact two MXL files accepts them and proves their tempo marks match.

Exact final commit full rerun completed in `/data/analysis/issue134-engine-tMsls9/automatic-ff1084c`:
29.780s, selected `meter-retry-lzp5_pei/retry.mxl`, 9/8, 163 notes, one overflow, unchanged 6/10 first-bar
match and opening tempo still null. Processor source printed the exact `validation-ff1084c` checkout.
Reproduce with a fresh output directory:

```sh
PYTHONPATH=omr-service python3 scripts/recognition/smoke_retry.py \
  /path/to/input.pdf /path/to/new-output fixtures/recognition/clair-de-lune-reference.json
```

The smoke saves a JSON report including raw-event mismatch; it does not treat successful engine exit
or lower warnings as whole-score correctness.

## Verification on final code

```sh
npm test -- --runInBand
npx tsc --noEmit
npm run lint
npm run build
PYTHONPATH=omr-service python3 -m unittest discover -s omr-service/tests -p 'test_meter_retry*.py'
PYTHONPATH=omr-service python3 -m unittest discover -s omr-service/tests -p test_time_numeral.py
```

- Full Jest: **101 suites / 963 tests PASS**, including five Python-suite bridge checks. Independent
  typecheck/lint/build PASS; the build itself still skips internal type/lint checks.
- Tests were added before behavior: missing `omr.meter_retry`/retry-method imports first failed, then
  passed after implementation. No failed or skipped test is being counted as a pass.
- New tests cover both-staff agreement, version/page/selection/shape guards, pitch multiplicity/staff/tempo
  preservation, normal-score fast path, fallback on errors/multiple outputs/timeout, remaining budget,
  cancellation kill/wait, malformed run tables and shift math/rotated control mechanics.
- CI unit jobs now explicitly install Python3.10 and the service's Pillow10.1.0 for pixel regressions.
- Exact commit was exported with only `omr-service`, `fixtures`, the finalize API source and recognition
  scripts into VM `/data/analysis/issue134-engine-tMsls9/validation-ff1084c`. User settings/secrets excluded.
- In the existing VM container, independent interpreter at that checkout ran
  `python3 -m unittest discover -s tests` with cwd its `omr-service`, `PYTHONPATH=.`:
  **all 75 service tests PASS (0.358s)** on the deployed Python3.10/Pillow10.1 dependencies. This is not a
  new image build or a production source switch.
- Previous main state commit `07d9e55` post-push checks: all six checks success.

## Remaining gates and limitations

Open review-ready PR, inspect hosted CI/review, and follow the applicable
merge approval rule before a production build/deployment. Genuine 6/8 full-PDF end-to-end regression,
unseen handwriting/font coverage and full-score human reference review are not claimed. #134 stays
unresolved for dots/ties and tempo placement. Temporary PDFs/image-bearing OMR files require cleanup
once probes are complete; preserving XML/JSON/hash/text diagnostics does not require preserving the PDF.
