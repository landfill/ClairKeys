# ClairKeys Agent Operating Contract

이 파일은 ClairKeys에서 작업하는 모든 코드 에이전트(세션·머신·에이전트 종류를 가리지 않는다)의 공통 진입점이다.

## 핵심 원칙 — 맥락은 저장소 안에만 남긴다

에이전트의 개인 메모리(예: Claude Code의 `~/.claude/.../memory/`)는 세션·머신·에이전트 종류가 달라지면 접근할 수 없다. 이 프로젝트에 관한 진행 상태·결정·다음 할 일·막힌 지점은 전부 저장소 안 파일(`docs/recovery/`)에 기록하고, 개인 메모리에는 의존하지 않는다. 하위 에이전트(subagent)를 띄운 경우에도 그 결과와 결정은 이 규약대로 `docs/recovery/`에 회수하며, 하위 에이전트의 개인 메모리에만 남기지 않는다.

새 세션은 코드 수정 전에 반드시 다음을 순서대로 수행한다.

0. **원격 동기화** — 문서를 읽기 전에 저장소부터 최신으로 만든다. `git fetch origin` 후 로컬 `main`이 `origin/main`보다 뒤처져 있으면(`git rev-list --count main..origin/main`이 0이 아니면) 동기화한다: 현재 `main`에 있다면 `git pull --ff-only`, 다른 브랜치(예: 재개한 작업 브랜치)에 있다면 `main`을 체크아웃하지 않고 `git fetch origin main:main`으로 바로 fast-forward한다. 다른 머신·다른 에이전트(클라우드 세션 포함)가 병합한 결과가 원격에만 있을 수 있다 — 낡은 클론에서 읽은 HANDOFF는 낡은 진실이고, 낡은 base에서 딴 브랜치는 불필요한 충돌을 만든다.
1. `docs/recovery/README.md`
2. `docs/recovery/HANDOFF.md`
3. 현재 작업 단계 문서
4. `docs/recovery/WORKFLOW.md`
5. `docs/recovery/BASELINE.md`
6. `docs/recovery/LORE_COMMIT_PROTOCOL.md`

## 절대 규칙

- `master` 또는 `main`에 직접 커밋하지 않는다. 단, 아래 "핸드오프 문서는 즉시 `main` 커밋" 절에 정의된 문서는 예외로, PR·리뷰 없이 바로 `main`에 커밋·푸시한다.
- 모든 작업은 `codex/<phase>-<topic>` 형식의 별도 브랜치에서 수행한다. (역시 핸드오프 문서 예외 적용)
- 기존 미커밋 변경은 사용자 소유로 간주하고 되돌리거나 함께 커밋하지 않는다.
- 한 PR에는 하나의 단계 또는 하나의 명확한 목적만 포함한다.
- PR은 생성 시점부터 리뷰 가능한 상태여야 한다. Draft PR은 생성하지 않으며, 실수로 Draft가 생성되면 즉시 ready for review로 전환한다.
- 동작 변경 전 회귀 테스트 또는 재현 fixture를 먼저 추가한다.
- 구현 완료 주장은 검증 명령과 결과가 기록된 경우에만 한다.
- 구현이 스펙·phase 문서와 달라야 할 이유가 생기면 코드부터 고치지 않는다. 관련 phase 문서와 `docs/recovery/DECISIONS.md`를 먼저 갱신해 이유를 기록한 뒤 구현한다. 임의 이탈은 다음 세션에게 "문서와 코드 중 뭐가 맞나"라는 혼란을 남긴다.
- 커밋은 `docs/recovery/LORE_COMMIT_PROTOCOL.md`에 정의된 Lore Commit Protocol을 따른다. 커밋 메시지에 에이전트 서명이나 세션 트레일러(`Co-Authored-By:`, `Claude-Session:` 등)를 넣지 않는다 — Lore 형식이 정의한 trailer key만 사용한다.
- PR 생성 후 CI와 리뷰 피드백을 확인하고, 수정·검증·커밋·푸시를 반복한다.
- `main` 병합은 대상 PR에 대한 사용자의 명시적 승인 후에만 수행한다. 리뷰 준비 완료, 승인 리뷰, 초록 CI 또는 과거의 포괄적 지시는 병합 승인으로 간주하지 않는다.
- 병합 승인을 받으면 현재 CI와 리뷰 상태를 다시 확인하고 PR을 병합한 뒤, `main` 반영을 검증하고 원격·로컬 작업 브랜치를 정리한다.
- 정규 HANDOFF와 검증·리뷰 기록은 모두 이 프로젝트 경로 안에 저장한다. 채팅, `/tmp`, 홈 디렉터리, 에이전트 개인 메모리 또는 외부 노트만으로 인계를 대신하지 않는다.
- HANDOFF와 검증 기록은 세션 종료를 기다리지 않고, 작업 단위(커밋·PR·이슈 처리 등)가 끝날 때마다 즉시 갱신한다. 기록하는 날짜는 항상 실제 절대 날짜(YYYY-MM-DD)로 쓰고, "어제"·"다음에" 같은 상대 표현은 쓰지 않는다 — 다음 세션이 오독한다.

