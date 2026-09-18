# 2026-09-18 — #134 기전 C(m5 빈 머리 → 셋잇단) 단계 추적

## 범위와 조건

- 사용자 요청으로 조사만 했다. 코드·운영·배포 변경은 없다.
- 기준 이미지: `clairkeys-omr:d065b-patched`. 이 이미지의 `BeamsBuilder.class`(`8d15e1b2…`)는
  2026-09-18 배포한 운영 이미지와 같으므로, 여기서 관찰한 것은 현재 운영에서 실제로 일어나는 일이다.
- 입력: `local-test-data/scores/Clair_de_Lune_easy_300dpi.pdf`(sha256 `34d06c77…`).
- 실행: `Audiveris -batch -save -step <STEP>`로 HEADS·STEMS·REDUCTION·SYMBOLS·LINKS 그래프를 각각 저장했다. 모두 exit 0, 예외 0건.
- VIP 재실행: `-constant org.audiveris.omr.sig.InterIndex.vipInters=1583,1559,1526,1524,2794,885`와
  `SigReducer`·`sig.inter` DEBUG logback. 머리 inter id는 실행 간 안정적이다(줄기 id는 아니다).
- 산출물(Git 제외): `local-test-data/results/issue134-heads-2026-09-18/`
  (`HEADS/`·`STEMS/`·`REDUCTION/`·`SYMBOLS/`·`LINKS/`·`vip/`의 `.omr`와 각 `*.log`, `trace_m5.py`, `crops/`)
- 대조 소스: pinned 커밋 `9e1e55cd…`의 `SigReducer.java`(sha256 `6d1b2517…`), `HeadStemRelation.java`.

## 원본 확인

`pdftoppm -r 300`으로 1쪽을 렌더링해 `(840,1140)-(1060,1330)`을 잘랐다(`crops/m5-chord.png`).
m5 첫 화음은 **검은 머리(8분, 줄 위)와 그 아래 빈 머리 + 오른쪽 점(점2분)이 같은 기둥을 공유**하고,
그 기둥이 아래 빔으로 이어진다. 피아노 악보의 성부 공유 표기다. 기존 기록의 서술과 같다.

## 단계별 관찰 (m5 첫 화음, 영역 x 860–1010 / y 1150–1360)

높은음자리표에서 pitch 0 = 가운데 줄 = B4(midi 71)이므로 pitch 3 = **F4(midi 65)**다.
평가의 `missing midi 65 onset 0.0 duration 3.0`이 이 머리다.

| 단계 | F4 빈 머리 `#1583` | 비고 |
| --- | --- | --- |
| HEADS | **존재.** `(904,1232,24,20)` pitch 3 `NOTEHEAD_VOID` grade 0.587 | `#1559`(pitch 2, 0.21)와 `exclusion OVERLAP` |
| STEMS | **존재.** 공유 기둥 `#2794`에 `head-stem` **grade 0.998**(dx −0.001), 빔 `#885`와 `beam-head` 0.989 | 그 기둥에 붙은 네 머리 중 가장 높은 연결 점수다 |
| REDUCTION | **삭제됨** | 아래 VIP 로그 참조 |
| SYMBOLS | 없음. 같은 자리에 `TUPLET_THREE` `#4528`(0.163)·`#4532`(0.644) 생성 | 경쟁자 없이 분류됐다 |
| LINKS | `#4542`(=`#4532`) 하나만 생존, ctx 0.838. head-chord 3개에 `chord-tuplet` | B4·A4·B4가 1/3박이 된다 |

즉 **머리는 검출되고 연결까지 됐다가 REDUCTION에서 지워지고, 그 뒤 SYMBOLS가 남은 잉크를 "3"으로 읽는다.**
2026-09-15 기록의 두 추정("기호 분류에서 3이 됐는지 / 머리 후보가 먼저 탈락했는지")은 **둘 다 아니다.**

## 확정된 삭제 원인 (VIP 로그)

```
581: VIP exclusion HeadInter#1526{NOTEHEAD_BLACK pitch:0.0}
       -Exclusion:INCOMPATIBLE- HeadInter#1583{NOTEHEAD_VOID pitch:3.0}
682: VIP conflict HeadInter#1526{(0.732/0.943)} -Exclusion:INCOMPATIBLE- HeadInter#1583{(0.587/0.899)}
       deleting weaker HeadInter#1583{(0.587/0.899)}
684: VIP remove HeadInter#1583
686: VIP StemInter#2832 unlinked from HeadInter#1583
```

