# Guarded whole-note recovery implementation

Date: 2026-09-06 KST. Code: `7ddf7cdbef86e8e691311847831870bc0eb9f059`.
Follow-up: `ef714c78ad9ddfdf7f4fe1128f5e5edc961fc09a` (voice-preservation hardening).
Plan/decisions: D-051/D-052, commits1af5ba6/a04a16d. No merge or production rollout in this record.

## Scope

Initial Bravura recognition is unchanged. Only pinned5.11.0,1–2-page,one-part/two-standard-staff,
uniform4/4 graphs with no whole heads and an empty terminal cautionary stack may retry the same full
PDF with Leland. No page filtering, DPI override, XML note insertion or default-font replacement.
Retry remains inside the original semaphore/deadline; rejection/error/timeout preserves original files
and result. Cancellation kills/waits and propagates. Existing meter retry remains separate.

Acceptance preserves existing printed measure numbers, pitched/rest events, bar lengths, key/meter,
tempo position, staff/clef/transpose metadata and old ties. It allows only graph-backed whole events
at onset0/duration4 and one new final measure containing whole notes on both staves. Additional ties
must form a contiguous pair touching an added whole. Graph evidence is bounded, nonempty foreground
RLE with unique glyphs; the count is checked globally, not a general image-to-XML alignment proof.
Voice identifiers are also preserved after ef714c7 because the converter keys sounding ties by voice;
this still is not full-score/voice certification.

## Regression-first and reviews

- Sol task016582e6c77e / dispatch ctx_4b91b7fe0790 implemented after failing missing-module regressions;
  reported16 focused/99 full Python tests passing. Coordinator owns integration, not delegated trust.
- Root CI-gate test first failed2 new missing-suite checks while5 old suite gates passed. File existence
  is asserted because unittest discovery otherwise succeeds when a suite is accidentally absent.
- Root independently reproduced accepting a changed trailing forward and moved tempo. Old measure
  length preservation plus tempo cursor/offset preservation now reject both. Added malformed glyph
  and bounded rational tests before fixing the corresponding gaps.
- One initial exponent regression mistakenly called the real Fraction allocator with a huge exponent;
  root stopped only its owned local test process PID78285 (exit143). The regression now mocks Fraction
  so it fails without allocating if the lexical guard is removed. No production process was involved.
- Luna final task271bcd5dffa9 / ctx_a78963bbdc63 reported no blocking findings after20 focused tests;
  its optional structural-metadata preservation suggestion was implemented regression-first. Root also
  requires the first measure's meter declaration. Final focused22 tests pass, including actual Love.
- All model work is settled; native Sol/Opus/Luna worker terminals released. AGY custom terminal
  release returned external_terminal/retained without process action. Details/provenance and earlier
  model errors: [experiment checkpoint](2026-09-06-whole-note-template-checkpoint.md).

Opus task4eb2bb5b2943 / ctx_53c9a49c5aec independently verified all8 whole heads at6/18/22/31,
including pitches/staves and four-quarter duration. Coordinator cross-checked the source. RH F#4/G#4
ties30→31 are printed but still absent from the candidate; LH G#3 tie is recovered. Printed21 has no
whole notes and its independent wedge-export exception persists. Do not adopt Opus's page-width /
embedded-image-width ratio as a scale measurement: the image is inset. Reports and complete source
references are recovered in Git-excluded local-test-data/results/whole-note-integrity/, not private memory.

## Local commands and results

Executed on the implementation branch before committing7ddf7cd:

