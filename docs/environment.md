# 환경변수

`.env.example` 파일은 저장소에 없다. 아래 표를 보고 프로젝트 루트에 `.env`를 직접 만든다.

## Next.js 앱 (로컬 개발 · Vercel)

Vercel Production에 실제로 등록할 값, 환경별 적용 범위, VM 교체 때 함께 바꿔야 하는 값은
[OMR VM 교체 가이드](vm-replacement.md#7-vercel에-등록할-환경변수)에 있다. 환경변수를 바꾼 뒤에는
기존 deployment에 소급되지 않으므로 새 deployment가 필요하다.

### 필수

| 변수 | 용도 | 얻는 곳 |
|---|---|---|
| `DATABASE_URL` | Prisma가 연결할 PostgreSQL | Supabase 프로젝트 설정 → Database → Connection string |
| `NEXTAUTH_URL` | NextAuth 콜백 기준 주소 | 로컬은 `http://localhost:3000` |
| `NEXTAUTH_SECRET` | 세션 JWT 서명 키 | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth | Google Cloud Console → OAuth 클라이언트 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth | GitHub → Developer settings → OAuth Apps |
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저에서 쓰는 Supabase 주소 | Supabase 프로젝트 설정 → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저용 공개 키 | 같은 곳 |
| `SUPABASE_SERVICE_ROLE_KEY` | 변환 결과 저장(RLS 우회). **서버에만 둔다** | 같은 곳 |

`NEXT_PUBLIC_` 접두사가 붙은 값은 브라우저 번들에 그대로 들어간다. 비밀 값에는 절대 붙이지 않는다.

### PDF 업로드에 필요

| 변수 | 용도 |
|---|---|
| `OMR_SERVICE_URL` | OMR 서비스 주소. 형식이 잘못되면 업로드를 행 생성 전에 거절한다 |
| `OMR_SHARED_SECRET` | OMR 서비스 호출 시 `X-ClairKeys-Token` 헤더로 보내는 값 |

이 둘이 없으면 업로드만 막히고 나머지 화면은 정상 동작한다.

### 선택

| 변수 | 용도 | 기본값 |
|---|---|---|
| `ADMIN_EMAILS` | 관리자 화면·API 접근을 허용할 이메일 목록(쉼표 구분) | 비어 있음(관리자 없음) |
| `NEXT_PUBLIC_BASE_URL` | 서버 측에서 절대 URL을 만들 때의 기준 | `http://localhost:3000` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | `/api/health`의 Supabase 연결 점검에만 쓴다 | 미설정 시 해당 점검을 건너뛴다 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 푸시 알림 구독 키 | 해당 컴포넌트가 마운트되지 않아 현재 무효 |
| `PYTHON_BIN` | 변환기 계약 테스트가 호출할 Python 실행 파일 | `python3` |

## OMR 서비스

`omr-service/`에서 별도로 설정한다. 자세한 내용은 [omr-service/README.md](../omr-service/README.md).

| 변수 | 용도 |
|---|---|
| `ENVIRONMENT` | `development`이면 공유 시크릿 없이 실행된다 |
| `OMR_SHARED_SECRET` | `development` 외에서는 필수. 미설정이면 모든 요청을 503으로 거절한다 |
| `AUDIVERIS_EXECUTABLE` | Audiveris 실행 파일 경로 재정의 |

**OMR 서비스에는 Supabase 자격증명을 두지 않는다.** 변환 결과는 호출자에게 돌려주고, 저장은
`SUPABASE_SERVICE_ROLE_KEY`를 가진 Vercel 쪽이 한다(**D-011**). 근거는 [security.md](security.md).
