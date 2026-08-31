# OMR VM 교체 가이드

이 문서는 **모두의AI에 신청해 OS만 설치된 새 VM과 접속정보를 할당받은 시점**부터 ClairKeys의 OMR
서비스를 운영 절체하는 canonical 체크리스트다. VM·공인 IP·클라우드 방화벽은 모두의AI가 준비하며,
이 문서의 작업자는 NAVER Cloud 콘솔에서 서버를 생성하지 않는다. 기존 VM 안의 파일이나 개인 메모가
없어도 저장소, 새 VM 접속정보, Vercel 권한만으로 완료할 수 있어야 한다.

> 현재 운영 방식은 D-012가 허용한 테스트 단계의 평문 HTTP다. 실사용자 트래픽을 받기 전에는
> `docs/recovery/DECISIONS.md`의 D-012 exit condition에 따라 TLS로 전환해야 한다.

> **안전 게이트:** 이 문서의 `http://<NEW_VM_HOST>:3000` 절체는 격리된 테스트 단계에만 허용된다.
> 실사용자 트래픽을 받는 운영 절체라면 여기서 중단하고 먼저 TLS를 구성한 뒤
> `OMR_SERVICE_URL=https://...`로 절체한다. D-012를 대체하는 새 결정 없이 이 조건을 완화하지 않는다.

## 0. 모두의AI 신청·할당 체크리스트

모두의AI 신청 시 아래 기준의 VM을 요청하고, 할당 답변에서 모든 값을 확보한다. 비밀값을 이 문서,
이슈, 커밋, 채팅에 붙이지 않는다.

| 받아야 할 항목 | 확인 기준 |
|---|---|
| 신청/할당 식별자 | 문의와 반납에 사용할 신청 번호 또는 VM 이름 |
| 사용기한 | 절대 날짜와 시간대. 다음 교체 준비일도 함께 정함 |
| 공인 접속 주소 | 새 IP 또는 hostname. 아래 `<NEW_VM_HOST>`로 표기 |
| SSH 정보 | 포트(기본 22), 관리자 사용자명, sudo/root 가능 여부 |
| 새 PEM | **이번 VM에 할당된 파일**. 구 VM PEM을 재사용하지 않음 |
| SSH host key fingerprint | 새 서버 진위 확인용. PEM fingerprint와 다른 값 |
| OS·아키텍처 | Rocky Linux 8.8 계열, x86_64 |
| 사양 | 기존 검증값 2 vCPU, 15GiB RAM, root disk 약 100GB |
| 네트워크 | SSH 22, 테스트 서비스 3000 또는 TLS 443 inbound 상태; DNS·HTTP·HTTPS outbound 가능 |
| 지원 경로 | 포트 변경, 접속 장애, VM 반납을 요청할 모두의AI 연락 경로 |

추가로 필요한 권한과 준비물:

- GitHub 저장소 읽기 권한(이 저장소는 public이므로 현재는 별도 토큰 불필요)
- Vercel ClairKeys 프로젝트의 Settings·Deployments 변경 권한
- Supabase, Google OAuth, GitHub OAuth 관리자 권한 또는 기존 Vercel 값을 유지할 수 있는 권한
- 실제 악보 PDF 1개(4MB 이하). 서비스 전체 변환 검증용이며 저장소의
  `e2e/fixtures/sample-sheet.pdf`는 글자만 그린 합성 PDF라 OMR 검증에 쓰지 않는다

기존 VM과 **구 PEM**은 절체·롤백 검증이 끝날 때까지 유지한다. 처리 중 job은 프로세스 메모리에만
있으므로 VM을 재시작하거나 반납하면 복구되지 않는다. `/data`는 변환 중 임시 파일용이고 영속 데이터의
원본이 아니다. 사용자 악보 메타데이터와 결과 JSON의 원본은 각각 Supabase PostgreSQL과 Storage에 있다.

## 1. 기준 구성

검증된 기준은 다음과 같다. 같은 사양을 받을 수 없으면 **아키텍처는 x86_64로 유지**하고 메모리는
15GiB 이상을 우선한다. Audiveris JVM heap이 3GB이므로 4GiB보다 작은 서버로 낮추지 않는다.

