# #177 PC 악보 세로 공간 — 운영 기준과 PR183 로컬 검증

Date: 2026-09-22 KST
PR: https://github.com/landfill/ClairKeys/pull/183
Branch/head at creation: `codex/issue-177-score-height` / `7fe0759`

## 운영 기준 대조

기존 [2026-09-21 실측](2026-09-21-score-panel-height.md)은 87/88/89 기준이며,
2026-09-22 로그인된 운영 브라우저에서 세 URL은 모두 "악보를 찾을 수 없습니다"였다.
같은 제목의 새 악보는 90=Love Affair, 91=Deborah's Theme, 92=Clair de Lune이다.
제목으로 OMR 결과나 MusicXML 바이트 동일성을 가정하지 않는다. 새 URL의 재생/일시정지,
키보드 탐색, 악보 ON을 확인했다. 아래 수치는 현재 운영 빌드이며 PR 결과가 아니다.

| 현재 악보/화면 | 표시 clientHeight | 최대 양손 줄 | 초과 줄 | 관찰 |
|---|---:|---:|---:|---|
| 90 / 1280×720 | 243px | 368.6px | 7/7 | 약20초 높은음자리 윗부분과 악보 상단 기호가 패널 경계에 닿음. 건반153px·낙하176px. |
| 91 / 1440×900 | 289px | 270.5px | 0/6 | 약30초 현재 줄 양손 보표가 표시 영역에 들어옴. 패널 외곽306px; SVG 폭1374px 대 clientWidth1359px로 가로 스크롤바15px. 건반166px·낙하191px, 악보와 애니메이션 사이 약65.5px. |
| 92 / 1280×720 | 243px | 311.9px | 3/3 | 약25초 하단 보표/기호가 경계에서 잘림. |

줄 높이는 렌더링된 `g.staffline` 두 개의 bounding box 합집합이며 운지·음표·
슬러를 포함한다. 뷰포트/DPR와 스크롤바 조건이 다른 2026-09-21 측정과 숫자를
혼용하지 않는다. 실제 연주·재생은 데이터 변경 없이 일시정지/탐색으로 확인했다.

## 변경 전 회귀 근거와 선택

`src/utils/__tests__/playbackGeometry.test.ts`의 세 score-aware 예산 사례는
기존 구현에서 **3 fail / 16 pass**(`planScoreAwareGeometry is not a function`)였다.
1440×900의 여백115px은 우선 악보에, 1280×720에서 여백 약24px을 넘는
부족분은 건반153→최저120px까지 배정하되 낙하176px은 유지하는 계약을 고정했다.
양손 시스템이 전체 예산보다 높으면 무제한 확장/전체 축소 없이 패널 세로 스크롤을
허용하고 접근 가능한 설명을 제공한다. 현재 마디 highlight만으로 줄 높이를 판정하지 않는다.

## 구현 및 로컬 검증

- ScorePanel은 렌더링된 양손 줄 전체의 최대 높이를 보고하고, 줄이 충분히 들어올
  때는 시스템 상단 기준으로 스크롤한다. 가로 스크롤바만 숨기는 방식은 쓰지 않는다.
- 재생 세션은 악보 높이+낙하/건반 wrapper의 합을 안정적인 예산으로 사용한다.
  남는 여백→건반 길이 순으로 악보에 배정하고, 낙하 영역은 원래 픽셀 높이를
  유지한다. 모바일/악보 OFF의 기존 geometry 경로는 그대로 둔다.
- 저자 작성 MusicXML A0/C8·운지 fixture의 시각 결과:
  [1440×900 Chromium](assets/issue-177/score-height-authored-1440.png). 기존
  외곽306px에서 시스템301.97px이 clientHeight289px을 넘었고, 패치에서 패널이
  필요한 만큼 늘어났다. 1280×720에서는 건반 길이를 줄이고 넘치는 시스템은
  패널 안에서 스크롤된다. 실제 사용자 악보/원본 PDF/XML을 fixture에 복사하지 않았다.
- `npm run lint`: PASS, 경고0.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS. 빌드가 type/lint를 생략하므로 위 두 명령을 별도 실행.
- `PYTHON_BIN=/private/tmp/clairkeys-ui-python312/bin/python npm test -- --runInBand --silent`:
  114 suites / **1104 tests PASS**. 격리 Python은 저장소 `omr-service/requirements-ci.txt`를 사용.
