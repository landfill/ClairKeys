# #250 코드가 같은 병합의 Post-merge 검사 생략 — 로컬 검증

Date: 2026-10-10
Branch: `codex/ci-250-postmerge-skip` (`a30520e` 구현, `d5748f4` 규약 문서)
Phase: [CI-250](../phases/CI-250-postmerge-skip.md) · 결정 D-101 · 이슈 [#250](https://github.com/landfill/ClairKeys/issues/250)

## 근거 실측 (구현 전)

| 항목 | 값 | 명령 |
|---|---|---|
| 2026-10-03 이후 실행 | PR Checks 37회(취소 7, 실패 5), Post-merge 21회 | `gh run list --limit 200 --json workflowName,conclusion,createdAt` |
| 한 실행의 job 시간 (PR245 `4ec99ed`) | E2E 31.2분, Run Tests 2.8분, Security Audit 2.2분, Lint 0.9분, Build Check 0.8분 | `gh run view 37933022031 --json jobs` |
| E2E job 안의 단계 | 테스트 실행 1776초, 브라우저 설치 52초, 컨테이너 21초, `npm ci` 17초 | `gh api repos/landfill/ClairKeys/actions/runs/37933022031/jobs` |
| 최근 병합 14건(#224~#245)의 head와 병합 커밋 | 트리는 14건 모두 다름. `docs/**`·`**/*.md` 밖은 12건 같음, #234(8개 파일)·#241(4개 파일)만 다름 | `gh api repos/landfill/ClairKeys/compare/<head>...<merge>`, 로컬 `git diff --quiet <head> <merge> -- . ':(exclude)docs' ':(exclude,glob)**/*.md'` (두 방법 일치) |

## 최종 트리 검증 (`a30520e`의 구현 트리)

| 명령 | 결과 |
|---|---|
| `PATH=<ci-venv>/bin:$PATH PYTHON_BIN=<ci-venv>/bin/python3 npx jest` | PASS, 170 suites, 1716 tests |
| `npx tsc --noEmit --incremental false` | 0 |
| `npm run lint` | No ESLint warnings or errors |
| `sh -n scripts/post-merge-verified.sh` | 0 |
| `npx jest src/ci` (워크플로 빈 줄 하나를 지운 뒤) | PASS, 7 suites, 103 tests |

`<ci-venv>`는 `uv venv --python 3.10` + `omr-service/requirements-ci.txt`. baseline 대비: main `4d7f848`에서 suites 169 → 170(`postMergeVerified.test.ts` 추가). 기존 테스트의 실패·삭제 없음.

## 조건을 하나씩 무력화한 확인

스크립트의 조건 하나를 `true ||`로 바꾸거나 식에서 지운 뒤 `npx jest src/ci/__tests__/postMergeVerified.test.ts`를 돌렸다. 매번 원본으로 되돌리고 `cmp`로 확인했다.

| 무력화한 것 | 실패한 테스트 수 |
|---|---|
| 스크립트 전체를 "항상 건너뜀"으로 교체 (첫 구현 시점, 33개 중) | 31 |
| base 변경 이력(`base_ref_changed`) | 2 |
| main의 코드 커밋(`git log --first-parent`) | 1 |
| 둘째 부모가 head인가 | 1 |
| 실행의 이벤트가 `pull_request`인가 | 1 |
| 실행의 워크플로 경로 | 1 |
| 실행 결론이 전부 success인가 | 3 |
| job 결과 | 12 |
| `merge_commit_sha` 대조 | 1 |
| `git diff`의 `--ignore-submodules=none` | 1 |
| 실행 제목 대조 | 7 |

처음에는 세 가지(둘째 부모, 실행 결론, diff의 서브모듈 옵션)를 무력화해도 테스트가 전부 통과했다. 해당 테스트가 다른 조건 덕분에 통과하고 있었다. 각 조건만이 막는 입력으로 고친 뒤의 값이 위 표다.
서브모듈 테스트는 도우미의 `git add -A`가 gitlink 삭제를 stage해 의도와 다른 이유로 통과하고 있었고, 파일을 이름으로 stage하게 고쳤다.
`git log`의 `--ignore-submodules=none`은 빼도 테스트가 통과했다. 경로 제한 log는 트리를 직접 비교해 무시 설정의 영향을 받지 않는다(임시 저장소에서 `diff.ignoreSubmodules=all`로 확인). 그 옵션은 스크립트에서 지웠다.

## 실제 병합 커밋에 대한 읽기 전용 실행

로컬 checkout에서 실제 `gh`로 실행했다(쓰기 없음). 실행 제목 대조를 넣기 전의 스크립트 기준이다.

| 병합 | 판정 | 이유 |
|---|---|---|
| #245 `21dfd70`, #243 `2f7d9ac`, #240 `abb7cd0` | skip | 문서만 다름, PR Checks 통과 |
| #241 `3925182`, #234 `1a90c11` | run | 브랜치가 갈라진 뒤 main에 코드 커밋 1개 |
| main의 직접 커밋 `4d7f848` | run | 연결된 병합 PR 없음 |

실행 제목 대조를 넣은 뒤에는 #245도 run이다. 그 PR 검사는 제목(`PR Checks for #<n> into main`)이 생기기 전에 돌았다. 의도한 동작이다.

## 로컬 리뷰 (Codex gpt-6.1-sol, 읽기 전용)

| 회차 | 지적 | 처리 |
|---|---|---|
| 1 | P1: head와 병합 커밋 비교만으로는 PR이 검증한 트리(head + 그때의 base)와 같다고 할 수 없다 | 둘째 부모, base 변경 이력, main의 코드 커밋 검사 추가 |
| 1 | P1: check-runs는 이름만 봐서 다른 워크플로·다른 PR의 성공이 섞인다 | Actions 실행을 워크플로 경로와 이벤트로 거르고 job까지 확인 |
| 1 | P2: 서브모듈 `ignore=all`이 gitlink 차이를 가린다 | `git diff`에 `--ignore-submodules=none`, 테스트 3개 |
| 1 | P2: WORKFLOW 문구가 취소로 인한 skipped를 검증된 생략으로 적게 한다 | 판정 job 성공과 요약의 근거 링크가 있을 때만으로 고침 |
| 2 | P1: 실행을 대상 PR에 묶지 않아 같은 head의 다른 PR 실행만으로 건너뛴다 | `pr-checks.yml`에 `run-name`, 스크립트가 제목을 정확히 대조 |

## 미검증

- GitHub에서의 실제 실행이 없다. `verified` job의 토큰 권한(`actions`·`contents`·`issues`·`pull-requests` read), `run-name`이 실행의 `display_title`로 나오는지, 병합 직후 `commits/<sha>/pulls`가 병합된 PR을 바로 돌려주는지는 이 PR과 그 병합에서 처음 확인된다.
- 마지막 수정(실행 제목 대조)은 로컬 재리뷰를 받지 않았다. Codex 주간 한도가 8% 남아 PR의 자동 리뷰에 맡겼다.
- "코드가 다른 병합에서 전부 돈다"와 `workflow_dispatch`의 전체 실행은 병합 뒤 실제 실행으로 확인해야 한다(phase 완료 조건).
- 구현 워커의 셸 명령은 허용 목록으로 걸러 자동 승인했다. 여러 줄 명령은 터미널이 앞부분만 보여 줘서 첫 단어(`jq`)만 보고 승인한 것이 7건 있다. 가려진 `python3` 명령 1건은 거절했다.