| 항목 | 기준 |
|---|---|
| 공급 | 모두의AI가 OS 설치와 공인 접속정보를 완료해 할당 |
| OS | Rocky Linux 8.8 x86_64 또는 저장소 컨테이너를 실행할 수 있는 호환 Rocky 8 계열 |
| 사양 | 기존 검증값 2 vCPU, 15GiB RAM, root disk 약 100GB |
| 런타임 | podman 4.x, systemd |
| 서비스 | host `0.0.0.0:3000` → container `:8000` |
| 영속 데이터 | 없음. `/data`는 작업 중 임시 볼륨 |
| 서비스 자격증명 | `OMR_SHARED_SECRET`만 사용. Supabase 키는 절대 두지 않음 |

사양이나 OS가 기준과 다르면 임의로 절차를 변형하지 말고 모두의AI에 재할당 또는 변경을 요청한다.
특히 `uname -m`이 `x86_64`가 아니면 pinned Audiveris `.deb`를 사용할 수 없다.

## 2. 새 PEM·SSH·네트워크 확인

1. 모두의AI가 전달한 **새 PEM**을 자격증명 보관소에 넣고 암호화 백업 1개를 둔다. PEM 본문은
   저장소, VM, 이슈, 채팅, 일반 클라우드 드라이브에 복사하지 않는다. Mac/Linux 로컬 사본의 권한을
   제한한다.

```bash
chmod 400 /secure/path/<NEW_VM_PEM>.pem
```

2. 새 VM이 구 VM과 같은 IP를 재사용하면 로컬 `known_hosts`에 구 host key가 남아 접속 경고가 난다.
   경고를 끄거나 `StrictHostKeyChecking=no`로 우회하지 않는다. 먼저 모두의AI가 전달한 새 SSH host key
   fingerprint와 접속 화면의 fingerprint를 대조한다. 일치할 때만 해당 주소의 옛 항목을 제거한다.

```bash
ssh-keygen -F <NEW_VM_HOST>
ssh-keygen -R <NEW_VM_HOST>
```

3. 새 PEM과 할당받은 관리자 사용자명으로 접속한다. 구 PEM이 성공하더라도 사용하지 않는다.

```bash
ssh -i /secure/path/<NEW_VM_PEM>.pem -p <SSH_PORT> <ADMIN_USER>@<NEW_VM_HOST>
```

첫 접속에서 표시되는 host key fingerprint가 사전에 받은 값과 일치할 때만 등록한다. 접속 후 sudo 권한과
OS·아키텍처·사양·디스크를 실측한다.

```bash
sudo -n true
cat /etc/os-release
uname -m
nproc
free -h
df -h /
```

`sudo -n true`가 실패하더라도 비밀번호 입력형 sudo가 제공됐을 수 있다. `sudo -i`를 직접 확인하고,
root 권한을 얻을 수 없으면 설치를 시작하지 말고 모두의AI에 권한 수정을 요청한다.

4. 모두의AI 할당정보에 22·3000/443 포트 상태가 없거나 외부 검사가 timeout이면 직접 ACG/NACL을
   변경하지 않는다. 다음 내용을 모두의AI에 요청한다.

| 방향 | 포트 | 요청 내용 |
|---|---:|---|
| inbound | SSH 포트(기본 22) | 운영자 접속 가능. 가능하면 운영자 공인 IP로 제한 |
| inbound | 3000 | D-012 격리 테스트에만 외부 공개 |
| inbound | 443 | TLS 전환 시 공개. 그때 외부 3000은 닫음 |
| outbound | 53, 80, 443 | DNS, 패키지/이미지 다운로드, Vercel 완료 callback |

5. 새 PEM은 새 VM이 살아 있는 동안 보관한다. 분실·노출 시 임의 키로 복구하려 하지 말고 모두의AI에
   VM 접속키 재발급 또는 재할당을 요청한다. 재발급 뒤에는 새 PEM과 새 SSH host fingerprint를 다시
   확인한다.

## 3. OS 부트스트랩과 저장소 배치

모든 후속 명령은 VM의 root shell에서 실행한다.

```bash
dnf install -y podman git curl openssl
podman --version
git --version

git clone --branch main https://github.com/landfill/ClairKeys.git /opt/clairkeys
git -C /opt/clairkeys fetch origin main
git -C /opt/clairkeys worktree add --detach /opt/clairkeys-deploy origin/main

mkdir -p /data/processing
chmod 755 /data /data/processing
```

배포 대상이 merged `origin/main`인지 기록한다.

```bash
git -C /opt/clairkeys-deploy rev-parse HEAD
git -C /opt/clairkeys-deploy status --short
```

두 번째 명령의 출력은 비어 있어야 한다. 이후 재배포에서도 임의 checkout의 변경분이 아니라
`origin/main`의 특정 커밋으로 이미지를 만든다.

