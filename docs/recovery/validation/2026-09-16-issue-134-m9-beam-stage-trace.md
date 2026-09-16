# 2026-09-16 — #134 기전 D(m9 왼손 빔 소실) 단계 추적

## 범위와 조건

- 사용자 요청: 기전 D부터 단계 추적. **조사만 했고 코드·운영·배포 변경은 없다.** 브랜치도 만들지 않았다.
- 대상: [박 위치 오류 조사](2026-09-15-issue-134-onset-mechanisms.md) 기전 D — m9 왼손 8분 두 개가 4분으로 읽혀 duration 3 + onset 8이 생긴다.
- 엔진: 현재 운영(PR163 `0e3dc61`)과 점 클래스 해시가 같은 로컬 이미지 `clairkeys-omr:d064-patched`.
  `Audiveris -batch -save -step <STEP>`로 BEAMS·STEMS·REDUCTION·CURVES 그래프를 저장하고 픽셀 영역을 덤프했다.
- 입력: 로컬 `Clair_de_Lune_easy_300dpi.pdf`. 산출물(Git 제외): `local-test-data/results/issue134-beams-2026-09-16/`
  (`beams/`, `STEMS/`, `REDUCTION/`, `CURVES/`, `debug/`, 각 `*.log`, `logback-debug.xml`).
- 덤프 도구는 기존 `issue134-onsets-2026-09-15/dump_region.py`다.

## 단계별 관찰 (m9 왼손, 픽셀 영역 약 x 1795–1930, y 2035–2065)

| 단계 | 빔 존재 | 상태 |
| --- | --- | --- |
| BEAMS | 있음 | `beam` 중앙선 1805→1920, height 12.8, grade 0.528, `abnormal=true` |
| STEMS | 있음 | 관계는 `beam-stem` 하나뿐: 오른쪽 기둥(x≈1898.7)과 **`beam-portion=CENTER`**. 왼쪽 기둥(x≈1814.6)과는 관계 없음 |
| REDUCTION | **없음** | 빔·beam-group이 사라진다 |
| CURVES·최종 | 없음 | 기둥 두 개는 깃발도 빔도 없어 4분음표가 된다 |

## 원인 사슬 (DEBUG 로그로 확정)

1. `BeamsBuilder`가 빔을 **1805 → 1903**으로 만든다(`Create beam with {item median:(1805.0,2051.4)-(1903.0,2051.6) height:12.8}`).
   이 끝은 오른쪽 기둥(1898.7)과 맞는다.
2. `extendBeams`의 `extendToSpot`이 오른쪽에서 곡선 덩어리를 찾아 빔을 늘린다:
   `BeamInter#909 found spot#819 on RIGHT` → `extended as BeamInter#915`. 중앙선 오른쪽 끝이 **1903 → 1920**(약 0.85 interline),
   등급은 0.550 → 0.528로 떨어진다. 늘어난 구간의 잉크는 빔이 아니라 왼손 긴 타이 곡선이다(크롭 `issue134-onsets-2026-09-15/crops/m9-lh-beam-x3.png`).
   관련 상수: `maxExtensionToSpot` 0.5 interline, `maxExtensionToStem` 1.0 interline. `extendToStem`이 실패한 뒤 `extendToSpot`이 시도된다.
3. `BeamStemRelation.computeBeamPortion`은 끝에서 `xInGapMax`(profile 0, 약 0.5 interline ≈ 10px) 안에 있을 때만 LEFT/RIGHT로 본다.
   늘어난 오른쪽 끝(1920) 기준으로 기둥 1898.7은 21px 안쪽이라 **CENTER**가 된다.
4. `StemsRetriever`는 `Cannot link both sides of BeamInter#915`를 남긴다. VLinker 계측: 왼쪽 끝 63px 기둥, 가운데 82px 기둥,
   **오른쪽 끝 0px**(늘어난 끝에는 기둥이 없다).
5. `SigReducer.checkBeamsHaveBothStems`는 LEFT 또는 RIGHT portion에 기둥이 없는 빔을 **삭제**한다(`SigReducer.java:673-704`). 그래서 REDUCTION에서 빔이 사라진다.

즉 빔 검출 실패가 아니라 **곡선 쪽으로의 빔 확장 → 끝 portion 상실 → 규칙에 의한 삭제**다.

## 후속 후보 (결정 필요, 미실행)

| 후보 | 내용 | 범위·위험 |
| --- | --- | --- |
| 1 | `extendToSpot`에서, 늘리려는 쪽 끝이 이미 기둥 seed에 닿아 있으면 확장하지 않는다(또는 확장 뒤 끝에 seed가 없으면 되돌린다) | 원인 지점. 작음~중간. 다른 악보의 정상 spot 확장에 영향 가능 |
| 2 | `checkBeamsHaveBothStems`에서 삭제 대신, 빔을 가로지르는 기둥이 둘 이상이면 바깥 기둥까지로 빔을 줄인다 | 회복력은 크지만 REDUCTION 전역 규칙이라 위험이 크다 |
| 3 | `maxExtensionToSpot`(0.5 IL)을 줄인다 | 한 줄 변경이지만 전역 상수라 근거가 약하고 다른 확장을 함께 막는다 |

