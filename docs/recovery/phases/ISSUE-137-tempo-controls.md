# ISSUE-137 — 템포 단위 입력과 저장된 악보의 빠르기 수정

Status: `DONE`
Depends on: P1-A, canonical v1.1 tempo provenance

Progress (2026-09-05): PR #139가 `bf79a07`로 병합되어 #137이 닫혔다. 전체 hosted CI 통과,
merge commit `bf79a07`의 post-merge E2E/build를 포함한 전체 체크도 통과했다. D-046의 제안은 이 구현의 병합으로 채택됐다. 사용자 설정 미커밋 변경 때문에
병합된 브랜치는 보존한다. 실제 운영 악보의 템포 변경은 이 세션에서 실행하지 않았다.

## Objective

악보의 점4분음표=46을 4분음표=46으로 오입력하는 경로를 제거하고,
스크롤로 숫자가 바뀌지 않는 입력·슬라이더와 기존 악보의 템포 수정 경로를 제공한다.

## Work stages

1. 단위 환산·빈 값·업로드 전송값·기존 악보 시간 변환 회귀를 먼저 작성한다.
2. quarter/dotted-quarter/eighth/half 단위 선택과 슬라이더, 자동 인식 안내를 제공한다.
3. 소유자 템포 수정은 기존 JSON을 읽어 전체 시간축을 균일 배율로 변환한 새 객체를 저장한다.
4. 기존 URL/updatedAt을 비교하는 DB 갱신으로 동시 편집을 검출한다. 실패하면 기존 악보를 보존한다.
5. focused/전체 Jest, typecheck, lint, build와 review-ready PR 및 리뷰 대응을 기록한다.

## Completion criteria

- 점4분음표 46 입력은 API에 quarter BPM 69로 전달된다.
- 빈 업로드 입력은 자동 인식을 사용하고, 자동 인식도 없을 때만 미상으로 표시한다.
- 키 입력 영역은 wheel로 값이 바뀌지 않으며 슬라이더와 단위가 접근 가능한 label을 가진다.
- 소유자는 라이브러리 편집창에서 템포를 지정할 수 있다. 빈 편집 값은 기존 템포 유지다.
- 템포 수정은 note start/duration와 전체 duration를 함께 바꾸고 MIDI/hand/finger를 보존한다.
- 권한 실패·잘못된 BPM·저장 실패·동시 편집은 기존 URL과 데이터를 훼손하지 않는다.
- 필수 검증, 리뷰 대응, 명시적 승인에 따른 병합까지 기록한다.

## Out of scope

- #134의 9/8→6/8 인식 원인 및 음표 인식 수정. 메타데이터 템포 수정으로 이슈 전체를 닫지 않는다.
- 원본 MusicXML 보관, 페달 계약, 운지 모델.

Decision: D-046. 사용자 승인 없는 기존 운영 악보 일괄 수정은 하지 않는다.
