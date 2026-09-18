# 2026-09-18 — #134 D-066 2도 밀린 머리 보존: 구현과 로컬 검증

## 범위와 조건

- 브랜치 `codex/issue-134-second-interval-head`(최신 main `00df833`에서 분기). PR·병합·배포 없음.
- 원인은 [단계 추적](2026-09-18-issue-134-m5-empty-head-stage-trace.md)에서 확정했다.
  기전 C(빈 머리 → 셋잇단)는 이 작업의 범위 밖이다.
- 기준 이미지는 `clairkeys-omr:d065b-patched`다. `BeamsBuilder.class`가 2026-09-18 배포한 운영 이미지와 같아
  운영 동등 기준선으로 쓴다.
- 산출물(Git 제외): `local-test-data/results/issue134-heads-2026-09-18/`

## 변경

- `omr-service/audiveris-patches/0005-second-interval-head-prune.patch` 하나. pinned `SigReducer.java`(sha256 `6d1b2517…`)에 적용한다.
  `pruneStemHeads`가 간선을 끊기 전에 `hasDisplacedNeighbor`를 확인하고, 반대쪽에 한 칸 떨어진 머리가 있으면 끊지 않는다.
- Dockerfile에 `SIG_REDUCER_SHA256`·패치 COPY·적용·`org/audiveris/omr/sig` 클래스 주입을 추가했다.
  주입은 `cp -a /opt/audiveris /opt/clairkeys-audiveris-recovery`보다 앞이라 recovery 엔진도 같은 클래스를 갖는다.
- 합성 fixture `tests/second_interval_heads_fixture.py`, 네이티브 테스트 `tests/test_second_interval_heads_native.py`,
  `tests/test_audiveris_runtime.py`의 정적 계약 단언, Jest 계약 목록을 추가했다.

## fixture가 실제 기하를 재현하는지

합성 fixture를 세 번 고쳤다. 앞의 두 판은 2도를 그리긴 했으나 **다른 이유로** 머리를 잃어 이 기전을 검증하지 못했다.

| 판 | 기하 | 기준 이미지에서 일어난 일 | 판정 |
| --- | --- | --- | --- |
| 1 | 기둥이 위 머리에서 끝남 | 밀린 머리가 기둥에 **연결조차 되지 않음**(ctx 0.796 = 고유 등급) | 기각 |
| 2 | 기둥이 머리를 관통해 계속 이어짐 | 기둥이 하나로 잡혀 머리가 STEM_MIDDLE, **REDUCTION 통과** | 기각 |
| 3 | 위 성부 기둥과 아래 성부 기둥이 머리를 사이에 두고 끊김 | `VIP pruned HeadInter#178 from StemInter#341` → `Removing`(ctx 0.946 → 0.830) | **채택** |

3판은 Clair m5의 실측 픽셀 관계를 옮겼다: 기둥 분할, 두 머리 중심 9px 차, 머리가 기둥을 2칸만 덮음.
Clair `#1587`의 경로(ctx 0.951 → pruned → 0.883 → 삭제)와 같은 2단계가 재현된다.

## 1차 검증 (`d066-patched`, 예외 범위 pitch−1..pitch+1) — corpus 회귀로 **기각**

`checkHeadSide`와 같은 범위를 썼고, 그래서 **반대쪽 같은 pitch** 머리도 예외에 걸렸다.

- Clair 171 → **173/191** 3회 동일, 타이 29/43·tempo 69·정확한 마디 불변, canonical 157 → 159.
- corpus 12곡 중 9곡 동일, 1곡 비교 불가(truongca, 양쪽 기존 실패), **2곡 회귀**:
  - Merry Go Round m18: E♭5 2분이 **두 번** 나오고 D5 4분이 사라졌다(이벤트 288 → 289).
  - Première Gymnopédie m16: A4 **점**2분이 A4 2분 **두 개**가 됐다(339 → 340).
- 원인: 반대쪽 같은 pitch의 머리는 2도의 다른 음이 아니라 **한 머리의 중복 판독**이다. 그것을 잘라내는 것이 규칙의 본래 역할이며,
  예외가 그것까지 살려 음이 두 번 나왔다.

## 2차 검증 (`d066b-patched`, 예외 범위 정확히 한 칸)

`hasDisplacedNeighbor`가 `pitch − 1`과 `pitch + 1`만 조회한다. 같은 pitch는 보지 않는다.
1차의 근거는 패치가 바뀌었으므로 승계하지 않고 처음부터 다시 실행했다.

- 빌드: `SigReducer.java` sha256 `: OK`, `patching file` 확인, Hunk 실패 0.
| # | 검증 | 결과 |
|---|---|---|
| 1 | 빌드 | 통과. `SigReducer.java` sha256 `: OK`, `patching file` 확인, Hunk 실패·`.rej` 0 |
| 2 | fixture 판별 | 통과. `d065b-patched` **FAILED** / `d066b-patched` **OK** |
| 3 | 이미지 테스트 | 통과. **182 OK / 6 skipped**, 217.5초. 네이티브 6개 전부 skip 없이 ok |
| 4 | Clair 3회 | 통과. **173/191** 3회 동일, raw 해시 `c5923116…` 3회 동일 |
| 5 | corpus 12곡 | 통과. **비교 가능한 11곡 모두 기준선과 바이트 동일**, 회귀 0 |

- Clair 171 → **173/191**. 타이 시작 29/43·누락 14·오검출 2, tempo 69, 정확한 마디 2·4·8·11·15·16·17 — 모두 불변.
  canonical 음 157 → **159**.
- 바뀐 마디는 **m5와 m7 둘뿐**이다.
  - m7: `missing C4@3.0` → 그 자리에 음이 생겼다. onset 3.0은 맞고 duration만 0.5(기대 1.5)라 `duration`으로 분류된다.
  - m5: 맞춘 음 2 → 4. `missing F4@0.0`·`onset B3@3.0`·`onset D4@3.0`·`onset-and-duration G4@4.0`이 해소되고
    `onset G4@4.0`·`onset-and-duration F4@0.0`이 남는다. m5 첫 화음(기전 C)은 손대지 않았으므로 그대로다.
- 1차와 Clair raw 해시가 같다(`c5923116…`). 예외 범위를 좁혀도 **Clair에서 얻는 이득은 줄지 않고** corpus 회귀만 사라졌다.
- 이미지 테스트 skip 6건은 모두 `retained … not present` 계열(로컬 진단 산출물 필요)이며 네이티브 테스트는 없다.
  기준 `d065b-patched`는 181개였고 새 네이티브 테스트 1개가 더해져 182개다.

## 미검증 범위

- 운영 VM 배포·재업로드.
- 기전 C(m5 첫 화음 빈 머리 → 셋잇단)는 그대로 남는다.
- m7의 복원된 C4는 onset은 맞으나 음가가 부족하다(1차 기준 dur 0.5 대 기대 1.5). 점·성부 배정은 별개 원인이며 이 작업의 범위가 아니다.
- 반대쪽 같은 pitch를 제외한 뒤에도 남을 수 있는 중복 판독 경로는 전용 fixture가 없다.
- 이 검증은 13개 PDF 코퍼스 범위다. 다른 판형·해상도의 2도 표기는 보지 않았다.
