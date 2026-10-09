# Validation — LEARN-236 / 5단계 첫 곡 코스 두 페이지의 재생기 밖 링크 44px

Date: 2026-10-09
Commit: `4ec99ed` (브랜치 `codex/learn-236-course-links`, 코드 커밋 `f91da24`·`4ec99ed`, 문서 커밋 `c67e52e`)
Environment: macOS, production 빌드(`npm run build` 뒤 `npm start`), `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 DATABASE_URL=postgresql://test:test@localhost:5432/clairkeys_test`, Playwright

## Claim being verified

[완료 조건 대조](2026-10-09-learn-236-completion-audit.md)에서 드러난 미달의 후속이다.
`/learn/course`와 `/learn/course/<곡>` 세 페이지에서 **재생기 밖** 링크의 높이가 44px 이상이고, 그 링크의 글자를 누르면 그 링크가 잡힌다.
글자·`href`·요소 수는 바뀌지 않았다. 재생기(`FallingNotesPlayer`) 안의 조작은 고치지 않았다(이슈의 "재생 화면은 수정하지 않는다").

## Commands and results

최종 트리(`4ec99ed`)에서 실행했다.

| 명령 | 결과 |
|---|---|
| `PATH=<ci-venv>/bin:$PATH PYTHON_BIN=<ci-venv>/bin/python3 npx jest` | 169 suites, 1643 tests PASS |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npx playwright test --project=chromium --project=firefox`(전체 스위트) | 501 passed, 10 skipped, **1 failed**: `[firefox] learn-course.spec.ts › the course and player fit 320px and allow moving to the next piece`가 `다음 곡`을 누른 뒤 제목을 5초 안에 찾지 못함 |
| `npx playwright test --project=firefox`(전체, 3회) | 248 passed × 3. 위 실패는 재현되지 않았다 |
| 같은 테스트 `--project=firefox --project=chromium --repeat-each=4` | 8 passed |
| `npx playwright test e2e/learn-course.spec.ts e2e/sheet-song-intro.spec.ts --project=webkit --project="Mobile Chrome" --project="Mobile Safari"` | 31 passed, 2 skipped |
| `node local-test-data/results/learn-236/measure.mjs http://localhost:3000 <dir> /learn/course /learn/course/right-hand /learn/course/left-hand /learn/course/both-hands` | 아래 표 |

수정 전 실패 확인(워커 보고, 구현 전 Jest): 코스 목록의 두 링크에 높이 클래스 없음, `이 곡 소개`의 링크 4개에 `min-h-11` 없음.
Firefox 1회 실패는 두 브라우저를 5 workers로 함께 돌린 실행에서만 났다. 원인을 특정하지 못했다(부하로 곡 페이지 이동이 5초를 넘은 것으로 추정). CI는 재시도 2회가 있다.

## 변경 전후 계측

변경 전은 병합된 main(`edb4609`)의 로컬 production 빌드, 변경 후는 이 브랜치다(Chromium, 눌리는 영역의 상자 크기).
변경 후의 정확한 크기는 따로 적지 않았다. 계측 스크립트의 "44px 미만" 목록에서 빠진 것과 E2E의 높이 단언으로 확인했다.

| 링크 | 변경 전 | 변경 후 |
|---|---|---|
| `/learn/course` `다섯 손가락 자리` | 92×18 | 높이 44 이상 |
| `/learn/course` `느리게 재생하거나 구간을 반복하는 방법` | 220×18 (390px에서 두 줄 358×38) | 높이 44 이상 (390px에서는 한 덩어리로 다음 줄) |
| `이 곡 소개` `건반 레슨에서 음역 익히기` | 144×20 | 높이 44 이상 |
| `이 곡 소개` `악보 읽기에서 음높이 연결하기` | 168×20 | 높이 44 이상 |
| `이 곡 소개` `손 레슨에서 손가락 번호 익히기` | 171×18 | 높이 44 이상 |
| `이 곡 소개` `연습 방법에서 빠르기와 연습 알아보기` | 208×18 | 높이 44 이상 |

| 경로 | 문서 높이 전 (1280×800 / 390×844) | 후 | 재생기 밖 44px 미만 | 가로 넘침 |
|---|---|---|---|---|
| `/learn/course` | 1111 / 1298px | 1111 / 1346px | 0 | 0 |
| `/learn/course/right-hand` | 1900 / 2388px | 1940 / 2464px | 0 | 0 |
| `/learn/course/left-hand` | (재지 않음) | 1940 / 2484px | 0 | 0 |
| `/learn/course/both-hands` | (재지 않음) | 1996 / 2540px | 0 | 0 |

**재생기 안에 남은 44px 미만(고치지 않음)**: `연습 방법과 단축키 보기` 132×20, `손가락 번호 보기` 92×20, 1280×800의 `악보 보기` 40×40, `both-hands`의 손 선택 `양손`·`왼손` 56×32, `오른손` 68×32.
이슈의 "재생 화면은 수정하지 않는다(D-094)" 제약에 걸린다. 완료 조건의 예외로 둘지는 사용자 결정이다.

## 구현 중 드러난 문제와 처리

