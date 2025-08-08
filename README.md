# ClairKeys 🎹

PDF 악보를 시각적 피아노 애니메이션으로 변환하여 피아노 학습을 돕는 현대적인 웹 애플리케이션입니다.

## ✨ 주요 기능

### 🎵 핵심 기능
- **PDF 악보 처리**: 드래그 앤 드롭으로 PDF 악보 업로드 및 자동 분석
- **시각적 피아노 애니메이션**: 88키 풀 피아노 건반과 실시간 애니메이션
- **오디오 재생**: Tone.js 기반 고품질 피아노 사운드 합성
- **인텔리전트 재생 컨트롤**: 재생/일시정지, 속도 조절(0.5x~2.0x), 구간 반복
- **연습 모드**: 단계별 가이드, 템포 연습, 실시간 피드백

### 📱 모바일 최적화
- **전체화면 모드**: Fullscreen API를 활용한 몰입형 연주 환경
- **가로모드 최적화**: 88키 전체를 활용하는 가로 스크롤 인터페이스
- **터치 제스처**: 핀치 줌, 스와이프 네비게이션, 더블탭 리셋
- **모바일 컨트롤**: 전용 컨트롤 패널과 키보드 단축키 지원
- **PWA 지원**: 앱 설치, 오프라인 사용, 푸시 알림

### 👤 사용자 경험
- **소셜 로그인**: Google, GitHub 간편 로그인
- **개인화**: 사용자별 악보 관리 및 카테고리 시스템
- **공유 기능**: 공개 악보 브라우징 및 검색
- **실시간 검색**: 곡명, 작곡가 기반 즉시 검색
- **반응형 디자인**: 모든 디바이스에서 최적화된 UI

### 🔧 고급 기능
- **성능 최적화**: 이미지 최적화, 코드 스플리팅, 캐싱 전략
- **실시간 모니터링**: Web Vitals 측정, 성능 대시보드
- **접근성**: WCAG 2.1 AA 준수, 키보드 네비게이션
- **테스트**: 단위 테스트, E2E 테스트, 자동화된 CI/CD
- **보안**: CSP 헤더, XSS 보호, 안전한 파일 처리

## 🛠️ 기술 스택

### Frontend
- **Next.js 14** - App Router, Server Components
- **React 18** - Hooks, Suspense, Concurrent Features
- **TypeScript** - 타입 안전성 보장
- **Tailwind CSS** - 유틸리티 퍼스트 CSS 프레임워크

### Backend & Database
- **PostgreSQL** - 관계형 데이터베이스
- **Prisma ORM** - 타입 안전한 데이터베이스 액세스
- **Supabase** - 데이터베이스 호스팅 및 스토리지
- **NextAuth.js** - 인증 및 세션 관리

### Audio & Processing
- **Tone.js** - 웹 오디오 합성 및 처리
- **Web Audio API** - 저수준 오디오 제어
- **PDF-parse** - PDF 문서 파싱
- **Canvas API** - 피아노 건반 렌더링

### DevOps & Deployment
- **Vercel** - 서버리스 배포 플랫폼
- **GitHub Actions** - CI/CD 파이프라인
- **Jest & Playwright** - 테스트 프레임워크
- **ESLint & Prettier** - 코드 품질 관리

## 🚀 빠른 시작

### 1. 저장소 복제 및 의존성 설치

```bash
git clone https://github.com/your-username/clairkeys.git
cd clairkeys
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env.local`로 복사하고 필요한 값을 설정:

```bash
cp .env.example .env.local
```

필수 환경 변수:
```env
# Database
DATABASE_URL="postgresql://..."
SUPABASE_URL="https://..."
SUPABASE_ANON_KEY="..."

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_ID="..."
GITHUB_SECRET="..."
```

### 3. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 스키마 동기화
npm run db:push

# (선택사항) Prisma Studio 실행
npm run db:studio
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📁 프로젝트 구조

```
clairkeys/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 인증 그룹 라우트
│   │   ├── api/               # API 라우트
│   │   ├── dashboard/         # 대시보드 페이지
│   │   └── globals.css        # 전역 스타일
│   ├── components/            # React 컴포넌트
│   │   ├── ui/               # 재사용 가능한 UI 컴포넌트
│   │   ├── piano/            # 피아노 관련 컴포넌트
│   │   ├── mobile/           # 모바일 최적화 컴포넌트
│   │   ├── auth/             # 인증 컴포넌트
│   │   ├── upload/           # 파일 업로드 컴포넌트
│   │   └── layout/           # 레이아웃 컴포넌트
│   ├── lib/                  # 라이브러리 및 유틸리티
│   │   ├── services/         # 비즈니스 로직 서비스
│   │   ├── utils/            # 헬퍼 함수
│   │   └── db/               # 데이터베이스 설정
│   ├── hooks/                # 커스텀 React 훅
│   ├── types/                # TypeScript 타입 정의
│   └── styles/               # 스타일 파일
├── public/                   # 정적 파일
├── prisma/                   # 데이터베이스 스키마
├── tests/                    # 테스트 파일
└── docs/                     # 문서
```

## 🎯 사용 방법

### 1. 악보 업로드
1. 대시보드에서 "새 악보 업로드" 버튼 클릭
2. PDF 파일을 드래그 앤 드롭하거나 파일 선택
3. 곡명, 작곡가, 카테고리 정보 입력
4. 업로드 및 처리 완료 대기

