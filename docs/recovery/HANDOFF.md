# Current Handoff

Last updated: 2026-07-19

## Current state

- Program status: `READY`
- Current phase: `DOC-1` — 완료
- Current phase document: `docs/recovery/phases/DOC-1-default-branch-main-migration.md`
- Working branch: 없음; 다음 단계는 `main`에서 새 전용 브랜치 생성
- Base branch: `main`
- Pull request: DOC-1 구현 PR https://github.com/landfill/ClairKeys/pull/2; 마감 PR https://github.com/landfill/ClairKeys/pull/3
- Current objective: DOC-1 마감 증거를 병합하고 P0-A/P0-D 착수 가능 상태를 인계
- Transition gate: PR #3이 `MERGED`로 확인되기 전에는 P0-A와 P0-D를 `BLOCKED`로 취급

## Next action

1. PR #3이 `MERGED`이고 로컬 `main`이 최신 `origin/main`과 일치하는지 먼저 확인한다.
2. CI 자체를 먼저 복구하려면 `main`에서 `codex/p0-quality-gates`를 만들고 P0-D를 시작한다.
3. 제품 핵심 정확도를 병렬로 진행하려면 `main`에서 `codex/p0-animation-contract`를 만들고 P0-A를 시작한다.
4. 각 단계는 전용 phase 문서의 완료 조건과 `WORKFLOW.md`를 따라 별도 PR로 진행한다.

## Known blockers

- DOC-1 blocker: 없음. GitHub 기본 브랜치, 원격 HEAD와 로컬 추적 브랜치가 모두 `main`이다.
- P0-D immediate blocker: `npm ci`가 `package.json`/`package-lock.json` 불일치로 실패한다. 예를 들어 루트 lock metadata에는 `package.json`의 `@napi-rs/canvas`가 누락되어 있다.
- P0-D compatibility blocker: Actions의 Node 18과 일부 패키지의 Node 20 이상 요구가 불일치한다.
- Application quality gaps: TypeScript, ESLint, Jest 기존 기준선 실패도 P0-D가 소유한다.

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
