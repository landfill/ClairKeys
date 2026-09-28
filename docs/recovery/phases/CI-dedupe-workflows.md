# CI 중복 실행 제거

Status: DONE
Date: 2026-09-28

## Objective

한 커밋에 같은 검사를 두 번 돌리거나, 코드가 바뀌지 않은 상태 기록 push에 전체 검사를 돌리는 CI 구성을 없앤다.
검사 기준(무엇을 통과해야 병합되는가)은 낮추지 않는다.

## 근거 (2026-09-21~28 실측, 러너 합계 2,680분)

| 실행 | 횟수 | 분 |
|---|---|---|
| main 문서 전용 push → Tests + Post-merge | 58 | 926 |
| PR head마다 PR Checks와 Tests가 같은 검사를 각각 실행 | 45×2 | 771 + 694 |
| 코드 병합 push → Tests + Post-merge | 17 | 288 |

- `test.yml`과 `deploy.yml`은 경로 필터가 없어 HANDOFF 2줄 변경도 16분 E2E를 돌렸다.
- 필수 검사(`Lint`·`Security Audit`·`Run Tests`·`E2E Tests`)는 `test.yml` job 이름이었고, `pr-checks.yml`은
  같은 검사를 한 번 더 도는 비필수 실행이었다.
- 동시 실행 취소가 없어 PR195는 11분 사이 head 4개가 각각 E2E 2벌(8회)을 끝까지 돌았다.
- `pr-checks.yml`의 영역별 경로 필터는 `next.config.mjs`·`src/repositories`·`scripts/`·`fixtures/`를 놓쳤고,
  `All Checks Complete`는 `cancelled`를 통과로 집계했다.

## Work stages

1. `pr-checks.yml`을 유일한 PR 게이트로 만든다: job 이름을 필수 검사 이름에 맞추고, 문서 외 모든 파일을 잡는 단일
   필터로 바꾸고, PR 단위 `concurrency` 취소를 넣고, `All Checks Complete`가 success·skipped만 통과시키게 한다.
2. `test.yml`을 삭제하고 `deploy.yml`(Post-merge checks)을 main push의 유일한 검사로 만든다. Lint·Run Tests·
   E2E Tests·Security Audit을 한 번씩, `docs/**`·`**/*.md`만 바뀐 push는 제외한다. E2E가 빌드하므로 별도 build job과
   아무도 쓰지 않던 build 아티팩트 업로드는 뺀다.
3. AGENTS·WORKFLOW의 "상태 기록 push 후 check-runs 확인" 규칙과 `docs/testing.md` CI 설명을 새 구성에 맞춘다.

## Completion criteria

- 이 PR head에서 `PR Checks`만 실행되고 필수 검사 4개가 모두 보고·통과한다(브랜치 보호 설정 변경 없음).
- 병합 후 코드 병합 커밋에는 Post-merge checks 한 벌만, 이후 문서 전용 상태 기록 push에는 실행이 없다.
- 검사 명령과 임계값(`npm audit --audit-level high`, 전체 Jest, 6개 브라우저 E2E, tsc, lint)은 그대로다.

## Scope

`.github/workflows/`, AGENTS.md·WORKFLOW.md의 check-runs 규칙, `docs/testing.md`·`docs/deployment.md`, D-087.
제외: 로컬 검증 반복·기록 중복·HANDOFF 축소 등 규약 정리(별도 후보), 브랜치 보호 설정 변경.

## Progress

- 2026-09-28: 워크플로·규약 수정, actionlint 1.7.7 통과, 경로 필터를 picomatch로 표본 검증.
- 2026-09-28: 사용자 승인("CI 통과하면 병합")으로 PR198 head `4770fc3`(전 CI PASS, Codex 재리뷰 지적 0, 미해결 스레드 0)을
  `5bffb90`에 병합. 병합 커밋에는 `Post-merge checks`만 실행(`Tests` 없음). 이어진 문서 전용 상태 기록 push의 Actions 실행 여부는
  [검증](../validation/2026-09-28-ci-dedupe-workflows.md)에 기록.
