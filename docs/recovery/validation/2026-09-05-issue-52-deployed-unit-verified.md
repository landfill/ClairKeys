# Validation — 이슈 #52 종료: 병합된 유닛을 VM에 배포하고 재시작을 재확인했다

Date: 2026-09-05 KST
Environment: NAVER Cloud Platform VM `vm-naver-20260820145930` (Rocky Linux 8.8, podman 4.4.1),
systemd unit `clairkeys-omr.service`
Subject: 이슈 [#52](https://github.com/landfill/ClairKeys/issues/52), PR
[#123](https://github.com/landfill/ClairKeys/pull/123) merge commit `72cfd8a`

## 왜 이 기록이 별도로 필요한가

브랜치 검증(`docs/recovery/validation/2026-09-05-pr123-vm-restart-falsified.md`)은 **후보 파일**을 임시로
설치해 측정한 것이고, 측정 직후 기준선으로 복구했다. 병합된 `main`의 유닛이 호스트에서 같은 결과를 내는지는
별개의 사실이다. 브랜치에서의 검증은 호스트의 검증이 아니다.

## 배포

| 항목 | 값 |
|---|---|
| 병합 커밋 | `72cfd8a` (PR #123, `--merge`) |
| 배포 소스 | `main`의 `omr-service/deploy/clairkeys-omr.service` |
| 배포 전 백업 | `/root/clairkeys-omr.service.bak.20260905-023452` |
| 배포 전 상태 | `active`, 이미지 `12b9a021fad9…` |
| 설치 후 `--rm` 개수 | **0** |
| 설치 후 `ExecStartPre` 개수 | **1** |
| `daemon-reload` 후 첫 재시작 | **exit 0** |

## 검증

```
연속 재시작 10회 → 실패 0회
status=125 총계 5 → 5 (불변)
```

| 항목 | 결과 |
|---|---|
| `ActiveState` / `SubState` | `active` / `running` |
| `ExecMainStatus` | `0` |
| `NRestarts` | `0` |
| 실행 이미지 | `12b9a021fad9b77bb74752fcd0da82f1d358916e9bfb4ed10e576addbae8559f` (배포 전과 동일) |
| 컨테이너 수 | **1** — `--rm` 제거에도 누적 없음 |
| 외부 `GET /health` | **200** |
| 인증 없는 `POST /process` | **401** |

## 누적 측정 (같은 하네스, 세 유닛)

| 유닛 | 실패 | `status=125` |
|---|---|---|
| 원본 (결함) | 2 / 10 | 2 → 4 |
| `ExecStartPre`만 추가 | 1 / 10 | 4 → 5 |
| `--rm` 제거 (브랜치 후보) | 0 / 40 | 5 → 5 |
| **`--rm` 제거 (병합 후 배포본)** | **0 / 10** | **5 → 5** |

수정 도입 이후 총 **50회** 연속 재시작에서 `status=125`가 한 번도 발생하지 않았다.

## 결론

이슈 #52의 런타임 결함은 **프로덕션에서 해소됐다.** 호스트는 이제 `main`과 일치하는 유닛으로 동작하며,
설정 드리프트가 없다. 이슈를 닫는다.

## 미검증

- 재부팅 경로에서의 동작
- 50회보다 큰 표본
- podman 4.4.1 내부에서 ENOENT가 발생하는 정확한 코드 경로
