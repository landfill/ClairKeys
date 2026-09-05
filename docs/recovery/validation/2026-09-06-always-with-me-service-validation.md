# 2026-09-06 — Always With Me real-API validation

User added this test while Satie validation was underway. Findings only: no application code, deployed
image, library row, stored score or database changes. Inputs and raw results remain Git-excluded.

## Input and visual reference

- `local-test-data/scores/Always_With_Me_2pages_300dpi.pdf`,2 pages,1,133,412 bytes.
- SHA-256 `4fbc74c7cdb7965ca908796da1493848d85571b50e111ca3ec956edbfea197a1`.
- Both pages rendered and inspected; opening detail and bars3/4 checked at higher resolution.
- Printed composer Yumi Kimura, arranger Tomohisa Okudo; one-flat key signature. Opening6/8 and
  dotted-quarter43 = quarter BPM64.5. Printed meter changes: bar10→3/8,11→6/8,37→3/8,38→6/8.
-44 printed measures:42×3 +2×1.5 =129 quarter beats, or120s at the printed constant quarter64.5,
  without assigning additional time to grace/arpeggio performance nuances.
- Independently annotated first4 measures:47 pitched raw events. Higher-resolution source recheck
  corrected the initially misread second16th of bar4 from E4 to **D4**; final comparison uses the corrected
  source reference. This is a reference-reading correction, not a runtime fix or fitting to engine output.
  First4-measure XML comparison excludes later grace-note passages because they are outside that reference.

## Actual API test

- Production image `ff0a347f52b92803398e617c47541cd1b1d43fa366469b9a4625b61c839415ef` (merge79a2328).
- Authenticated real POST /process, then status/result GETs against VM loopback. Secret stays in the
  existing container environment; supplied only PDF, diagnostic title and composer. No callback/user/sheet ID.
- Job `330ce164-8568-420c-aee6-c7d43e085139`: POST200, early result409, completed result200.
-51.445s;647 notes; duration127.5s; initial6/8; key metadataC; tempo/scoreTempo=null, tempoSource=unknown,
  timingReferenceBpm=60.52 polls; maximum loopback status latency22.565ms; no animation in status.
- Service automatically removed the job processing directory. No callback or library/storage write.
- Independent production-module reproduction took51.045s and produced **all647 identical note dictionaries
  and every top-level value except generated_at identical to the HTTP result**. This establishes XML lineage.

## Findings by layer

1. **Tempo omitted by recognition.** The reproduced XML has no metronome, sound-tempo or words element;
   its parsed tempo event map is empty despite the visible printed43 dotted-quarter mark. This is not
   merely the converter treating a late-positioned tempo as unknown: the value is absent in the XML.
2. **Flat key metadata lost by conversion.** XML correctly contains fifths=-1; canonical key isC.
   `omr-service/omr/converter.py::_extract_key_signature` only maps nonnegative fifths and falls back toC
   for negative values. Under its current major-name scheme, one flat should map toF. Do not confuse this
   metadata bug with every note being transposed: pitches carry their own alterations.
3. **Meter transitions preserved, note timing incorrect.** All44 measure numbers and all five initial/change
   meter declarations match the printed score. The guarded6/9 retry did not trigger for this legitimate
   multi-page/changing-meter6/8 input. Nevertheless, six bars have incorrect observed lengths:

| Printed bar | Expected quarters | XML observed quarters |
| --- | ---: | ---: |
| 4 | 3 | 2.75 |
| 7 | 3 | 2.5 |
| 8 | 3 | 3.5 |
| 19 | 3 | 2.75 |
| 20 | 3 | 2.5 |
| 29 | 3 | 2.5 |

Only bar8 yields the current measure-overflow warning; short bars are not warned. Total observed time
is127.5 quarter beats instead of129. These are complete printed bars, not pickup bars. Do not silently
fill/stretch them without fixing recognition and validating the actual note reference.

4. **First4 raw-event reference:16/47 exact matches** (pitch, quarter onset, duration, encoded staff).
   Examples: bar1 dotted-quarter bass durations1.5 become1; its RH first chord moves from.5 to1 and the
   repeated RH group is lost. Bar3 LH A3/C4 chord is represented as a single Bb3. Bar4 loses the dotted
   eighth's extra.25, moving later notes early. These mismatches are already in the matching XML.
5. **Headless player-input guidance:** all647 fingers inferred,3 release hints, pitch/time/hand fields
   unchanged. Current reach model reports one same-onset L pair at playback56s: F2/A3 (16 semitones,
   fingers5/1, model limit15); one held hand/onset conflict remains. No expert fingering, badge-layout
   or audible browser-timing validation is claimed. Single local mapping call7.737ms is not a mobile SLO.

## Tempo-only control

Local converter-only replay of the captured XML with user override64.5 preserved every pitch/hand and
647-note count, produced tempoSource=user and duration118.604651s, and retained the bar8 warning.
Thus entering the correct tempo alone does not restore the missing rhythmic time. This was not another
HTTP upload or an update to a stored score; its JSON is only in the ignored local results directory.

## Evidence and reproduction

`local-test-data/results/always-with-me-2026-09-06/`: README, source renders, API payloads/traces, independent
MXL, reference.json, xml-analysis.json, fingering-comparison.json, tempo-override-control.json.

- API animation JSON SHA-256: `e4e0dae18847d61028713b2f1cab8ae5c06d00fe93ff9d7013cb7a879ae03543`.
- Independent MXL SHA-256: `b77b0db1a566036ac9d41374b4c7b2c9ee51de9a5412453ac811161cbf21319e`.

```sh
PYTHONPATH=omr-service python3 local-test-data/results/always-with-me-2026-09-06/analyze_xml.py
node --import tsx local-test-data/results/satie-2026-09-06/analyze_fingering.ts \
  local-test-data/results/always-with-me-2026-09-06 always-with-me
```

API runner is the local Satie helper generalized with `--cases always-with-me --title-prefix
"Local service validation: " --composer "Yumi Kimura"`; defaults still reproduce Satie. Raw helpers are
intentionally clone-local, not shared application code. Core protocol: multipart file/title/composer only,
existing shared-secret header, one status poll/sec, early result409→completed200, save animation_data;
then independent native conversion and exact note/top-level comparison (excluding generated_at).

The existing requests dependency warning was nonfatal and is recorded in the Satie report. No service
restart/settings change was needed. After all tests, service still has the original expected image and
healthy status, with no test JVM running.

## Cleanup and boundaries

- VM analysis root `/data/analysis/always-api-P1DhhC`: removed only agent-uploaded staging PDF and its
  image-bearing diagnostic OMR. XML/JSON/logs retained; no PDF/PNG/OMR files remain there.
- Satie VM staging PDFs and diagnostic OMR were likewise removed (5 remote files total across both tests).
- **User-owned local sample originals and local results/renders were preserved**, as explicitly requested
  by the local test-folder workflow. Git check-ignore matches those paths; git ls-files for local-test-data is empty.
- Findings are recorded, not fixed. Relevant next candidates are the independent negative-fifths metadata
  bug, source tempo/dot recognition, missing whole bars in the Satie original, and previously unexpanded repeats.
  Full web upload proxy/auth UI/storage/callback roundtrip, full-score correctness and subjective performance
  quality were not tested; actual OMR HTTP workflow and current player-input functions were tested.