## 4. OMR 이미지 빌드

```bash
cd /opt/clairkeys-deploy/omr-service
DEPLOY_SHA=$(git -C /opt/clairkeys-deploy rev-parse --short HEAD)
podman build -f Dockerfile.audiveris \
  -t "clairkeys-omr:${DEPLOY_SHA}" \
  -t clairkeys-omr:current .

podman image inspect clairkeys-omr:current --format '{{.Id}}'
```

빌드 중 checksum 검사와 `/opt/audiveris/bin/Audiveris -version`이 통과해야 한다. 이 단계는 Audiveris,
Tesseract legacy+LSTM 영어 모델, GTK 런타임까지 실제 이미지 안에 들어갔음을 확인한다.

## 5. VM 시크릿과 systemd 설치

새 VM에는 새 공유 시크릿을 만든다. 이 값을 화면에 출력하지 말고, Vercel을 바꾸기 전까지 구 VM과
구 Vercel 값도 보존한다. 그래야 즉시 롤백할 수 있다.

```bash
umask 077
OMR_SECRET=$(openssl rand -hex 32)
{
  echo 'ENVIRONMENT=production'
  echo "OMR_SHARED_SECRET=${OMR_SECRET}"
  echo 'AUDIVERIS_MAX_CONCURRENCY=1'
} > /etc/clairkeys-omr.env
unset OMR_SECRET
chmod 600 /etc/clairkeys-omr.env

cp /opt/clairkeys-deploy/omr-service/deploy/clairkeys-omr.service \
  /etc/systemd/system/clairkeys-omr.service
systemctl daemon-reload
systemctl enable --now clairkeys-omr
```

확인:

```bash
systemctl is-enabled clairkeys-omr
systemctl is-active clairkeys-omr
podman ps --filter name=clairkeys-omr-prod
curl --fail --silent http://127.0.0.1:3000/health
journalctl -u clairkeys-omr --since '10 minutes ago' --no-pager
```

