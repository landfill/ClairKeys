# Current Handoff

Last updated: 2026-07-19

## Current state

- Program status: `IN_REVIEW`
- Current phase: `DOC-0` — 문서·핸드오프 체계 초기화 PR 리뷰
- Current phase document: `docs/recovery/phases/DOC-0-recovery-bootstrap.md`
- Working branch: `codex/clairkeys-recovery-roadmap`
- Base branch: `master`
- Pull request: https://github.com/landfill/ClairKeys/pull/1
- Current objective: PR #1의 검증과 actionable review가 완료되어 사용자 병합 승인 대기

## Next action

1. 사용자에게 PR #1 병합 승인을 요청한다.
2. 승인 후 PR을 병합하고 `DOC-0` 상태를 `DONE`으로 기록한다.
3. 최신 `master`에서 P0-A와 P0-D를 각각 별도 브랜치로 시작한다.

## Known blockers

- Actionable review: 없음
- Vercel and CodeRabbit checks: pass
- Coverage gap: 실제 CI workflow가 `main/develop`만 대상으로 하므로 `master` 대상 PR에서 실행되지 않았다. P0-D에서 수정한다.
- Required authority: 사용자 병합 승인

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
