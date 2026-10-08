# Validation — LEARN-236 / 1단계 홈 카드와 세 구역

Date: 2026-10-08
Commit: `3451a6d` (브랜치 `codex/learn-236-home-cards`, 구현 모델 Antigravity CLI `claude-opus-5-5-high`)
Environment: macOS, Node 로컬, production 빌드(`npm run build` 뒤 `npm start`), `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`, Playwright Chromium·Firefox

## Claim being verified

이슈 [#236](https://github.com/landfill/ClairKeys/issues/236) 1단계(개편안 A): `/learn`의 카드 7개는 카드 면적 전체가 눌리고, 키보드 포커스가 카드 단위로 보이며,
카드 하나에 탭 정지가 하나다. 320 CSS px 가로 넘침 없음·Tab/Enter 도달·비로그인 공개 접근 계약은 그대로다.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| 수정 전 `npx jest src/app/learn/__tests__/page.test.tsx src/lib/learn/__tests__/lessons.test.ts src/components/learn/__tests__/LearnCard.test.tsx` (구현 워커) | FAIL(의도) | 3 suites 실패, 9 tests 실패·7 통과. h2가 구역이 아니라 레슨 제목, `LearnCard` 모듈 없음, `topics` 없음, 회색 문장이 남아 있음 |
| `PATH=<ci-venv>/bin:$PATH npx jest` (오케스트레이터) | PASS | 162 suites, 1591 tests |
| `npx tsc --noEmit --incremental false` | PASS | exit 0 |
| `npm run lint` | PASS | No ESLint warnings or errors |
| `npx playwright test e2e/learn-home.spec.ts e2e/learn-glossary.spec.ts e2e/practice-history.spec.ts e2e/learn-course.spec.ts --project=chromium --project=firefox --workers=2` | PASS | 44 passed (21.9s). `learn-home`은 기존 4개 + 새 5개 |
| `node local-test-data/results/learn-236/measure.mjs <base> … /learn` (운영·로컬) | 아래 표 | Chromium, `networkidle` 뒤 1.5초 |

`<ci-venv>`는 `local-test-data/results/issue134-chord-split-2026-09-19/ci-venv`(Python 3.12)다.

## 변경 전후 계측

이슈 계측 표와 같은 방법이다. 변경 전은 운영 `https://clairkeys.vercel.app`(main `9d98d65`와 같은 화면)을 2026-10-08에 다시 잰 값이고 이슈의 값과 같다. 변경 후는 로컬 production 빌드다.
"눌리는 영역"은 링크 상자와, 링크의 `::after`가 덮는 카드 상자 중 큰 쪽이다(stretched link는 링크 요소의 상자를 키우지 않는다).

| 항목 | 변경 전 1280×800 | 변경 후 1280×800 | 변경 전 390×844 | 변경 후 390×844 |
|---|---|---|---|---|
| 문서 높이 | 1111px (1.4화면) | **1484px (1.9화면)** | 1316px (1.6화면) | **2306px (2.7화면)** |
| 가로 넘침 | 0 | 0 | 0 | 0 |
| `건반` 눌리는 영역 | 31×23 | 600×228 | 31×23 | 358×228 |
| `악보 읽기` | 67×23 | 600×228 | 67×23 | 358×256 |
| `손` | 16×23 | 600×228 | 16×23 | 358×228 |
| `연습 방법` | 67×23 | 600×228 | 67×23 | 358×256 |
| `첫 곡 코스` | 55×44 | 1216×166 | 55×44 | 358×166 |
| `용어 사전` | 52×44 | 600×166 | 52×44 | 358×154 |
| `내 연습 기록` | 68×44 | 600×166 | 68×44 | 358×166 |
| 높이 44px 미만 링크·버튼 | 4 | 0 | 4 | 0 |

- **문서 높이는 늘었다**(데스크톱 +373px, 모바일 +990px). 레슨 카드에 주제 칩과 "해 보기" 줄이 생겼고(카드 126px → 228~256px), 문장 3줄이 카드 3개와 구역 제목 3개가 됐기 때문이다.
  이슈의 완료 조건에 `/learn` 홈의 길이 기준은 없다. 이슈가 지적한 "데스크톱에서 내용이 약 650px에서 끝나고 아래가 빈다"는 해소됐지만 모바일은 2.7화면이 됐다.
- 링크 요소 자체의 상자는 여전히 제목 글자 크기(`손` 16×23)다. 눌리는 영역은 E2E의 모서리 hit-test(카드 네 모서리에서 8px 안쪽의 `elementFromPoint`가 그 카드의 링크)로 확인했다.

## Baseline comparison

- Fixed failures: 없음(기존 실패 없음).
- Remaining pre-existing failures: 없음.
- New failures: 없음.

## Manual checks

- 로컬 production 빌드의 `/learn` 전체 화면을 1280×800·390×844로 캡처해 세 구역, 카드 7개, 칩 줄바꿈, 강조 카드 테두리를 눈으로 확인했다(오케스트레이터).
- 로컬 리뷰: Codex `gpt-6.1-sol` reasoning `high`, 읽기 전용. 결과 "지적 없음"(접근성 이름·제목 수준, stretched link 부작용, 테스트의 회귀 검출력, `COURSE_PIECES` import 비용, 범위 이탈을 보게 했다).

## Gaps and risks

- 로컬 Playwright는 Chromium·Firefox만 돌렸다. WebKit·Mobile Chrome·Mobile Safari·`Firefox keyboard`는 PR CI가 맡는다.
- 스크린리더 실기 확인, 실기기 터치는 하지 않았다. 칩은 `aria-hidden`이고 같은 내용을 `sr-only` 문장 한 줄로 읽히게 했는데 실제 낭독은 확인하지 않았다.
- 키보드 포커스 때 전역 `:focus-visible` outline(제목 글자 둘레)과 카드 링이 함께 보인다. `outline-none` 금지 규칙 때문에 링크 outline은 그대로 뒀다.
- 카드 전체를 링크의 `::after`가 덮으므로 카드 안 설명·칩 글자를 마우스로 끌어 선택할 수 없다(stretched link의 일반 제약).
- `시작하기 →` 표시는 `용어 사전`·`내 연습 기록` 카드에도 같은 문구로 붙는다(이슈 A-2가 정한 문구, 세 구역이 같은 카드 규칙).
- `LEARN_LESSONS.topics`·`activity`는 현재 레슨 페이지의 섹션에서 뽑았다. 3단계에서 악보 읽기를 나누면 값을 다시 나눠야 한다.
