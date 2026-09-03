# ISSUE-103 — 모든 재생 노트의 운지 안내

Status: `BLOCKED`
Depends on: P0-A, DS-5

Progress (2026-09-03): 표준 번호 체계와 일반 악구 운지의 차이를 조사하고 D-038로 출처 우선순위와
결정론적 fallback 계약을 확정했다. 구현과 검증은 진행 중이다.

Progress (2026-09-03): PR #117이 merge commit `34b8ad4`로 병합되고 이슈 #103은 닫혔다. 로컬·hosted·
post-merge 자동 검증은 모두 통과했고 브랜치 정리도 끝났다. 완료 조건의 실제 악보·모바일 가로 수동 확인이
남아 있어 Status는 `DONE`이 아니라 `BLOCKED`다.

## Objective

원본 악보의 유효한 운지를 보존하면서, 운지가 없는 기존·신규 악보의 모든 재생 노트에도 양손 공통 1~5
번호를 일관되게 표시한다.

## In scope

- 양손 엄지 1 → 소지 5의 표준 번호 의미
- MusicXML/저장 JSON 원본 운지 보존
- 누락 운지의 결정론적 초보자용 fallback
- canonical 문서에서 플레이어 입력까지의 보존·보강 회귀
- 짧은 노트와 정지·재생 화면의 번호 렌더링
- 왼손·오른손·동시음·모바일 가로 화면 검증

## Out of scope

- Simply Piano의 비공개 운지 생성 알고리즘 복제
- 임의 악곡에 교육적으로 유일하거나 최적인 운지 보장
- 기존 저장 JSON 일괄 덮어쓰기
- 개인 손 크기·숙련도 기반 운지 최적화

## Work stages

1. 현재 변환→저장→정규화→플레이어 경계의 운지 보존과 누락을 회귀로 고정한다.
2. 기존 원본 운지를 보존하는 결정론적 fallback을 플레이어 입력 경계에 연결한다.
3. 짧은 낙하 노트에서도 번호를 생략하지 않는 렌더링 규칙을 적용한다.
4. focused Jest 후 전체 Jest, typecheck, lint, build를 실행한다.
5. 실제 악보 한 곡과 모바일 가로 화면을 수동 검증한다.

## Completion criteria

- 회귀 fixture의 모든 재생 노트가 유효한 `finger` 1~5를 가진다.
- 원본의 유효한 왼손·오른손 운지가 변환·정규화·플레이어 경계에서 보존된다.
- 원본이 없는 같은 입력은 반복 실행해도 같은 운지를 얻는다.
- 왼손·오른손과 최대 다섯 음의 동시음을 검증한다.
- 매우 짧은 노트도 번호 렌더링 대상이며 UI 테스트가 이를 관측한다.
- Jest, `npx tsc --noEmit`, lint, build가 통과한다.
- 실제 악보 한 곡의 모든 노트 표시와 모바일 가로 화면 가독성을 수동 확인한다.

## Sources

- [Yamaha, “The Basics Of Piano Keyboard Fingering”](https://hub.yamaha.com/keyboards/k-how-to/the-basics-of-piano-keyboard-fingering/): 양손 공통 엄지 1~소지 5, 검은건반·손 위치·이동 원칙,
  같은 악구에도 복수 운지가 가능함.
- [Baylor Piano Basics, “One-Octave Major Scales”](https://openbooks.library.baylor.edu/pianobasics/chapter/one-octave-major-scales/): CAGED 장음계의 오른손 `123-12345`, 왼손
  `54321-321`, 연속 손가락·3/4음 그룹·검은건반의 엄지 회피 원칙.
- [Simply Piano Help Center, “Learning with Simply Piano: The basics”](https://piano-help.hellosimply.com/en/articles/7943490-learning-with-simply-piano-the-basics): 학습 화면의 finger numbers
  표시/숨김 옵션. 배정 알고리즘은 공개 문서에 없음.
