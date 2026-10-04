# Validation — #228 곡 소개의 원본 박자·조표

Date: 2026-10-04 KST
Branch/head: `codex/issue-228-score-provenance` / `b8366ba`
Baseline: `3061b31` (main). 계획·D-097은 작업 브랜치에 있다.

## Contract

페이지가 기존 score endpoint URL을 SongIntro에 넘기고 `loadScoreArtifact` 캐시를 공유한다. 단일 요청으로 소개·악보 패널이 같은 검증된 아티팩트를 읽는다.
명시적인 XML time/beats/beat-type 및 key/fifths만 읽는다. 첫 음/쉼표 전에 출처가 없거나 파트 간/곡 중 값이 달라지는 경우 해당 행을 생략한다.
복합 박자 표현, 비전통/보표별 조표와 파싱 실패도 생략한다. 장조·단조를 표시하지 않는다.
원본이 없는 JSON의 기본값은 읽지 않으며 애니메이션 버전은 변경하지 않는다. 새 행은 재생 루트 밖이다.

## Commands and results

| 명령/확인 | 결과 |
|---|---|
| 새 scoreProvenance Jest(구현 전) | FAIL 의도: 모듈 없음 |
| scoreProvenance·useScoreProvenance·SongIntro 대상 Jest | PASS: 3 suites, 26 tests |
| `PYTHON_BIN=<기존 ci-venv>/bin/python3 npx jest --runInBand` | PASS: 156 suites, 1552 tests. Python 3.12 |
| `npx tsc --noEmit --incremental false`; `npm run lint` | PASS exit 0, lint 경고/오류 없음 |
| `npx playwright test e2e/song-provenance.spec.ts e2e/sheet-song-intro.spec.ts --project=chromium --project=firefox --project='Mobile Chrome' --workers=2 --reporter=line` | PASS: 30 tests, 26.3초 |
| 시각 확인용 screenshot 추가 후 Chromium `--grep '1.1: displays'` | PASS 1 test. 실제 곡 소개의 박자 3/4·플랫 2개·원본 악보 기준 문구·레슨 링크 확인 |
| `git diff --check` | PASS |

회귀: 원본 정보 있음/없음, 정규화 기본 4/4 배제, 1.0·1.1 입력, 원본 요청 실패, 다중/변경/늦은 선언·잘못된 XML·DTD,
URL 변경 시 이전 정보 즉시 숨김, stale 응답 무시, 동일 URL 다운로드 1회, 비공개 악보 기존 차단, 320·390px 배치.
기존 캐시와 실패 처리 계약을 재사용하고 effect cleanup으로 다른 곡의 응답이 화면에 섞이지 않게 했다.

## Gaps and integration

전체 브라우저 매트릭스·production build는 PR CI. 실기기·스크린리더·운영은 미확인. preview의 실제 공개 악보 확인은 [PR234 로그](../reviews/PR-234.md)에 기록했다.
변경 박자/조표를 시간순으로 소개하는 UI는 이번 범위에 넣지 않았다. 하나의 값으로 요약할 수 없으면 행을 숨기는 보수적인 계약이다.
#227의 내장곡도 동일 ScoreArtifact 형식이다. #228 병합 후 PR233에서 CoursePlayer의 SongIntro에 scoreUrl을 연결하고
실제 내장곡 E2E를 추가해야 네 이슈 전체 연결이 끝난다. 병합 전 종속 브랜치 작업을 시작하지 않는 AGENTS를 따른다.
