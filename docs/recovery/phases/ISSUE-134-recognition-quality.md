# ISSUE-134 — PDF에서 MusicXML을 만드는 인식 단계 개선

Status: `IN_PROGRESS`
Depends on: #134 same-input VM reproduction, D-048 diagnostics

## Progress

- 2026-09-06: User-approved PR142 merged as `79a2328`, delivering only D-049's guarded internal meter
  retry. Full963 Jest/final VM77 tests and final PR CI passed; exact merged-commit deployment is underway.
  Missing dots/ties and beginning-tempo placement remain unresolved; this phase is not DONE.
- 2026-09-06: All merge-commit gates passed. Exact Docker-format image built and image-internal77 tests
  passed. Auto-review blocked current-tag/restart because separate production rollout approval was absent.
  Production remains unchanged; request deployment/restart approval, then recheck idle state before cutover.
- 2026-09-06: User separately approved rollout; exact79a2328 image now runs active/healthy. Restart,
  image equality, external health/auth and real production-module PDF smoke verified (28.704s,9/8,
  163 notes, one overflow). First-bar6/10 and beginning-tempo null remain, so the overall phase stays
  IN_PROGRESS. Live-smoke PDF/image checkpoints removed; diagnostic XML/JSON retained.
- 2026-09-13: PR159 submitted, not merged or deployed. Full 17-bar source reference (191 events, 43 tie
  starts, opening ♩=69@0) and evaluator categories pin the production result at 143/191, exact bars
  8/15/16/17, ties 23/43, pitch errors 0; remaining defects are dots/tuplets/voices/ties. D-060 reads the
  rest-anchored Largo mark as the opening tempo (null → 69). Engine-level dot/tie work needs VM approval;
  the phase stays IN_PROGRESS.
- 2026-09-13: PR159 merged as `e5ee7bb` on explicit approval (post-merge checks 6/6); not deployed.
  User-approved isolated VM stage run traced dots: LINKS deletes 8 SYMBOLS dots via a line-line third
  chord linking only one dot then `countDots` rint(0.5)=0 (plus one tie-cut dot in m1). Ties are fixed at
  CURVES: 10 undetected, 5 cross-system mis-pairings, 1 slur misclassification. No fix adopted yet.
- 2026-09-13: User-approved OMR VM rollout of `e5ee7bb` (image `bd2d5e6e…`, rollback tag
  `rollback-pr159-20260913`). Image tests 172 OK/6 skipped; health 200, unauthorized 401. Production
  smoke: 163 notes, tempo/scoreTempo 69 (was null), 143/191 events unchanged. Dots/ties remain; IN_PROGRESS.
- 2026-09-14: PR161 submitted (D-062), not merged or deployed. lookupHeadLink now prefers the head below
  the dot within the first chord, so both line-third dots survive. Local amd64 main-vs-patched images over
  13 PDFs: 9/12 identical, 3 gain only source-confirmed line-third dots; Clair 143 → 153/191 (missing-dot
  12 → 4), stable over 3 runs while stock varied 143/141. Ties, m1 RH tie-cut dot and tuplets remain.
- 2026-09-14: PR161 merged as `34f9e7e` on explicit approval (PR checks 16/16, post-merge 6/6). Review
  added a native line-third fixture (stock fails 3/3, patched passes 3/3; image suite 174 OK). Not deployed;
  VM rollout needs separate approval. Branch kept because a user uncommitted change remains.
- 2026-09-14: User-approved OMR VM rollout of `34f9e7e` (image `71594a4a…`, rollback tag
  `rollback-pr161-20260914`). Image tests 174 OK/6 skipped with the native line-third dot test passing (not
  skipped); patched class present in both engines; health 200, unauthorized 401. User re-converted Clair in the
  app (job `21171e30…`, 163 notes; its MusicXML is deleted by the service). User-approved production smoke:
  153/191 events (was 143), missing-dot 12 → 4, tempo 69; MusicXML equals the local patched result apart from
  identification metadata. Player listening, ties and remaining dots pending; IN_PROGRESS.
- 2026-09-14: Tie investigation (local only, no code change). Ties are unchanged by PR161 (20 missing).
  All 10 "no curve" misses are LH lens-shaped ties tangent to staff lines. Mechanism A (3): purgeStaffLines
  deletes the candidate as a staff line ending. Mechanism B (7): the curve survives, but its ends are absorbed
  into staff lines 2.2+ IL from heads (detected ties ≤1.1 IL; coverageHExt 2.0 IL), so ClumpPruner selects
  nothing. Evidence: log-only diagnostic build. Fix direction not chosen.
- 2026-09-15: User chose candidate 1 (extend head linking for curve ends absorbed into staff lines; targets
  mechanism B only). Work starts on `codex/issue-134-tie-head-link` in the same worktree; verification is
  delegated to a Codex worker (`gpt-5.6-sol`, effort high). PR160/PR161 branches were deleted after confirming
  both tips are contained in main.