## 핸드오프 문서는 즉시 `main` 커밋

다음 문서는 사실을 기록할 뿐 코드나 규약을 바꾸지 않는 **상태 기록**이다. 브랜치·PR·리뷰·병합 승인 절차 없이 `main`에 바로 커밋·푸시한다:

- `docs/recovery/HANDOFF.md`
- `docs/recovery/phases/*.md`의 `Status`·`Progress` 갱신
- `docs/recovery/validation/*.md` (신규 검증 기록)
- `docs/recovery/reviews/*.md` (PR 리뷰 로그)
- `docs/recovery/ROADMAP.md`의 상태(`상태` 칼럼) 갱신
- `docs/recovery/DECISIONS.md`의 신규 결정 항목

다음은 예외가 아니다 — 여전히 브랜치·PR·리뷰·명시적 병합 승인 절차를 따른다:

- 애플리케이션 코드 전체
- 규약·프로토콜 자체를 바꾸는 문서: `AGENTS.md`, `docs/recovery/WORKFLOW.md`, `docs/recovery/LORE_COMMIT_PROTOCOL.md`, `docs/recovery/BASELINE.md`, `docs/recovery/README.md`
- 계획 자체를 바꾸는 것: `docs/recovery/ROADMAP.md`의 단계 구성·선행조건 변경, `docs/recovery/phases/*.md`의 `Objective`·`Work stages`·`Completion criteria` 변경

구분 기준: 상태 기록은 검토가 아니라 사실 확인의 문제이고, 이걸 PR로 돌리면 "PR이 자신의 병합 사실을 기록하는 PR을 또 만드는" 자기참조 루프가 생긴다. 코드와 규약·계획은 실제 판단이 필요하므로 리뷰·승인의 가치가 있다.

주의: 이 예외는 검증 기록의 오류를 리뷰가 잡아줄 기회도 함께 없앤다 — 실제로 이 저장소에서 PR 리뷰가 검증 기록의 잘못된 명령어·모호한 커밋 해시를 잡아낸 적이 있다. 즉시 커밋하기 전에 스스로 한 번 더 확인한다.

## 단계별 전달·병합 수명주기

각 작업 단계는 아래 순서를 끝까지 따른다.

