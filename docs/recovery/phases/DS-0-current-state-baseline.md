# DS-0 — 디자인 개편 착수 전 현재 상태와 제품 계약 고정

Status: `IN_PROGRESS`
Depends on: P1-A (`DONE`)
Issue: [#76](https://github.com/landfill/ClairKeys/issues/76) 0단계

## Objective

이슈 #76 전면 개편에 착수하기 전에, 지금 운영 중인 화면·기능·계약이 무엇인지를 코드 근거와 함께
고정한다. 이후 DS-1~DS-7 어떤 단계도 이 문서에 기록되지 않은 동작을 "원래 그랬다"거나 "원래
없었다"고 주장하지 않는다.

## In scope

- 라우트별 화면 인벤토리와 인증 경계
- 이슈 #76이 전제한 사용자 여정과 실제 코드 동작의 대조
- 기능 지원표: 지원 / 부분 지원 / 미지원
- 디자인 개편이 **바꾸지 않을** 회귀 계약 목록과 그 근거 문서

## Out of scope

- 디자인 토큰, 컴포넌트, 화면 구현 (DS-1 이후)
- 여기서 발견된 결함의 수정 — 별도 이슈로 등록하고 해당 단계에서 처리한다
- 이슈 #47·#46(오류 분류), #65·#66(재생 결함)의 해결

## 화면 인벤토리

`src/app/**/page.tsx` 18개. 인증 경계는 두 겹이다 —
`src/middleware.ts:19`의 `protectedPaths = ['/library', '/upload', '/profile']`와,
각 페이지가 개별로 감싸는 클라이언트 `AuthGuard`.

| 라우트 | 역할 | middleware 보호 | AuthGuard | UI 진입점 |
|---|---|---|---|---|
| `/` | 홈 | 아니오 | 없음 | Header, Footer |
| `/explore` | 공개 악보 탐색 | 아니오 | 없음 | Header, Footer, 홈 CTA |
| `/sheet/[id]` | 학습 플레이어 + 악보 정보 | 아니오 | **있음** | `/explore`, `/library` |
| `/auth/signin` | 로그인 | 아니오 | 없음 | Header 로그인, AuthGuard 리다이렉트 |
| `/auth/error` | 인증 오류 | 아니오 | 없음 | NextAuth 설정 |
| `/upload` | 업로드 | 예 | 있음 | Header, Footer, `/library` FAB, `/explore` FAB |
| `/library` | 내 악보 | 예 | 있음 | Header |
| `/processing` | 처리 상태 | 아니오 | 있음 | Header |
| `/profile` | 계정 | 예 | — | UserProfile 드롭다운 |
| `/offline` | PWA 오프라인 | 아니오 | 없음 | service worker |
| `/demo-animation` `/demo-category` `/demo-playback` `/demo-practice` | 개발용 데모 | 아니오 | 없음 | **없음 (유입 링크 0)** |
| `/test-background-processing` `/test-finger` `/test-piano` | 개발용 테스트 | 아니오 | 없음 | **없음 (유입 링크 0)** |
| `/admin/update-finger-data` | 운지 데이터 관리 | 아니오 | — | 없음 |

주: 데모·테스트 7개 라우트는 UI에서 도달할 수 없지만 **프로덕션에서 URL로는 열린다.**
`middleware.ts`의 `protectedPaths`에 없고 `AuthGuard`도 없다. DS-1의 정보 구조 결정에서 이들을
제거할지 격리할지 정한다.

## 사용자 여정 기준선

이슈 #76이 목표로 선언한 여정과 현재 코드의 대조다.

| 여정 단계 | 현재 동작 | 근거 |
|---|---|---|
| 홈에서 결과 이해 | 정적 건반 미리보기(`buildKeyLayout(24)`, `activeKeys=new Set()`) — 떨어지는 노트 없음 | `src/app/page.tsx:36-56` |
| 주 CTA | `시작하기` → `/upload`. `내 악보로 시작하기` 아님 | `src/app/page.tsx:22-26` |
| 로그인 전 체험 | **불가능.** 아래 "인증 경계" 참조 | `src/app/sheet/[id]/page.tsx:139,153,174` |
| 로그인 맥락 설명 | `PDF 악보를 피아노 애니메이션으로 변환하여 학습하세요` 한 줄. 계정이 필요한 이유 없음 | `src/app/auth/signin/page.tsx:113-115` |
| 로그인 후 원래 행동 복귀 | **경로에 따라 다르다.** AuthGuard 경유는 복귀, Header 로그인 버튼은 항상 `/` | `src/components/auth/AuthGuard.tsx:25-26` vs `src/components/auth/LoginButton.tsx:17` |
| 업로드 상태 분리 | `OMRUploadForm` 하나. 파일 검사와 변환 요청이 별도 상태로 표시되지 않음 | `src/app/upload/page.tsx:57-60` |
| 처리 단계 표시 | 서버는 `progress` 숫자 + 영문 `message` 4단계만 제공 | `omr-service/app.py:323-364` |
| 페이지 이탈 후 계속 처리 | **동작한다** (D-018 callback). 그러나 UI에 그 사실을 알리는 문구가 없다 | D-018, `src/app/api/omr/finalize/route.ts` |
| 완료 알림 | **실사용 경로에 없다.** 아래 "처리 상태 단절" 참조 | `src/app/api/omr/upload/route.ts` |
| 내 악보의 처리 중·오류 | **표시하지 않는다.** 목록이 `processingStatus`를 렌더하지 않음 | `src/components/library/LibrarySheetMusicList.tsx` |

### 인증 경계 — 로그인 전 체험을 막는 것은 두 겹이다

완료 조건 "로그인 전 실제 학습 결과를 최소 한 번 체험할 수 있다"는 현재 **두 지점**에서 막힌다.
DS-2에서 한쪽만 풀면 화면은 열리고 데이터는 401이 된다.

1. `src/app/sheet/[id]/page.tsx:139,153,174` — 페이지 전체가 `AuthGuard`로 감싸여 있다. 로딩·오류·정상
   렌더 세 분기 모두 동일하다.
2. `src/app/api/files/animation/route.ts:88-95` — GET이 세션 없으면 401을 먼저 반환한다.
   소유·공개 판별(`:110-118`)은 그 뒤에 온다.

`src/app/api/sheet/[id]/route.ts:53-58`의 GET은 이미 공개 악보를 세션 없이 허용한다. 즉 메타데이터는
열려 있고 애니메이션 데이터만 닫혀 있다.

### 처리 상태 단절 — `/processing`은 실제 업로드를 보지 않는다

Header의 `처리 상태` 메뉴는 `/processing` → `ProcessingDashboard` →
`useBackgroundProcessing` → `GET /api/processing`으로 `ProcessingJob` 테이블을 읽는다.

그런데 canonical 업로드 경로인 `src/app/api/omr/upload/route.ts`는 `prisma.sheetMusic`만 쓰고
**`ProcessingJob` 행을 만들지 않는다**(`:147`, `:225`). `/api/omr/finalize`에도
`ProcessingJob` 참조가 없다. 따라서:

- 실제 PDF를 올려도 `/processing`은 비어 있다.
- `/api/notifications`가 읽는 `ProcessingNotification`도 canonical 경로에서 생성되지 않으므로
  완료 알림이 발생하지 않는다.
- 실제 진행 상태는 `SheetMusic.processingStatus`(자유 문자열, `prisma/schema.prisma`)에만 있고
  이를 렌더하는 화면이 없다.

`ProcessingStatus`·`ProcessingStage` enum(`UPLOAD|PARSING|OMR|VALIDATION|GENERATION`)은 스키마에
존재하지만 canonical 경로가 채우지 않는다. 이슈 #76 3단계의 4개 처리 단계 문구를 이 enum에
기대어 쓰면 안 된다.

## 기능 지원표

| 기능 | 상태 | 근거 |
|---|---|---|
| PDF → MusicXML → ClairKeys JSON 변환 | 지원 | D-010 canonical `/api/omr/upload` |
| 페이지 이탈 후 백그라운드 완료 저장 | 지원 | D-018 callback + 폴링 fallback |
| 떨어지는 노트 + 건반 재생 | 지원 | `FallingNotesPlayer` |
| 재생 속도 조절 | 지원 | `tempoScale`, `PlaybackControls` |
| 메트로놈 값·출처 표시 | 지원 | 이슈 #82, `TempoDisplay` |
| 모바일 재생 가로 전환 | 지원 | D-019 |
| 반응형 건반 폭·낙하 기하 | 지원 | D-020, D-022, D-023 |
| 악보 provenance 경고 | 지원 | `DemoProvenanceNotice`, P1-A |
| 공개 악보 탐색·검색 | 지원 | `/explore` |
| 로그인 후 원래 행동 복귀 | 부분 지원 | AuthGuard만. Header 로그인 버튼은 `callbackUrl='/'` 고정 |
| 처리 진행 표시 | 부분 지원 | 업로드 화면에 머무는 동안만(`OMRProcessingStatus`). 이탈하면 추적 화면 없음 |
| 구간 반복 | 미확인 | DS-5에서 `PlaybackControls` 실제 노출 여부를 확인한다 |
| 로그인 전 학습 결과 체험 | 미지원 | AuthGuard + `/api/files/animation` 401 |
| 처리 상태 전용 화면 | 미지원 | `/processing`이 canonical 경로와 단절 |
| 변환 완료 알림 | 미지원 | `ProcessingNotification`이 canonical 경로에서 생성되지 않음 |
| 내 악보의 처리 중·오류 상태 | 미지원 | 목록이 `processingStatus`를 렌더하지 않음 |
| 곡 제목 편집 | 미확인 | DS-4에서 `PATCH /api/sheet/[id]`(`:95`) 대비 UI 존재 여부 확인 |
| 마지막 연습 위치 이어하기 | 미지원 | `PracticeSession`은 있으나 재생 위치 복원 경로 없음 |
| 디자인 토큰 | 미지원 | `globals.css`는 `--background`/`--foreground` 2개뿐 (Tailwind v4) |
| 다크 모드 | 부분 지원 | `prefers-color-scheme`가 body 색만 바꾼다. 화면은 `bg-white`·`text-gray-*` 하드코딩 |
| 지원·개인정보 링크 | 미지원 | `Footer.tsx:47-59` 세 링크 모두 `href="#"` |

## 변경하지 않을 회귀 계약

DS-1~DS-7은 아래를 **시각 개편의 부수효과로 바꾸지 않는다.** 바꿔야 할 이유가 생기면 해당 결정
문서를 먼저 갱신한다(AGENTS.md).

### 재생 기하 — `src/utils/playbackGeometry.ts`, `src/utils/pianoLayout.ts`

| 상수 | 값 | 고정 이유 |
|---|---:|---|
| `PX_PER_SEC` | 140 | D-021 결정 1. 노트 낙하 속도는 손이 익히는 대상이라 화면에 따라 달라지면 안 된다 |
| `BASE_PLAYBACK_KEY_WIDTH` | 24 | D-020 결정 1. 상한이 아니라 기준 밀도 |
| `PIANO_KEY_ASPECT` | 6.3 | D-022 결정 1. 실제 백건 비율 |
| `FALLING_TO_KEYBOARD_RATIO` | 1.15 | D-023 결정 1. 낙하 영역의 실효 상한 |
| `MIN_LOOK_AHEAD_SEC` | 1 | D-022 결정 2. 건반이 침범할 수 없는 하한 |
| `MAX_LOOK_AHEAD_SEC` | 2.5 | D-023 결정 2. 초고해상도 안전망 |
| `MIN_KEYBOARD_HEIGHT` | 120 | D-022 결정 3. 좁은 화면의 바닥 |

불변식: 크롭 하한 ≤ `min(midi)`, 상한 ≥ `max(midi)` (D-017 결정 2). 폭을 벌기 위해 악보 음역을
줄이거나 노트를 필터링하지 않는다.

### 재생 가로 전환 — `src/hooks/usePlaybackOrientation.ts`

- 회전 조건은 `engaged && (pointer: coarse) && (orientation: portrait)` 하나의 식이다 (D-019 결정 1).
- iOS 판별은 `typeof screen.orientation?.lock === 'function'`으로만 한다 (D-019 결정 2).
- 방향 요청은 재생 클릭 핸들러 안에서 동기적으로 발사한다 (D-019 결정 3).
- 데스크톱은 회전 대상이 아니다 (D-019 결정 5).
- 공유 `PlaybackControls`는 수정하지 않는다 — `AnimationPlayer`와 demo 페이지가 의존한다 (D-019 결정 8).
- `body.playback-active .playback-chrome { display: none }`과 `body.playback-rotated { overflow: hidden }`
  (`globals.css`)는 Header·Footer를 재생 중 숨기는 계약이다. 새 셸도 `playback-chrome` 클래스를 유지한다.

### 데이터·저장 계약

- canonical 업로드 경로는 `/api/omr/upload` 하나다 (D-010).
- OMR 서비스는 스토리지 자격증명을 갖지 않는다 (D-011).
- 완료 저장은 생산자 callback이 트리거하고 브라우저 폴링은 fallback이다 (D-018).
- `SheetMusic.omrJobId`는 nullable unique이고 finalize는 `findUnique`를 쓴다 (이슈 #70).
- 빠르기는 값과 출처를 함께 저장하고 모르면 모른다고 저장한다 (D-013). 재생 속도 배율과
  악보 BPM을 같은 자리에 표시하지 않는다 (이슈 #82).
- 애니메이션 JSON은 `normalizeAnimationData`의 canonical 계약을 통과해야 한다 (D-002, D-009).
- provenance가 `demo`인 악보는 공개 목록에서 제외되고 재생 중 경고가 유지된다 (P1-A).

### 오디오

- 피아노 음색은 합성하지 않고 녹음을 재생한다 (D-014).
- 재생 레벨은 라우드니스 기준이다 (D-015, D-016).
- 음량 슬라이더는 압축 모드에서도 남는다 (D-019 결정 7).

### 접근성·회귀 테스트

- `e2e/application-smoke.spec.ts`의 세 검사 — 홈 렌더와 접근 가능한 내비게이션, 브라우저 확대
  허용, `/explore` 진입 — 는 공개 경로 기준선이다. 확대 허용은 viewport meta에서 되돌리지 않는다.
- `src/utils/__tests__/playbackGeometry.test.ts`, `pianoLayout.test.ts`,
  `src/components/animation/__tests__/FallingNotesPlayer.test.tsx`,
  `src/components/playback/__tests__/CompactPlaybackBar.test.tsx`가 위 기하·전환 계약을 고정한다.

## Work stages

1. 라우트 인벤토리, 인증 경계, 여정 대조를 코드 근거와 함께 고정한다.
2. 기능 지원표를 지원 / 부분 지원 / 미지원으로 분류한다.
3. 회귀 계약을 결정 문서 참조와 함께 목록화한다.
4. 운영(clairkeys.vercel.app) 화면을 로그인 전·후로 캡처해 1~2단계와 대조한다.
5. 대조에서 나온 신규 결함을 별도 이슈로 등록하고 담당 단계를 지정한다.

## Completion criteria

- 모든 라우트의 인증 경계와 UI 진입점이 기록되어 있다.
- 이슈 #76의 완료 조건 7개 각각에 대해 현재 상태가 지원 / 부분 지원 / 미지원으로 판정되어 있다.
- 디자인 개편이 바꾸지 않을 계약이 결정 문서 번호와 함께 열거되어 있다.
- 운영 화면 캡처가 코드 판정과 일치하거나, 불일치가 이슈로 등록되어 있다.
- DS-1의 진입 조건(정보 구조 결정 대상 목록)이 확정되어 있다.

## Progress

- 2026-08-29 — Work stages 1~3을 `f184f28` 기준으로 완료했다. 근거는
  `docs/recovery/validation/2026-08-29-ds0-code-inventory.md`.
  Work stage 4(운영 화면 캡처)는 로그인 후 화면에 사용자 계정 세션이 필요해 아직 수행하지 않았다.
  Work stage 5는 4에 의존한다.