배제를 삽입하는 곳은 `SigReducer.analyzeChords` **317행**이다:

```java
// Mutual head exclusion between shapes with different DURATION
// Mutual head support within shapes with same DURATION
for (Set<Inter> otherDurSet : allDurSets.subList(is + 1, allDurSets.size())) {
    exclude(oneDurSet, otherDurSet, INCOMPATIBLE);
}
```

`durs`는 한 기둥이 지나는 머리들을 **모양의 고유 음가**로 묶는다. `NOTEHEAD_BLACK`은 1/4, `NOTEHEAD_VOID`는 1/2이라
서로 다른 묶음이 되고, 묶음끼리 상호 INCOMPATIBLE 배제가 걸린다. 그 뒤 reducer가 ctx-grade가 낮은 쪽을 지운다
(`#1583` 0.899 < `#1526` 0.943).

이 규칙의 전제는 **한 기둥의 머리는 모두 같은 화음이므로 음가가 같아야 한다**는 것이다.
피아노 악보에서 두 성부가 기둥을 공유하는 경우에 대한 예외가 없다.

확인한 반증들:
- `checkHeads`/`checkHeadSide`는 `#1583`을 통과시킨다(VIP 611~613, 643~645에서 호출되고 삭제 로그가 없다).
- `stemHasSingleHeadEnd`·`pruneStemHeads`도 아니다. `getStemPortion`으로 계산하면 `#1583`의 extensionPoint y=1232는
  기둥 `(1211–1293)`의 중점 1252보다 위이고 상단 여유 `1211 + 20×0.275 = 1216.5`보다 아래라 **STEM_MIDDLE**이다.
  두 규칙 모두 STEM_TOP/STEM_BOTTOM만 문제 삼는다.
- `#1559 ↔ #1583`의 OVERLAP 배제도 아니다. 그 배제라면 ctx가 높은 `#1583`이 이긴다.
- grade 조정으로 해결되지 않는다. `#1583`이 이기면 이번엔 검은 머리 `#1526`이 지워져 더 나쁘다.

## m5 전체의 머리 생존 (영역 x 880–1500)

HEADS 21개 → REDUCTION 7개이고 **생존한 7개는 전부 `NOTEHEAD_BLACK`**이다.
대부분은 정상이다(같은 자리 저점수 빈 머리는 OVERLAP 배제로 지워지는 것이 맞다). 다른 자리에 있는 빈 머리는 `#1583` 하나다.

## 기전 B도 같은 추적으로 확정했다 (m5 둘째 화음)

두 번째 VIP 재실행(`vipInters=1587,1585,1565,1563,1567,1569,1595`, 산출물 `vipB/`·`vipB.log`)으로 확정했다.
머리 inter id는 실행 간 안정적이다.

원본(`crops/m5-second.png`, `(1390,1140)-(1560,1300)`): **2도로 붙은 두 검은 머리가 기둥 반대편에 배치**돼 있다.
위 G4는 기둥 왼쪽, 아래 F4는 기둥 오른쪽으로 밀려 있고 F4에 점이 붙는다. 기둥은 위로 올라가 빔에 닿는다.

| inter | 위치 | pitch(음) | 모양 | head-stem | headSide |
| --- | --- | --- | --- | ---: | --- |
| `#1565` | (1429,1223,24,20) | 2 = G4 | BLACK 0.77 | 0.955 | RIGHT |
| `#1587` | (1453,1232,24,20) | 3 = **F4** | BLACK 0.773 | 0.874 | **LEFT** |
| `#1585` | (1452,1232,24,20) | 3 = F4 | BLACK 0.726 | 0.995 | **LEFT** |

기둥 `#2790` = `(1451,1163,4,73)` → y 1163–1236. 빔 `#881`이 y 1163–1176으로 기둥 **위쪽**에 있으므로 기둥은 위로 뻗는다.
`headSide`는 머리에서 본 기둥의 방향이다(중심 x로 확인: `#1565` 1441 < 1451 → 기둥이 오른쪽 = RIGHT,
`#1585/#1587` 1464 > 1451 → 기둥이 왼쪽 = LEFT).

