# Validation — #227 첫 곡 코스

Date: 2026-10-04 KST
Branch/head: `codex/issue-227-first-course` / `bc06f84`
Baseline: `a42d1dc` (main). #225와 독립. 계획·결정은 작업 브랜치의 LEARN-first-course phase와 D-096.

## Source and contract

`public/learn/course/`의 세 MusicXML은 이 작업에서 직접 작성한 2마디·4/4·4분음표=60의 창작 연습 데이터다.
외부 곡·편곡·PDF·이미지를 가져오지 않았다. 출처는 원본 identification/creator/rights와 코스 화면에 표시한다.
화면의 '원본 악보 내려받기'는 해당 MusicXML을 그대로 제공한다.

| 곡 | 독립 기대값 대조 |
|---|---|
| 도에서 솔까지 | C4 D4 E4 F4 G4 E4 D4 C4, 0~7초 시작/각 1초, R, 운지 1 2 3 4 5 3 2 1 |
| 왼손의 산책 | C3 D3 E3 F3 G3 E3 D3 C3, 0~7초 시작/각 1초, L, 운지 5 4 3 2 1 3 4 5 |
| 두 손 인사 | 오른손은 첫 곡과 동일, 왼손 C3/0초/4초/5번과 G3/4초/4초/1번. backup을 사용해 동시 시작 보존 |

`scripts/build-learn-course.py`는 기존 `convert_with_artifact`만 호출한다. OMR/VM/DB/네트워크 호출 없음.
생성 시각을 제거해 재생 JSON과 악보 JSON을 결정적으로 만든다. `--check`로 원본 재변환 결과와 커밋된 전체 JSON을 비교했다.
Jest의 별도 기대값은 생성기에서 가져오지 않으며 음높이·시작·길이·손·운지를 직접 단언한다. 기존 정규화 경로와
`canonicalToFallingNotes`를 거쳐도 운지·손의 source가 유지됨을 확인했다.

## Commands and results

| 명령/확인 | 결과 |
|---|---|
| 신규 course Jest(구현 전) | FAIL 의도: course 모듈 없음 |
| `PYTHON_BIN=<기존 ci-venv>/bin/python3 npx jest src/lib/learn/__tests__/course.test.ts --runInBand` | PASS: 4 tests. 최초 구현에서 import 상대 경로를 잘못 적어 실패 후 수정 |
| `PYTHON_BIN=<기존 ci-venv>/bin/python3 npx jest --runInBand` | PASS: 155 suites, 1535 tests. Python 3.12 venv |
| `npx tsc --noEmit --incremental false`; `npm run lint` | PASS exit 0, lint 경고/오류 없음 |
| `npx playwright test e2e/learn-course.spec.ts e2e/learn-home.spec.ts --project=chromium --project=firefox --project='Mobile Chrome' --workers=2 --reporter=line` | 최초 19 PASS/2 FAIL. 테스트가 재생 후 사라지는 setup의 playback-pause testid를 조회한 결함; 압축 바·활성 일시정지 버튼·시간 증가 단언으로 수정 |
| 같은 프로젝트의 `e2e/learn-course.spec.ts` 재실행 | PASS: 11 passed, 1 skipped(모바일에서 기존 데스크톱 전용 악보 패널 제외), 12.4초. 지도 spec은 앞선 실행에서 12건 모두 PASS |
| 실제 브라우저 | 320px 플레이어, 1280px 원본 악보 조판 확인. 공개 진입·원본/악보 자산·unknown slug 404·다음 곡·재생 중 코스 안내 숨김 E2E PASS |
| `git diff --check`, phase 상대 링크 검사 | PASS |

코드는 기존 플레이어를 변경하지 않고 코스 설명·출처·곡 소개를 루트 밖에 둔다. 상태는 코스 페이지의 세션 활성 여부 하나뿐이고
곡 변경 시 key로 재마운트한다. 정적 원본/생성물은 서버 컴포넌트에서 정규화해 직렬화 가능한 props로 전달한다.
전체 브라우저 매트릭스와 production build는 CI에 맡겼다. 로컬은 기존 개발 서버를 재사용했다.

## Gaps

실기기·실제 MIDI·청취·스크린리더 낭독·preview/운영은 미확인. 정적 코스는 DB의 SheetMusic이 아니므로 계정 연습 기록을 쓰지 않으며 화면에 명시한다.
박자·조표의 곡 소개 표시는 #228이 담당한다. 원본 MusicXML에는 명시된 4/4와 fifths=0이 있어 후속 단계가 사용할 수 있다.

