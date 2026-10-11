# CI의 E2E를 worker 2개로 병렬 실행 (#246)

Status: DONE
Date: 2026-10-11

## Objective

E2E job이 45분 제한에 닿지 않게 한다. 테스트 수와 브라우저 프로젝트는 줄이지 않고, 제한을 다시 올리지 않는다.

## 근거

- E2E는 여섯 브라우저 프로젝트 1284개를 CI에서 worker 1개로 차례로 돌려 31~36분이 걸렸고, 2026-10-09에 45분 제한으로 한 번 취소됐다(이슈 #246).
- 이슈는 처음에 job을 브라우저별로 나누는 안이었다. 2026-10-10 사용자 지시로 한 러너 안에서 worker를 올리는 실측을 먼저 하기로 했다(이슈의 결정 4).

## 실측 (2026-10-11, GitHub 러너 4 vCPU / 16GB, 같은 트리 `c9aa0d1`)

임시 워크플로 `e2e-measure.yml`(이 브랜치의 push에서만 실행, [run 38119875545](https://github.com/landfill/ClairKeys/actions/runs/38119875545))로 여섯 프로젝트 전체를 값마다 3번 돌렸다. 상세는 [검증 기록](../validation/2026-10-11-ci-246-e2e-workers.md).

| workers | 테스트 실행 시간 | job 시간 | 실패 | 재시도로 통과 |
|---|---|---|---|---|
| 1 (기존) | 약 29~33분 | 31~36분 | 0 | 알 수 없음 |
| 2 | 18.9 / 23.0 / 23.0분 | 20.4 / 25.1 / 24.7분 | 0 / 0 / 0 | 0 / 1 / 1 |
| 4 | 20.1 / 19.7 / 13.5분 | 21.7 / 21.5 / 15.1분 | 6 / 5 / 0 | 4 / 5 / 1 |

worker 4개의 실패는 모두 WebKit 계열(`webkit`, `Mobile Safari`)의 재생·샘플 로딩·레이아웃 계측 테스트였다.

## 결정 (D-102)

job을 나누지 않고 CI의 worker를 2로 올린다(이슈 결정 4의 가). 제한 45분은 그대로다. 이슈의 결정 1~3(필수 검사 이름, 묶는 단위, 빌드 공유)은 job을 나눌 때의 것이라 정하지 않는다.

## Work stages

0. `PLAYWRIGHT_WORKERS`로 CI worker 수를 정하게 하고(`src/ci/playwrightWorkers.ts`), 임시 측정 워크플로로 2와 4를 잰다.
1. 두 워크플로의 E2E 단계에 `PLAYWRIGHT_WORKERS: 2`, 소요 시간 주석과 `src/ci` 단언 갱신, 측정 워크플로 삭제, `docs/testing.md`.

## Completion criteria

- PR CI와 Post-merge에서 E2E가 worker 2개로 돌고, job이 제한의 절반 안팎(20~25분)에서 끝난다. 이 PR의 실행 값을 기록한다.
- 필수 검사 네 개와 문서 전용 PR의 건너뛰기 동작이 그대로다.
- `src/ci` 테스트가 두 워크플로의 worker 수와 그 일치, 측정 워크플로의 부재를 고정하고 전체 Jest가 통과한다.

## 알려진 한계와 후속 후보

- 세 번의 측정이 전부다. worker 2개에서 `Mobile Safari`의 `first-play-sample-loading.spec.ts` "fetches the samples before 재생 and shows the wait on desktop"이 두 번 재시도로 통과했다. worker 1개에서도 그런지는 기록이 없다(html 리포터는 재시도 통과를 남기지 않는다). 이 테스트의 안정화는 후속 후보다.
- 프로젝트별 테스트 시간 합계(worker 2개): chromium 3.5~4분, Mobile Chrome 3.2~3.6분, firefox 11~12분, webkit 9~12분, Mobile Safari 9~12분. job을 프로젝트별로 나누면 가장 긴 job이 준비 시간 포함 약 14분, 거기에 worker 2개를 더하면 약 9분으로 추정된다(측정하지 않았다). 20~25분이 다시 길어지면 그때의 선택지다.
- worker 3개는 재지 않았다.

## Progress

- 2026-10-11: 0단계 구현(Codex `gpt-6.1-sol`)·측정, 1단계 구현(같은 워커). 로컬 리뷰는 하지 않았다.
- 2026-10-11: [PR252](../reviews/PR-252.md) 병합(`988824d`). PR의 E2E는 worker 2개로 19.2분, 실패 0. 완료 조건 대조: PR CI의 worker 2개와 시간(충족),
  필수 검사와 문서 전용 건너뛰기 불변(충족), `src/ci` 고정과 전체 Jest(충족). **Post-merge의 E2E가 worker 2개로 도는 것은 관측하지 못했다**(이 병합은 건너뛰었다).
  위 "알려진 한계"의 "worker 1개에서도 그런지는 기록이 없다"는 부정확했다. job 로그에 재시도 통과 목록이 있고, 기준선은 검증 기록에 더했다.
  후속 후보가 하나 더 생겼다: `e2e/learn-lesson-layout.spec.ts:200`(목차 항목으로 다른 섹션에 도달)이 Chromium 계열에서 worker 수와 무관하게 자주 재시도된다.
- 2026-10-11: 남았던 Post-merge 실제 실행 관측은 [PR256](../reviews/PR-256.md#ci병합)에서 충족했다. 두 흔들리는 테스트 후속도 #253·#254로 처리됐다([PR255](../reviews/PR-255.md), [PR256](../reviews/PR-256.md)). 수치·판정 원본은 해당 리뷰·검증 기록을 따른다.
