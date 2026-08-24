# 2026-08-24 — 이슈 #56: 88건반 검은건반 좌표 검증

- Branch: `codex/p1a-piano-black-key-layout` @ `299951d`
- PR: [#57](https://github.com/landfill/ClairKeys/pull/57)
- Scope: `pianoLayout.ts`, `visualUtils.ts`, `SimplePianoKeyboard.tsx`와 회귀 테스트

## 회귀 우선 재현

동작 코드를 수정하기 전에 `pianoLayout.test.ts`와 `SimplePianoKeyboard.test.tsx`를 추가했다.
첫 실행은 이 워크트리에 의존성이 설치되지 않아 아래처럼 테스트 자체가 시작되지 않았다.

| 명령 | 결과 |
|---|---|
| `npm test -- --runInBand src/utils/__tests__/pianoLayout.test.ts src/components/piano/__tests__/SimplePianoKeyboard.test.tsx` | **FAIL** — `sh: jest: command not found` |
| `npm ci` | 786 packages 설치, exit 0; audit는 기존 moderate 2건 보고 |

의존성 설치 뒤 같은 focused 명령을 수정 전 코드에 다시 실행했다.

- **Test Suites: 2 failed, 2 total**
- **Tests: 5 failed, 3 passed, 8 total**
- 실패 계약: x 정렬=MIDI 순서, 검은건반 중심=인접 흰건반 경계, 전체 폭 내부,
  인접 검은건반 빈 간격, 건반/낙하 노트의 canonical x

따라서 테스트가 수정 전 구현을 실제로 거부하는 것을 확인했다.

## 수정

검은건반 오프셋은 옥타브 C 기준 절대값을 버리지 않고 왼쪽 흰건반 기준 상대값으로 변환했다.

| pitch class | 건반 | 최종 offset |
|---:|---|---:|
| 1 | C# | 0.65 |
| 3 | D# | 0.6 |
| 6 | F# | 0.65 |
| 8 | G# | 0.6 |
| 10 | A# | 0.6 |

`visualUtils.ts`의 `keyPos.x + keyPos.w * 0.2`와 `SimplePianoKeyboard.tsx`의
`pos.x + pos.w * 0.2`는 각각 `keyPos.x`, `pos.x`로 바꿨다. 회귀 테스트가 A#0에 대해
두 소비자의 렌더 x와 `KeyLayout.x`가 모두 같음을 검증한다.

## 수정 후 검증

| 명령 | 결과 |
|---|---|
| `npm test -- --runInBand src/utils/__tests__/pianoLayout.test.ts src/components/piano/__tests__/SimplePianoKeyboard.test.tsx` | **PASS** — 2 suites / 8 tests |
| `npm test -- --runInBand` | **PASS** — 50 suites / 457 tests |
| `npm run lint` | **PASS** — No ESLint warnings or errors |
| `npm run type-check` | **실행 불가** — `package.json`에 script 없음 (`Missing script: type-check`) |
| `npx tsc --noEmit` | **PASS** — exit 0 |
| `git diff --check` | **PASS** |

`keyWidth=20`으로 독립 재계산한 최종 지표:

- 88 keys = 52 white + 36 black
- x 정렬에서 MIDI 순서 위반 0
- `totalWidth=1040`, 모든 건반의 최대 오른쪽 끝 `1040`
- 인접 검은건반의 최대 빈 간격 `29px` (한계 `30px`)
- A#0: `x=12`, `w=12`; A#1: `x=152`, `w=12`

## 검증하지 못한 것

- 영향받는 다섯 화면의 실제 브라우저 스크린샷 비교
- 호스팅 CI와 자동 리뷰의 최종 상태 — `docs/recovery/reviews/PR-57.md`에서 추적

## 별도 후속

README가 존재하지 않는 `npm run type-check`를 안내한다. 건반 좌표 PR의 한 목적 원칙을
지키기 위해 스크립트 추가나 README 수정은 포함하지 않았고 별도 이슈 후보로 남긴다.
