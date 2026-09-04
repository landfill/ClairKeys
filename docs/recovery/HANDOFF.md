# Current Handoff

Last updated: 2026-09-04 KST

## Current issue #52 status (2026-09-04)

- Current phase: [#52](https://github.com/landfill/ClairKeys/issues/52) OMR systemd restart reliability is implemented
  on `codex/issue-52-systemd-restart` and is in review via PR
  [#123](https://github.com/landfill/ClairKeys/pull/123); head `d439173`.
- The checked-in unit removes `%t/%n.ctr-id` immediately before Podman starts, and the deployment guide now defines
  a repeat-deployment path that checks restart exit status, active state, and the running image ID.
- Regression commit `24fdb91` observed the missing `ExecStartPre`; implementation `dd06c56` and whitespace cleanup
  `d439173` make the focused test and all 45 OMR Python tests pass. `git diff --check` passes.
- Next action: complete hosted CI and actionable review, then obtain production VM access and verify that installing the
  unit makes `systemctl restart clairkeys-omr` exit 0 with no new status 125/cidfile race in the journal. Also repeat the
  external health 200 and unauthenticated process 401 checks and confirm the running image ID.
- Known blocker: this session had no confirmed production VM credentials/access, so no deployment or restart was attempted.
  Do not close #52 or describe the runtime defect as fixed until that verification succeeds. Do not merge PR #123 without
  the user's explicit approval.
- Evidence: `docs/recovery/validation/2026-09-04-issue-52-systemd-restart.md` and
  `docs/recovery/reviews/PR-123.md`.

## Current issue #120 status (2026-09-04)

- Current phase: [#120](https://github.com/landfill/ClairKeys/issues/120) ordinary-score automatic fingering implementation
  is merged via PR [#122](https://github.com/landfill/ClairKeys/pull/122), merge commit `10e9c72`; issue CLOSED.
- Corrected premise from the user: an unannotated treble/bass-staff score is the normal product input, not an exceptional
  missing-data fallback. The implementation therefore treats hand-separated phrase inference as the primary path.
- Local evidence: focused Jest 5 suites / 53 tests, full Jest 91 suites / 856 tests, typecheck, lint, build, and diff check
  pass. A read-only run over the issue #120 production JSON produced 411/411 valid inferred values deterministically while
  retaining 169 L and 242 R assignments.
- Storage safety: canonical JSON is not rewritten. Player-bound values carry source/inferred provenance and algorithm
  version `phrase-dp-v1`. The old random storage backfill API is an authenticated 410 tombstone; its UI entry and two
  random scripts are removed.
- Browser verification: the Vercel preview is login protected and macOS denied `computer-use` Accessibility permission.
  The exact branch production build was therefore served locally with only `/api/sheet/28` metadata intercepted and the
  actual public 411-note JSON loaded. Desktop 1440×900 and mobile landscape 844×390 idle/playing all rendered readable
  badges with no page error. This does not verify Vercel routing/auth configuration.
- Merge lifecycle: user approved on 2026-09-04. Current-head checks and resolved threads were rechecked before merge.
  Post-merge checks are 6/6 success and Vercel Production for `10e9c72` is success. Local/remote branch tips had zero
  commits outside `origin/main`; both `codex/issue-120-phrase-fingering` branches were deleted, worktree clean `main`.
- Next action: obtain a professional pianist/teacher review of the complete inferred score. If the full-song fingering is
  educationally natural, change the phase from `BLOCKED` to `DONE`; otherwise open a focused correction issue with the
  exact phrase/onset evidence. Do not infer this from issue closure or green CI.
- Review update: CodeRabbit produced 2 actionable findings. Both were accepted and fixed in `927d81f`: phase/D-039 now
  match the retired storage backfill, and phrase gaps use the maximum sounding end across all voices. The latter regression
  failed `1,2,1,2` before the fix and passes `1,2,3,4`. Focused 54 and full 857 tests, typecheck, lint, and diff check pass;
  both threads are replied to and resolved. Current-head hosted Build, two E2E jobs, two test jobs, lint/typecheck, Security
  Scan, CodeQL, Vercel, and Security Audit all pass. The first Security Audit attempt received npm registry HTTP 400
  `Invalid package tree`; rerunning the unchanged head passed.
- Direct-main record check: status commit `38c0b87` passed E2E, build, tests, and lint, but its Security Audit hit the same
  npm registry 400 transient. This failure is recorded here per the direct-push protocol; PR head `927d81f` has a successful
  audit rerun and no dependency or lockfile change.
- Known blockers: professional pianist/teacher review cannot be automated. Do not describe the heuristic as a unique correct
  fingering.
- Evidence: `docs/recovery/validation/2026-09-04-issue-120-phrase-fingering.md`,
  `docs/recovery/reviews/PR-122.md`, D-039 in `docs/recovery/DECISIONS.md` on the PR branch.

## Issue #120 and #121 registration (2026-09-04)

- [#120](https://github.com/landfill/ClairKeys/issues/120) records the gap left by #103: a real 411-note
  production JSON had correct `L`/`R` staff-derived hands but no source `finger` on any note, so retransformation
  cannot improve its fingering. The player-bound fallback must become phrase-aware while preserving explicit
  source fingering; the old random admin/backfill paths also need removal, isolation, or consolidation.
- [#121](https://github.com/landfill/ClairKeys/issues/121) separately defines operator monitoring for the OMR VM:
  external availability/auth checks, systemd/Podman and host resources, per-stage job/callback telemetry, result
  contract/quality signals, structured redacted logs, dashboards, alerts, and a tested runbook. It links existing
  VM issues #44, #47, #52, #73, and #110 rather than duplicating their fixes.
- No implementation branch or code change was started for either issue.

## Current issue #118 status (2026-09-03)

- Current phase: Issue #118 mobile playback controls overflow is implemented on `codex/issue-118-mobile-controls`; corrected head `5f0b92222f2e0700065a8591f01f109a5faa46d5`.
- Next action: Await the user's explicit merge approval for PR [#119](https://github.com/landfill/ClairKeys/pull/119); do not merge automatically.
- Known blockers: hosted CI and the triggered manual CodeRabbit review are complete with no actionable comments. In this checkout, full Jest reached 85/90 suites and 826/848 tests; its Python subprocess/platform failures are environment-local and unrelated to the changed files, and this session did not compare them against `main`. `npx tsc --noEmit` is likewise environment-local/unrelated to the changed files because this checkout cannot resolve `web-vitals`; this session did not compare it against `main`. Physical-device touch and Firefox/WebKit viewport verification are not tested locally.
- Recovery records: `docs/recovery/validation/2026-09-03-issue-118-mobile-controls.md` and `docs/recovery/reviews/PR-119.md`.

> 아래 "현재 상태"만 읽고 바로 시작할 수 있어야 한다. 그 아래 절들은 시간 역순 기록이며, 필요한
> 맥락만 골라 읽는다.

## 현재 상태

**Current phase**: 이슈 [#118](https://github.com/landfill/ClairKeys/issues/118) 모바일 재생 컨트롤 overflow 수정, PR [#119](https://github.com/landfill/ClairKeys/pull/119) 검토 대기
**IN_REVIEW — CI 및 actionable human review 대기**. 병합하지 않는다. 이전 이슈 #103은 아래에 기록된 blocked 운영 수동 확인 항목으로 유지한다.
**Blocked prior phase — issue #103:**
merge commit `34b8ad4`로 병합됐고 이슈는 CLOSED다. post-merge checks 6/6 success, Vercel Production 배포
success를 확인했다. 원격·로컬 `codex/issue-103-fingering-contract` 브랜치는 두 tip의 고유 커밋이 0임을
확인한 뒤 삭제했고 worktree는 clean `main`이다. 사용자 요청에 따라 단순 운지 유틸리티 구현은 별도 worktree 없이
Luna medium worker가 담당했고, 주 에이전트가 표준 조사·계약·플레이어 경계·렌더링과 전체 검증을 통합했다.

피아노 번호의 보편 표준은 양손 모두 엄지 1 → 소지 5다. 그러나 임의 악곡 전체의 유일한 음별 배열은 없어
D-038은 원본 MusicXML/JSON 운지를 우선하고 누락분만 **결정론적 초보자 힌트**로 보강한다. C·G·D·A·E
장음계 상행은 자료가 보장하는 오른손 `1-2-3-1-2-3-4-5`, 왼손 `5-4-3-2-1-3-2-1`을 적용한다.
동시음은 1~5음의 일반적인 양손 대칭 배열을 쓰고, 모든 fallback에서 `Math.random()`을 제거했다. 저장 JSON은
변경하지 않고 `canonicalToFallingNotes` 경계에서 기존·신규 악보를 함께 보강하며 원본 운지는 보존한다.
짧은 노트도 번호를 숨기지 않는다. CodeRabbit R1은 양손 악보에서 반대손 반주가 장음계 음 사이에 끼면
전체 배열의 연속 8개 탐색이 표준 배열을 놓친다고 지적했다. 손별 시간순 시퀀스로 탐색하도록 수정했고,
반주가 같은 onset에 섞인 회귀를 추가했다(`64911db`). 스레드 답글과 resolve까지 완료했다.

수정 전 회귀 3건이 누락 운지 `undefined`, 미지정 양손 화음, 짧은 노트 번호 숨김을 관측했다. 로컬 검증은
focused Jest 4 suites / **40 tests**, 전체 Jest 90 suites / **847 tests**, `npx tsc --noEmit`, lint, build
통과다. 빌드는 설정상 타입·lint를 생략하므로 별도 실행했다. 상세 근거는
`docs/recovery/validation/2026-09-03-issue-103-fingering-guidance.md`, 리뷰 상태는
`docs/recovery/reviews/PR-117.md`에 있다. **미검증**: 실제 악보 한 곡 전체 번호, 교육적 자연스러움, 모바일
가로 화면 가독성. phase 완료 조건의 수동 검증이 남아 있어 병합·이슈 종료만으로 `DONE`이라 기록하지 않는다.

**Previous phase**: 이슈 [#114](https://github.com/landfill/ClairKeys/issues/114) 중첩 `<main>` 제거
완료. PR [#116](https://github.com/landfill/ClairKeys/pull/116) 병합 (`97d6cdb`, 2026-09-03), 이슈
CLOSED, 원격·로컬 작업 브랜치 삭제, worktree clean `main`이었다.

루트 레이아웃과 `MainLayout`을 함께 구성하는 회귀 `db4cc6c`가 수정 전 `<main>` 2개를 관측했다
(`Expected: 1, Received: 2`). 구현 `3bec12e`는 루트 레이아웃을 유일한 `<main>` 소유자로 유지하고
`MainLayout`의 내부 `<main>`만 제거했다. 기존 `min-h-screen` 래퍼와 자식 구조는 유지했다. 프로필의
페이지 단위 셸 검사는 루트 레이아웃 없이 렌더된다는 실제 경계에 맞게 갱신했다.

로컬 검증은 Jest 88 suites / **834 tests**, `npx tsc --noEmit`, lint, build 모두 통과했다. 빌드는
설정상 타입·lint를 생략하므로 두 검사를 별도 실행했다. 기존 프로필 테스트의 React `act(...)` 경고는
계속 출력되지만 실패는 아니다. 상세 근거는
`docs/recovery/validation/2026-09-03-issue-114-main-landmark.md`, 리뷰 상태는
`docs/recovery/reviews/PR-116.md`에 있다. **미검증**: 인증된 브라우저에서 다섯 영향 페이지의 시각 비교.

**PR #116 review/CI**: 병합 전 hosted checks **16/16 success**, `MERGEABLE`/`CLEAN`. CodeRabbit 수동 리뷰는 변경
파일 3개 전부를 처리했고 actionable comment 0건이었다. PR 템플릿 섹션 누락 경고는 수용해 본문을 전체
템플릿 구조로 갱신했다. docstring coverage 경고는 테스트 내부의 작은 재귀 helper와 기존 단순 React
컴포넌트에 80% 문서 문자열을 요구하는 일반 지표이며 코드 정확성 지적이 없어 기각했다. 사용자 승인 후
merge commit `97d6cdb`로 병합했고 post-merge checks **6/6 success**, Vercel Production 배포 success를
확인했다. 로컬·원격 브랜치 tip의 고유 커밋이 각각 0건임을 확인한 뒤 두 브랜치를 삭제했다.

**직전 작업**: 헤더 계정 메뉴 정리 **완료 — PR [#115](https://github.com/landfill/ClairKeys/pull/115)
병합 (`885cfd3`), 최종 head `4a2288c`, post-merge 6/6 success, Production 배포 `885cfd3` success,
2026-09-02 사용자가 운영에서 확인하고 문제 없음을 보고**. 브랜치 정리 완료. GitHub 이슈 없이 브라우저
피드백에서 온 작업이라 닫힐 이슈는 없다.
**GitHub 이슈 없이 사용자의 브라우저 피드백에서 바로 온 작업**이다(PR #100·#101과 같은 경로).

`/profile` 운영 확인 중 헤더 계정 드롭다운의 UI가 앱과 어긋나고 긴 이메일이 넘친다는 피드백이 왔다.
읽어 보니 이 메뉴는 **헤더에서 유일하게 기본 팔레트에 남아 있던 부분**이었다 — `Header.tsx` 본체는 이미
전부 토큰인데 이 드롭다운만 `bg-white`·`gray-*`·`orange-*`·`red-*`였다. **테두리가 가장 눈에 띄는
부분이다**: `border`에 색이 없으면 `currentColor`를 상속해 헤어라인 대신 **잉크색 실선**이 그려진다
(피드백의 computed style `border: 1px solid rgb(27, 31, 42)`가 그 증거).

넘침은 두 곳이었다 — 메뉴 안(32자 단일 토큰이 `w-48`에서 줄바꿈할 자리가 없음 → `w-64` + `break-all`)과
헤더 트리거(이름을 그대로 렌더해 레이아웃을 밈 → `max-w` + `truncate`).

**보고에 없었지만 같은 읽기에서 4건이 더 나왔다**: 이름 없는 계정의 빈 `<div>`, `<a href>`라 메뉴를 고를
때마다 앱 전체가 리로드(헤더의 나머지는 `Link`), 자체 `focus:ring-blue-500`(`Button.tsx`가 기록한 규약
위반), Escape 미지원·`aria-haspopup`/`aria-expanded` 부재. 라벨도 하나 바꿨다 — `프로필 설정` → `프로필`,
이슈 #104가 그 설정들을 제거해 옛 라벨은 존재하지 않는 화면을 가리켰다.

**이 메뉴는 모든 페이지에 렌더된다.** `UserProfile`에는 테스트가 하나도 없었고 회귀 `2573a80`이 수정 전
9건 실패를 관측했다. 두 변형(드롭다운, 모바일 compact)을 모두 덮는다. **jsdom은 넘침을 판정하지
못하므로** 줄바꿈은 레이아웃이 아니라 그것을 허용하는 클래스로 단언한다 — 취약하지만 이 환경의 최선이고
주석과 커밋에 적었다.

로컬 검증 Jest 88 / **825**(신규 10), tsc, lint, build 통과. 리뷰 `docs/recovery/reviews/PR-115.md`.
**미검증**: 브라우저 확인 없음, 관리자 링크는 admin 세션 전용이라 미실행.

**2026-09-02 리뷰 처리 (2라운드)**: **CodeRabbit은 `Review rate limited`** — PR #111과 같은 결말이라
이 PR의 리뷰는 독립 리뷰뿐이다. 1차에서 5건이 나왔고 **전부 이 PR이 고치겠다고 주장한 접근성 영역**이었다.

**둘은 자기모순이었다.** (1) 트리거의 커스텀 포커스 링을 "전역 `:focus-visible`이 담당한다"며 지웠는데
메뉴에 `overflow-hidden`을 줘서 **그 전역 링을 항목마다 잘라내고** 있었다. (2) `role="menu"`를 선언했지만
화살표 키·roving tabindex가 없고 신원 블록·로그아웃이 `menuitem`이 아니라 **스크린리더가 메뉴 모드에서
로그아웃에 도달하지 못한다.** role을 유지한 채 전부 menuitem으로 만드는 대신 **role을 제거**했다 —
구현하지 않은 패턴을 선언하지 않는다는 점에서 `/profile`에서 목업을 걷어낸 것과 같은 원칙이다.

**그 지적이 결함 하나를 드러냈다 — 모바일에서 로그아웃할 방법이 없었다.** 로그아웃은 데스크톱 드롭다운
에만 있었고 모바일 메뉴가 쓰는 compact 변형은 아바타와 이름만 렌더했다. 보고에도 최초 구현에도 없던
것이며 **이 PR이 추가한다** — 병합 시 모바일 메뉴 레이아웃이 바뀐다.

나머지 셋: WCAG 2.5.3 위반(`aria-label`이 보이는 이름을 덮어씀), Escape 후 포커스가 `<body>`로 떨어짐,
act 경고 20건.

**2차 리뷰가 3건을 더 냈고 그중 둘이 배울 점이다.** (1) `aria-haspopup="true"`는 `"menu"`와 동등해서,
`role="menu"`를 뺐는데도 여전히 "menu button"이라 알리고 Arrow Down을 유도하고 있었다 — **1차 수정이 넣은
회귀가 그 잘못된 상태를 고정하고 있었다. 회귀가 항상 안전망인 것은 아니다.** (2) **PR 본문과 리뷰 로그가
stale했다** — AGENTS.md 단계 4("리뷰 수정마다 `reviews/PR-<번호>.md`를 갱신한다") 위반이고, 그 결과
**모바일에 파괴적 컨트롤이 추가된다는 사실을 어느 기록에서도 볼 수 없었다.** 코드가 아니라 인계의 결함
이며 이 PR에서 가장 값어치 있는 지적이다. 본문과 로그를 현재 head 기준으로 다시 썼다.

재검증 Jest 88 / **833**, tsc, lint, build 통과. 전체 분류는 `docs/recovery/reviews/PR-115.md`
Iteration 2·3.

**2026-09-02 운영 확인 완료**: 사용자가 Production `885cfd3`의 헤더 계정 메뉴를 확인하고 문제 없음을
보고했다. 대기 중이던 여섯 항목(테두리, 메뉴 안 긴 이메일, 헤더 트리거의 긴 이름, 포커스 링, 줄바꿈된
이름의 높이, **모바일 계정 행에 추가된 로그아웃**)이 해소됐다. 근거는 `docs/recovery/reviews/PR-115.md`
Iteration 5이며, 사용자가 항목별 세부 관측값을 남기지는 않았다.

---

## Next action (2026-09-03 PR #117 병합 시점)

Production에서 실제 악보 한 곡을 재생해 모든 노트에 번호가 보이는지, 번호가 교육적으로 부자연스럽지 않은지,
모바일 가로 화면에서 짧은 노트의 번호가 읽히는지 확인한다. 사용자 확인을 받으면 #103 phase를 `DONE`으로
바꾸고 validation/review/HANDOFF에 기록한다. 자동 검사가 판정하지 못한 다섯 페이지의 시각 비교는 #114의
미검증 항목으로도 남아 있다.

착수하지 않는 것: #110·#73·#52·#47은 `omr-service` 변경이라 VM 배포 없이 완료를 주장할 수 없고, #61은
#60 선행, #46은 선택지 미결정, #44는 본문에 후순위 명시.

**이 세션이 남긴 재사용 후보 (아직 이슈 미등록)**: 인증 뒤 화면의 검사 사각지대를 **네 번째로** 만났다
(DS-3·DS-4·DS-6·#104). 공개 E2E도 axe도 `/profile`·`/library`·`/upload`·`/sheet/[id]`를 지나가지 않아
매번 사용자의 수동 확인에 의존한다. DS-3이 쓴 `next-auth/jwt`의 `encode`로 세션 쿠키를 만드는 우회를
**재사용 가능한 E2E fixture로 만드는 것** 자체가 후속 작업 후보다.

### 이 세션에서 배운 것 (반복하지 않기 위해)

- **얕게 돈 리뷰는 "지적 0건"·"리뷰 없음"과 구별되지 않는 세 번째 상태다.** PR #113의 첫 독립 리뷰가
  low effort로 잡혀 테스트 파일을 건너뛴 채 `(none)`을 냈다. 출력의 프롬프트를 직접 읽어야 알 수 있었다.
- **회귀가 결함을 붙잡고 있을 수 있다.** PR #115 1차 수정이 `aria-haspopup="true"`를 단언하는 테스트를
  넣어, 제거하려던 잘못된 약속에 자물쇠를 채웠다. 2차 리뷰가 잡았다.
- **접근성은 속성을 더하는 일이 아니라 약속과 구현을 맞추는 일이다.** `role="menu"`는 화살표 키
  네비게이션을 약속하고, `aria-haspopup="true"`는 `"menu"`와 동등하며, `aria-label`은 보이는 이름을
  덮어쓴다(WCAG 2.5.3). 셋 다 없느니만 못한 상태를 만들었다.
- **리뷰 수정 뒤 `reviews/PR-<번호>.md`를 갱신하지 않으면 인계가 거짓이 된다.** PR #115에서 두 라운드를
  갱신 없이 지나쳐, "모바일에 파괴적 컨트롤이 추가된다"는 사실을 어느 기록에서도 볼 수 없었다.
  AGENTS.md 단계 4가 요구하는 것이고, 리뷰가 이를 지적했다.
- **jsdom은 넘침도 클리핑된 outline도 계산하지 않는다.** 그런 항목의 회귀는 "그것을 가능하게 하는
  클래스가 있다"까지만 단언한다. 초록 테스트 833개가 사용자 보고 중 어느 하나도 판정하지 못했다.
- **절대값 상한은 방향 오류를 관측하지 못한다.** 이슈 #58의 흑건 검사가 `|중심 − 경계| ≤ 0.35`였다.
- **타입 검사가 테스트 공백을 알려줄 수 있다.** `/profile` 첫 구현에서 Jest는 전부 통과하는데 `tsc`만
  실패했고, 그것이 "아바타 경로를 어떤 테스트도 타지 않는다"는 신호였다.

---

**Previous phase**: 이슈 [#104](https://github.com/landfill/ClairKeys/issues/104) 마이페이지 앱 셸
**완료 — PR [#113](https://github.com/landfill/ClairKeys/pull/113) 병합 (`0c0712f`, 2026-09-02),
이슈 CLOSED, 2026-09-02 사용자가 운영에서 확인하고 이상 없음을 보고**. 최종 head `abd1109`, post-merge 6/6 success, Vercel
**Production 배포 `0c0712f` success**. 원격·로컬 `codex/issue-104-profile-shell` 삭제, worktree clean `main`.

**이슈 완료 조건 4·5·7은 사용자의 운영 확인으로 충족됐다** — 자동 검사가 아니라 관측이 근거다.
`/profile`은 인증 뒤 화면이라 공개 E2E·axe가 지나가지 않고, 특히 **아바타의 모양**(회귀는 이미지가
렌더되는지만 보고 원형인지는 못 본다)과 **가입일의 실제 값**(로컬은 목 기반이었다)은 자동 검사가
원리적으로 판정하지 못한다. 다음 코드 작업은 아직 시작하지 않았다.

**이슈는 디자인 정렬을 요구했지만 `/profile`은 거의 전체가 목업이었다.** 컨트롤 7개 중 동작하는 것이
**0개**였다 — 사진 변경·저장·비밀번호 변경·알림 토글 2개·계정 삭제에 `onClick`이 없었고, 가입일은
문자열 `"2024년 1월 1일"` 하드코딩이었다. 뒷받침할 API도 하나도 없다. **비밀번호 변경은 미구현이 아니라
존재할 수 없는 항목이다** — 인증이 Google/GitHub OAuth 전용이다.

**사용자가 "거짓말하는 것부터 제거"를 선택했다.** 시각만 고치면 가짜 컨트롤이 더 진짜처럼 보이게 되고,
계정 삭제는 눌러도 아무 일이 없어 "삭제했다"고 믿게 만든다. DS-3이 업로드 화면에 적용한 원칙과 같다.
남긴 것은 세션과 DB가 뒷받침하는 것뿐이다 — 아바타·이름·이메일·**실제 가입일**. `User.createdAt`은
스키마에 처음부터 있었고(`schema.prisma:42`) 읽는 API가 없었을 뿐이라 `GET /api/user/profile`을 추가했다.
**id 파라미터가 없어 호출자는 자기 행만 읽는다.** 요청이 실패하면 가입일 행을 추측하지 않고 생략한다.
`ProfileSettings.tsx`는 재스타일링이 아니라 **삭제**했다 — 목업을 걷어내면 남는 내용이 없었다.

셸은 `MainLayout` + `PageHeader` + `Container`로 내 악보·탐색과 같아졌고 `Card`와 ink/surface/rule
토큰을 쓴다. 제거한 기능과 되살리기 위한 선행 조건은 후속 이슈
[#112](https://github.com/landfill/ClairKeys/issues/112)에 분리했다(계정 삭제는 스토리지 객체·공개 악보
처리 때문에 별도 설계 필요).

**두 가지가 검사 방식 자체를 고치게 했다.** (1) 셸 검사를 h1 개수로 걸었더니 **통과했다** — 옛 페이지도
h1을 가져서 셸에 들어가지 않고도 만족된다. `MainLayout`의 `<main>` 랜드마크를 보도록 바꿔야 의도대로
실패했다(C6와 같은 vacuous 함정). (2) 첫 구현에서 Jest 전체가 통과하는데 `tsc`만 실패했다 — 아바타
경로를 **어떤 테스트도 타지 않고 있었다**. 테스트를 추가하니 `OptimizedImage`가 기본 lazy라 페이지
최상단 요소가 스크롤을 기다리는 **실제 결함**이 나왔다(`priority`/`lazy={false}`로 수정).

회귀 `bd6f001`이 수정 전 10건 실패를 관측했다. 로컬 검증 Jest 87 / **813**(신규 17), tsc, lint, build
통과. 근거 `docs/recovery/validation/2026-09-02-issue-104-profile-shell.md`,
리뷰 `docs/recovery/reviews/PR-113.md`.

**미검증 (병합 시점)**: 브라우저·실기기 확인이 **전혀 없다.** 이슈 완료 조건 4(1440·1024·390), 5(긴 이름·긴 이메일·
이미지 없음), 7(인접 화면 비교)이 **미충족**이다 — `/profile`은 인증 뒤 화면이라 공개 E2E·axe가 지나가지
않는 이 저장소의 알려진 사각지대(DS-4·DS-6과 같은 자리)다. 새 라우트에 실제 요청을 보낸 적도 없다.

**2026-09-02 리뷰 처리**: **CodeRabbit이 이번엔 실제로 리뷰를 실행했다** — PR #111에서 두 번 다
건너뛴 것과 다르다. 독립 리뷰도 함께 돌렸는데 **첫 실행이 low effort로 잡혀 테스트 파일을 건너뛴 채
`(none)`을 냈다.** 출력의 프롬프트를 직접 읽어서 알았고 인자를 바꿔 재실행하니 4건이 나왔다 —
**지적 0건과 리뷰 없음이 다른 상태인 것처럼, 얕게 돈 리뷰도 세 번째 상태다.**

수용 4건, 기각 1건. **R1·R3는 뿌리가 같았다** — 80px 고정 아바타를 반응형 이미지 도구
(`OptimizedImage`)에 넣은 것이다. className이 wrapper로 가는데 `overflow-hidden`이 없어 **아바타가
사각형으로 렌더**됐고(삭제한 `ProfileSettings` 대비 시각 회귀), 뷰포트 `sizes` 하드코딩으로 80px
아바타에 폰 너비 변형을 preload했으며, 처음 만난 lazy 문제도 같은 뿌리였다. `next/image`로 되돌려
한꺼번에 해소했다(`405d877`).

**R5는 기각했다.** CodeRabbit이 타임존 의존의 처방으로 `formatJoinDate`에 `timeZone: 'UTC'` 고정을
요구했으나 방향이 반대다 — KST 08:00 가입은 UTC로 전날 23:00이라 **하루 전 날짜를 보여주게 된다.**
의존성은 동작이 아니라 fixture에 있었고 그쪽을 고쳤다. **기각 근거가 검사되는지 확인했다**: 제안대로
바꾸면 새 회귀가 `TZ=Asia/Seoul`에서 실패하고, 원래대로면 네 타임존에서 모두 통과한다(`abd1109`).
포맷터는 `src/lib/profile/joinDate.ts`로 분리했다(Next.js 페이지는 default 외 export 불가, DS-3의
업로드 계약 분리와 같은 방식). 근거는 docstring·커밋 Directive·CodeRabbit 스레드 답글 세 곳에 남겼다.

**R4로 PR 본문의 주장 하나가 과했음이 드러났다.** 루트 레이아웃이 이미 `<main>`을 렌더하는데
`MainLayout`이 또 렌더해 **중첩 랜드마크**가 생긴다 — `library`·`explore`·`upload`·`sheet/[id]`도 같다.
따라서 셸 회귀는 실제 DOM이 아니라 페이지 컴포넌트를 서술한다(테스트가 루트 레이아웃 없이 렌더하므로).
이 PR이 도입한 결함이 아니라 저장소 전역 패턴이라 이슈
[#114](https://github.com/landfill/ClairKeys/issues/114)로 분리하고 테스트 주석에 명시했다.

재검증 Jest 87 / **815**, tsc, lint, build 통과. 프로필 스위트는 UTC·Asia/Seoul·America/Los_Angeles·
Pacific/Kiritimati 네 곳에서 각각 통과.

**2026-09-02 운영 확인 완료**: 사용자가 Production `0c0712f`의 `/profile`을 확인하고 이상 없음을
보고했다. 대기 중이던 항목(1440·1024·390 레이아웃, 긴 이름·긴 이메일·이니셜 아바타, 인접 화면 일관성,
**아바타 원형 여부**, **가입일 실제 값·시간대**)이 해소됐다. 근거는
`docs/recovery/validation/2026-09-02-issue-104-profile-shell.md`의 "운영 확인 완료" 절이며, 사용자가
항목별 세부 관측값을 남기지는 않았다.

**Next action**: 다음 코드 작업 후보는 **#114**(중첩 `<main>` — 이번에 분리, 5개 페이지 영향이지만
변경 자체는 작다), **#112**(제거한 프로필 기능 — 계정 삭제는 별도 설계 필요), **#103**(손가락 번호 —
데이터 계약부터 정해야 함)이다. 사용자가 착수를 지시한 뒤 시작한다. #110·#73·#52·#47은 `omr-service`
변경이라 VM 배포가 필요하고, #61은 #60 선행, #46은 선택지 미결정, #44는 후순위 명시다.

**이 트랙이 남긴 재사용 후보**: `/profile`은 인증 뒤 화면이라 공개 E2E·axe가 지나가지 않는 사각지대를
**네 번째로** 만났다(DS-3·DS-4·DS-6·#104). DS-3은 `next-auth/jwt`의 `encode`로 세션 쿠키를 만들어 로컬
프로덕션 빌드를 실제 브라우저로 측정하는 우회를 썼다. 이 방법을 재사용 가능한 fixture로 만드는 것 자체가
후속 작업 후보다 — 매번 사용자의 수동 확인에 의존하는 비용이 반복되고 있다.

**Previous phase**: 이슈 [#58](https://github.com/landfill/ClairKeys/issues/58) 검은건반 기하
**완료 — PR [#111](https://github.com/landfill/ClairKeys/pull/111) 병합 (`c410281`, 2026-09-02),
이슈 CLOSED**. 최종 head `b3d2f29`, post-merge 6/6 success (E2E, build, tests, lint, Security Audit).
원격·로컬 `codex/issue-58-black-key-geometry` 삭제, worktree clean `main`. 다음 코드 작업은 아직
시작하지 않았다. 아래는 이 phase의 진행 기록이다.

`pianoLayout.ts`의 흑건 오프셋 다섯 개가 전부 균일한 좌측 편향이라 **D#·A#가 실제와 반대 방향**이었고,
흑건 폭도 0.6(실제 0.583)이었다. 값을 소수로 적지 않고 **표준 치수(백건 23.5mm · 흑건 13.7mm)에서
유도**하게 바꿨다 — 유도가 코드에 있어야 실제 악기로 검산할 수 있고, 이슈 #56 spec의 "이 표는 맞다"는
근거 없는 주장이 다시 붙지 않는다. **D-024가 `pianoLayout.ts`를 회귀 계약 절에 명시하므로 D-037을 코드와
같은 커밋(`072e919`)에 넣었다.** 흑건 오프셋·폭 자체는 DS-0 고정 상수 7개에 **포함되지 않으며**,
`PX_PER_SEC` 등 그 일곱 개는 한 픽셀도 바뀌지 않았다.

**착수 전 사용자가 두 결정을 확정했다**: (1) 기준은 표준 치수 유도값, (2) 범위는 `pianoLayout.ts`만.

**이슈 본문의 전제 하나가 현재 코드와 달랐다.** 이슈는 `PianoKeyboard.tsx`를 "모바일 전체화면·가로모드·
데모가 사용"한다고 적었으나 **라우트에서 도달할 수 없다** — 유일한 소비자 `FullScreenPiano.tsx`·
`LandscapePianoInterface.tsx`를 import하는 파일이 `src/components/mobile/` 밖에 0개다. 실제 재생 경로는
`FallingNotesPlayer` → `SimplePianoKeyboard` → `buildKeyLayout()` 하나다. 따라서 이슈 할 일 3(두 구현
통일)은 수행하지 않고 **아래 이월 표의 P2-A 죽은 코드 정리로 이관**했다(D-037 결정 4).

기존 유일한 흑건 위치 검사가 `|중심 − 경계| ≤ 0.35 * keyWidth`라는 **절대값 상한**이라 부호를 보지 않아
방향 오류를 통과시키고 있었다. 회귀 `1664afd`가 방향 불변식·유도값·흑건 폭 3건으로 수정 전 실패를
관측했고, 기대값은 **구현에서 import하지 않고 표준 치수에서 테스트가 직접 유도한다.** 함께 고친 파생
상수 하나: `SimplePianoKeyboard`의 `decorationScale` 기준값 `14.4`(= 24 × 0.6)가 흑건 폭과 같아야 하는데
리터럴이었다(테두리·그림자 두께 전용, 좌표 영향 없음).

로컬 검증 Jest 85 / **796**, tsc, lint, build 통과. 근거
`docs/recovery/validation/2026-09-02-issue-58-black-key-geometry.md`, 리뷰 `docs/recovery/reviews/PR-111.md`.
**육안 확인 완료 (2026-09-02, 사용자)**: 병합 후 사용자가 실측해 통과를 보고했다. 이로써 이 phase의
유일한 미검증 항목이 해소됐다 — 자동 검사는 좌표만 판정했고 화면이 어색하지 않다는 근거는 이 확인뿐이다.

**2026-09-02 리뷰 처리**: **CodeRabbit이 이 PR을 두 번 다 건너뛰었다** — 처음엔
`Review skipped: manual review required for this OSS repository`(PR #96과 같은 OSS 정책), 수동
`@coderabbitai review` 요청 후엔 `Review rate limited`(PR #68·#109와 같은 결말). **체크가 초록인 것과
리뷰가 있는 것은 다른 상태다.** PR #68·#109 선례대로 독립 리뷰(`/code-review 111 high`)를 돌렸고 1건이
나왔다 — `blackKeyLeftOffset` 호출부의 `: 0.5` fallback이 도달 불가(옛 `?? 0.5`의 잔재)라는 지적이다.
분기를 지우는 대신 테이블 키를 `number`에서 `1 | 3 | 6 | 8 | 10`으로 좁혀 항목이 빠지면 **컴파일이
실패**하게 고쳤다(`b3d2f29`, 동작 변화 없음). 리뷰가 유도식을 손으로 검산해 구현의
`k*t + (k-1)*B - (k-1)`과 테스트의 독립 공식 `B*(k - 0.5 - k*blacks/whites)`가 모든 pitch class에서
일치함(G# 정확히 0)을 확인했고, 정확성 결함은 0건이었다. 전체 분류는
`docs/recovery/reviews/PR-111.md` Iteration 2.

**2026-09-02 병합**: `b3d2f29` hosted checks 16/16 pass, 리뷰 세 표면(인라인 스레드 0건, 리뷰 본문 없음,
일반 코멘트) 모두 actionable 0건, `MERGEABLE`/`CLEAN` 재확인 후 사용자 승인으로 병합했다.

**Next action**: 다음 후보는 #104(마이페이지 앱 셸 — 범위가 넓어 단계 분할이 필요하다). 사용자가 착수를
지시한 뒤 시작한다. #110·#73·#52·#47은 `omr-service` 변경이라 VM 배포가 필요하고, #61은 #60 선행,
#46은 선택지 미결정, #44는 후순위 명시, #103은 트리아지 미실시다. 이번에 이관한 **DS58-1**(죽은 건반
컴포넌트 3개 제거)은 이월 표의 P2-A에 있다.

**Previous phase**: 이슈 [#71](https://github.com/landfill/ClairKeys/issues/71) 콜백 주소 fail-closed
**완료 — PR #109 병합 (`f2cbb9e`, 2026-09-02 11:01 KST), 이슈 CLOSED**. 후속 이슈
[#110](https://github.com/landfill/ClairKeys/issues/110)(`omr-service` 호스트 검증, #71 선택 항목 2)을 열었다.
다음 코드 작업은 아직 시작하지 않았다. 아래는 이 phase의 진행 기록이다.

(PR #109 생성 시점 기록, 2026-09-02 10:24 KST):
`upload/route.ts`가 `NEXTAUTH_URL` 미설정·공백을 잘못된 URL과 같게 503 `OMR_CALLBACK_NOT_CONFIGURED`로
거부하고 `request.nextUrl`을 더 이상 읽지 않는다. **D-018 Decision 1을 개정하는 결정 변경**이라 D-036을 같은
커밋(`dd6f62b`)에 넣었다. 회귀 `dea17cc`는 수정 전 `OMR_SERVICE_UNAVAILABLE`(행 생성 후)로 실패를 관측했다.
기존 업로드 테스트 11건이 전부 `NEXTAUTH_URL` 없이 통과하고 있었으므로 fixture가 이제 명시한다. 로컬 검증
Jest 85 / 781, tsc, lint, build 통과. 근거 `docs/recovery/validation/2026-09-02-issue-71-callback-fail-closed.md`,
리뷰 `docs/recovery/reviews/PR-109.md`. 이슈 #71 선택 항목 2(`omr-service` 호스트 검증)는 VM 배포 필요로 제외 —
#71 닫힐 때 후속 이슈로 분리한다.

**Previous phase**: 이슈 [#72](https://github.com/landfill/ClairKeys/issues/72) finalize 라우트 불일치
수정 **완료 — PR #107 병합 (`8df8bfd`, 2026-09-02), 이슈 CLOSED**. post-merge 6/6 success. 2026-09-02 열린 이슈 11건을 "난이도 중·하, 범위 명확, 시스템 영향도 하,
독립 진행 가능" 기준으로 트리아지해 #72 → #71 → #58 → #104 순으로 골랐다(`omr-service/` 변경이 필요한
#47·#52·#73은 VM 배포 없이 완료를 주장할 수 없어 제외, #61은 #60 선행 조건, #46은 선택지 미결정, #44는
본문에 후순위 명시). PR [#107](https://github.com/landfill/ClairKeys/pull/107)은 PR #68 리뷰 R8·R11을
처리한다: `/result` fetch 위 주석이 DB 왕복을 SSRF 방어로 설명하던 것을 실제 sanitizer(`UUID_PATTERN` +
`encodeURIComponent`)를 가리키게 고쳤고, nullable `omrJobId`의 409 분기를 finalize·status 두 라우트에서
타입 좁히기라고 표기했으며, `alreadyStored` 단축 경로가 `processingStatus !== 'completed'`인 행을
`completed`로 보정하게 했다. **D-018 Decision 3·Directive가 DB에서 읽은 `omrJobId`를 fetch target으로
못 박고 있고 그 왕복이 PR #68에서 CodeQL request-forgery를 닫은 taint 경계이므로, 왕복·409 분기는 제거하지
않고 유지했다.** 회귀 `e77e4a5`(수정 전 1 failed / 6 passed 관측) → 수정 `bac8cdd`. 로컬 검증 Jest
85 suites / 778 tests, tsc, lint, build 통과. 근거는
`docs/recovery/validation/2026-09-02-issue-72-finalize-route.md`, 리뷰 상태는
`docs/recovery/reviews/PR-107.md`.

**Blocker 해소 (2026-09-02 09:57 KST)**: PR #108이 사용자 승인으로 `e2c6f9e`에 병합됐고 `main`의 post-merge
Security Audit이 success로 돌아왔다. `codex/issue-72-finalize-route`에 `main`을 merge(`9658721`)해 #107의 hosted
checks가 재실행 중이다. 원격·로컬 `codex/deps-browserslist-audit`는 정리했다. 아래는 해소 전 기록이다.

**Blocker (외부, 해소됨)**: PR #107의 Security Audit·Security Scan이 실패한다. 원인은 이 PR이 아니라 2026-09-01
16:42Z에 공개된 `browserslist <=4.28.6` high advisory(GHSA-c83g-rgw3-j3cx)다 — 두 체크 모두
`npm audit --audit-level high`이고, `main`의 마지막 성공은 같은 날 06:12Z(`c9019b4`), 이 날짜의 핸드오프
직접 커밋 `6ed651b`에서도 같은 체크가 실패한다. lockfile만 바꾸는 PR
[#108](https://github.com/landfill/ClairKeys/pull/108)(`npm audit fix`, `--force` 없이, transitive 7개
patch/minor, audit 0건, Jest 777·tsc·lint·build 통과)로 분리했다. 기록은
`docs/recovery/reviews/PR-108.md`. **#108이 병합되기 전에는 어떤 PR도 이 두 체크를 통과할 수 없다.**

**2026-09-02 10:03 KST**: #107 `9658721`의 hosted checks 17/17 pass(Security Audit·Scan·CodeQL 포함). CodeRabbit
수동 리뷰 actionable 1건(R1: R11 보정 update가 try 밖) — ACCEPT, 회귀 먼저 추가해 reject를 관측한 뒤 자체
try/catch로 라우트 JSON 500을 반환하게 고쳐 `56d189a`를 push했다. 기록은 `docs/recovery/reviews/PR-107.md`
Iteration 4.

**2026-09-02 10:18 KST 병합**: 사용자 승인으로 #107을 `8df8bfd`에 병합했다. `56d189a`에서 hosted checks 전부
pass, CodeRabbit R1 스레드 resolved, `MERGEABLE`/`CLEAN`을 재확인했다. post-merge Lint·Security Audit success,
Run Tests·Post-merge tests는 기록 시점에 진행 중. 원격·로컬 `codex/issue-72-finalize-route` 삭제. worktree는
clean `main`. 최종 근거는 `docs/recovery/validation/2026-09-02-issue-72-finalize-route.md`,
`docs/recovery/reviews/PR-107.md` Iteration 6.

**2026-09-02 10:55 KST 리뷰 처리**: CodeRabbit이 `Review rate limited`로 끝나 PR #68 선례대로 독립 리뷰
(`/code-review 109 high`)를 돌렸다. 9건 중 2건이 첫 구현의 실제 결함이었다 — 스킴 미검사(`ftp://` 통과)와
`ERR_INVALID_URL` 객체 로그로 raw `NEXTAUTH_URL` 유출. 둘 다 회귀로 관측(`24424e7`)한 뒤 `getOmrCallbackUrl()`을
`serviceUrl.ts`에 `getOmrServiceUrl()`과 같은 파서로 추가해 고쳤다(`0dd2e07`). 리뷰가 지적한 "운영 `NEXTAUTH_URL`
설정 근거 부족"은 `vercel env ls`로 Production·Preview 존재를 확인해 해소했다(값은 내려받지 않음). 전체 분류는
`docs/recovery/reviews/PR-109.md` Iteration 2. Jest 85 / 793, tsc, lint, build 통과.

**2026-09-02 11:01 KST 병합**: `0dd2e07` 16/16 pass·CLEAN·미해결 0 재확인 후 사용자 승인으로 병합. CodeRabbit은
두 번 모두 rate limited — 이 PR의 리뷰는 독립 리뷰뿐이다. 브랜치 정리 완료, worktree clean `main`.
`f2cbb9e` post-merge 6/6 success (E2E, build, tests, lint, Security Audit).

**Next action**: 오늘 트리아지 순서의 남은 후보는 #58(검은건반 기하 — 실제 기하 기준을 정하는 결정이 선행,
`DECISIONS.md` 항목을 코드와 같은 PR에), #104(마이페이지 앱 셸 — 범위가 넓음). 사용자가 착수를 지시한 뒤 시작한다.
#110은 `omr-service` 변경이라 VM 배포가 필요하며 #73과 함께 처리하는 것이 자연스럽다.

**(이전 next action, 완료됨)**: (1) PR #109 head `0dd2e07`의 hosted CI를 확인한다. CodeRabbit 재요청 결과가 오면 처리한다. (2) 사용자의 명시적 병합
승인 후에만 병합한다. (3) 병합 뒤 `omr-service` 호스트 검증 후속 이슈를 연다. (4) 그다음 후보는 #58(검은건반
기하 — 기준 결정을 `DECISIONS.md`에 먼저 남겨야 함), #104.

**타임스탬프 정정 (2026-09-02 10:24 KST)**: 이 날짜의 앞선 핸드오프 기록에 적힌 09:50·10:05·10:20·10:45·11:05·11:20은
시계를 확인하지 않은 추정값이었다. `main` 커밋 타임스탬프(09:35·09:39·09:57·10:03·10:08·10:18)로 바로잡았다.
내용은 바뀌지 않았다.

**(원래 next action, 이제 착수됨)**: 트리아지 순서의 다음 후보는 이슈 [#71](https://github.com/landfill/ClairKeys/issues/71) —
`src/app/api/omr/upload/route.ts:135`의 `NEXTAUTH_URL` 미설정 fallback을 잘못된 URL과 같게 503
`OMR_CALLBACK_NOT_CONFIGURED`로 보낸다. 이슈의 선택 항목 2번(`omr-service/notify_completion` 호스트 검증)은
VM 배포가 필요하므로 이 트랙에서 제외한다. **주의**: D-018 Decision 1이 "없으면 현재 요청 origin을 쓴다"를
명시하므로, 이 변경은 결정 변경이다 — `DECISIONS.md`에 D-018 개정 항목을 코드와 같은 브랜치·PR에서 함께
커밋해야 한다. 사용자가 착수를 지시한 뒤 시작한다. 그다음 후보는 #58(검은건반 기하, 역시 기준 결정 선행). 병합 뒤 다음 후보는 #71(`upload/route.ts:135`의
`NEXTAUTH_URL` fallback을 503 `OMR_CALLBACK_NOT_CONFIGURED`로 — 이슈의 선택 항목 2번은 `omr-service/`
변경이라 제외), 그다음 #58(검은건반 기하 — 기준 결정을 `DECISIONS.md`에 먼저 남겨야 함).

**Previous phase (still open for operational verification)**: 이슈 [#105](https://github.com/landfill/ClairKeys/issues/105) `/library`·`/explore`
검색 지연 개선 **코드 병합 완료 / 운영 검증 대기**. 변경 전 운영 측정에서 `/library` 앱 셸 뒤 목록 데이터 대기가
1.50~1.59초, 검색 탭 입력 UI 뒤 결과 대기가 3.07~3.27초였고, 공개 검색 API TTFB는 5회
2.87~6.86초였다. 공개 검색의 불필요한 세션·사용자 카테고리 요청, 500ms 초기 debounce, DB 질의의
두 파형 실행, 라이브러리의 검색·mutation 중복 요청과 카테고리 로딩 결속을 해소한 PR
[#106](https://github.com/landfill/ClairKeys/pull/106)을 review-ready로 열었다. 코드 head는
`356891f0d7640ee3762a837141f29048307c2a3c`, 검증은
`docs/recovery/validation/2026-09-01-issue-105-performance.md`, 리뷰 상태는
`docs/recovery/reviews/PR-106.md`에서 확인한다.

**Next action**: 병합 커밋 `f559402d1e07bd8c18b1064a95b2f59ce413db40`의 post-merge checks 6개가 모두
성공했다. production 배포 뒤 `/library` 인증 waterfall과 `/explore` 검색의 after-value를 같은 조건으로
재고, `20260901060000_add_sheet_lookup_indexes`의 3개 인덱스가 운영 DB에 적용됐는지 확인한다. 이슈
#105는 이 검증이 끝나야 닫을 수 있다. 현재 운영 DB·Vercel production은 아직 확인·변경하지 않았다.

**2026-09-01 PR #106 CI·preview 상태**: 필수 CI와 change-aware checks는 모두 성공했다 — Lint,
Lint and Type Check, Run Tests, Unit Tests, Security Audit, Security Scan, Build Check, E2E Tests 두 개,
CodeQL, Vercel, aggregate checks가 모두 초록이다. Vercel preview 첫 검색 결과 대기는 2.298초로 운영
기준 3.068~3.270초보다 줄었고, 이어진 3회 warm-cache 결과 대기는 17ms·16ms·219ms였다. 입력 UI는
232~327ms에 보였다. preview 도메인은 production OAuth 세션을 공유하지 않아 인증 `/library`는
after-value를 재지 못했다. 수동 CodeRabbit 리뷰는 actionable 4건과 diff 밖 props-export 1건을 냈다.
동시 인덱스, public 정렬 인덱스, route-scoped query header, Strict Mode 중복 예약, props export를
수용했고 `userId, updatedAt`을 `createdAt`으로 바꾸라는 부분은 실제 `/api/sheet`의 `updatedAt desc`
근거로 부분 기각했다. reviewer가 이 기각 근거와 나머지 수정 4건을 모두 확인했고 review thread 4개는
전부 resolved다. 리뷰 수정 head에서 migration 주석을 실행문으로 센 테스트 때문에 hosted Run Tests와
Unit Tests가 한 번 실패했으나 행 시작 정규식으로 고친 `356891f`에서 모든 CI가 다시 성공했다.

**Previous completed operational track**: OMR VM 교체 운영 문서 보강 **완료**. 모두의AI가 OS만 설치된 새 VM과 접속정보를 할당한
시점부터 저장소만으로 재구축할 수 있는지 점검했고, 기존 문서가 이미 준비된 호스트에서 시작해 새
PEM·host fingerprint·OS/사양/권한 검수, provider 포트 요청, Vercel 전체 변수, 절체·롤백·반납을
다루지 않는 것을 확인했다. canonical A–Z 가이드 `docs/vm-replacement.md`와 진입 링크를 PR
[#102](https://github.com/landfill/ClairKeys/pull/102)에 추가했다. 애플리케이션·OMR 런타임·배포 설정은
바꾸지 않았다. 검증 근거는 `docs/recovery/validation/2026-08-31-omr-vm-replacement-guide.md`, PR
상태는 `docs/recovery/reviews/PR-102.md`에서 확인한다. 사용자 승인으로 PR #102를 merge commit
`941d897ddc998cca2f958c948b79ee99764757dc`에 병합했고 post-merge checks 6개가 모두 성공했다.

**VM 교체 트랙의 next action**: 실제 모두의AI VM 교체 요청이 생기면 병합된 `docs/vm-replacement.md`의 0절부터
실행하고 새 날짜의 운영 validation을 남긴다. 이번 문서 작업에서 외부 VM·Vercel 상태는 바꾸지 않았다.
작업 브랜치 `codex/ops-vm-replacement-guide`는 local/remote tip이 main에 포함된 것을 확인한 뒤
원격→로컬 순서로 삭제했으며 현재 worktree는 clean main이다.

**2026-08-31 신규 후속 이슈 3건 등록**: 악보 재생의 모든 노트에 손가락 번호를 제공하는 데이터·표시
계약은 이슈 [#103](https://github.com/landfill/ClairKeys/issues/103), 마이페이지를 공통 앱 셸과 디자인
시스템에 맞추는 작업은 이슈 [#104](https://github.com/landfill/ClairKeys/issues/104), 운영 `/library`
진입과 `/explore` 검색 탭의 응답 지연을 계측해 원인을 확정하고 개선하는 작업은 이슈
[#105](https://github.com/landfill/ClairKeys/issues/105)에 각각 기록했다. #105 본문의 코드 관찰은 확정
원인이 아니라 운영 waterfall·서버·DB 계측으로 검증할 조사 후보로 구분했다. 세 이슈 모두 구현은
시작하지 않았고 애플리케이션·운영 환경은 변경하지 않았다.

**2026-09-01 이슈 #44 후순위 전환 및 조사 게이트 보강**: 사용자가 OMR 박자 오류 작업은 난도가 높아
작업 순서를 뒤로 미루기로 했다. 이슈 [#44](https://github.com/landfill/ClairKeys/issues/44) 본문을
갱신해 즉시 구현 대상이 아닌 후순위 조사 작업임을 명시했다. 기존 근거는 보존된 MusicXML의 불가능한
마디 길이와 서비스·로컬 변환의 요약 수치 일치까지만 증명하며, 실제 서빙 JSON과 OMR `/result`의 전체
이벤트 동일성이나 원본 PDF→MusicXML→JSON의 원인 분리는 증명하지 못했다. 착수 전 원본 PDF,
MusicXML, `/result`, Supabase 서빙 JSON의 식별자·SHA-256을 연결하고, JSON의 박자·템포가 추출값인지
fallback인지 구분하며, 마디/part/staff/voice/divisions 진단 sidecar로 노트 시간을 대조하는 조건을
추가했다. 이 증거 게이트 전에는 Audiveris 조정·변환기 보정·비정상 마디 차단 중 해결책을 선택하지
않는다. 코드·운영 환경은 변경하지 않았다.

**이번 작업의 전제 수정 기록**: 사용자가 두 번 전제를 바로잡았다. 첫째 VM마다 PEM이 바뀐다. 둘째 작업자가 NAVER
Cloud에서 VM을 만들지 않고 모두의AI 신청으로 OS-only VM·주소·SSH PEM을 할당받는다. NCP 인증키
생성·관리자 비밀번호 확인이라는 잘못된 전제를 제거하고, 모두의AI 할당 체크리스트·새 SSH PEM·host
fingerprint·OS/사양/권한 확인·provider 포트 요청·구 VM/PEM 반납으로 커밋 `0dad647`을 push했다.
최신 head의 Lint, Lint and Type Check, Run Tests, Security Audit, E2E Tests, Vercel, aggregate checks가
모두 성공했고 병합 직전 `MERGEABLE`/`CLEAN`이었다. 사용자가 문서 PR에는 CodeRabbit 리뷰를 요청하지
말라고 지시해 이번 head에는 수동 리뷰를 요청하지 않았다.
그 직전 head `9c43d35`까지의 CI는 모두 성공했다. 수동 CodeRabbit 리뷰 4건을 처리했고 reviewer가 네 건
모두 addressed로 확인했으며 미해결 스레드는 0건이다. fence 태그·공개 주소·절체 drain은 수용했고,
현재 테스트 deployment에서 3000/HTTP를 제거하라는 요구는 D-012를 사용자 결정 없이 뒤집으므로
기각하되 격리 테스트 전용 안전 게이트와 실사용자 TLS 필수를 더 명확히 했다. 네 스레드는 모두 해결
상태다. 실제 모두의AI VM 신청·Vercel 환경변수 변경·절체는 이번 문서 PR 범위가 아니다.

**Previous completed track**: 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76) 디자인 개편 트랙.
DS-0, DS-G1, DS-1, DS-2, DS-3, DS-4, DS-5, DS-6, **DS-7까지 `DONE`**이고, **이슈 #76은
2026-08-30 `COMPLETED`로 닫혔다** — 사용자 지시로 종단 판정 요약을
[코멘트](https://github.com/landfill/ClairKeys/issues/76#issuecomment-5468480106)로 남긴 뒤 닫았다.
완료 조건 7개 판정은 `docs/recovery/validation/2026-08-30-DS-7-states.md`에 있고, 조건 3·4·7은
자동 검사가 아니라 사용자 수동 확인이 근거다.
**2026-08-30 사용자 지시로 WCAG AA 요건(구 조건 7)을 제거해 완료 조건은 7개다** — D-030,
PR [#95](https://github.com/landfill/ClairKeys/pull/95) 병합 완료(merge `08100c7`).

**이전 트랙의 next action**: 이슈 #76의 후속 작업 후보를 우선순위화한다. DS-7의 7개 조건과 PR #99 CI는 결착됐고,
상세 근거는 `docs/recovery/validation/2026-08-30-DS-7-states.md`와 `docs/recovery/reviews/PR-99.md`에 있다.
2026-08-30에는 버튼·뱃지·정보 라벨의 시각 일관성 후속 작업을 시작했고, 사용자 승인으로 PR #100을
merge commit `bff1cc07b92d219c0250f3685f67feb019a75890`에 병합했다. 브라우저 피드백으로 재생
컨트롤까지 확장한 코드·테스트는 PR
[#100](https://github.com/landfill/ClairKeys/pull/100)에 있고, 검증 근거는
`docs/recovery/validation/2026-08-30-ui-button-badge.md`에 있다. PR의 현재 상태와 리뷰 결과는
`docs/recovery/reviews/PR-100.md` 및 GitHub live state에서 확인한다.
후속 브라우저 피드백으로 내 악보와 새 악보 업로드의 검색·정렬·카테고리·메타데이터 필드 라운드도
정리했고, 사용자 승인으로 PR #101을 merge commit `2f35a99900528d61743c0376080e4e34c8f91053`에
병합했다. 코드·테스트는 PR [#101](https://github.com/landfill/ClairKeys/pull/101), 검증 근거는
`docs/recovery/validation/2026-08-30-ui-library-controls.md`에 있다.
README 재작성 중 확인된 후속 작업 후보 네 건이 아래 #83 절에 있다.

**이슈 #65·#66 종결 (2026-08-30 KST)**: 사용자가 실제 기기에서 두 재생 결함을 실측해 통과했다고
확인했다. #65는 PR #67·#74·#75로 구현된 반응형 건반·재생 중 가로 전환을, #66은 현재 재생 진행 표시를
각각 종결 근거로 삼아 종단 코멘트를 남기고 `COMPLETED`로 닫았다. #65의 남은 모바일 스택 정리와 인증 E2E
fixture는 제품 결함을 다시 열지 않는 별도 후속 작업 후보로 유지한다.

**이슈 [#83](https://github.com/landfill/ClairKeys/issues/83) README 재작성 완료, 2026-08-30 `CLOSED`**:
사용자 지시로 종단 요약을 [코멘트](https://github.com/landfill/ClairKeys/issues/83#issuecomment-5468608101)로 남긴 뒤 닫았다.
커밋 `632a08ff60dfd6e9ec0a0ff2a361c6b9a71711ec`, `main` 직접 push. 사용자가 "리드미 수정은 PR 없이
처리"라고 지시해 브랜치·PR 없이 커밋했다 — README와 새 `docs/*.md`는 AGENTS.md의 직접 커밋 예외
목록에 없으므로, 이 지시 없이 같은 방식을 반복하지 않는다. 애플리케이션 코드는 변경하지 않았다.
push 직후 check-runs 6개(Lint, Run Tests, E2E Tests, Security Audit, Post-merge tests,
Post-merge build)가 모두 success다.

README를 578줄에서 200줄로 줄이고, 걷어낸 상세를 `docs/architecture.md`, `docs/environment.md`,
`docs/limitations.md`, `docs/security.md`, `docs/testing.md`, `docs/deployment.md` 여섯 문서로
옮겼다. 옛 README의 사실 오류를 코드 대조로 바로잡았다: Next 14/React 18 표기(실제 15.5.21/19.2.1),
없는 npm 스크립트 3개, 없는 `.env.example` 참조, `your-username` URL, 폴링 3초(실제 5초),
"88키 풀 피아노"(실제로는 곡 음역을 흰건반 경계로 스냅), Tone.js 기반 재생(실제는 Web Audio API +
31개 mp3 샘플), MIT/LICENSE 참조(파일도 package.json license 필드도 없음).

**미구현 판정의 기준은 파일 존재가 아니라 라우트로부터의 도달 가능성으로 삼았다.** 이 기준으로
지원 기능에서 제한사항으로 옮긴 것: PWA 설치 프롬프트·푸시 알림(`src/components/pwa/*`가 어디에도
import되지 않음), 전체화면·터치 제스처(`src/components/mobile/*` 동일), 연습·따라하기 모드
(`FallingNotesPlayer.handleModeChange`가 로그만 남기고 반환), WCAG AA·axe-core·Lighthouse CI
(근거 코드 없음), `AnimationPlayer`(`/sheet/[id]`는 `FallingNotesPlayer`를 쓴다).

README 재작성 중 확인된 후속 작업 후보 네 건 (이번 커밋 범위 밖, 코드·설정 변경이라 PR 필요):

1. `.env.example`이 없다. 새 기여자는 환경변수를 `docs/environment.md`에서 옮겨 적어야 한다.
2. `LICENSE` 파일과 `package.json`의 `license` 필드가 둘 다 없다. 옛 README는 MIT라고 적었으나
   근거가 없어 "라이선스 파일 없음"으로 바꿨다. 실제 의도를 정해 파일로 고정해야 한다.
3. `vercel.json`의 `/dashboard` → `/app` 리다이렉트가 존재하지 않는 라우트를 가리킨다.
4. 루트의 `README.production.md`, `DATA_FLOW_EXPLAINED.md`, `SUPABASE_STORAGE_SETUP.md`가
   `docs/`의 새 문서와 범위가 겹친다. 정합성 확인 후 통합하거나 삭제할지 판단이 필요하다.

**DS-7 코드·검증**: PR #99, 코드 커밋 `42069a4c6c7f5eedbf8894836d2a80df1497bba2`, merge
commit `3eaee81`. 공용
`StatusState`로 업로드·내 악보·탐색·검색·상세·로그인 오류/빈 상태를 통일했다. 전체 Jest 80 suites/
755 tests, build, 5개 프로젝트 E2E 25 tests, lint, typecheck가 통과했고 보호 재생 파일 diff는 비어 있다.
관리자 `admin/update-finger-data`는 대상 화면 표 밖의 유지보수 화면이라 제외했다.

**DS-6 병합 완료**: PR #98은 merge commit `8dd593fe2905fb364d05a0a0df4b722b38e6236b`로 병합됐고,
병합 커밋 check-runs 6개가 모두 성공했다. `codex/ds-6-explore`는 원격 삭제 후 로컬 삭제했으며
최종 `main`은 clean이다. 사용자는 시크릿 창에서 탐색 → 상세 → 미리보기 → 로그인 → 같은 곡 복귀
(이슈 #76 완료 조건 3의 실제 판정), 1440·1024·390 반응형, DS-5에서 넘어온 실기기 확인을 해야 한다.
카드 재생 시간 정규화와 `/sheet/[id]` 403/404 열거는 DS0-1과 함께 다룰 별도 후속 작업 후보이며
PR #98에서 고치지 않는다.

**Previous action**: **DS-5(학습 플레이어)를 연다** — `codex/ds-5-learning-player`. 선행 조건 DS-1은
`DONE`이라 지금 착수 가능하다. **D-019 결정 8 매듭은 D-031이 풀었다** — 홈에서 재생기가 빠지면
`PlaybackControls`의 실사용처가 `AnimationPlayer` 하나라 공유 제약이 없다. 구간 반복(DS0-9)과
이모지 교체를 props 플래그나 별도 컴포넌트 없이 직접 넣는다. **D-031을 담은 PR
[#96](https://github.com/landfill/ClairKeys/pull/96)이 병합돼(merge `e53ad0f`) 계획이 확정됐으므로
지금 착수 가능하다.** DS-5는 홈 재생기 제거와 영역 확보도 함께 하며, 그때 깨지는 검사 3건이 DS-5
완료 조건에 적혀 있다. 실기기 보고로 세 번 고친 재생 기하(`PX_PER_SEC` 140 등 7개 상수)는 **한 픽셀도
바꾸지 않는다** (D-024). DS-6은 DS-5를 선행 조건으로 두므로 병렬 착수 대상이 아니다.

**업로드 한도 50MB → 4.5MB (D-032).** 사용자 지시로 이월 항목 DS3-1을 해소했다. Vercel Function의
요청 본문 한도가 4.5MB라 그보다 큰 본문은 라우트가 실행되기도 전에 플랫폼이 413으로 끊는데, 화면과
서버는 50MB를 말하고 있었다. 한도가 여섯 곳에 각자 적혀 있던 것을 `MAX_UPLOAD_BYTES` 한 곳으로
모으고 표시용 `MAX_UPLOAD_MB`를 파생시켰다 — `/api/omr/upload`가 같은 값을 따로 하드코딩한 것이
한도가 어긋난 채 남아 있던 이유다.

**사용자가 PR을 만들지 말라고 지시해 `main`에 직접 커밋했다.** AGENTS.md는 애플리케이션 코드에
브랜치·PR·리뷰를 요구하므로 이는 명시적 규약 이탈이고, 커밋 메시지에 그 사실을 남겼다. 규약 자체는
바꾸지 않았다 — 이 건에 한한 사용자 지시다.

**여유를 뒀다 (D-033).** 사용자 지시로 4.5MB 정각에서 **4MB**로 다시 낮췄다. 재보니 실제 위험은
multipart 오버헤드(약 2KB)가 아니라 **MB 해석 차이(218,592바이트)** 였다 — 플랫폼 문서의 `4.5MB`가
십진이면 4,500,000이고, 이진으로 읽은 4,718,592는 이미 그것을 넘는다. 4MB는 두 해석 모두에서
안전하다. **이 변경에서 테스트를 한 줄도 고치지 않았다** — 단일 출처 정리가 작동한다는 증거다.

**#76 계획 개정 완료 — PR [#96](https://github.com/landfill/ClairKeys/pull/96) 병합
(merge `e53ad0f`). 홈은 재생기를 걷어내고 자리만 잡는다 (D-031).** 사용자가 홈 샘플을 정적 예시(GIF 등)로 바꾸기로 했고, 그 전 단계로 재생기를
제거하고 영역만 확보한다. 구현은 DS-5가 하므로 이 PR은 **결정과 계획만** 바꾼다(코드 0건).

이 결정이 **D-019 결정 8을 해소한다.** `PlaybackControls`의 실사용처를 세어보니 둘뿐이었다 —
`AnimationPlayer`와 `FallingNotesPlayer`. `AdvancedPlaybackControls`는 배럴과 `LazyComponent`가
export만 하고 렌더하는 화면이 0곳인 **죽은 코드**다. 원래 근거였던 demo 페이지는 DS-1이 이미
제거했다(D-027). 홈까지 빠지면 실사용처가 하나라 공유 컴포넌트가 아니게 된다.

**완료 조건 2개가 바뀐다.** 조건 1의 ①은 `실제 낙하 노트 결과` → `낙하 노트 결과가 들어갈 영역`
으로 완화(사용자 선택)되고 판정자가 `DS-2(②③), DS-5(①)`이 된다. 조건 3은 판정자에서 DS-2가
빠져 **DS-6 공개 악보 단독**이 된다. 이월 항목 C5는 재생기와 함께 사라진다.

merge commit check-runs **6/6 성공**(마지막 완료 E2E Tests, 2026-08-30T01:49:53Z), Vercel
`success`. 로컬·원격 tip이 모두 `main`에 포함됨을 확인한 뒤 원격 → 로컬 순으로 삭제했다.
CodeRabbit은 "별 10개 미만 저장소" 정책으로 **리뷰를 실행하지 않았다** — 지적이 0건인 것과 리뷰가
없는 것은 다른 상태다. 상세는 `docs/recovery/reviews/PR-96.md`.

**#76 WCAG 요건 제거 완료 — PR [#95](https://github.com/landfill/ClairKeys/pull/95) 병합
(merge `08100c7`).** 사용자 지시로 WCAG AA 요건을 계획 문서·CI·구현 계약 세 층에서 제거했다.
완료 조건 7 삭제와 조건 8 → 7 재번호, DS-1~DS-7의 접근성 요건 제거, `accessibility-check` CI
job과 `prChecksWorkflow.test.ts` 검사 3건 제거, `PlaybackControls`·`icons.tsx`·`OptimizedImage`의
ARIA 계약과 `playbackControlsA11y.test.tsx`·`globalStyles.test.ts` 포커스 가드 삭제다.
merge commit check-runs **6/6 성공**(마지막 완료 E2E Tests, 2026-08-30T00:54:24Z), Vercel
`success`. 로컬·원격 tip이 모두 `main`에 포함됨을 확인한 뒤 원격 → 로컬 순으로 삭제했다.
검증 상세는 `docs/recovery/validation/2026-08-30-D-030-wcag-requirement-removal.md`,
리뷰 기록은 `docs/recovery/reviews/PR-95.md`.

**제거가 두 번 불완전했다.** Codex 워커 리뷰가 DS-7 `검증 명령`의 axe·수동 검사 잔재를 잡았고,
직접 대조에서 DS-5의 `In scope`·`Completion criteria` 2건이 더 나왔다. CodeRabbit이 DS-2의 C6
담당과 DS-4 완료 기록의 조건 번호가 폐기된 판정을 가리키는 것을 잡았다. **원인은 요건이 한 절에만
있다고 가정한 것** — 이 저장소의 phase 문서는 같은 요건을 네 곳에 반복한다.

**CodeRabbit의 ARIA 복원 요구(Major)는 기각했다.** D-030이 기록한 사용자 결정을 되돌리라는
요구다. 같은 지적이 반복될 것이므로 기각 근거를 **D-030 Directive**에 남겼다 — 결정을 바꾸려면
사용자에게 묻고 D-030을 대체하는 새 결정을 기록한다.

**DS-4는 PR 세 건으로 끝났다.****DS-4는 PR 세 건으로 끝났다.** #92(merge `64aecb2`)가 구현, #93(merge `d13bb23`)이 891px 관측의
카드 과밀 정리, #94(merge `cb42fe4`)가 D-029 결정 기록이다. 목록·상세 API는 `availability`만
반환하고 `processingStatus`·`omrJobId`를 반환하지 않는다. 목록은 파생 상태 4종의 배지와 행동
(연습 시작 / 처리 중 / 다시 업로드), 제목 편집, 빈 상태 업로드 CTA, 앱 내 삭제 오류를 갖는다.
완료 기준 8개를 병합된 `main` 코드에 대조한 표는 `docs/recovery/phases/DS-4-my-library.md`의
2026-08-30 Progress 항목에 있고, 검증 상세는
`docs/recovery/validation/2026-08-30-DS-4-my-library.md`에 있다.

**착수 전 선행 확인 완료**: 2026-08-29 KST 운영 DB 분포는 `processing` 2건, `completed` 2건이다.
총 4건이고 `'pending'` + 빈 `animationDataUrl` 행은 0건이다. 따라서 `알 수 없음`은 현재 운영
사용자에게 보이지 않으며, DS-4는 그 상태를 미래/legacy 데이터를 위한 계약으로 구현했다.

**DS-4가 판정하지 못한 것**: 반응형 1440·1024·390은 사용자의 수동 확인이 근거이고 자동 검사는
여전히 없다. `/library`는 인증 뒤 화면이라 공개 E2E와 axe가 지나가지 않는다 — DS-6의
`/sheet/[id]`가 같은 사각에 있다. 이어하기는 `PracticeSession`에 재생 위치 필드·복원 소비자가
없어 구현하지 않았고, 저장 계약을 정하는 후속 작업이 남는다(아래 이월 표 DS4-1).

PR #92·#93·#94의 작업 브랜치는 모두 local·remote tip이 `main`에 포함됨을 확인한 뒤 원격→로컬 순으로
삭제했다. PR #94 merge commit `cb42fe4`의 check-runs는 **6/6 성공**이다(마지막 완료 E2E Tests,
2026-08-29T16:15:43Z). 리뷰 표면 3곳(스레드·리뷰 본문·일반 코멘트) 모두 actionable 0건이었다.

**저장소 상태**: 워킹 트리 clean, 로컬 브랜치는 `main` 하나, worktree도
`/Users/h0977/dev/ClairKeys` 하나, 열린 PR 없음. `main`의 최신 **코드** 반영은 여전히 PR #95의
merge commit `08100c7`이다 — PR #96은 문서 전용이라 코드를 바꾸지 않았다. sha를 여기 고정하지
않으니 세션 시작 시 `git fetch`로 확인한다.

### 이 트랙에서 배운 것 (반복하지 않기 위해)

네 번 다 초록 CI가 침묵했다. DS-4 이후도 같은 함정을 만난다.

- `toBeVisible`·`toBeAttached`는 **화면 밖 요소에도 통과한다.** "최초 뷰포트 안"을 검사하려면
  `boundingBox`로 좌표를 재거나 `toBeInViewport()`를 쓴다.
- `useFallingNotesPlayer.ts:59`는 `startAudio` 성공에 재생 상태를 결속한다. headless AudioContext 생성·resume이 실패하면 관측할 재생 상태가 없으므로 DS-6 E2E는 탐색·클릭 보조 근거일 뿐 실제 재생은 시크릿 창에서 판정한다.
- axe는 정적 검사라 **`div`에 붙은 `onClick`을 보지 못한다.** 마우스 전용 인터랙션은 초록 CI를
  통과한 채 남는다. 키보드 등가성은 따로 확인한다.
- 방어 함수의 테스트를 **구현의 금지 목록에서 베끼면** 구현이 놓친 것을 함께 놓친다. 계약을 직접
  거는 불변식을 하나 넣는다(예: "통과시킨 값은 반드시 같은 origin으로 해석된다").
- 화면을 인증 뒤에서 공개로 옮기면 **그 화면의 기존 결함이 처음으로 검사 범위에 들어온다.**
  DS-6이 `/sheet/[id]`를 열 때 같은 일이 반복된다.
- **리뷰 도구도 틀린다.** CodeRabbit의 `flex-shrink-0` 지적은 전제가 이 저장소 빌드 산출물과 달라
  기각했다. 수용도 기각도 근거는 산출물이다.
- PR 리뷰 피드백은 **세 표면**을 모두 조회한다 — 리뷰 스레드, 리뷰 본문(`pulls/N/reviews[].body`의
  접힌 블록), 일반 코멘트(`issues/N/comments`). PR #89에서 스레드만 보고 3건을 놓쳤다.
- **테스트 대역이 결함을 숨긴다.** `jest.setup.js`의 `File` 대역에는 `slice`도 `arrayBuffer`도
  없어서 바이트를 읽는 코드는 애초에 테스트할 수 없었다. 그래서 아무도 쓰지 않았고, 암호 걸린 PDF가
  검사 없이 통과했다. 대역을 걷어내니 기존 7개 suite가 그대로 통과한다 — 처음부터 필요 없던 것이다.
- **가짜 타이머를 `render` 뒤에 켜면 테스트가 조용히 무의미해진다.** 폴링 간격이 이미 진짜 타이머로
  잡힌 뒤라 시간을 아무리 돌려도 울리지 않는다. DS-3에서 "완료 뒤에는 더 묻지 않는다"가 그렇게
  통과하고 있었다.
- **인증 뒤 화면은 이 저장소에서 자동 검사가 0이다.** axe는 홈만, E2E는 공개 경로만 본다. 초록 CI가
  `/upload`·`/library`·`/sheet/[id]`에 대해서는 아무 말도 하지 않는다 — DS-4와 DS-6이 같은 사각에
  있다. DS-3은 `next-auth/jwt`로 세션 쿠키를 발급해 로컬 실제 브라우저로 재고 넘어갔다.
- **검증된 토큰에 `opacity-*`를 씌우면 그 대비 계산이 무효가 된다.** DS-1이 잰 6.69:1이 화면에서는
  2.71:1이었다. "DS-1 토큰만 사용한다"는 회귀 기준은 이 경우를 잡지 못한다.
- **컴포넌트 단위 테스트가 둘 다 통과해도 합친 화면은 틀릴 수 있다.** 상태가 두 컴포넌트에 걸치면
  (여기서는 중복 가드와 작업의 끝) 회귀를 페이지 수준에 둔다.
- **CodeRabbit의 outside-diff 지적은 인라인 스레드에 없다.** PR #95에서 스레드는 `totalCount=0`
  인데 리뷰 **본문**에 3건이 들어 있었다. 플랫폼 제약으로 diff 밖 지적은 인라인에 못 붙는다 —
  PR #89에서 스레드만 보고 3건을 놓친 것과 정확히 같은 경로다. 세 표면을 다 본다는 규칙은
  이래서 있다.
- **자동 리뷰는 결정 맥락을 보지 못한다.** CodeRabbit이 D-030으로 의도적으로 제거한 ARIA를
  Major로 복원하라고 했다. 도구는 diff의 기술적 타당성만 본다. 기각할 때는 결정 문서에 근거를
  남겨 다음 세션이 같은 판단을 다시 하지 않게 한다.
- **이 저장소의 phase 문서는 같은 요건을 최대 네 곳에 반복한다** — `In scope`,
  `접근성·반응형 검증`, `Completion criteria`, `검증 명령`. D-030에서 두 번째 절만 지웠더니
  DS-7은 "요건은 없는데 axe를 돌려 위반 0건을 확인하라"고 스스로 모순됐고, DS-5는 지웠다고 믿은
  요건이 완료 조건에 살아 있었다. 요건을 제거할 때는 네 곳을 전부 훑는다.
- **접근성 속성을 테스트 선택자로 쓰면 그 속성을 지울 때 무관한 검사가 함께 죽는다.** D-030으로
  `aria-label="재생"`을 지우자 완료 조건 3의 E2E가 5개 브라우저에서 전부 실패했다. 선택자의 의도
  (그 버튼)와 속성의 의도(스크린리더 이름)가 달라서, 한쪽을 정책으로 없애면 다른 쪽이 예고 없이
  무너진다. 살아 있는 요건의 검사에는 `data-testid` 같은 전용 훅을 쓴다.
- **`setInterval` + async 콜백은 요청을 겹치게 한다.** 앞선 호출이 끝난 뒤 다음을 예약하면 늦게 온
  응답이 정착한 상태를 되돌리는 경합 자체가 사라진다.
- 로컬 `npm run test:e2e`는 `.gitignore:34`가 `.env*`를 무시하므로 CI와 같은 환경 변수를 주입해야
  한다. 그렇지 않으면 NextAuth `NO_SECRET` 로그 폭주가 서버를 먹통으로 만든다.
- `playwright.config.ts:69`의 `reuseExistingServer: !process.env.CI`는 중단된 실행의 고아 서버도
  재사용한다. 그 서버는 SIGTERM을 받지 못할 수 있어 `kill -9`가 필요하며, 상세 근거는 `2f92264`다.
- `animationEngine.setLoopSection`의 `clampedStart + 1`은 원래 최소 1초 루프 보장이었지만 A–B
  마커 뒤에는 학습자가 고른 경계를 몰래 넓히는 결함이 됐다. 새 기능이 기존 코드의 의미를 바꾼 사례다.
- CodeRabbit의 ARIA 복원 지적은 D-030 Directive로 기각했고, **CodeRabbit이 `DECISIONS.md`를 직접
  조회해 근거를 검증한 뒤 철회했다.** 결정 문서를 근거로 제시하는 방식이 실제로 작동했다.
- **테스트 대역을 두 겹으로 두면 한 겹이 죽어도 초록이 유지된다.** PR #98에서 `addInitScript`의
  fetch 패치가 합성 응답을 직접 반환해 `page.route` fixture 3개가 죽은 코드였고, 그래서 CodeRabbit
  지적을 고친 수정이 **실행되지 않는 쪽에 적용**됐다. 요청 대역은 한 겹만 둔다.
- **앱이 재생 상태를 오디오 시작에 결속한다** (`useFallingNotesPlayer.ts:59`). headless 브라우저에서
  AudioContext가 안 되면 관측할 재생이 없다. E2E는 재생을 증명하지 못하며 완료 조건 3의 판정자는
  시크릿 창 수동 확인이다.
- **자동 리뷰는 사람이 트리거해야 돌고 뒤늦게 도착한다.** 체크가 `Review in progress`인 동안에는
  결착을 기다린 뒤 세 표면을 다시 조회한다.

### Known blockers / 이월된 것

DS 트랙을 막지는 않지만 담당이 정해져 있거나 아직 없는 항목이다.

**자동 근거가 없는 확인:** 1440·1024·390 반응형과 DS-5에서 넘어온 실기기 확인(폰 가로 회전·컨트롤
압축·낙하/건반 1.15 비율)은 여전히 사용자 확인이 필요하다. 조건 3·4·7은 사용자가 2026-08-30
수동 확인을 수행하고 통과를 보고했으므로 이슈 #76 판정에는 반영됐다.

| 항목 | 내용 | 담당 |
|---|---|---|
| **DS0-1** | 비공개 악보의 애니메이션 JSON이 익명으로 200(78KB). API의 403은 URL 은닉일 뿐이고 객체는 public 버킷에 있다 | **DS 범위 밖, GitHub 이슈 미등록** |
| **DS6-SEC** | `/sheet/[id]`가 없는 악보 404와 존재하지만 권한 없는 악보 403을 익명에게 구분시켜 리소스 열거가 가능하다 | **DS 범위 밖 별도 보안 작업, DS0-1과 함께 검토** |
| **DS6-DURATION / D-035** | `SheetMusic`에 카드용 duration 값이 없고 애니메이션 JSON에만 있어 공개 카드에서 곡 길이를 비교할 수 없다 | **카드 재생 시간을 위한 duration 정규화 후속 후보** |
| **DS4-1** | **이어하기가 없다.** `PracticeSession`은 `durationSeconds`·`completedPercentage`만 저장하고 재생 위치 필드도 복원 소비자도 없다. UI를 만들기 전에 **무엇을 저장할지**를 정해야 한다 — 저장 계약이 선행이다 | **결정 필요, GitHub 이슈 미등록** |
| DS4-2 | `/library`의 반응형 1440·1024·390 근거가 사용자의 수동 확인뿐이다. 인증 뒤 화면이라 공개 E2E가 지나가지 않는다. D-030으로 접근성 담당이 사라져 **반응형 항목으로만 남는다** | DS-7(종단 반응형) |
| **DS5-1** | **실기기 수동 확인 미실행**: 폰 가로 재생의 회전, 컨트롤 압축, 낙하/건반 1.15 비율. 자동 검사가 이를 대체하지 않으며 사용자 확인이 필요하다 | 사용자 확인 필요 |
| ~~C5~~ | ~~`HOME_SAMPLE_ANIMATION.tempoSource: 'user'`가 "직접 입력"으로 읽히던 문제~~ → DS-5가 홈 재생기를 제거해 자동 소멸 | 해소됨 |
| C6 | 홈의 가로 스크롤 가드가 매칭 0개라 vacuous | DS-7 |
| — | `flex-shrink-*` 표기 일괄 현대화(동작 문제 없음) | P2-A |
| DS0-2 잔여 | `/api/processing`·`/api/notifications`·`useBackgroundProcessing`·`ProcessingDashboard` 삭제. DS-1은 도달 경로만 없앴다 | P2-A |
| — | `BackgroundFileUpload`의 `/processing` 링크 2곳 | P2-A |
| — | **`AdvancedPlaybackControls`와 `LazyAdvancedPlaybackControls`가 죽은 코드다.** 배럴과 `LazyComponent`가 export만 하고 렌더하는 화면이 0곳이다 (D-031에서 확인) | P2-A |
| **DS58-1** | **`PianoKeyboard.tsx`·`FullScreenPiano.tsx`·`LandscapePianoInterface.tsx`가 죽은 코드다.** 뒤 둘을 import하는 파일이 `src/components/mobile/` 밖에 0개다(2026-09-02 확인). `PianoKeyboard.tsx`는 실제의 2배 이상 과장된 흑건 편차를 그리며, **이슈 #58 할 일 3(두 구현 통일)이 여기로 이관됐다** — 도달 불가라 회귀를 관측할 수 없고, 죽은 코드는 통일이 아니라 제거가 맞다. 되살린다면 D-037의 유도를 쓴다 | P2-A |
| ~~DS-5 선행~~ | ~~구간 반복(DS0-9)과 이모지 교체가 D-019 결정 8과 부딪힌다~~ → **D-031이 해소하고 PR #96이 병합돼 선행 조건이 없다** | **해소됨** |
| ~~DS3-1~~ | ~~업로드 한도 50MB가 Vercel 요청 본문 한도 4.5MB와 충돌~~ → **D-032로 한도를 4.5MB로 낮춰 해소.** 숫자는 `MAX_UPLOAD_BYTES` 한 곳에서 온다 | **해소됨** |
| ~~DS3-2~~ | ~~한도가 4.5MB 정각이라 근접 파일이 여전히 413~~ → **D-033으로 4MB 여유를 둬 해소.** 실제 위험은 오버헤드(2KB)가 아니라 MB 해석 차이(218KB)였다. `uploadFailures.ts`의 `status === 413` 분기 부재는 남지만, 크기로 413에 도달하는 경로가 사실상 없어져 견고성 항목이다 | **해소됨** (413 분기는 견고성 잔여) |

이번 재개에서 확인한 운영 교훈: Orca 런타임이 작업 중 자동 업데이트되면 진행 중이던 워커가
“Waiting for background terminal”에 멈출 수 있다. 병합처럼 되돌리기 어려운 단계 뒤에는 저장소 상태를
직접 확인하고 재개해야 한다.

한 번도 실행하지 않은 검증: 초보자 관찰 테스트(완료 조건 1), 실기기 모바일. 수동 접근성 검사
(키보드 순회·포커스 가시성·200% 확대)는 D-030으로 **요건에서 빠졌다** — 미실행이지만 더 이상
이슈 #76의 완료를 막지 않는다.

관련 열린 이슈: #83(readme), #73·#72·#71(OMR 콜백·finalize·NEXTAUTH_URL), #66(진행 바 고착),
#65(모바일 건반), #61(샘플 음량), #58(검은건반 배치), #52(systemd 재시작), #47·#46(변환 실패 표시·
저해상도 PDF — DS-3이 문구만 다룬다), #44(박자 어긋남).

## #76 DS-3 DONE — 업로드 화면이 아는 것만 말하게 했다 (PR #91 병합)

사용자 지시로 DS-3을 진행했고, 명시적 승인으로 PR [#91](https://github.com/landfill/ClairKeys/pull/91)을
merge commit `f8c2249`로 병합했다(최종 head `6a5eeea`, 커밋 8개). 병합 직전 재확인에서 CI 17/17,
미해결 리뷰 스레드 0건, `MERGEABLE`/`CLEAN`이었고, merge commit check-runs 6/6 성공. 로컬·원격
브랜치 tip이 모두 `main`에 포함됨을 확인한 뒤 삭제했다.

**계약은 옮기기만 하면 됐지만, 옮기는 과정에서 결함 셋이 드러났다.**

1. **화면이 서버보다 앞서 실패를 선언했다.** `OMRProcessingStatus`는 상태 확인이 실패한 모든
   경우(503·502·네트워크 오류)를 `failed`로 그렸다. 서버는 404에서만 행을 실패로 바꾸고 나머지는
   저장된 상태를 그대로 둔다 — D-026 Directive이고 라우트에 **이미 구현돼 있었다.** 화면만 혼자
   실패를 선언했고, 한 번 선언하면 폴링이 멈춰 서비스가 복구돼도 영원히 실패였다.
2. **드래그 앤 드롭이 문구뿐이었다.** "또는 드래그 앤 드롭"이라고 적혀 있었지만 놓을 곳에 핸들러가
   없어, 파일을 놓으면 브라우저가 그것을 열고 작성 중이던 폼이 사라졌다.
3. **암호가 걸린 PDF를 아무도 걸러내지 않았다.** 사용자는 몇 분을 기다린 뒤 "악보를 읽지
   못했습니다"만 보고 원인을 알 수 없었다. 파일 선택 즉시 알 수 있는 것이다.

부수적으로 `jobs`가 바뀔 때마다 전체 상태를 초기화해 두 번째 업로드가 첫 번째의 진행을 `대기 중`으로
되돌리던 것, 완료 3초 뒤 카드와 연습 링크가 함께 사라지던 것도 고쳤다.

**D-028 신규 — 범위를 벗어나야 할 이유가 생겨 코드보다 결정을 먼저 고쳤다.** 작업 유실과 변환
실패는 `/api/omr/status/[jobId]`가 **둘 다** 200 + `status: 'failed'`로 답해서 화면이 구분할 수
없었다(구분 신호가 한국어 문장 하나뿐). 복구 행동은 정반대다 — 다시 올린다 / 더 선명한 PDF를
만든다. DS-3의 Out of scope가 백엔드 변경을 막고 있으므로 D-028을 기록하고 phase 문서의 범위를
갱신한 뒤(`fd5d85d`) 구현했다(`ded91b7`). 더한 것은 응답 필드 하나이고 HTTP 상태와 저장 동작은
그대로다.

**계약을 `src/lib/upload/`로 분리했다.** 단계 매핑·실패 문구·PDF 검사. 실패 문구를 만드는 함수는
서버 문자열을 **인자로도 받지 않는다** — 받을 수 있게 해 두면 언젠가 Java 스택 트레이스가 화면에
닿는다(이슈 #47). 단계 매핑 테스트는 D-026의 표를 손으로 옮겨 적어 비교한다. 구현에서 상수를
가져오면 "구현이 자기 자신과 같다"는 것밖에 확인하지 못한다.

**완료 조건 하나를 문자 그대로 따르지 않았다.** `이 페이지를 닫아도 계속 처리됩니다`를 고정
노출하되 남은 작업이 없으면 내린다. 전부 끝난 화면에서 그 문장은 고정 노출이 아니라 사실이 아닌
문장이다. 양쪽 다 회귀로 걸었다.

**인증 뒤 화면이라 초록 CI가 이 PR에 대해 접근성을 판정하지 않는다.** axe는 홈만 훑는다. 그래서
`next-auth/jwt`의 `encode`로 세션 토큰을 만들어 쿠키로 넣고 로컬 프로덕션 빌드를 실제 브라우저로
측정했다 — 1440·1024·390에서 드롭존(y=307)과 PDF 조건이 첫 화면 안, 가로 스크롤 없음. 처리 중 /
완료 / 변환 실패 / 작업 유실 / 서비스 불가 다섯 상태를 API를 가로채 렌더해 확인했고, 스택 트레이스가
담긴 응답에서도 화면에는 나타나지 않았다.

**리뷰가 두 번 돌았고, 두 번 다 초록 CI가 못 보는 것을 찾았다.**

CodeRabbit 4건 중 2건 수용·2건 기각(`bb08e7f`). Orca 오케스트레이션 Codex 워커 7건 중 6건 수용
(`12575c0`, `6a5eeea`), 1건 이월. **워커가 찾은 blocker가 이 트랙에서 가장 값어치 있는 지적이다** —
변환 작업이 사라지면 화면은 "같은 파일을 다시 올려 주세요"라고 말하는데, 그 파일을 고르면 중복
가드가 "이미 올린 파일입니다"로 막았다. 완료·변환 실패 뒤에도 같았다. 폼과 패널의 단위 테스트는
둘 다 통과했다 — 중복 가드는 폼에 있고 작업의 끝은 패널만 알아서, 합쳐야만 보이는 자리였다.
소유권을 페이지로 옮기고 회귀를 `src/app/upload/__tests__/page.test.tsx`에 뒀다.

워커가 함께 찾은 것: `setInterval` 폴링 겹침(늦게 온 응답이 완료를 되돌린다), 미도달 단계 라벨의
**2.71:1** 대비, `<a><button>` 중첩 3곳, 키보드를 검사하지 않던 "키보드 도달" 테스트,
`/Encrypt` 오탐. **Vercel 4.5MB 한도 지적은 타당하지만 이월했다**(아래 blocker 표).

**앞선 CodeRabbit 대응 요약** (`bb08e7f`). 수용한 둘은 공교롭게도 **안내를
따르면 상황이 나빠지는** 경로였다 — 중복 판정이 `name:size`뿐이라 같은 이름·크기의 다른 악보를
막던 것, 업로드 성공 뒤 본문을 읽지 못하면 "잠시 후 다시 시도"가 나가 같은 악보의 행이 둘 생기던
것. 기각한 둘은 근거를 산출물에 두었다: 인터페이스를 `src/types/`로 옮기라는 지적은 이 저장소의
실제 관행(`src/lib/analytics.ts`·`cache.ts`·`src/services/*`)과 다르고, phase 문서의 "4단계"는
오기가 아니라 D-026 G1-2와 같은 표기다(표의 첫 행 `0 (queued)`는 단계 이전 상태다). 판정 근거는
`docs/recovery/reviews/PR-91.md`에 있다.

검증: Jest **73 suites / 751 tests** 통과(신규 회귀 104건), lint 무경고, `tsc` 통과, build 성공,
E2E chromium+Mobile Chrome 10/10, CI 17/17. 로컬 실제 브라우저로 네 상태를 다시 확인했고 작업 유실
뒤 재업로드가 실제로 되는 것까지 봤다. 상세는
`docs/recovery/validation/2026-08-29-DS-3-upload-processing.md`.

**실행하지 못한 것**: 실제 PDF를 운영 OMR 서비스에 올리는 수동 검증(로컬에 DB·OMR 서비스 없음),
실제 암호화 PDF(Acrobat 산출물) fixture, Firefox·WebKit 로컬 E2E(브라우저 미설치 — CI가 판정했다).

**이슈 #76 완료 조건 4는 DS-3이 판정하지 못했다.** 그 조건("업로드 후 현재 처리 단계와 예상 대기
시간이 화면에 있다")의 판정 방법은 **실제 업로드 1회**인데, 로컬에 DB도 OMR 서비스도 없어 실행하지
못했다. 화면이 그것을 보여준다는 것은 회귀 테스트와 로컬 실제 브라우저(API를 가로챈 상태)로
확인했지만, **운영 파이프라인을 한 번 통과시킨 증거는 없다.** 조건 5(이탈 안내 고정 노출)는 관측으로
충족했다. DS-7이 종단 판정할 때 조건 4를 실제 업로드로 채워야 한다.

**다음 행동**: DS-4(내 악보 목록). 착수 전 운영 DB의 `processingStatus` 분포 확인이 선행이다.

## #76 DS-2 DONE — 로그인 전 핵심 가치 전달 완료, 다음은 DS-3

사용자 지시로 DS-2를 진행했고, 명시적 승인으로 PR [#90](https://github.com/landfill/ClairKeys/pull/90)을
merge commit `a789dea`로 병합했다(최종 head `6d24dc8`, 커밋 8개). 미해결 리뷰 스레드 0건,
merge commit check-runs 6/6, Vercel Production `a789dea` 배포. 브랜치는 tip 포함 확인 후 삭제했다.

**병합 승인 이후 CodeRabbit이 뒤늦게 5건을 남겨 그대로 병합하지 않고 먼저 처리했다.** 2건은 이미
처리된 것, 2건 수용(`6d24dc8` — `useId()`로 select id 충돌 제거, `LoginButtonProps` export),
**1건 기각** — `flex-shrink-0`가 Tailwind v4에서 제거됐다는 전제가 이 저장소 빌드 산출물과 다르다
(`.flex-shrink-0,.shrink-0{flex-shrink:0}` 별칭이 남아 있다). 리뷰 도구의 일반 지식과 실제 빌드가
다를 수 있으므로 판정 근거는 산출물이다.

**이월**: C5(`tempoSource: 'user'`가 "직접 입력"으로 표시돼 방문자가 입력한 것처럼 읽힌다),
C6(홈 스크롤 가드 vacuous), `flex-shrink-*` 표기 일괄 현대화. DS-2 phase 문서의 "이월된 지적" 표에 있다.

**다음 행동**: **DS-3(업로드와 처리 상태)**. D-026이 정한 `progress` 매핑(0/10/30/60/100)과 실패
4종 계약이 이미 확정돼 있다. 진입 조건과 완료 조건은 `docs/recovery/phases/DS-3-upload-processing.md`.

**홈** — 이전 홈은 정지한 건반 그림과 기능 카드 세 장이었다. 히어로 다음에 실제로 움직이는 결과를
뒀고, 운영 플레이어(`FallingNotesPlayer`)를 **그대로** 쓴다. 홈 전용 축소판을 만들면 첫 화면과 로그인
후 화면이 달라져 전환이 깨진다. CTA는 `내 악보로 시작하기`로 통일했고 파일 제한·처리 시간·공개 범위를
그 옆에 뒀다.

**샘플은 저장소 안에 있다** (`src/fixtures/homeSample.ts`). `/sheet/[id]`는 DS-6 소유라 충돌하고,
운영 공개 악보는 제목이 파일명이라 첫 인상으로 쓸 수 없다(DS0-4). 공개 도메인 「환희의 송가」 8마디를
양손으로 적었고 `tempoSource`는 `'user'`다 — 우리가 정한 값이라 `'score'`도 `'unknown'`도 사실이
아니다 (D-013).

**복귀 계약** — DS-0이 확인한 결함을 고쳤다. `AuthGuard`는 원래 화면을 보존했지만 `LoginButton`은
`callbackUrl = "/"` 기본값이라 어디서 눌러도 홈으로 갔다. 둘이 `src/lib/returnPath.ts`를 공유하며,
같은 origin의 경로만 허용한다(절대 URL·프로토콜 상대·백슬래시 거부). `LoginButton`이 세션이 있을 때
**렌더 중에** `router.push`를 호출하던 것도 함께 고쳤다.

**D-027 신규** — 플레이어를 홈에 올리면서 전송 버튼에 **접근 가능한 이름이 없다는 것**이 드러났다.
이모지만 담고 있어 스크린리더에는 "버튼"으로만 읽힌다. D-019 결정 8("공유 `PlaybackControls`는
수정하지 않는다")이 있어 **코드보다 결정을 먼저** 고쳤다 — 그 결정의 근거였던 demo 페이지 의존은
DS-1이 제거했고, 지키려던 것은 레이아웃 회귀이지 결함의 보존이 아니다. 더한 것은 속성뿐이다.
**이모지 교체와 구간 반복은 여전히 DS-5 소유이며, DS-5는 착수 시 D-019 결정 8을 다시 다뤄야 한다.**

**기존 테스트 두 개를 갱신했다.** E2E 스모크가 옛 홈 문구를 문자열로 고정하고 있었다.
`src/app/__tests__/page.test.tsx`는 "가로 스크롤 건반 미리보기의 키보드 도달"을 지켰는데 그 요소가
사라져(D-020의 반응형 건반은 스크롤하지 않는다) 특정 요소 대신 일반 가드로 옮겼다.

**CI가 접근성 실패를 잡았다 (`b0167ef`에서 수정).** axe가 홈에서 7건을 잡았다 — `color-contrast` 5,
`select-name` 2. DS-1에서 통과하던 검사가 실패한 이유는 이 PR이 결함을 만들어서가 아니라, 플레이어가
`/sheet/[id]`(인증 뒤)에만 있어 **axe의 검사 범위 밖이었기 때문**이다. 화면을 공개 홈으로 옮긴 것이
접근성 감사 역할을 했다.

- `select-name`: 속도·모드 `<select>` 옆에 `<label>`이 있었지만 `htmlFor` 연결이 없어 이름이 없었다.
  **`<label>`을 옆에 두는 것만으로는 이름이 생기지 않는다.**
- `color-contrast`: `text-gray-500`·`text-gray-600`·`text-slate-500`이 DS-1 토큰으로 넘어오지 않은
  잔재였다. `--ck-ink-muted`로 옮겼고 실제 배경과의 비율을 계산했다(최소 4.71, 눌린 건반 위).

로컬 axe는 ChromeDriver 버전 불일치로 실행하지 못해 CI가 판정했다. **재실행 결과 통과.**

검증: Jest **68 suites / 647 tests** 통과, lint 무경고, `tsc` 통과, build 성공, E2E chromium 5/5,
전체 CI 통과(`mergeStateStatus: CLEAN`). 신규 회귀 27건.

**CodeRabbit은 이 PR에 아무 리뷰도 내지 않았다** — 별 10개 미만 저장소라 자동 리뷰 대상이 아니고
수동 요청은 rate limit에 걸렸다. 재요청 후에도 스레드 0, 리뷰 0이다. 초록 CI를 리뷰 통과로 읽지 않는다.

**대신 사용자 지시로 Orca orchestration에서 Codex 워커 리뷰를 돌렸다** (Run `run_5ab1e33d11ff`,
Task `task_c3763b4c3e3f`, Dispatch `ctx_457563b71e0e`, `--worktree current`). blocker 1건 + major 3건 +
minor 2건을 찾았고, **보고를 그대로 받지 않고 blocker와 major 2건을 직접 재검증했다.** 사용자 지시로
1·2·4를 수정했다.

- **C1 (blocker, `2ba8c3c`)** — DS-2의 완료 조건은 "1440×900 최초 뷰포트 안에 낙하 노트·3단계·CTA가
  모두 보인다"인데 실제로는 낙하 노트와 3단계가 화면 밖이었고 **E2E가 통과하고 있었다.**
  `toBeVisible`도 `toBeAttached`도 스크롤해야 보이는 요소에 통과한다. 완료 조건을 스스로 다시 쓴 다음
  통과하도록 테스트를 쓰면 이 실수가 보이지 않는다. E2E를 `boundingBox` 실측으로 바꾸고(먼저 실패
  확인) 홈을 데스크톱 2단으로 재배치했다. 세로 배치로는 불가능했다 — 플레이어 chrome 300px +
  시각화 330px이라 히어로를 100px로 줄여도 들어가지 않는다.
- **C2 (major, `1f0ee47`)** — 오픈 리다이렉트가 실제로 뚫렸다. URL 파서가 ASCII 탭·LF·CR을 제거한 뒤
  해석하므로 `/<TAB>/evil.example/x`가 통과하고 `https://evil.example/x`가 된다. 판정을 문자열
  모양에서 **파서 기준**으로 바꿨다 — 고정 base로 파싱해 origin 동일성과
  `pathname+search+hash` 재직렬화 일치를 본다. 기존 테스트 8건은 구현의 금지 목록을 되읽는
  tautology라 같은 것을 놓쳤다.
- **C3 (major, `2ba8c3c`)** — "내 악보는 나에게만 보입니다"가 DS0-1(비공개 악보도 public 버킷)과
  충돌한다. "공개로 설정하기 전까지 목록에 노출되지 않습니다"로 좁혔다.
- **C4 (major, `f9b7b73`)** — seek 바가 `onClick`만 달린 `div`라 마우스로만 조작할 수 있었고
  (WCAG 2.1.1) 재생 상태에 live region이 없었다. **axe가 이 둘을 잡지 못했다** — 정적 검사로는
  `div`에 핸들러가 붙었는지 알 수 없다. D-027에 2-a를 추가해 키보드 등가성이 범위 안임을 먼저
  기록한 뒤 구현했다.
- **미처리**: C5(`tempoSource: 'user'`가 "직접 입력"으로 표시돼 오해 소지), C6(홈 스크롤 가드가 매칭
  0개라 vacuous).

프리뷰 실측으로 CTA 283–333, 3단계 449–640, 건반 745–760이 전부 뷰포트 779 안에 들어옴을 확인했고,
실제 브라우저에서 seek 바 포커스와 End/Home 동작(0 → 19.2 → 0)도 확인했다.
최종: Jest **68 suites / 660 tests**, lint 무경고, `tsc`, build 성공, E2E chromium 5/5.

**하지 않은 것**: 초보자 관찰 테스트. 이슈 #76 완료 조건 1은 관측 가능한 형태로만 판정하고 이해도는
주장하지 않는다.

## #76 DS-1 DONE — 디자인 토큰과 공통 셸 완료, 다음은 DS-2

사용자 지시로 DS-1을 진행했고, 명시적 승인으로 PR
[#89](https://github.com/landfill/ClairKeys/pull/89)를 merge commit `fc09782`로 병합했다
(최종 head `448f894`, 커밋 6개). 미해결 리뷰 스레드 0건. merge commit의 post-merge check-runs가
**6/6 성공**했고 Vercel Production이 `fc09782`로 배포됐다. 로컬·원격 작업 브랜치 tip이 main에
포함됨을 확인한 뒤 양쪽을 삭제했다. 커밋을 셋으로 나눴다 — 회귀 근거, **A 시각 변경**, **B 도달 경로 변경**.
A와 B를 나눈 것은 2차 검토 지적 4번을 따른 것으로, 고아 라우트 제거와 내비게이션 축소는 시각 개편이
아니라 사용자 도달 경로를 없애는 기능 변경이기 때문이다.

**A (`e9aa371`)** — 색을 고르기 전에 모든 사용 조합의 명도 대비를 계산했다. 19개 조합 전부 통과,
최소 3.48(`--ck-rule-strong`). 아이보리 `#faf6ee`, 잉크 `#1b1f2a`, 테라코타 `#a8452a`, 블루·세이지,
상태 색 3종. 라이트 한 벌만 만든다 (D-025).

작업 중 두 가지가 드러났다.

- `globals.css`의 다크 블록은 `--background`만 바꾸는데 `<main>`의 `bg-gray-50`이 body를 덮어
  **한 번도 화면에 나온 적이 없었다** (DS0-10 확인) → 제거했다.
- body가 Arial을 하드코딩하고 있어 `layout.tsx`가 불러오는 **Geist가 쓰인 적이 없었다** → 수정했다.

그 외 포커스 링을 전역 `:focus-visible`로 통일(Button은 variant마다 다른 링 색을 갖고 있었다),
Footer 죽은 링크 3개 제거와 저작권 연도 계산(DS0-5), 이모지 → 인라인 SVG 선형 아이콘.

**B (`cb8a74b`)** — 내비게이션 `내 악보`·`새 악보`·`탐색` 3개(D-026 G1-4). `/processing` 제거.
고아 라우트 7개(demo 4, test 3) 제거, `/admin/update-finger-data`는 API가 이미 `ADMIN_EMAILS`로
막고 있어 제거 대신 middleware `protectedPaths`에 `/admin`을 넣어 격리했다.

**셸 안에 숨어 있던 두 번째 도달 경로를 발견했다.** `MainLayout`의 `ProcessingStatusIndicator`가
같은 죽은 `ProcessingJob`을 읽어 **항상 `null`을 반환하면서** 그 레이아웃을 쓰는 모든 페이지에서
`/api/processing`과 `/api/notifications`를 폴링했고, 유일한 행동이 `/processing`으로 가는 것이었다.
마운트 지점이 하나뿐이라 컴포넌트째로 제거했다.

검증: 명도 대비 19/19, lint 무경고, `tsc` 통과, **Jest 63 suites / 603 tests 전부 통과**,
`npm run build` 성공(라우트 목록에서 demo·test·processing 사라짐), E2E chromium 3/3.
firefox·webkit은 로컬에 바이너리가 없어 CI가 실행한다.
기록: `docs/recovery/validation/2026-08-29-ds1-token-contrast.md`.

**라우트 회귀 실측 완료**: 배포 프리뷰에서 확인했다. **제품 라우트 7개가 전부 변경 전과 같고**
(`/` `/explore` `/auth/signin` `/auth/error` 200, `/upload` `/library` `/profile` redirect),
고아 7개는 200 → **404**, `/admin/update-finger-data`는 200 → **redirect**다. 바뀐 것은 고아 8개뿐이며
전부 의도한 방향이다. Vercel 배포 보호로 익명 `curl`이 302를 받으므로 사용자의 브라우저 세션에서
측정했다.

프리뷰 육안 확인에서 하나가 눈에 띈다 — **홈 본문은 아직 옛 파란색이다.** 히어로의 `Clairkeys`가
`text-blue-600`으로 남아 있는데, `src/app/page.tsx`는 DS-2 소유이고 E2E 스모크가 그 문구를 고정하므로
DS-1이 건드리지 않았다. DS-2가 홈을 다시 만들 때 토큰으로 바뀐다.

**리뷰 대응 (`d9c1c92`)**: CodeRabbit이 `startsWith('/admin')`은 `/administrator`·`/admin-tools`도
보호 경로로 잡는다고 지적했다. 수용해 세그먼트 경계 판정으로 바꿨고, `/library`·`/upload`·
`/profile`에도 같은 문제가 있어 목록 전체에 적용했다. 판정 로직을 `src/lib/routeAccess.ts`로 분리한
이유는 `middleware.ts`를 임포트하면 테스트가 `next/server`를 끌고 와 edge 런타임의 `Request`를 찾다가
죽기 때문이다. 회귀 13건 추가, 전체 **64 suites / 616 tests** 통과. 스레드는 답변 후 resolve했다.
이 결함은 fail-closed(과보호) 방향이라 보안 구멍은 아니었다.

**리뷰 대응 2차 (`5455810`, `448f894`)** — 처음에는 `reviewThreads`만 조회해 R1만 찾았고, 리뷰
**본문**의 접힌 블록과 walkthrough 코멘트에 있던 세 건을 놓쳤다. 리뷰 피드백은 세 표면을 모두 봐야
한다: 리뷰 스레드, 리뷰 본문(`pulls/N/reviews[].body`), 일반 코멘트(`issues/N/comments`).

- **R2 (실제 결함)**: `.playback-controls .slider:focus { outline: none }`의 specificity가 이 단계가
  도입한 전역 `:focus-visible`보다 높아 **재생 슬라이더는 키보드로 포커스해도 아무 표시가 없었다.**
  "포커스를 공통 단계에서 고정한다"는 DS-1의 완료 조건이 그 요소에서만 조용히 깨져 있었다. 제거했고,
  값이 같은 중복 `.category-item:focus`도 함께 정리했다.
  CSS는 단위 테스트가 어려워 소스 패턴 가드를 뒀다 — `outline: none` 부재, 컴포넌트별 `:focus` 부재,
  토큰 밖 hex 부재, `prefers-color-scheme` 부재. **가드를 되돌림 실험으로 검증했다(2건 실패 확인).**
- **R3**: `IconProps` export.
- **R4**: Docstring Coverage 20% → 아이콘 9개에 용도 문서화.

PR CI는 전부 통과했다 — 코드 변경 PR이라 문서 PR에서 건너뛰던 Build Check·**Accessibility
Check**·CodeQL·Security Scan·Unit Tests까지 실행됐다. 최종 Jest는 **65 suites / 621 tests**다.

**P2-A로 넘어가는 잔여**: `BackgroundFileUpload`의 `/processing` 링크 2곳,
`/api/processing`·`/api/notifications`·`useBackgroundProcessing`·`ProcessingDashboard`의 삭제.
이 PR은 사용자 도달 경로만 없앴다.

**대체 도달 경로 공백**: `처리 상태`를 대신할 내 악보 상태 배지는 DS-4가 만든다. 제거 전에도 그
화면은 비어 있었으므로 잃는 정보는 없다.

**다음 행동**: **DS-2(로그인 전 핵심 가치 전달)**. 홈에 `/sheet/[id]`를 쓰지 않는 자체 완결 샘플
체험을 두고, CTA를 `내 악보로 시작하기`로 통일하며, 로그인 후 원래 행동 복귀 계약을 설계·구현한다.
`src/app/page.tsx`는 아직 옛 파란색이고 E2E 스모크가 그 문구를 고정하고 있으므로, DS-2는 스모크
기대값도 함께 갱신해야 한다. 진입 조건과 완료 조건은
`docs/recovery/phases/DS-2-prelogin-value.md`에 있다.

## #76 DS-G1 DONE — 처리 상태 출처 계약 확정 완료, 다음은 DS-1

사용자 지시로 DS-G1을 진행했다. UI 단계가 아니라 결정 gate이므로 **코드 변경 0건**이 완료 조건이고,
산출물은 결정 문서다. 사용자의 명시적 승인으로 PR [#88](https://github.com/landfill/ClairKeys/pull/88)을
merge commit `57d07bb`로 병합했다(최종 head `9c81212`). 필수 체크 4개 전부 통과, 리뷰 스레드 0건.
merge commit의 post-merge check-runs가 **6/6 성공**했다. 로컬·원격 작업 브랜치 tip이 main에
포함됨을 확인한 뒤 양쪽을 삭제했다.

**조사가 선택지를 지웠다.** `ProcessingJob`의 유일한 writer는 `/api/processing` POST와
`/api/upload-async`인데 **둘 다 P1-A가 `CONVERSION_UNAVAILABLE`로 무력화한 경로다**(D-010). 그
테이블에 지금 쓸 수 있는 유일한 내용은 즉시 실패한 죽은 경로의 작업이므로, 상태 출처는
`SheetMusic`뿐이다.

조사에서 확인된 다른 사실(전부 코드 근거, DS-G1 문서에 파일·행 표로 있다):

- `processingStatus` 쓰기가 전부 `omrJobId`로 행을 찾으므로 **`omrJobId` 없는 legacy 행은 스키마
  default `'pending'`에 영원히 머문다.** 재생 가능한데도 원값을 그리면 "처리 중"이 된다.
- **`omrJobId`를 클라이언트에 돌려주는 API가 없다.** 업로드 화면을 떠나면 폴링을 재개할 수 없다.
- `/api/sheet`(목록)도 `/api/sheet/[id]`(상세)도 `processingStatus`를 반환하지 않는다.
- 행 생성 시 `animationDataUrl`은 `''`이고 완료 시에만 채워진다.

**결정 = [D-026](DECISIONS.md)**

| ID | 결정 |
|---|---|
| G1-1 | 상태 출처는 `SheetMusic`. 화면은 원값이 아니라 **파생 상태**(연습 가능 / 처리 중 / 오류 / 알 수 없음)를 읽는다. 1차 기준 `animationDataUrl !== ''` |
| G1-2 | 4단계는 **업로드 화면에서만**. `progress` 0/10/30/60/100 매핑. 떠나면 단계 없음 |
| G1-3 | 별도 알림 시스템 없음. 업로드 인라인 + 내 악보 배지 |
| G1-4 | **`/processing` 화면과 `처리 상태` 메뉴 제거.** 내비게이션 3개 확정 |
| G1-5 | 실패 4종: 파일 거부 / 변환 실패 / 작업 유실 / 서비스 불가 |

**DS-1이 풀렸다.** 진입 조건 3(내비게이션 구성)이 G1-4로 확정됐다. 대체 도달 경로(내 악보 배지)는
DS-4가 만들므로 DS-1~DS-4 사이에 공백이 생기지만, 현재도 `/processing`은 빈 화면이라 잃는 정보가
없다 — 이 공백이 의도된 것임을 DS-1의 검증 기록에 명시한다.
`/api/processing`·`useBackgroundProcessing`·`ProcessingDashboard`의 **삭제는 P2-A 소유**다.

**확인하지 못한 것**: 운영 데이터의 `processingStatus` 분포. 이 저장소의 Supabase 프로젝트
(`ghgiqtinaxjsuotfzmcw`)가 사용 가능한 MCP 계정에 없다. `'pending'` + 빈 `animationDataUrl` 행의
건수를 **DS-4 착수 전 확인 항목**으로 남겼다.

**다음 행동**: **DS-1(디자인 토큰과 공통 셸)** 착수. 진입 조건 6개는
`docs/recovery/phases/DS-1-design-foundation.md`에 있고, 그중 3번(내비게이션 구성)이 이 결정으로
확정됐다. DS-1은 시각 변경(A)과 도달 경로 변경(B)을 **다른 커밋으로** 나누고, B에는 라우트 회귀
검증(변경 전후 응답 코드 표, 제품 라우트 7개 불변)을 붙인다.

## #76 2차 검토 반영 — DS-G1 → DS-1 직렬화, 완료 조건의 측정 가능성 교정

사용자 2차 검토에서 "실행 가능한 수준이지만 네 가지를 정리하는 편이 좋다"는 지적을 받아 전부
반영했다. **사용자의 명시적 지시로 브랜치·PR 없이 `main`에 직접 커밋했다.**

- **DS-G1을 DS-1 앞으로 옮겨 직렬화했다.** ROADMAP 표는 DS-1이 DS-0에만 의존한다고 적혀 있었는데
  상세 문서는 G1-4가 내비게이션 구성을 막는다고 적혀 있어 두 문서의 의미가 달랐다. 이제
  `DS-0 → DS-G1 → DS-1 → 나머지`가 이 트랙의 유일한 직렬 구간이다. DS-3·DS-4의 선행 조건에서
  중복된 `DS-G1` 표기를 없앴다 — DS-1이 이미 그것을 거쳤다.
- **"5초 안에 설명"의 측정 대상을 분리했다.** 완료 조건 1을 관측 가능한 문장으로 바꿨다:
  홈 최초 뷰포트(1440×900, 스크롤 0) 안에 낙하 노트 결과·3단계 시각화·주 CTA가 모두 보인다.
  **이해도 자체는 초보자 3~5명 관찰 테스트로만 확인할 수 있으며**, 그 절차를 DS-2에 선택 항목으로
  적었다. 테스트를 하지 않으면 이슈 종료 시 "사용자가 이해한다"고 쓰지 않고 "요소가 존재한다"고 쓴다.
- **WCAG AA의 '충족'과 '유예' 모순을 없앴다.** DS-7이 남은 위반을 유예하고도 완료될 수 있었다.
  이제 완료 조건 7은 **위반 0건**이고, 자동 검사(axe)만으로 판정하지 않는다 — 키보드 순회, 포커스
  가시성, 200% 확대, 명도 대비, 색상 외 구분의 수동 검사를 종단 증거로 함께 요구한다.
  **유예된 AA 위반이 하나라도 남으면 DS-7을 `DONE`으로 두지 않고 이슈 #76도 닫지 않는다.**
- **DS-1의 "기능을 바꾸지 않는다"를 정정했다.** 고아 라우트 제거·격리와 내비게이션 축소는 사용자
  도달 경로를 바꾸는 기능 변경이다. In scope를 **A(시각 변경)** 와 **B(도달 경로 변경)** 로 나누고
  같은 PR에서도 커밋을 분리하도록 했다. B에는 라우트 회귀 검증을 붙였다 — 변경 전후 응답 코드 표,
  제품 라우트 7개 불변, 제거한 화면의 대체 도달 경로 확인.

## #76 계획 보강 — DS-G1 gate 추가, DS-7 의존성 교정, phase 문서 8개 작성

사용자 검토에서 "DS-1은 착수 가능하지만 DS-2 이후를 실행하기에는 의존성과 완료 기준이 부족하다"는
지적을 받았다. 지적 5건을 모두 반영했다. **사용자의 명시적 지시로 브랜치·PR 없이 `main`에 직접
커밋했다** — ROADMAP의 단계 구성 변경과 신규 phase 문서는 원래 AGENTS.md의 직접 커밋 예외가
아니므로, 이번은 예외 처리가 아니라 사용자 지시에 따른 것이다.

무엇이 바뀌었나:

- **DS-G1 (결정 gate) 신설** — 처리 상태 출처 계약을 확정한다. DS-3과 DS-4가 **같은 계약**을 읽게
  만드는 것이 목적이고, 둘의 선행 조건이 됐다. 코드는 바꾸지 않고 결정 문서만 남긴다. 결정 항목은
  G1-1(상태 출처) ~ G1-5(실패 분류) 5개이며, **G1-4(`/processing` 화면의 존폐)가 DS-1의 내비게이션
  구성을 막고 있다.** P1-B 전체가 선행될 필요는 없다 — 필요한 것은 결정이지 큐의 재구현이 아니다.
- **DS-7을 DS-2~DS-6 전부 이후로** 옮겼다. 범위가 "각 핵심 화면의 상태 통일"이므로 대상 화면이 모두
  확정되기 전에 끝낼 수 없다.
- **DS-6을 DS-5 이후로** 옮기고 `/sheet/[id]` 소유를 DS-6에 배정했다. DS-2는 홈에 **자체 완결 샘플**을
  두고 `/sheet/[id]`를 쓰지 않는다. 플레이어 컴포넌트는 DS-5 소유다. ROADMAP에 화면 소유 범위 표를
  추가해 파일 충돌 지점만 명시했다.
- **phase 문서 8개 작성** — DS-G1, DS-1~DS-7. 각 문서는 범위·제외 범위, 변경 대상 라우트, 기능·시각
  회귀 기준, 접근성·반응형 검증, 완료 조건과 검증 명령을 갖는다.
- **이슈 #76 전체 완료 조건 8개**를 ROADMAP에 추가하고 각 항목의 최종 판정 단계를 지정했다.
- 정합성 정정: "이슈 #76 계획을 그대로 단계화" → "D-024·D-025 결정에 맞게 조정해 단계화",
  신규 결함 9건 → **10건**(DS0-1~DS0-10).

DS-5에서 발견한 충돌 하나를 문서에 남겼다: 구간 반복(DS0-9) 추가가 **D-019 결정 8**("공유
`PlaybackControls`는 수정하지 않는다")과 부딪힌다. 코드를 고치기 전에 D-019를 갱신하거나 별도
컨트롤로 분리해야 한다.

**다음 행동**: **DS-G1 → DS-1** 순서다. 아래 2차 검토 반영으로 이 순서가 문서 전체에 고정됐다.

## #76 DS-0 DONE — 디자인 개편 착수 전 계약 고정 완료, 다음은 DS-1

사용자가 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76)(초보자 중심 여정·브랜드 전면
개편) 중 **0단계**를 진행하도록 지시했다. 0단계는 코드나 화면을 바꾸지 않고 현재 상태와 제품 계약을
고정하는 단계다. 사용자의 명시적 승인으로 PR [#87](https://github.com/landfill/ClairKeys/pull/87)을
merge commit `52f518e`로 병합했다(최종 head `cea20ce`, 커밋 4개). 필수 체크 4개 전부 통과했고 리뷰
스레드는 없었다. merge commit의 post-merge check-runs가 **6/6 성공**했고 Vercel Production이
`52f518e`로 배포됐다. 로컬·원격 작업 브랜치 tip이 모두 main에 포함됨을 확인한 뒤 양쪽을 삭제했다.

**이슈 #76 자체는 열려 있다** — 0단계만 끝났고 DS-1~DS-7이 남았다. 다음 행동은 **DS-1(디자인 토큰과
공통 셸)**이며, 진입 조건 6개는 `docs/recovery/phases/DS-0-current-state-baseline.md`의 "DS-1 진입
조건" 절에 있다. DS-1은 나머지 전 단계의 선행 조건이다(D-024 결정 4).

이 PR은 새 트랙 DS-0~DS-7을 ROADMAP에 추가하고, DS-0 phase 문서·검증 기록·결정 D-024를 남긴다.
`ROADMAP.md`의 단계 구성 변경과 `DECISIONS.md` 신규 항목은 직접 커밋 예외가 아니므로 PR에 포함했다.

코드 인벤토리에서 확인된 것 (모두 `f184f28` 기준, 추정이 아니라 파일·행 근거가 있다):

- **로그인 전 체험을 막는 것은 두 겹이다.** `src/app/sheet/[id]/page.tsx:139,153,174`의 `AuthGuard`와
  `src/app/api/files/animation/route.ts:94`의 GET 401. 한쪽만 풀면 화면은 열리고 데이터는 401이 된다.
  메타데이터 API(`/api/sheet/[id]:53-58`)는 이미 공개 악보를 세션 없이 허용한다.
- **로그인 후 복귀가 경로마다 다르다.** `AuthGuard`는 `pathname + search`를 보존하지만 Header의
  `LoginButton`은 `callbackUrl = "/"` 기본값이라 항상 홈으로 간다.
- **`/processing` 화면과 알림 API가 실제 업로드와 단절돼 있다.** canonical 경로인
  `/api/omr/upload`·`/api/omr/finalize`에 `ProcessingJob` 참조가 0건이다. 실제 상태는
  `SheetMusic.processingStatus`(자유 문자열)에만 있고 렌더하는 화면이 없다. 스키마의
  `ProcessingStage` enum이 존재한다는 사실을 canonical 경로가 채운다는 뜻으로 읽으면 안 된다.
- 데모·테스트 7개 라우트가 UI 유입 링크 0인 채 프로덕션에서 URL로 열려 있다. Footer 지원 링크
  3개가 전부 `href="#"`이고 저작권 표기가 2024다.
- `globals.css`의 디자인 토큰은 `--background`/`--foreground` 둘뿐이다(Tailwind v4).

D-024가 고정한 것: 단계별 이슈·PR로 진행하고 한 PR에서 홈·업로드·플레이어를 동시에 교체하지 않는다.
`playbackGeometry.ts`·`pianoLayout.ts`·`usePlaybackOrientation.ts`의 상수와 조건식은 시각 개편의
부수효과로 바꾸지 않는다. 새 공통 셸도 `playback-chrome` 클래스를 유지한다. **DS-1(디자인 토큰과
공통 셸)이 나머지 전 단계의 선행 조건이다.**

**운영 확인에서 판정 하나가 뒤집혔다** (`6114579`, 2026-08-29). `/api/files/animation`의 401은 사실이지만
우회 경로가 있다 — `GET /api/sheet/[id]`가 익명에게 `animationDataUrl`을 그대로 반환하고 그 URL이
Supabase **public** 버킷이라 애니메이션 JSON이 익명으로 200을 준다. 따라서 로그인 전 체험을 막는 것은
**화면의 `AuthGuard` 한 겹뿐**이고, DS-2는 API 인증을 바꾸지 않고 구현할 수 있다.

`미확인`이던 두 항목도 확정됐다. `PlaybackControls`에 loop 코드가 없어 **구간 반복은 미지원**이고,
곡 제목 편집은 `SheetMusicActions`에 있으나 `/library`가 쓰는 `LibrarySheetMusicList`에는 없어
**운영 기준 미지원**이다.

운영 확인으로 코드 판정이 그대로 확인된 것: `/processing`이 악보 5건을 가진 계정에서도
`처리 작업 (0)` / `알림 (0)`이다. `/library` 카드에 처리 상태·오류 표시가 없다. `/upload`에 예상 처리
시간·백그라운드 안내·예시 악보가 없다. 데모·테스트·관리자 라우트 8개가 프로덕션에서 200이다.

**신규 결함 (DS 범위 밖, 아직 이슈 미등록)**: 비공개 악보(`isPublic: false`)의 애니메이션 객체도 같은
public 버킷에 있다. `GET /api/sheet/29`는 익명에게 403을 주지만, 소유자로 얻은 URL을 자격증명 없이
요청하면 **200으로 78,518바이트가 내려온다.** 비공개 악보의 보호가 URL 은닉뿐이다.

**Work stage 5 완료 (`0e45c9b`)** — 사용자가 GitHub 이슈를 새로 만들지 않고 문서에 기록하도록
지시했다. 신규 결함 10건을 DS-0 phase 문서의 **"발견된 결함 대장"**에 담당 단계와 함께 남겼다:
DS0-1 비공개 악보 public 버킷 노출(DS 범위 밖), DS0-2 처리 상태 단절(DS-3·DS-7 선행),
DS0-3 고아 라우트 8개(DS-1), DS0-4 파일명·미검증 메타데이터 노출(DS-4·DS-6), DS0-5 죽은 Footer
링크와 2024 저작권(DS-1), DS0-6 내 악보 상태 미표시(DS-4), DS0-7 업로드 안내 부재(DS-3),
DS0-8 곡 제목 편집 고아 컴포넌트(DS-4), DS0-9 구간 반복 부재(DS-5), DS0-10 죽은 다크 모드 CSS(DS-1).
**DS-1~DS-7 진입 시 이 대장에서 해당 단계 배정 항목을 먼저 읽는다.**

DS-1 진입 조건 6개도 확정했다 — 토큰 정의, 다크 모드 잔재 처리, 내비게이션 구성, 고아 라우트 처리,
아이콘 체계, `playback-chrome` 계약 유지. 내비게이션의 `처리 상태` 메뉴 처리 방향은 DS0-2의 결론에
의존한다.

**다크 모드는 구현하지 않는다 (D-025, `cea20ce`)** — 사용자 지시. 이슈 #76 본문의 "플레이어에 우선
적용"에서 이탈하므로 결정으로 기록했다. 조사 결과 현재 상태는 부분 지원이 아니라 **죽은 코드**다:
`globals.css`의 `prefers-color-scheme` 블록이 `--background`/`--foreground`를 바꾸지만
`layout.tsx:100`의 `bg-gray-50` main과 `bg-white` Header·Footer가 body를 덮어 화면에 반영되지 않는다
(다크 OS 실제 렌더는 미관측). DS-1은 라이트 팔레트 **한 벌만** 정의하고, 죽은 블록(DS0-10) 처리를
정한다.

DS-0는 Work stages 1~5와 completion criteria를 모두 충족해 `DONE`이다.

미완: 실기기 모바일 확인, WCAG 자동 검사, 실제 업로드 실행은 하지 않았다.

## #82 DONE — 메트로놈 값·출처 표시 완료

사용자가 P1-B는 후순위로 두고 이슈 [#82](https://github.com/landfill/ClairKeys/issues/82)를 권장
범위로 진행하도록 지시했다. PR [#86](https://github.com/landfill/ClairKeys/pull/86)을 최종 head
`4eefe52`로 검증한 뒤 사용자의 명시적 승인으로 merge commit `d218746`으로 병합했고 이슈 #82도
닫았다. CodeRabbit의 actionable 지적(대체 AnimationPlayer도 공통 표시 사용)을 수정·답변·resolve했고
merge commit post-merge checks가 6/6 성공했다. Vercel Production 배포도 Ready다.

- OMR이 이미 생성하는 `tempo`, `tempoSource`, `scoreTempo`, `timingReferenceBpm`을 재사용한다.
- 실제 운영 재생 경로인 `FallingNotesPlayer`에 재생 전 표시와 재생 중 fixed overlay를 추가했다.
- DB schema/migration과 메트로놈 인식 로직은 변경하지 않는다. 재생 속도 배율과 악보 BPM을 혼동하지
  않는다.
- 구현 전 회귀는 1건 실패했고, 리뷰 수정 후 focused 28 tests, 전체 Jest 62 suites/593 tests, `tsc`,
  lint, build가 통과했다.

P1-A는 DONE이고 P1-B는 여전히 NOT_STARTED다. 운영 sample에 confirmed tempo score가 없어 실제
콘텐츠의 값·출처 화면은 회귀 테스트로 검증했으며, physical device typography/overlap은 아직 관측하지
않았다. 작업 브랜치의 로컬·원격 tip이 main에 포함됨을 확인한 뒤 양쪽 브랜치를 삭제했다.

## #70 DONE — P1-B는 후순위, OMR job ID 무결성만 분리 완료

사용자가 P1-B 전체(영속 큐·OMR 보안)는 후순위로 두고 이슈
[#70](https://github.com/landfill/ClairKeys/issues/70)만 처리하도록 지시했다. 사용자의 명시적
승인으로 PR [#85](https://github.com/landfill/ClairKeys/pull/85)를 merge commit `5e36bbe`으로
병합했고 이슈 #70도 닫았다. merge commit의 post-merge build, E2E, 두 test job, lint, Security
Audit가 6/6 성공했다. Vercel Production 배포가 Ready다.

- `SheetMusic.omrJobId`를 nullable unique key로 바꿔 non-null UUID가 유일하고 indexed임을 DB가
  보장한다. PostgreSQL에서는 NULL 여러 개가 허용돼 OMR job ID를 받기 전 행은 유지된다.
- `/api/omr/finalize`는 비결정적 `findFirst` 대신 `findUnique`로 callback 대상을 찾는다.
- 운영 사전 점검: 총 5행, non-null `omrJobId` 3행, 중복 그룹 0개.
- 회귀는 구현 전 `findUnique` 단언 실패를 확인했고, 이후 focused test, 전체 Jest 62 suites/591
  tests, `tsc`, lint, build, Prisma schema validation을 통과했다.

운영 migration 직전에 non-null `omrJobId` 중복을 다시 확인해 0건을 확인했고, code deployment보다
먼저 `20260829020000_make_omr_job_id_unique`를 적용했다. 사후에 migration `finished=true`와
`SheetMusic_omrJobId_key` unique index 생성을 확인했다. 작업 브랜치의 로컬·원격 tip이 모두 main에
포함됨을 확인한 뒤 양쪽 브랜치를 삭제했다.

**P1-B는 여전히 `NOT_STARTED`다.** #70은 DB lookup 무결성만 보완했다. persistent payload·worker
lease·재시작 복구·CORS·파일 검사·callback URL hardening은 여전히 구현하지 않았다.

## P1-A DONE — provenance migration·backfill·운영 배포 완료

2026-08-29, 사용자의 명시적 승인으로 PR
[#84](https://github.com/landfill/ClairKeys/pull/84)를 merge commit `2acc0b6`으로 병합했다.
merge commit의 post-merge build, E2E, 두 test job, lint, Security Audit가 6/6 성공했다.
Vercel Production 배포가 Ready이고 `https://clairkeys.vercel.app` 별칭에 연결됐다. 운영
`/api/sheet/public`은 정상 응답했으며 공개 4건 중 demo 반환은 0건이다.

- `SheetMusic.provenance`를 `omr | demo | unknown`으로 추가하는 additive migration.
- `omrJobId`가 생긴 신규 행만 `omr`; 빠진 행은 추정하지 않는다.
- 과거 `pdfParser`의 세 고정 멜로디·120 BPM·4/4와 **정확히 일치**할 때만 `demo`.
- `demo`만 공개 목록에서 제외하고 재생 전에 실제 변환 결과가 아니라는 경고를 표시한다.
- 백필은 기본 dry-run이며 저장 JSON 다운로드를 설정된 Supabase origin으로 제한한다.
- 행 삭제 없음. `unknown`은 표시·공개·재생 동작을 바꾸지 않는다.

CodeRabbit이 저장소 설정 오류가 행별 fetch 실패로 흡수되는 문제와 재생 중 demo 경고가 사라지는
문제를 찾았다. 커밋 `a7745c3`에서 설정 검증을 fetch·transaction보다 앞으로 옮기고, 경고를 재생
기하에 영향을 주지 않는 fixed overlay로 유지했다. 두 스레드 모두 근거를 답변하고 resolve했다.
최종 head `a7745c3`은 모든 체크가 성공한 뒤 병합됐다.

로컬 검증: Jest 62 suites / 591 tests, `tsc`, lint, build, Prisma schema validation 통과.
회귀는 구현 전에 4 suites 실패로 확인했다. 상세:
`docs/recovery/validation/2026-08-29-p1a-provenance-backfill.md`.

2026-08-29 운영 DB에서 먼저 dry-run해 총 5건을 `omr=3`, `demo=0`, `unknown=2`,
`fetchFailures=0`으로 확인했다. 기존 migration 3건의 완료 상태와 provenance 컬럼 부재를 확인한
뒤 `20260829012000_add_sheet_provenance`를 Supabase session pooler(5432)로 적용하고 같은 분류를
`--apply`했다. 사후 집계는 `omr=3`, `unknown=2`; `omr`인데 `omrJobId`가 없는 행은 0건이고
migration도 `finished=true`다. 행 삭제는 없었다. 비밀값은 임시 디렉터리에서만 사용했다.

**P1-A는 DONE이다.** 운영 DB migration/backfill, 코드 병합, 운영 배포, 공개 API smoke check가
끝났다. 현재 운영 데이터에는 `demo` 행이 0건이라 실제 경고 화면의 운영 실데이터 검증은
불가능하며, active playback 회귀 테스트가 그 계약을 고정한다. 작업 브랜치의 로컬·원격 tip이
모두 main에 포함됨을 확인한 뒤 양쪽 브랜치를 삭제했다. 다음 roadmap 단계는 P1-B(영속 작업 큐와
OMR 보안)이며 별도 요청·브랜치로 시작한다.

## PR #81 병합 완료 — 재생 화면 기하 종료 (실기기 확인됨)

2026-08-29, PR [#81](https://github.com/landfill/ClairKeys/pull/81)이 `037a42f`로 병합됐다.
병합 후 main checks 6/6 success. **D-023**을 기록한다. **사용자가 실기기에서 결과를 확인했고
이 작업 줄기는 여기서 닫힌다.**

### 같은 결함을 세 번 만에 고쳤다 — 다음 세션이 반복하지 말 것

| PR | 무엇을 바꿨나 | 폰에서 왜 안 통했나 |
|---|---|---|
| #79 (D-021) | 낙하 상한 2.5s 도입 | 폰 가용 276~390px에서 **350px 상한이 안 걸림** |
| #80 (D-022) | 건반 우선 배분 + 노트 하한 1s | 건반이 6.3에 닿은 뒤로는 **남는 높이가 다시 전부 낙하로** |
| #81 (D-023) | 상한을 **건반 높이 비례**(1.15)로 | 건반이 멈추면 낙하도 멈춤 — **폰에서 걸린다** |

앞의 두 번은 상한 **값**을 바꿨을 뿐 "폰에서는 어떤 상한도 걸리지 않는다"는 **구조**를 고치지
못했다. `100dvh`는 표시 중인 브라우저 크롬을 뺀 동적 뷰포트라 주소창이 접히면 50~60px이
돌아오는데, 건반이 이미 비율 상한에 닿아 못 자라므로 그 픽셀이 전부 낙하 영역으로 갔다.

**D-023 Directive:** 낙하 영역에 거는 어떤 상한도 **폰 가로(가용 276~390px)에서 걸리는지 먼저
확인한다.** 걸리지 않으면 그건 상한이 아니다.

### 최종 기하

| 환경 | 가용 | 낙하 | 미리 보임 | 건반 | 여백 |
|---|---:|---:|---:|---:|---:|
| 폰 가로 + 주소창 | 276 | 140 | 1.00s | 134 | 0 |
| 폰 가로 (일부 접힘) | 326 | 172 | 1.23s | 152 | 0 |
| 폰 가로 (완전 접힘) | 390 | 175 | **1.25s** | 152 | 61 |
| 큰 폰 가로 | 430 | 177 | **1.26s** | 154 | 97 |
| 데스크톱 1470×746 | 682 | 195 | 1.39s | 170 | 315 |

주소창이 접혀도 평평하다. 건반과 낙하의 비율이 **모든 화면에서 1.15**, 건반 종횡비는 **6.3**
(실제 백건 약 23×145mm)이다. 데스크톱은 2.50s → 1.39s로 짧아졌다 — 화면 크기 임계값을 두지 않는
대가로 사용자가 명시적으로 선택했다.

되돌릴 손잡이는 상수 셋뿐이다: `FALLING_TO_KEYBOARD_RATIO`(1.15), `PIANO_KEY_ASPECT`(6.3),
`MIN_LOOK_AHEAD_SEC`(1s).

## (경과) PR #80 병합 완료## PR #80 병합 완료 — 실기기가 D-021의 가정을 반박했다

2026-08-29, PR [#80](https://github.com/landfill/ClairKeys/pull/80)이 `3670606`으로 병합됐다.
병합 후 main checks 6/6 success. **D-022**가 D-021 결정 3과 그 Directive를 대체한다.

**사용자 실기기 보고: 폰 가로에서 낙하 영역이 너무 크다.** D-021은 낙하 영역에 2.5s 상한을 두고
**남는 높이만** 건반에 줬는데, 근거였던 "폰에서 건반을 키우면 노트 활주로를 뺏는다"가 틀렸다.

산술이 이유다. **폰 가로 뷰포트는 세로 약 390px이라 낙하 영역이 350px 상한에 도달할 수 없다** —
폰에서는 상한이 한 번도 걸리지 않는다. 건반은 120px 바닥에 못박히고 낙하 영역이 남은 전부를
가져간다. **PR #79는 데스크톱만 고쳤고 폰에는 원래 결함("낙하 = 남는 높이 전부")이 그대로
남았다.** 그게 최초 보고의 내용 그 자체였다.

**교훈 — 다음 세션이 반복하지 말 것:** 그 변경은 데스크톱에 대해서는 산출해 보고 폰에 대해서는
**추론만 했다.** 추론만 한 쪽이 잘못 나갔다. 이 기하를 바꿀 때는 폰 가로(가용 약 270–370px)와
데스크톱을 **둘 다 수치로 산출**한다.

새 규칙: **두 부분 모두 명시된 몫을 갖는다** — 건반은 비율(`keyWidth × 6.3`), 노트는
하한(`MIN_LOOK_AHEAD_SEC = 1`, 140px), 그리고 상한(2.5s). 어느 쪽도 나머지로 정의되지 않는다.
둘 다 감당 못 하면 건반이 120px 바닥으로 물러난다. 유휴 박스도 같은 규칙을 쓴다.

| 환경 | 가용 | 이전 낙하/건반 | 이후 낙하/건반 | 비율 |
|---|---:|---:|---:|---:|
| iPhone 12 가로 + 주소창 | 276 | 154 (1.10s) / 120 | **140 (1.00s) / 134** | 5.57 |
| iPhone 12 가로 | 326 | 204 (1.46s) / 120 | **172 (1.23s) / 152** | 6.32 |
| iPhone 15 Pro Max 가로 | 366 | 244 (1.74s) / 120 | **210 (1.50s) / 154** | 6.29 |
| 데스크톱 1470×746 | 682 | 350 (2.50s) / 170 | **변화 없음** | 6.30 |
| 유휴 박스 | 330 | 208 (1.49s) / 120 | **177 (1.26s) / 151** | 6.29 |

운영 배포본 실측으로 데스크톱 재생 350px(2.50s) / 건반 170px / 비율 6.30, 유휴 175px(1.25s) /
건반 153px / 비율 6.29를 확인했다.

**미검증:** 보고한 실기기에서 재확인하지 못했다. 수치는 순수 함수 산출과 래퍼 높이를 326px로
제한한 데스크톱 시뮬레이션이다. **방향이 과했다면 손잡이는 `MIN_LOOK_AHEAD_SEC`(1s)와
`PIANO_KEY_ASPECT`(6.3) 상수 두 개뿐이다.**

**PR 본문을 저장소 템플릿으로 작성한 첫 PR이다** — PR #79 리뷰에서 드러난 누락을 반영했다.

- 근거: `docs/recovery/reviews/PR-80.md`, D-022

## (경과) PR #77·#78·#79 병합 완료## PR #77·#78·#79 병합 완료 — 재생 화면 기하가 가로·세로 모두 정리됐다

2026-08-29, 세 PR이 모두 병합됐다. 병합 후 main checks 매번 6/6 success.

| PR | 병합 | 내용 | 기록 |
|---|---|---|---|
| [#78](https://github.com/landfill/ClairKeys/pull/78) | `c563877` | `core` path filter — `src/utils` 변경이 빌드·접근성 검사를 건너뛰던 구멍 | — |
| [#77](https://github.com/landfill/ClairKeys/pull/77) | `da97e74` | 남는 **가로** 폭을 이웃 건반에 쓴다 | **D-020** (D-017 결정 3 대체) |
| [#79](https://github.com/landfill/ClairKeys/pull/79) | `a9f799b` | 미리 보이는 시간에 2.5s 상한, 남는 **세로**는 건반 비율에 | **D-021** (D-020 Directive 이행) |

**운영 배포본 실측** (`/sheet/2`, 데스크톱 1470×746) — 세 PR 전후:

| 항목 | 이전 | 현재 |
|---|---:|---:|
| 흰건반 | 33 | **52 (88건반 전체)** |
| 건반 폭 | 24px | 27px |
| 가로 빈 폭 | 612px (43.6%) | **0** |
| 낙하 영역 | 560px (**4.0s**) | **350px (정확히 2.5s)** |
| 건반 높이 / 비율 | 120px / 1:4.44 | **170px / 1:6.30** |

**#78을 먼저 병합한 순서가 값을 했다.** #77은 최초 실행에서 Build·Security·Accessibility가
`skipping`이었고, #78 병합 후 브랜치를 갱신하자 그 세 잡이 실행되어 통과했다.

**프로세스 누락 — 다음 세션이 즉시 고칠 것:** `.github/pull_request_template.md`가 처음부터
있었는데 **이번 세션 PR #74·#75·#77·#78·#79가 전부 자유 형식으로 작성됐다.** CodeRabbit이 #79에서
지적해 그 한 건만 템플릿에 맞게 재작성했다. 템플릿이 요구하는 Scope(포함/명시적 제외)·Baseline
difference·Risks and rollback·Review checklist는 자유 형식이 계속 빠뜨리던 항목이다. **PR 본문은
템플릿 파일에서 시작한다.**

**시간대 규약이 문서에 없다.** CodeRabbit이 D-021의 `2026-08-29`를 미래 날짜로 지적했는데
UTC 기준 착오였다(로컬 `2026-08-29 01:36 KST` = UTC `2026-08-28 16:36`). 이 저장소는 KST로
기록하지만 `AGENTS.md`에 명시돼 있지 않아, UTC 기준 도구는 15:00 UTC 이후 작업마다 같은 오해를
반복한다. 명시하려면 규약 문서이므로 별도 PR이 필요하다.

**계측 함정 2건 — 브라우저로 이 화면을 검증할 때:**

1. **서비스 워커.** 이 앱은 PWA이고 `localhost:3000`에 `sw.js`가 등록된다. 소스를 고쳐도 워커가
   캐시된 셸을 돌려주어 **바뀐 DOM이 안 보인다.** `.next` 삭제와 dev 서버 재시작으로도 풀리지
   않는다. `navigator.serviceWorker.getRegistrations()` 해제 + `caches.delete()`가 필요하다.
   증상은 "번들에는 새 코드가 있는데 DOM에는 없다"이다.
2. **백그라운드 탭의 `ResizeObserver`** — 콜백이 전달되지 않는다. 크기를 바꾼 뒤 반드시 한 번
   렌더시키고 읽는다.

**여전히 미검증:** 실기기. 폰 가로에서 #79 이후에도 이전과 동일하다는 것은 **단위 테스트로만**
확인했다. 상한이 걸리지 않는 화면이라 논리상 변화가 없어야 한다. 실기기 방향 잠금(`lock()`)도
그대로 미관측이다.

- 근거: `docs/recovery/reviews/PR-77.md`, `PR-78.md`, `PR-79.md`, D-020, D-021

## (경과) PR #77·#78 열림## PR #77·#78 열림 — 건반이 폭을 채우도록, 그리고 그 변경을 CI가 보도록

2026-08-29, 사용자가 **좁은 음역 악보에서 건반 좌우가 비어 불편하다**고 제기했다. D-017 결정 3이
의도한 동작(상한 24px, 남는 폭은 대칭 여백)인데, 실측해 보니 데스크톱 유휴 1022px에서
**230px(22.5%)**, 재생 뷰 1404px에서 **612px(43.6%)**가 비어 있었다.

**PR [#77](https://github.com/landfill/ClairKeys/pull/77)** — 24px을 상한에서 **기준 밀도**로
바꾸고, 남는 폭을 이웃 흰건반에 쓴다(`fillRangeToWidth`). **D-020**이 D-017 결정 3을 대체한다.

- 남는 폭을 건반 *크기*에 쓰면 1404px / 33건반 = 42.5px이고 `keyboardHeight` 120px 고정 대비
  비율이 1:5 → **1:2.8**이 된다(실제 피아노 약 1:6.3). 그래서 *개수*에 쓴다.
- 더해지는 건반은 악보 음역 **밖**이라 어떤 노트도 다른 건반으로 옮겨가지 않고, D-017 크롭
  불변식은 넓어지는 방향이라 깨지지 않는다.
- 실측: 1022px → 42건반 24.33px, 698px → 29건반 24.06px, **둘 다 여백 0**이고
  `floor(가용폭 / 24)`와 정확히 일치. 좁은 뷰포트(356px)는 동작이 이전과 동일하다.
- C 스냅 기각 사유와 충돌하지 않는다: 그것은 **가용 폭과 무관하게** 11반음을 붙였고, 이것은
  어차피 비어 있을 픽셀만 쓴다.

**PR [#78](https://github.com/landfill/ClairKeys/pull/78)** — #77 작업 중 드러난 CI 결함.
path filter가 `src/utils/**`를 어느 필터에도 넣지 않아 `src/utils`만 바꾼 PR은
**Build·Security·Accessibility가 통째로 skip된다.** 테스트 파일을 함께 바꾸지 않으면 Unit·E2E도
skip되어 `Lint and Type Check` 하나만 남는다. `core` 필터를 신설해 막았고, `.github/workflows`를
그 안에 넣었으므로 이 PR이 스스로의 증거다(18/18 pass, 그중 문제의 세 잡 포함).

**계측 함정 — 다음 세션 주의:** 백그라운드 탭에서는 `ResizeObserver`가 콜백을 전달하지 않는다.
이 세션에서 "레이아웃이 폭 변화를 안 따라간다"고 잘못 읽었고, 스크린샷으로 탭을 렌더시키자
정상이었다. 이 화면을 브라우저로 계측할 때는 크기를 바꾼 뒤 반드시 한 번 렌더시키고 읽는다.

**순서:** #78을 먼저 병합하고 #77 브랜치를 갱신해야 #77이 Build/Security/Accessibility의
검증을 받는다. 현재 #77의 빌드는 로컬 통과이고 CI 검증은 없다.

- 근거: `docs/recovery/reviews/PR-77.md`, `docs/recovery/reviews/PR-78.md`, D-020

## PR #74·#75 병합 완료 — 이슈 #65 할 일 1~4 종료, 5~6 잔존

2026-08-28, PR [#75](https://github.com/landfill/ClairKeys/pull/75)가 `8197188`로 병합됐다.
병합 후 main checks **6/6 success**. 브랜치 `codex/p1-playback-landscape`는 원격·로컬 모두
삭제했다. **D-019**가 `main`에 있다.

**리뷰 지적 3건은 전부 실제 결함이었고 병합 전에 수정했다** — 회귀 선행 커밋 `ccacbb1`,
수정 `32d72bd`, 수정 후 CI 18/18 pass. 세 리뷰 스레드 모두 처리 내용을 남기고 resolve했다.
상세는 `docs/recovery/reviews/PR-75.md`.

가장 중요한 것은 R1이다. `usePlaybackOrientation`이 매 렌더 새 객체를 반환해, 그것을 deps에
넣은 effect가 매 렌더 재실행되고 `enter()`가 유발한 렌더에서 아직 `false`인 `isPlaying`을 읽어
방금 건 요청을 취소했다. **CSS 회전이 유일한 수단인 iOS에서는 회전이 아예 나타나지 않는다.**
이것이 초록 CI를 통과한 이유는 컴포넌트 테스트가 hook을 **안정 객체로 mock**했기 때문이다 —
불안정성이야말로 진짜 hook이 가진 성질이었고, mock은 의존성을 단순화한 게 아니라 결함 자체를
제거했다. PR #67의 "백분율 높이는 레이아웃 엔진만 답할 수 있다"와 같은 계열의 실패다.

**이슈 #65는 닫지 않았다.** 남은 할 일:

| 할 일 | 내용 |
|---|---|
| 5 | `src/components/mobile/` 죽은 스택 처리 결정 — 되살릴지 삭제할지. 되살린다면 `PianoKeyboard`의 800px 강제와 이슈 #58을 먼저 정리해야 한다 |
| 6 | 인증 E2E fixture 부재 — `/sheet/[id]`가 `AuthGuard` 뒤라 재생 화면에 Playwright가 도달하지 못한다 |

**미검증 — 다음 세션이 가장 먼저 확인할 것:** 실기기 방향 잠금을 한 번도 관측하지 못했다.
Android/iOS 실기기가 없어 `lock()`의 실제 결과는 확인되지 않았고, CSS 회전 방향
(`rotate(90deg)` — 기기를 **반시계**로 돌려야 바로 보인다)도 임의 선택이다. 회전 잠금을 켠 iOS
사용자가 반대로 돌리면 뒤집혀 보인다. D-019 Consequence에 기록돼 있다.

## (경과) PR #74 병합 + PR #75 열림 — 이슈 #65 할 일 4

PR [#74](https://github.com/landfill/ClairKeys/pull/74)가 2026-08-28 `eee0e94`로 병합됐다
(체크 13/13 pass). 브랜치 `codex/p1-playback-column-collapse`는 원격·로컬 모두 삭제했다.
운영 배포 후 DOM에서 래퍼 div가 사라진 새 구조와 낙하 영역 `overflow: hidden`을 확인했다.

이어서 이슈 #65 **할 일 4(재생 시 가로 전환)**를 PR
[#75](https://github.com/landfill/ClairKeys/pull/75)로 구현했다. **D-019**를 기록한다.

- **하나의 조건이 두 플랫폼을 처리한다.** `engaged && (pointer: coarse) && (orientation:
  portrait)`. Android의 `lock()` 성공은 화면을 실제 가로로 만들어 portrait 질의를 스스로
  종료시키므로, 이슈가 요구한 "이중 회전 해제"가 별도 분기 없이 같은 식에서 나온다.
- **iOS 판별은 `typeof screen.orientation?.lock === 'function'`으로만** 한다 — 인터페이스는
  Safari 16.4+로 존재하므로 다른 검사는 iOS를 조용히 Android 경로로 보낸다.
- **방향 요청은 재생 클릭 핸들러에서 동기적으로** 발사한다. `play()`가 AudioContext와 샘플
  로딩을 await하는 사이 fullscreen의 transient activation 창을 잃기 때문이다.
- **데스크톱은 대상이 아니다** — 사용자 지시대로 PC에는 가로모드 개념이 없다. `(pointer:
  coarse)`로 배제하고 테스트로 고정했다.
- **실측이 범위를 넓혔다.** 재생 중 플레이어 chrome이 264px인데 iPhone 12 가로의 뷰포트 높이는
  390px 전체다. 회전만 하면 낙하 영역이 **6px**이 되므로 컨트롤 압축이 회전과 분리될 수 없다.
  `CompactPlaybackBar`(56px)가 4개 블록을 대체해 chrome 264 → **64px**, 낙하 영역
  6 → **206px**, 건반 폭 10.79 → **24px**이 된다.
- 사용자 결정: 회전 대상은 "재생 화면 전체 + 컨트롤 압축"이다. "시각화 블록만 회전"은 폰을
  세로로 든 채 노트가 옆으로 흐르게 되어 기각했다.
- 검증: `npm test` 56 suites / 542 tests, `tsc`, lint, build 통과. 회전 수식이 변환 후 뷰포트를
  오차 0으로 덮는 것과, 로컬 `/test-finger` 재생의 압축 바 56px·낙하 영역 일치를 브라우저에서
  실측했다.
- **미검증 — 이 PR로 닫히지 않는다:** 실제 방향 잠금을 관측하지 못했다. Android/iOS 실기기가
  없고, `lock()` 호출의 실제 결과는 실기기에서만 확인된다. CSS 회전 방향(`rotate(90deg)`,
  기기를 반시계로 돌려야 바로 보임)도 임의 선택이며 실기기 확인 대상이다.
- 남은 할 일: 5(`src/components/mobile/` 스택 처리), 6(인증 E2E fixture). **이슈 #65를 닫지
  않는다.**
- 근거: `docs/recovery/reviews/PR-74.md`, `docs/recovery/reviews/PR-75.md`, D-019

## PR #74 상세 — PR #67이 만든 재생 회귀

2026-08-28, 사용자가 `/sheet/2` 재생 화면에서 **건반이 최상단으로 올라가고 노트가 건반에서
시작해 아래로 떨어지는** 상태를 보고했다. 배포본에서 결정적으로 재현했고 PR
[#74](https://github.com/landfill/ClairKeys/pull/74)로 수정했다.

원인은 CSS 백분율 높이다. `FallingNotesPlayer`의 시각화 박스 안에 `height: '100%'`인 flex
컬럼 래퍼가 있는데, PR #67 이전에는 부모가 픽셀 높이를 명시해 100%가 풀렸다. PR #67이 재생 중
부모를 `{ flex: 1, minHeight: 0 }`로 바꾸면서 **선언된** 높이가 사라졌고 Chrome은 100%를
`auto`로 처리한다. 래퍼는 건반 120px까지 줄고 `flex: 1`인 낙하 영역이 **0px로 붕괴**한다.
`FallingNotes`는 여전히 JS가 계산한 `fallingHeight`(측정 높이 − 120)를 좌표계로 쓰므로 노트가
건반 위치에서 시작해 그 아래로 그려졌다.

**교훈:** PR #67의 검증은 `tsc`·lint·Jest·좌표 계산 프로브였고 전부 통과했다. 백분율 높이의
해석은 **레이아웃 엔진만이 답할 수 있는 질문**이라 그 어느 것도 이 결함을 잡을 수 없었다.
PR #67 본문의 "실기기 렌더링 없음"이 정확히 이 구멍을 가리키고 있었다.

- 실측(Chrome 1470×746, 배포본): 수정 전 안쪽 컬럼 **120px** / 낙하 영역 **0px** / 건반이
  viewport y=264.5. 수정 후 480.5px / **360.5px** / 건반 y=625이고, 낙하 영역 실측 높이가
  JS `fallingHeight`와 정확히 일치한다.
- 함께 고친 것 — **PR #67 이전부터 있던 별개 결함**: 낙하 영역에 `overflow: hidden`이 없어
  히트라인을 지난 노트가 흰건반 위에 계속 그려졌다(둘이 같은 stacking context, 노트 z=20 >
  흰건반 z=10). 히트라인에서 자른다.
- 회귀 테스트는 동작 변경보다 먼저 단독 커밋했다(`1d1d07b`, 3 failed / 5 passed). jsdom은
  레이아웃이 없어 붕괴를 직접 볼 수 없으므로, 브라우저가 뒤이어 해석할 **구조 계약**(측정 대상
  == flex 컬럼, 그 사이에 백분율 높이 없음, 낙하 영역 클리핑)을 고정했다.
- 검증: `npm test` 55 suites / 527 tests, `tsc`, lint, build 통과.
- **여전히 미구현 — 모바일 가로모드 전환**: 이슈 #65 할 일 4. PR #67도 #74도 범위 밖이다.
  iOS는 `screen.orientation.lock()`이 없고 Android는 fullscreen 선행이 필요하다. 사용자가
  "애초 작업 목적"으로 지목한 항목이므로 다음 우선순위 후보다.
- 근거: `docs/recovery/reviews/PR-74.md`

## GitHub 이슈 상태 감사 — 2026-08-28

GitHub live state와 저장소 기록의 불일치 4건을 정리했다.

- **#55 재개** — 구현 없이 이슈를 기록한 상태 커밋 `14083ff`의 `fix #55` 문구가 GitHub
  종료 키워드로 파싱되어 생성 직후 닫힌 오종료였다. 브라우저 폴링이 끊기면 변환 결과 저장
  트리거가 사라지는 결함은 그대로이며, 다음 구현 우선순위다.
- **#65 재개** — PR #67 병합 직후 한 번 재개했지만, 그 사고를 기록한 상태 커밋 `6884748`의
  인용문 `Closes #65`가 다시 종료 키워드로 파싱해 재차 닫았다. 할 일 4~6은 그대로 남아 있다.
- **#20 종료** — P1-A stage 4가 PR #34/#35로 완료됐다. 운영 변환 경로에서 demo 성공 저장은
  제거됐고 남은 generator는 개발 전용 guard 뒤에 격리되어 있다.
- **#22 종료** — PR #36/#37/#42/#43으로 실제 Audiveris 실행, `.mxl` 변환, 인증·저장 경계,
  외부 네트워크의 실제 PDF 종단 변환(514 notes)까지 완료 조건이 충족됐다.

**새 규칙:** GitHub는 PR 본문뿐 아니라 기본 브랜치의 커밋 메시지에서도
`close`/`closes`/`closed`, `fix`/`fixes`/`fixed`, `resolve`/`resolves`/`resolved`와 `#번호`
조합을 파싱한다. 사고를 설명하는 인용문도 예외가 아니다. 완료 의도가 없는 상태 기록 커밋에서는
이 조합을 쓰지 말고 `issue #번호`, `재개`, `종료 키워드`처럼 적는다.

## PR #68 병합 완료 — 이슈 #55 서버 주도 완료 저장

PR [#68](https://github.com/landfill/ClairKeys/pull/68)이 2026-08-28 `41606e7`로 병합됐다.
브랜치 `codex/p1b-issue-55-server-finalization`은 원격·로컬 모두 삭제했다.
**D-018**을 기록한다. 병합 후 main checks 6/6 성공.

- `7c0242f` / `00b6b41` / `6f624f7` — callback 계약, 인증된 finalize endpoint, 공유
  idempotent 저장 경로, CodeQL SSRF 대응.
- `caab7f7` / `638e478` — 수동 리뷰 지적 **R3·R4·R5·R7** 수정. 회귀를 먼저 단독 커밋했고,
  `omr.delivery`를 당시 동작으로 stub한 상태에서 Python 8 assertions, Jest 1건이 실패했다.
  - **R3** — `notify_completion`이 FAILED를 쓰는 `try` 안에 있어 전달 결함이 완료된 job을
    실패로 되돌릴 수 있었다. `try`의 `else`로 옮겼다. `else`는 변환이 예외를 내지 않았을 때만
    실행되고 그 안의 예외는 위 handler가 잡지 않는다 — 두 조건을 동시에 만족하는 유일한 위치다.
  - **R4** — httpx timeout 30s < finalize `maxDuration` 60s라 느린 finalize가 중복 실행됐다.
    70s로 올렸고, 회귀가 라우트의 `maxDuration`을 직접 읽어 비교한다.
  - **R5** — 400/401 같은 영구 실패도 12회 재시도했다. 재시도 정책을 stdlib-only
    `omr-service/omr/delivery.py`로 분리했다(`omr/auth.py`와 같은 이유 — `app.py`는 fastapi
    때문에 import되지 않아 안에 있는 로직은 읽을 수만 있다). **404는 의도적으로 retryable
    유지**: upload가 `/process` 응답 후에야 `omrJobId`를 쓰므로 빠른 job이 그 창으로 들어온다.
  - **R7** — `/status/{jobId}`가 라우트 파라미터를 원문 보간했다. `encodeURIComponent(storedJobId)`.
- 병합 전 검증: Python **43**, Jest **55 suites / 524 tests**, `tsc`, lint, build 통과,
  hosted checks 17/17.
- **미해결 리뷰 항목 — 병합으로 닫히지 않았다:** R6(`omrJobId` 인덱스 부재), R8(finalize의
  DB 왕복 no-op과 오해 소지 주석), R10(`NEXTAUTH_URL` 미설정 시 요청 origin fallback),
  R11(`alreadyStored`가 `processingStatus`를 고치지 않음). R9는 PARTIAL — 재시도 정책은 실제
  실행 테스트로 전환했지만 `notify_completion`의 HTTP 경로 자체는 여전히 미실행이다.
- **미검증:** 실제 VM→Vercel callback, 화면 이탈을 포함한 실제 PDF 종단 업로드. **이 브랜치의
  `omr-service/app.py`가 VM에 배포되기 전에는 이슈 #55 달성을 주장하지 않는다.**
- **리뷰 정정 기록:** 수동 리뷰의 Fly auto-stop H1은 `REJECTED`였다. 리뷰어가 배포된 적 없는
  과거 `omr-service/fly.toml`을 현재 설정으로 오인했다. 실제 런타임은 NAVER Cloud VM의
  podman/systemd다.
- 근거: `docs/recovery/reviews/PR-68.md`,
  `docs/recovery/validation/2026-08-28-issue-55-server-finalization.md`.

## 이슈 #55 종료 — 화면을 벗어나도 결과가 저장된다

2026-08-28, 사용자가 웹앱에서 PDF를 업로드하고 **업로드 화면을 벗어난 뒤** 악보가 저장된 것을
확인했다. 이슈 [#55](https://github.com/landfill/ClairKeys/issues/55)를 종료했다.

서비스 측 근거 — job `0309f4a3-1130-482a-9698-fef933f395f6`:

```
INFO:app:Successfully completed job 0309f4a3-1130-482a-9698-fef933f395f6
INFO:app:Delivered completed job 0309f4a3-1130-482a-9698-fef933f395f6 to https://clairkeys.vercel.app/api/omr/finalize
```

`delivery_status=delivered`, 이 job의 실패·재시도 로그 **0건** — **첫 시도에 전달**됐다.
결과 411 notes. `Delivered`는 2xx를 받은 경우에만 기록되고, finalize는 2xx를 돌려주기 전에
`/result` 수거·Supabase 저장·행 갱신을 모두 마쳐야 한다. 따라서 이 한 줄이 변환 완료 → 콜백
발사 → 인증 → `omrJobId` 조회 성공 → 결과 수거 → 저장 → 행 갱신 전 구간의 실행을 뜻한다.

**저장 트리거가 더 이상 마운트된 브라우저에 의존하지 않는다.** 폴링은 idempotent fallback으로
남으며 D-018이 이유를 기록한다.

**이것으로 닫히지 **않는** 것 — 전부 이슈로 추적 중이다:**

| 이슈 | 내용 |
|---|---|
| [#70](https://github.com/landfill/ClairKeys/issues/70) | `omrJobId`에 인덱스가 없다. 이제 모든 콜백·재시도가 타는 경로인데 시퀀셜 스캔 (R6) |
| [#71](https://github.com/landfill/ClairKeys/issues/71) | `NEXTAUTH_URL` 미설정 시 콜백 주소가 요청 Host에서 유도되고 그 주소로 공유 비밀이 나간다 (R10) |
| [#72](https://github.com/landfill/ClairKeys/issues/72) | finalize의 도달 불가 409 분기 + 오해 소지 주석, `alreadyStored`가 상태를 안 고침 (R8·R11) |
| [#73](https://github.com/landfill/ClairKeys/issues/73) | `notify_completion`의 HTTP 경로 미실행, 소진 후 폴링 회수 미관측 (R9 잔여) |
| [#52](https://github.com/landfill/ClairKeys/issues/52) | `systemctl restart`가 항상 한 번 실패 후 자동 복구 — 2026-08-28 재현 확인, `deploy/README.md`에 재배포 절차 부재도 함께 기록 |

이슈로 옮기지 않은 것이 하나 있다. **영속 전달 없음** — job 상태와 전달 재시도가 OMR 프로세스
메모리에 있어 재시작 시 함께 사라진다. 이건 결함이 아니라 D-018이 명시적으로 P1-B queue 범위로
남긴 **설계된 미완성**이므로 `docs/recovery/phases/P1-B-durable-omr.md`가 추적한다. 이번 확인을
영속 큐 완료로 표현하지 않는다.

- 근거: `docs/recovery/validation/2026-08-28-issue-55-page-leave-end-to-end.md`

## OMR 서비스 배포 — 콜백 발사 확인

2026-08-28, `acf25f8`을 NAVER VM에 배포했다. 배포 전 실행 이미지는 `cb42947`로 PR #68 **이전**
이었다 — 즉 D-018의 서비스 절반은 이때까지 한 번도 돌지 않았다.

**배포 전에 확인한 것 — 기존 deploy README에 없는 새 위험.** README의 절차는 인바운드만
검증한다. 이번 릴리스는 서비스가 처음으로 아웃바운드 요청을 보내므로 그 경로 존재 여부가
성패를 가른다. ACG가 막고 있었다면 콜백은 12회 조용히 실패하고 증상은 "아무 일도 안 일어남"이다.
VM에서 실행한 결과, 일반 HTTPS 200이고 `POST /api/omr/finalize`는 토큰 없이 **401**, 올바른
토큰 + 비-UUID는 **400**, 올바른 토큰 + 없는 UUID는 **404**, 틀린 토큰은 **401**이다.
**401이 아니라 400/404라는 사실이 곧 양쪽 `OMR_SHARED_SECRET`이 일치한다는 증거**이며, 배포
전에 콜백 계약의 Next.js 절반이 전부 실증됐다.

**배포 후 확인.** 외부에서 `/health` 200, `/process` 401. 실행 중인 컨테이너 내부에서 소스가
아니라 적재된 모듈을 검사해 R3(`notify_completion`이 `else` 블록), R4(`70.0`),
R5(`is_retryable_status(400)=False`, `(404)=True`), `httpx 0.24.1`을 확인했다.

**실제 변환 + 콜백 발사.** `wtk1-prelude1-a4.pdf`가 **514 notes**로 변환됐다 — 2026-08-21 이후
고정값과 같으므로 이 배포는 변환기를 바꾸지 않았다. `delivery_status`가 `retrying`으로 전이하고
로그에 `Completion callback … returned 404: {"error":"Job not found."}`가 남았다. 합성 job이라
`SheetMusic` 행이 없어 404가 옳은 답이고, 404를 재시도하는 것도 D-018 정책대로다.

**이슈 #55는 이 배포로 닫히지 않는다.** 남은 고리는 하나뿐이다: 실제 사용자가 웹앱에서 PDF를
업로드해 행이 생기고, 그 행의 `omrJobId`로 콜백이 조회에 **성공**해 결과가 저장되는 것.
인증된 브라우저 세션이 필요해 에이전트가 실행할 수 없다. 확인 방법은 업로드 직후 **업로드
화면을 벗어나고** 약 45초 넘게 기다린 뒤 악보가 `completed`인지 보는 것이다 — 화면에 머무르면
폴링이 콜백 없이도 저장하므로 검증이 되지 않는다.

**발견: systemd unit의 잠복 결함 (기배포분, 이번 변경과 무관).** `systemctl restart`가
`Error: remove /run/clairkeys-omr.service.ctr-id: no such file or directory` / `status=125`로
실패를 보고한 뒤 `Restart=always`가 100ms 후 재시도해 성공한다. 2026-08-23 journal에 동일
시퀀스가 있다. 결과적으로 서비스는 뜨지만 **`systemctl restart`의 종료 코드를 배포 성공 판정에
쓸 수 없고**, `Restart=always`를 손대면 배포가 서비스를 내린 채 끝날 수 있다. 후속으로
`deploy/README.md`에 재배포 절차와 이 quirk를 적고 `ExecStartPre=-/bin/rm -f %t/%n.ctr-id`를
검토한다 — ops 설정이므로 브랜치·PR 대상이다.

- 근거: `docs/recovery/validation/2026-08-28-omr-callback-vm-deployment.md`

## PR #69 병합 완료 — 폐기된 Fly 배포 표면 제거

PR [#69](https://github.com/landfill/ClairKeys/pull/69)가 2026-08-28 `aaae994`로 병합됐다.
브랜치 `codex/ops-remove-fly-artifacts`는 원격·로컬 모두 삭제했다. 병합 후 main checks 6/6 성공.

- `c674a72` — 회귀 테스트 단독. NAVER VM podman unit을 유일한 활성 배포 계약으로 요구하고
  정리 전 main의 `omr-service/fly.toml` 존재 때문에 실패했다.
- `afa5a0a` — 배포된 적 없는 `fly.toml`과 README 배포 절차를 제거하고, AGENTS·코드 주석·테스트
  설명을 실제 FastAPI/NAVER VM 기준으로 정정했다. AGENTS.md의 "Standalone Flask API"도 함께
  바로잡혔다 — 실제로는 FastAPI다. D-008은 D-012에 의해 superseded된 역사 항목으로 축약했다.
  날짜가 있는 과거 리뷰·검증 기록은 당시 사실의 증거로 보존했다.
- **재유입 방지가 이 PR의 핵심 자산이다.** `test_audiveris_runtime.py`의
  `assertFalse((OMR_SERVICE_ROOT / "fly.toml").exists())`와 podman unit 계약 단언이
  삭제 상태를 고정한다. 삭제는 되돌아오기 쉽지만 이제 되돌아오면 CI가 잡는다.
- **독립 리뷰:** 새 터미널의 Claude Sonnet 5가 현재 워크트리를 공유해 읽기 전용 검토
  (Run `run_f299fbc68bf1`, Task `task_20ba3293da69`, Dispatch `ctx_b0699d3f8522`).
  Blocking findings 없음. LOW 관찰 R2는 `REJECTED`.
- **PR #68 병합 후 재검증:** 두 PR이 `app.py`·`DECISIONS.md`·upload route test를 공유해
  trial merge 후 병합 결과에서 전체 게이트를 다시 돌렸다 — Python **44**, Jest **55 suites /
  524 tests**, `tsc` exit 0, lint clean, build 성공. #69가 `app.py`에 한 변경은 `/health`
  docstring 한 줄이라 #68의 `notify_completion` 변경과 겹치지 않는다.
- **정리 완결성 확인:** 날짜 기록을 제외한 코드·테스트·README·AGENTS·DECISIONS·워크플로·
  Dockerfile 전체 grep 결과, 남은 Fly 언급은 가드 테스트 자체와 날짜 표제 아래 과거 기록뿐이다.
- 근거: `docs/recovery/reviews/PR-69.md`,
  `docs/recovery/validation/2026-08-28-remove-obsolete-fly-artifacts.md`.

## 지금 해야 할 것 — PR #67의 실기기 확인

**PR [#67](https://github.com/landfill/ClairKeys/pull/67)이 2026-08-28 `4e084a1`로 병합·배포됐다.**
이슈 #65의 할 일 1~3(반응형 `keyWidth`, 곡 단위 음역 크롭, 재생 전용 모드)이며 **D-017**을 기록한다.
머지 커밋 체크 6/6 성공, Vercel Production 배포 성공, 작업 브랜치 삭제 완료, `main`이 유일.

**목적은 아직 사람 눈으로 검증되지 않았다.** 이 PR이 존재하는 이유는 "모바일에서 88건반이 보인다"인데,
지금까지의 검증은 전부 구조적이다 — 좌표 계산, jsdom 렌더, 테스트 515건. 그중 어느 것도 실제 폰에서
건반이 읽히는지를 입증하지 않는다. **실기기로 확인하고 결과를 좋든 나쁘든 기록하라.**

**확인할 때 알아둘 것: 세로는 여전히 좁다.** 크롭 후에도 11.1~13.7px로 데스크톱 24px의 절반이다.
이건 결함이 아니라 예상된 결과이며, 세로 대책은 이슈 #65의 **할 일 4(재생 시 가로 전환)**다.
D-017 Consequence에도 그렇게 적혀 있다. **세로가 좁다는 이유로 이 병합을 되돌리지 마라.**

### 사고 — 이슈 #65가 자동으로 닫혔다가 재개됐다

PR 본문에 `Closes #65 의 할 일 1~3. ... 이슈는 닫지 않는다`라고 썼는데 **GitHub는 그 문장에서
`Closes #65`만 파싱한다.** 뒤에 붙인 한국어 단서는 파서에게 의미가 없다. 병합 직후 재개했고
(`OPEN` 확인) 병합된 PR 본문에서도 키워드를 제거했다.

**자연어 단서로 기계 동작을 무효화할 수 없다 — 닫지 않으려면 키워드 자체를 쓰지 마라.**
선례가 있다: 이슈 #48이 수정 커밋 없이 `completed`로 닫혔다가 2026-08-23에 재개됐다.

**이슈 #65는 열려 있다** — 할 일 4(재생 시 가로 전환), 5(`src/components/mobile/` 죽은 스택 처리),
6(인증 fixture가 필요한 E2E)가 남았다.

근거: `docs/recovery/reviews/PR-67.md`

## 지금 해야 할 것 — PR #64의 청감 확인

**PR [#64](https://github.com/landfill/ClairKeys/pull/64)가 2026-08-28 `f23d549`로 병합·배포됐다.**
이슈 #63(슬라이더 최대에서도 소리가 작다)의 수정이며, 목적은 **아직 검증되지 않았다.**

`DEFAULT_MASTER_GAIN` 0.22 → **0.5**, `MAX_MASTER_GAIN` 0.35 → **0.638**(유도값). 실제 재생의
조밀한 화음이 기본값 **−7.4 dBFS**, 상한 **−5.3 dBFS**다(기존 −14.5 / −10.5). **D-016** 기록.

**여전히 부족하다면 마스터 게인을 더 올릴 여지가 거의 없다** — 상한이 velocity 1.0 기준 클리핑
한계에서 유도됐기 때문이다. 검토 순서는 `docs/recovery/reviews/PR-64.md`에 있다.

### 이 라운드에서 리뷰가 실제로 값을 만들었다

CodeRabbit이 Major 1건을 잡았고, 없었으면 **클리핑 가능한 상태로 병합됐다.** 최초 안은 헤드룸을
velocity 0.7에서 쟀는데 그건 계약이 아니라 현재 변환기의 성질이다. 같은 커밋이 동시타 16음은
"물리적 한계"로 배제하면서 velocity 1.0은 "지금 아무도 안 내보낸다"로 배제했다 — 후자는 가정이며
둘을 같은 종류로 취급한 것이 오류였다. 근거: `docs/recovery/reviews/PR-64.md`

## PR #62의 청감 확인 — 2026-08-27, 조건부 수용

**사용자가 운영 배포된 재생을 들었고 "이 상태로 일단 유지"라고 답했다.**

**이 표현을 만족으로 격상하지 마라.** PR #59 때 사용자는 "만족한다"고 답했고 그건 목적 달성의
확인이었다. 이번은 다르다 — 되돌릴 필요는 없다는 수용이지, 음량이 맞다는 확인이 아니다.
따라서 **"+3.87 dB가 옳은 값이었다"는 아직 입증되지 않았고**, 앞으로도 그 근거로 인용해서는
안 된다. 입증된 것은 "되돌릴 만큼 나쁘지는 않다" 하나다.

실무적으로 이건 **탐색을 멈추라는 뜻이지 완료라는 뜻이 아니다.** 음량 조정을 더 시도하지
않는다. 사용자가 다시 제기하면 그때 D-015의 기준 선택부터 재검토한다.

**다시 제기되더라도 마스터 게인부터 올리지 마라.** `DEFAULT_MASTER_GAIN`·`MAX_MASTER_GAIN`은
합성 폴백과 공유하는 버스이므로, 원인 제공을 하지 않은 경로를 클리핑 쪽으로 민다. 먼저
D-015의 기준 선택 — 창 0.5초, 음역 C3~C6, 중앙값 — 이 실제 연주와 맞는지 재검토한다.
`SAMPLE_PEAK_GAIN`을 리터럴로 되돌려 귀로 튜닝하는 것도 금지다(D-015 Directive).

## 열려 있는 이슈

- **이슈 [#65](https://github.com/landfill/ClairKeys/issues/65)** — 2026-08-28 생성, 같은 날
  Codex 워커 교차검증으로 본문 정정. 사용자가 "모바일에서 악보 재생 시 자동 가로모드"를
  요청했고, 검토 결과 **요청대로만 구현하면 목적을 달성하지 못한다**는 사실이 측정으로 나왔다.
  `FallingNotesPlayer.tsx:46`의 `keyWidth = 24`가 하드코딩이라 건반 폭이 52 × 24 = 1248px
  고정이고, 바깥이 `overflow-hidden`이며 가로 스크롤 컨테이너가 없어 넘치는 부분은 사라진다.
  iPhone 세로에서 흰건반 **14/52**만 보이는데 **가로로 돌려도 33/52**다(E5 위 19개가 여전히
  잘림). 데스크톱에서도 42/52다. `screen.orientation.lock()`은 MDN BCD 기준 safari/safari_ios
  모두 `false`이므로 **iOS에서는 자동 회전이 불가능하다.**

  **우선순위를 세로 정책 결정 → 반응형 geometry → 재생 전용 모드 → 가로모드 유도 순으로 잡았다.**
  자동 회전을 먼저 넣으면 iOS는 무변화, Android도 19개가 계속 잘린 채 닫힌다. 반대로 52개를
  무조건 맞추면 iPhone 세로 흰건반이 **6.85px**이 되고 손가락 배지가 `note.w >= 12` 조건에
  걸려 전부 사라진다(`visualUtils.ts:127`) — "다 보이지만 못 쓰는" 화면이다. 그래서 정책 결정이
  구현보다 앞선다.

  **교차검증에서 코디네이터 오류 3건이 나왔다** — 이 과정이 값을 했다: (1) Container의
  `sm:px-6` tier와 border 2px를 누락해 가로 가용 폭을 812px로 적었다(정정 794px). (2)
  `lock()` 미지원을 "API 자체가 없다"로 과장했다 — 실제로는 `ScreenOrientation` 인터페이스와
  `type`/`angle`은 Safari 16.4+에서 지원되고 `lock()`/`unlock()`만 `false`다. 따라서
  feature-detect를 `'orientation' in screen`으로 하면 **iOS에서 true가 나와 지원됨 경로를 탄다**
  — `typeof screen.orientation?.lock === 'function'`을 써야 한다. (3) 전역 Header를
  `MainLayout` 소속으로 잘못 지목했다(실제는 RootLayout `layout.tsx:98`). 잘리는 건반 개수
  자체는 정정 전후 동일하다.

  워커가 추가로 찾은 것: `FallingNotesPlayer`에 `ResizeObserver`·resize 구독이 전혀 없어
  반응형화의 선행 작업이 필요하다는 점, 낙하 영역이 border-box 때문에 실제 208px인데
  `FallingNotes`에 210px이 전달돼 **약 14ms 시각 어긋남**이 있다는 점, 죽은
  `PianoKeyboard`가 `keyWidth`를 무시하고 canvas 최소폭 **800px을 강제**해 그대로 재사용할 수
  없다는 점, 재생 화면이 listen-only라는 점, 그리고 **오디오 unlock은 결함이 아니라는 점**
  (`useFallingNotesAudio.ts:570`에서 suspended 컨텍스트를 `await resume()`으로 처리).
  `src/components/mobile/` 스택은 죽은 코드이며 되살릴지 삭제할지는 #58과 함께 판단한다.

  **2026-08-28 접근 결정 — 사용자 선택.** 반응형 `keyWidth` + **곡 단위 음역 크롭**(악보가 실제
  쓰는 음역까지만 건반을 그리고 그 폭에 `keyWidth`를 맞춤), 경계는 **C 옥타브로 스냅**. 설계
  불변식은 **"렌더에서 빠지는 것은 건반뿐, 노트는 언제나 전부 렌더된다"**(크롭 하한 ≤ min(midi),
  상한 ≥ max(midi)) — 사용자의 "원 음악을 해치지 않는다" 요구를 테스트 가능한 형태로 옮긴 것이다.
  **재생 중 구간별 동적 크롭은 채택하지 않았다**: 낙하 노트 학습의 전제인 "같은 음은 언제나 같은
  x"가 깨지고 낙하 중인 노트의 x가 비행 도중 재매핑된다.

  **측정으로 나온 핵심 사실: 가로모드에서는 크롭이 필요 없다.** 반응형만으로 88건반 전체가
  `794 / 52 = 15.3px`에 들어간다. 크롭은 **세로모드 전용 구제책**이다(세로 356px에서 크롭 없이는
  6.8px, C3~C6로 크롭하면 16.2px). 그래서 우선순위를 **반응형 geometry → 음역 크롭 → 재생 전용
  모드 → 가로모드 유도**로 확정했다.

  **정정 — 배지 논거는 실제 악보에 적용되지 않는다.** 이슈 최초본이 6.85px의 근거로 "손가락 배지가
  `note.w >= 12`에 걸려 사라진다"를 들었는데, `omr/converter.py`는 `finger`를 **생성하지 않고**
  fixture 14개 중 0개가 가진다. 배지는 데모/샘플 경로에만 나타나므로 `keyWidth >= 13.04px`는
  하드 요구사항이 아니다. 진짜 근거는 흰건반 좌우 `border: 1px`이 24px에서 폭의 8%지만 6.85px에서
  **30%**가 되어 건반 자체가 안 읽히는 것이다 — 고정 픽셀 장식은 반응형 축소에서 비선형으로
  악화된다.

  **이 결정은 아직 `DECISIONS.md`에 없다.** `AGENTS.md`가 DECISIONS 신규 항목을 직접 커밋 예외에서
  제외하므로, 구현 브랜치에서 D-017로 함께 커밋한다. 그때까지는 이슈 #65 본문이 결정의 소재지다.

  **미결 하위 항목**: `keyWidth` 상한(좁은 음역 악보에서 가로 113px까지 커짐), 크롭 하한(C 스냅이
  보장하는 1옥타브로 충분한지 2옥타브를 최소로 둘지), `pxPerSec`·`lookAheadSec`를 화면 높이에서
  유도할지.

  **2026-08-28 실측으로 두 결정이 바뀌었다.** 사용자가 운영 `animation-data` 버킷의 변환 결과 2건
  (Love Affair 411노트, Deborah's Theme 330노트)을 제공했다.

  **(1) C 옥타브 스냅 철회 → 흰건반 스냅.** 두 악보가 C 스냅 후 **정확히 같은 창(C1~B5, 35건반)으로
  붕괴**했다 — 원래 31건반과 26건반으로 달랐다. 스냅이 곡별 적응이라는 크롭의 목적 자체를 지운다.
  Deborah's Theme은 A1 두 음 때문에 C1까지 내려가 **음이 2개뿐인 옥타브가 통째로 추가**되어 +9건반
  (35%), 세로 13.7 → 10.2px이 됐다. 구조적 문제다 — C 스냅은 양 끝에서 최대 11반음을 추가하고
  추가분은 정의상 비어 있다. **흰건반 스냅 비용은 최대 +1건반**(Love Affair +1, Deborah 0).
  기준점은 건반을 더 그리는 대신 C 라벨·옥타브 마커로 제공한다. **이건 코디네이터가 데이터 없이 한
  권고를 데이터가 뒤집은 사례다** — C 스냅은 내가 권했고 사용자가 그걸 택했었다.

  **(2) 세로 대책이 크롭에서 "재생 시 가로 전환"으로 옮겨졌다.** 세로는 최선(흰건반 스냅)으로도
  11.1~13.7px로, 24px의 절반이고 테두리 2px가 폭의 15~18%를 먹는다. **크롭의 실효는 가로에 있다**
  (24.8~30.5px). 사용자가 "재생 버튼 클릭 시 가로 전환"을 요구했고, 재생 버튼은 사용자 제스처이므로
  Android는 `requestFullscreen()` + `lock('landscape')`으로 성립한다. **iOS는 표준 경로가 전부
  막혀 있다** — `lock()`도 manifest `orientation`도 safari/safari_ios 모두 `false`(BCD 확인).
  남는 것은 CSS `rotate(90deg)`인데, **이 화면에서는 평소보다 안전하다**: 텍스트 입력·네이티브
  스크롤·`position: fixed`가 없는 listen-only 뷰라 CSS 회전의 통상적 파괴 요인이 부재하고, 포인터
  히트 테스트는 브라우저가 역변환한다. **단 두 가지를 반드시 처리한다**: 기기를 실제로 돌렸을 때의
  이중 회전 해제(`orientationchange` 구독), 그리고 `100vh` 대신 `100dvh`.

  **불변식 비용도 실측됐다.** Love Affair의 저음 꼬리는 6개 노트(1.5%)인데 이걸 버리면 세로가
  12.7px로 24% 넓어진다. Deborah's Theme도 12개(3.6%)로 같은 형태다. **이 거래는 거절한다** —
  구현 중 반드시 유혹으로 나타나므로 이슈 본문에 명시했다.

  **`finger`는 741개 노트 전부 `null`이었다** — converter.py가 운지를 만들지 않는다는 정정이
  운영 데이터로 확정됐다.

  **주의 — n=2다.** 두 곡 모두 Morricone이고 같은 업로더(`804629`)다. 음역 분포의 일반성은
  입증되지 않았다. 다만 스냅 정책 결론은 분포와 무관하게 구조적이므로 이 표본 한계의 영향을 받지 않는다.

  **2026-08-28 할 일 1~3 구현 완료, PR #67로 열렸다.** Orca 감독형 orchestration으로 진행했다:
  Run `run_d1078ff1739d`, Task `task_11ab9e6e6604`, 워커는 Codex `gpt-5.6-terra` effort high,
  **현재 워크트리 재사용**(분리 안 함). 상세는 `docs/recovery/reviews/PR-67.md`.

  **코디네이터 오류 1건**: 첫 dispatch에 `--model terra`를 넘겨 Codex가 400으로 거절했고 그 워커는
  18분간 아무것도 하지 않았다. 실제 id는 `gpt-5.6-terra`다. **`check --wait` 타임아웃만으로는 이 실패를
  못 잡는다** — 가이드가 타임아웃을 "체크포인트"로 보라고 하기 때문이다. 실패를 드러낸 것은
  `worker-read`의 transcript에 preamble 1건뿐이었다는 사실이었다. `liveness: live`는 살아 있다는 뜻이지
  일하고 있다는 뜻이 아니다.

  **할 일 4~6은 남아 있다**: 재생 시 가로 전환(Android fullscreen+`lock()`, iOS CSS 회전),
  `src/components/mobile/` 죽은 스택 처리, 인증 fixture가 필요한 E2E.

- **이슈 [#61](https://github.com/landfill/ClairKeys/issues/61)** — #62 작업 중 D-014 결정 6의
  전제가 부분적으로 거짓임이 측정으로 드러나 분리했다. 샘플 세트의 음량 편차 중 매끄러운
  10.6 dB 추세는 악기의 음역 균형이 맞지만, 잔차 ±5 dB는 녹음 편차다(인접 단3도 29구간 중
  14개에서 위 음이 더 크고 최대 +7.5 dB). **선행 조건이던 #62 청감 확인은 2026-08-27에
  끝났으므로 이제 착수 가능하다.** 다만 사용자가 "일단 유지"로 답했으므로 전체 음량은 확정이
  아니라 동결이다 — #61을 진행할 때 음량 상수를 함께 건드리면 두 변수가 섞인다. #61 범위는
  샘플 간 상대 편차로만 한정한다.

## Current state

- Program status: `IN_PROGRESS`
- Current phase: **P1-A `IN_PROGRESS`** — upload path consolidation. Work stages 1–5 are all merged: stages 1–2 via PR [#34](https://github.com/landfill/ClairKeys/pull/34) at `aca4073`, stages 3–5 via PR [#35](https://github.com/landfill/ClairKeys/pull/35) at `317dad2`. **One completion criterion remains**: "기존 사용자 데이터와 지원 클라이언트 migration이 검증된다" — the `provenance` backfill in D-010 decision 5, which needs real-data access and therefore the user's approval. All of P0-A/B/C/D are `DONE`.
- Phase document: `docs/recovery/phases/P1-A-upload-pipeline.md` (`IN_PROGRESS`)
- Base branch: `main`
- Handoff delivery: none pending. `AGENTS.md` § "핸드오프 문서는 즉시 `main` 커밋" now governs this file's own updates — they commit straight to `main`, no PR to track here.
- Open pull requests: none. **[#67](https://github.com/landfill/ClairKeys/pull/67) merged 2026-08-28** at `4e084a1` with the user's explicit approval — 이슈 #65의 할 일 1~3. `keyWidth`를 `ResizeObserver`가 읽은 폭과 곡 전체 음역에서 유도하고, 경계를 **흰건반으로 스냅**하며(C 옥타브 스냅은 실측으로 철회), 기준점을 C1–C8 라벨로 제공한다. 재생 중에는 전역 chrome을 비운다. **D-017** 기록. 커밋 3개 — `262d94e`(회귀 테스트 단독), `60c9fe9`(구현), `711641b`(홈페이지 키보드 접근성). Merge-commit checks 6/6 successful; Vercel Production 배포 성공; 원격·로컬 작업 브랜치 삭제, `main`이 유일. **목적은 아직 미검증**(실기기 확인 없음) — 위 절 참조. **이슈 #65는 자동 종료됐다가 재개됐다** — 할 일 4~6이 남았다. 근거: `docs/recovery/reviews/PR-67.md`
- Open pull requests: none. **[#64](https://github.com/landfill/ClairKeys/pull/64) merged 2026-08-28** at `f23d549` with the user's explicit approval — 이슈 #63. 게인 헤드룸을 보이스 선형합이 아니라 실측 믹스다운 피크로 재산정했다. `DEFAULT_MASTER_GAIN` 0.22 → 0.5, `MAX_MASTER_GAIN` 0.35 → 0.638(유도값). **D-016** 기록. Merge-commit checks 6/6 successful; 작업 브랜치 삭제, `main`이 유일. Vercel Production이 `f23d549` 배포. 이슈 #63 자동 종료. **목적은 아직 미검증** — 위 절 참조. 근거: `docs/recovery/reviews/PR-64.md`
- **[#62](https://github.com/landfill/ClairKeys/pull/62) merged 2026-08-27** at `fcc6252` with the user's explicit approval — 이슈 #60(녹음 샘플 재생 음량이 약하다)의 수정. `SAMPLE_PEAK_GAIN`이 리터럴 0.73에서 측정 유도값 `SYNTHESISED_VOICE_RMS / playedBandMedianRms()` = **1.140**(+3.87 dB)이 됐다. **D-015**를 기록하고 이슈 **#61**을 파생시켰다. Merge-commit checks 6/6 successful; 원격·로컬 작업 브랜치 모두 삭제됐고 `main`이 유일한 브랜치다. Vercel Production이 `fcc6252`를 배포했다. 이슈 #60은 자동 종료됐다. **청감 확인 완료(2026-08-27), 단 "일단 유지"라는 조건부 수용이며 만족 확인이 아니다** — 위 절 참조. 근거: `docs/recovery/reviews/PR-62.md`, `docs/recovery/validation/2026-08-27-issue-60-sample-gain-recalibration.md`
- **[#59](https://github.com/landfill/ClairKeys/pull/59) merged 2026-08-27** at `67efc6d`, and its objective is now **confirmed by the user's listening in production** with the user's explicit approval — score playback now uses recorded piano samples. Merge-commit checks 6/6 successful; work branch deleted; Vercel Production deployed `67efc6d`. Audible listening was only possible after deploy, and the user has since listened and confirmed the result. The `degraded`/`failed` states remain unobserved in a real failed load. 근거: `docs/recovery/reviews/PR-59.md`
- Open pull requests: none. **[#57](https://github.com/landfill/ClairKeys/pull/57) merged 2026-08-24** at `d58ceea` with the user's explicit approval — issue #56's black-key displacement and the falling-note centering that followed from it. Merge-commit checks 6/6 successful; work branch, Orca worktree, and both leftover local branches deleted; `main` is the only branch. 근거: `docs/recovery/reviews/PR-57.md`. **[#54](https://github.com/landfill/ClairKeys/pull/54) merged 2026-08-24** at `c9946c3` with the user's explicit approval — the README's OCR section now opens with the fact that OCR has no demonstrated user-visible effect, and names what #50 and #51 each actually changed. Both branch tips confirmed in `main`; work branch deleted. 근거: `docs/recovery/reviews/PR-54.md`
- **[#53](https://github.com/landfill/ClairKeys/pull/53) merged 2026-08-24** at `a5d9da3` with the user's explicit approval — README now names the OCR stage and separates it from the converter code that consumes MusicXML. Merge-commit checks all passed; both branch tips were confirmed in `main` and the work branch is deleted. 근거: `docs/recovery/reviews/PR-53.md`
- **#50 and #51 were merged 2026-08-23** with the user's explicit approval — #50 at `210a021`, #51 at `64753d9`. Both work branches and all three Orca worktrees are deleted; `main` is clean and the only worktree. Issues #48 and #49 closed automatically. Issues #44, #46, #47 remain open and are untouched.
- **#48 was found closed on GitHub and reopened** on 2026-08-23. It had been closed as `completed` at 11:46 UTC while no fix commit existed anywhere — only the four analysis comments had landed. The user confirmed the reopen.
- Pull requests merged 2026-08-23, kept below as the record of what landed:
  - [#45](https://github.com/landfill/ClairKeys/pull/45) — `MERGED` at `9ccf64e` (README service-architecture section: a topology diagram carrying which credential crosses which boundary, plus sequence diagrams for upload→convert→store and for playback, and a table of how each failure surfaces. CodeRabbit's first complete review of this sequence produced two valid findings, both fixed in `6e06e04`: the credential table said the OMR service holds none while `omr/auth.py` requires `OMR_SHARED_SECRET`, and the failure table contradicted itself because upload and polling handle an unreachable service oppositely — on purpose. Review log: `docs/recovery/reviews/PR-45.md`)
  - [#43](https://github.com/landfill/ClairKeys/pull/43) — `MERGED` at `f55a4b4` (**D-012**: exposes the OMR service on `http://101.79.16.73:3000` under a systemd unit, plain HTTP without TLS for the test phase, with the accepted risk and the exit condition both written down. Secret in a 600 env file rather than the 644 unit. Verified from outside the VM: `/health` 200 without a token, `/process`/`/status` 401 with none and with a wrong one, and a full Bach conversion returning 514 notes through the public IP. Review log: `docs/recovery/reviews/PR-43.md`)
  - [#42](https://github.com/landfill/ClairKeys/pull/42) — `MERGED` at `670201a` (head `f328dc9`; was stacked on #41 and retargeted to `main`). Implements
    **D-011** and records it: `omr/storage.py` is deleted, the service returns the animation JSON
    from `GET /result/{job_id}` and holds no storage credential, and `/api/omr/status/[jobId]`
    stores it with the `SUPABASE_SERVICE_ROLE_KEY` that only Vercel has. Payload on `/result`
    rather than `/status` because `/status` is polled in a loop; store keyed on the job id with
    upsert so a double poll cannot orphan an object; the user's title is no longer overwritten by
    the service echo. A shared secret (`X-ClairKeys-Token`) guards every endpoint except
    `/health`, and an unset `OMR_SHARED_SECRET` refuses every request. 6 new Jest tests (4 fail
    against pre-change code), 25 Python tests, full-suite failures byte-identical to baseline.
    Review log: `docs/recovery/reviews/PR-42.md`
  - [#41](https://github.com/landfill/ClairKeys/pull/41) — `MERGED` at `727031c` (head `48d123c`; the 2026-08-23
    production upload report: a row created, `Internal server error`, nothing stored. Both OMR
    routes defaulted to the never-deployed `clairkeys-omr.fly.dev`, whose wildcard DNS resolves, so
    `fetch` **threw** at TLS and skipped the `!ok` branch that marks the row failed — leaving a row
    at `processing` with no `omrJobId`, which the status route looks rows up by, so it could never
    be moved again. The default is removed rather than corrected, and an unset `OMR_SERVICE_URL` is
    refused before any row is created. **Does not make upload work** — D-010's visible failure
    stands. Review log: `docs/recovery/reviews/PR-41.md`)
- Completed pull requests:
  - [#40](https://github.com/landfill/ClairKeys/pull/40) — `MERGED` at `fb9f45b` (ignores `playwright-report/` and `test-results/`, both anchored to the repository root. They are regenerated by every Playwright run but were untracked, so the cleanup protocol read them as user-owned state; that reading blocked branch deletion on 2026-07-26 and again on 2026-08-21, and the 2026-08-02 note recorded them as gone, which stopped being true on the next test run)
  - [#39](https://github.com/landfill/ClairKeys/pull/39) — `MERGED` at `9b31d82` (dependency-only: restored the `Security Audit` required check after six newly published advisories turned it red on unchanged dependencies — the **fifth** occurrence of the PR #25/#27/#31 pattern. `npm audit --audit-level high` went from 6 high to exit 0. Nested overrides keep `js-yaml` at 4.3.1 under `@eslint/eslintrc` and 3.15.1 under `@istanbuljs/load-nyc-config`, because no single version satisfies both; `3.15.1` is a backported fix despite the advisory title saying otherwise. `deepmerge-ts` is forced across a major under `prisma`, which pins it to exactly 7.1.5 in every published version — `prisma generate` still succeeds. All pins carry upper bounds so a resolution cannot silently cross a major. Review log: `docs/recovery/reviews/PR-39.md`)
  - [#37](https://github.com/landfill/ClairKeys/pull/37) — `MERGED` at `0265771` (made the OMR image able to install and start Audiveris. The `.deb`'s postinst needed a system menu directory plus `desktop-file-utils`/`shared-mime-info`, and `libgtk-3-0` is absent from its `Depends` yet loaded by `WellKnowns.<clinit>` before argument parsing. The build now runs `Audiveris -version`. Review log: `docs/recovery/reviews/PR-37.md`)
  - [#38](https://github.com/landfill/ClairKeys/pull/38) — `MERGED` at `3208488` (stopped the service reporting success for work it did not do: `/process` now reads its multipart fields including `sheet_music_id`, and a storage failure fails the job instead of returning a `file://` URL. The local fallback survives for development behind a guard that fails closed. Review log: `docs/recovery/reviews/PR-38.md`)
  - [#36](https://github.com/landfill/ClairKeys/pull/36) — `MERGED` at `c8764ec` (issue #22
    repository repair: accepts Audiveris `.mxl`, invokes the real packaged launcher, removes
    Docker/demo processor selection, pins the checksum-verified 5.11.0 `.deb`, provisions English
    traineddata, serializes 3GB JVMs on a provisional 4GB VM, and kills/reaps timed-out or cancelled
    subprocesses. Multiple `.mxl` results fail explicitly. PR and merge-commit CI passed; Vercel
    Production deployed the Next.js main commit. **The separate Fly OMR image is not built or
    deployed, so production upload is not yet proven and issue #22 remains open.** Review log:
    `docs/recovery/reviews/PR-36.md`)
  - [#35](https://github.com/landfill/ClairKeys/pull/35) — `MERGED` at `317dad2` (**P1-A stages 3–5**: the upload page offers only `OMRUploadForm`; `/api/upload` + `useFileUpload` deleted; `asyncUploadProcessor`/`backgroundProcessor` keep their queue contracts but lose persistence and return `CONVERSION_UNAVAILABLE`; `pdfParser` survives as a development-only generator behind `assertDemoGenerationAllowed()`. `prisma.sheetMusic.create` call sites drop from six to three, none reaching the demo generator. Codex found that removing persistence made an older bug the normal case — `retryJob` reset a `FAILED` row to `PENDING` without restoring the in-memory queue entry, so the job sat at 0% forever; `retryJob` now refuses `CONVERSION_UNAVAILABLE` failures, with a regression test that failed before the fix. CodeRabbit was rate limited for this entire PR and produced no review. 41 suites / 387 tests. **Upload now fails visibly until issue #22 is fixed — intended, not a regression.** Review log: `docs/recovery/reviews/PR-35.md`)
  - [#34](https://github.com/landfill/ClairKeys/pull/34) — `MERGED` at `aca4073` (**P1-A stages 1–2**: `uploadPathInventory.test.ts` pins that only `/api/omr/upload` converts a score while three paths reached `pdfParser.createEnhancedDemo()` and stored the result as an ordinary `SheetMusic` row — the D-001 violation that had outlived its decision by a year. Records **D-010**. Codex found three real issues across two rounds: a missing migration plan; that `omrJobId IS NULL` also matches rows from `POST /api/sheet` and `SheetMusicRepository.create`, so the backfill would have hidden genuine scores; and that leaving the legacy UI callers on always-failing endpoints contradicts stage 3. All fixed. CodeRabbit contributed one valid finding then went rate limited for the rest of the PR. 42 suites / 395 tests. `Unit Tests` went red once on a Docker Hub outage (`docker pull postgres:15` timed out before checkout) and passed on re-run with no code change. Review log: `docs/recovery/reviews/PR-34.md`)
  - [#33](https://github.com/landfill/ClairKeys/pull/33) — `MERGED` at `8df3c4a` (adds a live 고음/treble-rolloff control matching PR #32's volume slider; `harmonicAmplitudes` parameterised, `setTrebleRolloff` clamped 1.5–5, retunes only notes scheduled after the change. 41 suites / 386 tests. CI-conditioned merge. **Follow-up: set `DEFAULT_TREBLE_ROLLOFF` and `DEFAULT_MASTER_GAIN` from the levels the user picks.** Review log: `docs/recovery/reviews/PR-33.md`)
  - [#32](https://github.com/landfill/ClairKeys/pull/32) — `MERGED` at `797ff38` (timbre tuning from listening feedback: `TREBLE_ROLLOFF` 2.4→3.2, master gain 0.1→0.22, and a live 음량 control on the playback screen whose readout is the master gain value. CodeRabbit found 4 valid issues fixed in `de67c5c` — a dishonest volume clamp, no real headroom at `MAX_MASTER_GAIN`, and two missing regression tests. 41 suites / 383 tests. **Follow-up: set `DEFAULT_MASTER_GAIN` to the level the user picks on the slider.** Review log: `docs/recovery/reviews/PR-32.md`)
  - [#30](https://github.com/landfill/ClairKeys/pull/30) — `MERGED` at `81a1067` (low-note timbre: replaces the single-`sine` synthesis with a 24-partial `PeriodicWave` and a decaying envelope; `src/utils/pianoTimbre.ts` pure module. CodeRabbit found two real regressions across review rounds — a velocity-0 note gaining an audible tail from the decay floor, and a zero-length note's attack outlasting it — both fixed with regression tests first; `NoteEnvelope` moved to `src/types/`. Rebased onto #31 to inherit the audit pin. Verified in production: served chunk `931-d2a827719d70b8ca.js` contains `setPeriodicWave`/`createPeriodicWave`/`disableNormalization` and an exponential-decay envelope, with no `4*f0` primary-path cutoff. **Timbre itself still a listening judgement.** Review log: `docs/recovery/reviews/PR-30.md`)
  - [#31](https://github.com/landfill/ClairKeys/pull/31) — `MERGED` at `006fc04` (dependency-only: pins `brace-expansion >=5.0.8`, clearing `GHSA-mh99-v99m-4gvg` — the fourth time a newly published advisory flipped `Security Audit` red with no tree change. Split from #30 like #25 was from #24. Review log: `docs/recovery/reviews/PR-31.md`)
  - [#29](https://github.com/landfill/ClairKeys/pull/29) — `MERGED` at `035ba50` (closes issue #28: removes `deploy.yml`'s `Deploy to production` / `Run database migrations` / `Post-deploy health check` / `Notify deployment status`, none of which had ever succeeded because the repository has no secrets at all; renames the workflow `Deploy` → `Post-merge checks` so a test-only workflow stops reading as proof that a merge shipped. Regression-first `src/ci/__tests__/postMergeWorkflow.test.ts` failed 3/5 before and passes 5/5 after. CodeRabbit was rate limited on first attempt and reported no actionable comments once re-triggered. Both tips confirmed in `main`; branches deleted. The post-merge run on `035ba50` shows as `Post-merge checks`, confirming the rename. Review log: `docs/recovery/reviews/PR-29.md`)
  - [#27](https://github.com/landfill/ClairKeys/pull/27) — `MERGED` at `08c3ff4` (dependency-only: restores the `Security Audit` required check that newly published advisories turned red on `main`. `next-auth` →4.24.15 clears 3 critical advisories in-range, `next` →15.5.21 clears 8 high advisories as a patch bump, `postcss` overrides pin ≥8.5.12 resolves the nested 8.4.31 to 8.5.22. `uuid` deliberately untouched as moderate-only; the next-auth upgrade cleared it anyway. `npm audit` reports 0 vulnerabilities on merged `main` and the high gate exits 0. All hosted checks passed; CodeRabbit found nothing actionable. Both branch tips confirmed in `main`, then remote and local branches deleted — the remote delete needed a retry after a transient GitHub `500`. Review log: `docs/recovery/reviews/PR-27.md`)
  - [#26](https://github.com/landfill/ClairKeys/pull/26) — `MERGED` at `157c3b4` (**P0-C** `DONE`: one AudioContext/score-time anchor for audio scheduling and visuals, same-render key activation, unavailable/suspended/stale-start lifecycle handling, and 1-minute/5-minute drift gates below 1 ms. Post-merge Tests run `29898010765` passed all jobs. Both work-branch tips were confirmed in `main`, then the local and remote branches were deleted after the user authorized removal of obsolete untracked artifacts. Review log: `docs/recovery/reviews/PR-26.md`)
  - [#24](https://github.com/landfill/ClairKeys/pull/24) — `MERGED` at `a63d51f` (**P0-B** `DONE`: `converter.py` rewritten — seconds-based onset accumulation, per-measure backup/chord cursor, `<tie>` duration merge, staff-based hands; `omr/cli.py` seam + Jest corpus gate `converterCorpus.test.ts` scoring the converter via `compareAnimationData`. CodeRabbit's 3 findings fixed in `1e902a4` — cross-barline tie (part-scope `open_ties`, fixture 09), multi-part global tempo timeline (fixture 08), test subprocess timeout/maxBuffer. 9-fixture corpus green on CI. Both branch tips confirmed in `main`; remote+local branches deleted. Review log: `docs/recovery/reviews/PR-24.md`)
  - [#25](https://github.com/landfill/ClairKeys/pull/25) — `MERGED` at `83de264` (dependency-only: pins `sharp >=0.35.0` via npm `overrides`, clearing the high libvips advisories, GHSA-f88m-g3jw-g9cj, that turned `Security Audit` red for every PR; `next` dropped high→moderate. No CodeRabbit findings. Merged first so #24 re-ran against a green audit baseline. Branch deleted after tip confirmed in `main`. Review log: `docs/recovery/reviews/PR-25.md`)
  - [#23](https://github.com/landfill/ClairKeys/pull/23) — `MERGED` at `d59ea9d` (**P0-A** `DONE`: canonical MIDI animation contract + legacy-tolerant validator, 7-case golden corpus + `compareAnimationData`, render-path wiring replacing the `as` cast, `converter.py` emits `version`. Three review waves (14 findings) handled incl. two by-design rejects keeping fixtures as ground truth; D-009 recorded. Work branch deleted after tip confirmed in `main`)
  - [#21](https://github.com/landfill/ClairKeys/pull/21) — `MERGED` at `3349fd3` (docs-only: `DECISIONS.md` D-008 `Proposed`, OMR hosting Fly.io-reuse vs Cloud Run. CodeRabbit C1–C7 accuracy fixes resolved — notably C3: the deployed service does not silently emit demo output; on a Docker-less host the OMR job **fails**. Work branch deleted after tip confirmed in `main`)
  - [#19](https://github.com/landfill/ClairKeys/pull/19) — `MERGED` at `47e30af` (issue #18: one-shot 10s-capped audio scheduler → rolling look-ahead scheduler; P0-C Work stages 1–3. CodeRabbit R1–R3 resolved; work branch deleted after both tips confirmed in `main`)
  - [#14](https://github.com/landfill/ClairKeys/pull/14) — `MERGED` at `05c70df` (P0-D handoff closeout)
  - [#15](https://github.com/landfill/ClairKeys/pull/15) — `MERGED` at `992615f` (agent contract consolidation, `CLAUDE.md` reduced to a pointer at `AGENTS.md`)
  - [#16](https://github.com/landfill/ClairKeys/pull/16) — `MERGED` at `32b5739` (recorded PR #14/#15 merge results; last PR of its kind — see #17)
  - [#17](https://github.com/landfill/ClairKeys/pull/17) — `MERGED` at `a78d0f2` (handoff documents now commit directly to `main`, ending the self-referential "PR records that a PR merged" pattern PR #16 exemplified)
- Superseded pull request: [#11](https://github.com/landfill/ClairKeys/pull/11) — `CLOSED`
- Current objective: **P1-A — consolidate the four PDF upload paths onto the one that actually converts a score.** The deployment and timbre objectives that preceded it are closed: `main` deploys itself again (Vercel Production Branch Tracking fixed), the `Security Audit` gate is green, and both timbre tuning sliders are live in production. The only thing outstanding from the timbre work is a pair of default values that need the user's ear, not code.

## Latest verified result

- **2026-08-27 — PR #59 병합(`67efc6d`). 단, 이 PR의 목적은 아직 검증되지 않았다.**
  악보 재생이 합성 배음 대신 녹음 피아노 샘플을 쓴다. 커밋 4개, hosted CI 17개 통과,
  머지 커밋 체크 6/6 성공, Vercel Production이 `67efc6d`를 배포했다.

  **2026-08-27 청감 확인 완료: 사용자가 운영 배포된 재생을 듣고 만족한다고 확인했다.**
  아래 문단은 병합 시점의 상태 기록이며, 그 미검증은 배포 후 확인으로 닫혔다. 되돌리기는
  발동하지 않는다. 다만 `degraded`/`failed` 표시는 여전히 실물로 관측된 적이 없다.

  (병합 시점 기록) **이 PR은 소리를 바꾸려고 존재하는데 소리는 아무도 확인하지 않았다.** 사용자 환경에서는
  청감 검증이 운영 배포 이후에만 가능하다. 지금까지의 검증은 전부 구조적이다 — 노드 수,
  게인 산술, 버퍼 선택, 테스트 499건. 그중 어느 것도 "피아노처럼 들린다"를 입증하지 않는다.
  **배포 후 후속 조치 4단계가 `docs/recovery/reviews/PR-59.md`에 있다** (들어보기 → 결과를
  좋든 나쁘든 기록 → 개선 안 됐으면 되돌리기, 상수 튜닝 재시도 금지 → degraded/failed 표시
  실물 확인).

  **리뷰가 실제로 값을 만든 라운드였다.** 코덱스 리뷰 워커(읽기 전용)가 HIGH 1건 + MEDIUM
  3건을 찾았고, 그중 HIGH는 샘플 로딩 실패가 `isReady={true}` 하드코딩·전부 삼키는 catch·
  2.5초 race와 맞물려 **성공처럼 보이던 것**이다(D-001/D-010이 반복해 제거해 온 형태).
  같은 워커가 수정까지 맡아 D-014에 8~10항을 추가하고(폴백 유지 + 상태 표면화, 재생 시작 시
  음색 고정, URL 세트 버전) 코드를 고쳤다. 이어 CodeRabbit이 Major 1건(빌드가 서빙 디렉터리에
  직접 써서 같은 버전 URL이 신·구 혼합 세트를 가리킬 수 있음)과 산문 지적 1건(stop 경로 gain
  불연속)을 냈고 둘 다 처리됐다.

  **코디네이터 오류 2건도 이 라운드에서 나왔다.** (1) CodeRabbit 지적을 인라인 코멘트로만
  확인해 요약 산문의 캐시 버저닝 지적을 놓치고 "actionable 1건 처리 완료"로 잘못 기록했다.
  (2) 워커가 LOW로 낸 원자적 교체를 범위 밖으로 뺐는데, **우리가 넣은 URL 버저닝이 그 항목의
  심각도를 올렸다**(버전이 세트 내용을 보증하게 되었으므로 부분 실패가 계약을 깬다).
  CodeRabbit이 Major로 다시 냈다.

  **리뷰 피드백 확인법**: 인라인 코멘트 + 요약 산문 + 요약의 `updated_at`과 리뷰 범위 문자열,
  세 가지를 모두 봐야 한다. 요약 코멘트는 제자리에서 수정되므로 `created_at`만 보면 재리뷰를
  놓친다.

- **2026-08-24 — 이슈 #56이 코덱스 워커 + 코디네이터 교차검증으로 닫혔다. PR #57 병합(`d58ceea`).**
  Orca orchestration으로 진행했다: Run `run_1cfda20fe7be`, Task 3개(수정 / 교차검증 / 보완),
  워커는 Codex `gpt-5.6-sol` effort high.

  **결과**: `pianoLayout.ts`의 검은건반 오프셋을 왼쪽 흰건반 기준 상대값으로 교정(최대 5칸
  어긋남 제거), `visualUtils.ts`·`SimplePianoKeyboard.tsx`의 `* 0.2` 이중 보정 제거,
  이어서 낙하 노트를 88건반 중심에 정렬(`x = keyPos.x + (keyPos.w - width) / 2`).
  회귀 테스트 신규 2개 파일. CodeRabbit 전체 재리뷰 actionable 0건.

  **코디네이터 독립 검증**: 워커의 테스트를 쓰지 않고 별도 검증기로 `buildKeyLayout`과
  `notesToVisualNotes` 출력을 직접 실행 검사했다(keyWidth 10/20/24/33.7 × 불변식 9개).
  수정 전 코드에서 16건 + 88/88 불일치로 실패함을 먼저 확인해 검증기 자체를 검증한 뒤,
  병합 후 `main`에서 전수 통과를 재확인했다.

  **교차검증에서 오류가 양방향으로 나왔다** — 이 과정이 실제로 값을 했다:
  - 코디네이터 spec이 틀림: "offsets 표가 실제 피아노 비대칭을 반영한다"는 주장은 거짓.
    표준 치수 검산 결과 다섯 건반 모두 균일한 좌측 편향이며 D#·A#는 실제와 방향이 반대다.
    → 이슈 [#58](https://github.com/landfill/ClairKeys/issues/58)로 분리, 잘못된 lore는 정정.
  - 코디네이터 spec이 틀림: `npm run type-check`는 존재하지 않는다(`README.md:446` 오기).
    워커가 발견했고, 사실대로 기록하는 쪽으로 처리했다.
  - 코디네이터 검증기가 틀림: 검은건반 간격 불변식을 좌변 기준으로 쟀는데 워커의 모서리 기준이
    옳았다(실제 피아노는 좌변 기준 1.757칸이라 1.5 상한이 성립하지 않는다).
  - 코디네이터 판단이 틀림: 낙하 노트 좌측 정렬을 "2px 미만이라 별도 이슈"로 미루려 했으나
    워커가 반박했고 그쪽이 옳았다. 근거는 `visualUtils.ts:118`의 `getFingerBadgePosition`이
    이미 "작은 것을 큰 것 안에 중앙 정렬"을 관용구로 쓰고 있다는 점 — 크기가 아니라 일관성이
    기준이었다.

  **남은 것**: 이슈 #58(실제 비대칭 + `PianoKeyboard.tsx`와의 통일). 브라우저 스크린샷 비교는
  다섯 화면 모두 미실행이다.

- **2026-08-24 — 이슈 #56의 검은건반 좌표 수정이 review-ready PR #57에 올라갔다.**
  `pianoLayout.ts`의 검은건반 오프셋을 왼쪽 흰건반 기준 `0.65/0.6/0.65/0.6/0.6`으로
  바꾸고, `SimplePianoKeyboard.tsx`와 `visualUtils.ts`에서 각각 더하던 `* 0.2` 보정을 함께
  제거했다. 건반은 `KeyLayout.x`를 좌변으로 쓰고, 더 좁은 낙하 노트는
  `keyPos.x + (keyPos.w - width) / 2`로 해당 건반 중심에 맞춘다. 88건반 전체에서 흰건반과
  검은건반 모두 노트 중심=건반 중심임을 고정했다. 이 중심 계약은 구현 전 **1 suite / 1 test
  실패**(A0 0.96px 왼쪽)를 재현했고 구현 후 통과했다.

  **Lore 정정:** 커밋 `299951d`의 “keeps the original asymmetric placement”는 부정확하다.
  원래 표와 현재 PR 값은 실제 피아노 비대칭이 아니라 모두 경계에서 -0.05~-0.10칸 왼쪽인
  근사다. 실제 중심은 C# -0.10, D# +0.10, F# -0.15, G# 0.00, A# +0.15칸이므로 D#/A#은
  방향이 반대이고 G#은 경계 정중앙이다. 실제 좌변 오프셋은
  `0.611/0.806/0.563/0.709/0.854`, 검은건반 폭은 0.583칸이다. PR #57은 최대 5칸 밀림만
  고치며 이 정밀도와 `PianoKeyboard.tsx` 통일은 이슈 #58 소관이다.

  회귀 테스트를 코드보다 먼저 추가했다. 수정 전 focused Jest는 **2 suites failed,
  5 tests failed / 3 passed**였고, 수정 후 **2 suites / 8 tests 통과**했다. 전체 Jest는
  **50 suites / 457 tests**, lint와 `npx tsc --noEmit`도 통과했다. `npm run type-check`는
  `package.json`에 스크립트가 없어 실행할 수 없었다 — README의 해당 안내는 별도 정정
  대상이며 이 PR 범위에는 넣지 않았다. 좌표 재계산 결과 MIDI 순서 위반 0, 오른쪽 끝
  1040px = 컨테이너 폭 1040px, 최대 검은건반 빈 간격 29px(`keyWidth=20`)다.
  최초 head `299951d`의 hosted checks는 전부 통과했고(E2E 두 작업 포함), 수동 트리거한
  CodeRabbit review는 코드 actionable comment 0건이었다. 중앙 정렬을 추가한 현재 head
  `db9801e`도 hosted checks 17개가 모두 통과했다(E2E 두 작업 포함). PR은 review-ready,
  `MERGEABLE`이며 사용자의 명시적 병합 승인 전에는 병합하지 않는다.
  근거: `docs/recovery/validation/2026-08-24-issue-56-piano-black-key-layout.md`,
  `docs/recovery/reviews/PR-57.md`

- **2026-08-24 — 88건반의 검은건반이 최대 5칸 밀려 있다. 재생 화면 본체의 결함이다.**
  사용자가 "건반 모양이 완전히 잘못된 것으로 보인다"고 지적해 좌표를 직접 계산한 결과 사실이었다.
  이슈 [#56](https://github.com/landfill/ClairKeys/issues/56)로 등록.

  `src/utils/pianoLayout.ts:57-71`이 **절대 좌표에 옥타브 상대 오프셋을 더한다.** `baseX`는
  왼쪽 흰건반의 절대 x인데, `offsets` 표(`0.65/1.6/3.65/4.6/5.6`)는 옥타브의 C를 원점으로 한
  절대 위치다. 둘을 더하므로 **왼쪽 흰건반이 C에서 떨어진 칸 수만큼 정확히 밀린다** —
  C# +0칸, D# +1칸, F# +3칸, G# +4칸, A# +5칸. `A#1`은 화면상 `F2` 위에 그려진다.
  가장 오른쪽 건반은 컨테이너를 64px 넘긴다(`keyWidth=20` 기준).

  **C#만 맞는 것이 발견을 늦췄다** — C#의 왼쪽 흰건반이 곧 옥타브의 C여서 두 원점이 우연히
  일치한다. "일부는 맞아 보이는" 상태가 된다.

  영향: `SimplePianoKeyboard.tsx`(=`/sheet/[id]`가 렌더하는 건반)와 `visualUtils.ts:49`
  (낙하 노트가 같은 `keyPos.x`를 쓴다). 노트와 건반이 함께 틀려 서로 어긋나 보이지는 않지만
  "A#을 누르라"는 표시가 F 위치에 뜬다.

  **올바른 구현은 이미 저장소에 있다**: `PianoKeyboard.tsx:85-95`는 경계 기준 상대 오프셋
  (`-0.25/+0.25/-0.33/0/+0.33`)을 쓰며 정상이다. 재생 화면이 쓰는 경로만 틀렸다.

  **시각적 지문은 "검은건반 5개가 촘촘히 붙고 3칸 빈자리"의 반복이다.** 사용자가 이 패턴을
  먼저 알아봤다. 간격 수열이 `0.95 1 1 3.05 …`로, 올바른 배치(`1.5 1.42 1.33 1.33 1.42 …`,
  1.5칸 초과 간격 없음)와 전혀 다르다. 각 묶음은 한 옥타브의 5개가 아니라 서로 다른 옥타브가
  뒤섞인 것이다.

  **그래서 음높이 순서가 깨진다 — 35쌍 중 7쌍 위반.** `A#3`보다 `C#4`가 왼쪽에 그려진다.
  36개 중 **29개**가 인접 흰건반 경계에서 ±0.35칸을 벗어나 있다.

  **`buildKeyLayout`에 테스트가 하나도 없다** — `piano.test.ts`는 음이름·주파수 변환만 다룬다.
  #56에 좌표 불변식 7개를 회귀 테스트 후보로 적어 두었다. 그중 **"x 정렬 순서 = MIDI 순서"
  하나가 이 결함 전체를 잡아낸다.**

  **수정 위치와 영향 범위를 전수 조사해 #56에 기록했다** (건반 구현이 두 벌이라 필요했다):

  - **고칠 파일 3개** — `pianoLayout.ts:57-71`(근본 원인), `visualUtils.ts:49`,
    `SimplePianoKeyboard.tsx:60`. 뒤 둘은 각각 `keyPos.w * 0.2` 보정을 더하므로 **세 곳을
    동시에** 고쳐야 한다. 한쪽만 고치면 건반과 낙하 노트가 새로 어긋난다.
  - **영향 화면 5곳** — `app/page.tsx:43-44`(**메인 랜딩의 "피아노 미리보기"**),
    `sheet/[id]/page.tsx:179`→`FallingNotesPlayer.tsx:54,191`(연주 화면),
    `test-finger:88`, `test-piano:35,188,202`.
  - **`PianoKeyboard.tsx`는 정상이고 수정 대상이 아니다** — 자체 좌표계(경계 기준 상대
    오프셋)를 쓰며 모바일 전체화면·가로모드·데모가 이걸 쓴다. 즉 **현재 데스크톱 연주 화면과
    모바일 건반의 모양이 서로 다르며**, A를 고치면 비로소 일치한다.
  - `EnhancedPianoKeyboard.tsx`는 참조 0건인 죽은 코드다.

  **오디오·타이밍에는 영향이 없다** — 오디오는 `pianoLayout.ts`에서 `midiToFreq`/`A0_MIDI`/
  `C8_MIDI`만 가져가고 x를 보지 않으며, `animationEngine.ts`는 layout을 참조하지 않는다.
  낙하 노트의 y는 시간으로만 계산된다(`visualUtils.ts:36-38`). `totalWidth`는 흰건반만으로
  계산되므로 컨테이너 폭도 그대로다. 깨진 경로에는 x→MIDI 역변환(히트테스트)이 없어
  입력 처리가 깨질 지점도 없다.

- **2026-08-24 — 업로드 후 화면을 이탈하면 변환 결과가 영구히 유실된다. 큐잉되지 않는다.**
  사용자가 "화면을 이탈해도 백엔드가 큐잉되어 완료되는가"를 물어 코드로 추적한 결과, 답은
  **아니오**였다. 이슈 [#55](https://github.com/landfill/ClairKeys/issues/55)로 등록.

  결정적 지점: `src/app/api/omr/status/[jobId]/route.ts`는 상태 중계만 하지 않고 `completed`를
  관측한 **그 요청 안에서** `/result`를 가져와 Supabase에 저장한다(`maxDuration = 60`의 이유).
  그리고 그 요청을 부르는 주체는 브라우저뿐이다 — `OMRProcessingStatus.tsx:55`의
  `setInterval(..., 5000)`과 `:127`의 `clearInterval`. 언마운트되면 폴링이 멈추고,
  **저장 코드는 실행될 기회 자체가 없다.**

  그 결과 VM은 변환을 끝까지 완료하고 결과를 `app.py:91`의 `processing_jobs` 메모리에 든 채
  서 있게 되며(D-011로 서비스는 저장 자격증명이 없다), Supabase에는 아무것도 저장되지 않고
  DB 행은 `processing`에 영구히 남는다.

  **복구 경로가 없음을 세 군데에서 확인했다**: `vercel.json`에 cron 정의 없음;
  `backgroundProcessor.ts`는 `/api/processing/*` 전용이고 OMR 업로드 경로가 참조하지 않으며
  큐도 인메모리 `Map`이다; `jobs` prop은 `upload/page.tsx:16`의 `useState`라 새로고침에 사라지고
  `processingStatus`를 읽어 진행 중 목록을 보여주는 UI는 코드 전체에 없다.

  **이건 D-011의 대가다.** 서비스가 저장 자격증명을 갖지 않는 결정은 옳지만, 저장 주체를
  Vercel로 옮긴 순간 저장 트리거가 브라우저 폴링이 되었다. 고치는 방향은 D-011을 되돌리는 게
  아니라 트리거를 브라우저에서 떼는 것이다 — #55에 두 안(VM→Vercel webhook / Vercel cron으로
  미완료 행 훑기)을 적어 두었고, 둘은 배타적이지 않다.

  부수 발견: README 시퀀스 다이어그램의 `3초 간격 폴링`은 오기다. 실제는 5초
  (3000ms는 중복 호출 방지 가드). #55에서 함께 정정한다.

- **2026-08-24 — #50과 #51은 한 덩어리로 기억되지만 서로 다른 것을 고쳤고, 그 혼동이 실제로
  일어났다.** 사용자가 "전일 작업한 OCR은 메트로놈 표기 숫자를 인식하는 것"이라고 이해하고
  있었다. 파일 목록으로 확인한 실제 범위는 반대다: **#50은 `Dockerfile.audiveris`의
  traineddata 교체뿐**(메트로놈 관련 코드 없음, OCR 전반), **#51은 `converter.py`·`app.py`·
  업로드 폼의 빠르기 계약**(OCR 아님). 그리고 OCR 복구 후에도 `<metronome>`은 0개였으므로
  **인쇄된 메트로놈 표기는 지금도 인식되지 않는다** — #51의 사용자 입력 필드가 존재하는 이유가
  그것이다. 현재 `tempoSource`는 `user` 또는 `unknown`뿐이다.

- **2026-08-24 — OCR 복구가 사용자에게 보이는 것을 바꿨다는 증거는 아직 없다.** 표시 경로를
  추적했다: `src/app/sheet/[id]/page.tsx`는 DB `SheetMusic` 행(=사용자 입력)을 렌더하고,
  악보 유래 값이 표면화될 수 있는 곳은 `AnimationPlayer.tsx`의 헤더(애니메이션 JSON) 하나뿐이다.
  그 JSON의 `title`/`composer`를 만드는 `_extract_metadata`는 `<work-title>`·`<creator>`를
  찾는데 그 둘은 관측된 적이 없다(아래 2026-08-24 항목). **따라서 #49 복구의 사용자 가시
  효과는 현재 0으로 간주해야 한다.** PR #54가 README를 이 사실로 시작하도록 고쳤다.

- **2026-08-24 — OCR이 읽은 제목이 JSON에 도달하는지는 아무도 확인한 적이 없다.** README에
  OCR 절을 쓰다가 드러난 빈틈이다. 2026-08-23 실측이 관측한 요소는 `<credit-words>` 뿐인데
  (`'Piano Solo - Love Affair'`, `'Ennio Morricone'` 등), `omr/converter.py`의
  `_extract_metadata`가 찾는 것은 `<work-title>`과 `<creator[@type="composer"]>`다.
  Audiveris가 후자도 함께 채우는지는 이 저장소 어디에도 근거가 없다.

  **채우지 않는다면 OCR 복구(#49)는 사용자에게 아무 차이도 만들지 않는다** — 제목·작곡가는
  계속 업로드 폼의 입력값이 쓰이고, 겉보기 동작은 OCR이 죽어 있던 때와 구별되지 않는다.
  #49를 숨겼던 바로 그 은폐 구조가 그대로 남아 있는 셈이다.

  확인 방법은 간단하다: VM에서 `love-affair.pdf`를 다시 변환해 나온 `.mxl`에
  `<work-title>`·`<creator>`가 있는지 보면 된다. README(PR #53)는 어느 쪽으로도 단정하지
  않고 열린 질문으로 적어 두었으므로, 확인되면 그 자리를 답으로 교체한다.

- **2026-08-23 — OCR has never worked, and finding that took a real score to see.** The user
  supplied `Love_Affair_Piano_Solo.pdf`, which prints `Adagio ♩ = 60` above the first system — and
  ♩=60 against the 120 default is exactly the doubling they reported. The file converts cleanly
  otherwise (2 sheets, 2480×3507, interline 20–21), so issue #46 is not involved. Yet the MusicXML
  contained **no `<metronome>`, no `<sound tempo>`, and no `<words>` at all**.

  No text at all was the tell. Every sheet logs
  `Could not initialize TessBaseAPI languages: eng in legacy mode` followed by `No OCR'd lines`:
  Ubuntu's `tesseract-ocr-eng` ships a **4.1 MB LSTM-only** `eng.traineddata` while Audiveris
  initialises Tesseract in **legacy mode**, and `TesseractOrder` exposes no constant to change the
  engine mode. Pointing `TESSDATA_PREFIX` at the 23.5 MB legacy-capable file from
  `tesseract-ocr/tessdata` removed both messages and read the printed credits correctly —
  `Piano Solo - Love Affair`, `Love Affair OST`, `Ennio Morricone`, `trans. Jose Hernandez`. Filed
  as issue [#49](https://github.com/landfill/ClairKeys/issues/49) with the demonstrated fix.

  **This was invisible because the upload form asks for title and composer.** Those user-typed
  values stood in for everything OCR should have supplied, so a completely dead text pipeline
  looked like a working one.

  **Fixing OCR does not fix the tempo.** With OCR restored, `<metronome>` is still 0 and neither
  `Adagio` nor `60` appears anywhere, though measure numbers 10/13/16/19/25/28 were read. Enumerating
  every `ProcessingSwitch` found no metronome toggle. So issue #48's cause is confirmed as "the mark
  is never recognised", with an unexplained second layer beneath the OCR failure — which makes the
  user's own proposal, passing a tempo as a conversion parameter, the path that does not depend on
  solving it.

- **2026-08-23 — a second tempo defect, demonstrated: `beat-unit` is discarded, so a marking in
  anything but quarter notes is off by that ratio.** The user reported that their test scores
  mostly *do* carry a printed tempo and playback is still about twice too fast, which rules out
  "no marking" as the whole story. `converter.py:391-402` reads only the number in `<per-minute>`
  and never reads `<beat-unit>`, while `converter.py:183` assumes that number is quarter-notes per
  minute. In a `<metronome>` the number and the note are a pair; reading half of it makes the other
  half a guess.

  Three musically identical tempos injected into the Bach MusicXML and re-converted:

  | MusicXML | printed as | `tempo` | sixteenth | total |
  |---|---|---|---|---|
  | `quarter` + `60` | ♩=60 | 60 | 0.2500 s | **2:27** — correct |
  | `eighth` + `120` | ♪=120 | 120 | 0.1250 s | **1:13** — twice too fast |
  | `half` + `30` | 𝅗𝅥=30 | 30 | 0.5000 s | **4:55** — twice too slow |

  All three should be 2:27. The `♪=120` row reproduces the user's symptom exactly, and
  eighth-note markings are common in compound metres.

  **Not yet settled which defect the user is hitting.** Both score crops they showed use ♩, which
  would make `beat-unit=quarter` and leave "the marking was never recognised" as the cause instead.
  One observation separates them: `AnimationPlayer.tsx:267` displays `{tempo} BPM`, so a screen
  reading of 120 means recognition failed, while a reading that matches the print means the
  beat-unit ratio is the culprit. The `beat-unit` conversion is needed either way.

- **2026-08-23 — the default playback tempo is fabricated, and the screen presents it as read from
  the score.** The user reported that playback at speed `1.0` is too fast and that 0.5–0.75 matches
  the score. `converter.py:391-402` returns a hardcoded **120** whenever the MusicXML carries no
  `<per-minute>`, and the Bach MusicXML carries no tempo information at all — no `<sound tempo>`,
  no `<metronome>`, no tempo words. The arithmetic matches the user's ear exactly: at 120 the piece
  runs 1:14, at 0.5× it runs 2:28, and this prelude is normally played in 2:00–2:30. The real tempo
  is around ♩=60, so the default is precisely twice too fast.

  ~~**This is structural, not specific to one file.** Audiveris can only recover a tempo that is
  printed on the page, and most engraved classical scores print none~~ — **retracted the same day.**
  The user pointed out that modern engraved and arranged scores normally do print `♩ = N`, and the
  jar bears that out: Audiveris 5.11.0 carries `MetronomeInter`, `BeatUnitInter` and a
  `TextRole.Metronome`, and `PartwiseBuilder` calls `setBeatUnit`/`setPerMinute`, so a recognised
  marking is exported as `<metronome><per-minute>`. No `ProcessingSwitch` gates it. **The path is
  already wired end to end**, and `_extract_tempo` already reads `<per-minute>` — Bach WTK1 Prelude
  1 is simply a score with no marking, which is why it looked like the general case.

  Not yet proven: that OCR actually reads a real printed marking. That needs one score with a
  printed `♩ = N` put through the pipeline; if the JSON's `tempo` matches the print, option (a)
  needs no work at all.

  **Interacts with issue #46**: a small-page PDF is discarded at `SCALE`, before any text
  recognition runs — so a printed marking on such a file could never be read. Fixing #46 may
  resolve part of this one.

  `AnimationPlayer.tsx:267` then renders `{composer} • {timeSignature} • {tempo} BPM`. Two of those
  three were read from the score and the third was invented, in the same typography, with nothing
  distinguishing them. That is the shape of defect this project has repeatedly removed (D-001,
  D-010) — milder than a demo melody, but the same kind.

  **Measured, not inferred: this is a conversion-time fault and the player is not involved.**
  The stored JSON bakes a sixteenth note at 0.125 s — exactly 120 BPM. The player adds nothing:
  `animationEngine.ts:23` defaults `speed: 1.0`, `AnimationPlayer.tsx:27` initialises the control
  at 1.0, and `playbackClock.ts:24` advances song time at wall-clock rate when `tempoScale` is 1.
  (`AnimationPlayer.tsx:114`, which sets speed from an event's `tempo`, is inside the practice-mode
  tempo-progression handler and never runs on the default path.) Injecting `<sound tempo="60"/>`
  into the MusicXML and re-converting produced the identical 514 notes with every time exactly
  doubled — 0.250 s per sixteenth, 2:27 total, inside the conventional range for this prelude.

  That experiment also turned a suspicion into a fact: **the `tempo` field stayed 120 while the
  actual times honoured 60.** `_extract_tempo` reads only `<per-minute>`; `_build_tempo_timeline`
  reads `<sound[@tempo]>`. So a score carrying `<sound tempo>` plays at the right speed while the
  screen states the wrong BPM. That fix is needed independently of whichever option is chosen for
  the default.

  The user has accepted re-converting stored scores (2026-08-23), which removes the constraint that
  made option C (rescale at playback, changing the D-009 seconds contract) attractive. Filed as
  issue [#48](https://github.com/landfill/ClairKeys/issues/48); options A, B and D remain open and
  none is chosen.

- **2026-08-23 — the first two real uploads after go-live failed for two different reasons, and
  both are now filed with reproductions.** Neither is a deployment fault: Vercel reached the
  service and authenticated both times.
  - A Korean-language document (fonts `Noto-Sans-CJK-KR` ×3, `-JP`) failed at `SCALE` with
    `No regularly spaced lines found` — there is no staff on the page. Correct behaviour.
  - A real 4-page arrangement failed with `too low interline value of 9 pixels` → `Sheet removed`
    → the whole book abandoned. **Audiveris's advice, "try 300 DPI", is misleading: it already
    renders at 300.** The controlling constant is
    `org.audiveris.omr.image.ImageLoading.pdfResolution`, default 300, and the same A4 fixture
    loads at 2480×3507 under it. So 1064×1521 means the *page* is small — 3.55″ × 5.07″, about A6
    — and 300 DPI over that geometry yields a 9-pixel interline. Filed as issue
    [#46](https://github.com/landfill/ClairKeys/issues/46).

  **The reproduction needs no special file.** Lowering `pdfResolution` on the existing A4 fixture
  reproduces it exactly: 100/120/150 all give `Sheet removed` (interline 7/8/10), 180 and above
  succeed. The failure threshold sits between 150 and 180, and the user's file at interline 9 is
  inside it. Issue #46 carries the measurements and three options; none is chosen.

  Also worth knowing: Audiveris **abandons the whole book if any one sheet is invalid**
  (`Could not export since transcription did not complete successfully`). Four pages failed here,
  but one would have been enough.

- **2026-08-23 — a failed upload shows the user a Java stack trace.** `omr-service/omr/audiveris.py:128-134`
  appends the entire Audiveris stdout to the exception, which becomes the job message and reaches
  the UI — over 200 lines in the observed case. The irony is that Audiveris states the cause in one
  plain sentence and this buries it. Filed as issue
  [#47](https://github.com/landfill/ClairKeys/issues/47). This is the opposite failure from the one
  this project kept fixing: not a failure disguised as success, but a failure disclosed in a form
  nobody can read.

- **2026-08-23 — upload works end to end in production, and the first real score exposed the next
  problem.** The user set `OMR_SERVICE_URL` and `OMR_SHARED_SECRET`, redeployed, uploaded a score,
  and confirmed the animation plays. Service logs show Vercel's AWS egress calling `/process` and
  `/status` with **zero 401/403**. This is the first time the Next.js half of D-011 has run against
  real Supabase rather than Jest mocks, and the first time `main` could talk to the service at all
  — before PRs #41/#42 merged it sent no auth header and read an `animation_data_url` the service
  no longer returns.

  **The rhythm does not match the score in places, and the cause is recognition, not conversion.**
  Audiveris was run directly on the VM to preserve the intermediate MusicXML, which turns out to be
  wrong before the converter ever sees it: **10 of 35 measures have lengths impossible in 4/4** —
  measures 1, 2, 4, 5, 6 and 19 advance 24 divisions where 16 is a full measure, 21/23/28 advance
  15, and 25 advances 18. A voice length of 24 is a measure and a half. WTK1 Prelude 1 is
  structurally identical across measures 1–34, so 29 clean measures beside 6 broken ones is a
  recognition failure, not a rule or edition difference — a rule problem would break all 35 the
  same way.

  The converter is not the cause. The 63-note gap between the MusicXML (577) and the JSON (514) is
  **exactly the 63 tie stops**, matching per voice (voice 5: 62, voice 7: 1) — merging tied notes
  into one sustained note is what PR #24 built and what a player actually does. Filed as issue
  [#44](https://github.com/landfill/ClairKeys/issues/44), which also records one thing genuinely
  untested: how the converter handles a measure whose voices disagree. `omr/cli.py` reproduces the
  service's exact output locally (514 notes, 73.875 s) from the preserved MusicXML.

- **2026-08-23 — PR #42 is verified against a live OMR service on the VM, and one of its own
  claims turned out to be false.** Built `clairkeys-omr:pr42` from `dcc946a` on the VM and drove
  the Bach WTK1 Prelude 1 PDF through `/process` → `/status` → `/result`. Three of PR #42's four
  "Not verified" items are now evidence: `/result` returns the payload (200, 45,580 bytes, 514
  notes — the same count as the 2026-08-21 run, so the conversion is unchanged), the shared secret
  gates all three endpoints at 401 while `/health` stays open, and **a job completes with no
  storage credentials present** where the identical job on the pre-change image failed at 80%.
  The gate is provable by comparison rather than assertion: the same unauthenticated `POST
  /process` returns **422 on the old image and 401 on the new one** — 422 meaning the old service
  accepted the request and only missed the multipart fields. The service wrote nothing at all
  (`find /data -type f` → 0 files).

  **The fourth item was wrong, not merely untested.** PR #42's review log said a restart between
  completion and collection "fails the row, which is correct but untested". After `podman restart`,
  `/status` returns 404, and `src/app/api/omr/status/[jobId]/route.ts:88-93` returns 502 for every
  non-ok status **without writing to the database** — so the row stays at `processing` with its
  `omrJobId` forever, which is exactly the stranded-row shape PR #41 exists to remove. It is not a
  regression PR #42 introduces (the pre-change service also lost in-memory jobs on restart); what
  is new is the claim that it is handled. The route never distinguishes "unreachable, poll again"
  from "the service answered and this job is gone" — only the second is safe to mark failed. There
  is no systemd unit, so a VM reboot does this to every in-flight job at once.
  Record: `docs/recovery/validation/2026-08-23-pr42-vm-verification.md`.

  **Fixed the same day in PR #41 at `1750ec5`, at the user's direction** — removing the stranded
  row is what #41 is for; #42 was only the run that exposed the second route into it. A 404 from
  `/status` now fails the row; 5xx, 401, 503, and an unreachable service leave the stored status
  untouched, because those are an operator mid-configuration rather than a lost job. The 404
  response is 200 with `status: 'failed'` so the poller takes the branch it already has for a
  service-reported failure instead of throwing a generic error. 7 regression tests written first,
  3 of which fail against the pre-change code; full suite 44 suites / 399 tests, 0 failures.
  #42's branch merged #41 cleanly at `f540752` and runs 45 suites / 405 tests, 0 failures.

- **2026-08-23 — correction: this machine does have an SSH path to the VM, and the clone is not
  where the resume steps said.** The 2026-08-23 note below claimed `~/.ssh` holds no NAVER key and
  `known_hosts` no matching entry. Both are wrong. `~/.ssh/ncp-aitestbed-user-555.pem` is an NCP
  key (the prefix is `ncp-`, not `naver-`, which is why a name search missed it), `known_hosts`
  contains `101.79.16.73`, port 22 is reachable, and
  `ssh -i ~/.ssh/ncp-aitestbed-user-555.pem root@101.79.16.73` returns
  `vm-naver-20260820145930` / `root` / `Rocky Linux release 8.8`. The user can still drive the VM
  themselves, but an agent on this machine is not blocked from it.

  The clone on the VM is at **`/opt/clairkeys`**, not `~/ClairKeys` — the step 1 command below
  checked the wrong path and would have reported the repository absent. It sits at `43a5b14` with
  three uncommitted modifications (`Dockerfile.audiveris`, `app.py`, `omr/storage.py`) whose
  working-tree blob hashes are **byte-identical to merged `main`**; they are the source of PRs
  #37/#38 and carry nothing unmerged. They were left untouched anyway — PR #42 was checked out into
  a separate worktree at `/opt/clairkeys-pr42`.

- **2026-08-23 — the OMR service is not reachable from Vercel, and no step in the resume list
  covers making it so.** The `contract-fix` container has been up for 45 hours bound to
  **`127.0.0.1:8000`** — loopback only. The VM has no nginx, no `/etc/letsencrypt`, no systemd unit
  for the service, nothing listening on 80 or 443, and only a bare public IP with no domain.
  Step 4 below says to set `OMR_SERVICE_URL` to "the VM's address", but there is no address that
  answers. Between verifying #42 and setting the Vercel variables there is a missing step —
  **expose the service** — and it is a decision, not a task: Let's Encrypt needs a domain the VM
  does not have, and plain HTTP would carry the shared secret across the internet in the clear.
  D-008 (hosting) is still `Proposed` and does not cover this. Per `AGENTS.md` a new
  `DECISIONS.md` entry is required before implementing whichever option is chosen.

- **2026-08-23 — the production upload symptom is fully explained, and the `animation-data` bucket
  exists after all.** The user reported that uploading on `clairkeys.vercel.app` created a
  `SheetMusic` row, returned `Internal server error`, and stored no file. All three are the
  undeployed OMR service: `curl https://clairkeys-omr.fly.dev/health` returns
  `curl: (35) schannel: failed to receive handshake`, so `fetch` throws rather than returning a
  non-ok response, which is why the message was the outer `catch`'s generic 500 and not
  `Failed to start OMR processing`. PR #41 makes that failure honest and stops it orphaning a row
  per attempt. **Correction to the 2026-08-21 record:** `GET /storage/v1/bucket` returning `[]` was
  the *anon key lacking list permission*, not a missing bucket. With `SUPABASE_SERVICE_ROLE_KEY`
  the same call returns all three buckets, and `animation-data` is present (public, 10 MB limit,
  `application/json` only). D-011's service-role upload therefore has a bucket to write to.
- **2026-08-23 — VM work will be driven by the user at their own terminal.** ~~this machine has no
  SSH path to it (`~/.ssh` holds no NAVER key and `known_hosts` has no matching entry)~~
  **— retracted the same day; see the correction entry above. The key is `ncp-aitestbed-user-555.pem`
  and root SSH works from this machine.** The user does have direct terminal access to the NAVER VM
  and can run deployment commands themselves. Vercel environment variables (`OMR_SERVICE_URL`, the shared secret) remain user-only in
  either case — the same shape as the 2026-07 Production Branch Tracking problem, and **production
  upload stays broken until they are set**, no matter what lands in this repository.

- **2026-08-21 — PRs #39, #37, and #38 are merged and `main` is fully green.** Merged in that order
  with the user's explicit approval: #39 first because its `Security Audit` fix was the only failing
  check on the other two, then #37 and #38 after their branches were updated from `main`. All
  post-merge checks on `3208488` report success — `Security Audit`, `Run Tests`, `E2E Tests`,
  `Lint`, `Post-merge build`, `Post-merge tests`. Every work branch tip, local and remote, is
  contained in `main` with 0 unique commits. PR #40 then merged at `fb9f45b`, also fully green,
  which cleared the last uncommitted change and allowed cleanup to finish. **All work branches are
  now deleted**, local and remote, after re-confirming 0 unique commits against `main` on every
  ref. That sweep also removed `codex/p1-omr-audiveris-runtime`, PR #36's branch, which still
  existed locally on this machine despite the 2026-08-02 note recording it as already gone — it was
  fully contained in `main`. `git branch -a` now lists only `main` and `origin/main`, and
  `git status --short` is empty.
- **2026-08-21 — the anon key cannot write to Supabase Storage, so the OMR service could never have
  stored a result.** With the project restored, a direct probe of
  `POST /storage/v1/object/animation-data/…` with `SUPABASE_ANON_KEY` returned **403 `new row
  violates row-level security policy`**, and `GET /storage/v1/bucket` returned `[]`. `storage.py:21`
  reads exactly that key, so the upload path was blocked by policy, not by configuration. This is
  the concealment chain's first link, and the rest is in code:
  `src/app/api/omr/status/[jobId]/route.ts:77-82` writes `omrStatus.result.animation_data_url`
  straight into `animationDataUrl` and **overwrites the user's title** with `result.title`, which
  before PR #38 was the PDF filename. Without PR #38 a deployment would have produced a successful
  upload, a `file://` URL persisted to the database, and a title replaced by a filename. PR #38
  breaks that at the first link — the job now fails.
  **Decision taken with the user (2026-08-21): the OMR service will not hold write credentials.**
  It will return the animation JSON and the Next.js side will store it with the
  `SUPABASE_SERVICE_ROLE_KEY` it already has, keeping the powerful key on Vercel. That needs a
  `DECISIONS.md` entry (D-011) committed in the same PR as its code, and it must land **after**
  #37/#38 to avoid re-writing `storage.py` twice.
- **2026-08-21 — both service defects are fixed and verified on the VM (PR #38).** Regression-first:
  `tests/test_service_contract.py` was written before the fix and aborted at import against the old
  code. After the fix, 18 tests pass. On the VM the same PDF binds all four form fields
  (`{'title': 'WTK1 Prelude 1', 'composer': 'J.S. Bach', 'user_id': 'test-user', 'sheet_music_id': '42'}`),
  and with `ENVIRONMENT=production` and no credentials the job now reaches `failed` at progress 80
  quoting the guard, writing no fallback file — where the identical run previously returned
  `completed`. An `ENVIRONMENT=development` control still completes with the `file://` URL, so the
  fallback is isolated rather than removed, matching `assertDemoGenerationAllowed()`. **A real
  Supabase upload is still unverified**: the project's Storage host returned `NXDOMAIN` from two
  independent networks during this work and the user reported it was down and being restored. Note
  also that **`omr-service/tests/*.py` is run by no CI workflow**, so these tests and PR #37's
  protect nothing automatically. Evidence:
  `docs/recovery/validation/2026-08-21-omr-service-contract-fixes-verified.md`.
- **2026-08-21 — the OMR service runs, and starting it exposed two defects that report success for
  work that did not happen.** `POST /process` accepted a real 2-page PDF and reached `completed` in
  about 25 seconds, using the host `/data` mount for scratch and invoking the packaged launcher.
  (a) `app.py:71-78` declares `title`, `composer`, and `user_id` without `Form(...)`, so FastAPI
  binds them as **query** parameters and silently drops the multipart fields
  `src/app/api/omr/upload/route.ts:77-82` actually sends — measured against a query-string control
  that returned all three correctly. `sheet_music_id` is not declared at all. A score is therefore
  stored under its PDF filename rather than the user's title. (b) `omr/storage.py` falls back to
  `_save_local_fallback` on missing credentials, on a non-2xx upload, **and on any exception**, and
  the job still reports `"Processing completed successfully"` with a `file:///tmp/results/…` URL
  that no browser can fetch. That is `AGENTS.md` § "금지되는 완료 상태" verbatim, and it is not a
  container artifact — an unreachable Supabase in production takes the same path. **Do not expose
  the service until (b) is fixed**: shipping it would replace P1-A's honest failure with a
  successful-looking, unplayable score. Neither defect has a fix yet and neither belongs in PR #37.
  Evidence: `docs/recovery/validation/2026-08-21-omr-service-first-run-defects.md`.
- **2026-08-21 — the OMR image was built and run for the first time, on a NAVER Cloud VM, and a real
  PDF converted end to end through the conversion pipeline.** This is the runtime evidence issue #22
  has been waiting for, and producing it found two defects no static check in this repository could
  see. (a) The official 5.11.0 `.deb`'s postinst runs `xdg-desktop-menu`/`xdg-mime`, which exit 3 in
  a minimal image and fail `dpkg --configure` for the whole package. (b) `libgtk-3-0` is absent from
  the `.deb`'s `Depends`, yet `WellKnowns.<clinit>` loads gtk-3 through JNA before any argument is
  parsed — so an image built from the previous Dockerfile would have failed **every** conversion in
  production while passing every check here, and `-batch` would not have avoided it. In both failure
  modes the payload unpacks and `test -x` on the launcher still passes. Fixed in PR #37, which also
  makes the build invoke `Audiveris -version`. Evidence: image `clairkeys-omr:5.11.0` (911 MB) built
  on the VM, in-build `-version` reporting Audiveris 5.11.0 / OpenJDK 25.0.3 / Tesseract 5.5.2, a
  Mutopia Bach WTK1 Prelude 1 PDF exported to `.mxl` and converted through `omr.cli` to 514 notes of
  animation JSON, and 11 passing Python tests. **Recognition accuracy is not claimed** — that PDF has
  no ground truth in `fixtures/`, so `compareAnimationData` cannot score it, and one sixteenth-note
  position in the opening bar looks empty. The FastAPI service, Supabase upload, and every Next.js
  end-to-end path remain unexercised, and nothing is deployed or exposed. Full record:
  `docs/recovery/validation/2026-08-21-issue-22-naver-vm-omr-runtime-proof.md`.
- PR #36 merged at `c8764ec` from verified head `4613e08`: Audiveris 5.11.0's Ubuntu package was downloaded and its
  release digest matched SHA-256
  `ae714594f40e54b1a4951fc3f914f08ae38fe5d07b7f2283b1a904fdb6e0a318`. The package includes its
  own Java 25 runtime and official `/opt/audiveris/bin/Audiveris` launcher but no OCR traineddata.
  The branch now accepts `.mxl`, passes a folder to `-output`, uses only the native processor,
  provisions English traineddata, serializes 3GB JVMs on a provisional 4GB VM, kills/reaps timed
  out or cancelled subprocesses, and rejects multiple `.mxl` results rather than storing a partial
  score. 42 Jest suites / 389 tests, 9 Python tests, py_compile, TypeScript, lint, and production
  build pass. PR CI, merge-commit required checks, and post-merge checks are green. Vercel
  Production deployment `5602694131` succeeded for the Next.js application. CodeRabbit's valid timeout findings were
  fixed; it withdrew its launcher-config objection after package evidence, while final independent
  review found zero actionable issues. **Not verified:** Docker build/run, real PDF conversion,
  Fly validation/deployment, production end-to-end. Evidence:
  `docs/recovery/validation/2026-07-26-issue-22-audiveris-runtime-repair.md`; review log:
  `docs/recovery/reviews/PR-36.md`.
- PR #26 local verification on `e175314`: 39 Jest suites / 362 tests passed; `npx tsc --noEmit`, repository lint, and production build passed; Chromium + Mobile Chrome Playwright smoke checks passed 6/6. Firefox/WebKit local projects could not run because their Playwright browser binaries are not installed. Authenticated live `/sheet/2` playback remains unverified. Full evidence: `docs/recovery/validation/2026-07-22-p0c-shared-clock-and-drift.md`; review log: `docs/recovery/reviews/PR-26.md`.
- PR #26 CI verification on `e175314`: `Run Tests`, both `E2E Tests`, `Lint`, `Lint and Type Check`, `Unit Tests`, `Security Audit`, `Security Scan`, `Build Check`, `Accessibility Check`, `CodeQL`, `All Checks Complete`, PR summary, and Vercel all passed. No actionable GitHub review was present at the final 2026-07-22 check. The PR merged at `157c3b4`; post-merge Tests run `29898010765` also passed all jobs.
- P0-D is `DONE`. `docs/recovery/phases/P0-D-quality-gates.md` records all four completion criteria met.
- Issue [#7](https://github.com/landfill/ClairKeys/issues/7) is `CLOSED`: PR #12 replaced the aspirational `piano-player.spec.ts`/`sheet-music-workflow.spec.ts` (dashboard/auth fixtures absent from the product) with `e2e/application-smoke.spec.ts`, 15 cross-browser public-route smoke checks. The `E2E Tests` check has passed on every subsequent `main` HEAD checked, including PR #12's own merge commit `271f4c6`.
- Issue [#9](https://github.com/landfill/ClairKeys/issues/9) is `CLOSED`: `main` branch protection is configured with required status checks `Lint`, `Security Audit`, `Run Tests`, `E2E Tests` (`strict: false`, `enforce_admins: false`). `gh api repos/landfill/ClairKeys/branches/main/protection` confirms this (previously `404 Branch not protected`). The agent's write attempt was blocked by the local auto-mode classifier as a repository-admin action; the user applied the payload directly via `gh api -X PUT`.
- Whether to additionally require pull requests / forbid direct pushes to `main` (issue #9's fourth checklist item) remains an explicit open decision, not yet made.
- PR #14 (P0-D closeout docs) and PR #15 (agent contract consolidation: sibling-project practices adopted into `AGENTS.md`/`WORKFLOW.md`/`LORE_COMMIT_PROTOCOL.md`, `CLAUDE.md` reduced to a pointer) were both merged with the user's explicit approval, checked out clean at merge time, and had their remote/local work branches deleted only after confirming both tips were included in updated `main`.
- Full evidence: `docs/recovery/validation/2026-07-20-p0d-branch-protection-and-issue-closeout.md`; PR review logs at `docs/recovery/reviews/PR-14.md` and `docs/recovery/reviews/PR-15.md`.
- RESOLVED (2026-07-25): **production now serves the P0-C fix and the user confirmed the 10-second cutoff is gone.** The user set the Vercel Production Branch and promoted a build. Agent re-verification: all 13 chunks served by `https://clairkeys.vercel.app/sheet/2` contain no `>10||` cap, and `AudioContext resume failed` / `Web Audio initialization failed` (PR #26 markers) are present in `1280-8b2efdae58a9ab51.js`. Production is running `main`, not the unmerged PR #27 branch — four of the 13 chunk hashes differ from the local `next@15.5.21` branch build. This also closes the authenticated live `/sheet/2` playback evidence gap open since PR #26. (That first restoration was a manual promote; automatic deployment was fixed separately later the same day — see Next actions 2.) Evidence: `docs/recovery/validation/2026-07-24-production-serves-pre-p0-bundle.md` § RESOLVED.
- HISTORICAL (2026-07-24, superseded by the entry above; kept because it explains how the gap went unnoticed): **production served a pre-P0 bundle, so issue #18 still reproduced for users.** The user reported audio stopping after ~10s on the deployed site while notes keep falling. The chunk served by `https://clairkeys.vercel.app/sheet/2` (`/_next/static/chunks/8327-78f4e1b75f62e239.js`) still contains the one-shot scheduler's `if(t>10||r<0)continue` cap and lacks every PR #26 marker, so it predates `7d0774a` (2026-07-21). Both deployment paths are broken: Vercel's Git integration has produced **only `Preview` deployments** for `main` (41 of them; zero Production-environment deployments in the last 100 records), consistent with the Vercel project's Production Branch never being moved off `master` after the DOC-1 rename `643ce71` (2026-07-19); and `deploy.yml`'s `Deploy to production` fails on every commit because `secrets.VERCEL_TOKEN` is absent, with `Run database migrations` failing on an empty `DATABASE_URL` (Prisma `P1012`). Fixing this needs Vercel/GitHub admin access the agent does not have. Full evidence: `docs/recovery/validation/2026-07-24-production-serves-pre-p0-bundle.md`.
- RESOLVED (2026-07-25) by PR #27; kept because the failure mode recurs. **The `Security Audit` required check went red again on `main`.** Direct handoff commit `f39fbb6` produced `Security Audit -> failure` while `Run Tests`, `Lint`, `E2E Tests`, `Build application`, and `Test before deploy` all passed. No dependency changed between `1e3d515` (green on 2026-07-22) and `f39fbb6`; `npm audit --audit-level high` (`.github/workflows/test.yml:173`, `.github/workflows/pr-checks.yml:213`) is time-dependent, so newly published advisories flipped it. Local `npm audit` reports 4 vulnerabilities: `next-auth <=4.24.14` **critical** (GHSA-xmf8-cvqr-rfgj uncaught exception on malformed Bearer headers, GHSA-7rqj-j65f-68wh homoglyph `@` bypass in the email normalizer, GHSA-x445-f3h2-j279 state/nonce/PKCE cookies not bound to the issuing provider), `postcss <=8.5.11` high via `next` (GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q), and `uuid <11.1.1` moderate. `next-auth`/`uuid` are fixable in-range via `npm audit fix`; `postcss` reports a fix only via `--force`, which would move `next` to `15.5.21`, outside the stated range — the same shape as PR #25's `sharp` problem, so an npm `overrides` pin is the likely bounded remedy. Because `Security Audit` is a required status check, this blocks the merge button for every future PR until resolved. **Addressed by open PR #27** (`next-auth` →4.24.15, `next` →15.5.21 patch bump, `postcss` overrides pin ≥8.5.12), which takes the local tree to 0 vulnerabilities; `uuid` was deliberately left alone as moderate-only and cleared incidentally. This is the second occurrence of the PR #25 failure mode and is a property of the time-dependent gate, not of any one dependency — expect it again.
- CORRECTED (2026-07-25): the 2026-07-24 claim that `public/sw.js` can serve a returning visitor the pre-fix JavaScript was **wrong**, and is retracted. `/_next/static/**` URLs are content-hashed, so a new build produces new URLs, every one of which is a cache miss; the stale entries are never requested again. `isExpired()` also returns `true` when `sw-cached-at` is absent, so the install-time `cache.addAll(['/', '/manifest.json'])` entries do not pin anything, and HTML is network-first regardless. The fixed `CACHE_NAME = 'clairkeys-v1'` does make the activate handler's cache eviction dead code, but bundle freshness was never resting on it. What remains real is narrower: non-hashed files under `public/` (`favicon.png`, `icon-*.png`, `icon-*.svg`, …) match the `\.(js|css|woff|…|png|svg)$` rule, which is cache-first with a one-year `maxAge` and stable URLs, so a changed icon can stay stale for up to a year. Low impact, still unfiled.
- CLEANUP COMPLETE: the user authorized deletion after confirming the untracked `fix_*.js` scripts, `ts_errors*.log`, disabled performance components, and Playwright `.last-run.json` were unreferenced local artifacts. All 16 files and their now-empty directories were removed. Local and remote `codex/p0-playback-sync-stages-4-5` refs were then deleted after both tips were re-confirmed in `main`; `git status --short` is clean.

## Resume here — 2026-08-27, 맥북으로 이어받는 세션: PR #59는 귀를 기다린다

사용자가 "필요한 설정이 모두 되어 있는 맥북에서 내일 PR을 검토하고 이어서 할 예정"이라고
말했다. 이 절은 그 세션을 위해 쓴다. 모든 작업은 커밋되고 푸시되어 있다.

### 상태

- **PR [#59](https://github.com/landfill/ClairKeys/pull/59)** `OPEN`, 브랜치
  `codex/p1a-piano-sample-timbre`, 커밋 `c8854ba`·`a341db2`. 악보 재생 음색을 합성에서
  녹음 샘플(Salamander Grand Piano V3, CC-BY 3.0)로 교체한다. **D-014** 기록.
- 상세 근거는 `docs/recovery/reviews/PR-59.md`에 다 있다. 먼저 읽어라.

### 먼저 해야 할 것 — 실제로 들어보기

이 변경의 유일한 미검증 부분이고, 개선 여부를 판단할 수 있는 건 사용자뿐이다.

가장 빠른 경로는 Vercel 프리뷰다 (로컬 실행 불필요, Vercel 로그인 필요):

    https://clairkeys-adbskt9zj-landfills-projects.vercel.app/test-finger

`/test-finger`는 인증 없이 `FallingNotesPlayer`를 띄우므로 악보 업로드나 로그인 없이
바로 재생해 볼 수 있다. 로컬로 보려면 `npm run dev` 후 같은 경로.

### 들을 때 살펴야 할 세 가지 — 전부 상수 하나씩이다

이 셋 외의 것이 이상하면 상수 조정이 아니라 설계 문제이니 먼저 의심해라.

1. **음량** — `SAMPLE_PEAK_GAIN` (`src/utils/pianoSamples.ts`, 현재 `0.73`). 피크는
   합성 경로와 정확히 맞춰놓았지만, 해머 타격음이 있는 녹음은 같은 피크의 합성음보다
   **크게 들린다**. 크면 낮춰라. 화면의 음량 슬라이더는 master gain이라 별개다.
2. **스테레오 폭** — 지금은 모노다. 얕거나 답답하면
   `CHANNELS=2 bash scripts/build-piano-samples.sh`로 재빌드하면 된다. 대가는 디코딩
   메모리 20.2MB → 약 40MB, 디스크 1.17MB → 약 2.3MB. **재빌드했으면
   `SAMPLE_SET_PEAK`을 빌드된 파일에서 다시 재고 `SAMPLE_PEAK_GAIN`을 다시 계산해라**
   — 모노로 접을 때 피크가 바뀐다(원본 -7.0 dB → 빌드 후 -7.7 dB).
3. **음 끝의 자연스러움** — `damperReleaseSec` (같은 파일, 저음 0.35초 → 고음 0.12초).
   짧으면 뚝 끊기고 길면 번진다.

### 병합 전에 반드시 해결해야 할 blocker

**GitHub Actions가 2026-08-24 이후 전혀 돌지 않는다.** PR #59의 4개 required check는
실행 자체가 없고, `main` 직접 푸시 `f93ebe0`의 check-runs도 비어 있다.
`actions/permissions`는 `enabled: true`고 워크플로우 4개 모두 `active`이므로 저장소
설정 문제는 아니다. 사용량·결제 한도가 흔한 원인이나 **확인된 것은 아니다** (현재
토큰에 `user` scope이 없어 billing API 조회 실패). 맥북에서는 GitHub 계정 설정을 직접
볼 수 있을 테니 거기서 확인하라.

이것 때문에 PR #59의 검증 근거는 전부 로컬과 헤드리스 브라우저 실측이고 호스팅 CI의
확인은 없다.

### 맥북에서 샘플을 재생성하려면

`scripts/build-piano-samples.sh`는 `curl`과 `ffmpeg`만 있으면 돌아간다
(`brew install ffmpeg`). 네트워크에서 원본을 받아 가공하므로 결과물은 결정적이다.
**샘플을 손으로 고치지 마라** — CC-BY 3.0이 변경 사실의 명시를 요구하고, 그 명세가
이 스크립트와 `public/samples/piano/LICENSE.txt`에 있다.

### 이어서 할 작업 (PR #59 병합 후)

사용자가 **두 경로 모두 통일**을 명시적으로 선택했다. 악보 재생은 끝났고, 화면
건반 클릭음이 남았다 — **별도 PR**로 넘겼다(목적이 다르고, Tone 모킹 200줄짜리
테스트 재작성이 따른다).

- 대상: `src/services/audioService.ts` (285줄, Tone.js `PolySynth` + **triangle 파형** —
  악보 재생보다 더 전자음에 가깝다). 도달 경로는 `useAudio.ts` →
  `PianoKeyboard`·`EnhancedPianoKeyboard`, 화면은 `/demo-animation`·`/test-piano`·
  `FullScreenPiano`뿐이다.
- 유지해야 할 공개 API: `playNote`·`releaseNote`·`playChord`·`releaseChord`·
  `stopAllNotes`·`setEnabled`·`updateSettings`·`getSettings`·`isReady`·`getContextState`·
  `dispose`와 `AudioSettings` 타입.
- 악보 경로와 달리 이쪽은 **길이를 모르는 상태로 누르고 뗄 때 뗀다**. note별로 voice를
  보관했다가 `releaseNote`에서 댐퍼 페이드를 건다.
- **이미 확인된 것**: `SimplePianoKeyboard`는 소리를 내지 않는 순수 시각 컴포넌트라,
  악보 화면과 건반 클릭 경로가 **같은 화면에 공존하지 않는다**. 따라서 AudioContext가
  둘이라 뱅크가 두 벌 생길 수 있다는 건 이론상의 이야기다. 다음 세션이 이걸 다시
  따지지 않아도 된다.
- `reverb`는 다시 구현하지 마라. `AudioSettings.tsx`는 `/test-piano`에서만
  렌더되므로 실사용 관객이 없다 — 적용되지 않는다고 적는 편이 낫다.
- `src/lib/audio/piano.ts`(`PianoAudio`, 33줄)를 import하는 곳이 없다. 그걸 지우면
  `tone` 의존성 자체를 떨굴 수 있지만, 그건 또 다른 PR이다.

### 이 변경과 무관하게 발견한 것 (아직 이슈 없음)

- **`next.config.ts`가 로드되지 않는다.** Next는 `next.config.js` → `.mjs` → `.ts`
  순서로 찾아 첫 번째에서 멈춘다(`next/dist/shared/lib/constants.js:356`). 이 저장소엔
  `.mjs`와 `.ts`가 둘 다 있고 `.mjs`가 이긴다. 따라서 `.ts`의 webpack 청크 분할,
  `tone` 별도 청크, 이미지 최적화, Supabase remotePattern이 전부 죽은 코드다.
  PR #59는 이걸 고치지 않고 `headers()`를 `.mjs`에 넣었다.
- **이 윈도우 머신의 사전 존재 테스트 실패 5건** — 맥북에선 사라질 가능성이 높다.
  `converterCorpus`·`converterTempoContract`·`omrRuntimeContract`는 Python `music21`
  미설치, `uploadPathInventory`는 Windows 절대경로, `prChecksWorkflow`는 CRLF 때문이다.
  맥북에서 전체 스위트를 돌려 실제 baseline을 다시 잡아라.


## Resume here — next session: what #48 and #49 did *not* fix

Written 2026-08-23 after both fixes were built, verified, merged, and cleaned up. The section
that sent this session is kept below as `Resume here — 2026-08-23 (issues #49 and #48, completed)`.

### State

- **Both merged.** #50 at `210a021`, #51 at `64753d9`. Issues #48 and #49 closed automatically.
- Work branches and the three Orca worktrees are deleted. `main` is clean, is the only
  worktree, and its post-merge checks passed.
- Nothing is in flight. The next session starts from a settled tree.

### What landed in each PR

**[#50](https://github.com/landfill/ClairKeys/pull/50) — issue #49, OCR.** `Dockerfile.audiveris`
fetches the legacy+LSTM `eng.traineddata` from `tesseract-ocr/tessdata` 4.1.0 and pins its
sha256, overwriting the LSTM-only file the Ubuntu package installs. Checksum re-verified
independently by download (23,466,654 bytes, `daa0c97d…`). `tesseract-ocr-eng` stays for the
directory and configuration it provides.

**[#51](https://github.com/landfill/ClairKeys/pull/51) — issue #48, tempo. Records D-013.**
Contract `1.0` → `1.1`, reader accepts both. `tempo` is nullable, joined by `tempoSource`
(`score`/`user`/`unknown`), `timingReferenceBpm` (what actually baked the seconds), and
`scoreTempo`. `<beat-unit>`/`<beat-unit-dot/>` convert to quarter BPM. `/process` takes a
`tempo` form field; the upload form's input is optional. The player prints four visibly
different things instead of one number.

### The two facts that decide whether these can be merged separately

1. **#51's two halves cannot be split.** The Python half alone fails `converterCorpus.test.ts`
   14/14 because the old reader rejects version 1.1; the TypeScript half alone still receives
   120 from the converter. They are one commit for that reason.
2. **#50 and #51 are genuinely independent** and touch disjoint files. Either order works.

### What to do, in order

1. **#48 is closed by #51, but the thing underneath it is not.** A printed metronome mark is
   still never recognised. With OCR restored (#50), `<metronome>` was **still 0** on the same
   score and neither `Adagio` nor `60` appeared anywhere, though measure numbers 10/13/16/19/25/28
   were read. Every `ProcessingSwitch` was enumerated; none governs metronome recognition.
   **The cause is unexplained.** `tempoSource: 'score'` has therefore never been observed
   end to end — only proven correct on hand-authored MusicXML. If that matters to the user,
   it needs a new issue; do not fold it into #48's history as though #51 addressed it.
2. **Re-conversion is required for anything already stored.** Note seconds are baked at
   conversion, so an old upload keeps its current speed no matter what these PRs do. Anyone
   testing the fix against an existing score will conclude it failed. The user allowed
   re-conversion on 2026-08-23.
3. **The VM image was rebuilt on 2026-08-23 — this is done.** Deployed commit `cb42947`,
   image `clairkeys-omr:cb42947`/`:current`, 911 MB → 930 MB. The half-deployed state the
   earlier version of this section warned about was real and is now closed. Evidence:
   `docs/recovery/validation/2026-08-23-omr-image-rebuild-after-48-49.md`.

   What that rebuild proved, in production, that no PR could:

   | | before | after |
   |---|---|---|
   | `eng.traineddata` | 4,113,088 B (LSTM-only) | **23,466,654 B**, sha256 matches the pin |
   | `Could not initialize TessBaseAPI` / `No OCR'd lines` | present | **gone** |
   | `<credit-words>` on `love-affair.pdf` | none | title, subtitle, composer, arranger, bar numbers |
   | `grep -c "return 120"` in the container | 1 | **0** |
   | unmarked score | `tempo: 120` | **`tempo: null`, `tempoSource: unknown`** |
   | user tempo 72 | silently dropped | `tempo: 72.0`, `tempoSource: "user"` |
   | `tempo=abc` | ignored | **HTTP 400** |

   So **#50's one unverified link is closed** (the image builds, the checksum pin holds, and
   Audiveris actually reads text with the replacement model), and **#51 works end to end
   through the live service**.

   Still unverified: the browser round trip through the upload form. Only the service API was
   exercised.

4. **A new defect was found while deploying, and left unfixed on purpose:
   [#52](https://github.com/landfill/ClairKeys/issues/52).** `systemctl restart clairkeys-omr`
   exits nonzero every time — the first start dies at 125 on a cidfile race and `Restart=always`
   recovers it 100ms later. The unit is missing `ExecStartPre=/bin/rm -f %t/%n.ctr-id`. The
   service is fine; a deploy script reading the exit code is not. The repo's copy
   (`omr-service/deploy/clairkeys-omr.service`) is byte-identical, so fixing it is a branch/PR,
   not a handoff commit — which is why this session did not touch the production unit.

5. **Nothing detects deployment skew.** The rebuild closed today's gap but not the mechanism:
   Vercel redeploys itself on merge, the VM does not, and in between a user's tempo is accepted,
   validated, forwarded, and discarded with no error anywhere. A capability/version handshake
   with `/process`, or refusing a tempo the service will not honour, would make that visible.
   Not done, no issue filed — a candidate, not a decision.

### Still open, untouched by this session

Issues [#46](https://github.com/landfill/ClairKeys/issues/46) (small-page PDFs discarded at
`SCALE` — sits underneath the 메트로놈 문제: a sheet discarded at `SCALE` never reaches text
recognition at all), [#47](https://github.com/landfill/ClairKeys/issues/47) (Java stack trace
shown to the user), [#44](https://github.com/landfill/ClairKeys/issues/44) (recognised rhythm
wrong in 10 of 35 measures).

### How this session was run

Orca orchestration, run `run_6f9cddc08787`, three Codex workers in three separate worktrees:
`task_820672adfb46` (#49), `task_83abe2073ce4` (#48 Python), `task_8e7e2224a615` (#48 TypeScript).
The coordinator settled the tempo contract first and handed both #48 workers the same written
contract, because they could not see each other's code. Workers ran no git commands; the
coordinator integrated, verified, and committed. Both patches applied to one branch without a
single conflict.

## Resume here — 2026-08-23 (issues #49 and #48, completed)

Decided with the user 2026-08-23: **the next session takes issues #49 (OCR is dead) and #48
(playback tempo) together.** They are one story — the tempo is wrong because the printed
`♩ = 60` was never read — but they are two fixes in two different places, and #49 alone does not
close #48.

The prior resume section for this date is kept below as `Resume here — 2026-08-23 (completed)`;
every step in it is done.

### First prompt on the new machine — copy this

```text
AGENTS.md를 읽고 그 규약을 따른다.
그다음 docs/recovery/HANDOFF.md의 "Resume here — next session" 섹션을 읽고,
거기 적힌 순서대로 이어서 진행한다.

이슈 #49(OCR 사망)와 #48(재생 빠르기)을 함께 처리한다.
#49를 고쳐도 메트로놈 표기는 여전히 인식되지 않으므로, #49만으로 #48이 닫히지 않는다.
빠르기를 못 읽었을 때 120을 지어내지 않는 것이 #48의 핵심이다 (D-001, D-010과 같은 계열).
```

### State

- `main` is clean, no open PRs, no work branches. All of 2026-08-23's merges (#41, #42, #43, #45)
  are in and their branches deleted.
- Production upload works end to end and plays. What is wrong is the *content* of what plays.
- The VM runs `clairkeys-omr-prod` under systemd on `0.0.0.0:3000`; `omr-service/deploy/README.md`
  has the procedure and D-012 the exposure decision.

### What to do, in order

1. **Issue [#49](https://github.com/landfill/ClairKeys/issues/49) — OCR. Cause and fix are both
   already demonstrated; this is implementation, not investigation.**
   Ubuntu's `tesseract-ocr-eng` ships a 4.1 MB LSTM-only `eng.traineddata`; Audiveris initialises
   Tesseract in legacy mode and `TesseractOrder` exposes no constant to change that. Substituting
   the 23.5 MB legacy-capable file from `tesseract-ocr/tessdata` removed
   `Could not initialize TessBaseAPI` and `No OCR'd lines`, and read the printed credits correctly.

   The change is in `Dockerfile.audiveris` — fetch that file and pin its checksum, the same shape
   as the Audiveris `.deb` pin from PR #36. Image grows ~19 MB on 911 MB.

   **Regression evidence first**: the fixture to assert on is that a converted score carries
   `<credit-words>` at all. `omr-service/tests` runs in no CI workflow, so whatever is added there
   protects nothing automatically — say so rather than implying coverage.

2. **Issue [#48](https://github.com/landfill/ClairKeys/issues/48) — tempo. Two separable parts.**

   **(a) `beat-unit` is discarded — demonstrated, and independent of everything else.**
   `_extract_tempo` reads only the number in `<per-minute>`; `converter.py:183` assumes that number
   is quarter-notes per minute. Injecting three musically identical markings produced 2:27
   (`quarter`/60, correct), 1:13 (`eighth`/120) and 4:55 (`half`/30). Convert `<beat-unit>` and
   `<beat-unit-dot/>` to a quarter-note equivalent, and note that `_extract_tempo` returns `int`
   while the converted value need not be integral.

   **(b) Stop inventing 120, and let the user supply a tempo.** This is the part that actually
   fixes what the user hears, and it does not depend on OCR succeeding. `/process` already takes
   `title`, `composer`, `user_id` and `sheet_music_id` as multipart fields, so `tempo` is a
   symmetric addition. When no tempo is known, do not substitute 120 — the player prints
   `{composer} • {timeSignature} • {tempo} BPM`, so a fabricated number currently sits beside two
   measured ones in identical type. That is the D-001/D-010 defect at lower stakes.

   Precedence, if a printed marking is ever recovered: the user's explicit value should win, and
   the score's value should be shown to them rather than silently overridden.

3. **Do not expect (1) to close (2).** With OCR restored, `<metronome>` was still 0 on the same
   score, and neither `Adagio` nor `60` appeared anywhere, though measure numbers 10/13/16/19/25/28
   were read. Every `ProcessingSwitch` was enumerated; none governs metronome recognition. Why the
   marking is not assembled is **unexplained**, and nothing here should be written as though
   fixing OCR will reveal it.

4. **Re-conversion is accepted.** The user confirmed on 2026-08-23 that stored scores may be
   re-converted, so a fix does not have to be backward-compatible with already-stored animation
   JSON. Note times are baked in seconds at conversion, so stored scores keep their current speed
   until re-converted — anyone checking the fix against an old upload will conclude it failed.

### Reproductions available without any new file

- `/data/testpdf/wtk1-prelude1-a4.pdf` — A4, no tempo marking, 514 notes, 73.875 s at the default.
- `/data/testpdf/love-affair.pdf` — the user's score, prints `Adagio ♩ = 60`, 2 sheets, converts
  cleanly, produces no `<metronome>`.
- `omr/cli.py` reproduces the service's exact conversion locally from a `.musicxml`, which is how
  the `beat-unit` and tempo experiments were run without touching the service.
- Audiveris can be driven directly on the VM to keep the intermediate MusicXML:
  `podman exec clairkeys-omr-prod /opt/audiveris/bin/Audiveris -batch -export -output DIR -- PDF`

### Also open, not part of this session

Issues [#46](https://github.com/landfill/ClairKeys/issues/46) (small-page PDFs discarded at
`SCALE`), [#47](https://github.com/landfill/ClairKeys/issues/47) (Java stack trace shown to the
user), [#44](https://github.com/landfill/ClairKeys/issues/44) (recognised rhythm wrong in 10 of 35
measures). #46 sits underneath #48 in one respect: a sheet discarded at `SCALE` never reaches text
recognition, so a printed marking on such a file could never be read.

## Resume here — 2026-08-23 (completed)

This section is the immediate continuation point and takes precedence over the
numbered `Next actions` below, which describe the longer-lived backlog. It was
written so the work can be picked up on a different machine; everything it
refers to is committed and pushed.

### First prompt on the new machine — copy this

Paste this as the first message to the coding agent in a fresh clone. It is
kept here rather than in a separate file because this document is the canonical
entrypoint every session is already told to read, and because `AGENTS.md`
allows this file to be committed straight to `main` — a resume prompt is a
state record, not a change to the contract.

```text
AGENTS.md를 읽고 그 규약을 따른다.
그다음 docs/recovery/HANDOFF.md의 "Resume here — 2026-08-23" 섹션을 읽고,
거기 적힌 순서대로 이어서 진행한다.

지금 열려 있는 PR #41과 #42는 사용자의 명시적 승인 없이 병합하지 않는다.
업로드를 성공시키기 위해 데모 생성 경로나 fallback을 되살리지 않는다 (D-010).
NAVER VM은 사용자가 직접 터미널로 실행하므로, 실행할 명령을 주고 출력을 받아 판단한다.
```

Keep it short on purpose. The detail lives in this section and in
`docs/recovery/reviews/PR-41.md` / `PR-42.md`; a prompt that restates them
would go stale the moment either changes, and a session that reads a stale
prompt instead of the live document is worse off than one that reads nothing.

The two prohibitions are in the prompt rather than left to discovery because
both are decisions a fresh session has no way to infer: `AGENTS.md` records
that merge approval is the user's (D-005), and `DECISIONS.md` D-010 records
that visible upload failure is intended. An agent that finds a broken upload
and no context is very likely to "fix" it by restoring exactly what P1-A
removed.

### State

**Both PRs merged 2026-08-23** with the user's explicit approval — #41 at
`727031c`, #42 at `670201a`. All post-merge checks on `670201a` are green, every
branch tip was confirmed contained in `main` with 0 unique commits, and both work
branches are deleted local and remote. `git branch -a` lists only `main` and
`origin/main`; `git status --short` is empty. The state below is kept as the
record of what was merged.

- ~~Two review-ready PRs are open, and **both are waiting on the user's explicit
  merge approval**~~ — both merged; see above.
  - **#41** `codex/p1-upload-failure-visibility` at `48d123c`, with two commits
    added 2026-08-23: the 404-after-restart stranded row found by the #42 VM run
    (`1750ec5`), and CodeRabbit's `serviceUrl` finding — a malformed
    `OMR_SERVICE_URL` was reported as a transient outage rather than a
    configuration error (`48d123c`). 17/17 hosted checks pass on the head.
  - **#42** `codex/p1-omr-result-handoff` at `f328dc9`, **stacked on #41's
    branch**. Implements and records D-011, and has merged #41 twice so the stack
    carries both fixes. Merged-branch suite: 46 suites / 421 tests, 0 failures.
- **Neither PR has a complete automated review, and the green `CodeRabbit` check
  does not mean it does.** Only #41's `8629ead` was ever reviewed; every later
  push reported `Review skipped: manual review required for this OSS repository`,
  #42 was never reviewed at all (`Review limit reached` at creation), and a
  `@coderabbitai review` request on both returned `Review rate limited`. This is
  the same shape as the CI trap on #42 below — a check that is green because it
  did not run — and the third and fourth occurrence of the rate-limit pattern
  already recorded for PRs #34 and #35.
- `main`, and both work branches, are pushed with 0 unique local commits.
- Production upload is still broken, by design, and will stay broken until the
  VM serves the OMR service **and is reachable from Vercel** (step 4) and the two
  variables are set (step 5).

### The CI trap on a stacked PR — and the second trap under it

Resolved for #42 on 2026-08-23, but both halves will recur on the next stacked PR.

`.github/workflows/test.yml` and `pr-checks.yml` trigger on
`pull_request: branches: [main, develop]`, so while #42's base was a `codex/*`
branch **no test workflow ran on it at all** — only Vercel and CodeRabbit
reported. An empty check list on a stacked PR is not a passing check list.

**Retargeting to `main` does not fix that by itself.** This was written here as
though it did, and it is wrong. `pr-checks.yml` declares
`types: [opened, synchronize, reopened]`, and `test.yml` omits `types:` — which
defaults to exactly those three. Changing a PR's base fires `pull_request` with
action **`edited`**, which is in neither list. #42 sat at `BLOCKED` with three
checks and no way to progress until the PR was **closed and reopened**, firing
`reopened`. Pushing any commit would also work by firing `synchronize`;
close/reopen was chosen because it leaves no empty commit behind.

Once triggered, #42 passed all 17 checks on its first-ever workflow run.

Local verification for #42 is recorded in `docs/recovery/reviews/PR-42.md`.

### What to do, in order

1. ~~**Collect VM state.**~~ **DONE 2026-08-23.** State is in the entries above and in
   `docs/recovery/validation/2026-08-23-pr42-vm-verification.md`. Two things this step got wrong
   and the next session should not repeat: the clone is at **`/opt/clairkeys`**, not `~/ClairKeys`,
   and this machine **can** SSH to the VM
   (`ssh -i ~/.ssh/ncp-aitestbed-user-555.pem root@101.79.16.73`).

2. ~~**Verify #42 on the VM before asking for merge approval — not after.**~~ **DONE 2026-08-23**,
   at `dcc946a`, before the approval request. Three of the four "Not verified" items are closed;
   the fourth was a false claim, not an untested one. Full record:
   `docs/recovery/validation/2026-08-23-pr42-vm-verification.md`. The one finding it produced —
   the 404-after-restart stranded row — was **fixed in #41 at `1750ec5`** the same day, and #42
   merged that fix at `f540752`. Nothing from this step is still open.

   The `omr-pr42` container is still running on the VM at `127.0.0.1:8001` (loopback only) with
   its secret in `/root/.pr42-secret`, so it can be re-driven without a rebuild.

3. ~~**Merge order, once the user approves.**~~ **DONE 2026-08-23.** #41 at
   `727031c`, then #42 retargeted, its workflows run for the first time (17/17
   pass), merged at `670201a`. Branches deleted after confirming 0 unique commits
   on all four refs. **`gh pr edit --base main` alone did not start the
   workflows** — see the trap section above before repeating this on a stacked
   PR.

   `main` now carries the pieces that let Vercel talk to the service at all:
   `omrAuthHeaders()` sends `X-ClairKeys-Token`, the status route collects
   `/result` and stores it with `SUPABASE_SERVICE_ROLE_KEY` instead of reading
   the `animation_data_url` the service no longer returns, and a malformed
   `OMR_SERVICE_URL` is refused as a configuration error rather than reported as
   an outage. Before this merge none of that was true on `main`, so setting the
   Vercel variables would have produced 401s and rows marked `completed` with no
   animation data.

4. ~~**Expose the service**~~ **DONE 2026-08-23 — PR [#43](https://github.com/landfill/ClairKeys/pull/43)
   merged at `f55a4b4`.** The service is reachable at `http://101.79.16.73:3000`, managed by a
   systemd unit, and verified from a machine outside the VM: `/health` 200 without a token,
   `/process`/`/status` 401 without one and with a wrong one, and a full Bach WTK1 Prelude 1
   conversion returning 514 notes in 45,598 bytes with `/result` answering in 51 ms. D-012 records
   the decision; `omr-service/deploy/` holds the unit and the procedure. Details below are kept as
   the reasoning, not as outstanding work.

   **Still unobserved: a reboot.** Boot-time start is inferred from `systemctl is-enabled`
   (`enabled`, `default.target` → `multi-user.target`) plus a successful `systemctl restart`.
   Whoever is next on the VM should reboot it once and confirm the service returns.

   Original framing, retained because it explains the decision: the service bound
   `127.0.0.1:8000`; there was no nginx, no TLS certificate, no domain, no systemd unit, and
   nothing on 80/443. Until that was settled there was no value to put in `OMR_SERVICE_URL` in
   step 5, and no amount of merging would have changed it.

   **Decided with the user 2026-08-23: plain HTTP, no TLS, for the test phase.** This is a
   deliberate, recorded trade, not an oversight, and it needs a `DECISIONS.md` entry (D-012)
   committed with the code that implements it — D-008 does not cover this host.

   What the user weighed: this is a test deployment, not a live service. Two facts made the
   trade defensible rather than reckless. **D-011 already removed the credential that mattered**
   — the VM holds no Supabase key, verified 2026-08-23 by inspecting the container's environment,
   so plaintext exposes the shared secret, the PDF, and the animation JSON, but never
   `SUPABASE_SERVICE_ROLE_KEY`, which stays on Vercel. And both consequences are recoverable by
   reissuing the secret and restarting the container.

   What is being accepted, stated plainly so it is not rediscovered as a surprise: the shared
   secret crosses the internet in the clear, so an on-path observer can capture it and then drive
   `/process` — up to fifteen minutes of a two-vCPU box per call — and read any job's score from
   `/result`. `omr/auth.py`'s own reasoning ("the exposure worth controlling is an
   unauthenticated caller, not an eavesdropper") assumes the secret arrives safely; plaintext
   removes that assumption, so D-012 must say so rather than let the code's comment stand
   unqualified.

   **Exit condition for D-012**: before this is treated as a real service, move to TLS. The path
   was checked and costs nothing — `101.79.16.73.sslip.io` already resolves to the VM with no
   registration, ports 80 and 443 are already open in the ACG, and nginx would terminate TLS in
   front of a container that stays on loopback. Only `OMR_SERVICE_URL` changes; no application
   code does.

   Concrete shape agreed: bind the container to `0.0.0.0:3000` (already open in the ACG; 8000 is
   not, and 80/443 stay free for the TLS upgrade), giving
   `OMR_SERVICE_URL=http://101.79.16.73:3000`. Settle the systemd unit in the same PR —
   `podman generate systemd` or a quadlet — because without one a reboot drops the service and,
   per the 404-after-restart finding, fails every in-flight row. Generate a **fresh** secret;
   `/root/.pr42-secret` was used for verification and should be discarded.

   Hardening that costs nothing here: `GET /` answers 200 without a token (found 2026-08-23), so
   whatever fronts the service should not expose it.

5. **Vercel environment variables — user only, and they are a pair.** *(current step)*
   `OMR_SERVICE_URL = http://101.79.16.73:3000` **and** `OMR_SHARED_SECRET` (the exact value in
   `/etc/clairkeys-omr.env` on the VM; `omr-service/deploy/README.md` says how to read and rotate
   it). Setting them does not affect an existing deployment — Vercel applies environment variables
   at build time, so a redeploy of `main` is required after saving. `omrAuthHeaders()` returns `{}` when the secret is
   absent, so setting one without the other makes every call 401 and the
   symptom reads as a service bug. No code change can substitute for this step —
   it is the same shape as the 2026-07 Production Branch Tracking problem.

6. ~~**Only then is upload testable end to end in production.**~~ **DONE 2026-08-23 — upload
   works end to end, and the animation plays.** The user set the two Vercel variables, redeployed,
   and confirmed playback in the browser. That closes the last unexercised half of D-011: the
   status route really does fetch `/result` and store it with `SUPABASE_SERVICE_ROLE_KEY`, against
   real Supabase rather than a Jest mock. Service logs show the calls arriving from Vercel's AWS
   egress (`44.210.239.240`, `54.205.70.194`) with **zero 401/403** — the shared secret pair is
   correct.

   **Issue #22 is not closed by this.** Recognition accuracy is a separate question that has never
   been opened, and the first real upload opened it: see the entry below and issue
   [#44](https://github.com/landfill/ClairKeys/issues/44).

   Original wording:

   **Only then is upload testable end to end in production.** Do not report
   issue #22 closed, or upload fixed, before this step has actually run.

   **What step 6 exercises for the first time**: the Next.js half of D-011 — the status route
   fetching `/result` and storing it with `SUPABASE_SERVICE_ROLE_KEY`. Every verification so far
   covers the service half; that half has only ever run against Jest mocks, and no real Supabase
   upload has happened. A successful upload is therefore not the end of the check — confirm the
   row's `animationDataUrl` is non-empty and that the score actually plays, because the failure
   this project has repeatedly produced is a row marked `completed` with nothing readable behind
   it.

### Notes for a different machine

- `.env` is local-only and not in the repository. A fresh clone needs its own,
  with at least `DATABASE_URL`, `NEXTAUTH_*`, the OAuth pairs,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY`. `AGENTS.md` § Project Reference lists the full
  set. Leave `OMR_SERVICE_URL` unset locally — PR #41 makes an unset value fail
  fast and explicitly, which is the honest local state until step 4.
- The Jest baseline on a machine without Python is **13 failures**, and they are
  environment dependent: 10 `converter corpus` cases plus the `.mxl` CLI case
  (all need Python), `omrRuntimeContract`, `prChecksWorkflow`, and one
  `uploadPathInventory` demo-writer assertion. Compare any new run against that
  set rather than against zero; CI has Python and is greener.

  **Confirmed 2026-08-23: on a machine *with* Python the baseline is zero.** This
  machine has Python 3.14.3 and the full suite runs 44/399 (on #41) and 45/405
  (on #42) with no failures at all, and `tsc --noEmit` exits 0 rather than
  reporting the 2 errors recorded earlier — those came from a stale `.next`
  validator reference. So the number to compare against is a property of the
  environment, not of the repository. Check `python3 --version` before reading a
  failure count as a regression.
- `jest.setup.js:103` replaces `global.File` with a class that is not a `Blob`,
  so `FormData.append` stringifies it and a route sees no filename. Route tests
  that post a file must import `File` from `node:buffer`. Do not change the
  global mock — the rest of the suite depends on it.

## Next actions

0. **Recognition quality is now the live problem, and it is what the next session takes.**
   Added 2026-08-23, after production upload started working. Ordered by how settled each one is:

   | Issue | State |
   |---|---|
   | [#49](https://github.com/landfill/ClairKeys/issues/49) OCR completely dead | **Cause and fix both demonstrated** — implementation only |
   | [#48](https://github.com/landfill/ClairKeys/issues/48) tempo | Part (a) `beat-unit` demonstrated; part (b) is a product decision, already framed |
   | [#46](https://github.com/landfill/ClairKeys/issues/46) small-page PDFs discarded | Reproduction and threshold measured; three options, none chosen |
   | [#47](https://github.com/landfill/ClairKeys/issues/47) stack trace shown to the user | Cause obvious, one line; no design question |
   | [#44](https://github.com/landfill/ClairKeys/issues/44) recognised rhythm wrong | Diagnosed as an Audiveris recognition failure; no fix identified |

   #49 and #48 are the current session's scope — see `Resume here — next session` above. #44 is the
   least tractable: no PDF in this repository has ground truth, so "wrong" is currently measured
   against 4/4 arithmetic and a piece whose measures are structurally uniform.

1. **The last P1-A item: the `provenance` backfill (D-010 decision 5).** Work stages 1–5 are merged and live; the writers are closed, which was the precondition for counting. What remains, in its own PR: add a `provenance` column (`'omr' | 'demo' | 'unknown'`, default `'unknown'`); run a read-only script that narrows candidates with `omrJobId IS NULL AND animationDataUrl <> ''`, then fetches each candidate's stored JSON and matches `notes` against `pdfParser`'s three fixed melodies; mark `'demo'` **only on a content match**; disclose `'demo'` scores on the playback screen and exclude them from `/api/sheet/public`. **`'unknown'` triggers nothing** — the filter alone also matches rows written by `POST /api/sheet` and `SheetMusicRepository.create`, and hiding a user's real score on a guess is its own harm. Needs real-data access, so it needs the user's approval before running. Do not delete rows: they carry user-chosen titles, categories, and `PracticeSession` history.
2. **Issue #22 — the runtime now provably works; the service around it does not yet exist.**
   Updated 2026-08-21. The image builds, Audiveris starts, and a real PDF converts end to end on
   the NAVER Cloud VM (PR #37). What is still missing before issue #22 can close: the FastAPI
   service has never been started, Supabase upload is unconfigured and untested, and no
   `/api/omr/upload` → status path has run against a live service. Deployment itself has not begun
   — no systemd unit, no nginx, no TLS, no authentication, and `OMR_SERVICE_URL` still defaults to
   the dead `https://clairkeys-omr.fly.dev` in `src/app/api/omr/upload/route.ts:6` and
   `src/app/api/omr/status/[jobId]/route.ts:7`. **Recognition accuracy is a separate, unopened
   question** — no PDF in this repository has ground truth, and `e2e/fixtures/sample-sheet.pdf` is
   a 468-byte synthetic file that draws text, not a score. Historical framing of the repository
   repair follows.

   **Issue #22 — repository repair is PR #36; runtime proof still remains.** The 2026-07-25 audit
   found four causes rather than the issue's original two. PR #36 addresses all four and also fixes
   review findings: concurrent 3GB JVMs on one 4GB VM, silent first-file selection when Audiveris
   emits multiple `.mxl` results, unbounded subprocess waits, and orphaned child processes on caller
   cancellation. Final head `4613e08` is locally verified, independently reviewed, and green across
   hosted repository CI; it merged at `c8764ec`. Full implementation evidence:
   `docs/recovery/validation/2026-07-26-issue-22-audiveris-runtime-repair.md`.

   Confirmed as filed: (a) `Dockerfile.audiveris` installs no JRE or Audiveris — and the unused `omr-service/Dockerfile` installs a JDK but writes `/opt/audiveris/bin/audiveris` as a shell script that echoes "Audiveris placeholder", the same shape as the `pdfParser` stub P1-A just removed; (b) `app.py:24-33` picks the processor at import time, and `audiveris_docker` imports only stdlib so it always wins, then fails on `docker run` with no daemon.

   The previously unresolved packaging question is closed: the official 5.11.0 `.deb` bundles Java
   25 and installs `/opt/audiveris/bin/Audiveris`; its real JAR is under `lib/app`, not either path
   the old code searched. It bundles Tesseract native libraries but no language traineddata.

   PR #36's locally provable parts carry regression evidence through `omr/cli.py` and mocked native
   launcher behavior. The image installs the checksum-pinned `.deb` and English traineddata without
   a redundant system JRE; `fly.toml` is 4GB and the packaged launcher config is rewritten to 3GB.
   Those deployment values remain static contracts only.

   Do not close issue #22 on repository CI alone. Docker build/run, real PDF conversion, Fly
   deployment, and `/api/omr/upload` → status end-to-end remain unverified. D-008 hosting is still
   `Proposed`; issue #22 remains open until that runtime proof exists.

   Historical context of how P1-A got here: `src/app/api/__tests__/uploadPathInventory.test.ts` pins that only `/api/omr/upload` converts a score, while `/api/upload-async` (`MultiStageUploadUI`), `/api/processing` (`BackgroundFileUpload`), and the caller-less `/api/upload` all reach `pdfParser.createEnhancedDemo()` — which picks a canned melody by `bufferLength % melodyVariations.length` and never opens the PDF — then persist it as an ordinary `SheetMusic` row with no marker. D-001 forbade this on 2026-07-19 and the code never followed it. Stage 2 records D-010: `/api/omr/upload` is canonical, `/api/upload` and `useFileUpload` are deleted, the two async paths keep their progress UI for P1-B but lose persistence, and `pdfParser`'s demo generation is isolated for development rather than removed. **Accepting D-010 means upload visibly fails until issue #22 is fixed** — the canonical path cannot run Audiveris on a Docker-less host. That is the end of a concealment, not a regression. Evidence: `docs/recovery/validation/2026-07-25-p1a-upload-path-inventory.md`.
3. **Needs the user's ear, not code: the two timbre defaults.** PR #30/#32/#33 all shipped and are live in production. `DEFAULT_MASTER_GAIN` (`src/hooks/useFallingNotesAudio.ts:54`, currently `0.22`) and `DEFAULT_TREBLE_ROLLOFF` (`src/utils/pianoTimbre.ts:62`, currently `3.2`) are still provisional. Both are exposed as live sliders on the playback screen whose readouts are exactly these values, so the remaining work is: listen, pick, then a small PR fixing the constants. No agent can settle this — jsdom has no Web Audio and no offline renderer is installed, so every timbre claim to date covers the coefficients fed to `PeriodicWave`, not the rendered sound.
4. Optional, low impact: give non-hashed `public/` assets (favicon, icons) a shorter `maxAge` or a revalidating strategy in `public/sw.js`. The larger "stale bundle" framing of this item was retracted on 2026-07-25 — see the corrected entry above before spending effort here.
5. **RESOLVED (2026-07-25): `main` now deploys itself.** The user changed Vercel's Production Branch Tracking from `master` to `main`, and the very next `main` push (`3659db8`) produced the **first Vercel-created `Production` deployment in the repository's history** — `state=success`, creator `vercel[bot]`, and `https://clairkeys.vercel.app/sheet/2` returns 200. The `deployments` API environment list went from `["Preview","production"]` to `["Preview","Production","production"]`; the capital-P `Production` entries are Vercel's real deployments, while lowercase `production` are the failing Actions jobs PR #29 removes. A merge to `main` can now be treated as shipping. Original diagnosis retained below.
   - ROOT CAUSE (confirmed 2026-07-25 from the Vercel dashboard): Production Branch Tracking had been left on `master`. "Every commit pushed to the `master` branch will create a Production Deployment" — but GitHub has had no `master` since the DOC-1 rename `643ce71` (2026-07-19), so every `main` push builds as Preview only. This one setting explains the zero Production-environment deployments, `clairkeys.vercel.app` frozen on a pre-rename build, and the green `Vercel` PR check that only ever meant the Preview build succeeded. **Fix: change that field to `main` in Vercel → Settings → Environments → Production → Branch Tracking** (dashboard action, user only). Until then `main` does not deploy itself and every release needs a manual promote. Tracked in issue #28; the repository-side half is PR #29.
6. P0-B leftovers remain non-blocking: cross-staff/missing-hand fallback is corpus-covered but not separately documented; ties spanning >2 measures and same-measure conflicting per-part tempos are untested (see `docs/recovery/reviews/PR-24.md`).
7. OMR pipeline defects: issue #20 (TS demo stub) is now **inside P1-A's scope** — D-010 stage 4 isolates `pdfParser`'s demo generation, which is what #20 asks for. Issue #22's repository repair is PR #36; Docker/Fly/runtime proof remains open. Hosting choice D-008 remains `Proposed`.
8. If the direct-push policy for `main` is decided, extend the branch protection payload with `required_pull_request_reviews` / `restrictions` accordingly.

## Session handoff — 2026-08-21

The OMR service is being deployed for the first time, on a NAVER Cloud Platform VM
(`vm-naver-20260820145930`, KR-1, Rocky 8.8, 2 vCPU, 15Gi RAM). **This is not a migration from
Fly.io** — `omr-service/fly.toml` was written but never deployed, so there is no running service to
move. The Next.js application stays on Vercel; only the OMR service moves.

Rocky 8.8 forces the container route: Audiveris 5.11.0 ships no `.rpm` (only Ubuntu `.deb`s), and
the system Python is 3.6.8 against `pydantic==2.5.0`'s 3.8 floor. podman 4.4.1 is installed and the
image is built.

Decisions taken with the user on 2026-08-21:

- Deploy behind nginx on port 80 with a shared-secret header now, and move to Let's Encrypt over a
  wildcard-DNS hostname (`sslip.io`-style) later. No domain is owned. The later step is a strict
  superset — certbot needs port 80 anyway — so nothing done now is thrown away.
- **The shared secret is not optional.** SELinux is `Disabled` and firewalld is `inactive`, so the
  NCloud ACG is the only control on a public IP. TLS would protect a threat that is not present
  here; the token protects the one that is — an unauthenticated `/process` that spends 15 minutes of
  a 2-vCPU box per request.
- Memory stays at `-Xmx3G` for now despite 15Gi being available, so the deployment proves the
  shipped contract rather than a variant. Tune after real conversions, not before.

Constraints for the next session:

- **Do not close issue #22 on PR #37.** The image runs; the service does not exist yet.
- **Do not report recognition accuracy** from the 2026-08-21 record. The mechanism is proven; the
  quality is unmeasured and one note position already looks suspicious.
- ~~`omr-service/tests/test_audiveris_runtime.py` still asserts `memory = "4gb"` from `fly.toml`.
  Removing `fly.toml` breaks the suite, and replacing it needs a D-008 revision — which is a
  decision record, so it belongs in a PR alongside the code, not a direct `main` commit.~~
  **해소됨 (2026-08-28, PR #69 `aaae994`).** 이 제약이 요구한 그대로 D-008 개정을 코드와 같은
  PR에 담았다. 그 단언은 이제 `fly.toml`의 **부재**와 podman unit 계약을 고정한다.
- The VM is expected to expire about one month from 2026-08-20 and may return with a different IP.
  Capture provisioning as a re-runnable script rather than typed commands.
- The VM's public IP is deliberately absent from this public repository while the host has no
  OS-level firewall. Look it up in the NCloud console by resource name.

## Session handoff — 2026-07-26, to a different agent

PR #36 merged at `c8764ec` from its verified head `4613e08`. Local validation, independent review,
PR CI, merge-commit required checks, post-merge tests/build, and the Next.js Vercel Production
deployment are green. CodeRabbit's final-commit review was rate limited, but its prior valid
findings are fixed and its incorrect launcher-config finding was withdrawn. The separate Fly OMR
image still has no build, deployment, real-PDF, or production end-to-end evidence, so issue #22
remains open and upload failure must not be concealed with demo output.

Three constraints remain load-bearing:

- **Upload failure remains expected until the OMR service is separately deployed.** PR #36 is in
  `main`, but Vercel does not build or deploy the Fly OMR service. Do not restore demo output to
  make upload look successful.
- A green repository PR does not prove the OMR image. Docker build/run, real PDF conversion, Fly
  deployment, and production end-to-end remain separate evidence.
- Do not close issue #22 or call production upload fixed until those runtime checks pass.

## Local worktree state

Updated 2026-08-21, after PRs #39/#37/#38/#40 merged. `git status --short` is empty and
`git branch -a` lists only `main` and `origin/main`. `/playwright-report/` and `/test-results/` are
now ignored (PR #40), so a Playwright run no longer produces worktree state that reads as
user-owned and blocks branch cleanup — the condition that stalled cleanup on 2026-07-26 and again
on 2026-08-21. `.omx/` remains an ignored local runtime directory; tracked
`.claude/settings.local.json` and `prisma/schema.prisma` are unchanged. `.omx/` remains an ignored local runtime directory; tracked
`.claude/settings.local.json` and `prisma/schema.prisma` are unchanged. Previously listed
`.claude/settings.json`, `docs/.bkit-memory.json`, and `docs/.pdca-status.json` do not exist in this
checkout.

**PR #36 branch cleanup is complete.** Before deletion, `git merge-base --is-ancestor
origin/codex/p1-omr-audiveris-runtime origin/main` exited 0 and `git rev-list --count
origin/main..origin/codex/p1-omr-audiveris-runtime` was 0, so tip `4613e08` carried no commits
outside `main`. The local branch no longer existed; the remote ref was deleted and pruned. `git
branch -a` now lists only `main` and `origin/main`, and local `main` matches `origin/main` at
`5196754` with 0 commits either way. Deleting the branch was not a status change for issue #22 —
the merged code is in `main`, and the Fly OMR runtime proof is still missing.

## Product-critical follow-up order

P0-A는 파일 범위가 겹치지 않으면 P0-D와 병렬로 시작할 수 있다. 이후 핵심 제품 작업은 다음 의존 순서를 유지한다.

1. P0-A: canonical animation contract와 양손·다성부 golden fixture
2. P0-B: MusicXML 박자/voice/staff/backup 변환 정확도
3. P0-C: AudioContext 기준 시계와 애니메이션 동기화

P0-A/P0-B/P0-C/P0-D는 모두 `DONE`이고, 2026-07-25 기준으로 이 성과가 마침내 프로덕션에 반영됐다 — 사용자가 `/sheet/2`에서 10초 끊김이 사라진 것을 확인했고, 에이전트도 서빙 번들에 `>10` 상한이 없음을 확인했다. 첫 복구는 수동 promote였으나, 같은 날 Vercel의 Production Branch Tracking을 `master`에서 `main`으로 바로잡아 **자동 배포도 복구됐다** — `3659db8` 푸시가 이 저장소 최초의 Vercel 생성 `Production` 배포를 만들었다. 이제 `main` 병합은 배포로 이어진다. PR #27이 병합되어 `Security Audit` 게이트도 `main`에서 초록이다.

P0가 전부 닫히면서 다음 단계는 **P1-A(업로드 경로 단일화)** 이고, 2026-07-25 하루에 stage 1~5가 모두 병합됐다(PR #34 `aca4073`, PR #35 `317dad2`). 첫 조사에서 드러난 사실은 로드맵이 예상한 것보다 무거웠다 — 네 업로드 경로 중 실제로 악보를 변환하는 것은 `/api/omr/upload` 하나뿐이고, 나머지 셋은 PDF를 열지도 않은 채 파일 크기로 고른 데모 멜로디를 실제 악보와 구분 불가능한 형태로 저장했다. D-001이 2026-07-19에 금지한 동작이 1년 가까이 코드에 남아 있었던 셈이다.

이제 그 능력은 제거됐다. `prisma.sheetMusic.create` 호출 지점은 여섯에서 셋으로 줄었고 그중 어느 것도 데모 생성기에 닿지 않는다. **대신 업로드는 이슈 #22가 해소될 때까지 눈에 보이게 실패한다** — 사용자가 명시적으로 승인한 결과이며, 회귀가 아니라 은폐의 종료다. 데모 경로가 가려주던 고장이 이제 그대로 드러난다는 뜻이므로, 다음 세션이 이를 되돌리려 해서는 안 된다.

P1-A에 남은 것은 완료 조건 하나다: 이미 저장된 행에 대한 `provenance` backfill(D-010 decision 5). 실데이터 접근이 필요하므로 사용자 승인 아래 별도 PR로 수행한다.
