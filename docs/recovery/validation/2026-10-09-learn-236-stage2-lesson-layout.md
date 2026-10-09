# Validation — LEARN-236 / 2단계 공통 레슨 레이아웃

Date: 2026-10-09
Commit: `6eb4bd1` (코드), 브랜치 head `c176ff0` (브랜치 `codex/learn-236-lesson-layout`)
Environment: macOS, production 빌드(`npm run build` 뒤 `npm start`), `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`, Playwright Chromium·Firefox

## Claim being verified

이슈 [#236](https://github.com/landfill/ClairKeys/issues/236) 2단계(개편안 D): 네 레슨에 상단 위치 표시가 있고, 섹션 4개 이상인 레슨은 어느 스크롤 위치에서도 두 번 이하의 조작으로 다른 섹션에 가며,
이전·다음 이동과 본문 링크·버튼의 높이가 44px 이상이고, 본문은 16px 본문색이다. 레슨 문장·섹션 id·레슨 이동 링크의 이름은 그대로다.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| 수정 전 `npx jest src/app/learn src/lib/learn src/components/learn` (구현 워커) | FAIL(의도) | 6 suites·7 tests 실패: `nav "현재 위치"`·`nav "이 레슨의 내용"` 없음, `LessonToc` 모듈 없음 |
| `PATH=<ci-venv>/bin:$PATH npx jest` (오케스트레이터, `6eb4bd1`의 구현 트리) | PASS | 163 suites, 1614 tests |
| `npx tsc --noEmit --incremental false` | PASS | exit 0 |
| `npm run lint` | PASS | No ESLint warnings or errors |
| `npm run build` | PASS | Compiled successfully |
| `npx playwright test e2e/learn-lesson-layout.spec.ts --project=chromium --project=firefox --repeat-each=5` | PASS | 470 passed (47 tests × 2 브라우저 × 5회) |
| `npx playwright test e2e/learn-{keyboard,reading,hands,practice,glossary,home,course}.spec.ts e2e/sheet-song-intro.spec.ts e2e/playback-element-count.spec.ts --project=chromium --project=firefox` | PASS | 106 passed, 2 skipped |
| 레슨 문장 전후 비교(오케스트레이터 스크립트: JSX에서 한글 문장 추출해 `main`과 대조) | PASS | `hands`·`practice`·`reading` 페이지, `KeyboardLesson`·`HandsKeyboard`에서 사라진 문장 0, 새 문장 0 |
| `node local-test-data/results/learn-236/prose.mjs` (본문·보조 문단 전수 점검) | PASS | 본문 문단 42개 모두 16px, 보조(`data-lesson-note`) 문단 모두 14px, 본문 최대 폭 45em |
| `node local-test-data/results/learn-236/measure.mjs` (운영·로컬) | 아래 표 | Chromium, `networkidle` 뒤 1.5초 |

## 변경 전후 계측

변경 전은 운영(main `9d98d65`와 같은 레슨 화면, 2026-10-09 재계측. 이슈 본문의 값과 같다), 변경 후는 로컬 production 빌드다.
"폭 44px 미만"은 학습용 피아노의 검은 건반(26×113px, 완료 조건의 확정 예외)을 뺀 수다.

| 페이지·뷰포트 | 문서 높이 전 | 문서 높이 후 | 높이 44px 미만 전 | 후 | 폭 44px 미만 전 | 후 | 가로 넘침 |
|---|---|---|---|---|---|---|---|
| `/learn/keyboard` 1280×800 | 1138px (1.4화면) | 1432px (1.8) | 5 | 0 | 0 | 0 | 0 |
| `/learn/reading` 1280×800 | 7594px (9.5) | 7998px (10.0) | 42 | 35 | 1 | 0 | 0 |
| `/learn/hands` 1280×800 | 1449px (1.8) | 1907px (2.4) | 8 | 0 | 0 | 0 | 0 |
| `/learn/practice` 1280×800 | 1557px (1.9) | 2193px (2.7) | 4 | 0 | 0 | 0 | 0 |
| `/learn/keyboard` 390×844 | 1362px (1.6) | 1694px (2.0) | 5 | 0 | 0 | 0 | 0 |
| `/learn/reading` 390×844 | 8640px (10.2) | 9357px (11.1) | 42 | 35 | 1 | 0 | 0 |
| `/learn/hands` 390×844 | 1933px (2.3) | 2508px (3.0) | 8 | 0 | 0 | 0 | 0 |
| `/learn/practice` 390×844 | 2085px (2.5) | 2878px (3.4) | 4 | 0 | 0 | 0 | 0 |

- **모든 레슨의 문서 높이가 늘었다**(17~38%). 본문이 14px에서 16px가 되고 글 폭을 45rem으로 제한했으며, 상단 위치 표시·`해 보기` 줄·이전/다음 카드·`practice` 섹션 머리가 더해졌기 때문이다.
  `/learn/reading`은 10.0 / 11.1화면으로, 완료 조건(나눈 두 페이지 각각 4 / 5화면 이하)에서 더 멀어졌다. 이 조건은 3단계(페이지 분리와 전환형 패널) 대상이다.
- `/learn/reading`에 남은 높이 44px 미만 35개는 전부 3단계에서 다시 만드는 버튼이다: `음 선택` 15개(50×34), `들어 보기` 20개(높이 38). E2E가 이 수를 종류별로 단언한다(3단계에서 깨지면 예외를 걷어낸다).
- 이전·다음 링크: 20px 글자 링크 → 448×76(데스크톱), 358×76(모바일). 위치 표시의 `배우기` 링크 44×44.
- 문장 안 링크 7개는 inline 세로 padding으로 상자 높이 44px 이상이고, 링크가 든 문단의 줄 간격은 다른 문단과 같다.

## 구현 중 드러난 문제와 처리

| 문제 | 어떻게 드러났나 | 처리 |
|---|---|---|
| 데스크톱 현재 섹션 표시가 멈춤(`IntersectionObserver` `rootMargin` %는 폭 기준이라 1280×800에서 관찰 영역이 빔) | 로컬 Codex 리뷰. 캡처로는 "문서 끝 → 마지막 섹션" 보정 때문에 정상처럼 보였다 | 제목 위치로 계산하는 순수 함수 `getActiveSectionIndex`로 교체(`1ab3b06`) |
| 위로 스크롤하면 표시가 돌아오지 않음 | 로컬 Codex 리뷰 | 같은 계산으로 해결. E2E가 정·역방향을 섹션마다 단언 |
| 스크립트 없이 좁은 화면에서 열린 목차가 도착한 제목을 가림 | 로컬 Codex 리뷰 | sticky·겹침 패널은 스크립트가 동작할 때(`data-enhanced`)만. 스크립트를 끈 컨텍스트의 E2E 추가 |
| 목차를 연 직후 누른 Escape가 무시됨 | 오케스트레이터 E2E(Chromium에서 항상) | Escape를 `details`의 `onKeyDown`으로 처리(`1ab3b06`) |
| 고른 섹션이 위로 스크롤했다 돌아오면 되살아남 | 로컬 Codex 재리뷰 | 문서 끝을 벗어나면 선택 해제(`6eb4bd1`) |
| hydration 전에 목차를 열어 두면 enhancement 순간 본문이 튐 | 로컬 Codex 재리뷰(소스 기준 추론) | 열려 있는 동안 enhancement를 미룸(`6eb4bd1`). Jest로만 고정 |
| Firefox에서 해시 진입 뒤 목차를 열면 `scrollY`가 400px 움직임 | 오케스트레이터 E2E | **제품 결함이 아님.** `locator.click()`에서만 재현(4~8/8)되고 좌표 클릭·키보드·`details.open = true`에서는 0/8. E2E는 `clickAtCenter`로 누른다 |

## GitHub 리뷰 수정 (`3a3515a`, 2026-10-09)

[PR240](../reviews/PR-240.md) R1·R2와, 그 수정이 만든 포커스 윤곽선 잘림(R3)을 한 커밋으로 고쳤다. 구현은 Gemini 3.8 Flash, 검증은 오케스트레이터.

| 순서 | 명령 | 결과 |
|---|---|---|
| 수정 전 재현 | `npx jest src/components/learn`(워커, 구현 전) | 새 테스트 2건 FAIL: `URIError: URI malformed` (`LessonToc.tsx:93`) |
| 수정 전 재현 | `c176ff0` production 빌드 + `npx playwright test e2e/learn-lesson-layout.spec.ts --project=chromium -g "잘못된 해시\|1024x400"` | 2건 FAIL: 목차 아래 끝 484px > 400.5px / 잘못된 해시에서 `details[data-enhanced]` 0개(레슨이 오류 화면으로 바뀜) |
| 수정 전 재현 | R1·R2만 고친 빌드 + `-g "포커스 윤곽선"` | 2건 FAIL: 왼쪽 여유 0px < 3.5px (1280×800, 1024×400) |
| 수정 후 | 전체 Jest(CI venv) | 163 suites, 1616 tests PASS |
| 수정 후 | `npx tsc --noEmit --incremental false`, `npm run lint` | PASS |
| 수정 후 | `npm run build` | PASS |
| 수정 후 | `npx playwright test e2e/learn-*.spec.ts --project=chromium --project=firefox` | 196 passed |
| 수정 후 | 새 E2E 4건 `--repeat-each 8`, Chromium + Firefox | 64 passed |

- 화면 확인: 옆 목차 첫 링크에 포커스를 준 캡처(1280×800, 1024×400, 3배율)에서 수정 전에는 윤곽선의 왼쪽 변이 없었고 수정 후에는 네 변이 모두 보인다. 링크의 left/right(1280: 992/1248, 1024: 736/992)는 수정 전후가 같다.
- 하지 않은 것: WebKit·모바일 프로젝트(CI가 맡는다). 낮은 뷰포트에서 현재 섹션 표시가 목차 안 스크롤 밖에 있을 때 자동으로 따라 스크롤하지는 않는다(리뷰 지적 범위 밖, 후속 후보).

## Baseline comparison

- Fixed failures: 없음(기존 실패 없음).
- Remaining pre-existing failures: 없음.
- New failures: 없음.
- 로컬 환경 흔들림 1회: 구현 도중 한 차례 `e2e/learn-reading.spec.ts:22`·`e2e/learn-course.spec.ts:32`(오디오 진행 대기)가 Chromium에서 실패했고, 같은 시각에 이번 변경과 무관한 `e2e/metronome-count-in.spec.ts:53`도 같은 방식으로 실패했다.
  이후 실행에서는 코드 변경 없이 통과했다. 로컬 오디오 환경 문제로 본다. CI 결과로 확인한다.

## Manual checks

- 로컬 production 빌드에서 네 레슨 전체 화면(1280×800, 390×844)과, 데스크톱 스크롤 중 옆 목차·모바일에서 목차를 연 상태를 캡처해 확인했다(오케스트레이터).
- 로컬 리뷰: Codex `gpt-6.1-sol` reasoning `high`, 읽기 전용, 2회. 1차 medium 4건, 재리뷰 medium 2건·low 1건. 모두 수정했다([리뷰 로그](../reviews/) PR 파일 참고).
  재리뷰 수정(`6eb4bd1`) 뒤의 3차 로컬 리뷰는 하지 않았다. GitHub Codex 리뷰로 확인한다.

## Gaps and risks

- 로컬 Playwright는 Chromium·Firefox만 돌렸다. WebKit·Mobile Chrome·Mobile Safari·`Firefox keyboard`는 PR CI가 맡는다. 새 spec은 47개 테스트라 CI E2E 시간(이미 제한 30분에 근접)을 늘린다.
- hydration 전에 목차를 여는 경우는 실제 브라우저에서 검증하지 못했다(Next.js 청크 지연 E2E는 불안정해 쓰지 않았다). Jest 단위 테스트뿐이다.
- 스크린리더 실기, 실기기 터치는 하지 않았다. 좁은 화면 `summary`의 접근 가능한 이름에 현재 섹션 제목이 붙어 스크롤에 따라 바뀐다.
- `/learn/practice` 섹션 머리 6개는 본문 문장과 재생 화면 코드의 라벨(`FallingNotesPlayer.tsx`, `PlaybackControls.tsx`, `CompactPlaybackBar.tsx`)에서 만들었다. 실제 재생 화면에서 눈으로 대조하지는 않았다.
- 구현의 대부분을 Gemini 3.8 Flash가 했고 검증에서 여러 번 되돌려 보냈다(틀린 예외 선택자, 추측한 색 값, hydration 전 `aria-hidden`, 물려받던 글자 크기 유실). 같은 종류의 잔여 실수 가능성이 1단계보다 높다.
