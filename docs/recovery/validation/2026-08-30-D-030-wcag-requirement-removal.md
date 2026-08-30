# Validation — D-030 / 이슈 #76 WCAG AA 요건 제거

Date: 2026-08-30
Commit: `b9a0652` (branch `codex/ds-wcag-requirement-removal`, PR [#95](https://github.com/landfill/ClairKeys/pull/95))
Merge commit: `08100c7`
Environment: macOS (darwin 25.5.0), Node v22.18.0

## Claim being verified

이슈 #76의 WCAG AA 요건이 계획 문서·CI·구현 계약 세 층에서 **완전히** 제거됐는가. 그리고 그
제거가 접근성과 무관한 회귀 계약이나 살아 있는 완료 조건을 함께 깨뜨리지 않았는가.

## Commands and results

| Command | Result |
|---|---|
| `npx tsc --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — warnings 0, errors 0 |
| `npx jest --ci` | PASS — **75 suites / 745 tests** |
| `npx playwright test application-smoke.spec.ts --project=chromium` | PASS — 5/5 (CI와 동일 env) |
| `grep -rn 'WCAG' docs/recovery/ROADMAP.md docs/recovery/phases/` | PASS — 0건 |
| `grep -niE 'accessib\|axe\|browser-driver' .github/workflows/*.yml` | PASS — 0건 |
| js-yaml 워크플로 파싱 | PASS — job 8개, `accessibility-check` 부재 |

`npm run test:e2e` 전체 브라우저는 로컬에서 실행하지 않았다. CI의 E2E Tests가 5개 프로젝트를
모두 판정했고 통과했다.

## 제거 범위

| 층 | 제거 대상 |
|---|---|
| 계획 | ROADMAP 완료 조건 7(WCAG AA) 삭제, 조건 8 → 7 재번호 (**8개 → 7개**). "조건 7의 판정 기준" 절. DS-1~DS-7의 접근성 요건 |
| CI | `accessibility-check` job(홈 1화면 `@axe-core/cli@4.12.1`, 70줄). `prChecksWorkflow.test.ts`의 검사 3건 |
| 구현 | `PlaybackControls`의 슬라이더 ARIA·버튼 `aria-label`·재생 상태 live region. `icons.tsx`의 `role`/`aria-hidden`. `OptimizedImage`의 로딩 `aria-label` |
| 테스트 | `playbackControlsA11y.test.tsx`(166줄) 삭제. `globalStyles.test.ts`의 포커스 계약 describe |

## 두 번의 불완전한 제거와 그 원인

**1차 — 요건이 한 절에만 있다고 가정했다.** `접근성·반응형 검증` 절만 지웠더니 DS-7의
`검증 명령`에 `npx @axe-core/cli … 위반 0건`과 키보드·200% 확대·색상 외 수동 검사가 남아, 같은
문서가 "요건은 없는데 그 요건을 검사하라"고 모순됐다. DS-5는 `In scope`와 **`Completion criteria`**
두 곳에 색상 외 구분(WCAG 1.4.1)이 살아 있었고, 후자는 실제 완료 조건이었다.

이 저장소의 phase 문서는 같은 요건을 최대 **네 곳**에 반복한다 — `In scope`,
`접근성·반응형 검증`, `Completion criteria`, `검증 명령`. 한 곳만 지우면 문서가 자기모순한다.

**2차 — 다른 문서의 상호 참조가 폐기된 판정을 가리켰다.** DS-2의 C6 담당이
`DS-7(종단 접근성)`이었는데 D-030이 그 판정을 없앴다. DS-4의 완료 기록은
"완료 조건 7·8은 여전히 DS-7 소유다"라고 **현재형**으로 주장하는데 개정 후 그 번호가 없다.

두 건 모두 검증 명령으로는 잡히지 않았다. `grep 'WCAG'`가 0건이어도 요건은 다른 낱말로 남는다.

## 접근성 속성이 테스트 선택자였다 (CI가 잡음)

첫 푸시(`6be2702`)에서 **E2E가 5개 브라우저 전부 실패**했다. 공개 스모크의 "로그인 없이 샘플 재생"이
재생 버튼을 `getByRole('button', { name: /재생|play/i })`로 찾는데, 그 접근 가능한 이름의 유일한
출처가 제거한 `aria-label="재생"`이었다. 재생 전에는 `CompactPlaybackBar`가 아니라
`PlaybackControls`가 렌더되고 버튼 내용이 이모지뿐이라 이름이 남지 않는다.

이 검사는 **완료 조건 3**(로그인하지 않은 상태에서 학습 결과를 최소 한 번 재생할 수 있다)을
지키고, 그 조건은 D-030의 대상이 아니다. `aria-label`을 되살리면 요건 제거가 무의미해지고 검사를
지우면 살아 있는 요건이 무방비가 되므로, 전송 버튼 세 개에 ARIA와 무관한 `data-testid`를 주고
스펙을 `getByTestId('playback-play')`로 바꿨다 (`6463490`).

**남은 같은 함정**: 스모크에 `[aria-label$="octave marker"]`(낙하 노트 건반, **완료 조건 1**)가
아직 있다. 건반 ARIA를 손대면 같은 방식으로 무너진다.

## 보존 확인 (접근성과 무관해 남긴 것)

| 남긴 것 | 근거 |
|---|---|
| `PlaybackControls`의 `tabIndex`·`onKeyDown` | 요건이 아니라 동작하는 기능 |
| `OptimizedImage`의 `alt` | `next/image` 필수 prop — 제거 시 타입 오류 |
| `globalStyles.test.ts`의 토큰 describe | hex 리터럴 유출·D-025 다크 재유입 방지 |
| DS-5의 실기기 회귀(276·326·390px) | D-021·D-022 회귀 계약 |
| DS-0의 "접근성·회귀 테스트" 절 | 기하·전환 계약을 함께 고정 |
| DS-7의 기하 diff 검사와 lint/tsc/test/build 명령 | 접근성과 무관 |
| 나머지 29개 파일의 `aria`/`role` | RTL `getByRole`·`getByLabelText`가 의존 |
| 과거 Progress·validation 기록의 조건 번호 | 그 시점의 사실이자 역사적 증거 |

## 리뷰

| 출처 | 결과 |
|---|---|
| Codex 워커 (Orca `run_a12df4b89111`) | should-fix 1건 — DS-7 `검증 명령`의 axe·수동 검사 잔재. 확인 후 반영 |
| 직접 대조 | DS-5의 `In scope`·`Completion criteria` 2건 추가 발견 |
| CodeRabbit (리뷰 본문 outside-diff) | 3건 — 2건 수용, 1건 기각 |
| 인라인 리뷰 스레드 | `totalCount=0` |

CodeRabbit의 `PlaybackControls` ARIA 복원 요구(Major)는 **기각**했다. D-030이 기록한 사용자
결정을 되돌리라는 요구이고, 도구는 diff의 기술적 타당성만 볼 뿐 결정 맥락을 보지 못한다. 기각
근거는 D-030 Directive에 있다.

CodeRabbit의 outside-diff 지적은 **인라인 스레드에 나타나지 않았다**(`totalCount=0`). 리뷰 본문만
확인 가능했다 — 세 표면을 모두 조회하는 규칙이 아니었으면 3건을 통째로 놓쳤다.

## CI 결과

| 대상 | 결과 |
|---|---|
| PR head `b9a0652` | **16/16 pass** |
| merge commit `08100c7` | **6/6 success** — Lint, Security Audit, Run Tests, E2E Tests, Post-merge tests, Post-merge build (마지막 완료 E2E Tests 2026-08-30T00:54:24Z) |
| Vercel commit status | `success` |

`main` branch protection의 required check는 `Lint`·`Security Audit`·`Run Tests`·`E2E Tests`
4개이고 "Accessibility Check"는 포함되지 않아, job 제거가 머지를 막지 않았다.

## 검증하지 못한 것

- 스크린리더 실사용. 저하는 의도된 결과이므로 검증 대상으로 두지 않았다.
- 로컬 E2E는 chromium만 실행했다. 나머지 4개 프로젝트는 CI가 판정했다.
- 이슈 #76 본문의 조건 서술은 GitHub 이슈이고 이 PR의 범위 밖이다 — 개정된 완료 조건 7개와
  어긋나 있을 수 있다.
