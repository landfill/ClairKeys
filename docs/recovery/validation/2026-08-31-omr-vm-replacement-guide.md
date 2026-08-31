# OMR VM 교체 가이드 검증

Date: 2026-08-31 KST
Branch: `codex/ops-vm-replacement-guide`
Commit: `3e097f0b3cbe5fd2d2425c9d65bd7d4a76c44118`
Pull request: [#102](https://github.com/landfill/ClairKeys/pull/102)

## 점검 결과

기존 `docs/deployment.md`, `docs/environment.md`, `omr-service/deploy/README.md`와 코드의 환경변수
사용처를 대조했다. 기존 서비스 문서는 `/opt/clairkeys` worktree, Podman, 공인 IP, ACG가 이미 있는
호스트에서 시작하므로 새 VM을 처음부터 만드는 절차로는 불완전했다. 다음 항목이 하나의 문서에 없었다.

- NAVER Cloud VM·Public IP·ACG 생성과 SSH/OS bootstrap
- 검증된 VM 사양, `/data`의 비영속 성질, 영속 데이터의 실제 위치
- Vercel Production 필수 변수 전체 목록과 Preview 분리 원칙
- VM 교체 때 `OMR_SERVICE_URL`·`OMR_SHARED_SECRET`을 함께 바꾸고 redeploy해야 하는 계약
- 외부 200/401, outbound callback, 실제 PDF·페이지 이탈 완료의 절체 판정
- 구 URL/secret 쌍으로의 rollback과 구 VM/Public IP 폐기

`docs/vm-replacement.md`가 이 범위를 canonical A–Z 절차로 추가하고, README·deployment·environment·
service deploy 문서에서 진입할 수 있게 했다. 재사용 명령의 과거 공인 IP는 placeholder로 바꿨다.

## 코드 대조

Vercel 필수 목록은 `process.env` 사용처, Prisma의 `env("DATABASE_URL")`, NextAuth·Supabase·OMR route를
대조했다. VM에는 D-011대로 `OMR_SHARED_SECRET`만 두고 `DATABASE_URL`, `SUPABASE_*`, OAuth secret을
두지 않는다. D-012의 테스트 전용 HTTP 위험과 TLS exit condition도 유지했다.

NAVER Cloud의 Server/Public IP/ACG 절차와 Vercel 환경변수 변경 후 새 deployment가 필요하다는 동작은
각 플랫폼 공식 문서에 대조해 가이드에서 링크했다.

## Verification

| Command | Result |
|---|---|
| `git diff --check` | PASS |
| local documentation target `test -f` checks | PASS |
| `cd omr-service && python3 -m unittest tests.test_audiveris_runtime` | PASS — 13 tests |

첫 OMR test 호출은 저장소 루트에서 `python3 -m unittest omr-service/tests/test_audiveris_runtime.py`로
실행해 `ModuleNotFoundError: No module named 'omr'`가 났다. 테스트 실패가 아니라 documented module
root와 다른 작업 디렉터리에서 실행한 호출 오류였고, `omr-service/`에서 다시 실행해 13개가 통과했다.

## Not tested

- 실제 NAVER Cloud VM 생성, Public IP·ACG 설정, 이미지 빌드
- 실제 Vercel 환경변수 갱신·Production redeploy
- 실제 PDF 변환, 완료 callback, rollback, 구 VM 폐기

이 항목들은 새 VM과 운영자 권한이 있어야 하며 이번 문서 작성 범위에서 외부 상태를 변경하지 않았다.
실행 시 이 문서가 아니라 새 날짜의 운영 검증 기록을 별도로 남긴다.

