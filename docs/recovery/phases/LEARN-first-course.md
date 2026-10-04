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

### CI 오디오 경계 확인 (2026-10-04)

첫 CI의 Linux Firefox에서 재생 바가 나오지 않았다. 오디오 resume 미완료 fixture로 같은 실패를 재현했다.
코스 기능의 UI E2E는 네이티브 AudioContext를 관찰해 재생 성공과 장치가 시작되지 않은 상태를 구분한다.
후자는 Firefox에서 실제 state=suspended/resume pending 증거가 있을 때만 정지 상태·코스 이동 유지로 단언하고 진단을 첨부한다.
테스트를 skip하지 않으며 오디오 시계를 모사해 성공으로 만들지 않는다. Chromium/WebKit의 재생·시간 증가 단언은 유지한다.
CI의 실제 원인이 이 경계와 다른 경우 테스트는 계속 실패한다.

### 재현으로 확인한 수정 범위 (2026-10-04)

resume 미완료 fixture에서 모바일의 회전 요청이 끝나지 않아 코스 링크 클릭도 막히는 실제 결함을 확인했다.
공유 오디오 시작에 4초 상한을 두고 실패를 반환해 기존 orientation.exit 경로로 복귀시킨다. 기존 status 줄을 시작 실패 안내로 바꾸며
새 조작 요소는 추가하지 않는다. 늦게 resume이 끝나도 자동 재생하지 않고, 사용자가 다시 재생하면 정상 시작할 수 있어야 한다.
시간이 흐르는 척하는 대체 재생 시계는 도입하지 않는다(D-007). 관련 훅 회귀와 모바일 이동·요소 수를 추가 검증한다.

- 2026-10-04: PR233 최종 CI·리뷰 통과 후 사용자 승인 병합, #227 종료. Post-merge 확인 대기([PR233](../reviews/PR-233.md)).
