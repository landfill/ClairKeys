# Project Reference

코드 탐색과 환경 설정을 위한 참고 문서다. 저장소 루트 기준 경로를 사용한다. 작업 규약은 [AGENTS.md](../../AGENTS.md)를 따른다. 설명과 코드가 다르면 실제 코드를 확인한다.

### Project Overview

ClairKeys is an AI-powered piano learning application that converts PDF sheet music into interactive piano animations. The app features real-time piano visualization, audio playback, and mobile-optimized touch interfaces.

### Architecture Overview

#### Key Data Flow

The application follows this core data pipeline:

1. **PDF Upload** → `src/app/upload/page.tsx`
2. **OMR Processing** → `omr-service/` (Python FastAPI service)
3. **Animation Generation** → Converts MusicXML to ClairKeys JSON format
4. **Storage** → Animation data stored in Supabase Storage buckets
5. **Playback** → `src/components/animation/FallingNotesPlayer.tsx`와 `src/hooks/useFallingNotesAudio.ts`에서 현재 재생 경로를 확인한다

#### Authentication Architecture

Using JWT-based sessions with manual user ID handling:
- `src/lib/auth/config.ts` - NextAuth configuration with custom callbacks
- Database user records are manually synchronized during OAuth flow
- Custom callbacks ensure consistent user IDs between JWT and database

### OMR Service Integration

#### External Python Service (`omr-service/`)
- Standalone FastAPI service for PDF → MusicXML → ClairKeys JSON
- Containerized with Podman and managed by systemd on a NAVER Cloud VM
- Uses Audiveris for optical music recognition
- Asynchronous processing with job status tracking

#### Integration Points
- `src/app/api/omr/upload/route.ts` - Proxy to OMR service
- `src/app/api/omr/status/[jobId]/route.ts` - Job status polling
- 현재 OMR status route는 `SheetMusic.processingStatus`를 갱신한다. `ProcessingJob` 모델도 존재하므로 모델 존재만으로 현재 저장 경로를 추정하지 않는다.

### Testing Strategy

#### E2E Tests (Playwright)
- `e2e/application-smoke.spec.ts` - Public-route cross-browser smoke checks (home page, viewport/zoom, explore navigation); replaces the earlier dashboard/auth-fixture specs that PR #12 removed as aspirational (issue #7)

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

### Deployment Notes

#### Database Migrations
- 운영의 기존 migration 적용은 `npx prisma migrate deploy`를 사용한다. `npm run db:migrate`는 `prisma migrate dev`이며 개발용이다.
- `npm run db:push` for development rapid prototyping
- Seed data available via `npm run seed`
