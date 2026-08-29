# DS-4 — 내 악보

Status: `NOT_STARTED`
Depends on: DS-1, **DS-G1** (처리 상태 출처 계약)
Blocks: DS-7
Issue: [#76](https://github.com/landfill/ClairKeys/issues/76) 4단계

## Objective

내 악보를 "업로드한 파일 목록"에서 "지금 연습할 수 있는 것과 아직 아닌 것을 구분해 주는 화면"으로
바꾼다. 처리 상태는 DS-3과 **같은 계약**(DS-G1)을 읽는다.

## In scope

- 처리 중 / 연습 가능 / 오류를 한 화면에서 구분 (DS0-6)
- 파일명보다 사용자 제목 우선, 제목 편집 흐름 (DS0-4, DS0-8)
- 마지막 연습 위치와 이어하기
- 신규 업로드 CTA의 발견 가능한 배치
- 빈 상태 (악보 0건)

## Out of scope

- 업로드·처리 화면 자체 (DS-3)
- 전역 알림 (DS-7)
- 고아 컴포넌트 계층(`SheetMusicCardRefactored` 등)의 정리 — P2-A 소유. 이 단계는 `/library`가
  실제로 쓰는 경로만 바꾼다

## 변경 대상

| 경로 | 변경 |
|---|---|
| `src/app/library/page.tsx` | 레이아웃, 탭, CTA 배치 |
| `src/components/library/LibrarySheetMusicList.tsx` | 상태 배지, 제목 우선 표시, 편집 진입, 빈 상태 |
| `src/app/api/sheet/[id]/route.ts` | `PATCH`가 이미 있다. 필요한 경우 응답만 조정 |

## 이어하기의 선행 확인

`PracticeSession` 모델은 있으나 재생 위치를 복원하는 경로가 없다(DS-0 기능 지원표). 이어하기를
구현하려면 **무엇을 저장할지**를 먼저 정해야 한다. 저장 대상이 없으면 이 항목은 이 단계에서
제외하고 그 사실을 phase 문서에 기록한다 — 없는 데이터를 전제로 UI를 만들지 않는다.

## 회귀 기준

**기능 회귀**

- provenance가 `demo`인 악보가 공개 목록에서 제외되고 재생 중 경고가 유지된다 (P1-A).
- 카테고리 이동·삭제·검색·정렬이 동작한다.
- 삭제 확인이 `window.confirm`/`alert`이 아닌 앱 내 다이얼로그다 (현재 `alert` 사용 중).

**시각 회귀**

- DS-1 토큰만 사용한다.

## 접근성·반응형 검증

- 상태 배지가 색상 외 수단(아이콘·텍스트)을 동반한다.
- 제목 편집이 키보드로 열고 저장·취소할 수 있다.
- 카드 그리드가 1440·1024·390에서 깨지지 않고, 긴 제목이 잘리되 접근 가능한 전체 텍스트를 갖는다.
- 목록 갱신이 `aria-live`로 전달된다.

## Completion criteria

- 처리 중·연습 가능·오류 세 상태가 목록에서 구분된다. DS-G1이 정한 필드만 읽는다.
- 제목이 파일명이 아닌 사용자 제목이고, 화면에서 편집할 수 있다.
- 빈 상태에 신규 업로드로 가는 행동이 있다.
- 이어하기가 구현됐거나, 구현하지 않은 경우 그 이유와 필요한 선행 작업이 기록되어 있다.
- 각 상태의 회귀 테스트가 있다 (처리 중 / 연습 가능 / 오류 / 빈 상태).
- `alert()` 호출이 `src/components/library/`에 없다.

## 검증 명령

```bash
npm run lint && npx tsc --noEmit && npm test && npm run test:e2e && npm run build
grep -rn 'alert(' src/components/library/    # 0건
grep -rn 'processingStatus' src/components/library/   # DS-G1이 정한 필드를 실제로 읽는다
```
