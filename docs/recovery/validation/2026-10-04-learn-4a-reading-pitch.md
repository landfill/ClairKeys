# Validation — LEARN L-4a 악보 읽기: 음높이 `/learn/reading` (#213 첫 PR)

Date: 2026-10-04 KST
Branch/commits: `codex/learn-4-reading` — `c825110`(구현), `eb39e0a`(main 병합), `697301d`(리뷰 수정)
Environment: macOS, production 빌드, `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`, Jest의 OMR 회귀는 기존 `ci-venv`.

## Claim being verified

`/learn/reading`이 오선, 높은음자리표, 낮은음자리표, 덧줄과 가운데 도를 설명하고, 음을 고르면 오선·건반·계이름이 같은 음을 가리킨다.
악보 그림은 OSMD가 그리고, 그림이 없어도(엔진 로드 실패) 글과 건반으로 레슨이 성립한다. 소리가 실패해도 표시는 동작한다.
이 PR은 #213의 음높이 부분이다. 음표·쉼표 길이와 박자표는 L-4b이고, 그때 단계 지도에 공개한다(이 PR 뒤에는 URL로만 열린다).

## 착수 시 결정 (이슈 #213)

- 악보 그림: 손으로 그린 SVG가 아니라 기존 OSMD(`opensheetmusicdisplay`, `ScorePanel`과 같은 엔진)로 코드에서 만든 MusicXML을 렌더링한다.
  기호 모양을 검수할 사람이 없어 조판 엔진에 맡긴다. `ScorePanel`은 수정하지 않았다.
- 예시 데이터가 원본: 한 예시(음자리표 + MIDI 목록)에서 MusicXML, 오선 위치 이름, 계이름, 건반 강조, 소리가 모두 나온다.
- 두 PR로 분할: L-4a 음높이, L-4b 길이·박자. `reading`의 `available`은 L-4b에서 켠다(지도 설명이 길이·박자까지 약속한다).

## 표준 교재 대조표

청취 판단은 완료 조건이 아니다. 아래는 본문·데이터의 음악 사실 주장을 공개 교재·사전과 대조한 것이다.

| # | 레슨의 주장 (위치) | 대조 자료 | 판정 |
|---|---|---|---|
| 1 | 오선은 다섯 줄과 그 사이의 네 칸 (`page.tsx` 오선) | 글로벌 세계 대백과사전 「악전」: "다섯 개의 줄(5線) 및 줄과 줄 사이의 간(間)이 쓰이며"; Wikipedia *Staff (music)*: "a set of horizontal lines (usually five) with spaces between them" | 일치. 용어 차이: 사전은 `간(間)`, 레슨은 `칸`(초등 교육에서 쓰는 표현). 뜻은 같다 |
| 2 | 줄과 칸은 아래에서 위로 센다 | *Staff (music)*: "The lines and spaces are numbered from bottom to top; the bottom line is the first line" | 일치 |
| 3 | 같은 음자리표에서 위로 갈수록 높은 음 | *Staff (music)*: "higher-pitched notes are marked higher on the staff" | 일치 |
| 4 | 높은음자리표는 G 음자리표, 둘째 줄이 솔(G4) | Wikipedia *Clef*: "placing G4 on the second line of the staff"; 「악전」: "높은음자리표(高音部記號, G음자리표, 'g(사)'음의 위치를 지시하는 기호)"; Open Music Theory *Reading Clefs* | 일치 |
| 5 | 높은음자리표 줄: 미·솔·시·레·파 (E4 G4 B4 D5 F5), 칸: 파·라·도·미 (F4 A4 C5 E5) | *Clef*의 암기구 "Every Good Boy Does Fine" / "FACE"; Open Music Theory *Reading Clefs* (리뷰어 대조) | 일치 |
| 6 | 낮은음자리표는 F 음자리표, 넷째 줄이 파(F3) | *Clef*: "placing F3 on the fourth line"; 「악전」: "낮은음자리표(低音部記號, F음자리표, 'f(바)'음의 위치를 지시하는 기호)" | 일치 |
| 7 | 낮은음자리표 줄: 솔·시·레·파·라 (G2 B2 D3 F3 A3), 칸: 라·도·미·솔 (A2 C3 E3 G3) | *Clef*의 암기구 "Good Boys Do Fine Always" / "All Cows Eat Grass"; Open Music Theory *Reading Clefs* (리뷰어 대조) | 일치 |
| 8 | 오선 바깥의 음은 짧은 덧줄로 적는다 | 「악전」: "5선의 위 또는 아래에 짧은 줄을 쓴다. 이것을 덧줄이라 한다"; *Staff (music)*: "placed on or between ledger lines" | 일치 |
| 9 | 가운데 도는 높은음자리표 아래 덧줄 하나, 낮은음자리표 위 덧줄 하나, 둘은 같은 음 | *Staff (music)*: "it can be written on the first ledger line below the upper staff or the first ledger line above the lower staff"; Open University *An introduction to music theory* 2.4: "middle C can be notated on both staves, in different positions on each staff" | 일치 |
| 10 | 큰보표는 높은음자리표와 낮은음자리표의 두 오선을 함께 읽는 보표 | 「악전」: "높은음자리 보표와 낮은음자리 보표를 결합한 것을 큰보표라 한다" | 일치. 리뷰어 의견: 위아래 배치와 연결 괄호를 보충하면 더 정확하다(본문에는 넣지 않았다) |
| 11 | 높은음자리표는 오른손이, 낮은음자리표는 왼손이 "주로" 읽는다 | *Clef*: "The treble clef is also the upper staff of the grand staff used for harp and keyboard instruments", "Bass clef is the bottom clef in the grand staff"; Open Music Theory *The Keyboard and the Grand Staff* (리뷰어 대조) | 관례로 일치. 손을 음자리표에 고정하는 규칙은 아니며 본문도 "주로"라고 쓴다 |
| 12 | 가운데 도 = C4 = MIDI 60, 옥타브 번호는 도에서 바뀐다 | Open Music Theory *ASPN*; MIDI 1.0 규격 (리뷰어 대조) | 일치 |
| 13 | D4는 높은음자리표 오선 바로 아래 칸, B3는 낮은음자리표 오선 바로 위 칸 (`staffPosition`) | 5·7·9의 줄 음에서 한 칸 이동한 값. 단위 테스트가 표준값을 직접 적어 고정 | 일치 |

