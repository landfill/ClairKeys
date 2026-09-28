# Branch, Validation, PR, and Review Workflow

규칙은 [AGENTS.md](../../AGENTS.md)에만 있다. 이 문서는 그 규칙을 실행하는 명령과 순서다. 규칙을 여기에 다시 적지 않는다.
기본 브랜치와 신규 PR base는 `main`이다. DOC-1의 과거 `master` 전환 예외는 [당시 phase](phases/DOC-1-default-branch-main-migration.md)에 남긴다.

## 1. 구현과 로컬 검증

1. 최신 main에서 `git switch -c codex/<phase>-<topic>`. phase 계획을 확인하거나 작성한다.
2. 재현 테스트를 먼저 추가하고 실패 결과를 남긴다.
3. 수정 후 로컬 검증(범위는 AGENTS "검증은 한 커밋 트리에 한 번씩만"):

   ```bash
   # Jest의 OMR 회귀는 Python 3.10 + omr-service/requirements-ci.txt가 필요하다. venv는 한 번만 만든다.
   uv venv --python 3.10 <venv> && uv pip install --python <venv>/bin/python -r omr-service/requirements-ci.txt
   PATH=<venv>/bin:$PATH npx jest
   npx tsc --noEmit --incremental false
   npm run lint
   npx playwright test <변경 영역 spec> --project=chromium   # 필요한 브라우저만
   ```

4. `validation/YYYY-MM-DD-<phase>-<slug>.md`에 명령·결과·baseline 차이·미검증 범위를 쓴다.

## 2. 커밋과 상태 기록

- 파일을 명시적으로 stage하고 `git status --short`와 `git diff --cached`로 사용자 변경이 섞이지 않았는지 본다.
- 상태 기록은 매 작업 단위 직후 main에 반영한다. 별도 상태 기록 PR은 만들지 않는다.

작업 브랜치에서 상태 기록을 작성했다면 다음 순서로 분리한다:

1. 작업 브랜치 변경을 선별 커밋한다. 사용자 변경을 임의 stash·reset하지 않는다.
2. `git fetch origin` 후 main을 fast-forward하고 main으로 전환한다. 사용자 변경과 충돌하면 중단하고 blocker를 기록한다.
3. 상태 파일만 stage하고 내용·명령·SHA·결과를 확인한다.
4. Lore 형식으로 커밋·push한다. 상태 파일만 바꾼 push에는 CI가 없다(D-087). 다른 파일이 섞였다면
   `gh api repos/<owner>/<repo>/commits/<sha>/check-runs`를 확인하고, 실패는 즉시 다음 상태 기록 커밋에 남긴다.
5. 작업이 남으면 작업 브랜치로 돌아간다. main에만 둔 상태 기록을 코드 커밋에 다시 섞지 않는다.

## 3. PR과 리뷰 반복

1. `gh pr create --base main`으로 non-draft PR을 만든다. 검증은 validation 기록 링크와 한 줄 요약으로 쓴다.
2. 번호가 생기면 `reviews/PR-<number>.md`를 만들고 HANDOFF에서 링크한다(§2 절차로 main에 기록).
3. `gh pr checks <n>`과 리뷰를 확인한다. 실패 job 로그는 `gh api repos/<owner>/<repo>/actions/jobs/<job-id>/logs`로 읽는다.
4. 각 finding을 아래 상태로 분류하고, 유효하면 재현 → 최소 수정 → 로컬 검증 → 커밋·push한다.
5. 스레드마다 회신한 뒤 **스레드 id를 지정해** resolve한다. 일괄 resolve는 처리 중 새로 달린 지적까지 닫는다.

   ```bash
   gh api -X POST repos/<owner>/<repo>/pulls/<n>/comments/<comment-id>/replies -f body='...'
   gh api graphql -f query='query{repository(owner:"<owner>",name:"<repo>"){pullRequest(number:<n>){reviewThreads(first:50){nodes{id isResolved comments(first:1){nodes{databaseId}}}}}}}'
   gh api graphql -f query='mutation{resolveReviewThread(input:{threadId:"<thread-id>"}){thread{isResolved}}}'
   ```

6. 리뷰 로그를 main에 갱신한다. 새 push마다 Codex가 재리뷰하므로 최신 head의 리뷰 완료를 확인할 때까지 반복한다.

| 리뷰 상태 | 의미 |
|---|---|
| OPEN | 미검토 |
| ACCEPTED | 유효하며 수정 예정 |
| FIXED | 수정·검증 완료 |
| REJECTED | 근거를 기록하고 적용하지 않음 |
| SUPERSEDED | 후속 리뷰·설계로 대체 |

## 4. 승인 후 병합과 정리

1. 현재 head의 CI·리뷰·mergeability를 확인하고, 확인한 head로 고정해 병합한다(전체 SHA만 받는다):

   ```bash
   gh pr merge <n> --merge --match-head-commit $(git rev-parse origin/<branch>)
   ```

2. main을 fast-forward하고 병합 커밋의 `Post-merge checks` 결과를 확인한다. 로컬 전체 재검증은 하지 않는다.
3. `git fetch --prune origin` 후 로컬·원격 tip이 main에 포함됐는지 `git rev-list --count main..<tip>`으로 확인한다.
4. 사용자 미커밋 변경 또는 고유 커밋이 있으면 두 브랜치를 보존하고 HANDOFF에 blocker를 기록한다.
5. 모두 포함되면 `git push origin --delete <branch>` → main 이동 → `git branch -d <branch>` 순서로 정리한다.
6. 병합·검증·정리 결과는 리뷰 로그에, 단계 상태는 phase에 쓰고, HANDOFF는 링크와 다음 행동만 갱신한다.

단계 DONE은 병합과 완료 조건 충족 후에만 확정한다. 마감 PR에 예정 상태를 담았다면 병합 순간부터 효력이 생긴다.
예정 DONE만으로 의존 단계 브랜치를 시작하지 않는다.
