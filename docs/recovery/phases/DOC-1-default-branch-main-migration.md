# DOC-1 — Default Branch Migration to main

Status: `DONE`
Effective event: PR #3 merge into `main`
Branch: `codex/default-branch-main-migration`
PR: https://github.com/landfill/ClairKeys/pull/2

## Objective

GitHub 기본 브랜치와 로컬·문서·CI의 기준을 `main`으로 통일해 새 PR에서 자동 검증이 실행되도록 한다.

## Entry criteria

- DOC-0 / PR #1이 병합되어 복구 운영 계약이 존재한다.
- 현재 GitHub default branch와 `origin/HEAD`가 `master`임을 확인했다.
- GitHub Actions가 이미 `main/develop`을 대상으로 함을 확인했다.
- repository ruleset, `master` branch protection과 열린 PR이 없음을 확인했다.

## In scope

- 현재 운영 문서와 phase dependency를 `main` 기준으로 갱신
- GitHub default branch `master` → `main` rename
- 로컬 branch/upstream과 `origin/HEAD` 갱신
- Actions, Vercel, PR base와 원격 branch ref 검증

## Out of scope

- PR #1 review log와 최초 baseline의 역사적 `master` 기록 변경
- TypeScript, ESLint, Jest 실패 수정
- 애니메이션 또는 OMR 구현 변경

## Completion criteria

- GitHub `defaultBranchRef.name`이 `main`이다.
- `git ls-remote --symref origin HEAD`가 `refs/heads/main`을 반환한다.
- 로컬 `main`이 `origin/main`을 추적하고 동일 commit을 가리킨다.
- 원격과 로컬에 활성 `master` branch가 남지 않는다.
- 신규 또는 재실행된 `main` 대상 Actions와 Vercel 상태를 확인한다.
- 현재 운영 문서가 신규 작업 branch와 PR base로 `main`을 지시한다.
- 기존 사용자 미커밋 변경이 보존된다.

GitHub branch rename 완료가 DOC-1의 `DONE` 전환 사건이다. 다음 phase branch가 HANDOFF와 ROADMAP의 상태를 갱신한다.

## Completion record

- PR #2 merged as `643ce71fc37edcd1f48ddf7c376b37736578b6c8`.
- GitHub default branch와 원격 symbolic HEAD가 `main`으로 전환되었다.
- 로컬 `main`이 `origin/main`의 같은 commit을 추적하며 활성 `master` ref는 제거되었다.
- `main` push가 Actions를 기동했으며, 기존 의존성 잠금 및 Node 버전 문제는 P0-D로 인계했다.
- 기존 사용자 미커밋 변경은 그대로 보존했다.
- 이 브랜치의 `DONE` 표시는 예정된 원자적 전환이며, PR #3 병합 전에는 후속 단계 브랜치 생성에 효력이 없다.