1. 최신 `main`에서 `codex/<phase>-<topic>` 작업 브랜치를 만든다.
2. 회귀 근거를 먼저 준비하고, 하나의 결정 단위로 Lore 커밋한다.
3. 단계 범위가 검증되면 Draft가 아닌 review-ready PR을 생성한다.
4. PR 번호가 생기면 즉시 `docs/recovery/HANDOFF.md`와 `docs/recovery/reviews/PR-<number>.md`에 기록한다 — 이건 핸드오프 문서이므로 PR 브랜치가 아니라 `main`에 바로 커밋한다. CI·리뷰 수정마다 `docs/recovery/reviews/PR-<number>.md`를 같은 방식으로 갱신한다.
5. 모든 필수 체크와 actionable review를 처리한 뒤에도 사용자의 명시적 병합 승인을 기다린다.
6. 승인을 받으면 PR을 병합하고 `main`의 반영 커밋·체크를 확인한다.
7. 원격 ref를 fetch한 뒤 최신 `main`에 로컬·원격 작업 브랜치 tip이 모두 포함됐는지 확인한다. 사용자 소유 미커밋 변경이나 어느 tip에든 고유 커밋이 있으면 어떤 브랜치도 삭제하지 않고 HANDOFF에 blocker로 기록한다. 두 tip이 모두 병합된 경우에만 원격 작업 브랜치를 삭제하고, 로컬에서 `main`으로 이동한 뒤 로컬 작업 브랜치도 삭제한다.
8. 병합 결과와 다음 단계를 HANDOFF·phase·validation·review 기록에 `main`에 직접 커밋으로 남긴다 — 이 기록을 위해 별도 PR을 만들지 않는다. 다음 단계 코드 작업이 필요하면 그때 새 브랜치를 만든다.

HANDOFF의 canonical entrypoint는 `docs/recovery/HANDOFF.md`다. 세부 근거는 `docs/recovery/phases/`, `docs/recovery/validation/`, `docs/recovery/reviews/`, `docs/recovery/DECISIONS.md`에 둔다. PR이 병합되면 stale해질 `OPEN`, `READY_FOR_REVIEW`, 작업 브랜치 같은 transient 상태는 durable HANDOFF에 고정하지 않고 PR review log와 GitHub live state로 확인한다.

## 세션 시작 체크리스트

1. `git fetch origin` 후 로컬 `main`이 뒤처져 있으면 동기화한다: `main`에 있다면 `git pull --ff-only`, 다른 브랜치에 있다면 `git fetch origin main:main`.
2. `git branch --show-current`와 `git status --short`를 확인한다.
3. 기본 브랜치라면 코드를 수정하기 전에 작업 브랜치를 만든다.
4. `docs/recovery/HANDOFF.md`에서 `Current phase`, `Next action`, `Known blockers`를 확인한다.
5. 현재 단계 문서의 진입 조건과 완료 조건을 확인한다.
6. 작업 계획을 세우고 범위를 벗어나는 문제는 새 단계 후보로 기록한다.

## 세션 종료 체크리스트

1. 단계별 필수 검증을 실행한다.
2. 결과를 `docs/recovery/validation/`에 기록한다 — `main`에 직접 커밋한다.
3. `docs/recovery/HANDOFF.md`를 실제 현재 상태로 갱신한다 — `main`에 직접 커밋한다.
4. 결정이 바뀌었다면 `docs/recovery/DECISIONS.md`에 추가한다 — `main`에 직접 커밋한다.
5. 코드 변경이 있다면 관련 파일만 선별해 작업 브랜치에 커밋한다.
6. PR이 있다면 `docs/recovery/reviews/PR-<number>.md`를 갱신한다 — `main`에 직접 커밋한다.
7. PR은 Draft가 아닌 review-ready 상태인지 확인한다.
8. 병합을 수행했다면 `main` 반영과 원격·로컬 작업 브랜치 정리를 확인한다.
9. HANDOFF와 모든 인계 근거가 프로젝트 경로 안에 존재하는지 확인한다.

## 금지되는 완료 상태

- 빌드가 타입 검사 또는 린트를 생략했는데 전체 검증 성공으로 기록하는 것
- 테스트 실패를 설명 없이 기존 실패로 간주하는 것
- 인메모리 큐를 영속 큐로 표현하는 것
- 데모 멜로디 생성을 실제 악보 변환으로 표현하는 것
- 리뷰 코멘트나 실패한 CI가 남은 상태를 완료로 표시하는 것

## Project Reference

이 섹션은 예전 `CLAUDE.md`에 있던 프로젝트 참조 정보를 옮긴 것이다. 작업 규약이 아니라 코드베이스에 대한 설명이므로, 위 규약 섹션들과 달리 코드가 바뀌면 낡아질 수 있다 — 불확실하면 실제 코드를 우선한다.

