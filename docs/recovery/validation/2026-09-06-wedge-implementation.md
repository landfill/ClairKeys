# Wedge recovery implementation checkpoint

Date: 2026-09-06 KST

## Ownership and current scope

User explicitly requested actual correction code, rejected Opus implementation and AGY verification,
and allowed another Codex model or AGY Gemini Flash for implementation. The selected worker is
Codex gpt-5.6-sol/high, task `task_f956cd1a5218`, dispatch `ctx_1bc097ab8165`, run
`run_53f04f95438d`, in the same checkout/branch. Root independently reviews source, runs tests and
compares native results. No Opus or AGY task is assigned. Existing user settings and pre-existing
HANDOFF edits are preserved.

D-054 and phase changes precede behavior changes. New `omr/wedge_retry.py`, processor integration,
synthetic graph fixtures and guard/runtime tests are being implemented. They are not yet accepted
or committed as a completed correction. Overall phase13/13 and control preservation remain required.

## Root verification before the first native run

- Full initial Python suite:115 tests passed (0.725s).
- Root checked actual selected Love MXL/OMR: detector identifies21, sheet2/system2/third stack,
  graph stack id6. Its SYMBOLS preparation identifies only the expected engine-classified rest.
- Actual retained Satie/good-Satie/Always detector results are all `None`. Satie does have two
  existing export gaps5/13, so mere missing-number detection is not sufficient.
- New local guard/runtime tests:20 passed (0.495s) at that checkpoint. Subsequent edits require
  revalidation; this is not a claim that the latest worktree is green.
- Root review reproduced/fixed requests for native SIG/voice serialization, DOT→HEAD direction,
  slur continue/open-boundary handling, final deadline checks and realistic glyph/image fixtures.

## First native candidate: mechanism succeeds, candidate correctly rejected

Root executed worker-authored runner in disposable network-disabled containers using exact image tag
`localhost/clairkeys-omr:b9d3ac6`; Python helpers ran inside its Python3.10 environment.
Snapshot under `local-test-data/results/wedge-implementation-sol/native-run-1-code/`:

| File | SHA256 |
| --- | --- |
| omr/wedge_retry.py | 81d240ce8e42e47cd141fff5b6cbff195012f793f8dd38670063d105192de7ee |
| native_candidate_driver.py | f24880600605bd419da711172686268bd7470891b18540fdbb6452d19c4f479a |
| run_native_candidate.sh | 253bfa3e035a77b4718d5a29cd68a9c3901b2d840e091a37e3c55d199029864b |

Results collected under `local-test-data/results/wedge-implementation-sol/native-run-1/wedge-sol-2byAh4/`.
Both native stages produced outputs, but the runner exited1 because acceptance was false:

- Printed21:13/13 exact MIDI/staff/onset/duration, no missing/unexpected events, four quarters.
- Printed22:10/10 exact, four quarters.
- Root independently read printed20 from the source page and compared its15 events: candidate15/15.
- Root full-score snapshots:30→31 measures,447→458 pitched events (not460). Common measures
  11,12,14,15,16,19,20,24,29 change. The broad thickness candidate is not safe to select; do not
  relax preservation guards to pass it. The lost target is recovered but other content changes.
- Both BINARY.png entries are byte-identical to the selected original graph.

Root verified all27 remote files against the collected copy, then removed only VM directory
`/data/analysis/wedge-sol-2byAh4`; absence verified and production remains healthy. No deployment,
storage write, PR or merge occurred.

## Superseded transplant investigation (not implemented)

The implementation is being narrowed to take only source-corroborated native ledger/glyph
interpretations from the candidate and resume normal engine processing. No downstream note,
pitch, dot, voice or timing is hand-authored. The safer base is a fresh normal LEDGERS checkpoint:
real LEDGERS graphs have no heads/stacks/measures, and changing a completed graph's step string
alone does not clear later interpretations. Root verified both facts against actual files/source.

Required review corrections already sent to the worker:

- InterIndex and GlyphIndex share `Sheet.last-persistent-id`; allocate one global sequence above
  every existing inter/glyph ID and update the persisted counter. Independent counters collide.
- Early-stage mapping must use validated sheet/system/staff geometry and BINARY identity, not
  nonexistent measure stacks. Selected final graph supplies the defect scope.
- Source profile quantization must be consistent:38px at interline21.5 is1.76744, just below the
  old normalized minimum1.77259 from another staff. Use explicit pixel rounding boundaries,
  not unbounded tolerance or removal of image/glyph checks.
