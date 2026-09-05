# 2026-09-06 — actual model-assisted review checkpoint

User requested suitable use of agy, Sol, Luna, Opus during the prioritized implementation. Coordinator
keeps implementation/verification ownership. Reviews below are real Orca Tasks/Dispatches, not labels
retroactively applied to ordinary local work. No application implementation is claimed at this checkpoint.

## Runtime and assignments

- CLI resolved once: `/usr/local/bin/orca`; full version-matched orchestration guide read.
- Initial sandbox status could not see the runtime; the same read-only command with required access
  confirmed running Orca1.4.197 runtime `f2183d7e-6da9-42b5-a088-675c36de710e`. No alternative binary or restart.
- Run `run_53f04f95438d`; coordinator `term_26ce4be2-0688-4724-adf9-6ed27b48aa4b`.
- Same shared checkout, fresh terminals, no worktree creation. Every review prohibited application/Git
  edits, VM/JVM calls, secret/user-settings access and subworkers; only its named ignored local report allowed.

| Model in launch requested/effective receipt | Task | Dispatch | State at checkpoint |
| --- | --- | --- | --- |
| codex gpt-5.6-sol | task_5e35df91b904 | ctx_51b8618cc39f | succeeded; report read, terminal released, delivery acknowledged |
| codex gpt-5.6-luna | task_1b028bc7c8c9 | ctx_877825549ebb | succeeded; report read, terminal released, delivery acknowledged |
| claude opus | task_d0e7b9ae5ac7 | ctx_45a4e0154a8f | launched/input accepted; architectural review still running |

AGY binary/model discovery also succeeded; its list includes Gemini3.1 Pro High and Claude Opus4.6
Thinking among others. **No AGY model task has run yet**; discovery is not model-assisted implementation.
Do not claim Opus completion until the actual worker report arrives. Task/dispatch existence was verified.

## Recovered Sol findings

- Always's negative fifths are correctly in XML but become C in converter; malformed fifths can abort
  conversion and explicit minor is ignored. Source pitches/time are independent of descriptive key metadata.
- Recommended bounded contract: conventional -7..7 major/minor names, absent mode retains historical
  major-name convention, unsupported/missing/invalid key omitted rather than a false C or raw exception.
- Existing canonical keySignature is optional string; normalization already tolerates absence. No current
  player note conversion uses this field. Preserve notes and existing stored JSONs; keep scalar/first-declaration
  limits explicit. Require a raw-CLI Jest gate because note-comparison helpers ignore metadata.
- Root review correction: retained Always XML has one piano part with two key declarations, not two parts.
  Some Python suites already have Jest bridges; a new key module needs an explicit CI gate, not an assumption
  that all Python tests are discovered automatically. Do not repeat those imprecisions from the raw review.

## Recovered Luna findings

- Focused checks actually run:37 Jest tests and19 Python recognition/meter tests PASS. No full suite/build/VM.
- Missing regression matrix: negative/invalid fifths, explicit modes, unknown key, missing measure alignment,
  invalid/absent tempo and the distinction between absent source tempo versus recognition omission.
- Existing pickup/non-controlling/time-offset tests are meaningful safeguards; do not break them by forcing
  every short bar to nominal length. Keep recognition accuracy separate from metadata correctness.
- Do not tune D-045's disqualified fingering metrics to hide corrupted input.

Full clone-local review artifacts: `local-test-data/results/priority-model-reviews/sol-key-contract.md`
and `luna-regression-review.md`; Opus report is pending. Shared summary here preserves the conclusions
without relying on private model memory. Next: finish remaining review, record phase/decision before code,
implement regression-first on a dedicated branch, review/CI and request target-PR/rollout approvals as required.
