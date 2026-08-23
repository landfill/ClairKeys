# 2026-08-23 — P1-A: 빠르기 출처 계약 (이슈 #48) 검증

- Branch: `codex/p1a-tempo-provenance` @ `6248cf5`
- PR: [#51](https://github.com/landfill/ClairKeys/pull/51)
- Decision: D-013

## 어떻게 만들어졌나

Orca orchestration으로 Codex 워커 둘에 나눠 위임하고(run `run_6f9cddc08787`),
코디네이터 세션이 통합·검증·커밋했다. 계약은 코디네이터가 먼저 확정해 두 워커에게
같은 문서로 넘겼다 — 서로의 코드를 볼 수 없는 상태에서 같은 필드 이름과 같은 의미에
합의시키기 위해서다.

| 워커 | task | dispatch | worktree | 범위 |
|---|---|---|---|---|
| Python | `task_83abe2073ce4` | `ctx_333643757b6c` | `.../ClairKeys/tempo-converter` | `omr-service/`, `fixtures/`, 새 Jest gate |
| TypeScript | `task_8e7e2224a615` | `ctx_883ea4746e6f` | `.../ClairKeys/tempo-ui` | `src/types/`, `src/utils/`, `src/components/`, `src/app/api/` |

두 patch는 통합 브랜치에 **충돌 없이** 적용됐다 — 파일 분할이 실제로 겹치지 않았다는 뜻이다.

## 통합 검증 (코디네이터가 실행)

| 명령 | 결과 |
|---|---|
| `npm test -- --runInBand` | **Test Suites: 48 passed, 48 total / Tests: 446 passed, 446 total** |
| `cd omr-service && python3 -m unittest discover -s tests -v` | Ran 32 tests — OK |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | ✔ No ESLint warnings or errors |

## 두 절반은 따로는 통과하지 않는다 — 이것이 통합의 근거다

Python 워커가 보고한 사실: 자기 워크트리에서 `npm test -- src/utils/__tests__/converterCorpus.test.ts`가
**14/14 실패**했다. 변환기가 `version: "1.1"`을 내보내는데 그 워크트리의 TypeScript 리더는
`1.0`만 받기 때문이다. TypeScript 워커의 워크트리에서는 반대로 변환기가 여전히 120을 냈다.

합친 뒤 같은 테스트가 통과한다. 버전 봉투가 두 쪽을 실제로 묶고 있다는 증거이며,
어느 한쪽만 병합하면 안 된다는 뜻이기도 하다.

## 이슈 #48이 실증한 세 케이스 재확인

`omr/cli.py`로 직접 변환 (divisions=4, 4분음표 2개):

| 입력 표기 | `tempo` | `tempoSource` | `timingReferenceBpm` | `scoreTempo` | 음표 onset |
|---|---|---|---|---|---|
| `beat-unit=quarter` / `per-minute=60` | 60.0 | `score` | 60.0 | 60.0 | 0.0, 1.0 |
| `beat-unit=eighth` / `per-minute=120` | 60.0 | `score` | 60.0 | 60.0 | 0.0, 1.0 |
| `beat-unit=half` / `per-minute=30` | 60.0 | `score` | 60.0 | 60.0 | 0.0, 1.0 |
| 표기 없음 | **`null`** | **`unknown`** | 60.0 | `null` | — |
| 표기 없음 + `--tempo 90` | 90.0 | `user` | 90.0 | `null` | — |
| `quarter=60` + `--tempo 90` | 90.0 | `user` | 90.0 | **60.0** | — |

이슈 #48이 2:27 / 1:13 / 4:55로 갈렸다고 기록한 세 케이스가 이제 동일한 결과를 낸다.
표기가 없을 때 **120이 나오지 않는다** — 이 이슈의 핵심.

## 코디네이터가 워커 보고를 그대로 믿지 않고 재확인한 것

- 점음표 배수: 워커에게 준 스펙에는 "점 2개면 ×1.5×1.5"라고 애매하게 적어 두었다. 워커는
  이를 기각하고 MusicXML 4.0 명세를 인용해 `2 - 0.5^n`(2개 = 1.75)로 구현했다. 코드에서
  직접 확인했고, 이쪽이 맞다.
- `use_score_tempo_changes=tempo is None`: 워커가 독자적으로 내린 판단이며 계약 문서에 없었다.
  사용자 입력이 있으면 마디별 템포 변경이 통째로 무시된다. 유지하되 D-013의 Consequence에
  명시적으로 적었다 — 다음 세션이 코드에서 역추적하지 않도록.

## 검증하지 못한 것

1. **`tempoSource: 'score'`가 실제 악보에서 나오는 것은 확인되지 않았다.** 인쇄된 메트로놈
   표기는 여전히 인식되지 않는다(#48 잔여, 원인 미규명). 이 변경이 보장하는 것은
   "표기가 들어오면 올바르게 환산한다"와 "안 들어오면 지어내지 않는다"뿐이다.
2. 브라우저에서의 업로드→변환→재생 왕복은 수행하지 않았다.
3. `omr-service/tests`는 어떤 CI 워크플로에서도 실행되지 않는다. 새 `converterTempoContract.test.ts`는
   `npm test`로 CI에서 실행된다.
4. **이미 저장된 악보의 속도는 바뀌지 않는다.** 초가 변환 시점에 구워지기 때문이다.
   옛 업로드로 확인하면 "안 고쳐졌다"고 결론 내리게 된다 — 재변환이 필요하다.