- Every changed existing stack requires a separately verified printed-source reference, with
  unchanged out-of-scope events/voices/ties/directions/slur endpoints. The global candidate's
 13/13 target score alone is insufficient.

Native targeted validation, final regression gates and review-ready PR remain unfinished. User
approval of diagnostic VM operations persists; merge/rollout still need their own explicit approval.


## Final native post-analysis correction checkpoint (2026-09-06)

The transplant approach was abandoned. Factory-only and factory-plus-suite region patches both
remained9/13. Root then ran native DEBUG on both the candidate and unmodified stock engine:
ledgers1436/1438 already exist with valid delta21.5 in[19..24], but post-analysis removes their
height7 against[2..6]. Neighbor1434 floors6 and survives. Final patch changes only
`LedgersPostAnalysis`: an explicit graph/BINARY-derived region may retain a ledger whose only
failure is upper height exactly one floored pixel above the computed maximum. Stock construction,
check suites and delta rejection remain unchanged.

Root built isolated image `localhost/clairkeys-omr:wedge-postfix-f67677c`:

- Image: `19d0d0990a8cb1cce13dfdb4ea7f50c97d8048c7b63b8273d961353185bd34f0`.
- Patch: `f67677c685bd47684b3aeacbb8288af20404b2f47d8e445117b2f504777d7cb3`.
- Patched jar: `629d88300853264b130a1bedc69b473ca268a26ab30df07358e271f5949a984a`.
- Native run snapshot module: `6b47b562d0f1bc815383f52148d9be1657f8cd0638f2afc3fc4c5df741e522f4`.
- Output MXL: `fd3dec985db293dc1eb01a5102c4f8f3ab05885e81ad3cc70db0876b25d83c5f`.
- Output OMR: `5b3ee14d107c71237d85a6755ccf937c71c6ff6dfce8b0dc2028100da97975ab`.

Native outputs are collected under
`local-test-data/results/wedge-implementation-sol/native-postfix/wedge-postfix-case-7PgBRB/`.
The actual run recovers21 at13/13, preserves22 at10/10, and corrects20 at15/15 plus its one printed
rest; all three are exactly4 quarters. Root independently measures30→31 exported measures and
447→460 pitched events. Only20 changes existing pitched event tuples.

Acceptance is still false and this is not a completion claim. Root identified raw MusicXML
divisions rescaling, the corrected20 bass slur endpoint, and free-glyph X-only matching across
systems as specific guard issues; OCR confidence differences also require evidence-based handling.
The worker is correcting these while root runs four final no-region native controls. Root local
`cd omr-service && python3 -m unittest discover -s tests`:142 tests passed in1.456s at this
checkpoint; later changes require renewed validation. Production remains healthy on the unchanged
stock image. No code commit, PR, merge or rollout has occurred for this implementation yet.


## Independent acceptance and full local gates (2026-09-06)

Root independently ran the collected native pair against module
`ef1c2c719ec20661a48e7a1cf9bf07e614c4fb6386fb3cc75bfee2a5bb786743`: acceptance true.
Root source-page reinspection supports measure20's same-chord diminuendo2.5→3.5 and pedal release
at3.0 after the rhythm correction. Explicit offsets/payloads and source chord associations must
remain preserved; no arbitrary direction retiming is authorized. A separate recursive comparator
of all outside-scope note metadata, normalizing duration/offset by MusicXML divisions, found no
changes. Root requested that production guards retain this full metadata invariant and strict
outside-scope tie anchors, with negative regression cases, before final code freeze.

Final PostAnalysis-only no-region controls were executed with
`bash run_native_controls.sh /data/analysis/wedge-postfix-controls-kl7X5i localhost/clairkeys-omr:wedge-postfix-f67677c`.
All four Love/Satie/good-Satie/Always LEDGERS graphs pass exact live-graph equality; book/image
entries are unchanged. ID aliases are compared by full glyph payload and only truly unreferenced
cache entries are excluded. This proves no-region engine-stage equivalence, not a full fresh
processor run of each control.

Root gates at this checkpoint:

- `npx tsc --noEmit`: exit0.
- `npm run lint`: exit0, no ESLint warnings/errors.
- `npm test -- --runInBand`:102 suites,977 tests passed in19.909s.
- `npm run build`: exit0. This build skips type/lint internally; both were run separately above.
- An initial incorrect `npx eslint .` invocation included generated `.next` and auxiliary scripts,
  reporting9060 problems. It is not the repository lint gate; the required `npm run lint` passes.
- State commit `c3ade456c23b44eecc5e1228d668dcdff69c7e49`: post-push checks observed; five completed
  checks passed, E2E was still running at the observation. No failed check observed.

