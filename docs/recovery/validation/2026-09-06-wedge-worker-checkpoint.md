# Same-worktree Opus/AGY wedge investigation checkpoint

Date: 2026-09-06 KST. User explicitly required Claude Opus and Antigravity AGY workers,
no coordinator implementation and no worktree separation.

## Ownership and repository state

Used only /Users/h0977/dev/ClairKeys. Created branch codex/omr-wedge-measure-integrity from4c20ff2;
no new Git/Orca worktree. Workers authored all diagnostic scripts, plan/decision and regression code.
Coordinator performed dispatch, read-only review, test execution and Git/state-record operations only.
User-owned .claude/settings.local.json was not read, edited, staged or reverted.

Worker-authored checkpoint commit: `86e817cfc52c81e43977e84dbc85c62f7e9cd141`, pushed on the feature
branch. It contains diagnostic-only D-053, the wedge phase plan, three portable XML/JSON fixtures
and test_wedge_reference.py. No application runtime behavior changed; no PR was created because
the actual correction policy/implementation/native verification are not ready.

Orca1.4.197 Run run_53f04f95438d:

| Worker | Task | Dispatch | Result |
| --- | --- | --- | --- |
|Claude Opus|task_aa8c8448b61b|ctx_217a48a8e0df|Local investigation/probe scripts complete; production implementation not performed; released|
|AGY Gemini3.1 Pro high|task_82cc2544b9f9|ctx_d564c78b7eed|Initial fixtures; required corrections routed to same worker|
|Same AGY follow-up|task_fd32f0e3bea5|ctx_b5e5bf346815|Hash/scope/negative-test corrections verified; release returned external_terminal retained/no process action|

Actual model launch receipts/TUI checked. AGY initially attempted a shell-redirection edit; coordinator
denied that method and supplied the verified apply_patch executable/format, leaving actual patch authoring
and application to the worker. A follow-up completion using revoked old IDs was rejected, not accepted;
the correct new-dispatch completion was subsequently received. No non-Orca subagent was used.

## Established evidence versus hypotheses

Current deployed baseline remains approved PR144/b9d3ac6, image d7d6344b…106c8a, healthy. Retained
Leland result has30 numbered measures (1–20,22–31), including the prior whole-note restoration.
Against the source reference: measure21 has0/13 exact pitch/staff/onset/duration matches; measured
measure22 has10/10. That is a scoped retained-output check, not a new full-service or full-score pass.

Both saved graphs have an empty treble voice for three eighth chords. On reload their time offsets
remain absent; a linked wedge creates the known WedgeIterators comparison exception and the exporter
removes the whole measure. An export-only relation-removal candidate is prepared, but has NOT run
natively. Opus predicts at most7 exported pitched events and about2/13 exact source matches; these
are predictions, not measured repaired results, and not an accepted completion criterion.

Opus found a free glyph resembling the printed eighth rest and compared it to accepted rest glyphs
with native font templates. This is a useful upstream hypothesis only: a completed graph cannot
distinguish never-classified from later-removed, and template similarity alone does not authorize
inserting an interpretation. One independent bass pitch is also wrong, so rest-only recovery does
not establish13/13. A stale13/13 sentence remains in the ignored investigation narrative; the tracked
phase/D-053 and this canonical record correctly retain that limitation and require measured evidence.

Coordinator stage-order correction for the next worker: pinned OmrStep defines REDUCTION before
SYMBOLS, then LINKS and RHYTHMS (source lines64,70–72). Do NOT use a SYMBOLS→REDUCTION comparison
from the narrative as evidence of later symbol removal. Confirm the actual sequence and inspect
SYMBOLS→LINKS/RHYTHMS checkpoints or instrument the relevant pass after authorization.

## Regression verification

AGY source reference has the correct Love PDF SHA256
acdd4ee03f8da75493491f677519dbce4fecf0275b106caf268fa6899ea34253. Root review caught an initially
copied Debussy hash; AGY computed/fixed it and added a metadata regression. Source scope is printed
measures21/22 before tie merging. Synthetic positive/baseline controls validate evaluator behavior,
not deployed PR144 preservation. Added negative pitch, onset, duration, staff and extra-note cases.

Coordinator independently executed:

```text
PYTHONPATH=omr-service python3 -m unittest discover -s omr-service/tests -p test_wedge_reference.py
PYTHONPATH=omr-service python3 -m unittest discover -s omr-service/tests
git diff --check
```

PASS8 focused tests; PASS115 full Python tests (0.964s); diff check PASS. The synthetic absent-bar
control is correctly non-exact, positive control23/23; this does not mean the engine is fixed.
New tests are not yet wired into the enumerated Jest CI gate; that remains worker-owned implementation
work before a final correction PR. No frontend build/type/lint or new live API pass is claimed here.

## Actual permission blocker and safe alternatives

Automatic permission review REJECTED, before execution, the command that would copy the private
image-bearing OMR graph plus Opus scripts to authenticated VM101.79.16.73 and run native exports.
Reason: the specific sensitive payload/destination was not explicitly approved. No graph or script
was transferred, no native probe ran, and no worker/alternate-account/indirect transfer was used to
route around the rejection. User has been asked for this exact diagnostic transfer/execution approval.

The only remote setup effect was an empty mktemp directory /data/analysis/wedge-probe-pHk7Tz, removed
with rmdir after the rejected transfer. Existing sources/processing data and production code remain
unchanged. Local fallback checks found only JDK17; Docker desktop-linux is a local Unix context with
no environment override, but its daemon socket is absent. A missing toolchain is not proof that an
engine source patch is impossible; a genuinely local isolated toolchain remains a future option.

## Resume

1. Obtain explicit permission for the Love source PDF/OMR and worker-authored diagnostic scripts to be
   staged temporarily on101.79.16.73 for isolated native diagnosis; no production code/settings change.
2. Resume Opus and AGY in this SAME worktree. Root must not author/apply implementation or fixture code.
3. First run the existing copied-graph export-only baseline/candidate probe, compare13 reference events
   and all other measures. Then collect correctly ordered symbol/rhythm checkpoints for the rest hypothesis.
4. Select a proven correction, implement through workers regression-first, verify all normal controls,
   create a review-ready PR and request its own explicit merge/rollout approval.

Worker reports/scripts and raw evidence: local-test-data/results/wedge-integrity/ (Git-excluded).
Original source/retained graphs remain in their previous Git-excluded locations. Canonical status is
in HANDOFF.md; no personal memory or external report is required to understand the blocked checkpoint.