`/etc/clairkeys-omr.env`에는 위 세 변수만 있어야 한다. 특히 `SUPABASE_*`, `DATABASE_URL`, OAuth 키를
VM에 복사하지 않는다. `systemctl restart`는 이 unit의 알려진 cidfile 결함(이슈 #52) 때문에 첫 시도가
125를 반환한 뒤 `Restart=always`로 살아날 수 있다. 성공 판정은 restart의 exit code가 아니라
`systemctl is-active`, 컨테이너 목록, `/health` 세 가지로 한다.

## 6. Vercel 변경 전 새 VM 검증

먼저 VM 내부에서 인증 경계를 확인한다.

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/health
curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST http://127.0.0.1:3000/process
```

순서대로 `200`, `401`이어야 한다. 그다음 운영자 PC처럼 **VM 밖**에서 같은 검사를 실행한다.

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://<NEW_VM_HOST>:3000/health
curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST http://<NEW_VM_HOST>:3000/process
```

여기도 `200`, `401`이어야 한다. 내부만 성공하면 모두의AI 측 inbound 정책 또는 할당 주소 문제이므로
할당 식별자와 함께 지원 경로로 문의한다. `/process`가 401이 아니면 공유 시크릿 게이트가 정상적으로
켜지지 않은 것이다.

완료 콜백의 outbound 경로도 확인한다.

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST https://clairkeys.vercel.app/api/omr/finalize
```

토큰 없이 `401`이면 DNS·outbound HTTPS·Vercel 라우트가 모두 도달 가능하다.

## 7. Vercel에 등록할 환경변수

Vercel 프로젝트의 `Settings > Environment Variables`에서 관리한다. 값 변경은 기존 deployment에
소급되지 않으므로 저장 후 반드시 새 Production deployment를 만들어야 한다. 플랫폼 동작의 기준은
Vercel 공식 [Environment variables](https://vercel.com/docs/environment-variables)와
[Managing environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)다.

### Production 필수값

| 변수 | 값/출처 | 비밀 | VM 교체 때 변경 |
|---|---|---:|---:|
| `DATABASE_URL` | Supabase PostgreSQL connection string | 예 | 아니오 |
| `NEXTAUTH_URL` | `https://clairkeys.vercel.app` | 아니오 | 아니오 |
| `NEXTAUTH_SECRET` | 기존 운영값 유지 | 예 | 아니오 |
| `GOOGLE_CLIENT_ID` | Google OAuth client | 아니오 | 아니오 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client | 예 | 아니오 |
| `GITHUB_CLIENT_ID` | GitHub OAuth App | 아니오 | 아니오 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App | 예 | 아니오 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | 공개 | 아니오 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 공개 | 아니오 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | **예** | 아니오 |
| `OMR_SERVICE_URL` | D-012 테스트 단계는 `http://<NEW_VM_HOST>:3000`; 실사용자 운영은 TLS를 먼저 구성한 `https://...` | 아니오 | **예** |
| `OMR_SHARED_SECRET` | 새 VM `/etc/clairkeys-omr.env`와 정확히 같은 값 | **예** | **예** |

`OMR_SERVICE_URL`과 `OMR_SHARED_SECRET`은 한 deployment에서 함께 바꾼다. URL만 바꾸면 새 VM이 401을
반환하고, 시크릿만 바꾸면 구 VM이 401을 반환한다. 시크릿을 터미널에 출력해 복사하지 말고 권한 있는
운영자가 `/etc/clairkeys-omr.env`와 Vercel의 암호 입력란 사이에서 직접 전달한다.

### 선택값

| 변수 | 용도/권장값 |
|---|---|
| `ADMIN_EMAILS` | 관리자 이메일 쉼표 목록. 비우면 관리자 없음 |
| `NEXT_PUBLIC_BASE_URL` | 설정한다면 `https://clairkeys.vercel.app` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | `/api/health`의 선택적 Supabase 검사 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 현재 마운트되지 않는 푸시 UI용; VM 교체와 무관 |

`ENVIRONMENT`, `AUDIVERIS_MAX_CONCURRENCY`, `AUDIVERIS_TIMEOUT_SECONDS`는 VM/컨테이너 변수이며 Vercel에
등록하지 않는다. `NODE_ENV`, `VERCEL_*`, `CI`도 플랫폼이 관리하므로 수동 등록하지 않는다.

Preview에 운영 DB·service role·OMR 시크릿을 자동 복제하지 않는다. Preview에서 실제 업로드를 검증해야
할 때만 위험을 이해하고 별도 Preview 값 또는 의도적으로 공유한 값을 설정한다. OAuth callback은
Production에서 다음 두 주소가 provider에 등록돼 있어야 하며 VM 교체로 바뀌지 않는다.

- `https://clairkeys.vercel.app/api/auth/callback/google`
- `https://clairkeys.vercel.app/api/auth/callback/github`

전체 변수의 코드상 용도는 [environment.md](environment.md)에 있다.

## 8. 절체

이 절의 HTTP 절체는 D-012의 격리된 테스트 deployment에만 적용한다. 실사용자 운영이라면 먼저 TLS를
구성하고 외부 3000을 닫은 상태에서 같은 drain·절체 순서를 `https://...` 주소로 수행한다.

1. 변경 시간을 공지하고 새 PDF 업로드를 중지한다. 현재 애플리케이션에는 maintenance switch나 job
   목록 endpoint가 없으므로, 업로드할 수 있는 테스트 사용자를 통제하고 구 VM journal에서 그 시간까지
   수락한 job ID를 기록한다.
2. 구 VM이 기록한 모든 job에 대해 `Successfully completed job ...`와
   `Delivered completed job ...` 로그가 모두 나타날 때까지 기다린다. 각 악보가 Supabase에 저장되고
   `processingStatus=completed`인지 확인한다. 실패·처리 중 job이 하나라도 있으면 절체하지 않는다.

```bash
journalctl -u clairkeys-omr --since '<CHANGE_WINDOW_START>' --no-pager
```

3. 새 VM이 6절의 `200`/`401` 검사를 통과한 상태에서 Vercel의 `OMR_SERVICE_URL`과
   `OMR_SHARED_SECRET`을 함께 갱신한다.
4. 최신 Production deployment를 **Redeploy**한다. 환경변수 저장만으로 기존 deployment는 바뀌지 않는다.
5. deployment가 Ready가 된 뒤 공개 앱이 응답하는지 확인한다.

```bash
curl --fail --silent --output /dev/null https://clairkeys.vercel.app/
```

`/api/health`는 선택 변수 `SUPABASE_URL`·`SUPABASE_ANON_KEY`가 없으면 의도적으로 degraded/503을
반환하므로 VM 절체의 단독 성공 판정으로 쓰지 않는다.

6. 브라우저에서 로그인 → 실제 PDF(4MB 이하) 업로드 → 처리 완료 → 악보 첫 재생까지 수행한다.
7. 업로드 직후 화면을 벗어나도 완료되는지 한 번 더 확인한다. 이는 새 VM에서 Vercel
   `/api/omr/finalize`로 나가는 콜백까지 검증한다.
8. VM journal에서 해당 요청이 401/403이 아니라 처리·콜백 완료로 끝나는지 확인한다. Vercel 로그와
   Supabase 행도 대조해 `/api/omr/finalize`가 2xx였고 결과 저장과 `processingStatus=completed`가
   끝났는지 확인한다.

```bash
journalctl -u clairkeys-omr --since '30 minutes ago' --no-pager
```

변환 note 수는 악보마다 다르므로 임의의 고정 숫자로 성공 판정하지 않는다. 성공 기준은 Vercel이 결과를
Supabase Storage에 저장하고 해당 악보가 재생되는 것이다.

## 9. 롤백

새 VM 또는 새 deployment에 문제가 있으면 구 VM을 반환하기 전에 다음 순서로 되돌린다.

1. 새 업로드를 다시 중지한다.
2. 새 VM이 이미 수락한 모든 job의 변환과 완료 callback이 2xx로 끝나고, Supabase 결과 저장과
   `processingStatus=completed`가 확인될 때까지 기다린다. 처리 중 job이 있으면 URL·시크릿을 먼저
   되돌리지 않는다.
3. Vercel의 `OMR_SERVICE_URL`과 `OMR_SHARED_SECRET`을 **둘 다** 구 값으로 복원한다.
4. 새 Production deployment를 만든다.
5. 구 VM의 외부 `/health` 200, 무토큰 `/process` 401, 실제 업로드를 다시 확인한다.
6. 구 VM에서 수락한 rollback 후 job도 callback 2xx와 Supabase 저장까지 확인한다.
7. 새 VM은 원인 분석 동안 중지하지 말고 journal과 이미지 태그를 보존한다.

Vercel의 Instant Rollback은 예전 build의 환경변수를 그대로 사용하므로, 환경변수 절체 장애를 해결하는
수단으로 단독 사용하지 않는다. 어떤 URL·시크릿 쌍이 배포에 들어갔는지 함께 복원해야 한다.

## 10. 안정화와 구 VM 폐기

최소 한 번의 실제 변환과 페이지 이탈 콜백 검증이 끝나고, 관찰 기간 동안 새 오류가 없을 때만 구 VM을
정리한다.

1. 구 VM에 처리 중 job이 없는지 확인한다. 재시작·반환하면 job은 유실된다.
2. 필요한 운영 로그만 비밀값 없이 회수한다. `/data`는 영속 백업으로 취급하지 않는다.
3. 구 VM의 `/etc/clairkeys-omr.env`를 폐기한 뒤 모두의AI 지원 경로로 구 VM 반납을 요청하고 완료를
   확인한다. 작업자가 Public IP·ACG·NACL을 직접 삭제하지 않는다.
4. 반납 완료 뒤 구 PEM의 로컬 사본과 암호화 백업을 안전하게 폐기한다. 새 PEM은 새 VM이 살아 있는
   동안 유지한다.
5. 자격증명 보관소의 운영 인벤토리에 모두의AI 할당 식별자, 사용기한, 접속 주소, PEM 파일 식별자,
   SSH host key fingerprint, 보관 책임자를 기록한다. PEM 내용은 저장소의 validation 문서에 적지 않는다.
6. `docs/recovery/validation/`에 날짜, 새 VM 식별자, 배포 commit, image ID, 비밀값을 제외한 검증
   결과를 기록한다.

## 11. 이후 재배포

VM을 다시 만들지 않고 merged `main`의 OMR 이미지만 갱신할 때는 다음 순서다.

```bash
git -C /opt/clairkeys fetch origin main
git -C /opt/clairkeys-deploy checkout --detach origin/main
cd /opt/clairkeys-deploy/omr-service
DEPLOY_SHA=$(git -C /opt/clairkeys-deploy rev-parse --short HEAD)
podman build -f Dockerfile.audiveris \
  -t "clairkeys-omr:${DEPLOY_SHA}" \
  -t clairkeys-omr:current .
systemctl restart clairkeys-omr || true
systemctl is-active clairkeys-omr
curl --fail --silent http://127.0.0.1:3000/health
```

진행 중 변환이 없을 때 수행한다. restart 직후에는 이슈 #52의 자동 재시도까지 고려해 active·health를
반드시 직접 확인한다.