Root collected260 files into
`local-test-data/results/wedge-implementation-sol/vm-final-collection/`; all hashes match the
remote manifest `vm-final-manifest.json`. The downloaded/extracted public JDK toolchain is excluded
from that artifact collection (its official archive and original source checksums were verified
before each build). Nine superseded VM staging directories were removed: wedge-region-raGcj6,
wedge-region-case-vdgakn, wedge-region-controls-haL8Wo, wedge-region-v2-YwLlpJ,
wedge-region2-case-PVnOfM, wedge-region2-controls-fmeERJ, wedge-region-trace-7v5j8g,
wedge-region-tracecase-apv5t4, wedge-posttrace-7Hceh8. Only the three final postfix staging
paths remain pending integration validation/cleanup. Production remains healthy and unchanged.

Actual processor selection, final test freeze and review-ready PR remain to be completed.


## Actual processor integration exposed two final defects (2026-09-06)

Automatic approval review rejected final VM staging twice despite the prior scope record. The user
then explicitly replied `승인` to the precise final Love PDF/code/scripts transfer/run/collect/delete
request for101.79.16.73; staging succeeded. This additional scope blocker is resolved.

The actual `AudiverisProcessor.process_pdf` chain ran with module
`6470ce544724887021c930785146b02955786e9ee007d34f03ed05b503a06b92`, stock and alternate executables,
concurrency1 and the original900-second budget. It produced the correct native candidate but
returned the unchanged whole-note retry because acceptance rejected it. Root independently found
all20/21/22 references exact, both scoped ledger proofs true, full outside event/note/context
preservation, and preserved header/slurs/ties. The sole difference is an assigned stem glyph's
`groups=STUMP` cache label absent in the candidate: exact5x143 ink and primitive stem median/width
are unchanged. That descriptor repeats in four relations, producing five graph differences.
The worker is validating a narrowly scoped normalization against upstream GlyphGroup semantics;
this failed integration must not be reported as a successful actual processor selection.

Root also tested the exact Dockerfile GNU `patch -p1 --ignore-whitespace` command against the
checksum-pinned original source. All three hunks failed due to CRLF line endings. The isolated
engine build had used `git apply --ignore-space-change`, so it had not tested this packaging path.
The Dockerfile must verify the original checksum, normalize line endings, then apply/compile the
patch. The worker is fixing this and root will independently re-run that exact path.

Frozen checkpoint root tests: full Python145 passed in2.566s, and the actual Jest OMR contract
inventory passed all10 suites. Previous full977 Jest/type/lint/build gates remain as recorded;
changed focused suites require revalidation after these final defects are fixed.


## Final successful processor selection and delivery checkpoint (2026-09-06)

Final implementation module:
`058d8e387658083b76c25fb326fd439d27d2b399b653d6058e319952b289d6bb`.
The assigned-glyph cache-label exception preserves free-glyph groups and all image/Inter/ink/relation
checks. Exact Dockerfile checksum→CRLF normalization→GNU patch→javac execution passes and its
classes are byte-identical to the isolated tested image. Normalized patched source SHA:
`d88f81110055c94a243a6fb213be24d0e96bf3a873dcfcd90cccc8a6c64e7e97`.

Root reran the full actual `AudiverisProcessor.process_pdf` chain from the Love PDF in the approved
network-disabled container, with the original900-second budget and concurrency1:
`bash run_processor_integration.sh /data/analysis/wedge-processor-verified-Jikic8 localhost/clairkeys-omr:wedge-postfix-f67677c`.
It exits0 and selects `output/wedge-retry-26pz_m6d/page/love.mxl`, with no remaining trigger.
Measure21 matches13/13,20 matches15/15 plus1/1 printed rest,22 matches10/10; all are exact4 quarters.

- Selected MXL SHA: `12d13fa44f1f7a187b88c4195dccea4fa4a015fa8e791f6bd979ca4606e508f1`.
- Selected OMR SHA: `d3c1770ddf3ee2ca7b16bd99205cdf1ce5b760c65c60baed3fc9b34c31a1339e`.
- Processor summary SHA: `c65b064e44ffc37b5c1c75416c5a7ae9d27b3f7cd548a328f143ea9c27d7c7bb`.
- Final root Python suite:145 tests pass in2.432s, log `root-python-final.log` in the ignored
  implementation evidence directory. Full Jest977, separate type/lint/build and four final engine
  controls are recorded above; no application TypeScript changed after those gates.
