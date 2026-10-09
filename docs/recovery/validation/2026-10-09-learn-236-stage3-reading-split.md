# Validation — LEARN-236 / 3단계 악보 읽기 분리와 전환형 예시 패널

Date: 2026-10-09
Commit: `4f3861c` (브랜치 `codex/learn-236-reading-split`, 코드 커밋 `82a516a`·`3b366c5`·`4f3861c`, 문서 커밋 `73fd398`)
Environment: macOS, production 빌드(`npm run build` 뒤 `npm start`), `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 DATABASE_URL=postgresql://test:test@localhost:5432/clairkeys_test`, Playwright Chromium·Firefox

## Claim being verified

이슈 [#236](https://github.com/landfill/ClairKeys/issues/236) 3단계(개편안 B, 결정 D-099):
악보 읽기가 `/learn/reading`(악보 읽기 1, 음높이)과 `/learn/reading/rhythm`(악보 읽기 2, 길이와 박자)으로 나뉘고 단계 지도가 5단계다.
나눈 두 페이지는 각각 1280×800에서 4화면(3200px), 390×844에서 5화면(4220px) 이하다.
악보 읽기 2의 예시는 전환형 패널(선택 버튼 `aria-pressed`, 그림과 대체 설명 갱신, 선택을 바꿔도 패널 높이 불변)이다.
옮겨 간 앵커 4개를 가리키는 저장소 안 링크가 새 경로에 닿는다. `/learn` 아래 링크·버튼은 44×44px 이상이다(문장 안 링크는 높이, 검은 건반 폭 예외).
레슨 문장·예시 데이터·소리는 바뀌지 않았다.

## Commands and results

최종 트리(`4f3861c`)에서 실행했다.

| 명령 | 결과 |
|---|---|
| `PATH=<ci-venv>/bin:$PATH PYTHON_BIN=<ci-venv>/bin/python3 npx jest` | 165 suites, 1626 tests PASS |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS (`/learn/reading`, `/learn/reading/rhythm` 모두 정적 페이지) |
| `npx playwright test e2e/learn-*.spec.ts e2e/sheet-song-intro.spec.ts e2e/console-quiet.spec.ts e2e/playback-element-count.spec.ts --project=chromium --project=firefox` | 295 passed, 3 skipped(기존 `test.skip`: 모바일 전용·측정 환경 전용) |
| `npx playwright test e2e/learn-reading.spec.ts e2e/learn-reading-rhythm.spec.ts --project=chromium --project=firefox --repeat-each 4` | 232 passed |
| `node local-test-data/results/learn-236/measure.mjs http://localhost:3000 <dir> /learn/reading /learn/reading/rhythm /learn` | 아래 표 |

수정 전 실패 확인(워커 보고, 구현 전 Jest): 레슨 5개·이전/다음·홈 카드 단언 17건 FAIL, 새 패널 테스트는 모듈 없음으로 FAIL.
리뷰 수정의 새 Jest도 구현 전 실패를 확인했다(선택 전환 시 `stopAudio` 미호출, 상태 칸 없음, 실패·진행 문단이 같은 행).

## 변경 전후 계측

변경 전은 2단계 병합 뒤 main(`abb7cd0`)의 값([2단계 기록](2026-10-09-learn-236-stage2-lesson-layout.md)), 변경 후는 로컬 production 빌드(Chromium)다.
"폭 44px 미만"은 학습용 피아노의 검은 건반(26×113px, 완료 조건의 확정 예외)을 뺀 수다.

| 페이지·뷰포트 | 문서 높이 전 | 문서 높이 후 | 기준 | 높이 44px 미만 전 → 후 | 폭 44px 미만 후 | 가로 넘침 |
|---|---|---|---|---|---|---|
| `/learn/reading` 1280×800 | 7998px (10.0화면) | 2803px (3.5) | 3200px 이하 ✔ | 35 → 0 | 0 | 0 |
| `/learn/reading/rhythm` 1280×800 | (없음) | 2867px (3.6) | 3200px 이하 ✔ | — → 0 | 0 | 0 |
| `/learn/reading` 390×844 | 9357px (11.1화면) | 4110px (4.9) | 4220px 이하 ✔ | 35 → 0 | 0 | 0 |
| `/learn/reading/rhythm` 390×844 | (없음) | 3694px (4.4) | 4220px 이하 ✔ | — → 0 | 0 | 0 |
| `/learn` 1280×800 | 1484px (1.9) | 1728px (2.2) | 기준 없음 | 0 → 0 | 0 | 0 |
| `/learn` 390×844 | 2306px (2.7) | 2522px (3.0) | 기준 없음 | 0 → 0 | 0 | 0 |

- 두 페이지 모두 높이 기준을 충족한다. **`/learn/reading` 390×844의 여유는 110px뿐이다.** 글꼴이나 문장이 조금만 달라져도 넘을 수 있다. E2E로 고정하지 않았다(글꼴에 따라 달라지는 값이라 CI에서 흔들린다).
- 구현 중간값: 첫 구현은 `/learn/reading` 390×844가 4488px로 기준을 넘었다. 음표가 하나뿐인 그림 두 쌍(가운데 도의 두 자리표, 탐색기에서 가운데 도를 골랐을 때의 두 그림)을 좁은 화면에서도 2열로 놓아 4110px이 됐다. 320px 폭에서도 그림이 틀 안에 맞는다(틀 138px, svg 112px).
- `/learn/reading/rhythm`은 리뷰 수정으로 늘었다: 3390px → 3582px(상태 칸 자리 확보) → 3694px(실패 문구와 진행 문구를 두 행으로). 1280×800은 2643 → 2755 → 2867px.
- `/learn` 홈은 레슨 카드가 4개에서 5개가 되어 늘었다(홈 길이 기준은 없다).
- `음 선택` 15개(50×34)와 `들어 보기` 버튼(높이 38)이 44px 이상이 되어, 2단계에서 남긴 E2E 예외를 지웠다. 남은 예외는 검은 건반 폭뿐이다.
- 동시에 그려지는 악보 그림: 21개 → 악보 읽기 1은 8개(나란히 6 + 탐색기 2), 악보 읽기 2는 4개.

## 문장·데이터 보존 확인

- 옛 `src/app/learn/reading/page.tsx`(main)의 `<p>…</p>` 21개를 새 두 페이지와 문자열 그대로 비교했다. 빠지거나 바뀐 문단 0, 새 문단 0.
  차이는 예시 제목 템플릿 `<p …>{example.title}</p>` 하나다(옛 `RhythmExamples`에 있던 것). 리듬 예시의 제목은 선택 버튼의 글자가 됐다.
- `음표 길이 비교` 표는 없어졌다. 표의 6행(온음표 4박, 2분음표 2박, 4분음표 1박, 8분음표 반 박, 점2분음표 3박, 점4분음표 1박 반)은 두 패널의 선택 버튼 6개에 글자 그대로 있고, 접근 가능한 이름은 `온음표, 4박` 형식이다(Jest가 6개 이름을 문자열로 단언).
- `src/lib/learn/reading.ts`·`rhythm.ts`는 바뀌지 않았다. `ReadingAudio.tsx`는 재생 방식(빠르기·음높이·일정)을 바꾸지 않고, 버튼이 사라질 때 자기 재생을 멈추는 `stop`과 상태 칸 자리 확보만 더했다.

## 구현 중 드러난 문제와 처리

| 문제 | 찾은 곳 | 처리 |
|---|---|---|
| `/learn/reading` 390×844가 4488px(기준 4220px) | 오케스트레이터 계측 | 음표 하나짜리 그림 두 쌍을 좁은 화면에서도 2열(`82a516a`) |
| 악보 읽기 1의 그림 수를 지시문이 7개로 적음(실제 8개) | 오케스트레이터 E2E 6건 실패 | 지시문 오류. 탐색기가 가운데 도에서 그림 2개를 그린다. 단언을 8로 |
| 악보 읽기 2의 끝 문단이 본문 범위 표식 밖이라 문장 안 링크 검사 대상이 0개 | 오케스트레이터 E2E 6건 실패 | 끝 문단을 `data-lesson-prose`로 감쌈 |
| 워커 보고서가 추가했다고 적은 E2E(나란히 배치, 옮겨 간 앵커)가 spec에 없음 | 오케스트레이터가 spec 대조 | 추가. 옛 spec의 오디오 실패 글 위치 검사 중 리듬 쪽도 옮김 |
| 박 수 버튼의 이름이 `온음표4박`으로 붙어 읽힘 | 오케스트레이터 | `sr-only` 쉼표 + 같은 글자의 `aria-label` |
| 선택을 바꿔도 이전 예시의 소리가 계속 남 | 로컬 Codex 리뷰 | 버튼이 사라질 때 자기 재생을 멈춤(`3b366c5`) |
| 재생·준비·실패 상태에 따라 패널 높이가 달라짐 | 로컬 Codex 리뷰 | 상태 칸 자리를 보이지 않는 사본으로 확보(`3b366c5`) |
| 리듬 그림 13개 중 9개의 박자표·기하 검증이 빠짐 | 로컬 Codex 리뷰 | rhythm spec에서 13개를 차례로 선택하며 옛 단언 복원(`3b366c5`) |
| 가운데 도 쌍의 좁은 화면 간격이 12px이 아니라 20px | 로컬 Codex 리뷰 | 중복 `gap` 클래스 정리(`3b366c5`) |
| 수정에서 더한 E2E 3종이 테스트 전제 오류로 실패(스크롤 뒤 뷰포트 좌표, 숨긴 사본에 걸린 글자 선택자, 남은 선택 상태) | 오케스트레이터 E2E | spec 수정(`3b366c5`) |
| 오디오 실패 시 실패 문구와 재생 차례가 같은 칸에 겹침 | 로컬 Codex 재리뷰 | 상태 칸을 두 행으로(`4f3861c`) |
| 고정 1500ms 대기가 오디오 취소를 입증하지 못함 | 로컬 Codex 재리뷰 | 대기를 지우고 E2E 범위를 진행 문구로 한정, 취소는 Jest가 검사(`4f3861c`) |

## Baseline comparison

- Fixed failures: 없음(기존 실패 없음).
- Remaining pre-existing failures: 없음.
- New failures: 없음.

## Manual checks

- 로컬 production 빌드에서 두 페이지 전체 화면(1280×800, 390×844)과 `음표의 길이` 패널, 가운데 도 2열 배치를 캡처해 확인했다(오케스트레이터).
- 로컬 리뷰: Codex `gpt-6.1-sol` reasoning `high`, 읽기 전용, 2회. 1차 medium 3건·low 1건, 재리뷰는 1차 4건을 모두 "해결됨"으로 판정하고 medium 1건·low 1건을 새로 지적. 모두 수정했다. `4f3861c`에 대한 3차 로컬 리뷰는 하지 않았다.

## Gaps and risks

- 로컬 Playwright는 Chromium·Firefox만 돌렸다. WebKit·Mobile Chrome·Mobile Safari·`Firefox keyboard`는 PR CI가 맡는다.
- **PR E2E의 30분 제한.** 이 단계는 E2E를 더 늘린다(두 reading spec이 합쳐 프로젝트당 29개). 2단계 마지막 head는 1124개로 3회 중 2회 취소됐다.
- 소리가 실제로 멈추는지는 듣지 않았다. Jest의 일정 재생기 mock(`stopAudio` 호출)과 E2E의 진행 문구로만 확인했다.
- 스크린리더 실기, 실기기 터치는 하지 않았다. 보이지 않는 사본(대체 설명, 상태 문구)은 `aria-hidden`이지만 페이지 안 찾기(Ctrl+F)에는 걸린다.
- 옛 해시 주소(`/learn/reading#meters` 등)로 들어오면 그 섹션이 없어 페이지 맨 위에 머문다(사용자 결정 3번: 저장소 안 링크만 고친다).
- 구현 전부를 Gemini 3.8 Flash가 했다. 첫 보고서에 실제 코드와 다른 서술이 여러 곳 있었고(없는 테스트, 화면에 없는 박 수 표기), 검증에서 네 번 되돌려 보냈다. 같은 종류의 잔여 실수 가능성이 있다.
