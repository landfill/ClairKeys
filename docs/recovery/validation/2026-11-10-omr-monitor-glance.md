# #263 OMR 모니터링 화면 한눈에 보기 검증 — 2026-11-10 KST

Status: 로컬 구현·검증 완료. PR 미생성(사용자 승인 대기). 운영 화면 미확인.

## 범위

- 기준 main `cc0b107`, 작업 브랜치 `codex/issue-263-omr-monitor-glance`, 코드 커밋 `bd71b1cc639a9f4159943f77cf707402c6dcb2ce`.
- [#263](https://github.com/landfill/ClairKeys/issues/263), D-107. 바꾼 것은 `/admin/omr` 화면과 화면용 판정 함수
  `src/lib/omr/monitorSummary.ts`뿐이다. API·응답 계약·권한 검사·갱신 hook·OMR 서비스는 바꾸지 않았다.
- 구현은 Orca 터미널의 Codex 워커(`gpt-6.1-sol`, high)가 지시문
  `local-test-data/results/issue-263/brief.md`(git 제외)대로 했다. 검증·커밋은 오케스트레이터가 했다.

## 명령과 결과 (macOS, 커밋 `bd71b1c` 트리)

| 명령 | 결과 |
|---|---|
| `npx jest` | 182 suites 중 179 pass / 3 fail, 1830 tests 중 1821 pass / 9 fail |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 경고·오류 없음 |
| `npm run build` | exit 0 |
| `npx playwright test e2e/omr-monitor.spec.ts --project=chromium --project=firefox --project="Mobile Chrome"` | 15/15 통과 |

워커는 새 테스트가 구현 전에 실패하는 것을 확인했다고 보고했다. 오케스트레이터가 따로 재현하지는 않았다.

### 전체 Jest의 실패 3 suites

`src/ci/__tests__/omrCallbackDelivery.test.ts`, `src/ci/__tests__/omrMonitoring.test.ts`,
`src/utils/__tests__/omrRuntimeContract.test.ts`. 셋 다 `python3 -m unittest`로 `omr-service/tests`를 돌린다.
이 맥의 `python3`(Homebrew 3.15)에 `PIL`·`uvicorn`이 없어 `ModuleNotFoundError`로 실패한다
(`test_time_numeral.py`, `test_monitoring.py`를 직접 돌려 확인). 이 변경은 `omr-service/`·`src/ci`·`src/utils`를 건드리지 않았다.
같은 트리의 main 대조 실행은 하지 않았다. 최종 판정은 Linux CI로 한다.

## 화면 확인

Playwright fixture 응답으로 캡처했다. 실제 VM 데이터가 아니다.

- 정상(Chromium 1280px): [2026-11-10-omr-monitor-glance-healthy.png](2026-11-10-omr-monitor-glance-healthy.png).
  종합 상태 `정상`, 요약 칸 네 개 모두 `정상`, 메모리·디스크 막대 25% 사용.
- 주의(Mobile Chrome): [2026-11-10-omr-monitor-glance-attention-mobile.png](2026-11-10-omr-monitor-glance-attention-mobile.png).
  host 수집 누락 fixture에서 종합 상태 `주의`·이유 `VM 자원을 수집하지 못함`, VM 자원 칸 `확인 불가`. 페이지 가로 넘침 없음(E2E 단언).
- 구현 후 수정 1건: 첫 조회 중에 `조회 중…` 아래 `현재 상태를 판단할 수 없습니다.`가 보여
  `OMR 서버 상태를 조회하고 있습니다.`로 바꾸고 테스트를 추가했다. 위 표의 결과는 이 수정 뒤의 것이다.

## 미검증

- 로그인한 운영 화면에서 실제 VM 데이터로 본 모습(웹 배포 뒤 확인). #121의 "실제 UI 재확인 대기"도 그대로 남아 있다.
- 장애·확인 불가·실패 작업 행은 Jest 화면 테스트로만 확인했고 브라우저 캡처는 없다.
- WebKit·Mobile Safari·Firefox keyboard 프로젝트(PR CI가 맡는다), 스크린리더, 실기기.
