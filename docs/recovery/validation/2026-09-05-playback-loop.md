# 2026-09-05 — A-B loop regression and fix

Application revision: PR #138 head `aed0c82`.

| Command | Result |
| --- | --- |
| `npm test -- --runInBand src/hooks/__tests__/useFallingNotesPlayer.test.ts` before implementation | 2 FAIL, 6 PASS; expected 1 RAF, received 0 after immediate and delayed wraps |
| `npm test -- --runInBand src/hooks/__tests__/useFallingNotesPlayer.test.ts src/hooks/__tests__/useFallingNotesAudio.test.ts` | 2 suites / 16 tests PASS |
| `npm test -- --runInBand` | 94 suites / 911 tests PASS |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS, CLI deprecation notice only |
| `npm run build` | PASS; bundled type/lint steps skipped, separately checked above |

The hook regression covers three B→A wraps, stable audio callback identities, delayed restart, pause/stop/unmount during restart, marker replacement and false restart result. No application deployment or physical-device test was performed.
