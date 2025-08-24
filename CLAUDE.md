# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClairKeys is an AI-powered piano learning application that converts PDF sheet music into interactive piano animations. The app features real-time piano visualization, audio playback with Tone.js, and mobile-optimized touch interfaces.

## Core Commands

### Development
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

### Database & Storage
```bash
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes to database (development)
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Prisma Studio
npm run seed             # Populate database with sample data
npm run init-storage     # Initialize Supabase storage buckets
npm run check-data-status # Verify database and storage integrity
```

### Testing Single Components
```bash
# Run specific test file
npm test -- --testNamePattern="ComponentName"
npm test src/components/ui/__tests__/Button.test.tsx

# Run tests for specific directory
npm test src/services/__tests__/

# Run E2E test for specific workflow
npx playwright test piano-player.spec.ts
npx playwright test sheet-music-workflow.spec.ts
```

## Architecture Overview

### Core Technology Stack
- **Next.js 15** with App Router - Full-stack React framework
- **PostgreSQL + Prisma ORM** - Database layer with type-safe queries
- **Supabase** - Database hosting and file storage for animation data
- **NextAuth.js** - Authentication with Google/GitHub OAuth
- **Tone.js + Web Audio API** - Piano sound synthesis
- **Tailwind CSS** - Utility-first styling

### Key Data Flow

The application follows this core data pipeline:

1. **PDF Upload** → `src/app/upload/page.tsx`
2. **OMR Processing** → `omr-service/` (Python Flask service)
3. **Animation Generation** → Converts MusicXML to ClairKeys JSON format
4. **Storage** → Animation data stored in Supabase Storage buckets
5. **Playback** → `src/services/animationEngine.ts` coordinates audio and visual

### Database Schema

The main entities and their relationships:

- **User** - OAuth users (Google/GitHub)
- **Category** - User-created sheet music categories  
- **SheetMusic** - Core entity with `animationDataUrl` pointing to Supabase Storage
- **PracticeSession** - User practice tracking and statistics
- **ProcessingJob** - Background processing queue for PDF conversion

### Authentication Architecture

Using JWT-based sessions with manual user ID handling:
- `src/lib/auth/config.ts` - NextAuth configuration with custom callbacks
- Database user records are manually synchronized during OAuth flow
- Custom callbacks ensure consistent user IDs between JWT and database

## Component Architecture

### Layout Components (`src/components/layout/`)
- `MainLayout.tsx` - Root layout with Header/Footer
- `Header.tsx` - Navigation with authentication state
- `Container.tsx` - Responsive content wrapper

### Piano Components (`src/components/piano/`)
- `PianoKeyboard.tsx` - Core 88-key piano visualization
- `EnhancedPianoKeyboard.tsx` - Version with advanced features
- `SimplePianoKeyboard.tsx` - Minimal version for testing

### Mobile-Optimized (`src/components/mobile/`)
- `FullScreenPiano.tsx` - Fullscreen API integration for mobile
- `LandscapePianoInterface.tsx` - Landscape mode optimization
- `MobileGestures.tsx` - Touch gesture handling (pinch, swipe)
- `MobileTouchOptimizer.tsx` - Performance optimization for touch

### Animation & Playback (`src/components/`)
- `animation/AnimationPlayer.tsx` - Core animation engine wrapper
- `playback/PlaybackControls.tsx` - Play/pause/speed/loop controls
- `practice/PracticeGuideControls.tsx` - Practice mode features

### Upload System (`src/components/upload/`)
- `FileUpload.tsx` - PDF drag-and-drop interface
- `OMRUploadForm.tsx` - Form for OMR service integration
- `ProcessingStatus.tsx` - Real-time upload progress tracking

## Key Services

### Animation Engine (`src/services/animationEngine.ts`)
Core service that orchestrates:
- Time-based animation playback at 60fps
- Audio-visual synchronization with Tone.js
- Practice mode with step-by-step guidance
- Loop sections and tempo control

### Audio Service (`src/services/audioService.ts`)
- Tone.js integration for piano sound synthesis
- Note triggering with velocity and duration
- Audio context management for mobile compatibility

### File Storage (`src/services/fileStorageService.ts`)
- Supabase Storage integration for animation JSON files
- Signed URL generation for private files
- File upload/download with error handling

### Background Processing (`src/services/backgroundProcessor.ts`)
- Queue system for PDF processing
- Integration with Python OMR service
- Status tracking and error handling

## Mobile Features

### PWA Configuration
- Service worker at `/public/sw.js`
- Manifest in `/public/manifest.json`  
- Apple-specific meta tags in `src/app/layout.tsx`

### Mobile Optimization Hooks
- `useMobileGestures.ts` - Touch gesture recognition
- `useFullScreenAPI.ts` - Fullscreen mode management
- `useMobileKeyboardSize.ts` - Dynamic piano sizing

### Cross-Platform Considerations
- Fullscreen API implementation works across Chrome, Safari, Firefox
- Touch events optimized for iOS and Android
- Audio context initialization requires user gesture on mobile

## OMR Service Integration

### External Python Service (`omr-service/`)
- Standalone Flask API for PDF → MusicXML → ClairKeys JSON
- Deployed on Fly.io with Docker containerization
- Uses Audiveris for optical music recognition
- Asynchronous processing with job status tracking

### Integration Points
- `src/app/api/omr/upload/route.ts` - Proxy to OMR service
- `src/app/api/omr/status/[jobId]/route.ts` - Job status polling
- Processing status stored in `ProcessingJob` database table

## Testing Strategy

### Unit Tests (Jest)
- Components: `src/components/**/__tests__/`
- Services: `src/services/__tests__/`  
- Hooks: `src/hooks/__tests__/`
- Utils: `src/utils/__tests__/`

### E2E Tests (Playwright)
- `e2e/piano-player.spec.ts` - Full piano playback workflow
- `e2e/sheet-music-workflow.spec.ts` - Upload to playback flow
- `e2e/auth.setup.ts` - Authentication setup for tests

### Coverage Configuration
Jest configured to collect coverage from all source directories except stories and type definitions.

## Environment Configuration

### Required Environment Variables
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

## Common Development Patterns

### API Route Structure
- RESTful API routes in `src/app/api/`
- Error handling with consistent JSON responses
- Authentication middleware using NextAuth sessions
- Database queries through Prisma ORM

### Component Patterns
- TypeScript interfaces defined in `src/types/`
- Custom hooks for complex state management
- Props interfaces exported from component files
- Consistent error boundary patterns

### State Management
- React hooks for local state
- Custom hooks for cross-component state (e.g., `useSheetMusic.ts`)
- No global state library - leveraging React's built-in state management

## Performance Considerations

### Next.js Optimizations
- Image optimization with Next.js Image component
- Dynamic imports for code splitting
- Development caching disabled for piano keyboard issues

### Audio/Animation Performance  
- 60fps animation loop using requestAnimationFrame
- Audio context optimization for mobile browsers
- Canvas-based piano rendering for performance
- Lazy loading of animation data

### Mobile Performance
- Touch event debouncing and throttling
- Responsive piano sizing based on viewport
- Gesture recognition optimized for 60fps
- PWA caching strategies for offline usage

## Deployment Notes

### Vercel Configuration
- Build command includes `prisma generate`
- Environment variables configured in Vercel dashboard
- Image optimization configured for Google/GitHub avatars

### Database Migrations
- Use `npm run db:migrate` for production schema changes
- `npm run db:push` for development rapid prototyping
- Seed data available via `npm run seed`

This codebase emphasizes mobile-first piano education with real-time audio-visual synchronization and cross-platform compatibility.