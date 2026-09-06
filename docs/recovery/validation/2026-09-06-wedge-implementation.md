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