- `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 npx playwright test
  e2e/score-panel.spec.ts e2e/score-height-responsive.spec.ts --project=chromium
  --project=firefox --project=webkit --project='Mobile Chrome' --project='Mobile Safari'
  --reporter=line`: **28 pass, PC 전용 17 skip**. 1280×720·1366×768·1440×900·
  1920×1080, 충분한 악보, 초과 스크롤, 건반 x/폭·운지/음이름 글자 크기,
  낙하 높이, 토글/탐색/모바일/legacy score 없는 곡을 포함.

## Initial PR preview on current sheets (head `7fe0759`)

Public preview URL `https://clairkeys-git-codex-issue-177-score-height-landfills-projects.vercel.app`.
Actual 90/91/92 loaded without copying their MusicXML or PDF into the repo.
All were played then paused, and seek was used near the reported trouble spots.

| Sheet/viewport | Production before | Preview initial | Result |
|---|---|---|---|
| 90 /1280×720 | score outer244.8/client243px, key153px, falling176px; max system368.6px | outer301.8/client285px, key120px, falling176px; same max system | More score space, same runway; line remains beyond cap and scrollable. Box bottom719.9px. |
| 91 /1440×900 | outer306/client289px, key166px, falling191px; max270.5px | exact same 306/289, 166/191 and max270.5 | Adequate condition unchanged. Existing 15px horizontal scrollbar remains. |
| 92 /1280×720 | outer244.8/client243px, key153px, falling176px; max311.9px | outer301.8/client285px, key120px, falling176px | More score space, still 26.9px over budget; scrolling required. At25s scrollTop388.5px exceeded row2 top347px by41.5px and clipped upper signs. |

`f5c4eba` addresses the 92 scroll entry by aligning the complete system's top
when it cannot fit. It does not claim simultaneous full-line visibility in a
physically insufficient 720px viewport. New preview deployment, full CI and
re-review are pending. No user data was mutated.

`f5c4eba` preview의 92에서 슬라이더를 Home→5초씩 이동시키자 scrollTop은
46.5→46.5→46.5→46.5→342.5(20초, row2 진입)→383.5px(25초, 같은 row2)였다.
행 전체311.9px은 표시285px보다 크므로 마지막 강조 마디를 따라 41px 추가 이동하면
윗기호가 다시 잘린다. `12e5607`은 초과 줄에 처음 들어갈 때 상단을 맞추고 같은 줄
안에서는 추가 자동 이동을 막아 사용자가 조절한 스크롤을 유지한다. 새 E2E는
수동 스크롤 뒤 같은 줄의 끝/처음 탐색에서도 위치를 보존하는지 검사한다.
Chromium/Firefox/WebKit/Mobile Chrome/Mobile Safari **28 pass, 17 PC-only skip**,
lint/type pass. 이 시점에는 최신 preview 재확인이 남아 있었다.

최신 head `12e5607` public preview를 새로고침해 92번을 다시 재생/일시정지 후
Home→5초씩 탐색했다. scrollTop은 **46.5→46.5→46.5→46.5→342.5(20초)→342.5px(25초)**.
25초의 윗부분 운지·슬러가 보이며 낙하176px/건반120px은 유지된다. 아랫부분은
전체 시스템311.9px 대 표시285px 때문에 동시에 들어올 수 없고 수동 스크롤로
접근한다. 이 검증은 자동 스크롤 정책의 의도된 한계이며 전체 표시 성공이라고
표현하지 않는다. 최신 PR CI와 재리뷰는 진행 중이다.

## 남은 확인

- 과거87/88/89는 삭제되어 재실측 불가. 최신 head CI/재리뷰 및 로그인 상태 전체 곡 자동 스크롤은 확인이 남았다.
- 가로 overflow는 #91에서 15px을 관찰했다. SVG/컨테이너 폭 경로를 확인했으며
  스크롤바를 숨겨 기호를 가리는 패치는 하지 않았다. 패널 높이 예산은 이 손실을
  포함한다. 이 경로 자체의 제거는 검증된 독립 수정이 필요하다.
- 실제 하드웨어 확대/터치·실제 MIDI 건반 입력, 사람의 악보 가독성 평가,
  preview/CI/리뷰는 이 시점에 아직 미확인. 재생 데이터·오디오 코드는 변경하지 않았다.
