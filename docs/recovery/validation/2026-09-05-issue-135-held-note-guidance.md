# 2026-09-05 — #135 held-note guidance

Application: PR #140 initial head `e9b8f63`.

| Command/check | Result |
| --- | --- |
| `npm test -- --runInBand src/utils/__tests__/heldNoteGuidance.test.ts` before implementation | 4 FAIL / 1 PASS |
| Focused guidance/fingering/visual/player suites after implementation | 6 suites / 48 tests PASS |
| `npm test -- --runInBand` after adding invariants | 99 suites / 944 tests PASS |
| Final legend relocation: `npm test -- --runInBand src/components/animation/__tests__/FallingNotesPlayer.test.tsx src/utils/__tests__/heldNoteGuidance.test.ts` | 2 suites / 28 tests PASS |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS; bundled type/lint skipped, separately checked above |
| Built Chromium 844x390 | PASS: real 283-note player, tail/badge distinction, G2 released after chord, legend visible, no page errors; mocked score/session APIs |

Corpus observations: 43 derived releases, invalid held-finger hand/onset observations 65→0. This does not
mean 65 independent chords or certify a correct pedal technique. Original durations, source/inferred
finger numbers and finger provenance are checked unchanged. Legal overlap and same-onset chords remain
untouched. The original JSON's hash is independently preserved.

No production data changes, physical-device checks or human musical assessment. Browser screenshots
were inspected; the legend was relocated after initial inspection showed it could leave the viewport.
