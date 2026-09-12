# ISSUE-146 — UI renewal without feature expansion

Status: `IN_PROGRESS`
Base: existing main behavior; PR147 is withdrawn and must not be included.

## Objective

Improve the confirmed UI problems from the 2026-09-07 audit while preserving existing routes,
queries, actions, upload contract, note numbers, playback timing and musical data.

## Work stages

1. First reviewable slice: remove duplicated sheet-card padding, use content-sized grid columns,
   preserve management action readability, align the mobile sort control, and fill the empty home
   result area with a static capture of the existing player components and repository home sample.
2. Separate subsequent slice: keep the existing playback controls discoverable across play/pause;
   review orientation/state decisions before implementation. No label suppression or score panel.
3. Subsequent slice: align explore cards and upload form spacing with existing design tokens.
4. Verify existing states and responsive behavior, including keyboard focus and zoom.

## First-slice completion criteria

- Long-title cards and all existing management actions remain readable at 390/768/1280/1440px.
- Card actions, confirmations, availability states, search and sorting preserve their existing behavior.
- Mobile select arrow stays inside the select; upload action does not cover card management actions.
- Home shows a clearly labeled static practice example, with no player/audio mounted, no operational
  account data, no backend request and no new interactive feature. Preserve primary CTA and first-screen layout.
- Regression evidence precedes behavior changes; local tests/type/lint/build and hosted checks pass.
- Scope remains in review until explicit PR merge approval; #146 is not closed by this slice.

## Stage 4 completion criteria

Stage 1~3이 화면을 바꿨으므로, 이 단계는 바뀐 화면들의 **기존 상태와 반응형·키보드·확대**가
여전히 성립하는지 측정으로 판정한다. 새 상태나 새 오류 분류를 만들지 않는다.

- 기존 상태(로딩·빈 목록·검색 결과 없음·처리 중·변환 오류·불러오기 실패)가 각각 무엇이
  잘못됐는지와 다음 행동을 함께 말한다. **불러오기 실패가 빈 목록으로 표시되지 않는다.**
- 로딩 상태에 접근 가능한 이름이 있고, 색은 `--ck-*` 토큰을 쓴다.
- 목록 카드의 모든 동작이 44px 이상 높이를 갖고, 상태가 바뀌어도 같은 자리의 주 동작 크기가
  유지된다. 상태별로 카드가 흔들리지 않는다.
- 목록 동작의 접근 가능한 이름이 대상 악보를 식별한다 — 카드가 여럿일 때 이름이 중복되지 않는다.
- 320 / 390×844 / 844×390 / 1280×720 / 1440×900과 CSS 200% 확대에서 문서 가로 넘침이 없고,
  문서 끝에서 플로팅 업로드 버튼이 카드 동작을 덮지 않는다.
- 키보드만으로 카드 관리 동작에 도달하며 전역 포커스 링이 보인다. 제목 편집 대화상자가 열리면
  포커스가 그 안으로 들어가고, 취소가 목록으로 돌아온다.
- 회귀 근거가 구현보다 먼저 기록된다. `npm run lint`, `npx tsc --noEmit`, `npm test`,
  `npm run build`, `npm run test:e2e`의 실제 결과를 기록하며 build가 타입·린트 검사를 대신한다고
  쓰지 않는다.
- 신규 기능·라우트·API·DB·애니메이션 데이터 계약 변경이 없음을 diff로 확인한다.

이 단계로 충족되지 **않는** 것(명시해야 하며 충족으로 기록하지 않는다): 실기기 터치, 실제 가로
방향 하드웨어, 브라우저 자체의 확대(CSS zoom은 media query를 다시 평가하지 않는다), 스크린리더의
실제 출력, 계측된 색 대비, 실제 로그인 흐름.

## Validation limits

Browser visual inspection and layout bounds are not human readability or learning-outcome measurements.
Static image source is the existing HOME_SAMPLE_ANIMATION fixture, not a claim of OMR accuracy.

## Progress

- 2026-09-07: First slice approved and merged in PR148 as a1a84da385d47e00ce9469dcd274ed2af443efa4.
  Exact-SHA Vercel Production deployment succeeded; live home and static artifact verified.
  Local 977 tests/type/lint/build and final PR CI/E2E passed. Post-merge checks tracked in PR148 log.
  Phase remains IN_PROGRESS for stages2–4. No note-label or playback behavior change in this slice.

- 2026-09-11: PR150's session/pause change is already merged. Remaining narrow desktop seek
  defect was recovered locally after cloud setup failures and submitted in PR152. Local995 Jest,
  60 E2E,type/lint/build pass; hosted gates/review remain tracked in PR152 log. No issue completion.

