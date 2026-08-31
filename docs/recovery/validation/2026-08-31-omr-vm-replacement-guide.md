# OMR VM 교체 가이드 검증

Date: 2026-08-31 KST
Branch: `codex/ops-vm-replacement-guide`
Commit: `3e097f0b3cbe5fd2d2425c9d65bd7d4a76c44118`
Pull request: [#102](https://github.com/landfill/ClairKeys/pull/102)

## 점검 결과

기존 `docs/deployment.md`, `docs/environment.md`, `omr-service/deploy/README.md`와 코드의 환경변수
사용처를 대조했다. 기존 서비스 문서는 `/opt/clairkeys` worktree와 Podman이 이미 있는 호스트에서
시작하므로 모두의AI가 OS-only VM을 할당한 직후부터 쓰는 절차로는 불완전했다. 다음 항목이 하나의
문서에 없었다.

- 모두의AI 신청·할당정보, 새 SSH PEM·host fingerprint, OS/사양/권한 검수와 OS bootstrap
- 작업자가 cloud firewall을 직접 바꾸지 않고 모두의AI에 inbound/outbound 변경을 요청하는 경계
- 검증된 VM 사양, `/data`의 비영속 성질, 영속 데이터의 실제 위치
- Vercel Production 필수 변수 전체 목록과 Preview 분리 원칙
- VM 교체 때 `OMR_SERVICE_URL`·`OMR_SHARED_SECRET`을 함께 바꾸고 redeploy해야 하는 계약
- 외부 200/401, outbound callback, 실제 PDF·페이지 이탈 완료의 절체 판정
- 구 URL/secret 쌍으로의 rollback과 구 VM/PEM 반납

`docs/vm-replacement.md`가 이 범위를 canonical A–Z 절차로 추가하고, README·deployment·environment·
service deploy 문서에서 진입할 수 있게 했다. 재사용 명령의 과거 공인 IP는 placeholder로 바꿨다.

## 코드 대조

Vercel 필수 목록은 `process.env` 사용처, Prisma의 `env("DATABASE_URL")`, NextAuth·Supabase·OMR route를
대조했다. VM에는 D-011대로 `OMR_SHARED_SECRET`만 두고 `DATABASE_URL`, `SUPABASE_*`, OAuth secret을
두지 않는다. D-012의 테스트 전용 HTTP 위험과 TLS exit condition도 유지했다.

Vercel 환경변수 변경 후 새 deployment가 필요하다는 동작은 플랫폼 공식 문서에 대조해 가이드에서
링크했다. 모두의AI의 할당·접속정보 계약은 사용자가 제공한 실제 운영 경계이며 외부 provider 절차를
추정해 채우지 않았다.

## Verification

| Command | Result |
|---|---|
| `git diff --check` | PASS |
| local documentation target `test -f` checks | PASS |
| `cd omr-service && python3 -m unittest tests.test_audiveris_runtime` | PASS — 13 tests |

CodeRabbit 리뷰로 절체·롤백 drain과 HTTP 안전 게이트를 보강한 `9c43d35`에서도 `git diff --check`와
같은 OMR deployment-contract 13 tests가 다시 통과했다. 실제 두 VM 사이의 drain은 외부 상태를
바꾸는 운영 작업이므로 여전히 미실행이다.

첫 PEM 보강 `c7c4013`은 작업자가 NCP 인증키를 생성한다는 잘못된 전제를 포함했다. 사용자가 모두의AI가
OS-only VM과 새 SSH PEM을 할당한다고 바로잡아 `0dad647`이 이를 supersede했다. 현재 계약은 다음과 같다.

- 모두의AI 할당 답변에서 VM 식별자·기한·주소·관리자 사용자·새 SSH PEM·host fingerprint·포트 상태를 받는다.
- 새 PEM으로 직접 SSH하며 구 PEM을 재사용하지 않는다.
- IP가 재사용돼도 host fingerprint를 out-of-band로 대조하기 전에 `known_hosts`를 우회하지 않는다.
- 포트 개방·접속키 재발급·VM 반납은 NAVER Cloud 콘솔이 아니라 모두의AI 지원 경로로 요청한다.

`0dad647`에서 `git diff --check`와 OMR deployment-contract 13 tests가 다시 통과했다. 실제 할당·PEM
접속·포트 요청·반납은 모두의AI가 새 VM을 할당한 시점에 검증한다.

PR head `0dad647`의 Lint, Lint and Type Check, Run Tests, Security Audit, E2E Tests, Vercel, aggregate
checks도 모두 성공했다. 사용자의 명시적 지시에 따라 이 문서 head에는 CodeRabbit 리뷰를 수동 요청하지
않았다(`Review skipped: manual review required` 상태를 그대로 유지).

첫 OMR test 호출은 저장소 루트에서 `python3 -m unittest omr-service/tests/test_audiveris_runtime.py`로
실행해 `ModuleNotFoundError: No module named 'omr'`가 났다. 테스트 실패가 아니라 documented module
root와 다른 작업 디렉터리에서 실행한 호출 오류였고, `omr-service/`에서 다시 실행해 13개가 통과했다.

## Not tested

- 실제 모두의AI VM 신청·할당, 새 PEM SSH 접속, provider 포트 변경, 이미지 빌드
- 실제 Vercel 환경변수 갱신·Production redeploy
- 실제 PDF 변환, 완료 callback, rollback, 구 VM·PEM 반납

이 항목들은 새 VM과 운영자 권한이 있어야 하며 이번 문서 작성 범위에서 외부 상태를 변경하지 않았다.
실행 시 이 문서가 아니라 새 날짜의 운영 검증 기록을 별도로 남긴다.

## Merge verification

- User-approved PR #102 merge completed on 2026-08-31 KST as merge commit
  `941d897ddc998cca2f958c948b79ee99764757dc`.
- Merge commit checks `Lint`, `Run Tests`, `Security Audit`, `Post-merge tests`,
  `Post-merge build`, and `E2E Tests` all completed successfully.
- `origin/main` and local `main` contain feature tip
  `0dad6470c21db7099752466b3ceac19009612b21`.
- The remote and local `codex/ops-vm-replacement-guide` branches were deleted after both tip
  ancestry checks passed and the worktree remained clean.
