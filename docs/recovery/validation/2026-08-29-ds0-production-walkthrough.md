# Validation — DS-0/production-walkthrough

Date: 2026-08-29
Commit: 배포본(https://clairkeys.vercel.app). 로컬 비교 기준은 `f184f28`
Environment: macOS Chrome 1440×900, 사용자의 로그인 세션(계정 소유자), 익명 확인은 `curl`

## Claim being verified

`2026-08-29-ds0-code-inventory.md`의 코드 기준 판정이 실제 배포본과 일치하는가. 특히 코드만으로
`미확인`으로 남긴 항목(구간 반복, 곡 제목 편집)과 인증 경계 판정.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| 브라우저: `/` (로그인 상태) | PASS | 히어로 정적 건반, CTA `시작하기`/`공개 악보 탐색`. 코드와 일치 |
| 브라우저: `/library` | PASS | 악보 5건. 카드 액션은 연주·이동·삭제뿐 — **처리 상태·오류·제목 편집 없음**. 제목이 파일명, 저작자에 `조`·`ㄴㅁㄹㄹㄴ`·`쇼핑` |
| 브라우저: `/processing` | PASS | `처리 작업 (0)`, `알림 (0)`. 같은 계정에 악보 5건이 있는데도 비어 있다 — 코드 판정(canonical 경로와 단절)이 운영에서 확인됨 |
| 브라우저: `/upload` | PASS | 드롭존·곡명·저작자·빠르기(BPM)·카테고리·공개 설정·`OMR 처리 시작`. 예상 처리 시간·백그라운드 안내·예시 악보 없음 |
| 브라우저: `/explore` | PASS | 카드 제목이 파일명이라 넘침. `악보 미리보기`는 플레이스홀더. 섹션 제목에 이모지 |
| 브라우저: `/sheet/2` | PASS | `♩=120 (출처 미상)`(#82), 건반 C2–C7 라벨(D-017 결정 4), 1차 컨트롤에 **구간 반복 없음** |
| `grep -n "loop\|Loop\|반복" src/components/playback/PlaybackControls.tsx` | PASS | 일치 0건. `FallingNotesPlayer`도 참조 없음 → 구간 반복 `미지원` 확정 |
| `curl -s .../api/files/animation?sheetMusicId=2` | PASS | **401** `{"error":"Unauthorized"}`. 코드 판정과 일치 |
| `curl -s .../api/sheet/28` | **FAIL(판정 뒤집힘)** | **200**. 익명에게 `provenance=omr`와 `animationDataUrl`을 그대로 반환 |
| `curl -sI <그 animationDataUrl>` | **FAIL(판정 뒤집힘)** | **200 application/json**. Supabase `/object/public/` 버킷이라 익명 접근 가능 |
| `curl -s .../api/sheet/29` (비공개 악보) | PASS | `{"error":"Access denied"}` — API는 비공개를 막는다 |
| 소유자로 얻은 sheet 29의 URL을 자격증명 없이 요청 | **신규 결함** | **200, 78,518 bytes.** 비공개 악보의 보호가 URL 은닉뿐이다 |
| `curl -o /dev/null -w '%{http_code}'` × 8 orphan 라우트 | PASS | `/demo-animation` `/demo-category` `/demo-playback` `/demo-practice` `/test-piano` `/test-finger` `/test-background-processing` `/admin/update-finger-data` 전부 **200** |

## Baseline comparison

- Fixed failures: 해당 없음 (동작 변경 없음)
- Remaining pre-existing failures: 해당 없음
- New failures: 없음. 대신 코드 기준 판정 1건이 뒤집혔고 신규 결함 1건이 발견됐다

## Manual checks

- **판정 정정**: 코드 인벤토리는 "로그인 전 체험을 막는 것은 두 겹(AuthGuard + API 401)"이라고 적었다.
  401 자체는 사실이지만 **우회 경로가 있다.** `/api/sheet/[id]`가 익명에게 `animationDataUrl`을 주고
  그 URL이 public 버킷이므로, 실제로 막는 것은 화면의 `AuthGuard` 한 겹뿐이다. DS-2는 API 인증을
  바꾸지 않고 구현할 수 있다.
- 중간에 페이지 안에서 `fetch(..., {credentials:'omit'})`로 시도한 확인은 **브라우저 HTTP 캐시에
  오염됐다** — 같은 URL을 직전에 쿠키와 함께 받은 뒤라 200이 나왔다. `/api/notifications`를 대조군으로
  두어(401) 오염을 확인했고, 최종 판정은 전부 `curl`로 다시 냈다. 이후 이런 확인은 페이지 밖에서 한다.

## Gaps and risks

- **신규 접근 제어 간극**: 비공개 악보의 애니메이션 JSON이 익명으로 내려온다. DS 범위가 아니므로
  별도 이슈로 분리해야 한다. 이 문서는 사실만 기록하고 수정 방향을 정하지 않는다.
- 실기기(모바일) 확인은 하지 않았다. 재생 가로 전환(D-019)과 기하(D-022, D-023)는 데스크톱에서만 봤다.
- WCAG AA 자동 검사는 여전히 실시하지 않았다.
- 업로드를 실제로 실행하지 않았다. 처리 단계 표시와 완료 알림의 실제 동작은 관측하지 않았고,
  `/processing`이 비어 있다는 사실로만 단절을 확인했다.
