# P0-D CI Build Import-Safety Iteration

- Date: 2026-07-19 KST
- Branch: `codex/p0-quality-gates`
- Pull request: https://github.com/landfill/ClairKeys/pull/4
- Failed hosted build: PR Checks run `29684986103`

## Root causes

1. The PR lint/type job invoked ESLint's removed `github` formatter and stopped before TypeScript.
2. The production build imported the privileged Supabase client while collecting route data.
3. Supabase environment variables were validated at module import time, so a route that merely imported `FileStorageService` could not build without deployment secrets.

## Changes

- Use the default supported ESLint formatter in PR Checks.
- Export a cached `getSupabaseServer()` factory.
- Validate Supabase secrets only when a real storage operation requests the client.
- Remove the unused browser Supabase import from the server-side storage service.

## Verification

| Check | Result |
|---|---|
| File storage focused Jest suite | PASS — 13 tests |
| Environment-variable-free `npm run build` | PASS — compiled and generated 41 static pages |
| Prisma client generation | PASS — 6.19.3 |
| `git diff --check` | PASS |

## Remaining gate

The current Next configuration still skips type validation and linting during build. This pre-existing bypass remains a P0-D completion blocker even though compilation and page collection now succeed.
