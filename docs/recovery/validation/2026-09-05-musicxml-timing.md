# 2026-09-05 — beat-domain MusicXML timing

Application head: PR #141 initial `890cf99`.

| Command/check | Result |
| --- | --- |
| Initial `musicxmlTiming.test.ts` before implementation | 8 FAIL / 1 PASS |
| Added non-controlling-part regression before correcting the new implementation | FAIL: expected second-bar start 3, got 4 |
| `npm test -- --runInBand src/utils/__tests__/musicxmlTiming.test.ts src/utils/__tests__/converterCorpus.test.ts src/utils/__tests__/converterTempoContract.test.ts` final | 3 suites / 32 PASS |
| `npm test -- --runInBand --silent` final | 101 suites / 959 PASS |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS, bundled type/lint skipped and separately checked |
| `python3 -m py_compile omr-service/omr/converter.py omr-service/omr/musicxml_timing.py` | PASS; final Python changes additionally imported/executed by the final Jest run |
| Built Chromium 390x844, actual converted #134 MXL | PASS: 10-measure warning, explicit non-correction wording, no horizontal overflow or page errors; mocked score/session APIs |

The retained MXL reproduces the original 133 note dictionaries exactly at user tempo 46. Added diagnostics
identify measures 1,2,3,4,5,7,10,12,14,16; recognized 6/8 and musical note data remain unchanged.
This proves recognition needs correction; it does not manufacture that correction.

Specification checks used W3C MusicXML 4.0 `sound`, `offset` and `backup` references. Direction offset affects
playback only with `sound=yes`; sound's own offset takes precedence. Tests pin those distinctions.

Not yet tested at submission: deployed VM image, external health/auth boundary and post-deploy converter smoke.
Follow `reviews/PR-141.md`. Repeat/ending expansion, flat/minor key metadata and tie identity are outside this
timeline phase and remain follow-up defects from the original audit. No production stored score is rewritten.
