# Issue #120 Phrase Fingering Validation

Date: 2026-09-04 KST
Branch: `codex/issue-120-phrase-fingering`
Commits: regression/decision `a0af14c`, implementation `e7989dd`
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

- Vercel preview browser playback of sheet 28
- mobile landscape legibility in the preview
- professional pianist/teacher review of the entire inferred score
- hosted CI and review feedback

