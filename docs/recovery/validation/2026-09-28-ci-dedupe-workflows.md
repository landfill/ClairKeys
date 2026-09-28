# Validation — CI 중복 실행 제거 (PR198)

Date: 2026-09-28 KST · Branch `codex/ci-dedupe-workflows` · head `9ed4638`

## 사전 계측 (변경 근거)

`gh run list --created '>=2026-09-21'` 240회, job별 `completed_at - started_at` 합계. 문서/코드 구분은
`git diff --name-only <sha>^1 <sha>`에 `docs/` 밖 파일이 있는지로 했다.

| 실행 | 횟수 | 분 |
|---|---|---|
| PR `PR Checks` | 45 | 771 |
| PR `Tests` (같은 head 중복) | 45 | 694 |
| main 코드 push `Tests` + `Post-merge checks` | 17 + 17 | 246 + 42 |
| main 문서 전용 push `Tests` + `Post-merge checks` | 58 + 58 | 782 + 144 |
| 합계 | 240 | 2,680 |

대표 예: `44c912a`(HANDOFF 2줄) → Tests E2E 16m13s 포함 약 21분. PR195 head `c4f2f86` → 두 워크플로 E2E 16m22s·16m34s.
브랜치 보호 필수 검사: `Lint`, `Security Audit`, `Run Tests`, `E2E Tests`(strict false).

주의: 첫 집계에서 `git diff | grep -q`가 pipefail + SIGPIPE로 큰 병합 커밋을 문서 전용으로 잘못 분류했다(코드 3건).
`grep -c`로 다시 세어 17건으로 바로잡았다.

## 변경 검증

| 검사 | 명령 | 결과 |
|---|---|---|
| 워크플로 정적 검사 | actionlint 1.7.7 (`-shellcheck=`) `pr-checks.yml deploy.yml` | PASS |
| YAML | `ruby -ryaml` load | PASS |
| 경로 필터 | picomatch `{dot:true}`, `**` ∧ `!docs/**` ∧ `!**/*.md` | skip: docs 파일·README·fixtures README·PR 템플릿·docs JSON / run: next.config.mjs·src/repositories·scripts·workflow·package-lock |
| PR198 hosted | 첫 push | `PR Checks`만 실행, `Tests` 워크플로 없음(결과는 reviews/PR-198.md) |

미검증: 쉘 스크립트 shellcheck(로컬 미설치), 문서 전용 PR에서 필수 검사 4개가 skipped→success로 집계되는 동작,
병합 후 문서 전용 main push가 Post-merge checks를 실행하지 않는 동작(병합 후에만 관찰 가능).
