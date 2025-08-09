# 🔍 수파베이스 연결 정보 찾기 - 상세 가이드

## 📍 현재 상황

수파베이스 프로젝트는 만들었지만, 데이터베이스 연결 정보를 어디서 찾아야 할지 모르겠다면 이 가이드를 따라하세요!

## 🎯 1단계: 수파베이스 대시보드 접속

1. **브라우저에서 수파베이스 접속**

   - [https://supabase.com](https://supabase.com) 접속
   - 우측 상단 "Sign in" 클릭하여 로그인

2. **프로젝트 선택**
   - 로그인 후 대시보드에서 생성한 프로젝트 클릭
   - 프로젝트 이름이 `clairkeys` 또는 본인이 설정한 이름

## 🔑 2단계: 데이터베이스 URL 찾기 (새로운 방법!)

### ✨ 새로운 방법: 상단 Connect 버튼 사용

1. **상단 바에서 "Connect" 버튼 클릭**

   - 프로젝트 이름 옆에 있는 **"Connect"** 버튼 클릭

2. **연결 방법 선택**

   - 팝업이 나타나면 **"App Frameworks"** 또는 **"ORMs"** 선택
   - 또는 **"Direct connection"** 선택

3. **Connection string 복사**
   - **"URI"** 또는 **"Connection string"** 섹션 찾기
   - 다음과 같은 형태의 문자열을 복사:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

### 🔄 대안 방법: Project Settings

만약 Connect 버튼이 안 보인다면:

1. **좌측 사이드바 맨 아래 "Project Settings" 클릭** (톱니바퀴 아이콘 ⚙️)
2. **"Database" 탭 선택**
3. **"Connection pooling" 섹션에서 Connection string 찾기**

## 🔐 3단계: API 키 찾기

1. **Settings > API 메뉴로 이동**

   - 좌측 사이드바 Settings ⚙️ > API

2. **Project Configuration 섹션에서 복사**
   - **Project URL**: `https://abcdefghijklmnop.supabase.co`
   - **Project API keys** 섹션에서:
     - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (긴 토큰)
     - **service_role**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (다른 긴 토큰)

## 📝 4단계: .env 파일에 정보 입력

이제 복사한 정보를 `.env` 파일에 입력하세요:

```env
# 데이터베이스 - 복사한 URI를 여기에 붙여넣기
DATABASE_URL="postgresql://postgres:당신의비밀번호@db.abcdefghijklmnop.supabase.co:5432/postgres"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="아무-긴-문자열-입력-예시-abc123def456ghi789"

# 수파베이스 - 복사한 정보들을 여기에 붙여넣기
NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## ⚠️ 주의사항

### DATABASE_URL에서 비밀번호 교체

- URI에서 `[YOUR-PASSWORD]` 부분을 프로젝트 생성 시 설정한 **실제 비밀번호**로 교체하세요
- 예시: `postgresql://postgres:mypassword123@db.abc...`

### 비밀번호를 잊었다면?

1. Settings > Database로 이동
2. "Reset database password" 버튼 클릭
3. 새 비밀번호 설정 후 URI에 반영

## 🧪 5단계: 연결 테스트

설정이 완료되면 연결을 테스트해보세요:

```bash
npm run db:test
```

**성공 시 출력:**

```
🔍 Testing database connection...
✅ Database connection successful!
📊 Found 0 users in database
🎉 Database test completed successfully!
```

**실패 시 출력:**

```
❌ Database connection failed:
Can't reach database server
```

## 🔧 문제 해결

### 자주 발생하는 문제들

#### 1. "Can't reach database server" 오류

**원인**: DATABASE_URL이 잘못됨
**해결**:

- URI를 다시 복사해서 붙여넣기
- 비밀번호 부분이 올바른지 확인
- 특수문자가 있다면 URL 인코딩 필요

#### 2. "Invalid API key" 오류

**원인**: API 키가 잘못됨
**해결**:

- Settings > API에서 키를 다시 복사
- anon key와 service_role key를 바꿔서 입력했는지 확인

#### 3. 프로젝트를 찾을 수 없음

**원인**: 프로젝트가 아직 생성 중이거나 삭제됨
**해결**:

- 수파베이스 대시보드에서 프로젝트 상태 확인
- 프로젝트 생성이 완료될 때까지 대기 (보통 1-2분)

## 📸 스크린샷으로 확인하기

만약 여전히 찾기 어렵다면:

1. **수파베이스 대시보드 스크린샷을 찍어서 공유해주세요**
2. **어떤 메뉴가 보이는지 알려주세요**
3. **오류 메시지가 있다면 정확히 복사해서 알려주세요**

## ✅ 체크리스트

설정 완료 전에 다음을 확인하세요:

- [ ] 수파베이스 프로젝트가 "Active" 상태
- [ ] DATABASE_URL에 실제 비밀번호 입력됨
- [ ] PROJECT_URL이 https://로 시작함
- [ ] API 키들이 eyJ로 시작하는 긴 문자열
- [ ] .env 파일이 프로젝트 루트에 위치
- [ ] `npm run db:test` 명령어가 성공

이 가이드를 따라해도 문제가 있다면, 구체적으로 어떤 단계에서 막히는지 알려주세요! 🙋‍♂️

##

🆕 수파베이스 UI 업데이트 안내

**중요**: 수파베이스가 최근 UI를 업데이트했습니다! 이제 Connection string을 찾는 방법이 바뀌었어요.

### 📍 현재 상황에 맞는 해결책

당신이 본 메시지: "Connection string has moved. You can find Project connect details by clicking 'Connect' in the top bar"

**이것은 정상입니다!** 다음 단계를 따라하세요:

### 🎯 단계별 해결 방법

1. **상단 "Connect" 버튼 클릭**

   - 프로젝트 대시보드 상단에 있는 **"Connect"** 버튼을 클릭하세요
   - 프로젝트 이름 옆에 있을 것입니다

2. **연결 옵션 선택**

   - 팝업 창이 나타나면 다음 중 하나를 선택:
     - **"App Frameworks"** → **"Next.js"**
     - **"ORMs"** → **"Prisma"**
     - **"Direct connection"**

3. **Connection string 복사**
   - 선택한 옵션에서 **Database URL** 또는 **Connection string** 찾기
   - 복사 버튼으로 복사

### 💡 예상되는 화면

Connect 버튼을 클릭하면 다음과 같은 옵션들이 보일 것입니다:

- 🔗 **Direct connection**
- 📱 **App Frameworks** (Next.js, React, Vue 등)
- 🗄️ **ORMs** (Prisma, Drizzle 등)
- 🛠️ **Other tools**

**Prisma를 사용하므로 "ORMs" → "Prisma"를 선택하는 것이 가장 좋습니다!**

### 🔍 만약 여전히 안 보인다면

1. **브라우저 새로고침** (F5)
2. **다른 브라우저에서 시도**
3. **수파베이스에서 로그아웃 후 다시 로그인**

### 📞 추가 도움이 필요하다면

현재 화면에서 보이는 것들을 알려주세요:

- 상단에 어떤 버튼들이 있는지
- 좌측 사이드바에 어떤 메뉴들이 있는지
- Connect 버튼을 클릭했을 때 어떤 옵션들이 나타나는지

## 🚨 Connect 버튼 클릭 후 옵션이 다를 때

### 📋 Connect 팝업에서 보이는 실제 옵션들

Connect 버튼을 클릭했을 때 다음과 같은 옵션들이 보일 수 있습니다:

#### 옵션 1: 카테고리별 분류

- **Database**
- **Auth**
- **Storage**
- **Edge Functions**
- **Realtime**

#### 옵션 2: 연결 방법별 분류

- **Connect to your database**
- **Use connection pooling**
- **Connect via API**

#### 옵션 3: 간단한 탭 형태

- **Database**
- **Connection pooling**
- **Connection string**

### 🎯 어떤 옵션이 보이든 해결 방법

**1단계**: Connect 팝업에서 **"Database"** 관련 옵션 클릭

**2단계**: 다음 중 하나를 찾아서 클릭:

- **"Connection string"**
- **"Direct connection"**
- **"Database URL"**
- **"PostgreSQL"**

**3단계**: Connection string 복사

- `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres` 형태의 문자열 복사

### 🔍 만약 여전히 안 보인다면

**대안 방법**: SQL Editor 사용

1. 좌측 사이드바에서 **"SQL Editor"** 클릭
2. 상단에 **"Connect"** 또는 **"Connection"** 버튼이 있는지 확인
3. 또는 SQL Editor 화면에서 connection 정보가 표시되는지 확인

### 💬 현재 상황 공유해주세요

Connect 버튼을 클릭했을 때 **정확히 어떤 옵션들이 보이는지** 알려주세요:

- 옵션 1: ****\_\_\_****
- 옵션 2: ****\_\_\_****
- 옵션 3: ****\_\_\_****

그러면 정확한 단계를 안내해드릴게요!
