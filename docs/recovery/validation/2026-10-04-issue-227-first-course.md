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
