# 2026-09-15 — #134 D-063 오선 흡수 타이 머리 연결: 구현 계측과 Codex 독립 검증

## 범위와 조건

- 대상: 브랜치 `codex/issue-134-tie-head-link` 커밋 `3876875`(main `ebdb722` 위). PR·병합·배포 없음.
- 결정: [D-063](../DECISIONS.md)(Proposed). 근거 조사: [타이 곡선 조사](2026-09-14-issue-134-tie-curves.md) 기전 B.
- 실행은 모두 로컬 Docker Desktop(arm64 호스트, `--platform linux/amd64`)이다. 운영 VM 접근·배포·재업로드는 없다.
- 기준선 이미지 `clairkeys-omr:dot-link`: PR161과 같은 OMR 코드다(`git diff 252aa27 ebdb722 -- omr-service` 비어 있음).
- 산출물(Git 제외): `local-test-data/results/issue134-tie-head-link-2026-09-15/`
  - `build/`, `exp/`, `fixture/`: 코디네이터 구현 중 실험(이미지 `clairkeys-omr:tie-link-exp` = dot-link + 두 클래스 교체, Dockerfile 빌드 아님)
  - `codex-verification/`: 워커 지시서 `PROMPT.md`, 보고서 `REPORT.md`, 원시 로그·크롭

## 구현 중 계측 (코디네이터)

- 흡수된 끝과 가장 가까운 오선 중심의 거리: 기전 B 후보 끝 0.0–4.1px(interline 20px). `maxStaffLineDy` 0.2 IL(4.0px)로는
  m4 위 타이(끝 4.1px)가 회복되지 않았고 0.25 IL에서 회복됐다. 0.2 IL 실험: 타이 23 → 28, 0.25 IL: 23 → 29.
- 합성 fixture는 처음 두 모양(머리 줄 위 끝, 꼭짓점이 위 오선과 겹침)이 기전 B를 재현하지 못했다.
  Clair BINARY에서 m2 타이를 계측(칸에 있는 두 머리, 바깥 오선을 따라 끝남, 꼭짓점 약 0.6 IL, 두께 끝 3px·가운데 6px)해
  곡선 식으로 옮긴 뒤 dot-link 0/8, 실험 이미지 8/8 타이로 갈렸다.

## Codex 독립 검증

- 워커: Codex CLI `gpt-5.6-sol`, reasoning effort high, `workspace-write` + network, 같은 워크트리.
  추적 파일 변경·커밋·브랜치 전환 금지. 최종 `git status`는 사용자 미커밋 파일 하나뿐이었다.
- 판정: **PASS WITH CONCERNS**. 상세는 `codex-verification/REPORT.md`.

| # | 검증 | 결과 |
|---|---|---|
| 1 | 기준선 동일성, pinned sha256, 패치 적용 | 통과. GitHub raw·로컬 사본·Dockerfile 해시 일치, LF 원본에 적용 |
| 2 | 패치 코드 리뷰 | 우려 1건(아래). 표준 `selectSlur` 성공 경로 동일, `continue`는 system 루프, mirror null 안전 |
| 3 | Dockerfile 전체 빌드 `clairkeys-omr:d063-patched` | 통과. 체크섬 전부 OK, 패치 3개(소스 4개) 적용, normal·recovery jar의 curve 클래스 해시 동일 |
| 4 | 이미지 테스트 `unittest discover` | **176 OK, skip 0**. `test_staff_line_ties_native`·`test_line_third_dots_native` 두 엔진에서 실행·통과. 저장소 전체 마운트로 VM식 skip 6개가 나오지 않았다 |
| 5 | fixture 판별 | dot-link 3/3 실패(두 엔진, 매회 0/8 타이), patched 3/3 통과(8/8). DEBUG: stock은 `SlurLinker` orphan 판정 후 `Slurs: 0` → 기전 B |
| 6 | Clair 3회 | 3회 동일(raw event sha256 같음): 이벤트 153/191, 타이 시작 23 → **29/43**, 누락 20 → 14, 오검출 2 → 2, canonical 163 → 157, tempo 69. MusicXML 슬러 17/8/17 불변. 회복 6건 모두 크롭으로 원본 확인 |
| 7 | 13개 PDF corpus | 10개 동일, Clair는 의도한 6건만, truongca는 두 이미지 모두 기존 page 3 실패. **Love 첫 실행 회귀**(아래) |
| 8 | 시간 | patched/dot-link 0.71–0.92배. 날짜·캐시·부하가 달라 방향성 참고만 |
| 추가 | `npm test -- --runInBand src/utils/__tests__/omrRuntimeContract.test.ts` | 1 suite / 12 tests 통과 |

