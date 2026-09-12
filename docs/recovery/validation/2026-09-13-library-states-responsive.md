# Library states, responsive behaviour, keyboard focus and zoom — local validation

Date: 2026-09-13
Branch: `codex/issue-146-states-responsive`
Scope: issue 146 stage 4. 내 악보(`/library`)와 그 화면이 쓰는 공용 상태 표현(`Loading`,
`SheetMusicCard`, `StatusState`)만 다룬다. 탐색·업로드·플레이어는 stage 2·3이 이미 브라우저
측정을 남겼으므로(`explore-cards-responsive`, `upload-form-grouping`,
`playback-controls-responsive`) 이 슬라이스는 그 스펙들을 그대로 유지한 채 남은 화면을 덮는다.

## 왜 내 악보인가

stage 1(PR148)이 카드 폭·버튼 줄바꿈·정렬 표시를 고쳤지만, 그 판정은 사람이 화면을 본 기록이었다.
`/library`는 이슈 #146이 "우선 개선"으로 지목한 화면 중 **브라우저로 측정한 근거가 한 번도 남지
않은 유일한 화면**이었다. jest는 jsdom이라 레이아웃을 계산하지 않으므로 버튼이 실제로 44px인지,
플로팅 업로드 버튼이 문서 끝에서 카드 동작을 덮는지, 확대에서 문서가 가로로 넘치는지는 좌표를
재야만 답이 나온다.

## 회귀 근거가 구현보다 먼저 있었다

측정 훅(`data-testid="library-sheet-grid"`, `library-upload-fab`)만 먼저 넣고, 나머지는 손대지
않은 상태에서 새 테스트를 돌렸다.

jest — 8 failed / 11 passed / 19 total:

| 실패한 테스트 | 드러난 결함 |
|---|---|
| `Loading › announces that something is loading` (외 3건) | 로딩 상태에 `role`·이름이 없고 색이 `text-blue-600`/`text-gray-600` |
| `SheetMusicCard › names every action after the sheet it acts on` | `수정`만 곡명을 달고 주 동작·`이동`·`삭제`는 이름이 카드마다 동일 |
| `SheetMusicCard › keeps the processing action the same shape as the playable one` | 처리 중 버튼만 `flex-1`(무효) + `min-h-11` 없음 |
| `LibrarySheetMusicList › reports a failed load as a failure…` | 불러오기 실패가 빈 목록 화면으로 표시됨 |
| `LibrarySheetMusicList › retries the same query from the failure state` | 실패 상태에 다음 행동이 없음 |

같은 파일의 `does not hide a real failure behind the raw server message`는 변경 전에도 통과했다 —
결함 재현이 아니라 불변 조건(원시 서버 문구 비노출)을 고정하는 가드다.

Playwright `e2e/library-states-responsive.spec.ts` (chromium), 변경 전 — 11 failed / 3 passed:

- 6개 뷰포트 케이스 전부: `처리 중 높이가 44px 미만이다` — 실측 32px(확대 200%에서 64px 대 88px).
- `names the loading state…`: `role="status"` 요소가 존재하지 않음.
- `says the library could not be loaded instead of claiming it is empty`: `section[role="alert"]`
  없음 — 500 응답에서도 화면은 "악보가 없습니다"였다.
- `offers an upload action for an empty library…`: 빈 상태 카드 아래 빈 공간 1116px 대 화면
  844px(당시 판정식은 문서 전체 높이 1692px 기준이었다 — 아래 "측정이 바꾼 판단" 참조).
- `keeps the processing card action the same size as a playable one`, `gives every card action a
  name…`: 아래 표의 수치와 중복 이름 9건.

통과한 3건은 검색 결과 없음 상태, 키보드 도달·포커스 링, 제목 편집 대화상자 포커스다. **이미
올바르게 동작하던 것이고 계속 올바르게 유지돼야 하므로 남겨 둔다.**

## 크로미움에서 잰 값, 변경 전 → 후

카드 동작(주 동작) 높이·폭. 확대 케이스는 배율로 나눠 CSS px로 환산했다.

| 뷰포트 | ready | processing | failed | unknown |
|---|---|---|---|---|
| 320×800 | 44 / 246 | **32 / 64** → 44 / 246 | 44 / 246 | 44 / 246 |
| 390×844 | 44 / 316 | **32 / 64** → 44 / 316 | 44 / 316 | 44 / 316 |
| 844×390 | 44 / 348 | **32 / 64** → 44 / 348 | 44 / 348 | 44 / 348 |
| 1280×720 | 44 / 250 | **32 / 64** → 44 / 250 | 44 / 250 | 44 / 250 |
| 1440×900 | 44 / 250 | **32 / 64** → 44 / 250 | 44 / 250 | 44 / 250 |
| 1440×900 zoom200 | 44 / 278 | **32 / 64** → 44 / 278 | 44 / 278 | 44 / 278 |

