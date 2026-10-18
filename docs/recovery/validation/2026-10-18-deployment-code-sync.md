# 운영 코드 동기화 확인 — 2026-10-18 KST

## 결과

- 확인 시작 main = origin/main `dd7aaf77a318067ffcd32225909e2954fe14521c`, 작업 트리 clean. `git fetch origin` 성공 후 확인했다.
- 웹 운영 alias `clairkeys.vercel.app`: Vercel deployment `dpl_5e1i7YXakbbX7vhQJRVigqJftHqV`, production/Ready, 2026-10-17 08:48:38 KST 생성.
  URL `https://clairkeys-b8rqz429w-landfills-projects.vercel.app`.
  GitHub deployment `7131915192`의 success/동일 URL과 SHA `f639dbabaf901222efac0aa1652b70456a6ed1fd`를 연결했다.
  해당 SHA 이후 main 차이는 HANDOFF와 수동 BPM 검증 문서뿐이다. 웹 실행 코드 변경 없음.
- VM hostname `vm-naver-20260820145930`: 배포 checkout `70eb25e6a50a9b89acaf673b590d57f572200123`, clean.
  systemd `clairkeys-omr` active, `clairkeys-omr-prod` healthy.
  current 이미지와 실제 실행 이미지 모두 `afa179723bc21f2a2b06d8f53251eb8bfc22a8372bb4dec4a875711fe4549d6f`, revision `70eb25e…`.
- `git diff 70eb25e main -- omr-service`의 차이는 `d06332c`가 수정한 테스트 3개뿐이다:
  `test_meter_retry_runtime.py`, `test_wedge_retry_runtime.py`, `test_whole_note_retry_runtime.py`.
  tests 제외 diff 없음. 실제 컨테이너 `/app`의 추적 대상 실행 Python 16개 SHA256을 로컬 main과 비교: missing 0, mismatch 0.
- 따라서 실행 코드는 최신과 일치한다. 저장소 전체 SHA는 웹·VM 모두 main과 다르며 VM 테스트 사본은 최신이 아니다. 배포·재시작은 수행하지 않았다.

## 명령·결과·한계

- `git fetch origin`, `git branch --show-current`, `git status --short`, `git rev-parse HEAD origin/main`: main 동일/clean.
- `vercel --scope team_UopVzJuJOQ1rAhzBXwoYzLp7 inspect clairkeys.vercel.app`: production Ready.
- `gh api repos/landfill/ClairKeys/deployments?environment=Production&per_page=3` 및 `deployments/7131915192/statuses`: 위 SHA와 운영 URL success.
- `git diff --stat f639dba main`, 실행 파일 제외 문서 diff 확인: 문서만 2개.
- SSH 읽기 전용 `git rev-parse`, `git status`, `systemctl is-active`, `podman ps/image inspect/inspect`: 위 상태 확인.
- `podman exec ... python3`로 파일 해시만 출력하고 로컬 Python으로 비교했다. 첫 `python` 호출은 실행 파일 부재로 실패했고 `python3`로 성공했다.
- Vercel MCP는 팀 범위 권한 403으로 실패, 기존 인증 CLI로 같은 운영 대상을 확인했다.
- 최초 sandbox 내 fetch/SSH는 권한 제한으로 실패했고 승인된 확장 실행으로 성공했다.
- 코드·동작 변경 없음. 테스트/build/E2E, 외부 health HTTP, DB migration 상태, 웹 업로드→OMR 통합 처리는 이번 확인 범위가 아니다.
- 이전 VM 배포/무결성 근거: [PR173 배포](2026-09-20-issue-125-vm-deployment.md), [상세 evidence](2026-09-20-issue-125-vm-evidence.json).