| 문제 | 찾은 곳 | 처리 |
|---|---|---|
| 코스 목록의 두 문장 안 링크에 레슨과 같은 inline 패딩(`py-3.5`)을 주자, 폭 414px 이하에서 `다섯 손가락 자리`의 글자를 눌러도 뒤 링크가 잡힘 | 로컬 Codex 리뷰(추측으로 지적) → 오케스트레이터 실측(Chromium·Firefox, 320·360·390·414px) | 지시문의 방식이 틀렸다. 이 문단은 줄 높이 20px라 둘째 줄 조각의 위 패딩 14px가 첫 줄 글자를 덮는다. `inline-block py-3`으로 바꿔 줄 자체를 44px로(`4ec99ed`) |
| E2E 단계가 검사 대상이 없어도 통과하고, 상자 높이만 봄 | 로컬 Codex 리뷰 | 검사한 링크 목록을 단언하고, 링크 조각마다 가운데 점에서 그 링크가 잡히는지 확인(`4ec99ed`) |
| 오케스트레이터의 첫 확인이 문단 밖 링크만 봐서 위 결함을 놓침 | 리뷰 뒤 재확인 | 문장 안 링크의 글자 가운데를 누르는 실측으로 바꿈 |

## 함께 드러난 것: 상자 크기와 실제로 눌리는 영역의 차이 (이미 병합된 2·4단계)

이 PR의 범위 밖이고 고치지 않았다. 사실만 적는다.
2단계가 정한 문장 안 링크의 방식(inline + `py-3.5`)은 `getBoundingClientRect`로 재면 49px다. 이슈의 계측 표와 지금까지의 검증 기록·E2E는 모두 이 상자를 쟀다.
상자 안을 1px 간격으로 훑어 `elementFromPoint`가 그 링크를 돌려주는 범위를 재면(Chromium), 문단의 마지막 줄이 아닌 곳에 있는 링크는 더 작다. 패딩이 이웃 줄과 겹치는 곳에서는 문서 순서상 뒤의 글자가 잡히기 때문이다.

| 링크(예) | 상자 | 실제로 잡히는 범위 1280×800 | 390×844 |
|---|---|---|---|
| 악보 읽기 1 `오선`(2자, 좌우로 넓힌 것) | 44×49 | 35×37 | 35×37 |
| 악보 읽기 1 `덧줄` | 44×49 | 34×37 | 34×37 |
| 악보 읽기 1 `큰보표`(3자) | 58×49 | 49×37 | 49×37 |
| 악보 읽기 1 `높은음자리표` | 83×49 | 82×45 | 82×37 |
| 악보 읽기 2 `4분음표` | 51×49 | 50×45 | 50×26 |
| 악보 읽기 2 `마디` | 44×49 | 34×37 | 34×37 |
| 연습 방법 `메트로놈` | 55×49 | 54×37 | 54×37 |
| 문단 마지막 줄의 `건반 레슨`, `손 레슨`, `기다리기 모드`(연습 방법) | 49 | 높이 49 | 높이 49 |

- 레슨에서는 글자 가운데를 눌렀을 때 **다른 링크가 잡히는 경우는 없었다**(다섯 폭 × Chromium·Firefox). 줄 높이가 26px라 패딩 14px가 이웃 줄 글자의 가운데까지 닿지 않는다. 줄어드는 것은 글자 위아래의 여유 영역이다.
- 4단계에서 두세 글자 용어에 준 좌우 넓히기(`-mx-2 px-2`)는 상자를 44px로 만들지만 왼쪽 약 9px는 실제로 잡히지 않는다(35px).
- 따라서 "문장 안 링크는 높이 기준 44px"는 **상자 기준으로는 충족, 실제로 눌리는 높이 기준으로는 문단 중간의 링크에서 약 37px**(390×844의 `4분음표`는 26px)다.
- 이 방식의 한계다. 줄 간격을 넓히지 않는 한 문장 안 링크의 눌리는 영역은 이웃 줄과 나눠 가질 수밖에 없다(WCAG 2.5.8은 문장 안 링크를 크기 기준의 예외로 둔다). 고칠지, 상자 기준을 그대로 받아들일지는 사용자 결정이다.

## Baseline comparison

- Fixed failures: 없음. Remaining pre-existing failures: 없음.
- New failures: 위 Firefox 1회(재현되지 않음).

## Manual checks

- 로컬 리뷰: Codex `gpt-6.1-sol` reasoning `high`, 읽기 전용, 1회(`f91da24`). medium 1건(추측)·low 1건, 둘 다 수정. `4ec99ed`에 대한 재리뷰는 하지 않았다.

## Gaps and risks

- `/sheet/<id>`(사용자 악보 페이지)의 `이 곡 소개`도 같은 컴포넌트라 링크가 커진다. 실제 저장된 악보로는 보지 않았고, 데이터를 가로챈 `e2e/sheet-song-intro.spec.ts`로만 확인했다.
- 코스 목록의 안내 문장은 줄 간격이 넓어졌다(한 줄 20 → 44px). 화면 캡처로 보기 좋은지 사람이 판단하지 않았다.
- 실기기 터치로는 확인하지 않았다. 실측은 데스크톱 브라우저의 `elementFromPoint`다.
