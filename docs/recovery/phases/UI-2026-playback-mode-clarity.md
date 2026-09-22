# UI-2026 — 공통 재생 컨트롤의 불필요한 모드 설정 제거

Status: `DONE` — PR #184 merged `8bcfce8` on 2026-09-22; post-merge checks in progress.
Base: 2026-09-22 main; #177의 PC score-height 브랜치와 분리.

## Objective

사용자가 `/sheet/92`에서 지적한 `🎵 듣기 / 🎹 따라하기 / 📚 연습 가이드`는
현재 `FallingNotesPlayer`가 `listen`으로 고정하고 `onModeChange`에서 로그만
남긴다. 닫힌 `전체 설정`에는 이 선택과 상단 일시정지 버튼을 반복하는 상태
문구만 있다. 기능적으로 구분되지 않는 모드 UI를 특정 악보의 예외로 처리하지
않고 공유 재생 컨트롤에서 제거한다.

## Work stages

1. 현재 페이지와 `AnimationPlayer`·`AdvancedPlaybackControls`의 실사용 경로를
   확인하고, 변경 전 공통 컨트롤의 미작동 설정 재현 테스트를 실패시킨다.
2. 공통 `PlaybackControls`에서 모드 선택과 중복 상태만 담긴 `전체 설정`을
   제거한다. 현재 `FallingNotesPlayer`의 미구현 핸들러도 제거한다. 레거시
   엔진 코드는 별도 기능 작업을 위해 남기되 실사용하지 않는 UI를 약속하지 않는다.
3. 상단 재생/일시정지/중지, 속도, 음량, A-B 반복, 로딩·오류·재생 상태와
   접근성·모바일 크기를 검증한다. 신규 모드 기능은 만들지 않는다.

## Completion criteria

- 공통 재생 컨트롤과 `/sheet/[id]`의 재생 전 `전체 설정`, 모드 선택,
  중복 일시정지 상태가 없다.
  상단 실제 transport·속도와 별도 음량 슬라이더는 그대로 작동한다.
- 현재 제품의 다른 라우트에 이 레거시 모드 UI가 실제로 연결돼 있지 않음을
  확인한다. 엔진·키보드 단축키·데이터 계약은 이 PR에서 변경하지 않는다.
- 의미 없는 UI에 대한 회귀 실패가 구현보다 앞서고, 관련 unit/E2E·타입·lint·build,
  실제 데스크톱/모바일 화면 확인과 recovery 기록이 있다.
- 한 목적의 non-draft PR을 열고 현재 head CI·리뷰를 처리한다. 명시적 사용자 승인
  전에는 main에 병합하지 않는다.

## Out of scope

실제 건반/MIDI 입력 대기형 `follow`나 단계별 `practice` 엔진 통합은 요구사항과
정확도 계약이 별도로 필요한 기능이다. #177 악보 높이 변경은 이 PR에 포함하지 않는다.
