# Current Handoff

Last updated: 2026-07-19

## Current state

- Program status: `IN_PROGRESS`
- Current phase: `DOC-1` — 기본 브랜치 `master`에서 `main`으로 전환
- Current phase document: `docs/recovery/phases/DOC-1-default-branch-main-migration.md`
- Working branch: `codex/default-branch-main-migration`
- Base branch: `master` (DOC-1 완료 시 `main`으로 rename)
- Pull request: pending
- Current objective: 운영 문서와 검증 계약을 `main` 기준으로 준비한 뒤 PR 병합과 GitHub branch rename을 원자적으로 완료

## Next action

1. migration 문서 변경을 검증·커밋하고 `master` 대상 PR을 생성한다.
2. PR 리뷰와 체크를 해결한 뒤 사용자 승인 범위 안에서 병합한다.
3. GitHub 기본 브랜치를 `master`에서 `main`으로 rename한다.
4. 로컬 브랜치와 `origin/HEAD` 추적을 `main`으로 갱신하고 `master` 잔여 ref를 확인한다.
5. 새 `main`에서 P0-A 또는 P0-D 전용 브랜치를 시작하며 ROADMAP 상태를 `READY`로 갱신한다.

## Known blockers

- Merge gate: migration PR의 actionable review와 필수 체크가 모두 완료되어야 한다.
- Rename gate: GitHub 기본 브랜치와 원격 HEAD가 `main`으로 확인되기 전에는 DOC-1을 `DONE`으로 취급하지 않는다.
- Application quality gaps: TypeScript, ESLint, Jest 기준선 실패는 P0-D가 소유하며 이번 branch rename 작업의 성공으로 간주하지 않는다.
- Required authority: 기본 브랜치 rename 및 migration PR 병합 지시 수신 완료

## Existing user-owned working tree changes

다음 변경은 이 문서 작업 이전부터 존재하며 이번 커밋에 포함하면 안 된다.

- `.claude/settings.local.json`
- `.claude/settings.json`
- `prisma/schema.prisma`
- `.omx/`
- 기존 `docs/.bkit-memory.json`
- 기존 `docs/.pdca-status.json`

## Baseline summary

- 프로덕션 빌드: 성공하지만 타입 검사와 린트를 설정으로 생략
- Jest: 134 passed, 13 failed
- TypeScript: 실패
- ESLint: 실패
- 주요 제품 결함: 변환 포맷 불일치, 잘못된 MusicXML 시간 계산, 잘못된 양손 판정, 10초 이후 오디오 미스케줄 가능성

세부 근거는 [BASELINE.md](BASELINE.md)를 참조한다.

## Update rule

새 세션은 실제 로컬·원격·GitHub 기본 브랜치 상태를 확인한 뒤 이 문서를 신뢰한다. branch rename 후 첫 단계 브랜치에서 `Base branch`, 현재 단계와 ROADMAP 상태를 갱신한다.
