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
