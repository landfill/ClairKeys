# 2026-09-02 — 이슈 #58 검은건반 기하

대상: `src/utils/pianoLayout.ts`, `src/components/piano/SimplePianoKeyboard.tsx`,
`docs/recovery/DECISIONS.md` (D-037)
브랜치: `codex/issue-58-black-key-geometry`
커밋: 회귀 `1664afd` → 수정 `072e919`

## 착수 전 확인한 사실

**1. 이슈의 계산을 독립 재현했다.** 백건 23.5mm · 흑건 13.7mm에서 그룹 내 후면 백건 폭이 균등하다고
두고 재계산한 결과가 이슈 본문의 표와 일치한다.

| 건반 | 좌변 오프셋 (백건 폭 단위) | 중심의 경계 대비 편차 |
|---|---:|---:|
| C# | 0.6113 | −0.0972 |
| D# | 0.8057 | +0.0972 |
| F# | 0.5628 | −0.1457 |
| G# | 0.7085 | 0.0000 |
| A# | 0.8543 | +0.1457 |

흑건 폭 = 13.7 / 23.5 = 0.5830. G#의 편차가 정확히 0인 것은 3흑건 그룹의 대칭축이라는 뜻이며,
모델이 자기정합적이라는 근거다.

**2. 이슈 본문의 전제 하나가 현재 코드와 다르다.** 이슈는 `PianoKeyboard.tsx`를 "모바일 전체화면·
가로모드·데모가 사용"한다고 적었으나, 라우트에서 도달할 수 없다.

```
$ grep -rn "FullScreenPiano\|LandscapePianoInterface" src/ --include="*.tsx" --include="*.ts" \
    | grep -v "src/components/mobile/"
(출력 없음)
```

`PianoKeyboard.tsx`의 소비자는 `FullScreenPiano.tsx`와 `LandscapePianoInterface.tsx` 둘뿐이고, 그
둘을 import하는 파일이 `src/components/mobile/` 밖에 0개다. 실제 재생 경로는
`FallingNotesPlayer` → `SimplePianoKeyboard` → `buildKeyLayout()` 하나다. 따라서 이슈 할 일 3(두
구현 통일)은 **현재 사용자에게 보이지 않는 문제**이며 D-037 결정 4로 P2-A 죽은 코드 정리에 이관했다.

**3. D-024는 이 작업을 막지 않는다.** `docs/recovery/phases/DS-0-current-state-baseline.md`의
"변경하지 않을 회귀 계약" 표에 고정된 상수는 `PX_PER_SEC` 140, `BASE_PLAYBACK_KEY_WIDTH` 24,
`PIANO_KEY_ASPECT` 6.3, `FALLING_TO_KEYBOARD_RATIO` 1.15, `MIN_LOOK_AHEAD_SEC` 1,
`MAX_LOOK_AHEAD_SEC` 2.5, `MIN_KEYBOARD_HEIGHT` 120 일곱 개이고, **흑건 오프셋과 흑건 폭은 없다.**
다만 절의 헤더가 `pianoLayout.ts`를 명시하므로 결정(D-037)을 코드와 같은 커밋에 넣었다.

## 회귀를 먼저 관측했다

기존 유일한 흑건 위치 검사는 `|중심 − 경계| ≤ 0.35 * keyWidth`라는 **절대값 상한**이라 부호를 보지
않는다. 방향이 반대인 값도 통과한다. 새 회귀 3건을 `pianoLayout.test.ts`에 추가했고, 기대값은
**구현에서 import하지 않고 표준 치수에서 테스트가 직접 유도한다.**

| 테스트 | 검사하는 것 |
|---|---|
| `leans each black key the way a real piano does` | C#·F# < 0, D#·A# > 0, G# ≈ 0 (방향 불변식) |
| `places black keys at the offsets standard piano dimensions imply` | 편차가 유도값과 일치 (정밀도 6자리) |
| `gives every black key the real black-key width` | 폭이 0.5830 × keyWidth |

수정 전 (`1664afd`):

```
$ npx jest src/utils/__tests__/pianoLayout.test.ts
Tests: 3 failed, 14 passed, 17 total
  ● leans each black key the way a real piano does
  ● places black keys at the offsets standard piano dimensions imply
      Expected: 2.9148936170212765   Received: -2
  ● gives every black key the real black-key width
      Expected: 11.659574468085106   Received: 12
```

수정 후 (`072e919`): `Tests: 17 passed, 17 total`.

기존 검사 `does not overlap black keys`와 `keeps the empty gap ... within 1.5 white-key widths`도
그대로 통과했다 — 새 기하가 기존 불변식을 깨지 않았다.

## 전체 검증

| 명령 | 결과 |
|---|---|
| `npx jest` | **85 suites / 796 tests 통과** (직전 793 + 신규 회귀 3) |
| `npx tsc --noEmit` | 통과 (exit 0) |
| `npm run lint` | `✔ No ESLint warnings or errors` |
| `npm run build` | 성공 |

## 함께 고친 파생 상수

`SimplePianoKeyboard.tsx`의 `decorationScale`이 흑건 기준 폭을 리터럴 `14.4`(= 24 × 0.6)로 갖고
있었다. 흑건 폭 비율이 바뀌면 조용히 어긋나는 값이라 `BASE_PLAYBACK_KEY_WIDTH × BLACK_KEY_WIDTH_RATIO`
파생식으로 바꿨다. 테두리·그림자 두께에만 쓰이므로 좌표에는 영향이 없다.

## 검증하지 못한 것

- **실제 브라우저·실기기의 육안 확인.** 변경 폭이 keyWidth 24에서 2~4px이라 회귀 테스트가 좌표를
  판정했고 육안 판정은 하지 않았다.
- **`PianoKeyboard.tsx` 경로.** 라우트에서 도달할 수 없어 실행되지 않는다. 이 파일은 여전히 실제의
  2배 이상 과장된 편차를 그리며, 되살릴 때 D-037에 맞춰야 한다(D-037 Directive).
- **낙하 노트와 건반의 정렬 육안 확인.** 둘 다 `buildKeyLayout`을 출처로 쓰므로 구조적으로 함께
  움직이지만, 실제 재생 화면에서 확인하지는 않았다.
