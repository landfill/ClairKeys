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

## Two-rest experiment and independent review

Opus extended the copied-graph probe to the source-confirmed purged rest in20 as well as21.
Root directly compared every archive/XML entry of candidate
`3beb7fc80b2b88f070fd10ec9b0c6717d4cb2668bc394e0f3932a8901b7d17a5` against the SYMBOLS baseline:
only four `frozen=true` attributes differ (rests6272/6285, rest-chords6293/6294). Competing FLAT6273
is unchanged and unfrozen. Automatic review initially used the earlier unwanted-FLAT concern;
the direct comparison resolved it and the subsequent run was approved.

Root ran unchanged `run_resume_chain.sh` in `/data/analysis/wedge-both-RKlFgs`, pinned b9d3ac6.
LINKS/RHYTHMS/PAGE exited0 in6/6/7s, with neither rhythm warning nor export exception. All14 files
were collected under `both-rest-probe-2026-09-06/wedge-both-RKlFgs/` and matched the sibling
`all-remote-sha256.txt` manifest. Root removed the dedicated VM directory and verified absence;
production remained healthy. All four session staging directories are now removed.

Worker comparison: stage baseline30→31 measures,447→460 pitched events; only21 added, only20
changed among shared measures.20 retains15 pitched events and the same MIDI/staff multiset,
length4.25→4.0, restores its eighth rest and retimes its treble; bass pitch/duration errors remain.
The existing8 whole events and terminal31 remain. This does not establish a general safe policy.

AGY initial task settled, then same-terminal follow-up `task_3f3f5a952b78` / `ctx_b0c743898587`
retracted its unsupported semantic-corruption claim: its comparator treated regenerated slur
numbers as corruption. It independently confirmed9/13 on the frozen candidate after correcting
reversed baseline/candidate inputs, and disclosed the out-of-scope fixture edit. Release returned
`retained / external_terminal / processAction:none`; no AGY task remains active.

Root additionally compared the same-lineage baseline and single-rest frozen score: no common
measure difference remains after slur-ID normalization. Explicit start/stop pairing shows no
removed complete slur span and two added spans20→21 and21→22; the baseline's orphan stop22 and
unclosed start20 are now paired. This validates these particular artifacts, not the generic
AGY comparator or arbitrary slur renumbering.

Opus source/pixel review narrows the bass cause to missing ledger interpretations already at HEADS:
the printed E2 ledger is visible but absent from the graph at20/21, and its tail is classified
as a false augmentation dot. Exact creation-vs-removal origin within/before LEDGERS is not yet
instrumented. The proposed guards are unaccepted research, not a production policy; normal-score
purged-rest census and LEDGERS instrumentation remain next. Main state commit11bd1a5 passed6 checks.

## Continued approved diagnostics

Opus E2/policy task settled and its terminal was released with transcript capture. A fresh Opus
high task `task_e8dce9213aa6` / `ctx_7b8a015da5a0` continues the bounded Love-only E3 ledger-length
experiment and E1 baseline-font review in the same checkout. Root fetched the exact public
5.11.0 `CheckSuite.java` to unblock source inspection. No engine source patch is implemented.

The user then explicitly approved temporary transfer/execution of Satie, good-Satie and Always
PDFs plus diagnostic scripts on the same VM, with collection/cleanup and no production changes.
This resolves the E1 payload scope blocker. E1 must cover production Bravura as well as Leland;
the earlier Leland-only runner cannot prove normal-pipeline preservation. Fixture restoration
remains a separate pending question; this latest approval was for the three control PDFs.

Root census review found exploratory limitations: overlap checks only inspect pre-LINKS rests,
missing pitch permits an in-profile result, sheet-wide raw pixel ranges ignore staff scale,
and competing non-rest shapes are not considered. These are not established runtime guards;
zero candidates in three controls alone would not prove general safety.

## Final E1/E3 results and next investigation boundary

E1 ran `run_census_pass.sh` SHA256
`899d0b7c6528bc8cc560a90f83dbc2d0d789b25bfea97fc0944dba47c7c480c7`, with no music-font constant
for the Bravura condition and the explicit Leland constant for the second condition. All18 stages
exited0. Root collected and SHA256-verified all70 files from VM `/data/analysis/wedge-controls-OCvsmK`,
then removed that dedicated directory and verified absence. The local full manifest/verification
log is under `controls-probe-2026-09-06/`.

Both font conditions produced the following census counts:

| Score | Rests at SYMBOLS | Purged at LINKS | Profile candidates | Distinct failing stacks | Candidates in failing stacks |
| --- | ---: | ---: | ---: | ---: | ---: |
| Satie | 48 | 17 | 9 | 9 | 4 |
| good-Satie | 49 | 0 | 0 | 0 | 0 |
| Always | 21 | 11 | 1 | 5 | 0 |

The four Satie candidates are in stacks5,6,18,31. This falsifies the proposed zero-control-trigger
premise, not proof that retention would harm those measures: its actual effect is unmeasured.
No D-054/runtime policy is adopted. Census-only runs are not full conversion/preservation tests.

**Coordinator correction to the worker report:** Always has5 failing `(sheet, system, stack)`
tuples, not4. Sheet1/system1/stack2 and sheet2/system1/stack2 are distinct; never deduplicate raw
stack numbers across sheets. Root independently parsed both RHYTHMS logs. Its sole candidate is
on sheet2/stack9, outside the failure set, so the candidate intersection remains0.

E3 ran `run_ledger_probe.sh` SHA256
`062921d92b28e4296a5c713da80361988ededf96245592efc1c617b5cf1c9e0a` on Love, four variants ×
LEDGERS/HEADS, all8 stages exit0. Baseline/control time21/16s and19/16s; low0.60/low0.20 variants
19/17s and20/15s. The first-ledger mechanism control passed. Target20/21 ledgers remain absent
in both relaxed variants, with identical erroneous head candidates; sheet2 ledger counts are
78 baseline,84 at0.60,85 at0.20. No PAGE promotion was warranted. These tested length changes
do not repair the fault; other checks, candidate construction and removal inside LEDGERS remain
unresolved. The lower probe's supposed sub-core-length bracket was not reachable under the
unchanged core-section floor, so do not overstate the experiment's coverage.

Root collected and verified all31 files in `ledger-probe-2026-09-06/wedge-ledger-oaqu9v/`, then
removed the VM directory and verified absence. All6 session staging directories are removed;
production remains healthy on b9d3ac6. User-local sources/results are preserved and Git-excluded.

Final Opus dispatch settled via `msg_ceb798c0dc28`; release captured transcript and closed its
owned terminal. No worker task is active. AGY's external terminal remains retained without process
action. Feature branch5ce335c is pushed; all diagnostic code/results remain local, no correction
PR exists. The one tracked fixture edit remains uncommitted pending user-approved restoration.

Next bounded work: instrument ledger candidate construction/check/reduction to distinguish why
the source-confirmed ledger disappears, and measure any retention proposal against source-confirmed
Satie events before adopting it. **Do not blindly execute the worker report's thickness suggestion:**
raising the interline cap to25px alone leaves `min(line-cap13px, interline-cap25px)=13px`; it does
not admit the hypothesized23px blob. That is an untested hypothesis requiring a corrected probe,
not an approved setting. Root fetched CheckSuite/Check/Grades this session; LedgersBuilder.java
was supplied by the prior worker, despite the report's broader root-attribution wording.