- 2026-09-15: D-063 implemented on `codex/issue-134-tie-head-link` (`3876875`, not pushed). Codex worker verification:
  PASS WITH CONCERNS. Full image 176 OK, fixture stock 0/8 vs patched 8/8, Clair ties 23 → 29/43 (missing 20 → 14,
  unexpected and 153/191 events unchanged, deterministic). Corpus 10/12 identical; Love's first patched run lost m21
  (30-measure fallback, D-054 guard failed on an m27 articulation) while 3 reruns and 3 dot-link runs did not. Open: Love
  baseline repeats and the LINKS tie-demotion path. No PR yet.
- 2026-09-15: Love determinism repeats (sequential, alternating): fallback dot-link 0/6, patched 0/6, identical outputs;
  D-063 candidates on Love 0; the first-run fallback differed only by one m27 tenuto. Likely engine nondeterminism, not
  proven. Remaining before PR: user decision on the LINKS tie-demotion path, patch whitespace cleanup.
- 2026-09-15: User accepted the LINKS demotion path as D-063 decision 4. PR162 merged as `0a22d2f` on explicit
  approval (PR checks all pass, Codex review no findings, post-merge 6/6); branch deleted. OMR VM rollout separately
  approved and in progress. IN_PROGRESS.
- 2026-09-15: User-approved OMR VM rollout of `0a22d2f` (image `f5959ea9…`, rollback tag `rollback-pr162-20260915`).
  Image tests 176 OK/6 skipped with both native tie and dot tests passing; patched curve classes in both engines;
  health 200, unauthorized 401. Production recognition not yet checked (needs app re-conversion or approved smoke). IN_PROGRESS.
- 2026-09-15: User-approved production module smoke (`pr162-live-pkmvlC`): Clair 9/8, 157 notes (tied continuations merged),
  tempo 69, 153/191 events and categories unchanged, tie starts 23 → 29/43 (missing 20 → 14, unexpected 2), exact bars
  2/4/8/11/15/16/17 (were 8/15/16/17); MusicXML equals the local verified result apart from metadata. PDF/OMR removed.
  Remaining: mechanism A (3), m12 crossing (1), cross-system (5), slur misclassification (1), rhythm-derived (4). IN_PROGRESS.
- 2026-09-15: The user does not read scores and cannot identify wrong spots by listening, so player listening is no longer a
  pending user step; progress is judged by the source reference evaluation named in the completion criteria.
- 2026-09-15: Onset investigation (final graph only, no code change). The 26 onset errors sit in m3/m5/m7/m9: m7 dot
  between heads of two different chords linked to the upper head (D-062 excluded case); m5/m7 second-apart lower-voice
  heads right of the stem missing; m5 void F4 head replaced by a TUPLET_THREE at its position; m9 LH beam absent where a
  long tie runs along it; m3 duplet "2" has no Audiveris shape. Fix direction not chosen.
- 2026-09-15: User chose mechanism A first. D-064 (replaces D-062 decision 2) implemented on `codex/issue-134-cross-chord-dot`
  (`deb3708`, not pushed): the head below the dot wins across all candidate chords. Codex worker (`gpt-5.6-sol` high): PASS WITH
  CONCERNS. Image 177 OK/skip 0; new fixture d063 3/3 fail vs d064 3/3 pass; Clair 153 → 160/191 x3 (only m7; ties 29/43, tempo 69);
  corpus 10/12 identical, Love nondeterminism, truongca same existing failure. Concerns: lower-voice dot-below convention and
  different-abscissa candidates chosen by order, not grade (0 corpus cases). Needs user decision before PR. IN_PROGRESS.
- 2026-09-15: User accepted both concerns as D-064 decision 5 (known limits). PR163 opened non-draft (head `220f6d7`), not merged
  or deployed; merge and VM rollout each need explicit approval. IN_PROGRESS.
- 2026-09-15: PR163 merged as `0e3dc61` on explicit approval (PR checks all pass, Codex review no findings, post-merge 6/6); branch
  deleted. User-approved OMR VM rollout: image `2a71ede5…`, rollback tag `rollback-pr163-20260915`. Image tests 177 OK/6 skipped with the
  native cross-chord dot test passing; dot class hash equals the locally verified build; health 200, unauthorized 401. Production
  recognition not yet checked (needs app re-conversion or an approved smoke). IN_PROGRESS.
- 2026-09-15: User re-converted Clair in the app after the rollout (job `03f3153e…`, generated 20:54 KST). Its stored animation JSON has
  157 notes identical field-by-field to the locally verified d064 run, and differs from the previous production result only in m7's 14
  notes (C4 regains its dotted half, E4 becomes a plain eighth, the following 12 notes move back by 0.25 beat). The full-reference
  160/191 was not re-evaluated in production because the service deletes the MusicXML. IN_PROGRESS.
- 2026-09-16: Mechanism D stage trace (local only, no code change). BeamsBuilder creates the m9 LH beam at 1805-1903, then
  `extendToSpot` stretches it to 1920 into the long tie curve's blob (grade 0.550 -> 0.528). The real right stem is then 21px inside,
  so computeBeamPortion calls it CENTER, the stretched end has no stem (`Cannot link both sides`), and SigReducer's
  checkBeamsHaveBothStems deletes the beam at REDUCTION, turning two eighths into quarters. Fix direction not chosen.