VIP 로그의 삭제 순서:

```
711: VIP pruned HeadInter#1585{(0.726/0.943) NOTEHEAD_BLACK pitch:3.0} from StemInter#2790
     VIP StemInter#2790 unlinked from HeadInter#1585
     VIP invasion between HeadInter#1585 & StemInter#2790
715: VIP pruned HeadInter#1587{(0.773/0.951) NOTEHEAD_BLACK pitch:3.0} from StemInter#2790
     ... (같은 3줄)
     DEBUG S#2 checkHeads (headHasStem + checkHeadSide)
735: Removing HeadInter#1585{(0.726/0.856)}      <- ctx가 0.943에서 떨어졌다
741: Removing HeadInter#1587{(0.773/0.883)}      <- ctx가 0.951에서 떨어졌다
```

`VIP pruned {} from {}`는 `SigReducer.pruneStemHeads`의 로그이며 `checkStemEndingHeads`에서 호출된다. 조건은

```java
if (((portion == STEM_BOTTOM) && (headSide != RIGHT)) || ((portion == STEM_TOP) && (headSide != LEFT)))
```

`#1587`의 extensionPoint y = 1232+20−1 = 1251이고 기둥 중점은 (1163+1236)/2 = 1199.5, 하단 여유는 1236 − 20×0.275 = 1230.5다.
1251 > 1230.5이므로 **STEM_BOTTOM**이고 headSide는 LEFT라 조건에 걸려 잘린다. `#1565`는 RIGHT라 통과한다.

**핵심은 순서다.** `checkHeadSide`에는 바로 이 경우를 위한 예외가 이미 있다 —
"머리가 틀린 쪽에 있으면 반대쪽에 1~2도 떨어진 머리가 있는지 보고, 있으면 유지한다"
(`lookupHead(stem, targetSide, targetPitch, staff)`를 pitch−1..pitch+1로 조회). G4와 F4는 정확히 1도 차이라 이 예외에 해당한다.
그런데 `checkStemEndingHeads`(pruneStemHeads)가 **`checkHeads`보다 먼저** 실행되며(로그 564행 → 565행) 예외 없이 간선을 끊고,
이어지는 `checkHeads`의 `headHasStem`이 기둥 없는 머리를 지운다. 그래서 `checkHeadSide`의 예외는 적용될 기회가 없다.

평가의 `missing midi 65 onset 3.0 duration 1.5`(m5)와 `missing midi 60 onset 3.0 duration 1.5`(m7)가 이 기전이다.

## 두 기전의 대비

| | 기전 C (m5 첫 화음) | 기전 B (m5 둘째 화음, m7) |
| --- | --- | --- |
| 표기 | 두 성부가 기둥 공유, 음가가 다름(8분 + 점2분) | 2도로 붙어 아래 머리가 기둥 반대편으로 밀림 |
| 지우는 곳 | `SigReducer.analyzeChords` 317행 | `SigReducer.pruneStemHeads` (`checkStemEndingHeads`) |
| 이유 | 한 기둥의 머리는 음가가 같아야 한다는 전제 | 기둥 끝의 머리는 정해진 쪽에 있어야 한다는 전제 |
| 엔진에 예외가 있나 | 없다 | **있다** — `checkHeadSide`가 1~2도 이웃을 보지만 순서상 늦다 |
| 범위 | REDUCTION 전역 규칙, 넓다 | 같은 규칙에 조건 하나, 좁다 |

## 미검증 범위

- 수정은 하지 않았다. 두 규칙을 좁혔을 때 Clair·corpus가 어떻게 바뀌는지는 실행하지 않았다.
- 기전 C를 고쳤을 때 SYMBOLS의 `TUPLET_THREE`가 실제로 사라지는지는 추론이며 실행으로 확인하지 않았다.
  머리가 살아남아 잉크를 차지하면 셋잇단이 생기지 않을 수 있으나 보장되지 않는다.
- m7의 `missing C4@3`이 m5와 같은 기하인지는 VIP로 직접 확인하지 않았다(평가 결과와 2026-09-15 기록에 근거한 추정이다).
- m3(기전 E)·m1(타이가 점을 자름)은 이 추적의 범위 밖이다.
- 이 추적은 Clair 한 입력이다. 같은 표기가 corpus의 다른 악보에서 어떻게 처리되는지는 보지 않았다.
