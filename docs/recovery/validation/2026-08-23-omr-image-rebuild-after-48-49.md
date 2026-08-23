# 2026-08-23 — OMR 이미지 재빌드: #49와 #48의 마지막 고리 검증

- Host: `vm-naver-20260820145930` (`101.79.16.73`), podman 4.4.1
- Deployed commit: `cb42947` (병합된 `main`; #50 `210a021`, #51 `64753d9` 포함)
- Image: `clairkeys-omr:cb42947`, `:current` — 911 MB → **930 MB** (예상한 ~19 MB 증가와 일치)
- 절차: `omr-service/deploy/README.md` § "From nothing to running" 1~2단계 + `systemctl restart`

이 기록이 존재하는 이유: PR #50과 #51은 **각각 검증되지 않은 고리를 하나씩 남긴 채 병합됐다.**
#50은 로컬에 Docker 데몬이 없어 이미지를 빌드하지 못했고, #51은 서비스 쪽 코드가 이미지에
구워지는 탓에 배포 전까지 동작을 확인할 수 없었다. 이 재빌드가 그 둘을 닫는다.

## 재빌드 전 상태 (실측) — 반쪽 배포가 사실이었다

Vercel은 병합 즉시 자동 배포됐으나 VM은 옛 이미지 그대로였다. 실행 중이던 컨테이너:

| 확인 | 값 |
|---|---|
| `eng.traineddata` | **4,113,088 bytes** (Ubuntu 패키지의 LSTM 전용) |
| `grep -c tempoSource /app/omr/converter.py` | **0** |
| `grep -c "return 120" /app/omr/converter.py` | **1** |

즉 사용자가 업로드 폼에 빠르기를 입력해도 이 컨테이너의 `/process`는 그 필드를 몰랐다.
`docs/recovery/HANDOFF.md`가 경고한 조용한 소실이 추론이 아니라 실제 상태였다.

## 새 이미지 내용 (재시작 전 확인)

| 확인 | 값 |
|---|---|
| `eng.traineddata` | **23,466,654 bytes** |
| sha256 | `daa0c97d651c19fba3b25e81317cd697e9908c8208090c94c3905381c23fc047` — Dockerfile의 `ARG TESSDATA_ENG_SHA256`과 일치 |
| `grep -c "return 120"` | **0** |
| `grep -c tempoSource` | 2 |
| `/app/app.py` | `tempo: Optional[float] = Form(None)` 존재 |

빌드가 `sha256sum -c -`와 `/opt/audiveris/bin/Audiveris -version`을 모두 통과했다 —
PR #50의 Dockerfile 계약이 **실제 빌드로 처음 검증됐다.**

## 이슈 #49 — OCR이 살아났다 (프로덕션 실측)

같은 VM에서 Audiveris를 직접 구동(`podman exec … -batch -export`), 대상은
`/data/testpdf/love-affair.pdf`(지면에 `Adagio ♩ = 60`이 인쇄된 사용자 악보).

```
INFO [] Languages 138 | Installed OCR languages: eng
INFO [love-affair#1] StepMonitoring 98 | TEXTS
INFO [love-affair#2] StepMonitoring 98 | TEXTS
```

**`Could not initialize TessBaseAPI languages: eng in legacy mode`와 `No OCR'd lines`가 사라졌다.**
`.mxl` 크기는 **11,118 bytes** — 이슈 #49가 예측한 값(죽은 상태 10,677 → 살린 상태 11,118)과 정확히 일치.

읽어낸 `<credit-words>`:

```
'Piano Solo - Love Affair'   'Love Affair OST'
'Ennio Morricone'            'trans. Jose Hernandez'
'10' '13' '16' '19' '25' '28'        (마디 번호)
```

지면에 인쇄된 제목·부제·작곡가·편곡자를 정확히 읽었다.

## 그러나 메트로놈 표기는 여전히 인식되지 않는다 (재확인)

같은 `.mxl`에서:

| 요소 | 개수 |
|---|---|
| `<metronome>` | **0** |
| `sound tempo` | **0** |
| `Adagio` 문자열 | **없음** |
| `>60<` 형태의 60 | **없음** |

`<words>`로 잡힌 것은 `"--—-____—' pace"`, `,_,./`, `dsm` 뿐이다.
**OCR을 되살려도 `Adagio ♩=60`은 어디에도 나타나지 않는다.** 이슈 #48 조사에서 별도 환경으로
관측한 결과가 프로덕션 이미지에서 그대로 재현됐다. 원인은 여전히 미규명이며,
`tempoSource: 'score'`는 실제 악보에서 아직 한 번도 관측되지 않았다.

## 이슈 #48 — 빠르기 계약이 프로덕션에서 동작한다

같은 악보를 서비스 API(`/process` → `/status` → `/result`)로 통과시켰다.

| 케이스 | version | tempo | tempoSource | timingReferenceBpm | scoreTempo | duration |
|---|---|---|---|---|---|---|
| 빠르기 미입력 | `1.1` | **`null`** | `unknown` | 60.0 | `null` | 115.2s |
| 사용자가 72 입력 | `1.1` | `72.0` | **`user`** | 72.0 | `null` | 96.0s |
| `tempo=abc` | — | — | — | — | — | **HTTP 400** |

- 예전이라면 120을 지어냈을 자리에 **`null`이 저장된다.** 이슈 #48의 핵심이 프로덕션에서 성립한다.
- 재빌드 전 조용히 버려지던 사용자 입력이 이제 `tempoSource: "user"`로 반영된다.
- 잘못된 값은 400으로 거절되고 무시되지 않는다.
- 두 변환 모두 411개 음표로 동일 — 빠르기 입력이 인식 결과가 아니라 시간 축만 바꾼다.

## 외부 도달성 (D-012가 정한 검증 쌍)

```
GET  /health                       -> 200
POST /process (토큰 없음)          -> 401
POST /process (틀린 토큰)          -> 401
```

## 발견한 결함 — unit 재시작이 항상 한 번 실패한다 (이번 변경과 무관)

`systemctl restart clairkeys-omr`이 비정상 종료 코드를 냈다. journal:

```
podman[179367]: Error: remove /run/clairkeys-omr.service.ctr-id: no such file or directory
clairkeys-omr.service: Main process exited, code=exited, status=125/n/a
Failed to start Podman container-clairkeys-omr-prod.service.
clairkeys-omr.service: Service RestartSec=100ms expired, scheduling restart.
Started Podman container-clairkeys-omr-prod.service.
```

첫 기동이 cidfile 경합으로 125로 죽고, `Restart=always`가 100ms 뒤 재시도해 성공한다.
결과적으로 서비스는 정상이지만 **`systemctl restart`의 종료 코드는 실패**다.

unit(`/etc/systemd/system/clairkeys-omr.service`, 저장소 사본 `omr-service/deploy/clairkeys-omr.service`와
바이트 동일)에 `podman generate systemd --new`가 보통 넣는
`ExecStartPre=/bin/rm -f %t/%n.ctr-id`가 없다.

**프로덕션 unit을 이 세션에서 임의로 고치지 않았다.** 저장소 사본을 바꾸는 것은 핸드오프 문서가
아니라 브랜치·PR 대상이고, 증상이 자동 복구되므로 긴급하지도 않다. 이슈로 등록했다.

## 검증하지 못한 것

- 브라우저에서 업로드 폼을 통한 왕복은 하지 않았다. 서비스 API까지만 확인했다.
- `tempoSource: 'score'`는 여전히 실제 악보에서 관측되지 않았다(위 참조).
- `AUDIVERIS_MAX_CONCURRENCY=1`은 4 GB 시절 값 그대로이며 15 GiB에서 재측정하지 않았다.
