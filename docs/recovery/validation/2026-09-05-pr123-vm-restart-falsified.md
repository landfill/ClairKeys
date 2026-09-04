# Validation — PR #123 / 이슈 #52 의 수정이 프로덕션에서 결함을 제거하지 못했다

Date: 2026-09-05 KST
Environment: NAVER Cloud Platform VM `vm-naver-20260820145930` (Rocky Linux 8.8, podman 4.4.1),
systemd unit `clairkeys-omr.service`
Subject: PR [#123](https://github.com/landfill/ClairKeys/pull/123) head `d439173`, 이슈
[#52](https://github.com/landfill/ClairKeys/issues/52)

## 결론

**PR #123의 `ExecStartPre=/bin/rm -f %t/%n.ctr-id`는 관측된 결함을 제거하지 못한다.** 수정을 설치하고
systemd가 그것을 실행했음을 확인한 상태에서도 **동일한 오류가 그대로 재현됐다.** 이슈 #52를 닫아서는 안 되며,
PR #123을 "런타임 결함을 고친다"로 서술해서는 안 된다.

## 기준선 (변경 전)

| 항목 | 값 |
|---|---|
| `systemctl is-active` | `active` |
| `ExecMainStatus` | `0` |
| 실행 이미지 | `localhost/clairkeys-omr:current`, ID `12b9a021fad9b77bb74752fcd0da82f1d358916e9bfb4ed10e576addbae8559f` |
| 외부 `GET /health` | `200` |
| 인증 없는 `POST /process` | `401` |
| 배포된 유닛의 `ExecStartPre` | **없음** (PR #123 미적용) |
| 누적 `status=125` | 2회 (2026-08-23 22:02:05, 2026-08-28 20:50:27) |

백업: `/root/clairkeys-omr.service.bak.20260905-011654` (`diff -q`로 동일 확인)

## 절차와 결과

### 1. 재현 — 수정 전 유닛

간격을 둔 재시작 3회는 **실패하지 않았다** (exit 0, `status=125` 총계 2로 불변). 결함은 타이밍 의존적이다.

간격 없이 연속 재시작 10회로 경합 창을 최대화하자 **10회 중 2회 실패**했고 `status=125` 총계가 **2 → 4**로
증가했다. 회귀 근거 확보.

### 2. 수정 설치

`git show origin/codex/issue-52-systemd-restart:omr-service/deploy/clairkeys-omr.service`를 그대로 설치했다.
설치본과의 차이는 **정확히 한 줄**임을 `diff -u`로 사전 확인했다.

```diff
 TimeoutStopSec=70
+ExecStartPre=/bin/rm -f %t/%n.ctr-id
 ExecStart=/usr/bin/podman run \
```

`systemctl daemon-reload` 후 systemd가 이 지시를 인식하고 실제로 실행함을 확인했다.

```
ExecStartPre={ path=/bin/rm ; argv[]=/bin/rm -f /run/clairkeys-omr.service.ctr-id ;
               ignore_errors=no ; code=exited ; status=0 }
```

### 3. 검증 — 동일 조건 재시도

같은 연속 재시작 10회에서 **10회 중 1회 실패**했고 `status=125` 총계가 **4 → 5**로 증가했다.

오류 메시지는 8월의 두 건과 **글자 그대로 동일**하다.

```
Sep 05 01:19:46 systemd[1]: Starting Podman container-clairkeys-omr-prod.service...
Sep 05 01:19:46 podman[575105]: Error: remove /run/clairkeys-omr.service.ctr-id: no such file or directory
Sep 05 01:19:46 systemd[1]: clairkeys-omr.service: Main process exited, code=exited, status=125/n/a
Sep 05 01:19:46 systemd[1]: Failed to start Podman container-clairkeys-omr-prod.service.
```

2/10 → 1/10은 n=10에서 통계적으로 구분되지 않는다. 그러나 통계는 필요하지 않다 — **수정이 설치되고 실행된
상태에서 실패가 한 번이라도 발생했다는 사실 자체가 "이 수정이 실패를 제거한다"를 반증한다.**

### 4. 복구

백업 유닛을 복원하고 `daemon-reload` 후 재시작했다. `ExecStartPre` 0건, 서비스 `active`,
`ExecMainStatus=0`, 이미지 ID가 기준선과 동일한 `12b9a021…`, 외부 `GET /health` **200**,
인증 없는 `POST /process` **401**. **프로덕션은 이 검증 이전 상태와 동일하다.**

## 왜 이 수정이 듣지 않는가 — 관측된 사실과 가설의 구분

**관측된 사실**: 실패는 `Main process`(= `ExecStart`의 `podman run`)가 cidfile을 **제거하려다 이미 없어서**
125로 끝나는 것이다. 오류는 "파일이 이미 있다"가 아니라 "파일이 없다"이다.

PR #123의 전제는 그 반대다 — 남아 있는 cidfile이 시작을 막는다고 보고 미리 지운다. 이미 없는 파일을 한 번 더
지우는 것은 관측된 실패 경로에 개입하지 않는다.

**가설(미검증)**: 유닛의 정지 경로가

```
ExecStop=/usr/bin/podman stop --ignore -t 10 --cidfile=%t/%n.ctr-id
ExecStopPost=/usr/bin/podman rm -f --ignore -t 10 --cidfile=%t/%n.ctr-id
```

이고 `Type=notify` + `--sdnotify=conmon`이다. `--ignore`는 **컨테이너** 부재를 무시할 뿐 **cidfile** 부재를
무시하지 않는다. 정지 경로의 cidfile 제거와 다음 시작이 겹치는 창이 남아 있는 것으로 보인다. 다음 시도는
`ExecStartPre`가 아니라 **정지 경로**를 봐야 한다.

## 이 검증이 뒤집는 것

- `docs/recovery/HANDOFF.md`의 "#52는 구현됐고 검증만 남았다"는 서술은 더 이상 유효하지 않다.
- PR #123은 유닛 파일에 한 줄을 추가하고 그 사실을 회귀 테스트로 고정한다. 그 테스트는 통과하지만,
  **테스트가 검증하는 것은 파일 내용이지 재시작 동작이 아니다.** 이것이 저장소 규약의 "금지되는 완료 상태"가
  경계하는 형태다.

## 미검증

- 정지 경로 수정안의 효과 (아직 시도하지 않음)
- podman 4.4.1 내부에서 ENOENT가 발생하는 정확한 코드 경로
- 10회보다 큰 표본에서의 실패율
