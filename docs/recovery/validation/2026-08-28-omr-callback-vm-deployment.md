# OMR 서비스 배포 — 생산자 소유 완료 콜백 (2026-08-28)

이슈 [#55](https://github.com/landfill/ClairKeys/issues/55) / D-018의 서비스 절반을 NAVER Cloud
VM에 처음 배포하고, 콜백이 실제로 발사되는지 확인한 기록.

- 호스트: `vm-naver-20260820145930` (101.79.16.73), Rocky 8.8, podman 4.4.1
- 배포 커밋: `acf25f8` (main). 배포 전 실행 이미지는 `cb42947`로 PR #68 **이전**이었다.
- 이미지 태그: `clairkeys-omr:acf25f8` = `clairkeys-omr:current` = `12b9a021fad9`

## 배포 전 사전 확인 — 이 릴리스에만 있는 새 위험

기존 `omr-service/deploy/README.md`의 확인 절차는 **인바운드만** 검증한다. 이번 릴리스는
서비스가 처음으로 **아웃바운드** 요청을 보내므로, 그 경로가 존재하는지가 배포 성패를 가른다.
ACG가 아웃바운드를 막고 있었다면 콜백은 12회 조용히 실패하고 증상은 "아무 일도 안 일어남"이다.

VM에서 실행:

| 확인 | 결과 |
|---|---|
| `https://api.github.com` | 200 — 일반 아웃바운드 HTTPS 가능 |
| `POST https://clairkeys.vercel.app/api/omr/finalize` (토큰 없이) | **401** — 라우트 존재, 인증 게이트 작동 |
| 위 + 올바른 토큰 + 비-UUID `job_id` | **400** — 인증 통과, UUID 검증 작동 |
| 위 + 올바른 토큰 + 존재하지 않는 UUID | **404** — 인증 통과, DB 조회 도달 |
| 위 + 틀린 토큰 | **401** — 거부 |

**배포 전에 콜백 계약의 Next.js 절반이 전부 실증됐다.** 양쪽 `OMR_SHARED_SECRET`이 일치한다.
`400`/`404`와 `401`의 구분이 핵심 근거다 — 401이 아니라는 사실이 곧 토큰이 통과했다는 뜻이다.

## 배포

```
git -C /opt/clairkeys fetch origin main
cd /opt/clairkeys-deploy && git checkout --detach acf25f8
cd omr-service && podman build -f Dockerfile.audiveris \
  -t clairkeys-omr:acf25f8 -t clairkeys-omr:current .
systemctl restart clairkeys-omr
```

## 배포 후 확인

외부(Vercel과 같은 위치)에서:

| 확인 | 결과 |
|---|---|
| `GET http://101.79.16.73:3000/health` | **200** |
| `POST http://101.79.16.73:3000/process` (토큰 없이) | **401** |

실행 중인 컨테이너 내부에서 (`podman exec`, 소스가 아니라 **적재된 모듈**을 검사):

| 항목 | 값 | 대응 |
|---|---|---|
| `notify_completion`이 `else` 블록에 | `True` | R3 |
| `delivery.CALLBACK_TIMEOUT_SECONDS` | `70.0` | R4 |
| `is_retryable_status(400)` | `False` | R5 |
| `is_retryable_status(404)` | `True` | R5 (업로드 경합) |
| `httpx` | `0.24.1` | requirements 핀(`>=0.24,<0.25`)과 일치 |

## 실제 변환 + 콜백 발사 확인

`wtk1-prelude1-a4.pdf`, `callback_url=https://clairkeys.vercel.app/api/omr/finalize`.
job `4eb4cb71-7cd0-4f12-8db1-c97fcb72b2a4`.

- 변환 완료, **514 notes** — 2026-08-21 이후 고정된 값과 동일하므로 이 배포는 변환기를 바꾸지 않았다.
- `delivery_status`가 `-` → `retrying`으로 전이 — **콜백이 실제로 발사됐다.**
- 컨테이너 로그: `Completion callback for job … returned 404: {"error":"Job not found."}` 반복.

**404가 옳은 답이다.** 이 job은 업로드 라우트가 아니라 `curl`로 직접 만든 합성 job이라
대응하는 `SheetMusic` 행이 없다. 그리고 **401이 아니라 404라는 사실이 토큰이 수락되어 DB
조회까지 도달했다는 증거**다. 재시도가 도는 것도 정책대로다 — D-018과 `omr/delivery.py`는
404를 업로드 경합(`omrJobId`는 `/process` 응답 이후에 기록된다) 때문에 의도적으로 retryable로
둔다.

## 아직 확인하지 못한 것

**이슈 #55는 이 기록으로 닫히지 않는다.** 남은 고리는 하나다: 실제 사용자가 웹앱에서 PDF를
업로드해 `SheetMusic` 행이 생기고, 그 행의 `omrJobId`로 콜백이 조회에 **성공**해 결과가
저장되는 것. 그 경로는 인증된 브라우저 세션이 필요해 에이전트가 실행할 수 없다.

확인 방법: 업로드 후 **업로드 화면을 즉시 벗어나고**, 변환 소요 시간(약 45초)보다 넉넉히 기다린
뒤 악보가 `completed`로 저장됐는지 본다. 폴링이 살아 있으면 콜백 없이도 저장되므로, 화면을
벗어나는 것이 이 검증의 전부다.

## 발견 — systemd unit의 잠복 결함 (기배포분, 이번 변경과 무관)

`systemctl restart`가 non-zero로 실패를 보고한다:

```
podman[350198]: Error: remove /run/clairkeys-omr.service.ctr-id: no such file or directory
clairkeys-omr.service: Main process exited, code=exited, status=125/n/a
clairkeys-omr.service: Failed with result 'exit-code'.
clairkeys-omr.service: Scheduled restart job, restart counter is at 1.
Started Podman container-clairkeys-omr-prod.service.
```

`ExecStopPost`의 `podman rm --cidfile`이 cidfile을 지운 뒤, 이어지는 `ExecStart`의
`podman run --cidfile`이 같은 파일을 다시 지우려다 125로 죽는다. `Restart=always`와
`RestartSec=100ms`가 100ms 뒤 재시도해 성공한다.

**이번 변경이 만든 것이 아니다** — 2026-08-23 배포 journal에 동일한 시퀀스가 그대로 있다.
결과적으로 서비스는 정상 기동하지만 두 가지가 남는다.

- `systemctl restart`의 종료 코드를 배포 성공 판정에 쓸 수 없다. 스크립트로 자동화하면 매번
  실패로 읽힌다.
- `Restart=always`가 이 결함을 가리고 있다. 재시도 정책을 손대면 배포가 서비스를 내린 채
  끝날 수 있다.

후속: `deploy/README.md`에 재배포 절차와 이 quirk를 기록하고, unit의 `ExecStart` 앞에
`ExecStartPre=-/bin/rm -f %t/%n.ctr-id`를 두는 방안을 검토한다. 둘 다 ops 문서·설정이므로
브랜치·PR 대상이며 이 기록에 포함하지 않는다.