### Project Overview

ClairKeys is an AI-powered piano learning application that converts PDF sheet music into interactive piano animations. The app features real-time piano visualization, audio playback with Tone.js, and mobile-optimized touch interfaces.

### Core Commands

#### Development
```bash
npm run dev              # Start development server on localhost:3000
npm run build            # Build for production (includes Prisma generate)
npm run start            # Start production server
npm run lint             # Run ESLint
npm test                 # Run Jest unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate test coverage report
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run E2E tests with UI
```

#### Database & Storage
```bash
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes to database (development)
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Prisma Studio
npm run seed             # Populate database with sample data
npm run init-storage     # Initialize Supabase storage buckets
npm run check-data-status # Verify database and storage integrity
```

#### Testing Single Components
```bash
# Run specific test file
npm test -- --testNamePattern="ComponentName"
npm test src/components/ui/__tests__/Button.test.tsx

# Run tests for specific directory
npm test src/services/__tests__/

# Run E2E test for specific workflow
npx playwright test application-smoke.spec.ts
```

### Architecture Overview

#### Core Technology Stack
- **Next.js 15** with App Router - Full-stack React framework
- **PostgreSQL + Prisma ORM** - Database layer with type-safe queries
- **Supabase** - Database hosting and file storage for animation data
- **NextAuth.js** - Authentication with Google/GitHub OAuth
- **Tone.js + Web Audio API** - Piano sound synthesis
- **Tailwind CSS** - Utility-first styling

#### Key Data Flow

The application follows this core data pipeline:

1. **PDF Upload** → `src/app/upload/page.tsx`
2. **OMR Processing** → `omr-service/` (Python Flask service)
3. **Animation Generation** → Converts MusicXML to ClairKeys JSON format
4. **Storage** → Animation data stored in Supabase Storage buckets
5. **Playback** → `src/services/animationEngine.ts` coordinates audio and visual

#### Database Schema

The main entities and their relationships:

- **User** - OAuth users (Google/GitHub)
- **Category** - User-created sheet music categories
- **SheetMusic** - Core entity with `animationDataUrl` pointing to Supabase Storage
- **PracticeSession** - User practice tracking and statistics
- **ProcessingJob** - Background processing queue for PDF conversion

#### Authentication Architecture

Using JWT-based sessions with manual user ID handling:
- `src/lib/auth/config.ts` - NextAuth configuration with custom callbacks
- Database user records are manually synchronized during OAuth flow
- Custom callbacks ensure consistent user IDs between JWT and database

### Component Architecture

#### Layout Components (`src/components/layout/`)
- `MainLayout.tsx` - Root layout with Header/Footer
- `Header.tsx` - Navigation with authentication state
- `Container.tsx` - Responsive content wrapper

#### Piano Components (`src/components/piano/`)
- `PianoKeyboard.tsx` - Core 88-key piano visualization
- `EnhancedPianoKeyboard.tsx` - Version with advanced features
- `SimplePianoKeyboard.tsx` - Minimal version for testing

#### Mobile-Optimized (`src/components/mobile/`)
- `FullScreenPiano.tsx` - Fullscreen API integration for mobile
- `LandscapePianoInterface.tsx` - Landscape mode optimization
- `MobileGestures.tsx` - Touch gesture handling (pinch, swipe)
- `MobileTouchOptimizer.tsx` - Performance optimization for touch

#### Animation & Playback (`src/components/`)
- `animation/AnimationPlayer.tsx` - Core animation engine wrapper
- `playback/PlaybackControls.tsx` - Play/pause/speed/loop controls
- `practice/PracticeGuideControls.tsx` - Practice mode features

#### Upload System (`src/components/upload/`)
- `FileUpload.tsx` - PDF drag-and-drop interface
- `OMRUploadForm.tsx` - Form for OMR service integration
- `ProcessingStatus.tsx` - Real-time upload progress tracking

### Key Services

