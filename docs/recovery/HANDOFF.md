# Current Handoff

Last updated: 2026-07-19

## Current state

- Program status: `IN_PROGRESS`
- Current phase: 문서·핸드오프 체계 초기화
- Working branch: `codex/clairkeys-recovery-roadmap`
- Base branch: `master`
- Current objective: 복구 로드맵과 세션 간 기록 체계를 별도 PR로 제공

## Next action

1. 이 문서 체계의 링크와 Git 변경 범위를 검증한다.
2. 문서 관련 파일만 선별 커밋한다.
3. 브랜치를 origin에 push하고 `master` 대상 PR을 생성한다.
4. PR CI와 리뷰 피드백을 `reviews/PR-<number>.md`에 기록한다.
5. 리뷰가 완료되면 P0-A와 P0-D를 별도 브랜치에서 시작한다.

## Known blockers

- 2026-07-19 현재 `gh auth status`에서 GitHub 토큰이 유효하지 않다고 보고한다.
- 현재 실행 환경의 네트워크 프록시도 GitHub API 연결을 차단했다.
- 인증이 복구되기 전에는 push/PR 생성/리뷰 조회가 완료되지 않을 수 있다.

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

새 세션은 이 파일을 먼저 최신화하지 않는다. 실제 저장소 상태와 PR 상태를 확인한 뒤 사실과 다른 항목만 수정한다. 세션 종료 전에는 반드시 `Last updated`, `Current phase`, `Next action`, `Known blockers`를 갱신한다.
