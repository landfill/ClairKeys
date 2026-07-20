# P0-D — Authentication and Quality Gates

Status: `IN_PROGRESS`

## Objective

신규 사용자가 DB와 일치하는 ID로 로그인하고, 타입·lint·테스트 검증을 숨기지 않는 빌드 기준선을 복구한다.

## Work stages

1. `package.json`과 `package-lock.json`을 동기화해 `npm ci`를 복구한다.
2. Actions와 Vercel의 Node 버전을 패키지 엔진 요구와 일치시키고, 루트 `package.json`에 `engines.node`을 명시한다.
3. `User.id` 생성 정책과 OAuth account 연결을 테스트로 고정한다.
4. 신규·기존 사용자 로그인 실패 경로를 수정한다.
5. Jest environment, TextEncoder, Testing Library 의존성 문제를 해결한다.
6. Next.js 15 route params와 주요 컴포넌트 계약 오류를 해결한다.
7. lint 오류를 범위별로 제거한다.
8. `ignoreBuildErrors`와 `ignoreDuringBuilds`를 제거한다.
9. `main` 대상 GitHub Actions 실행, branch protection과 필수 체크 연결을 검증한다.

## Completion criteria

- 신규 OAuth 사용자가 실제 DB User를 갖는다.
- lint, typecheck, unit test, build가 우회 없이 통과한다.
- CI가 `main` 대상 PR에서 실행되고 필수 체크로 연결된다.
- 기존 실패를 무시 목록 확대나 검사 비활성화로 숨기지 않는다.
## Progress

- DONE: root dependency metadata and `package-lock.json` are synchronized.
- DONE: root `engines.node` and every GitHub Actions setup use Node 22.
- PASS: clean `npm ci` completes on Node 22.18.0 / npm 10.9.3.
- DONE: Jest environment/contracts and TypeScript failures are repaired.
- PASS: ESLint reports zero warnings and zero errors.
- PASS: TypeScript reports zero errors and Jest passes 32 suites / 288 tests.
- PASS: PR #12 hosted accessibility, build, lint, type, unit, security, CodeQL, and deployment checks pass on the combined quality-gate head.
- PASS: the stale Playwright specification is replaced by 15 executable cross-browser smoke checks; both hosted E2E jobs pass.
- MERGED: PR #12 merged into `main` at merge commit `271f4c6`; its final head was `5d7afc3`.
- PASS: PR #12 final-head lint, type, unit, build, accessibility, E2E, security, CodeQL, deployment-preview, and aggregate checks passed.
- PASS: the `main` merge commit's application build, E2E, pre-deploy test, unit, lint, and security-audit checks passed.
- OPEN: issue #7 remains open even though PR #12 satisfies its Playwright compilation, hosted E2E, and runtime criteria.
- FAIL: GitHub reports `404 Branch not protected` for `main`; issue #9 and required-check enforcement remain open.
- OBSERVED: the merge commit's database-migration, production-deploy, and deployment-notification jobs failed and require separate triage.
- REMAINING: configure `main` branch protection and required-check wiring, close issue #7 with the merged evidence, and record the deployment failure separately.
