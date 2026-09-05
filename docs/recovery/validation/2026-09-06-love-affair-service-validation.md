# 2026-09-06 — Love Affair validation before prioritized implementation

User requested a further Love Affair test, then implementation by priority using suitable models.
This record is the pre-change baseline, not a claim that the music is fixed. Raw PDFs/results are in
the user-requested Git-excluded `local-test-data/` tree; no sample PDF is committed.

## Inputs and actual API workflow

| Case | File | Pages | SHA-256 |
| --- | --- | ---: | --- |
| solo | Love_Affair_Piano_Solo.pdf | 2 | acdd4ee03f8da75493491f677519dbce4fecf0275b106caf268fa6899ea34253 |
| truongca | piano_piano-solo-love-affair-ennio-morricone-truongca.com.pdf | 3 | 6f001b8a0a9efb01ba51b740559ce2289c2c1a8be4febdb8fc65439acf8cb44d |

Viewed all5 PDF pages. Both show the Ennio Morricone/Jose Hernandez arrangement,31 printed bars,
common time4/4, four sharps and opening quarter60. The second file adds QR/watermarks and a third,
text-only credit page. These are not identical input bytes and not a DPI-only experiment.

Tested sequential authenticated /process→/status→/result against production imageff0a347f…9415ef
(merge79a2328) via VM loopback, using diagnostic title/composer only. No callback URL, user/sheet ID,
library/storage write or deployed-code change. Secrets stayed inside the existing container environment.

| Case | Job ID | Elapsed | Outcome |
| --- | --- | ---: | --- |
| solo | a16bb7d3-d302-4169-ae98-eeace8d6c390 | 45.310s | completed,411 notes,115.25s,4/4,E,unknown tempo/reference60 |
| truongca | f52763bb-2c1c-4f49-9478-d4a53c4d24b7 | 45.394s | failed at processing30; Audiveris exit1 |

Both submissions returned200 and premature result returned409. Solo completed result returned200.
Per-job processing directories were removed automatically in both success/failure paths.46 polls each;
max loopback status latency26.560/21.650ms. The pre-existing requests dependency warning remained nonfatal.

## Solo musical findings

- Independent `/app` processor/converter reproduction took44.339s, and **every411 note dictionary and
  every top-level field except generated_at exactly matched the actual API result**.
- XML has29 measures: printed **21 and31 are absent**. Bars11/19 have3.5 rather than4 quarters; bar20
  has4.25. Missing8 quarters plus net-.75 of these length differences explain115.25 instead of124
  notated quarters. Expressive rall./rubato/fermata performance is not assigned an invented numeric duration.
- Printed quarter60 is completely absent from XML (no metronome/sound-tempo events). Fallback60 happens
  to equal the printed opening speed, but `unknown` provenance proves recognition did not read that mark.
- First3 printed measures were visually annotated before comparison: **41/41 raw pitched events match**
  by pitch, onset, duration and staff before tie merging. This good opening does not certify later bars.
- Actual player-input functions preserve pitch/time/hand; all411 fingers inferred;0 same-onset reach
  pairs,0 held conflict observations,0 release hints. One local call6.111ms; no browser/audio/expert claim.

## TruongCa failure is not solved by blindly dropping the last page

- Fatal error: sheet3 marked invalid during SCALE, `No regularly spaced lines found`, followed by
  `Could not export since transcription did not complete successfully` and exit1. The viewed third
  page contains credits, not music; this explains the immediate failure.
- But logs already show **only4 raw measures on page1 and5 on page2**, versus15/16 printed bars.
  Staff grouping/rhythm interpretation on the music pages is also broken. Do not claim that skipping
  page3 or accepting a partial export would yield a correct score without a new reference comparison.
- The failed status payload also carries long duplicated engine stdout/stack text through message/error.
  UI hiding a trace does not mean the underlying service returns a sanitized failure contract.

## Evidence and next actions

Git-excluded `local-test-data/results/love-affair-2026-09-06/` contains rendered pages, actual API JSON,
status traces, `diagnostic.mxl`, exact-lineage summary, first3-bar reference, XML and fingering reports.
VM staging root `/data/analysis/love-api-MbjIWM` is still in use for the subsequent authorized engine
investigation; staging PDFs/image-bearing OMR must be removed when that investigation ends, while user
local samples stay. No application changes were made during these tests.

Reproduction uses the previously retained API helper with `--cases solo truongca --title-prefix
"Local service validation: " --composer "Ennio Morricone"`, no callback. Then:

```sh
PYTHONPATH=omr-service python3 local-test-data/results/love-affair-2026-09-06/analyze_xml.py
node --import tsx local-test-data/results/satie-2026-09-06/analyze_fingering.ts \
  local-test-data/results/love-affair-2026-09-06 solo
```

Together with Satie/Always evidence, this places input recognition/omission and truthful quality/error
handling ahead of further fingering-cost tuning. The independent flat-key metadata defect is bounded
enough to implement first without claiming to repair any of those musical recognition failures.
