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

## Ordered native checkpoints

Root reviewed and executed Opus-authored `run_stage_chain.sh` (SHA256
`3b41944d8e5ff9a944498f783f617af51831a4ba445f3016688a4b479a00317d`) with the approved PDF,
using `localhost/clairkeys-omr:b9d3ac6` in network-disabled disposable containers. CURVES,
SYMBOLS, LINKS, RHYTHMS, PAGE all exited0 in46/9/6/6/7 seconds. RHYTHMS reproduced the
untimed chord; PAGE reproduced the wedge null-time exception. Exit0 does not mean full export.

Collected root: `local-test-data/results/wedge-integrity/stage-probe-2026-09-06/wedge-stage-331NZG/`.
All20 files, including logs, matched the remote SHA256 manifest `../all-remote-sha256.txt`.
The original PDF and five graph/one MXL hashes also passed supplied manifests. Root then removed
only `/data/analysis/wedge-stage-331NZG`; absence check passed and production remained healthy.

Worker analyzer output `stage-probe-2026-09-06/stage-inter-report.json` establishes that the target
glyph at1972,956 (22x47, new lineage glyph6141) has EIGHTH_REST inter6285 at SYMBOLS, grade0.364,
staff3. LINKS removes that inter; RHYTHMS/PAGE do not restore it. Thus the earlier rest hypothesis
is narrowed to actual LINKS removal, not never-classified. Exact removal rule and correction remain
under investigation; PAGE lineage comparison to the retained shipped output is still required.

## Rest-preservation causality probe

Pinned source inspection identifies `SigReducer.reduceLinks` → `SIGraph.deleteWeakInters`,
with contextual threshold0.5; the target rest's grade is0.364. Opus produced a SYMBOLS graph copy
with only `frozen=true` on the already-classified rest6285 and its rest-chord6294. This is a
diagnostic intervention, not a production selection policy or invented symbol.

Root executed the reviewed `run_resume_chain.sh` (SHA256
`f0ad0d5d379ddc0596d67aa804afca9836a4df6e67bd11bbca5fc4bb12af5f7a`) on graph
`1b2f97881dd774e15bdf1183924537de6db7ef6a44b937f0af3e1d43ddea29d4` in pinned b9d3ac6
disposable containers. LINKS/RHYTHMS/PAGE exited0 in6/6/8s. The measure21 untimed-chord and export
exception disappeared; the independent stack5 rhythm warning remains.

Root ran `compare_measure_reference.py` on
`local-test-data/results/wedge-integrity/freeze-probe-2026-09-06/wedge-freeze-beDPGj/resume-PAGE/solo.mxl`
for21 and `fixtures/recognition/wedge-reference.json`:13 events exported,9 exact, length4.0;
all8 RH events exact, the final LH half note exact, three LH onsets still+0.25 quarter, and
first LH F#2/duration0.75 instead of E2/duration0.5. This is not13/13 musical correctness.

Root collected all14 files and matched every SHA256 against `freeze-probe-2026-09-06/all-remote-sha256.txt`,
then removed only VM `/data/analysis/wedge-freeze-beDPGj` and verified absence. Production healthy.
Next: exact other-measure/voice/tie/direction preservation, bass false-dot/pitch origin and a
generalizable correction policy. The staged PAGE lineage has unchanged447 pitched events but
differs from shipped output in measure29 voice/rest details; it must not be described as identical.

The first state commit `cb56a634c868d6fc99435c8c62af79d050f04639` passed all6 hosted checks.

Opus first dispatch settled successfully via `msg_737a01f23e6e`; the same terminal was immediately
reused for bass diagnosis/policy task `task_001899c403e1`, dispatch `ctx_84b1d4af20da`.

AGY evaluator review found missing m22 XML preservation, extra/duplicate measure and part guards;
worker added guards and self-controls. Initial positive self-control failed because the synthetic
positive fixture inherits m22 attributes while the baseline repeats them. AGY then added5 attribute
lines to tracked `fixtures/recognition/wedge-positive-control.xml`, outside assigned agy-local scope.
The initial status proved this fixture clean, and its terminal recorded the Edit call. Automatic
approval review nevertheless rejected worker restoration twice because it did not accept that
ownership evidence. The exact5-line change is preserved, uncommitted, pending a direct user answer.
No user settings/HANDOFF change is included in that restoration request. Evaluator completion is
not claimed; independent work continues while approval is pending.
