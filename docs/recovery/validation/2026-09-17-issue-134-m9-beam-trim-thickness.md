# 2026-09-17 — #134 D-065 두께 가드 추가와 독립 검증 2차

[2026-09-16 단계 추적·1차 검증](2026-09-16-issue-134-m9-beam-stage-trace.md)의 후속이다.
1차 검증은 corpus에서 FAIL이었고, 그 원인을 좁힌 뒤 8단계를 처음부터 다시 돌렸다.

## 커밋 위치 정정 (먼저 처리)

- D-065 코드 커밋 `362a00f`은 작업 브랜치가 아니라 **main 위에서 만들어져 origin까지 push**돼 있었다.
  `git reflog`가 근거다(브랜치 생성 후 `checkout: moving from codex/issue-134-m9-beam-extension to main` 뒤 main에서 커밋).
- 사용자 결정으로 main에서 revert(`1391c4d`, push 완료), 같은 변경을 브랜치에 cherry-pick(`b59ea08`).
  `git diff 362a00f b59ea08 -- omr-service src docs/recovery/DECISIONS.md`는 비어 있다.
- 상태 기록 정정 커밋은 `c8afda2`다. 자세한 경위는 [1차 기록](2026-09-16-issue-134-m9-beam-stage-trace.md)의 마지막 절에 있다.

## 1차 검증(2026-09-16 재개분)의 FAIL

- 5·6단계는 통과했다: fixture 판별 6회, Clair 160 → 171/191 3회 동일.
- **7단계 corpus에서 FAIL.** Deborah's Theme m24에서 빔 위를 지나는 슬러가 잘린 뒤 **두 번째 빔 그룹으로 남았다**.
  E4·C♯4·B3가 각각 두 번 나오고 인쇄된 D♯4가 사라졌으며, 마디가 1박 짧아져 canonical 330개 중 **127개(38%)의 시작이 앞당겨졌다**.
  d064·d065 양쪽 재실행으로 해시가 재현돼 비결정성이 아니라 결정적 회귀로 확정됐다.
- 나머지 10곡은 동일, truongca는 양쪽 같은 기존 실패였다.
- [1차 보고서](../../local-test-data/results/issue134-beams-2026-09-16/codex-verification/REPORT.md)(Git 제외).

## 수정: 자를 수 있는 후보에 두께 조건 (D-065 결정 3b)

`trimToStumpSeed`가 후보의 높이를 그 악보의 기준 빔 두께와 비교해, `minTrimHeightRatio`(0.95) 미만이면 자르지 않는다.
모집단은 `SmallBeamInter`면 `smallParams`, 아니면 `stdParams`다. 자르기는 `checkBeamsHaveBothStems`가 지울 후보를
되살리는 동작이므로 빔이 아닌 잉크를 되살리면 안 된다는 것이 근거다.

실측 비율(코디네이터, `.omr`의 `<scale> beam main-thickness` 기준):

| 대상 | 두께 | 악보 기준 | 비율 | 의도 |
| --- | ---: | ---: | ---: | --- |
| Clair m9 빔 | 12.8 | 11 | 1.16 | 살린다 |
| Deborah m24 진짜 빔 | 11.1 | 11 | 1.01 | 살린다 |
| **Deborah 슬러→가짜 빔** | 9.8 | 11 | **0.89** | 막는다 |
| fixture 진짜 빔 | 14.1 | 14 | 1.01 | 살린다 |
| **fixture 슬러** | 12.0 | 14 | **0.86** | 막는다 |

기존 높이 하한(`minHeightLow` = 기준 × 0.7)은 이 둘을 가르지 못한다. 등급으로 가르는 안은 0.537 대 0.474로 여유가 좁아 기각했다.

같은 커밋에 Deborah m24형 합성 fixture(`slur_across_stems_fixture.py`, `test_slur_across_stems_native.py`)와
정적 계약 단언, Jest 목록을 추가했다. 커밋은 `bea1431`(브랜치 `codex/issue-134-m9-beam-extension`, main `1391c4d` 위, **push 전**).

## 2차 독립 검증 결과 — PASS WITH CONCERNS

Codex 워커(`gpt-5.6-sol` high)가 8단계를 처음부터 다시 실행했다. 1차의 1~4단계 근거는 패치가 바뀌어 승계하지 않았다.
지시서·로그·보고서는 Git 제외 `local-test-data/results/issue134-beams-2026-09-17/codex-verification/`에 있다.

| # | 검증 | 결과 |
|---|---|---|
| 1 | 패치 무결성 | 통과. pinned `fa9505b6…`가 GitHub raw·로컬과 일치, dry-run 성공, `git diff --check` 0 |
| 2 | 코드 리뷰 | Medium 3건, Low 2건 (아래) |
| 3 | `--no-cache` 빌드 | 통과. 171.24초 |
| 4 | 이미지 테스트 | 통과. **180 OK / skip 0** (새 fixture 포함) |
| 5 | fixture 판별 18회 | 통과. 새 fixture: d064 OK·미수정 d065 **FAILED**·수정 OK 각 3회. 기존 fixture: d064 FAILED·수정 OK |
| 6 | Clair 3회 | 통과. **171/191** 3회 동일, 바뀐 마디는 m9뿐, 타이 29/14/2, canonical 157, tempo 69, raw 해시 `1f8f390d…` 동일 |
| 7 | corpus 12곡 | 통과. **비교 가능한 11곡 모두 D-064와 동일**. truongca는 기존 실패 |
| 8 | 시간 | 통과. corpus 합계는 D-064 대비 +1.5%, D-065 대비 -5.5% |