- 2026-09-16: User approved candidate 1, then candidate 1+ after the guard alone changed nothing. D-065 implemented on
  `codex/issue-134-m9-beam-extension` (`362a00f`, not pushed): refuse a spot extension at an anchored end, and pull a beam end
  back to the stem seed just inside it. Experiment image: fixture 0/4 on the baseline vs 4/4 patched; Clair 160 -> 171/191 in 3
  identical runs, only m9 changes. Codex worker stopped after check 4 at the user's request: integrity pass, build pass
  (BeamsBuilder class differs from baseline), image tests 179 OK/skip 0; one review concern (a normal beam whose end seed is
  undetected could be trimmed). Checks 5-8 (fixture discrimination, Clair, corpus, timing) remain. IN_PROGRESS.
- 2026-09-17: D-065 was moved off main. The engine change had been committed directly to `main` (`362a00f`) with only checks 1-4
  done, so the user had it reverted (`1391c4d`) and cherry-picked onto `codex/issue-134-m9-beam-extension` (`b59ea08`). The first
  full verification then FAILED: in Deborah's Theme m24 a slur crossing a beamed group's stems was trimmed back and kept as a beam,
  duplicating the group, losing the printed D#4 and shortening the measure by a beat, which moved 127 of that score's 330 canonical
  starts. Adding a thickness floor (D-065 decision 3b, 0.95 of the sheet's typical beam) removed it (`bea1431`). A second, from-scratch
  eight-check independent verification came back PASS WITH CONCERNS: image tests 180 OK/skip 0, new fixture discriminates 3/3 each way,
  Clair 171/191 three times with only m9 changing, all eleven comparable corpus scores identical to D-064, Deborah `events.json`
  byte-identical. Concerns are Medium 3 / Low 2 with no executed regression. IN_PROGRESS.
- 2026-09-18: The user chose option (a) — record the concerns as known limits and open the PR as verified. D-065's entry was corrected
  first (`c36f26b`): the worker had disproved the coordinator's hypothesis that the guard refuses genuine beams at 1.01 of typical, so
  the confirmed mechanism replaced it (a refused candidate stays in `rawSystemBeams`, STEMS reads the shared stem as CENTER, REDUCTION
  drops both — landing on D-064's exact output), and all five concerns became explicit known limits. Branch pushed and
  [PR164](../reviews/PR-164.md) opened non-draft at `c36f26b`. Not merged, not deployed; production stays PR163 `0e3dc61`. IN_PROGRESS.
- 2026-09-18: PR164 merged as `bbcc09b` on explicit approval. Before merging, the head `c36f26b` was re-checked: all hosted checks
  pass, zero reviews and zero inline comments, Codex's automated review completed with no findings, `mergeStateStatus=CLEAN`. The
  merge used `--match-head-commit` and carried a Lore-format message, so unlike PR163 the merge commit holds its trailers, including
  a Directive that this approval does not cover the VM rollout. Both branch tips held zero unique commits against main but the branch
  was kept because a user uncommitted change remains. **Not deployed** — production is still PR163 `0e3dc61`, so D-065 is not in the
  running engine and Clair's expected 160 -> 171/191 has not been observed in production. IN_PROGRESS.
- 2026-09-18: User-approved OMR VM rollout of `bbcc09b` (image `9eef7512…`, rollback tag `rollback-pr164-20260918`). Preflight found
  no JVM running and the deploy checkout clean; the build applied all five patches with every sha256 `: OK` and no rejected hunk.
  Image tests 180 OK / 6 skipped, with both new beam native tests running rather than skipped, and the three older native tests too.
  Before the cutover the patched `BeamsBuilder.class` was compared: both the normal and recovery jars hash to `8d15e1b2…`, the same as
  the local build that produced Clair 171/191, while the outgoing image hashed to the recorded D-064 baseline `324132f0…`. After the
  restart: healthy container, health 200, unauthorized 401, zero error/traceback lines in the service journal. Production recognition
  is **not yet checked** — the rollout approval did not include a PDF smoke, so it waits on an app re-conversion. IN_PROGRESS.
- 2026-09-18: User re-converted Clair in the app after the rollout (job `57da14f3…`, generated 11:45 KST, after the 11:27 cutover).
  Its stored animation JSON has 157 notes identical field-by-field to the worker's locally verified d065 run, the same run that scored
  171/191, so the deployed engine reproduces the verified result. Against the previous production result the change is confined to m9:
  E3 falls from four eighths to two, G3 from two to one, and the following 73 notes all shift earlier by exactly one eighth
  (0.434783s at 69bpm), shortening the piece from 65.435s to 65.000s. No pitch, hand or staff changed; only voice ids were renumbered
  around m9, and local verification renumbers them the same way. Measures 1-8 are untouched, so D-062/D-063/D-064 are preserved. The
  full-reference 171/191 was not re-evaluated in production because the service deletes the MusicXML. IN_PROGRESS.
- 2026-09-18: Stage traces settled both of m5's losses. The empty F4 head is detected at HEADS and links to the shared stem with the
  best head-stem grade on it, then REDUCTION's analyzeChords excludes heads of different intrinsic duration on one stem and the void
  head loses to the black eighth on contextual grade; SYMBOLS only then reads the leftover ink as a triplet. The second F4 is a
  different rule: pruneStemHeads cuts a head sitting at a stem end on the non-canonical side, which is how a second is engraved, and
  checkHeads deletes it for having no stem, although checkHeadSide keeps exactly that shape when it runs. Both confirmed by VIP logs
  and 300dpi crops; the two 2026-09-15 guesses were wrong.
- 2026-09-18: User chose the second-interval fix (mechanism B). D-066 gives pruneStemHeads the neighbour test checkHeadSide already
  uses, before the cut rather than after. The range had to be exactly one step: reusing checkHeadSide's pitch-1..pitch+1 also spared a
  head at the same pitch on the other side, and the corpus showed that emitting a note twice, losing Merry Go Round m18's D5 and
  Premiere Gymnopedie m16's dot. Narrowed, Clair goes 171 -> 173/191 over three identical runs with the raw event hash unchanged from
  the wider attempt, only m5 and m7 differ, ties and tempo hold, and all eleven comparable corpus scores stay byte-identical. Image
  tests 182 OK/skip 6 with the new native fixture discriminating against the production-equivalent build. [PR165](../reviews/PR-165.md)
  merged as `f5be5f9` on explicit approval (post-merge checks 6/6).
- 2026-09-18: User-approved OMR VM rollout of `f5be5f9` (image `4c14123d…`, rollback tag `rollback-pr165-20260918`). Preflight found no
  JVM running; the build applied all six patches with every sha256 `: OK` and no rejected hunk. Image tests 182 OK/6 skipped with all
  six native tests running. Before the cutover the patched `SigReducer.class` hashed to `da3b0721…` in both jars, matching the local
  build that produced 173/191, while the outgoing image matched the recorded baseline. After the restart: healthy container, health
  200, unauthorized 401, zero error lines in the journal. Production recognition is **not yet checked** — the rollout approval did not
  include a PDF smoke. Mechanism C is untouched. IN_PROGRESS.
- 2026-09-18: User re-converted Clair after the rollout (job `df02092f…`, generated 22:24 KST, after the 18:44 cutover); its job id came
  from the VM container log since no URL was given. The stored animation's 159 notes match the locally verified d066b run field for
  field, the run that scored 173/191. Aligned against the previous production result by pitch, length and hand, only three things
  change: m5's G4 dotted eighth becomes the F4+G4 second, m7 gains its C4, and 110 later notes move half an eighth later onto their
  correct beats, which is m5's left-hand chord landing on the sixth eighth and the piece growing from 149.5 to exactly 150 eighths.
  Full-reference 173/191 was not re-evaluated in production because the service deletes the MusicXML. IN_PROGRESS.

- 2026-09-18/19: Mechanism C. The kept void head needed two changes, not one. A twelve-score census of 5,400 void heads found that
  only 160 overlap no black head and their grades split cleanly (none between 0.413 and 0.555); cropping all eighteen above 0.40 showed
  the seventeen above the gap are printed half notes, sixteen of which already survive, so the approved criterion changes only Clair's
  #1583. Keeping it alone left Clair at 173: the engine chorded it with the beamed eighth and read the chord's duration from it, a
  quarter, pushing m5's right hand half a beat. Taking a beamed chord's duration from its black heads, after the engine's own mirror
  exception, fixed that. Clair 173 -> 182/191 over three identical runs, only m5 changing; corpus byte-identical; image tests 184
  OK/skip 6. [PR166](../reviews/PR-166.md) merged as `b15d0fd` (post-merge 6/6); Codex's one P2 about the validation record's absence
  from the branch tree was answered and not applied under the records-on-main convention.
- 2026-09-19: User-approved OMR VM rollout of `b15d0fd` (image `721ccc10…`, rollback `rollback-pr166-20260919`). Build applied all
  eight patch lines with ten sha256 `: OK`; image tests 184 OK/6 skipped with all seven native tests running. Both patched classes,
  `SigReducer` `3b84596b…` and `AbstractChordInter` `91081cfa…`, matched the local verified build in both jars before the cutover.
  Health 200, unauthorized 401, zero journal errors. Production recognition not yet checked. Remaining m5/m7 dotted notes still
  come out eighths until the void head gets a chord of its own. IN_PROGRESS.

- 2026-09-19: User re-converted three scores after the rollout (Clair job `cfc0808d…`, 00:53 KST, after the 00:45 cutover; job ids from
  the VM log). Clair's 160 notes match the locally verified d067b run field for field, the run that scored 182/191. Against the
  previous production result only m5's right hand changes: the triplet A4/B4 at two-thirds of an eighth give way to the restored F4
  and to A4 and B4 as whole eighths, the B4 tied in from m4 grows from 6.67 to exactly 7 eighths, and seven later notes move one eighth
  onto their beats. Love Affair and Deborah keep their note counts. IN_PROGRESS.

- 2026-09-19: User authorized D-067 follow-up through local Docker verification and a review-ready PR, excluding merge/rollout.
  Candidate `1ee36a3` on `codex/issue-134-shared-stem-chord-split` separates long chords while preserving stem relations.
  Baseline freshly measures 182/191 and 30/43 ties; the latest experiment measures 185/191 and 30/43. Final image tests,
  corrected reload fixture, three runs, corpus and PR gates remain. [Validation](../validation/2026-09-19-issue-134-shared-stem-chord-split.md).

- 2026-09-19: Candidate `a9f2d35` final Docker image scores 185/191 and 30/43 ties in three identical runs, changing only m5/m7.
  Native tests (including reload) pass. The first full suite missed repository-root fixture mounts (47 file-not-found errors);
  a corrected full run and paired 12-score corpus comparison are pending. Not merged or deployed.

- 2026-09-19: Corrected full image suite passes: 186 total, 180 passed, 6 skipped (retained local diagnostics absent); all nine native tests run.
  Paired baseline/candidate runs over all twelve corpus PDFs have started. PR/merge/deployment remain pending.

- 2026-09-19: Local D-068 verification complete at `63487c0`: all twelve corpus PDFs rerun on both images; eleven successes are raw-byte
  identical and animation-identical except generated_at, while truongca fails at the same page3 SCALE exception on both. No new regression.
  Final diff self-reviewed; limitations recorded. Next: non-draft PR and current-head CI/review. Not merged or deployed.

- 2026-09-19: [PR167](../reviews/PR-167.md) opened non-draft at `63487c0` after local gates and self-review. Current-head CI and automatic
  review are pending; no merge or rollout approval. The overall recognition-quality phase remains IN_PROGRESS.

- 2026-09-19: PR167 final head `cacce3a` fixes the cross-staff-group review finding, with a native graph regression failing before/passing after.
  Latest image: 181 passed/6 skipped, all10 native tests run; Clair185/191 and ties30/43 over3 identical reference-evaluated runs;
  latest corpus11 identical successes plus the same page3 SCALE failure. Required CI (both E2E workflows) passes and Codex rereview has
  no new findings. Both threads resolved; the incorrect Lore report was rejected with actual commit API evidence. Implementation/PR goal
  complete; merge and production rollout remain unapproved. Overall phase stays IN_PROGRESS. [Review](../reviews/PR-167.md).

- 2026-09-19: User explicitly approved PR167 merge, branch cleanup and VM rollout. PR167 merged as `983caf9` after live head/CI/review checks.
  Both branch tips were ancestors of main and were deleted on the explicit cleanup instruction; the user's uncommitted history note is hash-identical.
  Exact-merge VM image build is in progress. Production remains PR166 until the verified cutover. IN_PROGRESS.

- 2026-09-19: Authorized PR167 VM rollout completed at10:05 KST: exact merge983caf9, imageb28cc02d… and rollback721ccc10….
  Merge checks6/6 pass; VM image181 passed/6 skipped with all10 native tests running; all four patched classes match local d068b in both engines.
  Service active/healthy, public health200 and unauthorized401, zero post-cutover journal errors. Env/unit and processing data preserved.
  Production PDF reconversion remains unverified; do not report local185/191 as a fresh production evaluation. IN_PROGRESS.
  [Deployment](../validation/2026-09-19-d068-shared-stem-chord-deployment.md).

- 2026-09-19: m1 dot follow-up started on a fresh branch. Baseline185/191 and ties30/43 reproduced.
  Original dot ink is disconnected from the tie, but the curve glyph includes portions of both dots.
  Both dot inters exist and link at SYMBOLS; both disappear by LINKS. Fixture and deletion trace pending.
  [Evidence](../validation/2026-09-19-issue-134-m1-tie-cut-dots.md). IN_PROGRESS.

- 2026-09-19: D-069 initial candidate df3f1af protects isolated dot ink only during slur erasure.
  Native positive fails on both baseline engines; candidate27 pixel cases pass. Experimental Clair187/191,
  tie lists unchanged30/43, only m1 improves. Full image/corpus/PR gates pending; IN_PROGRESS.

- 2026-09-19: D-069 full Dockerfile image built; source/class integrity matches in both engines.
  Image182 passed/6 diagnostic skips; all11 native tests ran. Types/lint/Jest1038 pass after correcting
  host Python dependency selection. Three final Clair runs and12 corpus pairs are underway. IN_PROGRESS.

- 2026-09-19: Final image Clair3/3 scores187/191 and ties30/43 with identical raw output.
  Only m1 C5/E5 duration and dots change; other fields/measures and individual tie lists are preserved.
  Corpus pairs running; no PR yet. [Evidence](../validation/2026-09-19-issue-134-m1-tie-cut-dots.md). IN_PROGRESS.

- 2026-09-19: D-069 local gates complete, head56736f7. Twelve freshly paired corpus runs yield11
  identical successes and1 identical page3 SCALE failure (99 exception-chain lines equal). Baseline negative
  controls48/48 pass. Next: non-draft PR and latest-head CI/automatic review. IN_PROGRESS.

- 2026-09-19: [PR168](../reviews/PR-168.md) opened non-draft at56736f7 after local gates.
  Current-head CI/automatic review pending; merge/deployment remain unapproved. IN_PROGRESS.

- 2026-09-19: PR168 Codex review completed on56736f7 with no findings (+1 and0 threads verified).
  CodeRabbit skip is not counted as review. Unit/type/lint/security checks pass; required E2E2 pending. IN_PROGRESS.

- 2026-09-19: Final committed diff check found whitespace-only context lines in patch0009.
  Head2458daf removes them; rebuilt d069b runtime40,909 files/JAR entries and74 package versions are
  identical. New image suite/Clair repeats and latest-head CI/Codex rereview underway. IN_PROGRESS.

- 2026-09-19: Codex rereview explicitly completed on2458daf with no findings; GraphQL threads0.
  Clean-image suite/repeats and current-head E2E remain in progress. IN_PROGRESS.

- 2026-09-19: Latest d069b image again passes182/6 diagnostic skips with all11 native tests run.
  Three additional Clair runs score187/191 and ties30/43 with identical raw output and preserved tie lists.
  Codex rereview done; current-head E2E2 remains. IN_PROGRESS.

- 2026-09-19: PR168 current head2458daf passes every required check, including both E2E workflows
  (8m27s/8m18s), and completed Codex rereview has no findings/threads. Final image182 pass6 diagnostic
  skips, all11 native run, Clair187/191 x3 with ties30/43, corpus11 identical successes plus1 same failure.
  m1 implementation/PR goal complete. Merge/deployment remain unapproved; overall phase IN_PROGRESS.
  [Review](../reviews/PR-168.md), [validation](../validation/2026-09-19-issue-134-m1-tie-cut-dots.md).

- 2026-09-19: User explicitly approved PR168 merge. Rechecked head2458daf required CI, completed
  Codex review/zero threads and CLEAN/MERGEABLE; merged as6de51f1 and fast-forwarded local main.
  Both branch tips are contained, but retained under WORKFLOW because the user history note remains
  modified and hash-identical. Post-merge CI pending. No rollout approval; phase IN_PROGRESS.

- 2026-09-19: PR168 merge6de51f1 post-merge checks6/6 passed, including E2E/build. Merged
  application/engine/fixture code matches reviewed2458daf exactly. User changes and both branches
  preserved; no production rollout. Overall phase stays IN_PROGRESS.

- 2026-09-19: User explicitly requested branch cleanup and VM rollout for PR168. Both contained
  branch tips were deleted with the user note hash unchanged. Exact6de51f1 VM build underway; current
  service still PR167 until verified cutover. IN_PROGRESS.

- 2026-09-19: VM imagef14c2f83 for exact merge6de51f1 built with15 checksums OK and13 patch applications.
  Full image suite running; old service remains healthy atb28cc02d. Production env/unit preserved. IN_PROGRESS.

- 2026-09-19: VM image182 pass/6 diagnostic skips, all11 native executed;10 classes and sources
  match local verification. Cutover to6de51f1/f14c2f83 at12:01:17 KST, rollbackb28cc02d retained,
  active/healthy and external200/401. Temporary original-score module smoke underway. IN_PROGRESS.

- 2026-09-19: Authorized PR168 rollout complete at12:01:17 KST (6de51f1/imagef14c2f83), rollbackb28cc02d.
  Full VM suite182 pass6 diagnostic skips, all11 native run;10 classes/sources match local. Active/healthy,
  external200/401, zero journal errors. Running-container Clair smoke187/191 and ties30/43, m1 exact,
  raw/evaluation identical to local and animation equal except timestamp. Temporary PDF/OMR3 removed;
  production env/unit/data and user note preserved. Web upload/callback/player E2E not run. IN_PROGRESS.
  [Deployment](../validation/2026-09-19-d069-m1-dot-deployment.md).

- 2026-09-19: m3 duplet work starts from latest main ff88b8d on codex/issue-134-m3-duplet.
  Fresh d069b baseline confirms187/191, ties30/43, raw191/canonical160/tempo69.
  CURVES/SYMBOLS/LINKS traces show the printed2s absorbed by slur glyphs; the engine also lacks
  a duplet shape/factor. Native regression cdb43d9 fails on both baseline engines before implementation.
  Recognition experiments and all implementation/validation/PR gates remain. IN_PROGRESS.
  [Evidence](../validation/2026-09-19-issue-134-m3-duplet.md).

- 2026-09-19: D-070 candidate1f4816c uses original-ink digit competition on eligible two-chord beams
  after meter assignment, then native tuplet links/factor. Experimental Clair191/191, ties31/43 and
  unexpected0; onlym3 evaluation changes. Both engines pass204 ink+24 meter controls. Final Dockerfile
  build, added geometry guards, full suite/repeats/corpus/PR gates remain. IN_PROGRESS.

- 2026-09-19: D-070 full Dockerfile imagefecb4f29 built from1f4816c. Source matches;24 changed
  JAR entries match between engines and all other entries/models match baseline. Image183pass/6diagnostic
  skips, native12all executed; type/lint/Jest1038pass. FinalClair3runs/corpus12pairs in progress. IN_PROGRESS.

- 2026-09-19: Final d070 Clair3/3 scores191/191 and ties31/43, unexpected0, same raw hash.
  Only four m3 normalized events and three canonical notes differ; divisions2→4 explains other raw integers.
  All52 curves/glyphs/tie flags unchanged. Direct diff self-review recorded; corpus and PR gates pending. IN_PROGRESS.

- 2026-09-19: Self-review found the new native harness could pass with only one installed engine.
  e9e43af requires both whenever either exists and uses literal meter controls; engine code is unchanged.
  d070b full rebuild/runtime comparison and missing-engine control/full suite/repeats are pending, queued
  after corpus to keep one score-processing JVM. IN_PROGRESS.

- 2026-09-19: Corpus12 fresh pairs complete:11 identical raw/canonical successes,1 same page3 SCALE
  failure with identical99-line exception chain. d070b rebuilt;40,919 runtime entries differ only in3 harness
  files, Python74packages/dpkg/engine JARs unchanged. Missing-recovery control fails as required and normal
  dual-engine native passes; self-review fix verified. Held-out fonts279 negatives rejected,13/27 twos recognized
  (14 abstentions, not counted as positives). Final repeated suite/Clair and PR gates remain. IN_PROGRESS.

- 2026-09-19: Local D-070 gates complete at1debdbb. Final d070b repeats183pass6diagnostic skips/native12run,
  Clair191/191 x3 ties31/43 unexpected0 with identical raw output and52 curves preserved. Full corpus/runtime
  equality and all known limits recorded. Self-review finding fixed; next is non-draft PR/latest-head CI and
  actual review. No merge or deployment approval. Overall #134 stays IN_PROGRESS.

- 2026-09-19: [PR169](../reviews/PR-169.md) opened non-draft at1debdbb after all local gates.
  Current-head CI and actual Codex review are running. CodeRabbit skip is not counted as review.
  No merge or production approval; #134 remains IN_PROGRESS.

- 2026-09-19: PR169 Codex actual review completed on1debdbb at05:44:53Z;bot+1,zero inline comments
  and zero review threads verified. No actionable finding. Unit/type/lint/security checks pass; both required
  E2E jobs remain in progress. Review skip is not counted. IN_PROGRESS.

- 2026-09-19: PR169 goal gates complete at1debdbb:all required CI passes(E2E7m52s/8m30s),hosted
  Jest105suites1038tests verified,Codex actual review completed with+1/zero inline comments/zero threads,
  non-draft/CLEAN/MERGEABLE. Localfinal image183pass6diagnostic skips/native12run,Clair191/191x3,
  ties31/43 unexpected0,corpus11identical successes+1sameSCALEfailure. m3 goal complete;12 missing ties
  remain and overall#134 is IN_PROGRESS. Await explicit PR169 merge approval;no VM change/deployment.
  [Review and CI](../reviews/PR-169.md),[validation](../validation/2026-09-19-issue-134-m3-duplet.md).

- 2026-09-19: User explicitly approved PR169 merge, branch cleanup and VM deployment. Rechecked
  head1debdbb required CI/completed actual review/zero threads/CLEAN; merged as9e4020a. Both branch tips
  are contained withzero unique commits,deleted remote→main→local under the explicit cleanup instruction;
  userhistory hash unchanged. Exact-merge VM build underway,oldPR168 healthy/idle,post-merge CI pending.
  [Deployment](../validation/2026-09-19-d070-duplet-deployment.md). Overall#134 stays IN_PROGRESS.

- 2026-09-19: Exact merge9e4020a post-merge checks6/6pass. VMimage850a4143 built with23checksums/
  21patch applications;each engine's2433JAR entries and all source/font binaries match locald070b.
  OS package24version differences are recorded rather than calling images identical. VMwhole-suite running,
  productionstillPR168;env/unit/existingdata fingerprints preserved. IN_PROGRESS.

## Objective

경고 추가를 완료로 삼지 않고, 동일 PDF를 새로 업로드했을 때 잘못된 박자 기호·누락 음표·음가가
실제로 개선되는 인식 경로를 찾고 검증한다. 기존 저장 악보의 소급 수정은 필요하지 않다.

## Baseline

- `Clair_de_Lune_easy_300dpi.pdf`: A4, 2480×3508 RGB JPEG 1장, 실제 300dpi; staff interline 약 20px.
- 원본 박자 9/8, 점4분음표=46. 기본 Audiveris 5.11.0 출력은 6/8, canonical 133음.
- 엔진 로그는 17개 마디 전부 `no correct rhythm`을 보고한다. D-048의 export 진단은 초과 마디 10개를 잡는다.
- 9/8은 이 엔진 버전의 기본 지원 목록에 있다. 미지원 박자 또는 단순 저해상도라고 단정하지 않는다.
- 원본 PDF는 임시 분석 위치에서만 사용하고, 지속 근거는 허용된 XML/JSON·해시·텍스트 계측에 둔다(D-040).

## Work stages

1. 실제 이미지와 인식 후보/로그를 대조해 실패 기전을 좁힌다.
2. 입력 scale/이진화, 음표 template 및 박자 후보 선택을 한 변수씩 제한된 VM 실험으로 검증한다.
3. 원본에서 읽은 기준 이벤트를 먼저 고정하고, 후보 결과를 비교한다. 경고 개수만 줄이는 것을 성공으로 보지 않는다.
4. 개선이 입증된 일반화 가능한 정책만 런타임에 넣고 회귀·비용·실패 복구를 검증한다.
   - D-049의 보수적인 6/9 재판독 후보를 먼저 격리 검증한다. 두 보표의 이미지 근거와 기존 리듬
     모순이 모두 있을 때만 내부 그래프의 박자 해석을 재시도하며, 점음표/붙임줄 전체 해결과 구별한다.
5. 별도 PR·CI·판단에 따른 병합 후 VM 배포 및 동일 입력 재검증을 수행한다.
- 2026-09-17: D-065(m9 왼손 빔) 1차 독립 검증은 corpus에서 **FAIL**이었다. Deborah's Theme m24에서 빔 위를 지나는 슬러가
  잘린 뒤 두 번째 빔 그룹으로 남아 세 음이 중복되고 인쇄된 D♯4가 사라졌으며, 마디가 1박 짧아져 canonical 330개 중 127개의
  시작이 앞당겨졌다. 자를 수 있는 후보에 두께 조건(기준 빔 두께의 0.95, D-065 결정 3b)을 추가하고 Deborah m24형 합성 fixture를
  더한 뒤 2차 독립 검증을 처음부터 다시 돌려 **PASS WITH CONCERNS**를 받았다. Clair 171/191 3회 동일, corpus 비교 가능한
  11곡 모두 D-064와 동일, Deborah는 바이트 동일, 이미지 테스트 180 OK/skip 0. 남은 우려는 Medium 3·Low 2건이고 실행된 회귀는
  없다. 브랜치 `bea1431`은 push·PR 전이며 배포도 없다. 운영은 PR163 `0e3dc61` 그대로다. 이 단계는 IN_PROGRESS.
  [기록](../validation/2026-09-17-issue-134-m9-beam-trim-thickness.md).

### D-067 후속: 공유 기둥 화음 분리 (D-068)

- m5 duration 2건·m7 duration 1건을 대상으로, 점 정리 전 머리 모양·점·기둥 방향의 근거로 긴 음을 독립 화음으로 분리한다.
- 기준선 실패 fixture를 먼저 확보하고 normal/recovery 전체 빌드·네이티브 테스트, Clair 3회, 12곡 corpus를 비교한다.
- 짧은 성부의 빔·시작 박과 긴 성부의 점·음가·붙임줄을 각각 검증한다. 판단은 기준표로 하고 운영 배포는 이 작업에 포함하지 않는다.

### m1 점 누락2 (D-069)

- 원본과 단계별 그래프로 타이 glyph의 점 잉크 포함 및 LINKS 삭제를 구별한다.
- SYMBOLS 청소에서 실제 고립된 점 성분만 보존하며 기존 분류·관계/삭제 기준과 타이 그래프는 유지한다.
- 기준선 실패 native fixture부터 normal/recovery 전체 빌드, Clair3회187/191 예상의 실제 평가,
  타이 개별 목록과12곡 corpus, 정상/부정 사례 및 CI·리뷰까지 검증한다. m3 둘잇단/타이13건 전체는 별도다.

### m3 둘잇단4 (D-070)

- 슬러에흡수된숫자2와미지원리듬을분리입증하고실패fixture부터작성한다.
- 복합박자·두음단일빔·동일음가·숫자위치와원본잉크template판별을함께요구하며엔진내부tuplets경로만수정한다.
- normal/recovery전체빌드·native정상/부정·Clair3회191/191목표의실측·타이개별목록·12곡corpus·성능/복구를검증한다.
- 다른원인의누락타이전체와D-065후속은제외하며,최신head필수CI·실제리뷰까지확인한다. 병합/VM배포는별도승인이다.

## Completion criteria

- 같은 원본에서 9/8과 원본의 확인 가능한 음높이·시작 박·길이가 실제로 개선된다.
- PDF에 없는 음표나 박자를 결과 JSON에 사후 하드코딩해 넣지 않는다.
- 정상 기준 악보에 유해한 회귀가 없고 JVM 동시성 1·시간/메모리 상한을 지킨다.
- 실패하거나 애매한 후보는 성공으로 취급하지 않고 선택 근거를 기록한다.
- 앱의 tempo precedence와 canonical 계약을 유지한다.
- 작업 결과와 한계, 실행 명령과 결과가 저장소에 남는다.

## Out of scope

- 원본 PDF 영구 보관, 기존 악보 일괄 변경, 유일한 운지 정답 추정.
- 비용/권한 확인 없는 외부 유료 OMR 서비스 도입.

References: Audiveris 5.11.0 source and official HEADERS, SCALE, scanning, font documentation.