관리 동작(`수정`/`이동`/`삭제`)은 변경 전에도 모든 뷰포트에서 44px였다 — stage 1이 고친 부분이
그대로 성립함을 이 측정이 처음으로 증명한다. 처리 중 상태만 32px였던 이유는 `flex-1`이 부모가
flex가 아니어서 아무 효과가 없었고 `min-h-11`이 빠져 있었기 때문이다. 폭 64px은 글자 폭이다.

문서 폭·높이와 플로팅 버튼 가림(문서 끝까지 스크롤한 상태):

| 뷰포트 | 가로 넘침 | 문서 높이(전 → 후) | FAB이 덮는 동작 |
|---|---|---|---|
| 320×800 | 없음 (320/320) | 2168 → 2180 | 없음 |
| 390×844 | 없음 (390/390) | 2168 → 2180 | 없음 |
| 844×390 | 없음 (844/844) | 1360 → 1360 | 없음 |
| 1280×720 | 없음 (1280/1280) | 1400 → **1034** | 없음 |
| 1440×900 | 없음 (1440/1440) | 1580 → **1211** | 없음 |
| 1440×900 zoom200 | 없음 (body 720/720) | 1580 → 1360 | 없음 |

가로 넘침은 변경 전에도 없었고 후에도 없다. 좁은 폭에서 문서가 12px 길어진 것은 처리 중 카드의
주 동작이 32 → 44px로 커진 결과다 — 한 칸 배치라 카드 높이가 그대로 더해진다. 넓은 화면에서
문서가 366~369px 짧아진 것은 중복된 `min-h-screen`을 걷어낸 결과다.

상태별:

| 상태 | 변경 전 | 변경 후 |
|---|---|---|
| 로딩 | `role="status"` 0개, 회전 아이콘 `text-blue-600` → `oklch(0.546 0.245 262.881)`, `aria-hidden` 없음, 읽을 문구 없음 | `role="status"` 1개, 이름 `불러오는 중`, 아이콘 `text-accent` → `rgb(168, 69, 42)`, `aria-hidden="true"` |
| 빈 목록 | "악보가 없습니다 / 연습할 PDF 악보를 올려 보세요. / 새 악보 업로드", 문서 1692px 대 화면 844px, 카드 아래 빈 공간 **1116px** | 같은 문구, 문서 1263px, 카드 아래 **687px** |
| 불러오기 실패(500) | 빈 목록과 **글자까지 동일** | "악보 목록을 불러오지 못했습니다 / 연결을 확인한 뒤 다시 시도해 주세요. 악보는 지워지지 않았습니다. / 다시 시도", `section[role="alert"]` 1개 |

`rgb(168, 69, 42)`는 `--ck-accent`다. 즉 로딩만 앱과 다른 강조색(파랑)을 쓰고 있었다.

## 측정이 바꾼 판단

**실패 상태의 조건은 처음 쓴 것보다 좁아야 했다.** `useSheetMusic`의 `error`를 그대로 읽어
실패 화면을 그리면, 제목 저장이나 삭제가 실패한 사람도 "악보 목록을 불러오지 못했습니다"를 본다 —
훅의 `error`가 조회·수정·삭제 실패를 한 칸에 모아 두기 때문이다. 원인을 잘못 말하는 것은 빈
상태로 말하는 것과 같은 결함이므로, 조건을 `loadError && 목록이 비어 있음`으로 좁혔다. 그 결과
저장 실패는 기존 인라인 안내를 그대로 유지하고, 목록을 이미 받아 둔 상태의 재조회 실패도 화면을
비우지 않는다. 이 판단은 `keeps the list when the failure was a save, not a load`로 고정했다.

**빈 상태 아래 한 화면이 비어 있던 원인은 카드 여백이 아니었다.** `MainLayout`이 이미
`min-h-screen`을 갖고 있는데 `/library`의 콘텐츠 영역이 같은 클래스를 한 번 더 갖고 있어서,
카드가 몇 장이든 화면 하나만큼이 목록 아래에 붙었다. 빈 상태에서 문서가 정확히 두 화면
(1692 = 844×2)이었던 것이 그 증거다. 다른 페이지에는 이 중복이 없다.