### Love Affair 첫 실행 회귀

- 첫 corpus 실행에서 patched가 31마디 wedge 결과 대신 30마디 whole-note 결과를 선택했다.
  마디 21 전체(음 13개·쉼표 1개) 누락, canonical 431 → 418, 길이 123.0 → 119.25. 타이 수 29는 같다.
- 워커 진단: D-054 가드의 다른 항목(ledger·rest·tie·slur·대상 마디·그래프)은 모두 통과했고, 범위 밖 **마디 27**의 동일성만 실패했다.
  wedge 후보는 RH 첫 B3 아티큘레이션을 tenuto로, 앞선 whole 결과는 staccato로 읽었다. 크롭은 tenuto 쪽을 지지한다.
- 반복: patched 추가 3회(1회는 단독 실행)는 모두 31마디 wedge를 선택했고 단독 실행은 dot-link와 raw·canonical이 같다.
  dot-link는 기존 기록 1회 + 반복 2회 모두 31마디였다. 반복 중 patched 2회·dot 2회는 동시에 돌아 시간 비교에서 제외했다.
- 따라서 관찰은 **patched 1/4 실패, dot-link 0/3 실패**다. 워커는 D-063 타이 결과 밖의 네이티브 비결정성으로 판단했지만,
  기준선에서 같은 실패가 재현되지 않아 D-063과 무관하다고 **아직 입증하지 못했다**. PR 전 추가 반복이 필요하다.
- **추가 순차 반복(같은 날, Codex 워커 sol high)**: dot-link·patched를 번갈아 겹치지 않게 각 6회 실행했다.
  - fallback **dot-link 0/6, patched 0/6**. 12회 모두 31마디 wedge 선택, canonical 431, 길이 123.0.
    `events.json`·canonical notes 해시가 12회 모두 같다. D-054 게이트 전 항목 12/12 통과.
  - patched DEBUG 실행: 초기 인식·whole-note 재인식·wedge 재인식 모두 `staff line tie candidate` **0건**
    (ClumpPruner DEBUG 81/94/94줄로 로깅 활성 확인). wedge PAGE 이어 실행은 CURVES 이후라 ClumpPruner를 호출하지 않는다.
  - 첫 실행의 fallback 그래프 차이는 마디 27의 `TENUTO` articulation inter 1개와 `chord-articulation` relation 1개 추가뿐이다.
    슬러·타이·곡선 inter·relation 변화는 없다.
  - 결론: **D-063 직접 영향이 아닌 엔진 비결정성일 가능성이 높다(likely)**. 기준선에서 같은 실패를 재현하지 못했고
    첫 실행에는 DEBUG가 없어 "입증"은 아니다. 12회 표본으로 아주 드문 확률 변화는 배제할 수 없다.
  - 근거: `codex-verification/love-determinism/REPORT.md`, `analysis.json`, `prior-fallback-analysis.json`.
- 2026-09-15 앞선 채팅의 "D-063이 wedge 후보의 슬러 구성을 바꿨다"는 중간 설명은 워커 최종 진단으로 정정됐다(슬러 게이트는 통과).

### 코드 리뷰 우려

- **Medium**: 넓힌 재탐색은 CURVES 시점의 정수 음높이로 타이를 판정한다. LINKS 단계 `SlurInter.checkStaffTie`가
  음자리표·임시표를 반영해 타이를 해제하면 슬러로 남는다. D-063 결정 3의 "넓힌 영역으로 새 슬러를 만들지 않는다"와 어긋날 수 있다.
  corpus에서 새 슬러는 관찰되지 않았다(실행 가능한 재현 fixture 없음).
- Low: `selectStaffLineTie`의 넓은 `catch (Exception)`이 영역 생성 오류를 조용히 넘긴다(fail-closed).
- Low: `git diff --check`가 패치 파일 빈 문맥 줄 12곳의 줄 끝 공백을 보고한다. 적용 결과에는 영향 없음.

## 미검증·한계

- 운영 VM 이미지 빌드·테스트, 배포, 웹 업로드→플레이어 E2E, 청취.
- LINKS 해제 경로의 실행 재현. Love 드문 wedge fallback의 기준선 재현(12회 순차 반복에서 양쪽 모두 0회).
- 변경이 없는 corpus 출력은 구조 비교만 했고 페이지별 시각 재검토는 하지 않았다.