자료:
- 글로벌 세계 대백과사전, 한국음악/서양음악의 기초와 역사/서양음악의 기초지식/악전 (ko.wikisource.org)
- Wikipedia, *Clef* (en.wikipedia.org/wiki/Clef), *Staff (music)* (en.wikipedia.org/wiki/Staff_(music))
- The Open University OpenLearn, *An introduction to music theory*, 2.4 Middle C and ledger lines
- Open Music Theory, *Reading Clefs*, *The Keyboard and the Grand Staff*, *American Standard Pitch Notation* (리뷰어가 대조)

한계: 인쇄 교재(예: 국내 음악 교과서)의 쪽수 대조는 하지 못했다. 위 자료는 온라인 공개 자료다. 5·7의 음이름은 Wikipedia에서 암기구로만 확인했고
줄·칸별 음이름 목록은 Open Music Theory를 리뷰어가 대조한 결과에 기댄다. 오케스트레이터는 `staffPosition`의 계산식을 E4·G2 기준으로 직접 검산했다.

## Commands and results

구현은 Codex `gpt-6.1-sol`(Orca 터미널). E2E와 화면 확인은 Claude가 실행했다(Codex 샌드박스는 포트를 열 수 없다).

| Command | Result | Evidence |
|---|---|---|
| 구현 전 Jest (Codex) | FAIL (의도) | 신규 모듈·컴포넌트 부재, 크기 보정·초기 스크롤 회귀 테스트 실패 확인 |
| `PATH=<ci-venv>/bin:$PATH npx jest` (최종) | PASS | 144 suites, 1454 tests |
| `npx tsc --noEmit --incremental false`, `npm run lint` | PASS | exit 0, no warnings |
| `npx playwright test` learn-reading, learn-keyboard, learn-practice, learn-home, console-quiet, application-smoke, playback-element-count, playback-note-names, hand-practice `--project=chromium --project="Mobile Chrome"` (최종) | PASS | 88 passed |

`learn-reading.spec.ts`가 고정하는 것: 200·h1 하나, pageerror·console error 0건(하이드레이션 포함), OSMD가 실제 SVG와 음표를 그림,
음 선택과 건반 클릭의 상호 반영, 샘플 요청을 모두 abort해도 동작, OSMD 청크를 abort하면 대체 글이 보이고 레슨이 계속 동작,
1280·320·390px에서 그림이 상자 안에 있고 로딩 전후 상자 위치·크기 동일, 320·390px에서 처음에 가운데 도 건반이 보이고 버튼으로 고른 건반이 보이는 범위로 옴,
음 선택 전후 건반 위치 불변(리뷰 수정).

## 화면 확인 (chromium 스크린샷)

