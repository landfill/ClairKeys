# P0-D Playback Contract Iteration

- Date: 2026-07-19 KST
- Branch: `codex/p0-quality-gates`
- Pull request: https://github.com/landfill/ClairKeys/pull/4
- Scope: audio service and animation playback contracts

## Repaired contracts

- `initializeAudio` returns the initialized singleton service.
- Playback can be enabled/disabled without destroying configured settings.
- Chords use the same guarded note-level play/release paths as single notes.
- Disabled audio is not reported as ready.
- Natural playback completion retains `currentTime === duration` instead of rewinding to zero.
- The React hook exposes the engine's existing `practice` mode.
- Engine and hook tests now share stable singleton mocks.
- Pause regression testing activates a real timeline note instead of mutating a cloned state snapshot.

## Verification

| Command | Result |
|---|---|
| Focused Jest run for audio service, animation engine and hook | PASS — 3 suites, 63 tests |
| `git diff --check` | PASS |
| Full `npx tsc --noEmit` | INCONCLUSIVE — project-wide baseline exceeded the local execution window |

## CI follow-up

GitHub Security Audit failed during action preparation because `securecodewarrior/github-action-add-sarif@v1` no longer resolves. The workflow now records `npm audit --json` output and uploads it through `actions/upload-artifact@v4`, allowing the actual dependency audit result to surface.
