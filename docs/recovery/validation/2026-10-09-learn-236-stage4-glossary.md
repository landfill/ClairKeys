# Validation — LEARN-236 / 4단계 용어 사전 찾기·필터·조밀한 배치, 레슨 본문의 용어 링크

Date: 2026-10-09
Commit: `7fc2f35` (브랜치 `codex/learn-236-glossary`, 코드 커밋 `6b2d61c`·`48c1483`, 문서 커밋 `23f9bb6`·`7fc2f35`)
Environment: macOS, production 빌드(`npm run build` 뒤 `npm start`), `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 DATABASE_URL=postgresql://test:test@localhost:5432/clairkeys_test`, Playwright Chromium·Firefox

## Claim being verified

이슈 [#236](https://github.com/landfill/ClairKeys/issues/236) 4단계(개편안 C, 결정 D-100):
용어 사전의 찾기 입력에 두 글자를 넣으면 해당 용어가 첫 화면 안에 보인다(1280×800, 390×844). 필터 없이도 1280×800에서 3화면(2400px) 이하다.
링크·버튼·입력은 44×44px 이상이다(검은 건반 폭 예외). 용어 사전의 모든 레슨 링크가 실제 섹션에 닿고, 레슨 본문의 모든 용어 링크가 사전의 실제 항목에 닿는다.
320 CSS px에서 가로 넘침이 없다. 찾기·분류 상태는 저장되지 않는다. 용어 이름·정의·순서와 레슨 문장은 바뀌지 않았다.

## Commands and results

코드의 최종 트리(`48c1483`)에서 실행했다. `7fc2f35`는 `DECISIONS.md` 문구만 바꾼다.

| 명령 | 결과 |
|---|---|
| `PATH=<ci-venv>/bin:$PATH PYTHON_BIN=<ci-venv>/bin/python3 npx jest` | 168 suites, 1642 tests PASS |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npx playwright test --project=chromium --project=firefox`(전체 스위트) | 502 passed, 10 skipped(기존 `test.skip`) |
| `npx playwright test e2e/learn-glossary.spec.ts e2e/learn-lesson-layout.spec.ts`(6개 프로젝트, `6b2d61c` 트리) | 368 passed, 2 failed — `category chips filter by keyboard…`의 `toBeFocused`가 `webkit`·`Mobile Safari`에서 실패. macOS WebKit의 Tab 포커스 설정 탓으로 알려진 한계다(CI Linux에서 확인한다) |
| `node local-test-data/results/learn-236/measure.mjs http://localhost:3000 <dir> /learn/glossary /learn/reading /learn/reading/rhythm /learn/keyboard /learn/hands /learn/practice` | 아래 표 |

수정 전 실패 확인(워커 보고, 구현 전 Jest): 용어 id·도우미 10건 FAIL, 새 컴포넌트 두 테스트는 모듈 없음으로 FAIL, 다섯 레슨 페이지의 용어 링크 단언 5건 FAIL.

## 변경 전후 계측

변경 전은 이슈 본문의 운영 계측값, 변경 후는 로컬 production 빌드(Chromium)다.

| 페이지·뷰포트 | 문서 높이 전 | 문서 높이 후 | 기준 | 44px 미만(검은 건반 폭 제외) | 가로 넘침 |
|---|---|---|---|---|---|
| `/learn/glossary` 1280×800 | 4174px (5.2화면) | 2265px (2.8) | 2400px 이하 ✔ | 0 | 0 |
| `/learn/glossary` 390×844 | 4948px (5.9화면) | 3731px (4.4) | 기준 없음 | 0 | 0 |
| `/learn/reading` | 2803 / 4110px | 2803 / 4110px | 3200 / 4220px ✔ | 0 | 0 |
| `/learn/reading/rhythm` | 2867 / 3694px | 2867 / 3694px | 3200 / 4220px ✔ | 0 | 0 |
| `/learn/keyboard` | — | 1432 / 1694px | 기준 없음 | 0 | 0 |
| `/learn/hands` | — | 1907 / 2508px | 기준 없음 | 0 | 0 |
| `/learn/practice` | — | 2193 / 2878px | 기준 없음 | 0 | 0 |

- 두 글자 찾기: `박자`를 넣으면 `용어 4개`(박자표, 마디, 메트로놈, 준비 박자)이고, `박자표` 제목의 아래 끝은 스크롤하지 않은 상태에서 1280×800·390×844 모두 화면 위에서 약 450px 안이다(수정 전 실측 488px, 그 뒤 위쪽 영역이 40px 낮아졌다). E2E가 `scrollY === 0`에서 `toBeInViewport`로 단언한다.
- 위에 붙는 영역(찾기 입력 + 칩)은 145px다. 항목과 그룹 제목의 스크롤 여백은 160px다. 뷰포트 높이 600px 미만에서는 붙지 않는다.
- 레슨 본문에 링크 23개를 더했지만 다섯 레슨의 높이는 3단계 값과 같다. `/learn/reading` 390×844의 여유는 여전히 110px다.
- 본문 용어 링크의 눌리는 영역: 두세 글자 용어는 좌우 8px씩 넓혀 44×49px 이상(넓히기 전 `오선`·`덧줄`·`마디` 28×49, `큰보표`·`온음표`·`온쉼표`·`세로줄`·`박자표` 42×49). 네 글자 이상은 넓히지 않는다.

## 문장·데이터 보존 확인

- `src/lib/learn/glossary.ts`의 `name`·`definition`·`href` 순서열 25개를 main과 문자열 그대로 비교했다. 같다. id 25개는 서로 다르고 그룹 id와 겹치지 않는다.
- 다섯 레슨 파일(`KeyboardLesson.tsx`, `reading/page.tsx`, `reading/rhythm/page.tsx`, `hands/page.tsx`, `practice/page.tsx`)에서 `<GlossaryTermLink …>`·`</GlossaryTermLink>`와 import 한 줄을 벗기면 main의 파일과 바이트가 같다.
- 용어 링크 23개: 건반 1(`가운데 도`), 악보 읽기 1 6(`오선`, `높은음자리표`, `낮은음자리표`, `덧줄`, `가운데 도`, `큰보표`), 악보 읽기 2 8(`4분음표`, `온음표`, `2분음표`, `8분음표`, `온쉼표`, `세로줄`, `마디`, `박자표`), 손 3(`가운데 도`, `손가락 번호`, `한 손 연습`), 연습 방법 5(`재생 속도`, `기다리기 모드`, `A-B 구간 반복`, `메트로놈`, `준비 박자`). 용어마다 본문 문단의 첫 등장 줄과 감싼 줄이 같은지 스크립트로 대조했다.
- 걸지 않은 것: 악보 읽기 1의 `계이름`, 연습 방법의 `계이름`·`가운데 도`. 그 글자가 나오는 유일한 본문 문단에 이미 건반 레슨 링크가 있다(D-100).

## 구현 중 드러난 문제와 처리

| 문제 | 찾은 곳 | 처리 |
|---|---|---|
| 용어 사전 1280×800이 2518px(기준 2400px). 워커 예상은 약 1750px | 오케스트레이터 계측 | 항목 안쪽 여백·간격을 줄이고 결과 수를 라벨 줄로 옮김 → 2265px(`6b2d61c`) |
| 위에 붙는 영역이 185px인데 스크롤 여백은 160px이라 해시로 들어온 항목 제목이 8.5px 가려짐. 워커 예상은 151px | 오케스트레이터 E2E | 영역을 145px로 낮춤(`6b2d61c`) |
| 가로로 눕힌 폰에서 붙는 영역이 화면의 1/3 이상을 덮음 | 오케스트레이터 | 뷰포트 높이 600px 이상에서만 붙임(`6b2d61c`) |
| 두세 글자 용어 링크의 폭이 28~42px | 오케스트레이터 계측 | 좌우 패딩과 같은 크기의 음수 여백(`6b2d61c`) |
| 연습 방법 레슨의 세 용어를 첫 등장이 아닌 문단에 걺 | 오케스트레이터 대조 | 첫 등장 문단으로 옮김(`6b2d61c`) |
| E2E 전제 오류: 푸터의 `h2`까지 셈, `localStorage`가 비어 있다고 단언(`nextauth.message`가 항상 있음) | 오케스트레이터 E2E | `main` 안으로 좁힘, 입력한 글자가 저장소·쿠키·주소에 없는지로 바꿈(`6b2d61c`) |
| 수정 지시 1의 전제 오류: 저장소 키 목록 전후 비교(`nextauth.message`가 로드 뒤 늦게 쓰임) | 오케스트레이터 E2E | 키 비교를 없앰(`6b2d61c`) |
| 이웃한 두 용어 링크(`메트로놈, 준비 박자`)의 눌리는 영역이 겹침 | 로컬 Codex 리뷰 | 세 글자 이하 용어만 넓힘(`48c1483`) |
| 칩 줄 양끝의 포커스 윤곽선이 스크롤 경계에 잘림 | 로컬 Codex 리뷰 | 칩 줄에 가로 여유 4px(`48c1483`) |
| 저장 금지 검증이 분류 선택과 필터가 걸린 채의 새로 고침을 보지 않음 | 로컬 Codex 리뷰 | E2E·Jest 보강(`48c1483`) |
| D-100 서술이 붙는 조건·링크 제외 조건을 빠뜨림 | 로컬 Codex 리뷰 | 문구 수정(`7fc2f35`) |

## Baseline comparison

- Fixed failures: 없음(기존 실패 없음).
- Remaining pre-existing failures: 없음.
- New failures: 없음.

## Manual checks

- 로컬 production 빌드에서 `/learn/glossary` 전체 화면(1280×800)을 캡처해 배치를 확인했다(오케스트레이터).
- 로컬 리뷰: Codex `gpt-6.1-sol` reasoning `high`, 읽기 전용, 1회(`6b2d61c`·`23f9bb6`). medium 4건·low 1건 가운데 4건 수정, 1건 기각([리뷰 로그](../reviews/)의 해당 PR 참고). `48c1483`에 대한 재리뷰는 하지 않았다.

## Gaps and risks

- 로컬 전체 E2E는 Chromium·Firefox만 돌렸다. 나머지 프로젝트는 PR CI가 맡는다. 칩의 Tab 포커스는 macOS WebKit에서 확인하지 못했다.
- E2E `test()`가 프로젝트당 2개 늘었다(253 → 255, 6개 프로젝트 1281개 예상). 최근 실행은 29~35분이고 제한은 45분이다.
- 필터가 걸린 상태에서 주소의 해시만 손으로 바꾸면 걸러진 항목에는 닿지 않는다. 페이지 안에 해시 링크가 없고 다른 경로에서 들어오면 필터가 빈 상태라 고치지 않았다(리뷰 지적 기각).
- 칩 줄의 스크롤바를 숨겼다. 390px 이하에서 마지막 칩(`재생과 연습`)이 잘려 보이는 것이 더 있다는 유일한 단서다.
- 한글 입력기 조합 중의 걸러짐(자모 단계에서 결과 0이 잠깐 보이는지), 스크린리더의 결과 수 읽기, 실기기 터치는 확인하지 않았다.
- 구현 전부를 Gemini 3.8 Flash가 했다. 첫 보고서의 예상 높이 두 값이 실측과 크게 달랐고, 검증에서 두 번·리뷰 뒤 한 번 되돌려 보냈다. 같은 종류의 잔여 실수 가능성이 있다.