- **Deborah 회귀 소멸이 확인됐다**: `events.json` 바이트 동일(sha256 `d8b378e3…`), canonical 330개 동일(`de709b8d…`).
  m24의 중복·D♯4 소실·1박 단축·127개 시프트가 모두 없다.
- 이미지 스위트는 D-064의 77.833초(177개) → 125.99초(180개)로 늘었다. 대부분 네이티브 fixture 추가 실행분이다.

## 확정된 기전 — 코디네이터 가설의 정정

코디네이터는 "비율 1.01인 진짜 빔까지 가드가 거부한다"고 의심했으나 **사실이 아니다**. 워커가 BEAMS·STEMS 단계를 분리해 확정했다.

1. 가드 빌드의 BEAMS에서 Deborah 진짜 빔 `#1616`(11.1/11)은 **양 끝이 이미 기둥에 고정된 채 존재**한다. 애초에 자르기 대상이 아니다.
2. 거부된 가짜 곡선 `#1612`(9.8/11)는 **그대로 남는다**. `return null`은 "자르지 마라"일 뿐 "후보를 버려라"가 아니다.
3. 남은 긴 가짜 후보가 STEMS에서 공유 기둥(x=1038)을 `CENTER`로 분류해, 진짜 빔이 LEFT 관계를 얻지 못한다.
4. REDUCTION이 둘 다 지운다. 미수정 빌드에서는 가짜가 잘려 짧아지며 둘 다 끝 관계를 얻어 살아남았다(대신 가짜가 빔으로 남아 회귀).

같은 순서가 합성 fixture에서도 재현된다(가짜 `#93` 12/14, 진짜 `#101` 14.1/14).

## 남은 우려 (PR 전 판단 필요)

| 등급 | 내용 |
| --- | --- |
| Medium | 두께 미달로 거부한 후보가 `rawSystemBeams`에 남아 기둥 분류를 흔들고, 진짜 빔까지 삭제되게 만든다(위 기전). 회귀는 없지만 진짜 빔을 되살릴 기회를 잃는다 |
| Medium | **0.95는 보편적으로 안전한 하한이 아니다.** corpus 7개 페이지에 0.95 미만인 진짜 빔이 있다. 워커가 각 페이지 최소값 위치를 원본에서 잘라 인쇄된 빔임을 확인했다 |
| Medium | 끝 기둥 seed 미검출 시 정상 빔이 안쪽 seed까지 잘릴 위험은 남는다. corpus 사례 없음, 전용 fixture 없음 |
| Low | 모집단 선택이 `instanceof SmallBeamInter`인데 같은 메서드의 재계산은 엔진의 최근접 높이 규칙(`getItemParams`)을 쓴다. corpus 사례 없음 |
| Low | 새 fixture가 "진짜 빔이 읽히는지"는 검사하지 않는다(두 빌드 모두 못 읽는다). 그래서 위 Medium 1번 기전이 통과 상태로 숨을 수 있다 |

0.95 미만 진짜 빔 분포(워커 실측, 최종 그래프의 일반 `<beam>`):

| PDF / sheet | 기준 | 0.95 미만 | 최소 비율 |
|---|---:|---:|---:|
| Always With Me / 1 | 13 | 23/82 | **0.838** |
| Always With Me / 2 | 13 | 41/133 | 0.877 |
| My Neighbor Totoro / 1 | 16 | 12/25 | 0.875 |
| My Neighbor Totoro / 2 | 16 | 19/35 | 0.875 |
| Princess Mononoke / 1·2·3 | 13 | 2/65 · 4/43 · 3/61 | 0.923 |

이 빔들은 현재 자르기를 필요로 하지 않아 실행된 회귀는 없다(11곡 모두 D-064와 동일). 필요해지는 경우에만 구제가 막힌다.

## 워커가 검증하지 못한 범위

- OMR VM·운영·배포·GitHub PR/CI 상태는 금지돼 접근하지 않았다.
- truongca는 양쪽 다 성공 출력이 없어 음 단위 비교가 불가능하다.
- 끝 seed 누락, 얇지만 정당한 빔의 자르기, 추정된 빔 scale, 모집단 불일치에 대한 전용 fixture가 없다.
- 시간은 arm64 호스트의 amd64 에뮬레이션 순차 실행이다. 메모리는 6GiB 상한만 두고 프로파일하지 않았다.

## 상태

- 운영은 여전히 PR163 `0e3dc61`이다. 배포된 것은 없다.
- 브랜치 `codex/issue-134-m9-beam-extension`: `bea1431`(두께 가드·fixture) ← `b59ea08`(D-065 원본) ← main `1391c4d`. **push·PR 없음.**
- 검증 이미지: `clairkeys-omr:d065b-patched`(코디네이터 빌드), `d065b-codex-verification`(워커 빌드),
  `d065-patched`(좁히기 전), `d064-patched`(기준·운영 동등).
