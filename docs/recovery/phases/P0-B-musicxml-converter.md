# P0-B — MusicXML Converter Correctness

Status: `DONE`
Depends on: P0-A

## Progress

- 2026-07-22: PR [#24](https://github.com/landfill/ClairKeys/pull/24) **MERGED** at `a63d51f` (with PR #25 `83de264` clearing the repo-wide `Security Audit` blocker first). `converter.py` rewritten; the accuracy gate (`src/utils/__tests__/converterCorpus.test.ts` via `omr/cli.py`) is green on 9 golden fixtures within the 10 ms tolerance, and passed on CI's required `Run Tests` check. All five Completion criteria met against the corpus (see `docs/recovery/reviews/PR-24.md`). CodeRabbit's 3 findings were fixed before merge: cross-barline tie merge (part-scope `open_ties`, fixture `09-tie-across-barline`), multi-part global tempo (`_build_tempo_timeline`, fixture `08-multipart-tempo`), and a bounded test subprocess (timeout/maxBuffer). Work stages 1–4 and 6 (corpus accuracy) are covered; stage 5's cross-staff / missing-hand fallback is implemented as staff→hand with a part-index fallback (the 08 fixture exercises the part-index path) but has no dedicated cross-staff-notehead fixture.

## Objective

MusicXML의 음악적 시간과 피아노 양손 구조를 canonical animation timeline으로 정확하게 변환한다.

## Work stages

1. `divisions`, tempo map, measure start를 모델링한다.
2. chord/rest/tie/dot/time-modification을 처리한다.
3. backup/forward와 voice별 cursor를 처리한다.
4. part/staff/voice 기반 손·성부 정보를 보존한다.
5. cross-staff와 손 정보 누락 fallback을 정의한다.
6. P0-A corpus에 대해 정확도 리포트를 생성한다.

## Completion criteria

- pitch mismatch가 fixture 기준 0건이다.
- 명시된 hand/staff/voice가 손실되지 않는다.
- 동시 음표는 동일 onset을 유지한다.
- onset과 duration이 단계에서 정한 허용 오차를 만족한다.
- tempo/time-signature 변경 fixture가 통과한다.
