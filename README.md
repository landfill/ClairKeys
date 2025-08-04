# Clairkeys

PDF 악보를 시각적 피아노 애니메이션으로 변환하여 피아노 학습을 돕는 웹 애플리케이션입니다.

## 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **Audio**: Tone.js
- **PDF Processing**: pdf-parse
- **Deployment**: Vercel (권장)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 `.env.local`로 복사하고 필요한 값들을 설정하세요:

```bash
cp .env.example .env.local
```

### 3. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션 (개발 환경)
npm run db:push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

## 주요 기능

- 📄 PDF 악보 업로드 및 처리
- 🎹 시각적 피아노 건반 애니메이션
- 🎵 오디오 재생 및 동기화
- ⚡ 속도 조절 및 학습 모드
- 👤 사용자 인증 및 개인화
- 📱 반응형 디자인 (모바일/데스크톱)

## 프로젝트 구조

```
src/
├── app/                 # Next.js App Router
├── components/          # React 컴포넌트
│   ├── ui/             # 기본 UI 컴포넌트
│   ├── piano/          # 피아노 관련 컴포넌트
│   ├── auth/           # 인증 관련 컴포넌트
│   └── layout/         # 레이아웃 컴포넌트
├── lib/                # 유틸리티 및 설정
│   ├── auth/           # NextAuth.js 설정
│   ├── db/             # 데이터베이스 설정
│   ├── utils/          # 유틸리티 함수
│   └── audio/          # 오디오 처리
└── types/              # TypeScript 타입 정의
```

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 린팅
npm run lint

# 데이터베이스 관련
npm run db:generate     # Prisma 클라이언트 생성
npm run db:push         # 스키마를 데이터베이스에 푸시
npm run db:migrate      # 마이그레이션 생성 및 실행
npm run db:studio       # Prisma Studio 실행
```

## 배포

이 프로젝트는 Vercel에 배포하도록 최적화되어 있습니다:

1. GitHub에 코드를 푸시
2. Vercel에서 프로젝트 연결
3. 환경 변수 설정
4. 자동 배포

## 라이선스

MIT License