## CI 이후 수정 — `b48a20d` / `7a995d2`

PR232 병합 main을 통합하면서 배우기 홈의 코스·용어 사전 링크를 모두 유지했다(`b48a20d`).
첫 CI Firefox의 재생 시작 실패는 [PR233 로그](../reviews/PR-233.md)에 있다.
`AudioContext.resume()`이 끝나지 않는 fixture로 기존 E2E 실패를 재현했고, 모바일에서는 회전 상태가 복귀하지 않아 코스 링크 클릭도 막혔다.
공유 startAudio에서 resume 대기를 4초로 제한해 false를 반환하고 기존 orientation.exit 경로로 돌아오도록 수정했다.
기존 status 줄을 오류 안내로 바꾸므로 조작 요소를 추가하지 않는다. 원래 오디오 시계를 유지하며 늦은 resume 완료가 자동 재생을 일으키지 않는다.

| 검증 | 결과 |
|---|---|
| resume 영구 pending E2E 재현 | FAIL 의도: compact bar 없음. 추가 모바일 이동 검증도 click 차단으로 실패 |
| 새 오디오 훅 회귀(수정 전) | FAIL 의도: 4.1초 이후에도 started가 undefined(미완료) |
| 수정 후 오디오 훅 | PASS 11 tests. 4초 실패 반환·오류 상태·늦은 완료 후 정지 유지·다시 재생 성공 |
| 전체 Jest (`7a995d2` 트리) | PASS 156 suites / 1538 tests |
| tsc / lint | PASS |
| 코스 + playback-element-count × Chromium/Firefox/Mobile Chrome | 16 passed / 3 skipped / 2 failed. 코스 14 PASS·모바일 악보 1 skip. 실패 2건은 dev 서버의 기존 디버그 텍스트 5개가 production 요소 기준에 포함된 결과 |
| 기존 `ELEMENT_COUNT_MEASURE_ONLY=1`로 수정 전후 같은 dev 환경 비교 | PASS: 2환경 × 재생 전/재생 중/일시정지의 controls/textBlocks가 정확히 동일. baseline은 `b48a20d`의 플레이어 파일이며 측정 뒤 현재 소스를 바이트 단위로 복원 |

개발 모드 실측(전=후): desktop 재생 전 17/15, 재생 중·일시정지 8/8; touch 재생 전 17/15, 재생 중·일시정지 7/6.
기존 dev 전용 Current Time/Total Length/Active Keys/Tempo Scale/Look Ahead 5개가 포함된다. Production 기준 검증은 새 PR CI가 맡는다.
기준값이나 제외 selector를 바꾸지 않았다. 새 concern이 생겨 해당 트리의 전체 검증을 다시 실행했다(D-088).

네이티브 시작 E2E는 AudioContext의 resume을 관찰만 한다. 실제 장치가 시작되지 않은 Firefox에서 state=suspended·pending 근거가 있을 때만
오류 안내·정지 UI 유지로 검증하고 진단을 첨부한다. 이 분기를 실제 오디오 재생 성공으로 기록하지 않는다. 테스트를 skip하거나 대체 clock으로 성공시키지 않는다.
CI의 실패 원인이 다른 경우(클릭 미전달/정상 context인데 재생 불가 등)는 이 단언도 실패한다. 다음 CI에서 실제 native 상태를 확인한다.

## 승인된 #228 연결 — `947af59`

PR234가 main에 병합된 뒤 D-096·D-097을 모두 유지해 통합했다. CoursePlayer가 SongIntro에 실제 정적 scoreUrl을 전달한다.
세 내장곡의 실제 score JSON을 사용하는 컴포넌트 회귀는 연결 전 3건 FAIL, 연결 후 3건 PASS다.
전체 Jest 159 suites / 1562 tests, tsc, lint PASS. 코스·song-provenance E2E는 Chromium/Firefox/Mobile Chrome에서 32 PASS/1 skip(모바일 악보 패널)이다.
내장곡 셋의 4/4·샵/플랫 없음·원본 출처 문구·레슨 링크를 실제 정적 자산으로 확인했다.
Chrome 수동 확인에서는 초기 개발 자산이 갱신되지 않은 화면이 있었으나 강제 새로고침 후 원본 정보가 표시됐다. 사용자의 RHWP 확장이
html에 붙인 data-hwp 속성으로 개발 hydration 경고도 관찰했다. 격리된 브라우저 E2E는 통과했고 운영 설정·확장은 변경하지 않았다.
