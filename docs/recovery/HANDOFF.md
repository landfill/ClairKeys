# Current Handoff

Last updated: 2026-07-19

## Current state

- Program status: `IN_PROGRESS`
- Current phase: `P0-D` — CI 설치·Node 기준선 복구 후 품질 실패 분리
- Current phase document: `docs/recovery/phases/P0-D-quality-gates.md`
- Working branch: `codex/p0-quality-gates`
- Base branch: `main`
- Pull request: https://github.com/landfill/ClairKeys/pull/4 (draft)
- Current objective: 설치 기준선 복구를 커밋한 뒤 Jest·TypeScript·ESLint 실패를 작은 수정 묶음으로 해결

## Next action

1. Node 22와 동기화된 lockfile 변경을 독립 커밋한다.
2. Jest 환경 실패와 애니메이션/오디오 계약 실패를 분리해 회귀 테스트부터 복구한다.
3. Next.js route params와 Prisma 생성 타입을 우선으로 TypeScript 오류를 줄인다.
4. lint 오류는 타입 계약 수정 뒤 범위별로 제거한다.
5. 각 반복의 결과를 validation과 PR review log에 기록한다.
## Known blockers

- DOC-1 blocker: 없음. GitHub 기본 브랜치, 원격 HEAD와 로컬 추적 브랜치가 모두 `main`이다.
- P0-D install baseline: 해결됨. Node 22에서 clean `npm ci`가 통과한다.
- P0-D compatibility baseline: 해결됨. 루트 엔진과 Actions를 Node 22로 통일했다.
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
