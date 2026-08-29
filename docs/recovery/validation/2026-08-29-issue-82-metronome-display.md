# Validation — Issue #82 metronome display

Date: 2026-08-29
Commit: `2ce5e38d750f22eb2a41eb300c2846fedd61eb02`
Environment: macOS, Node 22.18.0; existing v1.1 animation contract

## Claim being verified

Users can see the tempo applied to the score and its provenance in the real production playback
route before playback and while playback is active, without changing playback geometry or adding a
database field.

## Evidence

| Command | Result | Evidence |
|---|---|---|
| Focused regression before implementation | FAIL (expected) | FallingNotesPlayer tempo-display test failed; 20 existing tests passed |
| Focused regression after implementation | PASS | AnimationPlayer + FallingNotesPlayer: 27 tests |
| `npm test -- --runInBand` | PASS | 62 suites, 592 tests |
| `npx tsc --noEmit` | PASS | exit 0 |
| `npm run lint` | PASS | no warnings or errors |
| `npm run build` | PASS | production build and 41 static pages completed |

## Behavior fixed

- `score`: `♩=60 (악보에서 읽음)`
- `user`: `♩=72 (직접 입력)` plus `악보 표기: ♩=60` when different
- `unknown`: `♩=120 (출처 미상)` or `빠르기 미상` with the timing reference
- Active playback uses a fixed overlay, preserving the established falling/keyboard geometry.

## Gaps

- No physical-device typography/overlap check was available.
- Production has no known score with confirmed tempo metadata in the current sample, so the live
  content path was not observed. The converter and display contracts are covered by existing and new
  regression tests.
