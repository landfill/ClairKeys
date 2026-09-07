# Historical issue closure verification — 2026-09-07

The user explicitly approved closing five historical issues using the reasons below.
All five were read back as CLOSED / NOT_PLANNED and each posted comment exactly
matched the authorized rationale. No code, settings, runtime or diagnostic policy
was changed. This records a backlog disposition, not a new implementation decision.
No new application tests or runtime verification were performed.

## Issue 44

[Verified closure comment](https://github.com/landfill/ClairKeys/issues/44#issuecomment-5567705081)

## 종료 판단 · 2026-09-07

사용자의 명시적 승인에 따라 종료합니다.

대상 Bach 악보를 현재 사용하지 않으므로 조사를 종료합니다. 해당 원본의 박자 오류가 수정됐거나 최신 환경에서 해결됐다는 검증은 없습니다. 현재 사용하는 악보의 정확도 문제는 #134에서 계속 다룹니다. 대상 악보를 다시 사용하고 문제가 재현되면 원본과 실제 서빙 결과를 확보해 재개합니다.

종료 분류: `not planned` — 현재 추진하지 않는 잔여 범위입니다. 코드·설정 변경이나 신규 런타임 검증은 수행하지 않았습니다.

## Issue 61

[Verified closure comment](https://github.com/landfill/ClairKeys/issues/61#issuecomment-5567705534)

## 종료 판단 · 2026-09-07

사용자의 명시적 승인에 따라 종료합니다.

현재 피아노 샘플의 음량 특성을 유지하고 샘플별 추가 보정은 추진하지 않습니다. 과거 측정 편차만으로 현재 사용자가 겪는 청감 문제를 확정할 수 없으며, 이번 종료는 편차 제거 또는 청감 검증 완료를 의미하지 않습니다. 실제로 불편한 음역·음표와 재현 가능한 청감 사례가 확보되면 재검토합니다.

종료 분류: `not planned` — 현재 추진하지 않는 잔여 범위입니다. 코드·설정 변경이나 신규 런타임 검증은 수행하지 않았습니다.

## Issue 46

[Verified closure comment](https://github.com/landfill/ClairKeys/issues/46#issuecomment-5567705958)

## 종료 판단 · 2026-09-07

사용자의 명시적 승인에 따라 종료합니다.

현행 엔진에서의 재현 근거가 부족하여 작은 판형 PDF의 배율 조정 작업을 현재 추진하지 않고 종료합니다. 최신 환경에서 실패가 발생하지 않는다고 검증한 것은 아니며, DPI 정책도 변경하지 않습니다. 실제 사용하는 PDF에서 동일 문제가 재발하면 해당 입력과 현재 엔진의 렌더링 크기·오선 간격·실패 단계로 재개합니다.

종료 분류: `not planned` — 현재 추진하지 않는 잔여 범위입니다. 코드·설정 변경이나 신규 런타임 검증은 수행하지 않았습니다.

## Issue 47

[Verified closure comment](https://github.com/landfill/ClairKeys/issues/47#issuecomment-5567706393)

## 종료 판단 · 2026-09-07

사용자의 명시적 승인에 따라 종료합니다.

최초 핵심 증상인 원시 Java 스택 트레이스 노출은 DS-3 / PR #91에서 해결됐습니다. 남은 상세 오류 분류와 원인별 행동 안내는 현재 별도 개선 과제로 추진하지 않기로 하여 종료합니다. 모든 오류 분류가 구현됐다는 의미는 아닙니다. 실제 실패 안내가 사용자의 복구를 막는 사례가 확인되면 구체적인 사례로 재개합니다.

종료 분류: `not planned` — 현재 추진하지 않는 잔여 범위입니다. 코드·설정 변경이나 신규 런타임 검증은 수행하지 않았습니다.

## Issue 73

[Verified closure comment](https://github.com/landfill/ClairKeys/issues/73#issuecomment-5567706837)

## 종료 판단 · 2026-09-07

사용자의 명시적 승인에 따라 종료합니다.

현재 확인된 결과 유실·고착 장애가 아니라 실제 HTTP 실패 루프와 소진 후 회수 검증의 공백이므로, 별도 검증 과제로 추진하지 않고 종료합니다. 콜백 실패·소진·복구가 모두 정상이라고 입증한 것은 아닙니다. 콜백 경로를 변경하거나 실제 결과 미도착 문제가 발생하면 해당 검증을 다시 검토합니다. #110의 콜백 목적지 검증은 별도 이슈로 유지합니다.

종료 분류: `not planned` — 현재 추진하지 않는 잔여 범위입니다. 코드·설정 변경이나 신규 런타임 검증은 수행하지 않았습니다.

## Remaining scope

Open issues immediately after verification: 9.

- #110: notify_completion이 callback_url의 호스트·스킴을 검증하지 않는다 — 이중 방어 (#71 선택 항목 2)
- #121: [Operations] OMR VM의 가용성·변환 작업·자원·결과 품질을 운영자가 관측하고 알림받을 수 있게 한다
- #124: [UI] 검은건반 노트의 운지 번호가 노트보다 넓게 그려져 가독성이 떨어진다
- #125: [UI] 연습 화면 세로 배분이 건반의 실제 비율에 묶여 있어 악보를 놓을 자리가 없다
- #126: [Fingering] 하행·반복·비CAGED 구간에서 엄지가 연속 반복된다 — 손 이동과 엄지 넘김이 비용 모델에 없다
- #127: [Data] MusicXML을 보관할지 결정한다 — 변환 직후 삭제되어 재변환·사후 진단이 불가능하다
- #130: [Fingering] phrase-dp-v2가 왼손에서 손을 한 걸음에 소모하고, 화음에 물리적 도달 한계가 없다
- #134: 박자가 전혀 안맞음
- #146: [UI] 기능 확장 없이 서비스 UI 리뉴얼 — 화면 위계·악보 카드·연습 전환·모바일 정돈

Existing user settings/HANDOFF edits and local UI screenshots were preserved and excluded from staging.