#### Animation Engine (`src/services/animationEngine.ts`)
Core service that orchestrates:
- Time-based animation playback at 60fps
- Audio-visual synchronization with Tone.js
- Practice mode with step-by-step guidance
- Loop sections and tempo control

#### Audio Service (`src/services/audioService.ts`)
- Tone.js integration for piano sound synthesis
- Note triggering with velocity and duration
- Audio context management for mobile compatibility

#### File Storage (`src/services/fileStorageService.ts`)
- Supabase Storage integration for animation JSON files
- Signed URL generation for private files
- File upload/download with error handling

#### Background Processing (`src/services/backgroundProcessor.ts`)
- Queue system for PDF processing
- Integration with Python OMR service
- Status tracking and error handling

### Mobile Features

#### PWA Configuration
- Service worker at `/public/sw.js`
- Manifest in `/public/manifest.json`
- Apple-specific meta tags in `src/app/layout.tsx`

#### Mobile Optimization Hooks
- `useMobileGestures.ts` - Touch gesture recognition
- `useFullScreenAPI.ts` - Fullscreen mode management
- `useMobileKeyboardSize.ts` - Dynamic piano sizing

#### Cross-Platform Considerations
- Fullscreen API implementation works across Chrome, Safari, Firefox
- Touch events optimized for iOS and Android
- Audio context initialization requires user gesture on mobile

### OMR Service Integration

#### External Python Service (`omr-service/`)
- Standalone Flask API for PDF → MusicXML → ClairKeys JSON
- Deployed on Fly.io with Docker containerization
- Uses Audiveris for optical music recognition
- Asynchronous processing with job status tracking

#### Integration Points
- `src/app/api/omr/upload/route.ts` - Proxy to OMR service
- `src/app/api/omr/status/[jobId]/route.ts` - Job status polling
- Processing status stored in `ProcessingJob` database table

### Testing Strategy

#### Unit Tests (Jest)
- Components: `src/components/**/__tests__/`
- Services: `src/services/__tests__/`
- Hooks: `src/hooks/__tests__/`
- Utils: `src/utils/__tests__/`

#### E2E Tests (Playwright)
- `e2e/application-smoke.spec.ts` - Public-route cross-browser smoke checks (home page, viewport/zoom, explore navigation); replaces the earlier dashboard/auth-fixture specs that PR #12 removed as aspirational (issue #7)

#### Coverage Configuration
Jest configured to collect coverage from all source directories except stories and type definitions.

### Environment Configuration

#### Required Environment Variables
```env
# Database
DATABASE_URL=postgresql://...

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Common Development Patterns

#### API Route Structure
- RESTful API routes in `src/app/api/`
- Error handling with consistent JSON responses
- Authentication middleware using NextAuth sessions
- Database queries through Prisma ORM

#### Component Patterns
- TypeScript interfaces defined in `src/types/`
- Custom hooks for complex state management
- Props interfaces exported from component files
- Consistent error boundary patterns

#### State Management
- React hooks for local state
- Custom hooks for cross-component state (e.g., `useSheetMusic.ts`)
- No global state library - leveraging React's built-in state management

### Performance Considerations

#### Next.js Optimizations
- Image optimization with Next.js Image component
- Dynamic imports for code splitting
- Development caching disabled for piano keyboard issues

#### Audio/Animation Performance
- 60fps animation loop using requestAnimationFrame
- Audio context optimization for mobile browsers
- Canvas-based piano rendering for performance
- Lazy loading of animation data

#### Mobile Performance
- Touch event debouncing and throttling
- Responsive piano sizing based on viewport
- Gesture recognition optimized for 60fps
- PWA caching strategies for offline usage

### Deployment Notes

#### Vercel Configuration
- Build command includes `prisma generate`
- Environment variables configured in Vercel dashboard
- Image optimization configured for Google/GitHub avatars

#### Database Migrations
- Use `npm run db:migrate` for production schema changes
- `npm run db:push` for development rapid prototyping
- Seed data available via `npm run seed`

This codebase emphasizes mobile-first piano education with real-time audio-visual synchronization and cross-platform compatibility.
