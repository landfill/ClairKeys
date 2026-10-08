# Validation — #238 Security Audit을 막는 high 권고 2건

Date: 2026-10-09
Commit: `d3c3be1` (브랜치 `codex/issue-238-audit-fix`, 구현 모델 Antigravity CLI `claude-opus-5-5-high`)
Environment: macOS, Node 22.18.0, production 빌드, `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`

## Claim being verified

[#238](https://github.com/landfill/ClairKeys/issues/238): `npm audit --omit=dev --audit-level high`가 다시 통과한다.
바뀐 것은 `package.json`의 `overrides` 두 줄과 lockfile의 `sharp`·`source-map-js`(와 `sharp`의 플랫폼별 하위 패키지)뿐이다. `next`는 15.5.25 그대로다.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| 수정 전 `npm audit --omit=dev --audit-level high` (main `8095f25`, 워커와 오케스트레이터 각각) | FAIL(재현) | exit 1, 3 vulnerabilities (1 moderate, 2 high): `sharp` <0.35.5, `source-map-js` 1.0.0–1.2.1, `next` 15.0.0–15.5.26(moderate) |
| 수정 후 같은 명령 (오케스트레이터) | PASS | exit 0, `next` moderate 1건만 남음 |
| `npm ls sharp source-map-js` | PASS | `sharp@0.35.5 overridden`, `source-map-js@1.2.2` 단일(중복 없음) |
| lockfile 비교(수정 전 사본 대비 `packages` 버전) | 28개 | `sharp` 0.35.4→0.35.5, `@img/sharp-*` 16개 0.35.4→0.35.5, `@img/sharp-libvips-*` 10개 1.3.3→1.3.4, `source-map-js` 1.2.1→1.2.2. 그 밖의 패키지 변경 없음 |
| `PATH=<ci-venv>/bin:$PATH npx jest` | PASS | 161 suites, 1581 tests |
| `npx tsc --noEmit --incremental false` | PASS | exit 0 |
| `npm run lint` | PASS | No ESLint warnings or errors |
| `npm run build` | PASS | exit 0 |
| `curl -H 'Accept: image/webp' 'http://localhost:3000/_next/image?url=%2Ficon-192.png&w=64&q=75'` | PASS | 200, `image/webp`, 1568 bytes. `sharp` 0.35.5 / libvips 8.18.7이 실제 변환을 처리 |
| `npx playwright test e2e/application-smoke.spec.ts e2e/console-quiet.spec.ts --project=chromium --project=firefox` | PASS | 29 passed, 1 skipped |

## Baseline comparison

- Fixed failures: 필수 검사 `Security Audit`(PR #237 [job](https://github.com/landfill/ClairKeys/actions/runs/37793268835/job/113366038322)에서 처음 관찰, main에서 재현).
- Remaining pre-existing failures: 없음.
- New failures: 없음.

## Gaps and risks

- **`next` moderate 권고 2건(GHSA-4jqv-mc3x-m676, GHSA-mcj8-r9mp-w47p)은 남아 있다.** 수정 버전 15.5.27이 고정 버전 밖이라 이슈의 제안 기본값대로 올리지 않았다. `--audit-level high` 검사는 통과하지만 권고 자체는 열려 있다.
- dev 의존성을 포함한 `npm audit`은 수정 전 40건(6 moderate, 34 high) → 수정 후 38건(6 moderate, 32 high)이다(구현 워커 측정). 필수 검사 범위(`--omit=dev`) 밖이라 손대지 않았다.
- Linux용 `sharp` 바이너리는 로컬(macOS arm64)에서 확인하지 못한다. PR CI의 Build Check·E2E와 Vercel preview가 맡는다.
- 두 권고가 운영 경로에서 실제로 악용 가능한지는 분석하지 않았다.
- 로컬 리뷰 워커는 돌리지 않았다(override 두 줄과 lockfile). GitHub의 Codex 리뷰에 맡긴다.
