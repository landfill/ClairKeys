# Completion audit — #236 배우기 영역 화면 구성 개편

Date: 2026-10-09 KST
Audited merge: `edb4609` (PR244 병합 커밋. 1~3단계는 `cdfdb7d`, `abb7cd0`, `3925182`). 후속 5단계 `21dfd70`(PR245) 반영해 같은 날 갱신
Environment: macOS, 병합된 main의 production 빌드(`npm run build` 뒤 `npm start`, `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 DATABASE_URL=postgresql://test:test@localhost:5432/clairkeys_test`), Chromium
Overall: **완료 조건 9개 충족(예외 두 가지, 한계 한 가지 기록).** 첫 대조에서는 "`/learn` 아래 모든 페이지의 링크·버튼 44×44px"가 첫 곡 코스 두 페이지에서 미달이었다. 재생기 밖 링크는 후속 PR245로 고쳤고, 재생기 안의 조작은 사용자 결정으로 이슈 본문에 예외로 적었다(2026-10-09). 문장 안 링크의 실제로 눌리는 높이는 한계로 기록하고 닫는다(사용자 결정). 이슈는 2026-10-09에 종료했다.

이슈 [#236](https://github.com/landfill/ClairKeys/issues/236) 본문의 "완료 조건"을 항목별로 대조했다. 단계별 근거는 각 검증 기록에 있고 여기에는 판정과 링크만 둔다.
아래 "최종 계측"은 네 단계가 모두 병합된 트리에서 `/learn` 아래 아홉 경로를 한 번에 다시 잰 값이다.

## 완료 조건과 근거

| # | 완료 조건 | 판정 | 근거 |
|---|---|---|---|
| 1 | `/learn`의 모든 카드는 카드 면적 전체가 눌리고, 키보드 포커스가 카드 단위로 보이며, 카드 하나에 탭 정지는 하나 | PASS | [1단계](2026-10-08-learn-236-stage1-home-cards.md). `e2e/learn-home.spec.ts`의 `makes the whole area of all eight cards hit their own link`, `stops Tab exactly once per card…`, `shows the keyboard focus on the card container`. 카드는 3단계에서 레슨이 5개가 되어 8개다 |
| 2 | `/learn` 아래 모든 페이지에서 링크·버튼의 터치 영역 44×44px 이상(문장 안 링크는 높이, 검은 건반 폭·재생기 안 조작 예외) | PASS(예외·한계 있음) | 홈·다섯 레슨·용어 사전은 44px 미만 0(검은 건반 폭만 예외). 코스 두 페이지의 재생기 밖 링크 6개는 [5단계](2026-10-09-learn-236-stage5-course-links.md) PR245로 44px 이상. 재생기 안 조작은 이슈 본문의 예외. 첫 대조에서는 PARTIAL이었다(아래). 문장 안 링크는 상자 기준이다(아래 "한계") |
| 3 | 나눈 악보 읽기 두 페이지는 각각 390×844에서 5화면, 1280×800에서 4화면 이하 | PASS | [3단계](2026-10-09-learn-236-stage3-reading-split.md). 최종 계측 `/learn/reading` 2803px(3.5) / 4110px(4.9), `/learn/reading/rhythm` 2867px(3.6) / 3694px(4.4). 기준 3200 / 4220px |
| 4 | 용어 사전은 찾기 입력에 두 글자를 넣으면 해당 용어가 첫 화면 안, 필터 없이 1280×800에서 3화면 이하 | PASS | [4단계](2026-10-09-learn-236-stage4-glossary.md). 최종 계측 2265px(2.8화면). `e2e/learn-glossary.spec.ts`의 `finds a term within the first screen from two typed characters`(1280×800, 390×844) |
| 5 | 섹션이 4개 이상인 레슨은 어느 스크롤 위치에서도 두 번 이하의 조작으로 다른 섹션에 도달 | PASS | [2단계](2026-10-09-learn-236-stage2-lesson-layout.md). `e2e/learn-lesson-layout.spec.ts`의 `목차 항목으로 다른 섹션에 도달(중간·맨 아래)`(넓은 화면은 옆 목차 1번, 좁은 화면은 목차 열기 + 항목 2번) |
| 6 | 용어 사전의 모든 레슨 링크가 실제 섹션에 닿음(옮겨 간 앵커 4개 포함), 곡 소개의 레슨 링크도 같음 | PASS | `e2e/learn-glossary.spec.ts`의 `every definition links to an existing public lesson section`(25개), `e2e/song-provenance.spec.ts`·`e2e/sheet-song-intro.spec.ts`. 4단계에서 더한 레슨 → 사전 링크 23개도 `lesson term links land on glossary entries…`가 검사한다 |
| 7 | 기존 계약 유지: 320px 가로 넘침 없음, 악보 그림 로드 시 레이아웃 이동 없음, OSMD·오디오 실패 시 대체 글과 조작 유지, Tab·Enter만으로 도달, 비로그인 공개 접근 | PASS | 각 단계의 E2E(`learn-home`, `learn-lesson-layout`, `learn-reading`, `learn-reading-rhythm`, `learn-glossary`)와 PR244 CI 여섯 프로젝트. 최종 계측의 가로 넘침은 아홉 경로 모두 0 |
| 8 | 전환형 예시 패널: 선택 버튼 `aria-pressed`, 그림 대체 설명 갱신, 선택을 바꿔도 패널 높이 불변 | PASS | [3단계](2026-10-09-learn-236-stage3-reading-split.md), `e2e/learn-reading-rhythm.spec.ts`, [PR241](../reviews/PR-241.md) L2·L5 |
| 9 | 변경 전후 계측을 `docs/recovery/validation/`에 기록 | PASS | 단계별 기록 네 개와 이 문서 |

## 첫 대조에서 충족하지 못했던 것: 첫 곡 코스 두 페이지의 링크 높이

이슈의 네 단계(A 홈, D 레슨 레이아웃, B 악보 읽기, C 용어 사전)는 첫 곡 코스 페이지를 다루지 않았고, 구현 지시문도 `course`를 건드리지 않게 했다. 그래서 이 두 경로는 이슈 착수 전과 같다.
이슈의 계측 표에는 `/learn/course`가 들어 있고 완료 조건은 "`/learn` 아래 모든 페이지"다.

| 경로 | 높이 44px 미만인 링크(눌리는 영역) |
|---|---|
| `/learn/course` | `다섯 손가락 자리` 92×18, `느리게 재생하거나 구간을 반복하는 방법` 220×18(390px에서는 358×38) |
| `/learn/course/right-hand` | `연습 방법과 단축키 보기` 132×20, `손가락 번호 보기` 92×20, `건반 레슨에서 음역 익히기` 144×20, `악보 읽기에서 음높이 연결하기` 168×20, `손 레슨에서 손가락 번호 익히기` 171×18, `연습 방법에서 빠르기와 연습 알아보기` 208×18, 1280×800에서 `악보 보기` 40×40 |

- `left-hand`·`both-hands`는 재지 않았다. 같은 컴포넌트라 같을 것으로 본다(추정).
- 곡 페이지에는 재생기(`CoursePlayer`)가 들어 있다. 재생 화면은 D-094로 수정이 금지돼 있어, `악보 보기`(40×40)처럼 재생기에 속한 조작은 이 이슈에서 고칠 수 없다. 재생기 밖의 글 링크는 2단계의 문장 안 링크 방식(`py-3.5`)으로 고칠 수 있다.
- 첫 대조의 선택지는 (가) 후속 단계, (나) 예외, (다) 별도 이슈였다.
- **처리(2026-10-09)**: 사용자가 (가)를 골랐다. 코드를 읽어 보니 위 표의 곡 페이지 7개 중 재생기 밖은 `이 곡 소개`의 4개뿐이었고(`연습 방법과 단축키 보기`·`손가락 번호 보기`·`악보 보기`는 재생기 안), 위 줄의 "재생기 밖의 글 링크는 `py-3.5`로 고칠 수 있다"도 코스 목록 문단에는 맞지 않았다(줄 높이 20px라 앞 링크의 글자를 덮는다).
  PR245(`21dfd70`)가 재생기 밖 6개를 고쳤다: 코스 목록의 2개는 `inline-block`, `이 곡 소개`의 4개는 `inline-flex min-h-11`. 세 곡 페이지 모두 다시 쟀고 재생기 밖 44px 미만은 0이다.
- **예외(사용자 결정 2026-10-09, 이슈 본문 반영)**: 재생기 안의 `연습 방법과 단축키 보기`(132×20), `손가락 번호 보기`(92×20), `악보 보기`(40×40), 양손 곡의 손 선택 `양손`·`왼손`·`오른손`(높이 32). "재생 화면은 수정하지 않는다(D-094)"에 걸린다.

## 최종 계측 (병합된 main, 2026-10-09)

`node local-test-data/results/learn-236/measure.mjs http://localhost:3000 - <경로 9개>`. "44px 미만"은 검은 건반 폭(26×113px)을 뺀 수다.

| 경로 | 1280×800 높이 | 390×844 높이 | 이슈 착수 전(1280 / 390) | 높이 44px 미만 | 폭 44px 미만 | 가로 넘침 |
|---|---|---|---|---|---|---|
| `/learn` | 1728px (2.2화면) | 2522px (3.0) | 1111 / 1316px | 0 | 0 | 0 |
| `/learn/keyboard` | 1432px (1.8) | 1694px (2.0) | 1138 / 1362px | 0 | 0 | 0 |
| `/learn/reading` | 2803px (3.5) | 4110px (4.9) | 7594 / 8640px(나누기 전 한 페이지) | 0 | 0 | 0 |
| `/learn/reading/rhythm` | 2867px (3.6) | 3694px (4.4) | (없음) | 0 | 0 | 0 |
| `/learn/hands` | 1907px (2.4) | 2508px (3.0) | 1449 / 1933px | 0 | 0 | 0 |
| `/learn/practice` | 2193px (2.7) | 2878px (3.4) | 1557 / 2085px | 0 | 0 | 0 |
| `/learn/glossary` | 2265px (2.8) | 3731px (4.4) | 4174 / 4948px | 0 | 0 | 0 |
| `/learn/course` | 1111px (1.4) | 1298px (1.5) | 1111 / 1298px | **2** | 0 | 0 |
| `/learn/course/right-hand` | 1900px (2.4) | 2388px (2.8) | (이슈 표에 없음) | **7 / 6** | 1 / 0 | 0 |

- 길이 기준이 없는 페이지는 늘었다: 홈(1111 → 1728px, 1316 → 2522px)과 레슨 네 개(17~38%). 카드 면적, 본문 16px, 위치 표시·목차·이전/다음 카드 때문이다. 완료 조건에 이 페이지들의 길이 기준은 없다.

## 제약·비목표 대조

| 제약 | 판정 | 근거 |
|---|---|---|
| 재생 화면 수정 금지(D-094), 요소 수 27 유지 | PASS | `git diff cdfdb7d^..edb4609 -- src/app/sheet src/components/animation src/components/playback src/components/sheet`의 변경은 `SongIntro.tsx`의 `href` 한 줄과 그 테스트뿐(3단계, 옮겨 간 앵커). `e2e/playback-element-count.spec.ts`는 CI에서 통과 |
| 기존 디자인 토큰만 | PASS | `src/app/globals.css` 변경 없음(같은 diff 범위) |
| 이론 정의·예시 데이터·소리 불변 | PASS | 단계별 문장 비교(2·3·4단계 기록). 4단계는 감싼 태그를 벗기면 main과 바이트가 같음 |
| 레슨 완료·진도 표시 없음, 팝오버·툴팁 없음, 새 그림 없음 | PASS | 해당 구현 없음(리뷰 지시문의 금지 항목, 로컬·GitHub 리뷰에서 지적 없음) |
| `/learn`을 `PROTECTED_PATHS`에 넣지 않음 | PASS | `src/lib/routeAccess.ts` 변경 없음, 비로그인 공개 접근 E2E |

## 병합·검사

| 단계 | PR | 병합 커밋 | 병합 승인 | Post-merge checks |
|---|---|---|---|---|
| 1 | [PR237](../reviews/PR-237.md) | `cdfdb7d` | 리뷰 로그 | 성공 |
| 2 | [PR240](../reviews/PR-240.md) | `abb7cd0` | 리뷰 로그 | 성공 |
| 3 | [PR241](../reviews/PR-241.md) | `3925182` | 리뷰 로그 | 성공(E2E 35분 28초) |
| 4 | [PR244](../reviews/PR-244.md) | `edb4609` | "244 CI 통과하면 병합해"(2026-10-09) | 첫 실행은 E2E가 45분 제한으로 취소, 재실행에서 성공(35분 35초) |
| 5 | [PR245](../reviews/PR-245.md) | `21dfd70` | "병합"(2026-10-09) | 성공(E2E 35분 53초) |

## 한계

- **문장 안 링크의 44px는 상자 기준이다(사용자 결정 2026-10-09: 한계로 기록하고 닫는다).** inline 링크에 세로 패딩을 주는 2단계의 방식은 `getBoundingClientRect`로 49px이지만, 패딩이 이웃 줄과 겹치는 곳에서는 문서 순서상 뒤의 글자가 잡힌다. 실제로 그 링크가 잡히는 높이는 문단 중간 줄에서 약 37px(390×844의 `4분음표`는 26px), 좌우로 넓힌 두 글자 용어의 폭은 약 35px다. 글자를 눌렀을 때 다른 링크가 대신 잡히는 경우는 레슨에서 없었다. 이슈의 계측 표와 E2E는 상자를 잰다. 줄 간격을 넓히지 않고는 고칠 수 없고, 넓히면 `/learn/reading` 390×844의 높이 기준(여유 110px)을 넘는다. 수치는 [5단계 기록](2026-10-09-learn-236-stage5-course-links.md).
- 실기기 터치·회전, 스크린리더, 한글 입력기 조합 중의 걸러짐, 소리 청취는 확인하지 않았다.
- 2~4단계의 구현은 Gemini 3.8 Flash가 했고 매 단계 검증에서 여러 번 되돌려 보냈다. 판정은 diff·계측·E2E·리뷰로 했다.
- `/learn/reading` 390×844는 높이 기준까지 110px 여유뿐이다. E2E로 고정하지 않았다.
- 옛 해시 주소(`/learn/reading#meters` 등)는 처리하지 않는다(사용자 결정 3번).