- 1280px 전체: 음자리표·음표 위치·덧줄이 표준과 일치(높은음자리표 줄 미·솔·시·레·파, 가운데 도의 아래·위 덧줄).
- 1차 구현: 그림이 상자 왼쪽 위에 작게 그려지고 상자가 대부분 빈 공간 → 그림 경계를 측정해 고정 높이 상자 가운데에 확대 배치하도록 수정, 재촬영 확인.
- 390px: 인터랙티브 건반이 왼쪽 끝에서 시작해 선택된 가운데 도가 잘림 → L-2와 같은 스크롤 로직을 공용(`src/utils/keyboardScroll.ts`)으로 뽑아 적용.

## E2E 실패 이력 (모두 테스트 결함)

- 10건: 버튼을 이름 부분 일치로 찾아 건반 버튼과 `음 선택:` 버튼 두 개에 걸림 → 완전 일치.
- 2건: OSMD 청크 차단 테스트가 끝난 뒤 가로채기 핸들러가 늦은 요청에 `route.fetch` 호출 → `unrouteAll({ behavior: 'ignoreErrors' })`.

## main 병합 (`eb39e0a`)

PR219(L-3) 병합 후 main을 브랜치에 병합. 충돌 없음. 병합으로 바뀐 사실 하나: `practice`가 공개돼 악보 읽기 페이지의 다음 레슨이 연습 방법이 됨 → 페이지 테스트 한 줄 수정.

## 로컬 리뷰 (Codex `gpt-6-astra` high, read-only, Orca 터미널, 대상 `eb39e0a`)

음악 사실: 오류 없음(위 대조표의 리뷰어 대조 항목). 오디오 타이머 취소, OSMD 정리 경로, 기존 건반 경로, 스크롤 로직에서 확정 결함 없음.

| # | Finding | State | Handling |
|---|---|---|---|
| 1 | P2: 가운데 도 선택 여부에 따라 두 번째 악보가 삽입·제거돼 건반 위치가 움직임 | FIXED | `697301d`: 건반·선택 안내를 그림 위로 이동, 1280·390px에서 선택 전후 y 좌표 불변 E2E |
| 2 | P3: 그림의 접근성 이름과 캡션이 같아 긴 설명이 중복 낭독될 수 있음 | FIXED | `697301d`: 그림에는 짧은 이름, 상세 설명은 figcaption 하나에 연결 |
| 3 | P3: 둘째 덧줄·오선 밖 칸·`describeExample` 결과를 고정하는 테스트 부족 | FIXED | `697301d`: 둘째 덧줄·오선 밖 칸 6개와 `describeExample` 전체 문자열을 표준값으로 단언(기존 구현에서 통과) |

## Gaps and risks

- Firefox·WebKit·Mobile Safari E2E는 PR CI에 맡긴다(D-088).
- 스크린리더 실제 낭독, 실제 청취, 실기기 터치는 확인하지 않았다.
- OSMD는 페이지에서 예시마다 인스턴스를 만든다(8개). 저사양 기기의 로드 시간은 측정하지 않았다.
- 그림 여백 제거는 OSMD가 만든 SVG의 경계를 측정하는 방식이라 OSMD 버전이 바뀌면 E2E의 크기 단언이 먼저 깨진다(의도한 경보).
- 리뷰 수정 커밋은 로컬 재리뷰를 하지 않았다.

## PR CI 이후 추가 (2026-10-04, `b540a7f`)

- CI E2E가 Firefox에서 실패(`learn-reading.spec.ts:126`): 악보 그림을 측정 경계에 딱 맞춰 잘라내 Firefox의 1.1~1.6px 큰 경계가 밖으로 나감.
  잘라내는 영역에 사방 8 SVG 단위(화면 최소 4px) 여백을 두고, 그림이 최소 2px 안쪽에 있다는 단언을 추가. 허용치는 늘리지 않았다.
- hosted P2: 소리 실패 안내를 누른 버튼 아래에 표시. 폰에서 버튼이 화면 아래 끝이면 안내가 화면 밖이라 `scrollIntoView(nearest)` 추가(Mobile Chrome E2E로 발견).
- 로컬 재검증: Jest 1460/1460, tsc, lint PASS. E2E 8개 spec × 5개 프로젝트 203 passed / 6 failed / 6 skipped. 실패 6건은 webkit·Mobile Safari의 Tab 포커스 단언
  (macOS WebKit 설정, CI Linux WebKit에서는 통과). CI `b540a7f`: 전부 PASS(E2E 575 passed, 2 flaky).
- 교훈: 새 학습 페이지의 E2E는 PR 전에 로컬에서 Firefox로도 돌린다(L-4a 커밋 `b540a7f`의 Directive).
