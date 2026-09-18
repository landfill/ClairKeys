# 2026-09-19 — #134 D-067 기둥 공유 빈 머리: 구현과 로컬 검증

## 범위와 조건

- 브랜치 `codex/issue-134-shared-stem-durations`. PR·병합·배포 없음.
- 원인은 [단계 추적](2026-09-18-issue-134-m5-empty-head-stage-trace.md), 예외 기준은 [전수 조사](2026-09-18-issue-134-shared-stem-duration-census.md)에서 정했다.
- 기준 이미지는 현재 운영과 동등한 `clairkeys-omr:d066b-patched`다(`SigReducer.class` `da3b0721…`).
- 산출물(Git 제외): `local-test-data/results/issue134-shared-stem-2026-09-18/`

## 변경

- `0006-shared-stem-void-head.patch`: `SigReducer.analyzeChords`의 음가 배제를 `excludeDurations`로 바꾸고, `isSharedStemVoid`가 참인
  쌍(어떤 검은 머리와도 겹치지 않고 고유 grade 0.5 이상인 `NOTEHEAD_VOID`와 `NOTEHEAD_BLACK`)은 배제하지 않는다. 0005 다음에 적용한다.
- `0007-beamed-chord-black-duration.patch`: `AbstractChordInter.getDurationSansDotOrTuplet`에서 빔·꼬리가 있는 화음의 맨 아래 음이
  빈 머리이고 같은 화음에 검은 머리가 있으면, 음가를 검은 머리의 것으로 계산한다. 기존 mirror 예외 바로 뒤다.
- 합성 fixture `shared_stem_durations_fixture.py`, 네이티브 테스트, 정적 계약 단언, Jest 목록.

## 단계별로 드러난 사실 — 머리만 살리면 개선이 아니다

| 시도 | fixture 1마디 | Clair | 판정 |
| --- | --- | --- | --- |
| 기준 `d066b-patched` | B4 8분, B4 8분, C5 4분, C5 4분 — **F4 누락** | 173/191 | — |
| 0006만 (`d067-patched`) | **F4+B4 4분 화음**, B4 8분, C5 4분, C5 4분 = **3.5박** | 173/191 | 셋잇단은 사라졌으나 m5 오른손 8음이 모두 +0.5박 |
| 0006 + 0007 (`d067b-patched`) | F4+B4 8분 화음, B4 8분, C5 4분, C5 4분 = **3박** | **182/191** | 채택 |

- 0006만의 원인: `ChordsBuilder.connectHead`는 기둥의 머리를 모두 한 화음에 넣고, 화음 음가는 맨 아래 음(F4, 빈 머리 = 2분)에서
  빔 수만큼 반으로 줄여 4분이 된다. 0007이 이를 검은 머리 기준으로 바꿨다.
- 0006만의 fixture 삭제 경로는 Clair와 같았다: `VIP exclusion #154 BLACK -INCOMPATIBLE- #193 VOID` → `deleting weaker #193`(ctx 0.966 < 0.970).
- 실험 이미지 `d067-exp-chord`(0007을 실험 주석으로 넣은 빌드)와 정식 `d067b-patched`의 Clair raw 해시가 같다(`e982df7a…`).

## 검증 (`d067b-patched`)

| # | 검증 | 결과 |
|---|---|---|
| 1 | 빌드 | `SigReducer.java`·`AbstractChordInter.java` sha256 `: OK`, 패치 0005·0006·0007 적용, Hunk 실패 0 |
| 2 | 정적 계약 | 로컬 `test_audiveris_runtime` 20개 통과 |
| 3 | fixture 판별 | `d066b-patched` **FAILED** / `d067b-patched` **OK** |
| 4 | Clair 3회 | **182/191** 3회 동일, raw 해시 `e982df7a…` 3회 동일, canonical 160, tempo 69 |
| 5 | corpus 12곡 | **비교 가능한 11곡 모두 기준선과 바이트 동일**. truongca는 기존 실패 |
| 6 | 이미지 테스트 | 통과. **184 OK / 6 skipped**, 178초. 네이티브 7개(신규 `test_shared_stem_durations_native` 포함) 모두 skip 없이 ok. Jest 계약 17/17 |

- Clair 173 → **182/191**. 바뀐 마디는 **m5 하나**이고 맞춘 음이 4 → 13이 됐다. m5의 onset 오류 8건이 모두 사라졌다.
  타이 시작 29 → 30, tempo 69, 정확한 마디 2·4·8·11·15·16·17 불변.
- 남은 9건: m1 점 누락 2(붙임줄이 점을 자름), m3 4(기전 E 둘잇단), **m5 duration 2·m7 duration 1**.
  마지막 3건은 모두 아래 성부의 긴 음(F4 점2분, F4 점4분, C4 점4분)이 빔 달린 8분 화음에 합쳐져 8분으로 나오는 것이다.

## 미검증 범위

- 운영 VM 배포·재업로드.
- 빈 머리를 자기 화음(빔 없음, 점 적용)으로 떼는 완전한 분리. 남은 duration 3건이 여기에 걸려 있으며 별도 결정이다.
- 0.5 기준은 13개 PDF 분포에서 정했다. 다른 판형·해상도에서 진짜 빈 머리의 grade가 더 낮을 수 있다.
- 0007은 빔 달린 화음의 맨 아래가 빈 머리이고 검은 머리가 함께 있을 때만 발동한다. corpus에서 이 조합은 Clair `#1583`뿐이었다.
