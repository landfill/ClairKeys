# 배포

세 곳을 각각 배포한다. 서로 다른 수명주기를 가지므로 한 번에 배포되지 않는다.

| 대상 | 배포 방식 | 트리거 |
|---|---|---|
| Next.js 앱 | Vercel Git 연동 | `main` push(프로덕션), PR(프리뷰) |
| OMR 서비스 | VM에서 podman 이미지 교체 + systemd 재시작 | 수동 |
| Supabase | 관리형 | 스키마 변경 시 Prisma |

## Next.js 앱 (Vercel)

배포는 Vercel Git 연동이 단독으로 수행한다. GitHub Actions는 배포하지 않는다 —
`.github/workflows/deploy.yml`은 `main` 병합 후 테스트만 돌린다. 이 워크플로에 있던 배포·마이그레이션·
헬스체크 잡은 저장소에 시크릿이 없어 한 번도 성공한 적이 없었고, 병합이 실제로 배포된 것처럼
읽히기 때문에 제거됐다(이슈 #28).

빌드 설정은 `vercel.json`에 있다.

- `installCommand`: `npm install --legacy-peer-deps`
- `buildCommand`: `npm run build` (`prisma generate` 포함)
- 리전: `iad1`
- API 함수 `maxDuration`: 기본 30초

보안 헤더(`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`)와
정적 자산 캐시 정책도 같은 파일에서 정한다.

환경변수는 Vercel 대시보드에서 Production/Preview 각각 설정한다. 목록은
[environment.md](environment.md).

## 데이터베이스 (Supabase + Prisma)

```bash
npm run db:migrate    # 마이그레이션 생성·적용
npm run db:push       # 개발용 즉시 반영
```

프로덕션 스키마 변경은 마이그레이션을 쓴다. `db:push`는 마이그레이션 이력을 남기지 않는다.

Storage 버킷(`animation-data`)은 `npm run init-storage`로 만든다. 정합성 점검은
`npm run check-data-status`.

## OMR 서비스 (NAVER Cloud VM)

새 VM 생성부터 Vercel 절체·롤백·구 VM 폐기까지는
[VM 교체 가이드](vm-replacement.md)를 따른다. 기존 VM에 merged `main` 이미지를 다시 배포하는 세부
명령과 systemd unit 설명은 [omr-service/deploy/README.md](../omr-service/deploy/README.md)에 있다.
아래는 구조 요약이다.

```
Vercel ──HTTP──> VM :3000 ──> 컨테이너 :8000
```

- 검증 기준은 Rocky Linux 8.8 x86_64, 2 vCPU, 15GiB RAM, podman 4.4.1, systemd unit
  `clairkeys-omr.service`다.
- 포트 3000을 쓴다. 8000은 클라우드 ACG에서 열려 있지 않고, 80/443은 나중에 TLS를 앞단에 붙일 때
  컨테이너를 건드리지 않도록 비워 둔다.
- 시크릿은 unit 파일이 아니라 `/etc/clairkeys-omr.env`(권한 600)에 둔다. `podman generate systemd --new`가
  만든 unit은 644라서 `-e`로 넘기면 모든 로컬 사용자에게 노출된다.
- 이 호스트에는 Supabase 자격증명을 두지 않는다(**D-011**).
- 현재 TLS 없이 평문 HTTP로 노출돼 있다. 이를 받아들인 근거와 종료 조건은
  `docs/recovery/DECISIONS.md`의 **D-012**에 있다.

이미지 빌드:

```bash
podman build -f omr-service/Dockerfile.audiveris -t clairkeys-omr:current omr-service/
```

`Dockerfile.audiveris`는 Tesseract 영어 모델을 legacy+LSTM 통합본으로 교체한다. 이 교체를 빼면
OCR이 한 글자도 읽지 못한다 — 근거는 [limitations.md](limitations.md).
