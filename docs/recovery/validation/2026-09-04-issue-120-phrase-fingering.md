# Issue #120 Phrase Fingering Validation

Date: 2026-09-04 KST
Branch: `codex/issue-120-phrase-fingering`
Commits: regression/decision `a0af14c`, implementation `e7989dd`, review fix `927d81f`
PR: [#122](https://github.com/landfill/ClairKeys/pull/122)

## Scope and corrected premise

운지 표기가 없는 높은음자리표/낮은음자리표 피아노 악보는 예외적인 누락 데이터가 아니라 제품의 일반적인
기본 입력이다. PDF나 MusicXML을 다시 변환하지 않고 canonical JSON 이후 player boundary에서 손별 악구를
분석한다. 저장 JSON과 유효한 원본 `finger`는 변경하지 않는다.

## Regression observation before implementation

Command:

```text
npm test -- --runInBand src/utils/__tests__/fingeringUtils.test.ts
```

Result: FAIL — 4 intended failures / 25 passes. 짧은 상·하행 5음에서 양손 대칭 배열을 만들지 못했고,
자동값과 원본값의 provenance가 없었으며, interleaved 양손 악구도 단음 MIDI 규칙에 머물렀다. 반복음 검사는
기존 구현도 우연히 같은 MIDI 규칙을 써서 통과했으나 새 phrase 계약의 회귀로 유지했다.

## Post-implementation validation

| Command | Result |
|---|---|
| focused Jest (fingering, boundary, render, retired admin API, account menu) | PASS — 5 suites / 53 tests |
| `npm test -- --runInBand` | PASS — 91 suites / 856 tests |
| `npx tsc --noEmit` | PASS after the normal build regenerated stale `.next` route types for the removed admin page |
| `npm run lint` | PASS — no warnings or errors |
| `npm run build` | PASS — 33 static/dynamic page entries; build config skipped type/lint, which were run separately |
| `git diff --check` | PASS |

Expected failure-path console output and the existing profile React `act(...)` warning remain non-failing baseline noise.

## Live 411-note production JSON check

Input: the public JSON recorded in issue #120. A read-only `tsx` invocation fetched it and called
`addFingeringToNotes` twice without writing storage.

- notes: 411
- valid inferred fingers: 411
- invalid/missing fingers: 0
- deterministic equality across two runs: true
- left-hand source notes retained as L: 169
- right-hand source notes retained as R: 242
- inferred distribution by hand:
  - L: finger 1=24, 2=49, 3=46, 4=8, 5=42
  - R: finger 1=33, 2=53, 3=51, 4=45, 5=60
- the repeated opening RH black-key dyad MIDI 66/68 changed from the old outer-finger `1/5` default to compact `2/3`

The repository regression contains an identifying-metadata-free excerpt of this opening. The full public score JSON is
not duplicated into the repository.

## Storage/backfill safety

- Runtime inference adds player-bound `fingerSource: source|inferred` and `phrase-dp-v1` only to `FallingNote` objects.
- Canonical v1.0/v1.1 storage is unchanged.
- The destructive random admin POST is now an authenticated/allowlisted `410 Gone` tombstone.
- Its false UI page and account-menu entry point are removed.
- The two independent `Math.random()` fingering scripts are removed.

## Not yet tested

- professional pianist/teacher review of the entire inferred score
- hosted CI and review feedback

## Browser verification

The Vercel preview was ready but redirected anonymous headless access to Vercel login. macOS denied the `computer-use`
skill Accessibility permission, so the authenticated Chrome session was not read or controlled. Instead, the exact branch
production build was served locally and Playwright intercepted only `/api/sheet/28` metadata while loading the actual public
411-note storage JSON.

| View | Result |
|---|---|
| Desktop 1440×900, idle | PASS — visible initial badges `5,2,3,2,3,2,3`; no page errors |
| Mobile landscape 844×390, idle | PASS — badges readable within falling notes; keyboard alignment intact |
| Mobile landscape 844×390, playing at 0:02 | PASS — `playback-active`, compact controls, badges `5,2,3,3,2,3,2,5`; no page errors |

Screenshots were inspected locally and intentionally not committed. This verifies rendering with the branch build and real
score payload, but not Vercel routing/auth configuration.

## Review-fix validation

CodeRabbit found that phrase silence was measured from only the immediately previous event. A long sustained note followed
by a short intervening note could therefore be forgotten before the next onset. The new regression observed the old split
as `1,2,1,2`; tracking the maximum sounding end across the whole phrase produces `1,2,3,4`.

The second review item corrected recovery documentation: storage backfill is retired, not consolidated. D-039 now records
that persisting heuristic fingers would erase their distinction from source notation.

After `927d81f`: focused Jest 5 suites / 54 tests, full Jest 91 suites / 857 tests, typecheck, lint, and diff check pass.
Both CodeRabbit threads were replied to and resolved. Hosted Build, two E2E jobs, two test jobs, lint/typecheck, Security
Scan, CodeQL, Vercel, and Security Audit pass. Security Audit initially received npm registry HTTP 400 `Invalid package
tree`; the unchanged head passed the failed-job rerun, confirming an external transient rather than a lockfile/code change.
