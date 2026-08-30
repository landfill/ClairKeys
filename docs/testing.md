# 테스트

## 실행

```bash
npm test                 # Jest 단위 테스트 전체
npm run test:watch       # 감시 모드
npm run test:coverage    # 커버리지 리포트

npm run test:e2e         # Playwright E2E
npm run test:e2e:ui      # Playwright UI 모드

npm run lint             # ESLint
npx tsc --noEmit         # 타입 검사
```

특정 파일이나 이름만 돌릴 때:

```bash
npm test src/services/__tests__/animationEngine.test.ts
npm test -- --testNamePattern="tempo"
npx playwright test application-smoke.spec.ts
```

## 범위

### 단위 테스트 (Jest)

`src/**/__tests__/`에 컴포넌트·서비스·훅·유틸·API 라우트 테스트가 있다. 커버리지는 스토리와 타입
정의를 제외한 모든 소스 디렉터리에서 수집한다.

변환기 계약 테스트(`src/utils/__tests__/converterCorpus.test.ts`,
`converterTempoContract.test.ts`, `omrRuntimeContract.test.ts`)는 Python 변환기를 실제로
호출한다. `PYTHON_BIN`으로 실행 파일을 지정할 수 있고, 기본값은 `python3`다.

### E2E 테스트 (Playwright)

`e2e/application-smoke.spec.ts` 하나다. 공개 라우트(홈, 뷰포트·확대, 탐색 이동)를 5개
프로젝트에서 검사한다: Desktop Chrome, Desktop Firefox, Desktop Safari, Pixel 5, iPhone 12.

로그인이 필요한 화면은 E2E 범위에 없다. 이전에 있던 대시보드·인증 fixture 스펙은 실제로 통과한
적이 없어 제거됐다([이슈 #7](https://github.com/landfill/ClairKeys/issues/7), PR #12).

### OMR 서비스 테스트

`omr-service/tests/`에 Python 테스트가 있다. 서비스 디렉터리에서 실행한다.

## CI

`.github/workflows/pr-checks.yml`이 PR마다 다음을 실행한다.

| 잡 | 내용 |
|---|---|
| Lint and Type Check | `npm run lint`, `npx tsc --noEmit` |
| Unit Tests | PostgreSQL 서비스 컨테이너 위에서 `npm run test:coverage` |
| E2E Tests | `npm run build` 후 `npm run test:e2e`, 리포트 아티팩트 업로드 |
| Security Scan | `npm audit --audit-level high`, CodeQL |
| Build Check | `prisma generate` + `npm run build` |

`.github/workflows/deploy.yml`은 `main` 병합 후 검증만 수행한다. 실제 배포는 Vercel Git 연동이
담당한다 — 자세한 내용은 [deployment.md](deployment.md).
