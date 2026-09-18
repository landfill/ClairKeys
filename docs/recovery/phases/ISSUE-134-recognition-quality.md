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
