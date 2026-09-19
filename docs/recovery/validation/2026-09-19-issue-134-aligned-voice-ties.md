# #134 같은 시점 다른 성부가 막는 타이3 (D-071) — 로컬 검증 (2026-09-19)

## 범위

- 대상: [재분류](2026-09-19-issue-134-residual-ties.md)의 기전 E. m9 E3·G3, m10 D5 타이는 곡선과 양끝 머리 연결이 정상인데
  `SlurInter.isSpaceClear`가 끝 머리와 같은 x에 반대 기둥으로 선 다른 성부 화음(m9 C3, m10 A4)을 사이 화음으로 보고 거부했다.
- 브랜치 `codex/issue-134-tie-aligned-voice`. 기준선 이미지 `clairkeys-omr:d070b-patched`(`39381f8f…`, 운영 PR169와 같은 엔진),
  후보 `clairkeys-omr:d071-patched`. 로컬 산출물은 Git 제외 `local-test-data/results/issue134-residual-ties-2026-09-19/`.
- 기전 A·m12·시스템 경계 타이, 병합·VM 배포는 범위 밖이다.

## 변경

- `0011-aligned-voice-tie-space.patch`: 0008이 적용된 `SlurInter.isSpaceClear`의 장애물 목록에서 다음을 모두 만족하는 HeadChord만 제외한다.
  끝 화음과 같은 보표, 두 화음 모두 기둥이 있고 방향이 반대, 머리 하나가 끝 머리와 가로로 두 폭 중 작은 값의 0.5 이상 겹침
  (`minAlignedVoiceOverlap` 상수). 빔 그룹 금지·침범 한도 0.25는 그대로다. CURVES(ClumpPruner)와 LINKS(checkStaffTie)에 함께 적용된다.
- `Dockerfile.audiveris`: 0010 단계 뒤, recovery 복사 전에 패치를 적용·컴파일·jar 갱신한다. 두 엔진이 같은 클래스를 받는다.
- 결정은 [D-071](../DECISIONS.md), 계획은 phase의 D-071 절.

## 회귀 fixture

- `tests/aligned_voice_ties_fixture.py`: Bravura로 생성하는 3/4 한 보표 5마디. m1은 위 성부 G5(기둥 위, 점2분)와 같은 x의 아래 성부
  E5(기둥 아래)에서 m2 G5(기둥 아래)로 가는 타이(왼쪽 끝 침범, Clair m10형). m3은 G5 4분(기둥 아래)에서 같은 x에 E5가 선 G5 2분(기둥 위)으로
  가는 타이(오른쪽 끝 침범, m9형). m4·m5는 진짜 사이 화음 F5를 넘는 같은 음 곡선이며, m5는 시작에 같은 x 아래 성부도 둔다.
- 처음에 m3 첫 박에 아래 성부 4분쉼표를 뒀더니 기둥과 겹쳐 B4 머리로 읽혔다. 쉼표를 없앴다(아래 성부는 2박 시작).
- `tests/test_aligned_voice_ties_native.py`: 엔진이 하나라도 있으면 normal/recovery 둘 다 요구한다. m1·m3 G5의 tie start/stop,
  m4·m5는 tie 없음과 곡선이 실제로 slur start/stop으로 읽혔는지를 단언한다.
- 기준선 d070b: normal·recovery 모두 m1에서 실패(`[('half', [])] != [('half', ['start'])]`). 기준선 MusicXML에서 m1·m3는 slur, m4·m5도 slur.

## 검증 결과

| 항목 | 결과 |
|---|---|
| 실험(기준선 이미지에 클래스만 교체) | native 양쪽 통과, Clair 타이31→34/43·이벤트191/191·오검출0 |
| 정식 Dockerfile 빌드 d071-patched | 성공. 두 엔진 jar 2433항목 중 d070b 대비 `SlurInter` 계열 11개만 다름, 엔진 간 동일, 실험 빌드와 동일(`SlurInter.class` `8b443e33…`) |
| 이미지 전체 unittest | 190개 중 184통과·6skip(기존과 같은 보관 진단 자료 부재). native 13개 모두 실제 실행·통과 |
| Clair 3회 | 3회 모두 **191/191·타이34/43·누락9·오검출0**, raw events SHA `6265859b8afe…` 동일, canonical157·dots116·tempo69, 27–29초 |
| 타입 검사·lint | 통과 |
| Jest | 호스트 python3에 fastapi가 없어 callback gate 1건 실패(환경). CI 의존성 venv의 python3를 PATH에 둔 재실행 **105 suites/1038 tests 통과** |
| corpus 12곡 새 쌍 | 기준선/후보 순차 새 실행. 성공 11곡 raw events 바이트 동일·애니메이션 `generated_at` 외 동일. truongca는 양쪽 모두 3쪽 SCALE `No regularly spaced lines found`, 오류 연쇄 129줄 동일(기존 실패) |

### Clair 기준선 대비 차이

- 평가 객체는 m9·m10만 바뀌었다. m10은 마디 전체 일치가 됐고, m9는 C5/E5 시스템 경계 타이 2개만 누락으로 남는다.
- 남은 누락 9개: m3 (67,2)·(69,1)·(72,1), m6 (64,1), m9 (72,1)·(76,1), m12 (53,2), m13 (55,2), m14 (50,2) — 모두 곡선이 없는 기전 A·m12·시스템 경계다.
- raw events 204개 중 6개의 `tie` 필드만 바뀌었다(m9 E3 start 추가·G3 start, 다음 E3/G3 stop, m10 D5 start, m11 D5 stop).
- 초기 그래프와 박자 재시도 그래프 모두 곡선 52개의 좌표·glyph·run table이 기준선과 같고, tie 플래그가 바뀐 곡선은 목표 3개(m9 G3 #4046, E3 #4059, m10 D5 #3967 위치)뿐이다.
- canonical 160 → 157: 타이로 이어진 3쌍이 합쳐졌다. E3 0.869566+2.608696=3.478262, G3 0.434783+2.608696=3.043479, D5 2.608696+0.434783=3.043479초.
  나머지 154음은 전 필드 같고 전체 길이 65.217392초와 다른 키는 `generated_at` 외 같다.

## 한계

- 2도로 옆으로 밀린 머리처럼 가로로 겹치지 않는 동시 성부, 기둥 없는 온음표, cross-staff 화음은 제외 대상이 아니다.
- 같은 x·반대 기둥이면 제외하므로, 드물게 같은 x에 선 다른 성부 화음이 실제로 타이 곡선을 가로지르는 인쇄에서도 타이가 허용될 수 있다.
  이 경우에도 곡선이 같은 음 두 머리에 연결돼야 한다. corpus 11곡에서는 규칙이 결과를 바꾼 사례가 없어, Clair 밖의 양성 사례는 확인하지 못했다.
- 운영 배포·재변환·웹 E2E는 수행하지 않았다.

## 자체 리뷰

- 최종 diff를 직접 재검토했다. cross-staff 끝 화음은 `getStaff()`가 달라 제외되지 않고, 기둥 없는 화음은 `getStemDir()`가 0이라 제외되지 않는다.
  mirror·D-068 분리 쌍 처리 순서와 빔 그룹 금지는 그대로다. 미해결 finding 없음.
