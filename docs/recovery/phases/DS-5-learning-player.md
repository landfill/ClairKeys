# DS-5 — 학습 플레이어

Status: `IN_REVIEW`
Depends on: DS-1
Blocks: DS-6, DS-7
Issue: [#76](https://github.com/landfill/ClairKeys/issues/76) 5단계

## Objective

플레이어를 데스크톱 우선으로 다듬되, 실기기 보고로 세 번 고친 재생 기하를 **한 픽셀도 바꾸지 않고**
한다. 이 단계는 이 저장소에서 되돌리기 가장 비싼 계약을 건드리는 단계다 (D-024).

## In scope

- 떨어지는 노트와 건반을 최우선 시각 영역으로 유지
- **홈에서 재생기를 걷어내고 낙하 노트 결과가 들어갈 영역만 확보한다** (D-031). 정적 예시(GIF 등)를
  채우는 것은 후속 작업이고 이 단계가 하지 않는다
- 1차 컨트롤: 재생·정지, 속도, **구간 반복** (DS0-9 — 현재 없다)
- 첫 진입 안내 3단계 이하
- 원본 악보 보기와 전체 설정을 보조 패널로 이동
- 피아노 앞 거리에서 읽히는 데스크톱 크기
- 메트로놈 값·출처를 재생 전과 재생 중 모두 확인 가능하게 (이슈 #82, D-013)

## Out of scope

- **`src/app/sheet/[id]/page.tsx`의 `AuthGuard`와 데이터 로딩 분기.** DS-6 소유다
- 다크 모드 (D-025). 시각화 영역의 검은 배경은 다크 모드가 아니라 노트 대비용 컴포넌트 배경이다
- 오디오 샘플·게인 (D-014~D-016)

## 변경 대상

| 경로 | 변경 |
|---|---|
| `src/app/page.tsx`, `src/components/home/HomeSamplePlayer.tsx` | 재생기 제거, 영역만 확보 (D-031) |
| `src/components/animation/FallingNotesPlayer.tsx` | 레이아웃, 컨트롤 배치, 첫 진입 안내 |
| `src/components/playback/PlaybackControls.tsx` | 1차 컨트롤 구성, 구간 반복 추가 |
| `src/components/playback/CompactPlaybackBar.tsx` | 압축 모드 (D-019 결정 6·7 준수) |
| `src/components/playback/TempoDisplay.tsx` | 시각 정리만 |

**주의**: D-019 결정 8은 "공유 `PlaybackControls`는 수정하지 않는다 — `AnimationPlayer`와 demo
페이지가 현재 형태에 의존한다"이다. 구간 반복 추가가 이 결정과 충돌하므로, **코드를 고치기 전에
D-019를 갱신**하거나 별도 컨트롤로 분리한다 (AGENTS.md).

## 회귀 기준 — 이 단계의 핵심

**절대 바꾸지 않는 상수** (`src/utils/playbackGeometry.ts`, `src/utils/pianoLayout.ts`)

| 상수 | 값 | 근거 |
|---|---:|---|
| `PX_PER_SEC` | 140 | D-021 결정 1 |
| `BASE_PLAYBACK_KEY_WIDTH` | 24 | D-020 결정 1 |
| `PIANO_KEY_ASPECT` | 6.3 | D-022 결정 1 |
| `FALLING_TO_KEYBOARD_RATIO` | 1.15 | D-023 결정 1 |
| `MIN_LOOK_AHEAD_SEC` | 1 | D-022 결정 2 |
| `MAX_LOOK_AHEAD_SEC` | 2.5 | D-023 결정 2 |
| `MIN_KEYBOARD_HEIGHT` | 120 | D-022 결정 3 |

**불변식**: 크롭 하한 ≤ `min(midi)`, 상한 ≥ `max(midi)` (D-017 결정 2). 폭을 벌기 위해 악보 음역을
줄이거나 노트를 필터링하지 않는다.

**가로 전환** (`src/hooks/usePlaybackOrientation.ts`)

- 회전 조건은 `engaged && (pointer: coarse) && (orientation: portrait)` 하나의 식 (D-019 결정 1)
- iOS 판별은 `typeof screen.orientation?.lock === 'function'` (D-019 결정 2)
- 방향 요청은 재생 클릭 핸들러 안에서 동기적으로 (D-019 결정 3)
- 데스크톱은 회전 대상이 아니다 (D-019 결정 5)
- 압축 모드에서도 음량 슬라이더는 남고, 샘플 상태 줄은 `sr-only` live region으로 유지 (D-019 결정 7)

**`playback-chrome`**: 재생 중 Header·Footer가 숨는 계약이 유지된다.

## 반응형 검증

- **실기기 회귀**: 폰 가로(가용 약 276·326·390px)와 데스크톱을 **둘 다** 산출한다. 한쪽만 보면
  D-021·D-022처럼 다른 쪽에 결함이 남는다 (D-022 Directive).

## Completion criteria

- **홈에 재생기가 없고, 낙하 노트 결과가 들어갈 영역이 1440×900 첫 화면 안에 확보돼 있다**
  (완료 조건 1의 ①). `HOME_SAMPLE_ANIMATION` fixture는 정적 예시의 소스로 남긴다 (D-031).
- 구간 반복이 1차 컨트롤에 있고 동작한다. **D-019 결정 8은 D-031이 해소했다** — 홈이 빠지면
  `PlaybackControls`의 실사용처가 `AnimationPlayer` 하나이므로 공유 제약이 없다. props 플래그나
  별도 컴포넌트를 만들지 않고 직접 고친다.
- 위 상수 7개가 `git diff`에 나타나지 않는다.
- `playbackGeometry.test.ts`, `pianoLayout.test.ts`, `FallingNotesPlayer.test.tsx`,
  `CompactPlaybackBar.test.tsx`가 수정 없이 통과한다.
- 메트로놈 값·출처가 재생 전과 재생 중 모두 보인다.
- 폰 가로 실기기에서 낙하/건반 비율이 1.15이고 건반이 뭉툭해지지 않는다 (실측값 기록).
- 첫 진입 안내가 3단계 이하다.
- **홈 재생기 제거로 깨지는 검사 3건이 처리돼 있다** (D-031 Consequence):
  `e2e/application-smoke.spec.ts`의 `lets a signed-out visitor play the sample without logging
  in`(완료 조건 3이 DS-6 단독 판정이 되므로 DS-6으로 옮기거나 제거), 같은 파일 첫 화면 검사의
  `낙하 노트 건반`(확보된 영역을 재는 검사로 교체), `src/app/__tests__/page.test.tsx`의
  `샘플: {제목} · {작곡가}` 표시 검사.

## 검증 명령

```bash
npm run lint && npx tsc --noEmit && npm test && npm run test:e2e && npm run build
npm test src/utils/__tests__/playbackGeometry.test.ts src/utils/__tests__/pianoLayout.test.ts
npm test src/components/animation/__tests__/ src/components/playback/__tests__/
git diff origin/main -- src/utils/playbackGeometry.ts src/utils/pianoLayout.ts   # 비어 있어야 한다
git diff --stat origin/main -- src/app/sheet                                      # 비어 있어야 한다
```

수동(실기기): 폰 가로 재생 — 회전, 컨트롤 압축, 낙하/건반 비율. 데스크톱 — 회전하지 않음.

## 2026-08-30 Progress

- a) 메트로놈: 기존 `TempoDisplay`가 유휴/재생(fixed) 모두에서 값·출처를 렌더하며 기존 컴포넌트 테스트가 두 상태를 확인한다.
- b) 구현: 첫 진입 안내는 타이밍·속도·A-B 반복의 3단계다.
- c) 제외: 원본 PDF URL은 현재 API/계약이 제공하지 않고 sheet 데이터 로딩은 DS-6 소유다. DS-6에서 URL·권한 계약 뒤 보조 패널을 구현한다.
- d) 구현: 유휴 폭을 `max-w-6xl`로 넓히고 낙하/건반 시각화 컬럼을 우선 유지했다. 기하 상수는 변경하지 않았다.
- 압축 모드에도 A/B/해제 반복을 추가했다. 실기기 가로 회전·압축·1.15 비율은 사용자 수동 확인이 필요하다.
