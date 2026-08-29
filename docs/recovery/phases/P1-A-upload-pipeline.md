# P1-A — Upload Pipeline Consolidation

Status: `DONE`
Depends on: P0-A, P0-B, P0-C, P0-D (all `DONE`)

## Progress

- 2026-08-29 — 사용자의 명시적 승인으로 PR #84를 `2acc0b6`으로 병합했다. merge commit checks
  6/6 성공, Vercel Production Ready, 운영 `/api/sheet/public` 정상 응답과 demo 반환 0건을
  확인했다. 로컬·원격 작업 브랜치는 두 tip의 main 포함을 확인한 뒤 삭제했다. 운영 데이터에
  confirmed demo가 없어 실제 경고 화면은 관측할 수 없고 active playback 회귀 테스트가 계약을
  고정한다. 모든 completion criteria를 충족해 상태를 `DONE`으로 닫는다.

- 2026-08-29 — 마지막 completion criterion 구현이 PR
  [#84](https://github.com/landfill/ClairKeys/pull/84)로 열렸다. `SheetMusic.provenance` migration,
  정확한 과거 demo 리터럴 matcher, dry-run 기본 backfill, 신규 OMR writer 표시, demo 공개 목록
  제외와 재생 경고를 포함한다. CodeRabbit의 두 actionable 지적은 `a7745c3`에서 수정했다:
  storage 설정은 fetch·write 전에 fail-closed하고, demo 경고는 재생 중에도 fixed overlay로 남는다.
  두 스레드는 resolve됐고 최종 CI가 전부 성공했다. 로컬 Jest 62 suites / 591 tests, `tsc`, lint, build, Prisma
  validation 통과. 이어서 운영 DB dry-run에서 총 5건을 `omr=3`, `demo=0`, `unknown=2`,
  `fetchFailures=0`으로 확인하고 additive migration과 `--apply`를 순서대로 실행했다. 사후에도
  `omr=3`, `unknown=2`이며 `omr` 중 `omrJobId`가 없는 행은 0건이다. criterion 3의 데이터
  migration 검증은 충족했고, 당시에는 PR #84 병합과 배포 확인을 기다려 `IN_PROGRESS`였다.
  위 최종 기록에서 병합·배포 검증을 마쳐 `DONE`으로 닫았다. Evidence:
  `docs/recovery/validation/2026-08-29-p1a-provenance-backfill.md`.

- 2026-07-25 — Work stage 1 done. `src/app/api/__tests__/uploadPathInventory.test.ts` (6 tests)
  pins each path's converter and callers. Only `/api/omr/upload` converts a score;
  `/api/upload-async`, `/api/processing`, and the caller-less `/api/upload` reach
  `pdfParser.createEnhancedDemo()` and persist its output as an ordinary `SheetMusic` row.
  Evidence: `docs/recovery/validation/2026-07-25-p1a-upload-path-inventory.md`.
- 2026-07-25 — Work stages 1–2 merged via PR [#34](https://github.com/landfill/ClairKeys/pull/34) at
  `aca4073`. **D-010** selects `/api/omr/upload` as canonical and records the migration plan.
  Two Codex review rounds corrected the plan: `omrJobId IS NULL` also matches rows written by
  `POST /api/sheet` and `SheetMusicRepository.create`, so classification requires matching stored
  JSON against `pdfParser`'s three fixed melodies, and anything unconfirmed stays `'unknown'`.
- 2026-07-25 — Work stages 3–5 merged via PR [#35](https://github.com/landfill/ClairKeys/pull/35) at
  `317dad2`. Upload page reduced to `OMRUploadForm`; `/api/upload` + `useFileUpload` deleted; both
  async processors lose persistence and return `CONVERSION_UNAVAILABLE`; `pdfParser` guarded by
  `assertDemoGenerationAllowed()`. `prisma.sheetMusic.create` call sites: six → three, none reaching
  the demo generator. Codex found that removing persistence turned an older `retryJob` defect into
  the normal case; `retryJob` now refuses `CONVERSION_UNAVAILABLE` failures. Evidence:
  `docs/recovery/validation/2026-07-25-p1a-canonical-upload-only.md`.
- **Phase completion** — criteria 1–5 모두 충족. 운영 confirmed demo가 0건인 한계는 검증 기록에
  명시했고, 분류·공개 제외·active playback 경고 계약은 회귀 테스트로 고정했다.
- Note for stage 4: issue #20 (demo stub `pdfParser.ts`) is satisfied by this stage rather than
  separately. `/api/processing-queue` is a read-only listing endpoint, not an upload path.
- 2026-07-26 — Issue #22 repository repair merged via PR
  [#36](https://github.com/landfill/ClairKeys/pull/36) at `c8764ec`. It accepts Audiveris `.mxl`, invokes the
  native packaged launcher, removes Docker/demo processor selection, and pins the real 5.11.0
  package. Final head `4613e08` also bounds and reaps hung/cancelled subprocesses. Local regression
  tests, independent review, PR CI, merge-commit CI, and the Next.js Vercel Production deployment
  are green; CodeRabbit withdrew its packaged launcher-config objection after the `.deb` evidence
  was supplied. Docker build, Fly OMR deployment, and a real PDF remain unverified, so this does not
  yet establish a working production upload.
- 2026-08-28 — 위 2026-07-26 기록의 Fly 배포는 당시 검증하지 못한 후보였을 뿐이며 실제
  배포된 적이 없었음이 2026-08-21 첫 NAVER Cloud VM 배포에서 확인됐다. PR #69가 현재형
  Fly 설정·절차를 제거하고 D-012의 podman/systemd 계약만 활성 배포 표면으로 남긴다.
- Out of scope, handed to P2-A: `MultiStageUploadUI`, `BackgroundFileUpload`, and
  `musicDataConverter` have zero product callers after #35. Deleting them cascades into
  `ProcessStageIndicator`, `MusicThemeLoader`, and `ProcessingStatus`, which take types from
  `MultiStageUploadUI`.

## Objective

즉시, background, real-time async, external OMR 경로를 비교해 검증된 하나의 운영 경로로 통합한다.

## In scope

- 네 업로드 UI와 API 호출자 목록
- 실제 OMR과 demo/fallback 동작의 명시적 분리
- canonical upload API와 status contract
- 기존 데이터와 클라이언트의 migration 경로
- deprecated endpoint 제거 또는 격리

## Out of scope

- 영속 queue 구현
- OMR 서비스 인증과 네트워크 보안
- process restart recovery

## Work stages

1. 각 경로의 기능·호출자·결과 계약을 fixture로 고정한다.
2. canonical path 선택 결정과 migration 계획을 기록한다.
3. UI와 API 호출자를 canonical path로 이동한다.
4. demo 기능은 실제 변환 성공과 구분되는 상태로 격리한다.
5. 더 이상 호출되지 않는 경로를 제거한다.

## Completion criteria

- 운영 업로드가 하나의 API와 상태 계약을 사용한다.
- demo 결과가 실제 OMR 성공으로 저장되지 않는다.
- 기존 사용자 데이터와 지원 클라이언트 migration이 검증된다.
- 기존 업로드 endpoint의 호출자가 0임을 검색·통합 테스트로 확인하고 endpoint를 제거하거나, 필요한 호환 경로는 canonical API와 명시적으로 격리했음을 검증한다.
- P1-B가 사용할 queue/auth 경계가 문서화된다.
