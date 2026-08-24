# 2026-08-24 — 이슈 #56: 88건반 검은건반 좌표 검증

- Branch: `codex/p1a-piano-black-key-layout` @ `db9801e`
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
`pos.x + pos.w * 0.2`는 함께 제거했다. 건반의 계약은 `KeyLayout.x`가 좌변이라는 것이고,
폭이 더 좁은 낙하 노트의 계약은 `keyPos.x + (keyPos.w - width) / 2`로 해당 건반 안에
중앙 정렬된다는 것이다. 88건반 전체(흰건반 52개, 검은건반 36개)의 노트 중심과 건반 중심이
부동소수 허용오차 안에서 같음을 회귀 테스트로 고정했다.

이 중심 계약 테스트를 동작 변경 전에 실행하면 **1 suite / 1 test가 실패**했다. A0에서 건반
중심은 12px인데 낙하 노트 중심은 11.04px로 0.96px 왼쪽이었다(`keyWidth=24`). 검은건반도
동일한 원인으로 1.80px 왼쪽이었으며, 중앙 정렬 구현 뒤 focused 2 suites / 8 tests가 통과했다.

## Lore 정정 — 실제 피아노 비대칭과 이 PR의 근사값

커밋 `299951d`의 “keeps the original asymmetric placement”라는 표현은 부정확하다. 원래
오프셋 표도, 이 PR의 상대값 `0.65/0.6/0.65/0.6/0.6`도 실제 피아노의 비대칭을 나타내지
않으며, 현재 값은 다섯 검은건반 모두를 인접 흰건반 경계에서 약 0.05–0.10칸 왼쪽에 두는
“거의 경계 중앙” 근사다.

표준 기하학에서 검은건반 중심의 경계 대비 위치는 C# -0.10(좌), D# +0.10(우),
F# -0.15(좌), G# 0.00(정중앙), A# +0.15(우)다. 따라서 현재 PR은 D#과 A#의 방향이
반대이고 G#도 실제 정중앙이 아니다. 실제 기하학의 좌변 오프셋은 C# 0.611, D# 0.806,
F# 0.563, G# 0.709, A# 0.854이고 검은건반 폭은 흰건반의 0.583배다.

PR #57은 절대 좌표 두 개를 더해 최대 5칸 밀리던 보고 결함만 고친다. 실제 비대칭 정밀도와
`PianoKeyboard.tsx` 좌표계와의 통일은 이슈 #58로 분리했으며 이 PR에서 오프셋을 더 바꾸지 않는다.

## 수정 후 검증

| 명령 | 결과 |
|---|---|
| `npm test -- --runInBand src/utils/__tests__/pianoLayout.test.ts src/components/piano/__tests__/SimplePianoKeyboard.test.tsx` | **PASS** — 2 suites / 8 tests |
| `npm test -- --runInBand` | **PASS** — 50 suites / 457 tests |
| `npm run lint` | **PASS** — No ESLint warnings or errors |
| `npm run type-check` | **실행 불가** — `package.json`에 script 없음 (`Missing script: type-check`) |
| `npx tsc --noEmit` | **PASS** — exit 0 |
| `git diff --check` | **PASS** |

낙하 노트 중앙 정렬을 추가한 PR head `db9801e`에서도 같은 로컬 검증을 다시 통과했다.
Hosted checks 17개도 모두 통과했다: Accessibility Check, All Checks Complete, Build Check,
CodeQL, CodeRabbit(정책상 review skipped), Detect changes, E2E Tests 두 작업, Lint,
Lint and Type Check, PR Summary, Run Tests, Security Audit, Security Scan, Unit Tests, Vercel,
Vercel Preview Comments.

`keyWidth=20`으로 독립 재계산한 최종 지표:

- 88 keys = 52 white + 36 black
- x 정렬에서 MIDI 순서 위반 0
- `totalWidth=1040`, 모든 건반의 최대 오른쪽 끝 `1040`
- 인접 검은건반의 최대 빈 간격 `29px` (한계 `30px`)
- A#0: `x=12`, `w=12`; A#1: `x=152`, `w=12`

## 검증하지 못한 것

- 영향받는 다섯 화면의 실제 브라우저 스크린샷 비교

## 별도 후속

README가 존재하지 않는 `npm run type-check`를 안내한다. 건반 좌표 PR의 한 목적 원칙을
지키기 위해 스크립트 추가나 README 수정은 포함하지 않았고 별도 이슈 후보로 남긴다.