- 2026-09-12: PR152 explicitly approved and merged as e652c64. Narrow fine-pointer seeking,
  speed width and keyboard focus fixes are in main. Explore/upload refinements remain; issue146
  stays open. Post-merge verification is recorded in validation/2026-09-12-feature-merges.md.

- 2026-09-12: All six exact-merge checks passed for PR152. Exact-merge Vercel Production succeeded
  and public CSS delivery was verified. Remaining explore/upload work keeps this phase IN_PROGRESS.

- 2026-09-12: GitHub issue146 progress synchronized with PR148/150/152 delivery. Playback-transition
  criterion marked complete; issue remains OPEN for explore/upload and remaining UI checks.

- 2026-09-12: Stage3 explore slice submitted as [PR155](../reviews/PR-155.md). The three sections now
  share one field order, the non-existent preview placeholder is removed rather than resized, cards
  became real links, three handler-less `전체 보기` controls were removed and the palette is fully
  tokenised. The 3/4/8 sections and their data order are preserved and now asserted. Regression test
  preceded implementation: 5 of 8 cases failed on the audited defects before the fix. New
  `e2e/explore-cards-responsive.spec.ts` measures 320/390x844/844x390/1280x720/1440x900 and CSS zoom
  200% in five browser projects and caught a document overflow this branch had introduced, confirmed
  against clean main before repair. Evidence: [explore card validation](../validation/2026-09-12-explore-cards.md).
  Upload form spacing remains outstanding, so this phase stays `IN_PROGRESS`.

- 2026-09-12: PR155 explicitly approved and merged as 0639bfe0b92b688e48c0a00ea1cefc9528215e3d.
  All six check-runs on the exact merge commit succeeded. The explore screen slice is delivered:
  one field order across the three sections, the false preview surface removed, cards reachable by
  keyboard with the global focus ring intact and modified clicks left to the browser. Stage3's
  upload form grouping remains, so this phase stays `IN_PROGRESS` and issue146 stays OPEN.

- 2026-09-12: Stage3's remaining upload-form work submitted as [PR157](../reviews/PR-157.md). The
  single form is grouped into `악보 파일` / `곡 정보` / `선택 설정` with `fieldset`/`legend`, so the
  boundary reaches people who do not see the screen; 곡명 and 저작자 share a row only above the `sm`
  breakpoint; the drop zone's vertical padding is reduced. Fields, validation, defaults and the
  submit payload are unchanged and the component's logic region has no diff. Regression evidence
  preceded implementation: jest 3 failed / 24 passed and Playwright 7 of 9 failed on the unmodified
  component. New `e2e/upload-form-grouping.spec.ts` measures 320/390x844/844x390/1280x720/1440x900
  and CSS zoom 200% in five browser projects, and caught a `fieldset` min-content overflow this
  branch had introduced, repaired before submission. It is also the suite's first protected-route
  spec; the session-cookie precedent is recorded as D-058. Evidence:
  [upload form validation](../validation/2026-09-12-upload-form-grouping.md).
  Stage4 verification remains, so this phase stays `IN_PROGRESS` and issue146 stays OPEN.

- 2026-09-12: [PR157](../reviews/PR-157.md) review round handled; head is `46c0d4c` with all 16
  hosted checks passing. Two P1 findings were answered with measurement rather than obeyed. The
  column breakpoint moved from `sm` to `md` because at exactly 640px each split field was 263px,
  narrower than the 308px a 390px phone gets in one column — widening the screen shrank the input.
  The rule is now recorded as D-059 in width terms, because "desktop two-column / mobile one column"
  names no width and therefore cannot be verified; the E2E pins 390/767/768 and asserts at every
  viewport that a split field stays wider than the phone baseline. Lore trailers on this branch's
  commits parsed as zero because wrapped values break git's parser; the commits were rewritten with
  single-line trailers (trees identical) and now parse 11/10/10. Stage4 still remains, so this phase
  stays `IN_PROGRESS` and issue146 stays OPEN.

- 2026-09-12: PR157 explicitly approved and merged as 925e75832787c861308fc381b82d753ccb8b4bc1. All
  six check-runs on the exact merge commit succeeded. Stage3 is now complete: the explore screen
  shipped in PR155 and the upload form is grouped into `악보 파일` / `곡 정보` / `선택 설정` with
  `fieldset`/`legend`, the required row splits only at `md` per D-059, and the drop zone's padding is
  reduced. Fields, validation, defaults and the submit payload are unchanged. Only stage4 remains —
  verify existing states and responsive behaviour including keyboard focus and zoom — so this phase
  stays `IN_PROGRESS` and issue146 stays OPEN. Post-merge verification is recorded in
  [upload form validation](../validation/2026-09-12-upload-form-grouping.md).
