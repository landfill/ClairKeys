# P0-D — Authentication and Quality Gates

Status: `BLOCKED`
Blocked by: DOC-0 / PR #1 merge

## Objective

신규 사용자가 DB와 일치하는 ID로 로그인하고, 타입·lint·테스트 검증을 숨기지 않는 빌드 기준선을 복구한다.

## Work stages

1. `User.id` 생성 정책과 OAuth account 연결을 테스트로 고정한다.
2. 신규·기존 사용자 로그인 실패 경로를 수정한다.
3. Jest environment, TextEncoder, Testing Library 의존성 문제를 해결한다.
4. Next.js 15 route params와 주요 컴포넌트 계약 오류를 해결한다.
5. lint 오류를 범위별로 제거한다.
6. `ignoreBuildErrors`와 `ignoreDuringBuilds`를 제거한다.
7. GitHub Actions 대상 브랜치를 실제 `master`와 정렬한다.

## Completion criteria

- 신규 OAuth 사용자가 실제 DB User를 갖는다.
- lint, typecheck, unit test, build가 우회 없이 통과한다.
- CI가 `master` 대상 PR에서 실행된다.
- 기존 실패를 무시 목록 확대나 검사 비활성화로 숨기지 않는다.
