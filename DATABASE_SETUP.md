# 클레어키즈 데이터베이스 설정 가이드

## 📋 개요

클레어키즈는 다음 기술을 사용합니다:
- **PostgreSQL** 데이터베이스 (수파베이스를 통해)
- **Prisma** ORM (데이터베이스 관리)
- **NextAuth.js** 사용자 인증

## 🚀 빠른 시작

### 1단계: 수파베이스 프로젝트 생성

1. **수파베이스 계정 만들기**
   - [supabase.com](https://supabase.com)에 접속
   - "Start your project" 클릭
   - GitHub, Google, 또는 이메일로 회원가입

2. **새 프로젝트 생성**
   - 대시보드에서 "New project" 클릭
   - 조직 선택 (개인 계정 사용 가능)
   - 프로젝트 정보 입력:
     - **프로젝트 이름**: `clairkeys` (또는 원하는 이름)
     - **데이터베이스 비밀번호**: 강력한 비밀번호 설정 (꼭 기억해두세요!)
     - **지역**: 가장 가까운 지역 선택 (예: Northeast Asia - Seoul)
   - "Create new project" 클릭
   - 프로젝트 생성 완료까지 1-2분 대기

### 2단계: 데이터베이스 연결 정보 가져오기

1. **상단 "Connect" 버튼 클릭**
   - 프로젝트 대시보드 상단의 **"Connect"** 버튼 클릭

2. **연결 방법 선택**
   - 팝업에서 **"ORMs"** → **"Prisma"** 선택 (가장 추천!)
   - 또는 **"App Frameworks"** → **"Next.js"** 선택

3. **Connection string 복사**
   - 다음과 같은 두 개의 URL이 표시됩니다:
   ```env
   # Connection pooling (앱 실행용)
   DATABASE_URL="postgresql://postgres.프로젝트ID:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
   
   # Direct connection (마이그레이션용)
   DIRECT_URL="postgresql://postgres.프로젝트ID:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
   ```

### 3단계: 환경 변수 설정

1. **환경 파일 생성**
   ```bash
   cp .env.example .env
   ```

2. **`.env` 파일 수정**
   - `[YOUR-PASSWORD]` 부분을 **실제 데이터베이스 비밀번호**로 교체
   - **중요**: 비밀번호에 특수문자가 있다면 URL 인코딩 필요
   
   **특수문자 인코딩 표:**
   - `#` → `%23`
   - `$` → `%24`
   - `%` → `%25`
   - `@` → `%40`
   - `&` → `%26`

   ```env
   # 데이터베이스 - 마이그레이션용 DIRECT_URL 사용
   DATABASE_URL="postgresql://postgres.프로젝트ID:실제비밀번호@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
   
   # NextAuth.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="강력한-랜덤-시크릿-키"
   
   # 수파베이스 설정 (Settings > API에서 복사)
   NEXT_PUBLIC_SUPABASE_URL="https://프로젝트ID.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ로-시작하는-긴-토큰"
   SUPABASE_SERVICE_ROLE_KEY="eyJ로-시작하는-다른-긴-토큰"
   ```

### 4단계: 데이터베이스 마이그레이션 실행

1. **연결 테스트**
   ```bash
   npm run db:test
   ```

2. **마이그레이션 실행**
   ```bash
   npm run db:migrate
   ```

3. **샘플 데이터 추가 (선택사항)**
   ```bash
   npm run db:seed
   ```

## 📊 생성되는 테이블 구조

### 사용자 인증 관련 (NextAuth.js)
- **User**: 사용자 프로필
- **Account**: OAuth 제공자 계정 정보
- **Session**: 사용자 세션
- **VerificationToken**: 이메일 인증 토큰

### 애플리케이션 데이터
- **Category**: 사용자가 만든 악보 분류 폴더
- **SheetMusic**: 업로드된 PDF 파일과 변환된 피아노 애니메이션
- **PracticeSession**: 사용자 연습 기록 및 통계

## 🛠 유용한 명령어들

| 명령어 | 설명 |
|--------|------|
| `npm run db:generate` | Prisma 클라이언트 생성 |
| `npm run db:push` | 스키마 변경사항을 데이터베이스에 적용 |
| `npm run db:migrate` | 데이터베이스 마이그레이션 실행 |
| `npm run db:studio` | Prisma Studio 열기 (데이터베이스 GUI) |
| `npm run db:seed` | 샘플 데이터로 데이터베이스 채우기 |
| `npm run db:test` | 데이터베이스 연결 테스트 |

## ❗ 문제 해결

### 연결 오류
```
Error: P1001: Can't reach database server
```
**해결 방법:**
1. `.env` 파일의 `DATABASE_URL`이 정확한지 확인
2. 수파베이스 프로젝트가 활성 상태인지 확인
3. 데이터베이스 비밀번호가 올바른지 확인

### 포트 번호 오류
```
Error: invalid port number in database URL
```
**해결 방법:**
1. 비밀번호의 특수문자를 URL 인코딩
2. DIRECT_URL (포트 5432) 사용 확인

### 테이블 없음 오류
```
The table `public.User` does not exist
```
**해결 방법:**
```bash
npm run db:migrate
```

## 🔒 보안 주의사항

- ✅ `.env` 파일을 절대 Git에 커밋하지 마세요
- ✅ 강력한 데이터베이스 비밀번호 사용
- ✅ API 키를 정기적으로 교체
- ✅ `service_role` 키는 서버에서만 사용
- ✅ 프로덕션에서는 환경별로 다른 키 사용

## 🎉 설정 완료 확인

모든 설정이 완료되면:
1. `npm run db:test` - 연결 성공
2. `npm run db:studio` - 테이블들이 보임
3. 수파베이스 대시보드에서 테이블 확인 가능

이제 클레어키즈의 데이터베이스가 완전히 준비되었습니다! 🚀