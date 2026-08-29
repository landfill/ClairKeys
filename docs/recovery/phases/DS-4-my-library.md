# DS-4 — 내 악보

Status: `IN_PROGRESS`
Depends on: DS-1 (DS-1이 이미 **DS-G1**을 선행 조건으로 갖는다 — 처리 상태 출처 계약은 확정된 상태다)
Blocks: DS-7
Issue: [#76](https://github.com/landfill/ClairKeys/issues/76) 4단계

## Objective

내 악보를 "업로드한 파일 목록"에서 "지금 연습할 수 있는 것과 아직 아닌 것을 구분해 주는 화면"으로
바꾼다. 처리 상태는 DS-3과 **같은 계약**(DS-G1)을 읽는다.

## In scope

- **파생 상태 4종**을 한 화면에서 구분 (DS0-6) — 아래 확정 계약
- 파일명보다 사용자 제목 우선, 제목 편집 흐름 (DS0-4, DS0-8)
- 마지막 연습 위치와 이어하기
- 신규 업로드 CTA의 발견 가능한 배치
- 빈 상태 (악보 0건)

### 확정된 계약 (D-026)

화면은 `processingStatus` **원값을 읽지 않는다.** 아래 파생 상태만 읽는다. 원값을 그대로 그리면
legacy `'pending'` 행이 영원히 "처리 중"이 된다.

| 파생 상태 | 판정 |
|---|---|
| 연습 가능 | `animationDataUrl !== ''` |
| 처리 중 | `animationDataUrl === ''` && `processingStatus === 'processing'` |
| 오류 | `animationDataUrl === ''` && `processingStatus === 'failed'` |
| 알 수 없음 | 그 외 (`''` + `'pending'`). 값을 지어내지 않고, 오류와 같은 복구 행동을 준다 |

`/api/sheet`(목록)와 `/api/sheet/[id]`(상세)가 **파생 상태를 반환하도록 확장한다.** 현재 둘 다
`processingStatus`를 반환하지 않는다. 원값과 `omrJobId`는 노출하지 않는다.

**이 화면은 `/processing`을 대체하는 도달 경로다** (D-026 G1-4). DS-1이 그 메뉴를 이미 제거했다.

**착수 전 확인**: 운영 데이터에 `'pending'` + 빈 `animationDataUrl` 행이 몇 건인지 세어 본다.
DS-G1 시점에 DB 접근 권한이 없어 확인하지 못했다.

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

- 파생 상태 4종이 목록에서 구분된다. 화면 코드가 `processingStatus` 원값을 읽지 않는다.
- `/api/sheet` 목록과 상세가 파생 상태를 반환하고, 원값·`omrJobId`를 노출하지 않는다.
- `'pending'` + 빈 `animationDataUrl` 행의 운영 건수가 확인·기록되어 있다.
- 제목이 파일명이 아닌 사용자 제목이고, 화면에서 편집할 수 있다.
- 빈 상태에 신규 업로드로 가는 행동이 있다.
- 이어하기가 구현됐거나, 구현하지 않은 경우 그 이유와 필요한 선행 작업이 기록되어 있다.
- 각 상태의 회귀 테스트가 있다 (처리 중 / 연습 가능 / 오류 / 빈 상태).
- `alert()` 호출이 `src/components/library/`에 없다.

## 검증 명령

```bash
npm run lint && npx tsc --noEmit && npm test && npm run test:e2e && npm run build
grep -rn 'alert(' src/components/library/    # 0건
grep -rn 'processingStatus' src/components/library/   # 0건 — 원값이 아니라 파생 상태를 읽는다
grep -rn 'omrJobId' src/app/api/sheet/                # 0건 — 노출하지 않는다
```

## Progress

- 2026-08-30 — PR #92에서 구현 완료 후 CI·리뷰 대기. 운영 DB 분포는 `processing` 2건,
  `completed` 2건이며 `'pending'` + 빈 `animationDataUrl` 행은 0건이다. `알 수 없음`은 현재
  노출 대상은 없지만 D-026 계약과 legacy/미래 행을 위해 구현했다.
- 2026-08-30 — `PracticeSession`은 `durationSeconds`·`completedPercentage`만 저장하고 재생 위치
  필드와 복원 소비자가 없다. 따라서 이 단계는 이어하기 UI를 구현하지 않는다; 저장 계약이 확정된
  후속 작업이 필요하다.
- 2026-08-30 — PR #92는 merge commit `64aecb2`로 병합했다. 파생 상태·제목 편집·빈 상태·삭제 오류
  기준은 구현됐지만, 목록 갱신의 `aria-live`와 인증 뒤 반응형 1440·1024·390 측정은 아직 없다.
  따라서 이 단계는 `DONE`이 아니라 후속 마감 PR을 기다리는 `IN_PROGRESS`다.
