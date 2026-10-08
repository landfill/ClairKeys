# LEARN-236: 배우기 영역 화면 구성 개편

Status: IN_PROGRESS
Date: 2026-10-08
Issue: https://github.com/landfill/ClairKeys/issues/236

## Objective

`배우기` 영역은 내용과 접근성 계약은 갖췄지만 화면이 글과 그림을 위에서 아래로 쌓은 문서에 머물러 있다.
홈 카드의 클릭 영역, `/learn/reading`의 길이, 용어 사전의 찾기, 공통 레슨 레이아웃을 고친다. 내용(이론 정의·예시 데이터)은 그대로 두고 배치와 탐색 방식만 바꾼다.
운영 계측·개편안·완료 조건·비목표의 원본은 이슈 본문이다. 여기에 복제하지 않는다.

## 구현 전 결정 (사용자 확정 2026-10-08, 모두 이슈의 제안 기본값)

1. 악보 읽기를 `/learn/reading`(음높이)과 `/learn/reading/rhythm`(길이와 박자)으로 나눈다. 단계 지도는 5단계가 된다.
2. 용어 사전에 화면 안 찾기 입력을 둔다(저장·API 없음).
3. 옮겨 가는 앵커 4개는 저장소 안 링크만 고친다. 옛 해시 주소는 처리하지 않는다.
4. 레슨 본문 글자를 16px로 올린다.

1은 [LEARN-beginner-learning](LEARN-beginner-learning.md)의 단계 순서, 2는 #225 범위의 "검색 없음"과 달라진다.
각각 3단계·4단계 PR에서 `DECISIONS.md` 신규 결정과 해당 phase 문서를 함께 고친다.

## Work stages

단계마다 독립 PR이다. 앞 단계가 병합된 뒤에 다음 단계 브랜치를 만든다.

| 단계 | 내용 |
|---|---|
| 1 | 공통 카드(전체 클릭) + `/learn` 홈 세 구역 (이슈 A) |
| 2 | 레슨 레이아웃: 위치 표시, 목차, 이전·다음 버튼, 본문 글자·링크 영역 (이슈 D) |
| 3 | 악보 읽기 분리 + 전환형 예시 패널 (이슈 B) |
| 4 | 용어 사전 찾기·필터·조밀한 배치, 레슨 본문의 용어 링크 (이슈 C) |

## Completion criteria

이슈 #236의 "완료 조건"과 같다. 네 단계가 모두 병합되면 항목별 대조 기록을 `validation/`에 남긴다. 이슈 종료는 사용자가 정한다.

## Scope

`src/app/learn/**`, `src/components/learn/**`, `src/lib/learn/**`, 관련 Jest·E2E.
제외: 재생 화면(D-094), 새 디자인 토큰, 이론 정의·예시 데이터·소리, 레슨 완료·진도 표시(D-098), 용어 팝오버, 새 그림, `/learn`의 로그인 보호.

## 작업 방식

구현은 Antigravity CLI(`claude-opus-5-5-high`, 한도에 가까우면 `gemini-3.8-flash-high`), 리뷰는 Codex `gpt-6.1-sol` reasoning `high`,
Claude는 오케스트레이션·검증·기록을 맡는다(사용자 지시 2026-10-08). 커밋별 구현 모델은 각 PR의 리뷰 로그에 남긴다.

## Progress

| 단계 | 상태 | 근거 |
|---|---|---|
| 1 | DONE | [PR237](../reviews/PR-237.md) 병합 `cdfdb7d`, [검증·계측](../validation/2026-10-08-learn-236-stage1-home-cards.md) |
| 2 | IN_PROGRESS | 브랜치 `codex/learn-236-lesson-layout` |
| 3 | NOT_STARTED | |
| 4 | NOT_STARTED | |

- 2026-10-08: 결정 4개 확정, 1단계 착수.
- 2026-10-09: 필수 검사 `Security Audit`이 새 권고로 막혀 #238을 먼저 처리했다([PR239](../reviews/PR-239.md) 병합 `0374a2e`). 그 뒤 1단계 PR237 병합(`cdfdb7d`).
  1단계에서 홈 문서 높이가 늘었다(1280×800 1111→1484px, 390×844 1316→2306px). 완료 조건에 홈 길이 기준은 없다.
- 2026-10-09: 1단계 병합 커밋의 Post-merge checks 성공. 완료 조건에서 학습용 피아노의 검은 건반 폭을 예외로 뒀다(사용자 결정, 이슈 본문 반영). 2단계 착수.
