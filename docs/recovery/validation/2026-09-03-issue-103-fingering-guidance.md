# Issue #103 Fingering Guidance Validation

Date: 2026-09-03 KST
Branch commit: `edf29d8`
PR: [#117](https://github.com/landfill/ClairKeys/pull/117)

## Scope

- explicit MusicXML/canonical fingering preservation
- deterministic 1–5 fallback at the canonical-to-player boundary
- CAGED ascending major-scale and 1–5 note chord patterns
- finger-number rendering on very short falling notes

## Source basis

- [Yamaha fingering basics](https://hub.yamaha.com/keyboards/k-how-to/the-basics-of-piano-keyboard-fingering/): thumb 1 through pinky 5 for both hands; fingering depends on hand position and passage, and may have more than one valid choice.
- [Baylor Piano Basics major scales](https://openbooks.library.baylor.edu/pianobasics/chapter/one-octave-major-scales/): CAGED ascending scale patterns RH `123-12345`, LH `54321-321`, plus explicit F/B exceptions.
- [Simply Piano help](https://piano-help.hellosimply.com/en/articles/7943490-learning-with-simply-piano-the-basics): finger-number visibility is user-facing; its assignment algorithm is not public and was not copied or inferred.

## Regression observation before implementation

Command:

```text
npm test -- --runInBand src/utils/__tests__/dataConverter.test.ts src/utils/__tests__/visualUtils.test.ts
```

Result: FAIL, 3 failures. Missing fingers remained `undefined`, both chord arrays were entirely undefined, and an 8×8 visual note suppressed its finger badge.

## Post-implementation validation

| Command | Result |
|---|---|
| focused Jest (fingering, boundary, visual helper, component render) | PASS — 4 suites / 39 tests |
| `npm test -- --runInBand` | PASS — 90 suites / 846 tests |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS — no warnings or errors |
| `npm run build` | PASS — 34 static/dynamic route entries; build config skipped type/lint, which were run separately |
| `git diff --check` | PASS |

The existing profile test React `act(...)` warning and expected failure-path console output remain non-failing baseline noise.

## Not tested

- actual stored score playback across every note
- pedagogical optimality of inferred hints for arbitrary repertoire
- mobile landscape legibility and overlap in a real browser
- hosted CI and preview deployment (pending at PR creation)

## Result

Local automated gates pass. The phase remains `IN_REVIEW`; manual score/browser validation and hosted review/CI remain open.