- Ordinary `git diff --check` flags three required single-space context lines inside the stored
  unified `.patch` artifact. Excluding only that artifact, the check is clean; its actual GNU patch
  application and compiled output were tested successfully. Those spaces are patch syntax.

Root collected the final163 files under `local-test-data/results/wedge-implementation-sol/vm-verified-final/`
and compared every hash to `vm-verified-final-manifest.json`: zero mismatches. The remaining five VM
staging directories (postfix build/case/controls and both processor runs) were removed after that
check. Combined with the earlier nine removals, no private input/staging copy from this implementation
remains. Production is still healthy on stock; test image tags remain isolated, not deployed.

Automatic approval review twice blocked code staging as potentially user-owned, even after the
worker identified its exact15 implementation paths. The user then explicitly approved the17-file
reviewed code/tests/fixture/plan/decision patch for stage/commit/PR, excluding settings/HANDOFF.
That blocker is resolved. Code commit `d35b14d` and decision-link commit `44dc0f7` are pushed on the
feature branch; review-ready PR145 exists. CI/review/merge state is tracked in `reviews/PR-145.md`.
No merge or rollout approval is implied.


## PR145 review corrections independently verified (2026-09-06)

Review5125082149 on44dc0f7 produced four findings. Codex Sol task `task_19e5e971fe76` implemented
only those corrections; root independently reproduced missing-grade/pitch TypeError, reviewed the
diff, ran tests, compiled the Java patch and reran actual processing. Commit
`f614245784b632b029ea7a6299555c3103da4ddc` contains the corrections:

- Original phase checkpoint explicitly marked Historical; current main HANDOFF/review log remains
  canonical while the phase plan itself is first introduced by this PR.
- Native retention requires a non-null source glyph. Actual compiled bytecode invokes getGlyph at
  offset648 and branches on null at651 before isRecovery, preventing source-less retention.
- XML float conversion is finite and bounded, with missing/malformed/non-finite attributes producing
  ValueError and the existing abstention result. Missing grade/pitch/y and non-finite cases are tested.
- Evaluator tests execute matching, missing and unexpected restEvents with their actual counters
  and exactness output. These isolate rest differences while retaining the measure length.

Root full Python suite:149 tests passed in2.443s (`root-pr145-review-python.log`). New patch SHA
`effac23a135fa14af9aebd88d452bbd02d5e9061565ec4b0b92086be46095348`; Python module SHA
`c3b62f2365b2cc004f1ec16b239945499ddfd7a0f7682f060b950ed2b4e012b0`.
The exact checksum/CRLF-normalize/GNU-patch/JDK25 compile path built isolated image
`c7326c16c31326a208c9485eb67eeaca32fc96cd490b5892728ccc583e237c34`, tag
`localhost/clairkeys-omr:wedge-pr145-effac23`; patched jar SHA
`cbaead72b2b03db8705d6af4c1ac2cf0679d7a5cd91283b0936ac20aa0e50977`.

Automatic review again blocked private-PDF staging; the user explicitly approved this PR's remaining
same-VM verification repetitions, including transfer/run/collection/deletion and no production changes.
Actual `bash run_processor_integration.sh /data/analysis/wedge-pr145-processor-RjCGpC localhost/clairkeys-omr:wedge-pr145-effac23`
then exited0, selected `output/wedge-retry-xuvaw2ne/page/love.mxl` and left no trigger. Results remain
exact21 13/13,20 15/15 plus1 rest,22 10/10, all4 quarters.

- MXL SHA: `14fe66ca8dc93bf71985023661b274b7a1e15e9d2970558c9f6182f24b59abab`.
- OMR SHA: `bbbb55df5fa4612b399836e1a93f2b90003e2ce5cbbe93e47028ea9b390fb5d6`.
- Summary SHA: `902ff5bb05828657222575a2f744f5b4a7529576719289e3ba2f45d594d03c13`.

All53 review-build/processor files were collected under
`local-test-data/results/wedge-implementation-sol/pr145-review-native/` and individually matched
`pr145-review-native-manifest.json`. Both new staging directories were removed; production remains
healthy and unchanged. The worker completed and its exact owned terminal was released, with archived
transcript retained. No active implementation worker remains.

All hosted checks on f614245 pass, including both E2E jobs. CodeRabbit's latest success status says
`Review skipped: manual review required for this OSS repository`; it is not a second automated
approval. Root independently verified the four fixes and resolved the corresponding four threads.
The original four findings are all addressed; no unresolved actionable review remains at this
checkpoint. Merge/rollout still require explicit PR145 approval.