### 2. 피아노 연주
- **기본 재생**: 재생 버튼으로 자동 연주 감상
- **따라하기 모드**: 건반 하이라이팅을 보며 연습
- **속도 조절**: 슬라이더로 0.5배~2배속 조절
- **구간 반복**: 특정 구간을 반복하여 연습

### 3. 모바일 연주
- **전체화면 모드**: 전체화면 버튼으로 몰입형 연주
- **가로모드 권장**: 88키 전체를 활용한 최적 연주 환경
- **터치 제스처**: 핀치로 줌, 스와이프로 스크롤
- **키보드 단축키**: Space(재생), F11(전체화면), 화살표(네비게이션)

## 📱 모바일 기능 상세

### 전체화면 피아노 모드
- **Fullscreen API** 활용한 네이티브 전체화면
- **Screen Wake Lock** 지원으로 화면 꺼짐 방지
- **화면 회전 감지** 및 가로모드 유도
- **크로스 브라우저 호환** (Chrome, Safari, Firefox, Edge)

### 터치 제스처
- **스와이프**: 좌우 스와이프로 건반 스크롤
- **핀치 줌**: 두 손가락으로 확대/축소
- **더블탭**: 줌 레벨 리셋
- **롱 프레스**: 상황별 메뉴 표시

### 모바일 컨트롤
- **컴팩트 UI**: 최소한의 화면 점유
- **원터치 컨트롤**: 재생, 볼륨, 속도 조절
- **키보드 단축키**: 외장 키보드 연결 시 단축키 지원
- **햅틱 피드백**: 터치 시 진동 피드백 (지원 기기)

## 🧪 개발 & 테스트

### 개발 명령어

```bash
# 개발 서버
npm run dev              # 개발 서버 실행
npm run build            # 프로덕션 빌드
npm run start            # 빌드된 앱 실행

# 코드 품질
npm run lint             # ESLint 실행
npm run lint:fix         # ESLint 자동 수정
npm run type-check       # TypeScript 타입 체크

# 데이터베이스
npm run db:generate      # Prisma 클라이언트 생성
npm run db:push          # 스키마 푸시 (개발용)
npm run db:migrate       # 마이그레이션 실행
npm run db:studio        # Prisma Studio 실행
npm run db:seed          # 시드 데이터 생성

# 테스트
npm run test             # Jest 단위 테스트
npm run test:watch       # 감시 모드 테스트
npm run test:e2e         # Playwright E2E 테스트
npm run test:coverage    # 커버리지 리포트

# 분석 및 최적화
npm run analyze          # 번들 크기 분석
npm run lighthouse       # 성능 측정
```

### 테스트 전략

1. **단위 테스트**: Jest로 개별 함수 및 컴포넌트 테스트
2. **통합 테스트**: API 엔드포인트 및 서비스 통합 테스트
3. **E2E 테스트**: Playwright로 전체 사용자 플로우 테스트
4. **접근성 테스트**: axe-core 통합으로 자동 접근성 검사
5. **성능 테스트**: Lighthouse CI로 성능 회귀 방지

## 🚢 배포

### Vercel 배포 (권장)

1. **GitHub 연결**
   ```bash
   git push origin main
   ```

2. **Vercel 설정**
   - Vercel 대시보드에서 프로젝트 연결
   - 환경 변수 설정 (Production/Preview)
   - 자동 배포 설정 활성화

3. **환경별 설정**
   - **Production**: `main` 브랜치 자동 배포
   - **Preview**: PR 생성 시 프리뷰 배포
   - **Development**: 로컬 개발 환경

### 성능 최적화 설정

```javascript
// next.config.js
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 2592000, // 30일
  },
  experimental: {
    optimizeCss: true,
  },
  compress: true,
}
```

### CI/CD 파이프라인

```yaml
# .github/workflows/deploy.yml
- Test (Unit + E2E)
- Build
- Security Scan
- Performance Audit
- Deploy to Vercel
- Health Check
```

## 📊 모니터링 & 분석

### 성능 모니터링
- **Real User Monitoring**: Core Web Vitals 실시간 측정
- **성능 대시보드**: LCP, FID, CLS 트렌드 분석
- **알림 시스템**: 성능 저하 시 자동 알림
- **에러 추적**: 런타임 에러 모니터링

### 사용자 분석
- **업로드 통계**: 파일 형식, 크기, 성공률
- **연주 패턴**: 재생 시간, 속도 선호도
- **기기 분석**: 모바일/데스크톱 사용 비율
- **성능 메트릭**: 페이지 로드 시간, 상호작용 지연

## 🤝 기여하기

### 기여 방법

1. **Fork** 저장소
2. **Feature 브랜치** 생성
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **변경사항 커밋**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **브랜치 푸시**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Pull Request** 생성

### 개발 가이드라인

- **코드 스타일**: ESLint + Prettier 설정 준수
- **커밋 메시지**: Conventional Commits 형식 사용
- **테스트**: 새 기능에 대한 테스트 작성 필수
- **타입 안전성**: TypeScript strict 모드 준수
- **성능**: Web Vitals 기준 준수

### 이슈 리포팅

버그 리포트나 기능 요청은 [GitHub Issues](https://github.com/your-username/clairkeys/issues)를 통해 제출해주세요.

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- **Tone.js** - 웹 오디오 합성 라이브러리
- **Next.js** - React 기반 풀스택 프레임워크
- **Vercel** - 배포 및 호스팅 플랫폼
- **Supabase** - 백엔드 서비스 제공

---

**ClairKeys**로 누구나 쉽고 재미있게 피아노를 배울 수 있습니다! 🎹✨