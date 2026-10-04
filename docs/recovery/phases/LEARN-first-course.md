# #227 첫 곡 코스

Status: IN_PROGRESS
Date: 2026-10-04
Issue: https://github.com/landfill/ClairKeys/issues/227

## Objective

OMR 인식 없이 검증된 짧은 창작 연습곡으로 레슨에서 배운 도~솔 자리와 양손을 연습한다.

## Entry and decision

#225와 독립적이다. #226 사용자 범위 답변을 기다리는 동안 먼저 진행한다.
기존 `MusicXMLToClairKeysConverter.convert_with_artifact`가 OMR 없이 MusicXML을 직접 받으므로 이를
저작 시점 스크립트에서 재사용한다(D-096). 정적 JSON과 악보 아티팩트를 커밋하고 Python/VM/DB는 실행 중 필요 없다.
별도 업로드 기능이나 XML 변환기를 프런트에 새로 구현하지 않는다.

## Work stages

1. 재현 테스트와 도~솔 창작 MusicXML 3곡(오른손·왼손·두 손) 및 독립 기대값을 작성한다.
2. 결정적 생성 스크립트로 기존 converter를 호출하고 출력의 기계 대조와 stale 검사를 제공한다.
3. `/learn/course`와 `/learn/course/[slug]` 공개 코스·재생 화면. 기존 플레이어와 곡 소개 재사용.
4. 배우기 홈·손 레슨에서 코스 진입, 코스에서 원본·악보·연습 방법 접근.

## Constraints

PDF/이미지/기존 곡 편곡 없음. 프로젝트용으로 새로 작성한 연습 데이터이며 출처를 화면·원본에 표시.
재생 루트에 새 요소를 넣지 않고 코스 안내·출처·곡 소개는 정지 상태에 루트 밖에서만 표시한다(D-094).
코스 재생은 DB 연습 기록을 쓰지 않는다(숫자 SheetMusic ID 없는 정적 콘텐츠). 사용자 업로드 경로는 변경하지 않는다.
#228의 박자·조표 표시 전에는 SongIntro의 원본 표시 계약을 그대로 유지한다.

## Completion criteria

원본 MusicXML과 JSON의 음높이·시작·길이·손·운지 정확히 일치, 생성물 최신 검사, 로그인 없는 코스→재생,
알 수 없는 slug 404, 악보 렌더와 320px 가로 넘침, 원본 링크 확인. 전체 로컬 검증·PR CI·리뷰·승인 후 병합·Post-merge 확인.

## Progress

- 2026-10-04: 기존 변환기와 score artifact 재사용 경로 확인. #226 결정 대기 중 독립 진행.
