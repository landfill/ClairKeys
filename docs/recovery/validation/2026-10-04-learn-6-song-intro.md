# Validation — LEARN L-6 내 곡의 소개 (#215)

Date: 2026-10-04 KST
Branch/commits: `codex/learn-6-song-intro` — `3da7cb2`(구현), `8b2670c`(리뷰 수정). main 병합(L-4b 포함)은 PR223 병합 뒤에 한다.
Environment: macOS, production 빌드, `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`, Jest의 OMR 회귀는 기존 `ci-venv`.

## Claim being verified

`/sheet/[id]`의 "악보 정보" 카드에 "이 곡 소개"가 생기고, 데이터가 뒷받침하는 사실만 보여 주며 각 항목을 레슨으로 연결한다.
박자·조의 기본값과 음표·쉼표 종류는 화면에 나오지 않는다. 재생 화면의 요소 수는 변하지 않고, 비공개 악보 접근 규칙은 그대로다.

## 착수 시 결정과 구현 중 바뀐 것 (이슈 #215 "착수 시 결정해 기록")

- 진입 위치: 새 경로가 아니라 `/sheet/[id]`의 기존 "악보 정보" 카드 영역. 재생 화면 루트 밖이라 D-094 요소 수 기준(터치 재생 전 여유 0)을 건드리지 않고,
  새 경로가 없어 접근 규칙이 `src/app/sheet/[id]/page.tsx`의 기존 분기 그대로다.
- 표시 항목(최종): **음역, 재생 시간, 손 구분, 빠르기**. 기존 "악보 정보"의 재생 시간은 소개로 합쳐 한 번만 보인다.
- 박자: 구현 워커 조사 결과, 검증된 박자 정보(악보 아티팩트)는 재생 화면 내부에서만 로드되고 페이지 수준에는 없다. JSON의 `timeSignature`는 없으면 `4/4`로 채워져
  근거가 아니다. 1차 구현은 모든 곡에 "박자 정보는 확인되지 않았어요"를 보였는데, 로컬 리뷰 의견(모든 곡에 같은 문장, 재생 화면과의 불일치)을 받아 **행을 뺐다**.
- 조: 표시하지 않는다(장·단조 기본값, 조표만으로는 나란한조를 구분할 수 없다).
- 음표·쉼표 종류: 표시하지 않는다(계약에 필드 없음, 변환기가 쉼표를 버리고 붙임줄 음을 합친다).
- 후속 후보: 검증된 박자·조표를 페이지 수준에서 쓸 수 있게 되면(예: 악보 아티팩트를 페이지가 공유) 소개에 출처와 함께 추가한다. 이번 범위에서는 소개를 위해 새 요청을 만들지 않았다.

## 항목별 출처 규칙 (`src/lib/learn/songIntro.ts`)

| 항목 | 근거 | 표시 |
|---|---|---|
| 음역 | 음표의 최저·최고 MIDI | 계이름+옥타브, 가운데 도 기준 한 줄. 음표가 없으면 "확인할 수 없어요" |
| 재생 시간 | `max(문서 duration, 마지막 음의 끝)` | 분·초 |
| 손 구분 | `canonicalToFallingNotes`의 `handSource === 'source'`인 음표만 원본 | 원본이면 양손/한 손. 원본과 추정이 섞이면 원본에서 확인한 손만 말하고 일부는 추정이라고 표시. 전부 추정이면 "손 구분은 앱이 추정했어요"(D-082) |
| 빠르기 | `tempoSource`가 `score`·`user`일 때만 | 기존 `getTempoDisplay` 문구 재사용. `unknown`이면 "확인된 빠르기 정보가 없어요" |
| 박자·조·음표 종류 | 근거 없음 | 표시하지 않음 |

## Commands and results

구현은 Codex `gpt-6.1-sol`(Orca 터미널). E2E와 화면 확인은 Claude가 실행했다.

| Command | Result | Evidence |
|---|---|---|
| 구현 전 Jest (Codex) | FAIL (의도) | 분석 함수·컴포넌트 부재. 리뷰 수정 전 2건 실패 확인 |
| `PATH=<ci-venv>/bin:$PATH npx jest` (`8b2670c`) | PASS | 152 suites, 1497 tests |
| `npx tsc --noEmit --incremental false`, `npm run lint` | PASS | exit 0, no warnings |
| `npx playwright test` sheet-song-intro, playback-element-count, application-smoke, playback-mode-clarity, practice-records `--project=chromium --project=firefox --project="Mobile Chrome"` (`8b2670c`) | PASS | 45 passed, 3 skipped |
| 같은 명령 + console-quiet, playback-session-transition (`3da7cb2`) | PASS | 81 passed, 3 skipped |