```text
PYTHONPATH=omr-service python3 -m unittest discover -s omr-service/tests -p 'test_whole_note_retry*.py'
PYTHONPATH=omr-service python3 -m unittest discover -s omr-service/tests
npm test -- --runInBand
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Final22 focused /105 full Python tests PASS (no local skips);974 Jest tests in102 suites PASS.
Independent typecheck and lint PASS; build PASS. Build explicitly skips its own type/lint checks,
so those separate successful commands are required evidence, not inferred from build output.
Full Jest has non-failing React act/mock-service diagnostic logs; no failed tests are waived.

## Actual native wrapper verification

VM analysis copies only; production /app modules, service unit, secrets and stored scores unchanged.
Helper: local-test-data/results/whole-note-integrity/verify_wrapper.py. It invokes the real
AudiverisProcessor.process_pdf with timeout300, then the real canonical converter, without API
callbacks, user/sheet IDs or library writes. JVMs run sequentially. Module copies are under
/data/analysis/whole-heads-4jU02k/candidate-v1 and candidate-7ddf7cd.

| Case | Seconds | Retry selected | Canonical notes | Duration at reference60 |
| --- | ---: | --- | ---: | ---: |
| Love solo |86.752|yes|418|119.25|
| Satie original |34.718|no|239|135|
| Always With Me |50.718|no|647|127.5|
| Satie good300 engraving |25.564|no|283|141|

Love returned a separate whole-note-retry-* MXL with8 whole types and printed31 restored;21 remains
absent. Other cases each saved only one graph, proving no alternate JVM. These four runs precede the
last first-meter/structural-metadata-only guard hardening; an exact7ddf7cd Love rerun is pending below.
Normal-control notes and durations equal the prior API results exactly: Satie239/Always647/goodSatie283.
An initial comparison used the wrong Always filename and stopped; the corrected existing filename
always-with-me-animation.json passed. Existing Satie/Always recognition failures remain, not new passes.

The image-dependency test ran the candidate in a separate network-none container with /app/omr and
/app/tests overlays, existing fixtures/src mounted read-only. First103-test version passed with3 skips
(Git-excluded source diagnostics absent in that container). Final exact7ddf7cd:105 tests run,
102 passed/3 skipped in0.587s, exit0.
The skipped source comparisons are covered separately by real wrapper runs and local retained tests.

## Playback-input check and limits

```text
node --import tsx local-test-data/results/satie-2026-09-06/analyze_fingering.ts local-test-data/results/whole-note-integrity love-candidate
```

418 inferred fingers; pitch/onset/duration/hand preserved;0 simultaneous reach violations,
0 held-guidance conflicts and0 release hints. One measured conversion5.460ms is not a performance
benchmark. No browser audio, badge geometry or expert fingering certification was performed.

Remaining: printed21 exporter NPE, wrong lengths11/19/20, missing numeric tempo, RH final ties,
fermata and broader source accuracy. No stored score migration. Re-upload after an approved deployment
is still required to use the new recognition. All user-local originals/results stay Git-excluded.

## Final exact-code and cleanup checkpoint

Exact7ddf7cd native Love rerun PASS:87.042s, eight whole types,31 recovered,418 canonical notes,
duration119.25, tempo unknown and keyE. Selected path is wrapper-final-love/whole-note-retry-gsmt1hik/solo.mxl
under the VM analysis root; same two-JVM/one-deadline wrapper, unchanged production modules.
Final image-dependency suite PASS as above. After all14 local OMR copies matched remote SHA256,
removed only this analysis root's4 temporary PDFs and14 image-bearing OMR archives. A scoped find
returned no remaining PDF/OMR files; service active and no analysis JVM. User-local originals and
all copied checkpoints remain Git-excluded and recover the deleted staging copies. XML/JSON/logs and
candidate code remain on VM. Historical processing job8e33ffee… and unrelated data were not touched.
PR CI remains pending creation.

## Voice-continuity follow-up

After initial submission, root checked the actual converter: open ties are keyed by MIDI/voice.
Changing only a preserved note's voice or only the new tie stop's voice was accepted by the earlier
guard. Both rejection regressions failed before ef714c7 and pass afterward. The first test draft
incorrectly assumed synthetic fixtures already contained voice elements; corrected the fixture mutation
before recording the two behavioral failures. D-052 now explicitly preserves voice identity.

Final ef714c7:24 focused/107 full local Python tests and974 Jest tests PASS. Same dependency image:
107 tests run/104 passed/3 private-source skips, exit0. Existing typecheck/lint/build remain applicable:
the follow-up changes only Python guard/tests and its decision, no frontend or dependency behavior.
The exact native wrapper run above remains7ddf7cd; ef714c7 changes only acceptance strictness, not any
JVM command. The same retained native Love pair passes the final guard with all old voice-tagged raw
events preserved (0 removed/+8 whole additions). No PDFs were re-uploaded and no production change.

Final ef714c7 hosted checks all PASS, including both E2E jobs. Bounded independent Luna follow-up
review found no actionable issue and passed24 focused tests. CodeRabbit covered c32bde7 with no
actionable code comments; its ef714c7 incremental review is quota-limited, not passed. PR-description
advisory fixed and generic docstring-percentage advice explicitly dispositioned. See PR144 review log.
No target merge/rollout approval has been received; no production change.
