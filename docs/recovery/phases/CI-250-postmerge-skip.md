# 코드가 같은 병합의 Post-merge 검사 생략 (#250)

Status: IN_PROGRESS
Date: 2026-10-10

## Objective

병합 커밋의 코드가 PR에서 이미 통과한 head와 같으면 `Post-merge checks`의 Lint·Run Tests·E2E Tests를 다시 돌리지 않는다.
검사 기준(무엇을 통과해야 병합되는가)과 테스트 범위는 바꾸지 않는다. 같다고 증명하지 못하면 지금처럼 전부 돌린다.

## 근거 (2026-10-10 실측)

- 2026-10-03 이후 일주일: PR Checks 37회(취소 7, 실패 5), Post-merge 21회. 한 번에 약 32분이고 그중 E2E가 31분이다
  (PR245 `4ec99ed`: E2E 31.2분, Run Tests 2.8분, Security Audit 2.2분, Lint 0.9분, Build Check 0.8분).
- 최근 병합 14건(#224~#245)의 PR head와 병합 커밋: 트리는 14건 모두 다르지만 `docs/**`·`**/*.md`를 빼면 12건이 같다.
  다른 것은 #234(8개 파일)와 #241(4개 파일)이다. GitHub compare API와 로컬 `git diff` 경로식이 같은 결과를 냈다.
- 트리가 항상 다른 이유는 상태 기록을 main에 직접 커밋하는 규약이다. 그 문서 변경은 D-087이 "아무것도 돌리지 않는다"고
  정한 것과 같은 종류인데, 병합 커밋에서는 전체 재실행의 이유가 되고 있었다.
- 저장소가 public이라 러너 요금은 없다. 줄이는 것은 병합마다의 대기 30분과 러너 속도 차이로 인한 취소·재실행이다.

## 구현 전 결정 (이슈 #250의 세 항목, D-101)

1. PR head는 GitHub API(`commits/<sha>/pulls`)로 찾고 병합 커밋의 둘째 부모와 같은지 확인한다. 코드 비교는 API가 아니라
   전체 이력을 받은 checkout의 `git diff`·`git log`로 한다(compare API는 파일 300개에서 잘린다).
2. Lint·Run Tests·E2E Tests만 건너뛴다. Security Audit은 항상 돈다. 이슈의 제안 기본값(네 job 모두 생략)과 다르다:
   `npm audit`는 코드가 같아도 권고 DB에 따라 결과가 달라져 "같은 코드는 한 번만"이 성립하지 않는다.
3. 건너뛴 실행은 리뷰 로그에 "Post-merge: 건너뜀(코드가 PR head `<sha>`와 같음), 근거 PR Checks `<실행 링크>`"로 적는다.
   병합 후 E2E 통과로 적지 않는다.

## Work stages

1. 판정 스크립트 `scripts/post-merge-verified.sh`와 임시 저장소·가짜 `gh`로 실제 실행하는 Jest 테스트.
2. `deploy.yml`에 판정 job `verified`를 두고 `lint`·`test`·`e2e`가 그 출력으로 건너뛴다. 판정 job의 실패·취소·빈 출력은
   "전부 돌린다"이다. `src/ci/__tests__/postMergeWorkflow.test.ts`가 그 방향을 고정한다. `pr-checks.yml`에는 실행 제목(`run-name`)만 더한다.
3. D-101, AGENTS·WORKFLOW·`docs/testing.md`의 병합 후 확인 문구.

## Completion criteria

- 코드가 PR head와 같은 병합에서 Lint·Run Tests·E2E Tests가 건너뛰어지고 요약에 PR 번호·head·근거 실행 링크가 남는다.
- 코드가 다른 병합, 직접 push, 수동 실행(`workflow_dispatch`)에서는 지금과 같이 전부 돈다.
- 두 경우를 실제 실행으로 확인해 validation에 기록한다. 이 PR 자신의 병합이 첫 실제 실행이다
  (워크플로를 바꾼 PR이라 코드가 같으면 건너뛰는 쪽이 관측된다. 전부 도는 쪽은 `workflow_dispatch`로 확인한다).
- 판정이 실패했을 때 검사가 건너뛰어지지 않는 것을 `src/ci` 테스트가 고정하고 전체 Jest가 통과한다.

## 알려진 한계

- PR 검사는 head 자체가 아니라 그때의 base와 합친 트리(`refs/pull/<n>/merge`)를 검증한다. 그래서 판정은 코드가 같은지만
  보지 않고 base가 바뀐 적이 없는지, 브랜치가 main과 마지막으로 만난 뒤 main에 코드 커밋이 없었는지도 본다(로컬 리뷰 P1 반영).
  main에 코드 변경이 들어왔다가 되돌려진 경우는 코드가 같아도 전부 돈다.
- 판정은 `pr-checks.yml`의 `run-name`이 만든 실행 제목(`PR Checks for #<n> into main`)으로 실행을 PR에 묶는다. 이 변경이
  병합되기 전에 돈 PR 검사에는 그 제목이 없으므로, 그런 head를 병합하면 전부 돈다(새 push로 PR 검사를 다시 돌리면 해당하지 않는다).
- 같은 head에서 PR Checks가 여러 번 돌았고 그중 하나라도 취소·실패였으면 전부 돈다(재실행은 같은 실행의 새 시도라 해당하지 않는다).
- 건너뛴 실행을 `gh run rerun`으로 다시 돌려도 같은 판정으로 건너뛴다. 병합 커밋을 강제로 전부 검증하려면 `workflow_dispatch`를 쓴다.
- squash·rebase 병합은 head가 checkout에 없어 항상 전부 돈다. 이 저장소는 merge commit을 쓴다(WORKFLOW §4).

## Progress

- 2026-10-10: 이슈 등록, 브랜치 `codex/ci-250-postmerge-skip`, 구현 지시문 작성.
- 2026-10-10: 구현(Gemini 3.8 Flash, 지시문 1개 + 수정 6회)과 로컬 리뷰(Codex gpt-6.1-sol) 2회. 리뷰 P1 3건·P2 2건을 반영해
  판정 조건을 넓혔다(둘째 부모, base 변경 이력, main의 코드 커밋, 실행 제목으로 PR 대조, 서브모듈). 마지막 수정(실행 제목)은
  로컬 재리뷰를 받지 않았다. 검증은 [기록](../validation/2026-10-10-ci-250-postmerge-skip.md).