이슈가 요구한 분석 fixture: 박자·조 필드를 생략한 원본을 실제 `normalizeAnimationData`로 통과시킨 뒤에도 소개에 `4/4`·장조가 나오지 않음(리뷰 수정으로 추가),
붙임줄로 합쳐진 긴 음과 겹치는 성부에서 음역·길이가 올바르고 음표·쉼표 종류를 내지 않음, 손 원본·한 손·전부 추정·부분 원본, 빠르기 출처 셋, 빈 곡, A0·C8·가운데 도.
E2E: 공개 악보의 소개와 레슨 이동(`/learn/reading#pitch-explorer` 도달 포함), 소개에 `4/4`·장조·단조·음표 종류·쉼표 종류 없음, 소개가 재생 화면 루트 밖,
403 응답 시 소개·애니메이션 JSON 미요청, 320·390px 가로 넘침 없음, pageerror·console error 0건. 요소 수 측정 spec은 기준값 변경 없이 통과.

## 화면 확인 (chromium 스크린샷, 1차 구현)

1280px·390px: "악보 정보" 아래 "이 곡 소개", 음역(도(2옥타브) ~ 도(5옥타브)와 가운데 도 기준 설명)·재생 시간·손 구분(양손)·빠르기(♩=72 (악보에서 읽음))와 레슨 링크.
박자 행 제거 뒤의 화면은 다시 촬영하지 않았다(E2E가 행 부재를 단언).

## E2E 실패 이력

1차 실행 75 passed / 9 failed, 테스트 결함 하나: 새 spec이 `/api/auth/session`을 `null`로 응답해 next-auth가 콘솔 오류를 냄. 기존 spec처럼 `{}`로 수정.

## 로컬 리뷰 (Codex `gpt-6-astra` high, read-only, Orca 터미널, 대상 `3da7cb2`)

| # | Finding | State | Handling |
|---|---|---|---|
| 1 | P2: 박자 레슨 링크의 `#meters`가 현재 트리에 없음(L-4b가 만든다) | FIXED | `8b2670c`: 박자 행과 링크 제거로 해소. 남은 앵커 `#pitch-explorer`는 존재 확인, 도달 E2E 추가 |
| 2 | P3: 빠르기 출처 불명을 "악보에서 읽지 못했어요"로 단정 | FIXED | `8b2670c`: "확인된 빠르기 정보가 없어요" |
| 3 | P3: 모든 fixture가 `timeSignature: '4/4'`라 필드 누락→기본값 경로를 검증하지 않음 | FIXED | `8b2670c`: 실제 정규화를 거친 누락 fixture 테스트 |
| 의견 | 모든 곡에 동일한 박자 행은 생략 권고 | 수용 | `8b2670c`: 행 제거 |

리뷰어 확인: 부분적으로만 손 정보가 있는 곡을 "오른손만"으로 단정하지 않음, 범위 밖 MIDI는 기존 정규화에서 거부됨.
리뷰어 지적: 비공개 E2E는 403 응답 뒤의 UI 동작을 검증하며 서버의 권한 판정을 대신하지 않는다.

## Gaps and risks

- WebKit·Mobile Safari E2E는 PR CI에 맡긴다(D-088).
- 비공개 악보의 서버 권한 판정은 이 변경이 건드리지 않았고, 운영에 비공개 악보가 없어 운영에서 확인할 수 없다(HANDOFF의 기존 제약).
- 이슈가 예로 든 다섯 항목 중 박자·조는 표시하지 않는다(위 결정). 이슈의 "불확실한 값은 그렇다고 표시하거나 뺀다"에 따른 것이다.
- 리뷰 수정 커밋 `8b2670c`는 로컬 재리뷰를 하지 않았다. main 병합(L-4b 포함) 뒤의 검증은 PR 생성 전에 다시 한다.
- Codex 주간 한도는 이 기록 시점에 3% 남았다. 구현·리뷰 워커의 모델 전환 제안은 모두 "현재 모델 유지"로 닫았다.

## main 병합 뒤 재검증 (2026-10-04, `60b4c44`)

PR223(L-4b) 병합 뒤 main을 브랜치에 병합. 충돌 없음.
- `PATH=<ci-venv>/bin:$PATH npx jest`: 154 suites, 1533 tests PASS. `tsc`, lint PASS.
- `npx playwright test` sheet-song-intro, playback-element-count, application-smoke, console-quiet, playback-mode-clarity, playback-session-transition, practice-records, learn-reading, learn-home
  `--project=chromium --project=firefox --project="Mobile Chrome"`: 141 passed, 3 skipped.
- 재생 화면 요소 수: 재생 전 데스크톱 17/10, 재생 중·일시정지 8/3, keyMarks 꺼짐 7·켜짐 50(L-5 후와 동일).
- 화면(1280px, 박자 행 제거 뒤): 음역·재생 시간·손 구분·빠르기와 레슨 링크. 박자 행 없음.