**판정식도 처음 쓴 것보다 날카롭게 고쳤다.** 처음에는 문서 전체 높이가 화면의 1.6배를 넘지
않는지를 봤는데, 그 배수는 근거가 없는 숫자이고 머리글·탭·검색처럼 정상적인 내용까지 함께
세게 된다. 실제 기준은 "내용이 끝난 뒤의 빈 공간이 한 화면을 넘지 않는다"이므로 빈 상태 카드
아래 공간을 직접 잰다. 같은 빌드에서 콘텐츠 영역에 `min-h-screen`을 다시 넣어 등가 상태를
만들어 비교했다: 카드 아래 **1116px**(화면 844px을 넘어 실패) → 제거 후 **687px**(통과).

남은 687px의 정체도 재 뒀다 — 컨테이너 하단 여백 96px, 실제 푸터 354px, 그리고 `MainLayout`의
`min-h-screen`이 머리글·푸터와 함께 쌓여 `main`에 남기는 약 237px이다. 마지막 항목은 모든
페이지에 걸린 전역 레이아웃 성질이고 `/library`만의 결함이 아니므로 이 슬라이스에서 건드리지
않는다 — 관찰로만 남긴다.

## 바꾸지 않은 것

- 필드·질의·정렬·검색·카테고리 이동·삭제 확인 대화상자·제출 동작은 그대로다. 보이는 글자도
  그대로이며, 달라진 것은 접근 가능한 **이름**(곡명이 앞에 붙는다)과 처리 중 버튼의 크기다.
- `아직 남은 관찰`: `ConfirmDialog`(삭제 확인)는 `bg-white`·`bg-gray-500`·`red-*` 등 원시
  팔레트를 쓰고 있어 이슈 #146의 공통 시각 규칙과 어긋난다. 이 이슈의 화면 표는 기존 확인
  대화상자를 보존하라고 적고 있고, 이 컴포넌트는 카테고리 관리 등 stage 4 범위 밖 화면도 함께
  쓴다. 그래서 이번에 고치지 않고 관찰로 남긴다 — 고친 것으로 기록하지 않는다.
- `availability === 'unknown'`이 "확인 필요" 배지와 함께 "다시 업로드"를 주 동작으로 내는 것도
  그대로 뒀다. 동작을 바꾸는 판단이므로 상태 검증 슬라이스에서 조용히 바꾸지 않는다.

## 명령과 결과

| 명령 | 결과 |
|---|---|
| `npx jest src/components/library src/components/sheet src/components/ui` | 52/52 pass (8 suites) |
| `npm run lint` | 0 warnings, 0 errors |
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | success |
| `npx jest --runInBand` | 1020 passed, 1 failed |
| `CI=1 npx playwright test` | 229 passed, 1 flaky, 0 failed (5 browser projects, 230 cases) |
| `npx playwright test e2e/library-states-responsive.spec.ts` | 70/70 pass (5 browser projects) |

새 스펙만 따로 돌린 마지막 줄은 판정식을 위처럼 고친 뒤의 결과다. `CI=1` 전체 실행은 그 직전
코드 상태를 대상으로 했고, 그 사이 변경은 스펙 파일 하나뿐이다.

`CI=1` 실행의 flaky 1건은
`[webkit] playback-session-transition.spec.ts › keeps the frame and the transport in place across a
pause on phone portrait`로, 이 슬라이스가 건드리지 않은 기존 스펙이며 재시도에서 통과했다.

`npx jest --runInBand`의 단일 실패는 `src/ci/__tests__/omrCallbackDelivery.test.ts`로, Python
스위트를 셸로 호출하다가 이 기계에서 `ModuleNotFoundError: No module named 'fastapi'`로 실패한다.
이 변경과 무관한 환경 격차이며 PR155·PR157에서 같은 사실이 기록됐다 — 해당 스위트의 권위는
의존성을 설치하는 CI 잡이다.

`npx playwright test`를 기본 병렬(로컬 5 worker)로 돌렸을 때 firefox에서 8건이 실패한 적이
있다(application-smoke 5건, explore-cards 2건, playback-session 1건 — 모두 이 슬라이스가 건드리지
않은 스펙이다). 같은 프로젝트를 단독으로 돌리면 46/46 통과하고, CI와 같은 설정
(`workers: 1`, `retries: 2`)으로 전체를 돌린 두 번은 각각 230/230 통과, 그리고 229 통과 + flaky
1건이었다. 이 기계의 병렬 경합으로 판단하되, **초록으로 덮지 않고 여기 남긴다** — 호스티드 E2E
잡이 이 항목의 권위다.

## 검증하지 않은 것

실기기 터치, 실제 가로 방향 하드웨어, 브라우저 자체의 확대(CSS zoom은 media query를 다시 평가하지
않는다), 스크린리더의 실제 출력, 계측된 색 대비, 실제 로그인 흐름. E2E는 D-058 선례대로 세션
쿠키를 발급해 화면을 띄우기만 하며 인증에 대해 아무것도 주장하지 않는다.
