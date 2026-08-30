# 보안

## 자격증명 배치

각 구성 요소가 가진 키와, 그 키로 다른 시스템에 접근할 수 있는 범위다.

| 구성 요소 | 가진 키 | 그 키로 접근 가능한 것 |
|---|---|---|
| Next.js 앱 (Vercel) | `SUPABASE_SERVICE_ROLE_KEY`, `OMR_SHARED_SECRET` | Supabase 전체 읽기·쓰기, OMR 서비스 호출 |
| OMR 서비스 (VM) | `OMR_SHARED_SECRET` | 없음 |
| Supabase | — | — |

두 서비스가 같은 `OMR_SHARED_SECRET`을 갖지만 쓰임이 다르다. Vercel은 이 값을 **제시**해 OMR
서비스를 호출하고, OMR 서비스는 들어온 요청을 **검증**하는 데만 쓴다. 그것으로 나가서 접근할 수
있는 시스템은 없다. 반면 `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회해 프로젝트 전체를 읽고 쓴다.

그래서 공인 IP를 가진 VM이 침해되어도 잃는 것은 "이 변환 서비스를 호출할 권한"까지이고, Supabase
데이터가 아니다(**D-011**). 변환 결과 저장은 그 키를 이미 가진 Vercel이 한다.

`OMR_SHARED_SECRET`은 `ENVIRONMENT=development` 외에서 필수다. 설정되지 않으면 서비스는 인증 없이
동작하는 대신 모든 요청을 503으로 거절한다. `/health`와 `GET /`는 열려 있으며, 서비스 이름·버전·
`running` 상태만 반환한다.

## 알려진 간극

### 비공개 악보의 URL 은닉 의존

`animation-data` 버킷은 공개 버킷이다. 비공개 악보(`isPublic: false`)의 객체도 같은 버킷에 있으므로,
URL을 아는 사람은 자격증명 없이 파일을 받을 수 있다.

운영 확인:

```
curl -s https://clairkeys.vercel.app/api/sheet/28
  -> 200, provenance=omr, animationDataUrl=.../storage/v1/object/public/animation-data/...
curl -sI <그 URL>  -> 200 application/json
curl -s https://clairkeys.vercel.app/api/files/animation?sheetMusicId=2
  -> 401 {"error":"Unauthorized"}
```

API 계층은 비공개 악보에 `Access denied`를 반환하지만, Storage 계층은 그 판정을 알지 못한다.
근거는 `docs/recovery/phases/DS-0-current-state-baseline.md`.

### OMR 서비스 노출 방식

현재 테스트 단계에 한해 평문 HTTP로 노출돼 있다. 종료 조건은 `docs/recovery/DECISIONS.md`의
**D-012**에 있다.

## 인증 경계

로그인이 필요한 경로는 `src/lib/routeAccess.ts`의 `PROTECTED_PATHS` 한 곳에서 정한다:
`/library`, `/upload`, `/profile`, `/admin`. 판정은 세그먼트 경계 기준이라 `/uploads` 같은 이름이
잘못 걸리지 않는다. `src/middleware.ts`가 이 판정을 NextAuth 미들웨어에 연결한다.

`/sheet/[id]`는 의도적으로 로그인 없이 열린다. 로그인 전 방문자가 실제 학습 화면을 한 번
체험할 수 있게 하기 위해서다(DS-6).

관리자 화면·API는 `ADMIN_EMAILS`에 포함된 이메일만 접근할 수 있다. 값이 비어 있으면 관리자는
아무도 없다.

## CI 보안 검사

PR마다 `npm audit --audit-level high`와 CodeQL 분석이 실행된다
(`.github/workflows/pr-checks.yml`).
