# PR261 E2E runner 호환 복구 — 2026-11-03 KST

## 원인과 변경

최초 head `e770ecd`의 [E2E job](https://github.com/landfill/ClairKeys/actions/runs/41650330533/job/125966544616)은
Ubuntu 26.04.1에서 Playwright 1.57.0 설치 중 `Cannot install dependencies for ubuntu26.04-x64`로 실패했다.
테스트는 시작되지 않았다. 같은 run의 Linux 단위 검사·build·lint·운영 의존성 감사는 통과했다.

`f6e3a2d`는 D-105에 따라 PR/post-merge의 E2E job만 Ubuntu 24.04로 고정한다.
기존 브라우저·worker 2·45분 제한·검증 범위는 유지했다.

## 검증

| 명령 | 결과 |
|---|---|
| 수정 전 `npx jest src/ci/__tests__/playwrightRunner.test.ts --runInBand --silent` | 2 tests fail (두 job의 runner가 ubuntu-latest) |
| 수정 후 같은 명령 | 2 tests pass |
| `npx tsc --noEmit --incremental false` | exit 0 |
| `npm run lint` | exit 0, 경고·오류 0 |
| `PYTHON_BIN=<Python3.10 venv>/Scripts/python.exe npx jest --maxWorkers=4 --json` | 180 suites 중 172 pass / 8 fail, 1784 tests 중 1773 pass / 11 fail, 188.265s. 이전 main 대조와 같은 실패 이름 11개, 신규 runner 회귀 2개 pass |
| `git diff --check` | exit 0 |

실제 Ubuntu 24.04에서의 browser 설치·전체 E2E는 새 head의 PR CI로 판정한다.
CI와 최신 head 리뷰 결과는 [PR261 기록](../reviews/PR-261.md)이 원본이다.
