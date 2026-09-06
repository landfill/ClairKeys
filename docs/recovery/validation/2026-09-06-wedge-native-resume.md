# Wedge native diagnosis resume

Date: 2026-09-06 KST

The user explicitly replied `승인` to the current-session request to temporarily transfer and
execute the Love Affair PDF, image-bearing OMR and worker diagnostic scripts on authenticated
VM `101.79.16.73`, then delete staging copies after verification. Production code/settings remain
outside this scope. The prior worker-start automatic-review rejection is resolved by this direct
approval; the subsequent Opus launch succeeded.

Same checkout: `/Users/h0977/dev/ClairKeys`. Existing feature branch
`codex/omr-wedge-measure-integrity` resumed from `86e817c`; current main state records merged as
`5ce335c`. Pre-existing HANDOFF edits were temporarily stashed and restored exactly; user settings
remain untouched. No new worktree, production change or merge approval.

Orca run `run_53f04f95438d`:

- Claude Opus high: task `task_60bfa63556ae`, dispatch `ctx_3e858e8a340b`.
- Existing AGY: task `task_a069b02ef827`, dispatch `ctx_d662f16703e6`.

Workers own diagnostic/evaluation scripts; coordinator owns execution, review and state records.
Native results are pending. Baseline validation at resume:

```text
PYTHONPATH=omr-service python3 -m unittest discover -s omr-service/tests -p test_wedge_reference.py
PASS: 8 tests
PYTHONPATH=omr-service python3 -m unittest discover -s omr-service/tests
PASS: 115 tests (1.282s)
git diff --check
PASS
```

These tests validate existing contracts, not recognition repair. No native recovery is claimed.

## First native export probe

Opus ran the authorized isolated exports before reading the coordinator's request to centralize
remote execution. This coordination miss was disclosed through `msg_abed257b6a73`; subsequent
remote execution and cleanup belong to the coordinator. No production setting/code was changed.

Measured candidate: measure21 present, 7 exported pitched events, only 2/13 exact matches,
quarter length4.25 rather than4.0. Measure22 remains10/10. Opus's snapshots report no difference
in the other30 measures; independent AGY verification is pending. This is partial recovery only.

Root verified local/remote SHA256 equality for both OMR and MXL pairs in
`local-test-data/results/wedge-integrity/native-probe-2026-09-06/`:

| File | SHA256 |
| --- | --- |
| baseline-leland.omr | 7564bba04d702f81c4d128fa4f530d3849bbed30c52b030c761df7480e8e6b09 |
| candidate-leland.omr | a321c593e38575d1468590784623c6eb657c5969d05e36cae6c8d0233714ff1b |
| baseline-leland.mxl | 8a009c96560f034355f7d2460a390dad10b5ec45f8652b9fc8f5c0bba398bf4b |
| candidate-leland.mxl | 5027ab85cfe054102a3137d3c6ec0f18644f6394d733718cb64a7cdc4affa2b8 |

Root removed the8 known files and empty out-baseline directory from VM staging
`/data/analysis/wedge-probe-YZh1ri`; `rmdir` and `test ! -e` exited0. Source originals remain local.
`podman ps` confirmed production healthy. Next: correctly ordered symbol/rhythm checkpoints,
not an export-only production workaround.