- 어떤 후보든 D-049/D-052에 따라 pinned 엔진 패치여야 하고, PR161·PR162·PR163과 같은 합성 fixture + 13개 corpus 회귀가 필요하다.
- 기대 효과 상한: m9의 duration 3 + onset 8. 같은 마디의 다른 오류(오른손 onset)는 왼손 길이 확정 뒤 다시 평가해야 한다.

## 한계

- 왼쪽 기둥이 LEFT로 연결되지 못한 세부 판정(`BeamLinker.linkSides`가 어느 profile에서 포기했는지)은 로그의 `Cannot link both sides`까지만 확인했다.
- DEBUG 실행에서 `StemBuilder.toString`이 로그 포맷 중 예외를 던지는 스택이 242회 찍힌다. 로깅 전용 문제이고 INFO 기본 실행에는 나타나지 않는다.
- 기전 C(m5)·B(m5·m7)는 아직 추적하지 않았다.

## 후보 1 구현 시도와 실측 (2026-09-16, 로컬 전용·커밋 없음)

사용자가 후보 1을 승인해 `codex/issue-134-m9-beam-extension` 브랜치를 만들고 실험 패치를 작성했다.
**저장소에는 아직 커밋하지 않았다.** 패치·이미지는 Git 제외 `issue134-beams-2026-09-16/{patch,build,diag}`에 있다.

- 패치 내용: `BeamsBuilder.extendToSpot`에서, 늘리려는 쪽 빔 끝에 이미 기둥 seed가 있으면 확장하지 않는다.
  판정 폭은 뒤에서 끝 portion을 정하는 값과 같은 `BeamStemRelation.getXInGapMaximum(0)`(0.5 IL)이다.
- 실험 이미지 `clairkeys-omr:d065-exp`(= `d064-patched` + 패치 클래스): 가드는 의도대로 동작한다.
  m9 빔은 1805–1903으로 유지되고(`found spot#819` 메시지 사라짐), **오른쪽 기둥이 `beam-portion=RIGHT`로 연결**된다(grade 0.601).
- 그런데 **Clair 결과는 그대로다**: 160/191, 분류·타이·tempo 전부 불변. 빔은 여전히 REDUCTION에서 삭제된다.
- 로그 추가 진단 빌드 `clairkeys-omr:d065-diag`로 왼쪽 실패 지점을 특정했다:
  `VLinker{beam#909-Vlnk-TL-1} fail: checkLink null, stem StemInter#0{(0.751) STEM} profile 4` →
  `BeamLinker{beam#909} side LEFT link=false`. 즉 `BeamStemRelation.checkRelation`의 등급이 최소값 미만이다.
- 원본 픽셀 실측(`pdftoppm -r 300`, 크롭 `crops/m9-beam-1.png`, 열별 어두운 픽셀 구간):
  - 실제 빔 잉크는 **x 1814–1900**(두께 14px, 아래 끝 y 2056)이고 두 기둥 사이다.
  - 그 바깥 x 1770–1812와 1902–1948은 두께 8–11px의 **곡선**이 이어진다.
  - 엔진이 만든 빔 item(1805–1903)은 **양쪽 끝이 각각 약 9px씩 곡선 쪽으로 넘어가 있다**. 확장 전에 이미 그렇다.
  - 그래서 왼쪽 기둥(x≈1814.6)은 빔 왼쪽 끝에서 8.1px 안쪽이고, LEFT portion의 `xGap`이 -8.1px(겹침)이 되어 등급이 떨어진다.

결론: 후보 1은 필요하지만 충분하지 않다. 오른쪽 끝의 잘못된 확장은 막지만, **빔 검출 자체가 양 끝을 곡선까지 물고 시작**한다.

### 다시 좁힌 후속 후보 (결정 필요, 미실행)

| 후보 | 내용 | 평가 |
| --- | --- | --- |
| 1+ | 후보 1에 더해, 끝에 기둥 seed가 없고 안쪽에 seed가 있으면 빔 끝을 그 seed까지 **줄인다**(BEAMS 단계) | 원인 지점. 기하 변경이라 corpus 회귀를 넓게 봐야 한다 |
| 2 | `SigReducer.checkBeamsHaveBothStems`에서 삭제 대신 바깥 기둥까지 축소 | REDUCTION 전역 규칙이라 위험이 더 크다 |
| 3 | `BeamStemRelation`의 겹침 허용(`xInGapMax` 0.5 IL)이나 등급 하한 완화 | 전역 상수. 빔·기둥 오연결이 늘 수 있다 |
| 4 | 보류 | m9 11건(duration 3 + onset 8)은 남는다 |
