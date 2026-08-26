# Current Handoff

Last updated: 2026-08-27 KST

## Current state

- Program status: `IN_PROGRESS`
- Current phase: **P1-A `IN_PROGRESS`** — upload path consolidation. Work stages 1–5 are all merged: stages 1–2 via PR [#34](https://github.com/landfill/ClairKeys/pull/34) at `aca4073`, stages 3–5 via PR [#35](https://github.com/landfill/ClairKeys/pull/35) at `317dad2`. **One completion criterion remains**: "기존 사용자 데이터와 지원 클라이언트 migration이 검증된다" — the `provenance` backfill in D-010 decision 5, which needs real-data access and therefore the user's approval. All of P0-A/B/C/D are `DONE`.
- Phase document: `docs/recovery/phases/P1-A-upload-pipeline.md` (`IN_PROGRESS`)
- Base branch: `main`
- Handoff delivery: none pending. `AGENTS.md` § "핸드오프 문서는 즉시 `main` 커밋" now governs this file's own updates — they commit straight to `main`, no PR to track here.
- Open pull requests: **[#59](https://github.com/landfill/ClairKeys/pull/59)** — `OPEN`, created 2026-08-27, awaiting the user's listening judgement and explicit merge approval. Replaces the synthesised playback timbre with recorded Salamander Grand Piano samples (CC-BY 3.0, vendored in `public/samples/piano/`, 1.17 MB on disk / 20.2 MB decoded). Records **D-014**. Review log: `docs/recovery/reviews/PR-59.md`. **New scope outside P1-A's upload-pipeline objective**, taken on the user's explicit request; the user also asked for the on-screen keyboard's Tone.js `PolySynth` to be unified onto the same instrument, deliberately left to a separate PR. Verified in headless Chromium against the running app (8 buffer sources / 0 oscillators, note gains exactly `velocity x 0.73`, no console errors) and by browser decode of the built set (30/30, 120.0 s, peak 0.4112 at MIDI 21 against the 0.4111 in `SAMPLE_SET_PEAK`). **Not verified: how it sounds** — three constants may want adjusting by ear (`SAMPLE_PEAK_GAIN`, the mono fold, `damperReleaseSec`).
- Open pull requests: none. **[#57](https://github.com/landfill/ClairKeys/pull/57) merged 2026-08-24** at `d58ceea` with the user's explicit approval — issue #56's black-key displacement and the falling-note centering that followed from it. Merge-commit checks 6/6 successful; work branch, Orca worktree, and both leftover local branches deleted; `main` is the only branch. 근거: `docs/recovery/reviews/PR-57.md`. **[#54](https://github.com/landfill/ClairKeys/pull/54) merged 2026-08-24** at `c9946c3` with the user's explicit approval — the README's OCR section now opens with the fact that OCR has no demonstrated user-visible effect, and names what #50 and #51 each actually changed. Both branch tips confirmed in `main`; work branch deleted. 근거: `docs/recovery/reviews/PR-54.md`
- **[#53](https://github.com/landfill/ClairKeys/pull/53) merged 2026-08-24** at `a5d9da3` with the user's explicit approval — README now names the OCR stage and separates it from the converter code that consumes MusicXML. Merge-commit checks all passed; both branch tips were confirmed in `main` and the work branch is deleted. 근거: `docs/recovery/reviews/PR-53.md`
- **#50 and #51 were merged 2026-08-23** with the user's explicit approval — #50 at `210a021`, #51 at `64753d9`. Both work branches and all three Orca worktrees are deleted; `main` is clean and the only worktree. Issues #48 and #49 closed automatically. Issues #44, #46, #47 remain open and are untouched.
- **#48 was found closed on GitHub and reopened** on 2026-08-23. It had been closed as `completed` at 11:46 UTC while no fix commit existed anywhere — only the four analysis comments had landed. The user confirmed the reopen.
- Pull requests merged 2026-08-23, kept below as the record of what landed:
  - [#45](https://github.com/landfill/ClairKeys/pull/45) — `MERGED` at `9ccf64e` (README service-architecture section: a topology diagram carrying which credential crosses which boundary, plus sequence diagrams for upload→convert→store and for playback, and a table of how each failure surfaces. CodeRabbit's first complete review of this sequence produced two valid findings, both fixed in `6e06e04`: the credential table said the OMR service holds none while `omr/auth.py` requires `OMR_SHARED_SECRET`, and the failure table contradicted itself because upload and polling handle an unreachable service oppositely — on purpose. Review log: `docs/recovery/reviews/PR-45.md`)
  - [#43](https://github.com/landfill/ClairKeys/pull/43) — `MERGED` at `f55a4b4` (**D-012**: exposes the OMR service on `http://101.79.16.73:3000` under a systemd unit, plain HTTP without TLS for the test phase, with the accepted risk and the exit condition both written down. Secret in a 600 env file rather than the 644 unit. Verified from outside the VM: `/health` 200 without a token, `/process`/`/status` 401 with none and with a wrong one, and a full Bach conversion returning 514 notes through the public IP. Review log: `docs/recovery/reviews/PR-43.md`)
  - [#42](https://github.com/landfill/ClairKeys/pull/42) — `MERGED` at `670201a` (head `f328dc9`; was stacked on #41 and retargeted to `main`). Implements
    **D-011** and records it: `omr/storage.py` is deleted, the service returns the animation JSON
    from `GET /result/{job_id}` and holds no storage credential, and `/api/omr/status/[jobId]`
    stores it with the `SUPABASE_SERVICE_ROLE_KEY` that only Vercel has. Payload on `/result`
    rather than `/status` because `/status` is polled in a loop; store keyed on the job id with
    upsert so a double poll cannot orphan an object; the user's title is no longer overwritten by
    the service echo. A shared secret (`X-ClairKeys-Token`) guards every endpoint except
    `/health`, and an unset `OMR_SHARED_SECRET` refuses every request. 6 new Jest tests (4 fail
    against pre-change code), 25 Python tests, full-suite failures byte-identical to baseline.
    Review log: `docs/recovery/reviews/PR-42.md`
  - [#41](https://github.com/landfill/ClairKeys/pull/41) — `MERGED` at `727031c` (head `48d123c`; the 2026-08-23
    production upload report: a row created, `Internal server error`, nothing stored. Both OMR
    routes defaulted to the never-deployed `clairkeys-omr.fly.dev`, whose wildcard DNS resolves, so
    `fetch` **threw** at TLS and skipped the `!ok` branch that marks the row failed — leaving a row
    at `processing` with no `omrJobId`, which the status route looks rows up by, so it could never
    be moved again. The default is removed rather than corrected, and an unset `OMR_SERVICE_URL` is
    refused before any row is created. **Does not make upload work** — D-010's visible failure
    stands. Review log: `docs/recovery/reviews/PR-41.md`)
- Completed pull requests:
  - [#40](https://github.com/landfill/ClairKeys/pull/40) — `MERGED` at `fb9f45b` (ignores `playwright-report/` and `test-results/`, both anchored to the repository root. They are regenerated by every Playwright run but were untracked, so the cleanup protocol read them as user-owned state; that reading blocked branch deletion on 2026-07-26 and again on 2026-08-21, and the 2026-08-02 note recorded them as gone, which stopped being true on the next test run)
  - [#39](https://github.com/landfill/ClairKeys/pull/39) — `MERGED` at `9b31d82` (dependency-only: restored the `Security Audit` required check after six newly published advisories turned it red on unchanged dependencies — the **fifth** occurrence of the PR #25/#27/#31 pattern. `npm audit --audit-level high` went from 6 high to exit 0. Nested overrides keep `js-yaml` at 4.3.1 under `@eslint/eslintrc` and 3.15.1 under `@istanbuljs/load-nyc-config`, because no single version satisfies both; `3.15.1` is a backported fix despite the advisory title saying otherwise. `deepmerge-ts` is forced across a major under `prisma`, which pins it to exactly 7.1.5 in every published version — `prisma generate` still succeeds. All pins carry upper bounds so a resolution cannot silently cross a major. Review log: `docs/recovery/reviews/PR-39.md`)
  - [#37](https://github.com/landfill/ClairKeys/pull/37) — `MERGED` at `0265771` (made the OMR image able to install and start Audiveris. The `.deb`'s postinst needed a system menu directory plus `desktop-file-utils`/`shared-mime-info`, and `libgtk-3-0` is absent from its `Depends` yet loaded by `WellKnowns.<clinit>` before argument parsing. The build now runs `Audiveris -version`. Review log: `docs/recovery/reviews/PR-37.md`)
  - [#38](https://github.com/landfill/ClairKeys/pull/38) — `MERGED` at `3208488` (stopped the service reporting success for work it did not do: `/process` now reads its multipart fields including `sheet_music_id`, and a storage failure fails the job instead of returning a `file://` URL. The local fallback survives for development behind a guard that fails closed. Review log: `docs/recovery/reviews/PR-38.md`)
  - [#36](https://github.com/landfill/ClairKeys/pull/36) — `MERGED` at `c8764ec` (issue #22
    repository repair: accepts Audiveris `.mxl`, invokes the real packaged launcher, removes
    Docker/demo processor selection, pins the checksum-verified 5.11.0 `.deb`, provisions English
    traineddata, serializes 3GB JVMs on a provisional 4GB VM, and kills/reaps timed-out or cancelled
    subprocesses. Multiple `.mxl` results fail explicitly. PR and merge-commit CI passed; Vercel
    Production deployed the Next.js main commit. **The separate Fly OMR image is not built or
    deployed, so production upload is not yet proven and issue #22 remains open.** Review log:
    `docs/recovery/reviews/PR-36.md`)
  - [#35](https://github.com/landfill/ClairKeys/pull/35) — `MERGED` at `317dad2` (**P1-A stages 3–5**: the upload page offers only `OMRUploadForm`; `/api/upload` + `useFileUpload` deleted; `asyncUploadProcessor`/`backgroundProcessor` keep their queue contracts but lose persistence and return `CONVERSION_UNAVAILABLE`; `pdfParser` survives as a development-only generator behind `assertDemoGenerationAllowed()`. `prisma.sheetMusic.create` call sites drop from six to three, none reaching the demo generator. Codex found that removing persistence made an older bug the normal case — `retryJob` reset a `FAILED` row to `PENDING` without restoring the in-memory queue entry, so the job sat at 0% forever; `retryJob` now refuses `CONVERSION_UNAVAILABLE` failures, with a regression test that failed before the fix. CodeRabbit was rate limited for this entire PR and produced no review. 41 suites / 387 tests. **Upload now fails visibly until issue #22 is fixed — intended, not a regression.** Review log: `docs/recovery/reviews/PR-35.md`)
  - [#34](https://github.com/landfill/ClairKeys/pull/34) — `MERGED` at `aca4073` (**P1-A stages 1–2**: `uploadPathInventory.test.ts` pins that only `/api/omr/upload` converts a score while three paths reached `pdfParser.createEnhancedDemo()` and stored the result as an ordinary `SheetMusic` row — the D-001 violation that had outlived its decision by a year. Records **D-010**. Codex found three real issues across two rounds: a missing migration plan; that `omrJobId IS NULL` also matches rows from `POST /api/sheet` and `SheetMusicRepository.create`, so the backfill would have hidden genuine scores; and that leaving the legacy UI callers on always-failing endpoints contradicts stage 3. All fixed. CodeRabbit contributed one valid finding then went rate limited for the rest of the PR. 42 suites / 395 tests. `Unit Tests` went red once on a Docker Hub outage (`docker pull postgres:15` timed out before checkout) and passed on re-run with no code change. Review log: `docs/recovery/reviews/PR-34.md`)
  - [#33](https://github.com/landfill/ClairKeys/pull/33) — `MERGED` at `8df3c4a` (adds a live 고음/treble-rolloff control matching PR #32's volume slider; `harmonicAmplitudes` parameterised, `setTrebleRolloff` clamped 1.5–5, retunes only notes scheduled after the change. 41 suites / 386 tests. CI-conditioned merge. **Follow-up: set `DEFAULT_TREBLE_ROLLOFF` and `DEFAULT_MASTER_GAIN` from the levels the user picks.** Review log: `docs/recovery/reviews/PR-33.md`)
  - [#32](https://github.com/landfill/ClairKeys/pull/32) — `MERGED` at `797ff38` (timbre tuning from listening feedback: `TREBLE_ROLLOFF` 2.4→3.2, master gain 0.1→0.22, and a live 음량 control on the playback screen whose readout is the master gain value. CodeRabbit found 4 valid issues fixed in `de67c5c` — a dishonest volume clamp, no real headroom at `MAX_MASTER_GAIN`, and two missing regression tests. 41 suites / 383 tests. **Follow-up: set `DEFAULT_MASTER_GAIN` to the level the user picks on the slider.** Review log: `docs/recovery/reviews/PR-32.md`)
  - [#30](https://github.com/landfill/ClairKeys/pull/30) — `MERGED` at `81a1067` (low-note timbre: replaces the single-`sine` synthesis with a 24-partial `PeriodicWave` and a decaying envelope; `src/utils/pianoTimbre.ts` pure module. CodeRabbit found two real regressions across review rounds — a velocity-0 note gaining an audible tail from the decay floor, and a zero-length note's attack outlasting it — both fixed with regression tests first; `NoteEnvelope` moved to `src/types/`. Rebased onto #31 to inherit the audit pin. Verified in production: served chunk `931-d2a827719d70b8ca.js` contains `setPeriodicWave`/`createPeriodicWave`/`disableNormalization` and an exponential-decay envelope, with no `4*f0` primary-path cutoff. **Timbre itself still a listening judgement.** Review log: `docs/recovery/reviews/PR-30.md`)
  - [#31](https://github.com/landfill/ClairKeys/pull/31) — `MERGED` at `006fc04` (dependency-only: pins `brace-expansion >=5.0.8`, clearing `GHSA-mh99-v99m-4gvg` — the fourth time a newly published advisory flipped `Security Audit` red with no tree change. Split from #30 like #25 was from #24. Review log: `docs/recovery/reviews/PR-31.md`)
  - [#29](https://github.com/landfill/ClairKeys/pull/29) — `MERGED` at `035ba50` (closes issue #28: removes `deploy.yml`'s `Deploy to production` / `Run database migrations` / `Post-deploy health check` / `Notify deployment status`, none of which had ever succeeded because the repository has no secrets at all; renames the workflow `Deploy` → `Post-merge checks` so a test-only workflow stops reading as proof that a merge shipped. Regression-first `src/ci/__tests__/postMergeWorkflow.test.ts` failed 3/5 before and passes 5/5 after. CodeRabbit was rate limited on first attempt and reported no actionable comments once re-triggered. Both tips confirmed in `main`; branches deleted. The post-merge run on `035ba50` shows as `Post-merge checks`, confirming the rename. Review log: `docs/recovery/reviews/PR-29.md`)
  - [#27](https://github.com/landfill/ClairKeys/pull/27) — `MERGED` at `08c3ff4` (dependency-only: restores the `Security Audit` required check that newly published advisories turned red on `main`. `next-auth` →4.24.15 clears 3 critical advisories in-range, `next` →15.5.21 clears 8 high advisories as a patch bump, `postcss` overrides pin ≥8.5.12 resolves the nested 8.4.31 to 8.5.22. `uuid` deliberately untouched as moderate-only; the next-auth upgrade cleared it anyway. `npm audit` reports 0 vulnerabilities on merged `main` and the high gate exits 0. All hosted checks passed; CodeRabbit found nothing actionable. Both branch tips confirmed in `main`, then remote and local branches deleted — the remote delete needed a retry after a transient GitHub `500`. Review log: `docs/recovery/reviews/PR-27.md`)
  - [#26](https://github.com/landfill/ClairKeys/pull/26) — `MERGED` at `157c3b4` (**P0-C** `DONE`: one AudioContext/score-time anchor for audio scheduling and visuals, same-render key activation, unavailable/suspended/stale-start lifecycle handling, and 1-minute/5-minute drift gates below 1 ms. Post-merge Tests run `29898010765` passed all jobs. Both work-branch tips were confirmed in `main`, then the local and remote branches were deleted after the user authorized removal of obsolete untracked artifacts. Review log: `docs/recovery/reviews/PR-26.md`)
  - [#24](https://github.com/landfill/ClairKeys/pull/24) — `MERGED` at `a63d51f` (**P0-B** `DONE`: `converter.py` rewritten — seconds-based onset accumulation, per-measure backup/chord cursor, `<tie>` duration merge, staff-based hands; `omr/cli.py` seam + Jest corpus gate `converterCorpus.test.ts` scoring the converter via `compareAnimationData`. CodeRabbit's 3 findings fixed in `1e902a4` — cross-barline tie (part-scope `open_ties`, fixture 09), multi-part global tempo timeline (fixture 08), test subprocess timeout/maxBuffer. 9-fixture corpus green on CI. Both branch tips confirmed in `main`; remote+local branches deleted. Review log: `docs/recovery/reviews/PR-24.md`)
  - [#25](https://github.com/landfill/ClairKeys/pull/25) — `MERGED` at `83de264` (dependency-only: pins `sharp >=0.35.0` via npm `overrides`, clearing the high libvips advisories, GHSA-f88m-g3jw-g9cj, that turned `Security Audit` red for every PR; `next` dropped high→moderate. No CodeRabbit findings. Merged first so #24 re-ran against a green audit baseline. Branch deleted after tip confirmed in `main`. Review log: `docs/recovery/reviews/PR-25.md`)
  - [#23](https://github.com/landfill/ClairKeys/pull/23) — `MERGED` at `d59ea9d` (**P0-A** `DONE`: canonical MIDI animation contract + legacy-tolerant validator, 7-case golden corpus + `compareAnimationData`, render-path wiring replacing the `as` cast, `converter.py` emits `version`. Three review waves (14 findings) handled incl. two by-design rejects keeping fixtures as ground truth; D-009 recorded. Work branch deleted after tip confirmed in `main`)
  - [#21](https://github.com/landfill/ClairKeys/pull/21) — `MERGED` at `3349fd3` (docs-only: `DECISIONS.md` D-008 `Proposed`, OMR hosting Fly.io-reuse vs Cloud Run. CodeRabbit C1–C7 accuracy fixes resolved — notably C3: the deployed service does not silently emit demo output; on a Docker-less host the OMR job **fails**. Work branch deleted after tip confirmed in `main`)
  - [#19](https://github.com/landfill/ClairKeys/pull/19) — `MERGED` at `47e30af` (issue #18: one-shot 10s-capped audio scheduler → rolling look-ahead scheduler; P0-C Work stages 1–3. CodeRabbit R1–R3 resolved; work branch deleted after both tips confirmed in `main`)
  - [#14](https://github.com/landfill/ClairKeys/pull/14) — `MERGED` at `05c70df` (P0-D handoff closeout)
  - [#15](https://github.com/landfill/ClairKeys/pull/15) — `MERGED` at `992615f` (agent contract consolidation, `CLAUDE.md` reduced to a pointer at `AGENTS.md`)
  - [#16](https://github.com/landfill/ClairKeys/pull/16) — `MERGED` at `32b5739` (recorded PR #14/#15 merge results; last PR of its kind — see #17)
  - [#17](https://github.com/landfill/ClairKeys/pull/17) — `MERGED` at `a78d0f2` (handoff documents now commit directly to `main`, ending the self-referential "PR records that a PR merged" pattern PR #16 exemplified)
- Superseded pull request: [#11](https://github.com/landfill/ClairKeys/pull/11) — `CLOSED`
- Current objective: **P1-A — consolidate the four PDF upload paths onto the one that actually converts a score.** The deployment and timbre objectives that preceded it are closed: `main` deploys itself again (Vercel Production Branch Tracking fixed), the `Security Audit` gate is green, and both timbre tuning sliders are live in production. The only thing outstanding from the timbre work is a pair of default values that need the user's ear, not code.

## Latest verified result

- **2026-08-24 — 이슈 #56이 코덱스 워커 + 코디네이터 교차검증으로 닫혔다. PR #57 병합(`d58ceea`).**
  Orca orchestration으로 진행했다: Run `run_1cfda20fe7be`, Task 3개(수정 / 교차검증 / 보완),
  워커는 Codex `gpt-5.6-sol` effort high.

  **결과**: `pianoLayout.ts`의 검은건반 오프셋을 왼쪽 흰건반 기준 상대값으로 교정(최대 5칸
  어긋남 제거), `visualUtils.ts`·`SimplePianoKeyboard.tsx`의 `* 0.2` 이중 보정 제거,
  이어서 낙하 노트를 88건반 중심에 정렬(`x = keyPos.x + (keyPos.w - width) / 2`).
  회귀 테스트 신규 2개 파일. CodeRabbit 전체 재리뷰 actionable 0건.

  **코디네이터 독립 검증**: 워커의 테스트를 쓰지 않고 별도 검증기로 `buildKeyLayout`과
  `notesToVisualNotes` 출력을 직접 실행 검사했다(keyWidth 10/20/24/33.7 × 불변식 9개).
  수정 전 코드에서 16건 + 88/88 불일치로 실패함을 먼저 확인해 검증기 자체를 검증한 뒤,
  병합 후 `main`에서 전수 통과를 재확인했다.

  **교차검증에서 오류가 양방향으로 나왔다** — 이 과정이 실제로 값을 했다:
  - 코디네이터 spec이 틀림: "offsets 표가 실제 피아노 비대칭을 반영한다"는 주장은 거짓.
    표준 치수 검산 결과 다섯 건반 모두 균일한 좌측 편향이며 D#·A#는 실제와 방향이 반대다.
    → 이슈 [#58](https://github.com/landfill/ClairKeys/issues/58)로 분리, 잘못된 lore는 정정.
  - 코디네이터 spec이 틀림: `npm run type-check`는 존재하지 않는다(`README.md:446` 오기).
    워커가 발견했고, 사실대로 기록하는 쪽으로 처리했다.
  - 코디네이터 검증기가 틀림: 검은건반 간격 불변식을 좌변 기준으로 쟀는데 워커의 모서리 기준이
    옳았다(실제 피아노는 좌변 기준 1.757칸이라 1.5 상한이 성립하지 않는다).
  - 코디네이터 판단이 틀림: 낙하 노트 좌측 정렬을 "2px 미만이라 별도 이슈"로 미루려 했으나
    워커가 반박했고 그쪽이 옳았다. 근거는 `visualUtils.ts:118`의 `getFingerBadgePosition`이
    이미 "작은 것을 큰 것 안에 중앙 정렬"을 관용구로 쓰고 있다는 점 — 크기가 아니라 일관성이
    기준이었다.

  **남은 것**: 이슈 #58(실제 비대칭 + `PianoKeyboard.tsx`와의 통일). 브라우저 스크린샷 비교는
  다섯 화면 모두 미실행이다.

- **2026-08-24 — 이슈 #56의 검은건반 좌표 수정이 review-ready PR #57에 올라갔다.**
  `pianoLayout.ts`의 검은건반 오프셋을 왼쪽 흰건반 기준 `0.65/0.6/0.65/0.6/0.6`으로
  바꾸고, `SimplePianoKeyboard.tsx`와 `visualUtils.ts`에서 각각 더하던 `* 0.2` 보정을 함께
  제거했다. 건반은 `KeyLayout.x`를 좌변으로 쓰고, 더 좁은 낙하 노트는
  `keyPos.x + (keyPos.w - width) / 2`로 해당 건반 중심에 맞춘다. 88건반 전체에서 흰건반과
  검은건반 모두 노트 중심=건반 중심임을 고정했다. 이 중심 계약은 구현 전 **1 suite / 1 test
  실패**(A0 0.96px 왼쪽)를 재현했고 구현 후 통과했다.

  **Lore 정정:** 커밋 `299951d`의 “keeps the original asymmetric placement”는 부정확하다.
  원래 표와 현재 PR 값은 실제 피아노 비대칭이 아니라 모두 경계에서 -0.05~-0.10칸 왼쪽인
  근사다. 실제 중심은 C# -0.10, D# +0.10, F# -0.15, G# 0.00, A# +0.15칸이므로 D#/A#은
  방향이 반대이고 G#은 경계 정중앙이다. 실제 좌변 오프셋은
  `0.611/0.806/0.563/0.709/0.854`, 검은건반 폭은 0.583칸이다. PR #57은 최대 5칸 밀림만
  고치며 이 정밀도와 `PianoKeyboard.tsx` 통일은 이슈 #58 소관이다.

  회귀 테스트를 코드보다 먼저 추가했다. 수정 전 focused Jest는 **2 suites failed,
  5 tests failed / 3 passed**였고, 수정 후 **2 suites / 8 tests 통과**했다. 전체 Jest는
  **50 suites / 457 tests**, lint와 `npx tsc --noEmit`도 통과했다. `npm run type-check`는
  `package.json`에 스크립트가 없어 실행할 수 없었다 — README의 해당 안내는 별도 정정
  대상이며 이 PR 범위에는 넣지 않았다. 좌표 재계산 결과 MIDI 순서 위반 0, 오른쪽 끝
  1040px = 컨테이너 폭 1040px, 최대 검은건반 빈 간격 29px(`keyWidth=20`)다.
  최초 head `299951d`의 hosted checks는 전부 통과했고(E2E 두 작업 포함), 수동 트리거한
  CodeRabbit review는 코드 actionable comment 0건이었다. 중앙 정렬을 추가한 현재 head
  `db9801e`도 hosted checks 17개가 모두 통과했다(E2E 두 작업 포함). PR은 review-ready,
  `MERGEABLE`이며 사용자의 명시적 병합 승인 전에는 병합하지 않는다.
  근거: `docs/recovery/validation/2026-08-24-issue-56-piano-black-key-layout.md`,
  `docs/recovery/reviews/PR-57.md`

- **2026-08-24 — 88건반의 검은건반이 최대 5칸 밀려 있다. 재생 화면 본체의 결함이다.**
  사용자가 "건반 모양이 완전히 잘못된 것으로 보인다"고 지적해 좌표를 직접 계산한 결과 사실이었다.
  이슈 [#56](https://github.com/landfill/ClairKeys/issues/56)로 등록.

  `src/utils/pianoLayout.ts:57-71`이 **절대 좌표에 옥타브 상대 오프셋을 더한다.** `baseX`는
  왼쪽 흰건반의 절대 x인데, `offsets` 표(`0.65/1.6/3.65/4.6/5.6`)는 옥타브의 C를 원점으로 한
  절대 위치다. 둘을 더하므로 **왼쪽 흰건반이 C에서 떨어진 칸 수만큼 정확히 밀린다** —
  C# +0칸, D# +1칸, F# +3칸, G# +4칸, A# +5칸. `A#1`은 화면상 `F2` 위에 그려진다.
  가장 오른쪽 건반은 컨테이너를 64px 넘긴다(`keyWidth=20` 기준).

  **C#만 맞는 것이 발견을 늦췄다** — C#의 왼쪽 흰건반이 곧 옥타브의 C여서 두 원점이 우연히
  일치한다. "일부는 맞아 보이는" 상태가 된다.

  영향: `SimplePianoKeyboard.tsx`(=`/sheet/[id]`가 렌더하는 건반)와 `visualUtils.ts:49`
  (낙하 노트가 같은 `keyPos.x`를 쓴다). 노트와 건반이 함께 틀려 서로 어긋나 보이지는 않지만
  "A#을 누르라"는 표시가 F 위치에 뜬다.

  **올바른 구현은 이미 저장소에 있다**: `PianoKeyboard.tsx:85-95`는 경계 기준 상대 오프셋
  (`-0.25/+0.25/-0.33/0/+0.33`)을 쓰며 정상이다. 재생 화면이 쓰는 경로만 틀렸다.

  **시각적 지문은 "검은건반 5개가 촘촘히 붙고 3칸 빈자리"의 반복이다.** 사용자가 이 패턴을
  먼저 알아봤다. 간격 수열이 `0.95 1 1 3.05 …`로, 올바른 배치(`1.5 1.42 1.33 1.33 1.42 …`,
  1.5칸 초과 간격 없음)와 전혀 다르다. 각 묶음은 한 옥타브의 5개가 아니라 서로 다른 옥타브가
  뒤섞인 것이다.

  **그래서 음높이 순서가 깨진다 — 35쌍 중 7쌍 위반.** `A#3`보다 `C#4`가 왼쪽에 그려진다.
  36개 중 **29개**가 인접 흰건반 경계에서 ±0.35칸을 벗어나 있다.

  **`buildKeyLayout`에 테스트가 하나도 없다** — `piano.test.ts`는 음이름·주파수 변환만 다룬다.
  #56에 좌표 불변식 7개를 회귀 테스트 후보로 적어 두었다. 그중 **"x 정렬 순서 = MIDI 순서"
  하나가 이 결함 전체를 잡아낸다.**

  **수정 위치와 영향 범위를 전수 조사해 #56에 기록했다** (건반 구현이 두 벌이라 필요했다):

  - **고칠 파일 3개** — `pianoLayout.ts:57-71`(근본 원인), `visualUtils.ts:49`,
    `SimplePianoKeyboard.tsx:60`. 뒤 둘은 각각 `keyPos.w * 0.2` 보정을 더하므로 **세 곳을
    동시에** 고쳐야 한다. 한쪽만 고치면 건반과 낙하 노트가 새로 어긋난다.
  - **영향 화면 5곳** — `app/page.tsx:43-44`(**메인 랜딩의 "피아노 미리보기"**),
    `sheet/[id]/page.tsx:179`→`FallingNotesPlayer.tsx:54,191`(연주 화면),
    `test-finger:88`, `test-piano:35,188,202`.
  - **`PianoKeyboard.tsx`는 정상이고 수정 대상이 아니다** — 자체 좌표계(경계 기준 상대
    오프셋)를 쓰며 모바일 전체화면·가로모드·데모가 이걸 쓴다. 즉 **현재 데스크톱 연주 화면과
    모바일 건반의 모양이 서로 다르며**, A를 고치면 비로소 일치한다.
  - `EnhancedPianoKeyboard.tsx`는 참조 0건인 죽은 코드다.

  **오디오·타이밍에는 영향이 없다** — 오디오는 `pianoLayout.ts`에서 `midiToFreq`/`A0_MIDI`/
  `C8_MIDI`만 가져가고 x를 보지 않으며, `animationEngine.ts`는 layout을 참조하지 않는다.
  낙하 노트의 y는 시간으로만 계산된다(`visualUtils.ts:36-38`). `totalWidth`는 흰건반만으로
  계산되므로 컨테이너 폭도 그대로다. 깨진 경로에는 x→MIDI 역변환(히트테스트)이 없어
  입력 처리가 깨질 지점도 없다.

- **2026-08-24 — 업로드 후 화면을 이탈하면 변환 결과가 영구히 유실된다. 큐잉되지 않는다.**
  사용자가 "화면을 이탈해도 백엔드가 큐잉되어 완료되는가"를 물어 코드로 추적한 결과, 답은
  **아니오**였다. 이슈 [#55](https://github.com/landfill/ClairKeys/issues/55)로 등록.

  결정적 지점: `src/app/api/omr/status/[jobId]/route.ts`는 상태 중계만 하지 않고 `completed`를
  관측한 **그 요청 안에서** `/result`를 가져와 Supabase에 저장한다(`maxDuration = 60`의 이유).
  그리고 그 요청을 부르는 주체는 브라우저뿐이다 — `OMRProcessingStatus.tsx:55`의
  `setInterval(..., 5000)`과 `:127`의 `clearInterval`. 언마운트되면 폴링이 멈추고,
  **저장 코드는 실행될 기회 자체가 없다.**

  그 결과 VM은 변환을 끝까지 완료하고 결과를 `app.py:91`의 `processing_jobs` 메모리에 든 채
  서 있게 되며(D-011로 서비스는 저장 자격증명이 없다), Supabase에는 아무것도 저장되지 않고
  DB 행은 `processing`에 영구히 남는다.

  **복구 경로가 없음을 세 군데에서 확인했다**: `vercel.json`에 cron 정의 없음;
  `backgroundProcessor.ts`는 `/api/processing/*` 전용이고 OMR 업로드 경로가 참조하지 않으며
  큐도 인메모리 `Map`이다; `jobs` prop은 `upload/page.tsx:16`의 `useState`라 새로고침에 사라지고
  `processingStatus`를 읽어 진행 중 목록을 보여주는 UI는 코드 전체에 없다.

  **이건 D-011의 대가다.** 서비스가 저장 자격증명을 갖지 않는 결정은 옳지만, 저장 주체를
  Vercel로 옮긴 순간 저장 트리거가 브라우저 폴링이 되었다. 고치는 방향은 D-011을 되돌리는 게
  아니라 트리거를 브라우저에서 떼는 것이다 — #55에 두 안(VM→Vercel webhook / Vercel cron으로
  미완료 행 훑기)을 적어 두었고, 둘은 배타적이지 않다.

  부수 발견: README 시퀀스 다이어그램의 `3초 간격 폴링`은 오기다. 실제는 5초
  (3000ms는 중복 호출 방지 가드). #55에서 함께 정정한다.

- **2026-08-24 — #50과 #51은 한 덩어리로 기억되지만 서로 다른 것을 고쳤고, 그 혼동이 실제로
  일어났다.** 사용자가 "전일 작업한 OCR은 메트로놈 표기 숫자를 인식하는 것"이라고 이해하고
  있었다. 파일 목록으로 확인한 실제 범위는 반대다: **#50은 `Dockerfile.audiveris`의
  traineddata 교체뿐**(메트로놈 관련 코드 없음, OCR 전반), **#51은 `converter.py`·`app.py`·
  업로드 폼의 빠르기 계약**(OCR 아님). 그리고 OCR 복구 후에도 `<metronome>`은 0개였으므로
  **인쇄된 메트로놈 표기는 지금도 인식되지 않는다** — #51의 사용자 입력 필드가 존재하는 이유가
  그것이다. 현재 `tempoSource`는 `user` 또는 `unknown`뿐이다.

- **2026-08-24 — OCR 복구가 사용자에게 보이는 것을 바꿨다는 증거는 아직 없다.** 표시 경로를
  추적했다: `src/app/sheet/[id]/page.tsx`는 DB `SheetMusic` 행(=사용자 입력)을 렌더하고,
  악보 유래 값이 표면화될 수 있는 곳은 `AnimationPlayer.tsx`의 헤더(애니메이션 JSON) 하나뿐이다.
  그 JSON의 `title`/`composer`를 만드는 `_extract_metadata`는 `<work-title>`·`<creator>`를
  찾는데 그 둘은 관측된 적이 없다(아래 2026-08-24 항목). **따라서 #49 복구의 사용자 가시
  효과는 현재 0으로 간주해야 한다.** PR #54가 README를 이 사실로 시작하도록 고쳤다.

- **2026-08-24 — OCR이 읽은 제목이 JSON에 도달하는지는 아무도 확인한 적이 없다.** README에
  OCR 절을 쓰다가 드러난 빈틈이다. 2026-08-23 실측이 관측한 요소는 `<credit-words>` 뿐인데
  (`'Piano Solo - Love Affair'`, `'Ennio Morricone'` 등), `omr/converter.py`의
  `_extract_metadata`가 찾는 것은 `<work-title>`과 `<creator[@type="composer"]>`다.
  Audiveris가 후자도 함께 채우는지는 이 저장소 어디에도 근거가 없다.

  **채우지 않는다면 OCR 복구(#49)는 사용자에게 아무 차이도 만들지 않는다** — 제목·작곡가는
  계속 업로드 폼의 입력값이 쓰이고, 겉보기 동작은 OCR이 죽어 있던 때와 구별되지 않는다.
  #49를 숨겼던 바로 그 은폐 구조가 그대로 남아 있는 셈이다.

  확인 방법은 간단하다: VM에서 `love-affair.pdf`를 다시 변환해 나온 `.mxl`에
  `<work-title>`·`<creator>`가 있는지 보면 된다. README(PR #53)는 어느 쪽으로도 단정하지
  않고 열린 질문으로 적어 두었으므로, 확인되면 그 자리를 답으로 교체한다.

- **2026-08-23 — OCR has never worked, and finding that took a real score to see.** The user
  supplied `Love_Affair_Piano_Solo.pdf`, which prints `Adagio ♩ = 60` above the first system — and
  ♩=60 against the 120 default is exactly the doubling they reported. The file converts cleanly
  otherwise (2 sheets, 2480×3507, interline 20–21), so issue #46 is not involved. Yet the MusicXML
  contained **no `<metronome>`, no `<sound tempo>`, and no `<words>` at all**.

  No text at all was the tell. Every sheet logs
  `Could not initialize TessBaseAPI languages: eng in legacy mode` followed by `No OCR'd lines`:
  Ubuntu's `tesseract-ocr-eng` ships a **4.1 MB LSTM-only** `eng.traineddata` while Audiveris
  initialises Tesseract in **legacy mode**, and `TesseractOrder` exposes no constant to change the
  engine mode. Pointing `TESSDATA_PREFIX` at the 23.5 MB legacy-capable file from
  `tesseract-ocr/tessdata` removed both messages and read the printed credits correctly —
  `Piano Solo - Love Affair`, `Love Affair OST`, `Ennio Morricone`, `trans. Jose Hernandez`. Filed
  as issue [#49](https://github.com/landfill/ClairKeys/issues/49) with the demonstrated fix.

  **This was invisible because the upload form asks for title and composer.** Those user-typed
  values stood in for everything OCR should have supplied, so a completely dead text pipeline
  looked like a working one.

  **Fixing OCR does not fix the tempo.** With OCR restored, `<metronome>` is still 0 and neither
  `Adagio` nor `60` appears anywhere, though measure numbers 10/13/16/19/25/28 were read. Enumerating
  every `ProcessingSwitch` found no metronome toggle. So issue #48's cause is confirmed as "the mark
  is never recognised", with an unexplained second layer beneath the OCR failure — which makes the
  user's own proposal, passing a tempo as a conversion parameter, the path that does not depend on
  solving it.

- **2026-08-23 — a second tempo defect, demonstrated: `beat-unit` is discarded, so a marking in
  anything but quarter notes is off by that ratio.** The user reported that their test scores
  mostly *do* carry a printed tempo and playback is still about twice too fast, which rules out
  "no marking" as the whole story. `converter.py:391-402` reads only the number in `<per-minute>`
  and never reads `<beat-unit>`, while `converter.py:183` assumes that number is quarter-notes per
  minute. In a `<metronome>` the number and the note are a pair; reading half of it makes the other
  half a guess.

  Three musically identical tempos injected into the Bach MusicXML and re-converted:

  | MusicXML | printed as | `tempo` | sixteenth | total |
  |---|---|---|---|---|
  | `quarter` + `60` | ♩=60 | 60 | 0.2500 s | **2:27** — correct |
  | `eighth` + `120` | ♪=120 | 120 | 0.1250 s | **1:13** — twice too fast |
  | `half` + `30` | 𝅗𝅥=30 | 30 | 0.5000 s | **4:55** — twice too slow |

  All three should be 2:27. The `♪=120` row reproduces the user's symptom exactly, and
  eighth-note markings are common in compound metres.

  **Not yet settled which defect the user is hitting.** Both score crops they showed use ♩, which
  would make `beat-unit=quarter` and leave "the marking was never recognised" as the cause instead.
  One observation separates them: `AnimationPlayer.tsx:267` displays `{tempo} BPM`, so a screen
  reading of 120 means recognition failed, while a reading that matches the print means the
  beat-unit ratio is the culprit. The `beat-unit` conversion is needed either way.

- **2026-08-23 — the default playback tempo is fabricated, and the screen presents it as read from
  the score.** The user reported that playback at speed `1.0` is too fast and that 0.5–0.75 matches
  the score. `converter.py:391-402` returns a hardcoded **120** whenever the MusicXML carries no
  `<per-minute>`, and the Bach MusicXML carries no tempo information at all — no `<sound tempo>`,
  no `<metronome>`, no tempo words. The arithmetic matches the user's ear exactly: at 120 the piece
  runs 1:14, at 0.5× it runs 2:28, and this prelude is normally played in 2:00–2:30. The real tempo
  is around ♩=60, so the default is precisely twice too fast.

  ~~**This is structural, not specific to one file.** Audiveris can only recover a tempo that is
  printed on the page, and most engraved classical scores print none~~ — **retracted the same day.**
  The user pointed out that modern engraved and arranged scores normally do print `♩ = N`, and the
  jar bears that out: Audiveris 5.11.0 carries `MetronomeInter`, `BeatUnitInter` and a
  `TextRole.Metronome`, and `PartwiseBuilder` calls `setBeatUnit`/`setPerMinute`, so a recognised
  marking is exported as `<metronome><per-minute>`. No `ProcessingSwitch` gates it. **The path is
  already wired end to end**, and `_extract_tempo` already reads `<per-minute>` — Bach WTK1 Prelude
  1 is simply a score with no marking, which is why it looked like the general case.

  Not yet proven: that OCR actually reads a real printed marking. That needs one score with a
  printed `♩ = N` put through the pipeline; if the JSON's `tempo` matches the print, option (a)
  needs no work at all.

  **Interacts with issue #46**: a small-page PDF is discarded at `SCALE`, before any text
  recognition runs — so a printed marking on such a file could never be read. Fixing #46 may
  resolve part of this one.

  `AnimationPlayer.tsx:267` then renders `{composer} • {timeSignature} • {tempo} BPM`. Two of those
  three were read from the score and the third was invented, in the same typography, with nothing
  distinguishing them. That is the shape of defect this project has repeatedly removed (D-001,
  D-010) — milder than a demo melody, but the same kind.

  **Measured, not inferred: this is a conversion-time fault and the player is not involved.**
  The stored JSON bakes a sixteenth note at 0.125 s — exactly 120 BPM. The player adds nothing:
  `animationEngine.ts:23` defaults `speed: 1.0`, `AnimationPlayer.tsx:27` initialises the control
  at 1.0, and `playbackClock.ts:24` advances song time at wall-clock rate when `tempoScale` is 1.
  (`AnimationPlayer.tsx:114`, which sets speed from an event's `tempo`, is inside the practice-mode
  tempo-progression handler and never runs on the default path.) Injecting `<sound tempo="60"/>`
  into the MusicXML and re-converting produced the identical 514 notes with every time exactly
  doubled — 0.250 s per sixteenth, 2:27 total, inside the conventional range for this prelude.

  That experiment also turned a suspicion into a fact: **the `tempo` field stayed 120 while the
  actual times honoured 60.** `_extract_tempo` reads only `<per-minute>`; `_build_tempo_timeline`
  reads `<sound[@tempo]>`. So a score carrying `<sound tempo>` plays at the right speed while the
  screen states the wrong BPM. That fix is needed independently of whichever option is chosen for
  the default.

  The user has accepted re-converting stored scores (2026-08-23), which removes the constraint that
  made option C (rescale at playback, changing the D-009 seconds contract) attractive. Filed as
  issue [#48](https://github.com/landfill/ClairKeys/issues/48); options A, B and D remain open and
  none is chosen.

- **2026-08-23 — the first two real uploads after go-live failed for two different reasons, and
  both are now filed with reproductions.** Neither is a deployment fault: Vercel reached the
  service and authenticated both times.
  - A Korean-language document (fonts `Noto-Sans-CJK-KR` ×3, `-JP`) failed at `SCALE` with
    `No regularly spaced lines found` — there is no staff on the page. Correct behaviour.
  - A real 4-page arrangement failed with `too low interline value of 9 pixels` → `Sheet removed`
    → the whole book abandoned. **Audiveris's advice, "try 300 DPI", is misleading: it already
    renders at 300.** The controlling constant is
    `org.audiveris.omr.image.ImageLoading.pdfResolution`, default 300, and the same A4 fixture
    loads at 2480×3507 under it. So 1064×1521 means the *page* is small — 3.55″ × 5.07″, about A6
    — and 300 DPI over that geometry yields a 9-pixel interline. Filed as issue
    [#46](https://github.com/landfill/ClairKeys/issues/46).

  **The reproduction needs no special file.** Lowering `pdfResolution` on the existing A4 fixture
  reproduces it exactly: 100/120/150 all give `Sheet removed` (interline 7/8/10), 180 and above
  succeed. The failure threshold sits between 150 and 180, and the user's file at interline 9 is
  inside it. Issue #46 carries the measurements and three options; none is chosen.

  Also worth knowing: Audiveris **abandons the whole book if any one sheet is invalid**
  (`Could not export since transcription did not complete successfully`). Four pages failed here,
  but one would have been enough.

- **2026-08-23 — a failed upload shows the user a Java stack trace.** `omr-service/omr/audiveris.py:128-134`
  appends the entire Audiveris stdout to the exception, which becomes the job message and reaches
  the UI — over 200 lines in the observed case. The irony is that Audiveris states the cause in one
  plain sentence and this buries it. Filed as issue
  [#47](https://github.com/landfill/ClairKeys/issues/47). This is the opposite failure from the one
  this project kept fixing: not a failure disguised as success, but a failure disclosed in a form
  nobody can read.

- **2026-08-23 — upload works end to end in production, and the first real score exposed the next
  problem.** The user set `OMR_SERVICE_URL` and `OMR_SHARED_SECRET`, redeployed, uploaded a score,
  and confirmed the animation plays. Service logs show Vercel's AWS egress calling `/process` and
  `/status` with **zero 401/403**. This is the first time the Next.js half of D-011 has run against
  real Supabase rather than Jest mocks, and the first time `main` could talk to the service at all
  — before PRs #41/#42 merged it sent no auth header and read an `animation_data_url` the service
  no longer returns.

  **The rhythm does not match the score in places, and the cause is recognition, not conversion.**
  Audiveris was run directly on the VM to preserve the intermediate MusicXML, which turns out to be
  wrong before the converter ever sees it: **10 of 35 measures have lengths impossible in 4/4** —
  measures 1, 2, 4, 5, 6 and 19 advance 24 divisions where 16 is a full measure, 21/23/28 advance
  15, and 25 advances 18. A voice length of 24 is a measure and a half. WTK1 Prelude 1 is
  structurally identical across measures 1–34, so 29 clean measures beside 6 broken ones is a
  recognition failure, not a rule or edition difference — a rule problem would break all 35 the
  same way.

  The converter is not the cause. The 63-note gap between the MusicXML (577) and the JSON (514) is
  **exactly the 63 tie stops**, matching per voice (voice 5: 62, voice 7: 1) — merging tied notes
  into one sustained note is what PR #24 built and what a player actually does. Filed as issue
  [#44](https://github.com/landfill/ClairKeys/issues/44), which also records one thing genuinely
  untested: how the converter handles a measure whose voices disagree. `omr/cli.py` reproduces the
  service's exact output locally (514 notes, 73.875 s) from the preserved MusicXML.

- **2026-08-23 — PR #42 is verified against a live OMR service on the VM, and one of its own
  claims turned out to be false.** Built `clairkeys-omr:pr42` from `dcc946a` on the VM and drove
  the Bach WTK1 Prelude 1 PDF through `/process` → `/status` → `/result`. Three of PR #42's four
  "Not verified" items are now evidence: `/result` returns the payload (200, 45,580 bytes, 514
  notes — the same count as the 2026-08-21 run, so the conversion is unchanged), the shared secret
  gates all three endpoints at 401 while `/health` stays open, and **a job completes with no
  storage credentials present** where the identical job on the pre-change image failed at 80%.
  The gate is provable by comparison rather than assertion: the same unauthenticated `POST
  /process` returns **422 on the old image and 401 on the new one** — 422 meaning the old service
  accepted the request and only missed the multipart fields. The service wrote nothing at all
  (`find /data -type f` → 0 files).

  **The fourth item was wrong, not merely untested.** PR #42's review log said a restart between
  completion and collection "fails the row, which is correct but untested". After `podman restart`,
  `/status` returns 404, and `src/app/api/omr/status/[jobId]/route.ts:88-93` returns 502 for every
  non-ok status **without writing to the database** — so the row stays at `processing` with its
  `omrJobId` forever, which is exactly the stranded-row shape PR #41 exists to remove. It is not a
  regression PR #42 introduces (the pre-change service also lost in-memory jobs on restart); what
  is new is the claim that it is handled. The route never distinguishes "unreachable, poll again"
  from "the service answered and this job is gone" — only the second is safe to mark failed. There
  is no systemd unit, so a VM reboot does this to every in-flight job at once.
  Record: `docs/recovery/validation/2026-08-23-pr42-vm-verification.md`.

  **Fixed the same day in PR #41 at `1750ec5`, at the user's direction** — removing the stranded
  row is what #41 is for; #42 was only the run that exposed the second route into it. A 404 from
  `/status` now fails the row; 5xx, 401, 503, and an unreachable service leave the stored status
  untouched, because those are an operator mid-configuration rather than a lost job. The 404
  response is 200 with `status: 'failed'` so the poller takes the branch it already has for a
  service-reported failure instead of throwing a generic error. 7 regression tests written first,
  3 of which fail against the pre-change code; full suite 44 suites / 399 tests, 0 failures.
  #42's branch merged #41 cleanly at `f540752` and runs 45 suites / 405 tests, 0 failures.

- **2026-08-23 — correction: this machine does have an SSH path to the VM, and the clone is not
  where the resume steps said.** The 2026-08-23 note below claimed `~/.ssh` holds no NAVER key and
  `known_hosts` no matching entry. Both are wrong. `~/.ssh/ncp-aitestbed-user-555.pem` is an NCP
  key (the prefix is `ncp-`, not `naver-`, which is why a name search missed it), `known_hosts`
  contains `101.79.16.73`, port 22 is reachable, and
  `ssh -i ~/.ssh/ncp-aitestbed-user-555.pem root@101.79.16.73` returns
  `vm-naver-20260820145930` / `root` / `Rocky Linux release 8.8`. The user can still drive the VM
  themselves, but an agent on this machine is not blocked from it.

  The clone on the VM is at **`/opt/clairkeys`**, not `~/ClairKeys` — the step 1 command below
  checked the wrong path and would have reported the repository absent. It sits at `43a5b14` with
  three uncommitted modifications (`Dockerfile.audiveris`, `app.py`, `omr/storage.py`) whose
  working-tree blob hashes are **byte-identical to merged `main`**; they are the source of PRs
  #37/#38 and carry nothing unmerged. They were left untouched anyway — PR #42 was checked out into
  a separate worktree at `/opt/clairkeys-pr42`.

- **2026-08-23 — the OMR service is not reachable from Vercel, and no step in the resume list
  covers making it so.** The `contract-fix` container has been up for 45 hours bound to
  **`127.0.0.1:8000`** — loopback only. The VM has no nginx, no `/etc/letsencrypt`, no systemd unit
  for the service, nothing listening on 80 or 443, and only a bare public IP with no domain.
  Step 4 below says to set `OMR_SERVICE_URL` to "the VM's address", but there is no address that
  answers. Between verifying #42 and setting the Vercel variables there is a missing step —
  **expose the service** — and it is a decision, not a task: Let's Encrypt needs a domain the VM
  does not have, and plain HTTP would carry the shared secret across the internet in the clear.
  D-008 (hosting) is still `Proposed` and does not cover this. Per `AGENTS.md` a new
  `DECISIONS.md` entry is required before implementing whichever option is chosen.

- **2026-08-23 — the production upload symptom is fully explained, and the `animation-data` bucket
  exists after all.** The user reported that uploading on `clairkeys.vercel.app` created a
  `SheetMusic` row, returned `Internal server error`, and stored no file. All three are the
  undeployed OMR service: `curl https://clairkeys-omr.fly.dev/health` returns
  `curl: (35) schannel: failed to receive handshake`, so `fetch` throws rather than returning a
  non-ok response, which is why the message was the outer `catch`'s generic 500 and not
  `Failed to start OMR processing`. PR #41 makes that failure honest and stops it orphaning a row
  per attempt. **Correction to the 2026-08-21 record:** `GET /storage/v1/bucket` returning `[]` was
  the *anon key lacking list permission*, not a missing bucket. With `SUPABASE_SERVICE_ROLE_KEY`
  the same call returns all three buckets, and `animation-data` is present (public, 10 MB limit,
  `application/json` only). D-011's service-role upload therefore has a bucket to write to.
- **2026-08-23 — VM work will be driven by the user at their own terminal.** ~~this machine has no
  SSH path to it (`~/.ssh` holds no NAVER key and `known_hosts` has no matching entry)~~
  **— retracted the same day; see the correction entry above. The key is `ncp-aitestbed-user-555.pem`
  and root SSH works from this machine.** The user does have direct terminal access to the NAVER VM
  and can run deployment commands themselves. Vercel environment variables (`OMR_SERVICE_URL`, the shared secret) remain user-only in
  either case — the same shape as the 2026-07 Production Branch Tracking problem, and **production
  upload stays broken until they are set**, no matter what lands in this repository.

- **2026-08-21 — PRs #39, #37, and #38 are merged and `main` is fully green.** Merged in that order
  with the user's explicit approval: #39 first because its `Security Audit` fix was the only failing
  check on the other two, then #37 and #38 after their branches were updated from `main`. All
  post-merge checks on `3208488` report success — `Security Audit`, `Run Tests`, `E2E Tests`,
  `Lint`, `Post-merge build`, `Post-merge tests`. Every work branch tip, local and remote, is
  contained in `main` with 0 unique commits. PR #40 then merged at `fb9f45b`, also fully green,
  which cleared the last uncommitted change and allowed cleanup to finish. **All work branches are
  now deleted**, local and remote, after re-confirming 0 unique commits against `main` on every
  ref. That sweep also removed `codex/p1-omr-audiveris-runtime`, PR #36's branch, which still
  existed locally on this machine despite the 2026-08-02 note recording it as already gone — it was
  fully contained in `main`. `git branch -a` now lists only `main` and `origin/main`, and
  `git status --short` is empty.
- **2026-08-21 — the anon key cannot write to Supabase Storage, so the OMR service could never have
  stored a result.** With the project restored, a direct probe of
  `POST /storage/v1/object/animation-data/…` with `SUPABASE_ANON_KEY` returned **403 `new row
  violates row-level security policy`**, and `GET /storage/v1/bucket` returned `[]`. `storage.py:21`
  reads exactly that key, so the upload path was blocked by policy, not by configuration. This is
  the concealment chain's first link, and the rest is in code:
  `src/app/api/omr/status/[jobId]/route.ts:77-82` writes `omrStatus.result.animation_data_url`
  straight into `animationDataUrl` and **overwrites the user's title** with `result.title`, which
  before PR #38 was the PDF filename. Without PR #38 a deployment would have produced a successful
  upload, a `file://` URL persisted to the database, and a title replaced by a filename. PR #38
  breaks that at the first link — the job now fails.
  **Decision taken with the user (2026-08-21): the OMR service will not hold write credentials.**
  It will return the animation JSON and the Next.js side will store it with the
  `SUPABASE_SERVICE_ROLE_KEY` it already has, keeping the powerful key on Vercel. That needs a
  `DECISIONS.md` entry (D-011) committed in the same PR as its code, and it must land **after**
  #37/#38 to avoid re-writing `storage.py` twice.
- **2026-08-21 — both service defects are fixed and verified on the VM (PR #38).** Regression-first:
  `tests/test_service_contract.py` was written before the fix and aborted at import against the old
  code. After the fix, 18 tests pass. On the VM the same PDF binds all four form fields
  (`{'title': 'WTK1 Prelude 1', 'composer': 'J.S. Bach', 'user_id': 'test-user', 'sheet_music_id': '42'}`),
  and with `ENVIRONMENT=production` and no credentials the job now reaches `failed` at progress 80
  quoting the guard, writing no fallback file — where the identical run previously returned
  `completed`. An `ENVIRONMENT=development` control still completes with the `file://` URL, so the
  fallback is isolated rather than removed, matching `assertDemoGenerationAllowed()`. **A real
  Supabase upload is still unverified**: the project's Storage host returned `NXDOMAIN` from two
  independent networks during this work and the user reported it was down and being restored. Note
  also that **`omr-service/tests/*.py` is run by no CI workflow**, so these tests and PR #37's
  protect nothing automatically. Evidence:
  `docs/recovery/validation/2026-08-21-omr-service-contract-fixes-verified.md`.
- **2026-08-21 — the OMR service runs, and starting it exposed two defects that report success for
  work that did not happen.** `POST /process` accepted a real 2-page PDF and reached `completed` in
  about 25 seconds, using the host `/data` mount for scratch and invoking the packaged launcher.
  (a) `app.py:71-78` declares `title`, `composer`, and `user_id` without `Form(...)`, so FastAPI
  binds them as **query** parameters and silently drops the multipart fields
  `src/app/api/omr/upload/route.ts:77-82` actually sends — measured against a query-string control
  that returned all three correctly. `sheet_music_id` is not declared at all. A score is therefore
  stored under its PDF filename rather than the user's title. (b) `omr/storage.py` falls back to
  `_save_local_fallback` on missing credentials, on a non-2xx upload, **and on any exception**, and
  the job still reports `"Processing completed successfully"` with a `file:///tmp/results/…` URL
  that no browser can fetch. That is `AGENTS.md` § "금지되는 완료 상태" verbatim, and it is not a
  container artifact — an unreachable Supabase in production takes the same path. **Do not expose
  the service until (b) is fixed**: shipping it would replace P1-A's honest failure with a
  successful-looking, unplayable score. Neither defect has a fix yet and neither belongs in PR #37.
  Evidence: `docs/recovery/validation/2026-08-21-omr-service-first-run-defects.md`.
- **2026-08-21 — the OMR image was built and run for the first time, on a NAVER Cloud VM, and a real
  PDF converted end to end through the conversion pipeline.** This is the runtime evidence issue #22
  has been waiting for, and producing it found two defects no static check in this repository could
  see. (a) The official 5.11.0 `.deb`'s postinst runs `xdg-desktop-menu`/`xdg-mime`, which exit 3 in
  a minimal image and fail `dpkg --configure` for the whole package. (b) `libgtk-3-0` is absent from
  the `.deb`'s `Depends`, yet `WellKnowns.<clinit>` loads gtk-3 through JNA before any argument is
  parsed — so an image built from the previous Dockerfile would have failed **every** conversion in
  production while passing every check here, and `-batch` would not have avoided it. In both failure
  modes the payload unpacks and `test -x` on the launcher still passes. Fixed in PR #37, which also
  makes the build invoke `Audiveris -version`. Evidence: image `clairkeys-omr:5.11.0` (911 MB) built
  on the VM, in-build `-version` reporting Audiveris 5.11.0 / OpenJDK 25.0.3 / Tesseract 5.5.2, a
  Mutopia Bach WTK1 Prelude 1 PDF exported to `.mxl` and converted through `omr.cli` to 514 notes of
  animation JSON, and 11 passing Python tests. **Recognition accuracy is not claimed** — that PDF has
  no ground truth in `fixtures/`, so `compareAnimationData` cannot score it, and one sixteenth-note
  position in the opening bar looks empty. The FastAPI service, Supabase upload, and every Next.js
  end-to-end path remain unexercised, and nothing is deployed or exposed. Full record:
  `docs/recovery/validation/2026-08-21-issue-22-naver-vm-omr-runtime-proof.md`.
- PR #36 merged at `c8764ec` from verified head `4613e08`: Audiveris 5.11.0's Ubuntu package was downloaded and its
  release digest matched SHA-256
  `ae714594f40e54b1a4951fc3f914f08ae38fe5d07b7f2283b1a904fdb6e0a318`. The package includes its
  own Java 25 runtime and official `/opt/audiveris/bin/Audiveris` launcher but no OCR traineddata.
  The branch now accepts `.mxl`, passes a folder to `-output`, uses only the native processor,
  provisions English traineddata, serializes 3GB JVMs on a provisional 4GB VM, kills/reaps timed
  out or cancelled subprocesses, and rejects multiple `.mxl` results rather than storing a partial
  score. 42 Jest suites / 389 tests, 9 Python tests, py_compile, TypeScript, lint, and production
  build pass. PR CI, merge-commit required checks, and post-merge checks are green. Vercel
  Production deployment `5602694131` succeeded for the Next.js application. CodeRabbit's valid timeout findings were
  fixed; it withdrew its launcher-config objection after package evidence, while final independent
  review found zero actionable issues. **Not verified:** Docker build/run, real PDF conversion,
  Fly validation/deployment, production end-to-end. Evidence:
  `docs/recovery/validation/2026-07-26-issue-22-audiveris-runtime-repair.md`; review log:
  `docs/recovery/reviews/PR-36.md`.
- PR #26 local verification on `e175314`: 39 Jest suites / 362 tests passed; `npx tsc --noEmit`, repository lint, and production build passed; Chromium + Mobile Chrome Playwright smoke checks passed 6/6. Firefox/WebKit local projects could not run because their Playwright browser binaries are not installed. Authenticated live `/sheet/2` playback remains unverified. Full evidence: `docs/recovery/validation/2026-07-22-p0c-shared-clock-and-drift.md`; review log: `docs/recovery/reviews/PR-26.md`.
- PR #26 CI verification on `e175314`: `Run Tests`, both `E2E Tests`, `Lint`, `Lint and Type Check`, `Unit Tests`, `Security Audit`, `Security Scan`, `Build Check`, `Accessibility Check`, `CodeQL`, `All Checks Complete`, PR summary, and Vercel all passed. No actionable GitHub review was present at the final 2026-07-22 check. The PR merged at `157c3b4`; post-merge Tests run `29898010765` also passed all jobs.
- P0-D is `DONE`. `docs/recovery/phases/P0-D-quality-gates.md` records all four completion criteria met.
- Issue [#7](https://github.com/landfill/ClairKeys/issues/7) is `CLOSED`: PR #12 replaced the aspirational `piano-player.spec.ts`/`sheet-music-workflow.spec.ts` (dashboard/auth fixtures absent from the product) with `e2e/application-smoke.spec.ts`, 15 cross-browser public-route smoke checks. The `E2E Tests` check has passed on every subsequent `main` HEAD checked, including PR #12's own merge commit `271f4c6`.
- Issue [#9](https://github.com/landfill/ClairKeys/issues/9) is `CLOSED`: `main` branch protection is configured with required status checks `Lint`, `Security Audit`, `Run Tests`, `E2E Tests` (`strict: false`, `enforce_admins: false`). `gh api repos/landfill/ClairKeys/branches/main/protection` confirms this (previously `404 Branch not protected`). The agent's write attempt was blocked by the local auto-mode classifier as a repository-admin action; the user applied the payload directly via `gh api -X PUT`.
- Whether to additionally require pull requests / forbid direct pushes to `main` (issue #9's fourth checklist item) remains an explicit open decision, not yet made.
- PR #14 (P0-D closeout docs) and PR #15 (agent contract consolidation: sibling-project practices adopted into `AGENTS.md`/`WORKFLOW.md`/`LORE_COMMIT_PROTOCOL.md`, `CLAUDE.md` reduced to a pointer) were both merged with the user's explicit approval, checked out clean at merge time, and had their remote/local work branches deleted only after confirming both tips were included in updated `main`.
- Full evidence: `docs/recovery/validation/2026-07-20-p0d-branch-protection-and-issue-closeout.md`; PR review logs at `docs/recovery/reviews/PR-14.md` and `docs/recovery/reviews/PR-15.md`.
- RESOLVED (2026-07-25): **production now serves the P0-C fix and the user confirmed the 10-second cutoff is gone.** The user set the Vercel Production Branch and promoted a build. Agent re-verification: all 13 chunks served by `https://clairkeys.vercel.app/sheet/2` contain no `>10||` cap, and `AudioContext resume failed` / `Web Audio initialization failed` (PR #26 markers) are present in `1280-8b2efdae58a9ab51.js`. Production is running `main`, not the unmerged PR #27 branch — four of the 13 chunk hashes differ from the local `next@15.5.21` branch build. This also closes the authenticated live `/sheet/2` playback evidence gap open since PR #26. (That first restoration was a manual promote; automatic deployment was fixed separately later the same day — see Next actions 2.) Evidence: `docs/recovery/validation/2026-07-24-production-serves-pre-p0-bundle.md` § RESOLVED.
- HISTORICAL (2026-07-24, superseded by the entry above; kept because it explains how the gap went unnoticed): **production served a pre-P0 bundle, so issue #18 still reproduced for users.** The user reported audio stopping after ~10s on the deployed site while notes keep falling. The chunk served by `https://clairkeys.vercel.app/sheet/2` (`/_next/static/chunks/8327-78f4e1b75f62e239.js`) still contains the one-shot scheduler's `if(t>10||r<0)continue` cap and lacks every PR #26 marker, so it predates `7d0774a` (2026-07-21). Both deployment paths are broken: Vercel's Git integration has produced **only `Preview` deployments** for `main` (41 of them; zero Production-environment deployments in the last 100 records), consistent with the Vercel project's Production Branch never being moved off `master` after the DOC-1 rename `643ce71` (2026-07-19); and `deploy.yml`'s `Deploy to production` fails on every commit because `secrets.VERCEL_TOKEN` is absent, with `Run database migrations` failing on an empty `DATABASE_URL` (Prisma `P1012`). Fixing this needs Vercel/GitHub admin access the agent does not have. Full evidence: `docs/recovery/validation/2026-07-24-production-serves-pre-p0-bundle.md`.
- RESOLVED (2026-07-25) by PR #27; kept because the failure mode recurs. **The `Security Audit` required check went red again on `main`.** Direct handoff commit `f39fbb6` produced `Security Audit -> failure` while `Run Tests`, `Lint`, `E2E Tests`, `Build application`, and `Test before deploy` all passed. No dependency changed between `1e3d515` (green on 2026-07-22) and `f39fbb6`; `npm audit --audit-level high` (`.github/workflows/test.yml:173`, `.github/workflows/pr-checks.yml:213`) is time-dependent, so newly published advisories flipped it. Local `npm audit` reports 4 vulnerabilities: `next-auth <=4.24.14` **critical** (GHSA-xmf8-cvqr-rfgj uncaught exception on malformed Bearer headers, GHSA-7rqj-j65f-68wh homoglyph `@` bypass in the email normalizer, GHSA-x445-f3h2-j279 state/nonce/PKCE cookies not bound to the issuing provider), `postcss <=8.5.11` high via `next` (GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q), and `uuid <11.1.1` moderate. `next-auth`/`uuid` are fixable in-range via `npm audit fix`; `postcss` reports a fix only via `--force`, which would move `next` to `15.5.21`, outside the stated range — the same shape as PR #25's `sharp` problem, so an npm `overrides` pin is the likely bounded remedy. Because `Security Audit` is a required status check, this blocks the merge button for every future PR until resolved. **Addressed by open PR #27** (`next-auth` →4.24.15, `next` →15.5.21 patch bump, `postcss` overrides pin ≥8.5.12), which takes the local tree to 0 vulnerabilities; `uuid` was deliberately left alone as moderate-only and cleared incidentally. This is the second occurrence of the PR #25 failure mode and is a property of the time-dependent gate, not of any one dependency — expect it again.
- CORRECTED (2026-07-25): the 2026-07-24 claim that `public/sw.js` can serve a returning visitor the pre-fix JavaScript was **wrong**, and is retracted. `/_next/static/**` URLs are content-hashed, so a new build produces new URLs, every one of which is a cache miss; the stale entries are never requested again. `isExpired()` also returns `true` when `sw-cached-at` is absent, so the install-time `cache.addAll(['/', '/manifest.json'])` entries do not pin anything, and HTML is network-first regardless. The fixed `CACHE_NAME = 'clairkeys-v1'` does make the activate handler's cache eviction dead code, but bundle freshness was never resting on it. What remains real is narrower: non-hashed files under `public/` (`favicon.png`, `icon-*.png`, `icon-*.svg`, …) match the `\.(js|css|woff|…|png|svg)$` rule, which is cache-first with a one-year `maxAge` and stable URLs, so a changed icon can stay stale for up to a year. Low impact, still unfiled.
- CLEANUP COMPLETE: the user authorized deletion after confirming the untracked `fix_*.js` scripts, `ts_errors*.log`, disabled performance components, and Playwright `.last-run.json` were unreferenced local artifacts. All 16 files and their now-empty directories were removed. Local and remote `codex/p0-playback-sync-stages-4-5` refs were then deleted after both tips were re-confirmed in `main`; `git status --short` is clean.

## Resume here — next session: what #48 and #49 did *not* fix

Written 2026-08-23 after both fixes were built, verified, merged, and cleaned up. The section
that sent this session is kept below as `Resume here — 2026-08-23 (issues #49 and #48, completed)`.

### State

- **Both merged.** #50 at `210a021`, #51 at `64753d9`. Issues #48 and #49 closed automatically.
- Work branches and the three Orca worktrees are deleted. `main` is clean, is the only
  worktree, and its post-merge checks passed.
- Nothing is in flight. The next session starts from a settled tree.

### What landed in each PR

**[#50](https://github.com/landfill/ClairKeys/pull/50) — issue #49, OCR.** `Dockerfile.audiveris`
fetches the legacy+LSTM `eng.traineddata` from `tesseract-ocr/tessdata` 4.1.0 and pins its
sha256, overwriting the LSTM-only file the Ubuntu package installs. Checksum re-verified
independently by download (23,466,654 bytes, `daa0c97d…`). `tesseract-ocr-eng` stays for the
directory and configuration it provides.

**[#51](https://github.com/landfill/ClairKeys/pull/51) — issue #48, tempo. Records D-013.**
Contract `1.0` → `1.1`, reader accepts both. `tempo` is nullable, joined by `tempoSource`
(`score`/`user`/`unknown`), `timingReferenceBpm` (what actually baked the seconds), and
`scoreTempo`. `<beat-unit>`/`<beat-unit-dot/>` convert to quarter BPM. `/process` takes a
`tempo` form field; the upload form's input is optional. The player prints four visibly
different things instead of one number.

### The two facts that decide whether these can be merged separately

1. **#51's two halves cannot be split.** The Python half alone fails `converterCorpus.test.ts`
   14/14 because the old reader rejects version 1.1; the TypeScript half alone still receives
   120 from the converter. They are one commit for that reason.
2. **#50 and #51 are genuinely independent** and touch disjoint files. Either order works.

### What to do, in order

1. **#48 is closed by #51, but the thing underneath it is not.** A printed metronome mark is
   still never recognised. With OCR restored (#50), `<metronome>` was **still 0** on the same
   score and neither `Adagio` nor `60` appeared anywhere, though measure numbers 10/13/16/19/25/28
   were read. Every `ProcessingSwitch` was enumerated; none governs metronome recognition.
   **The cause is unexplained.** `tempoSource: 'score'` has therefore never been observed
   end to end — only proven correct on hand-authored MusicXML. If that matters to the user,
   it needs a new issue; do not fold it into #48's history as though #51 addressed it.
2. **Re-conversion is required for anything already stored.** Note seconds are baked at
   conversion, so an old upload keeps its current speed no matter what these PRs do. Anyone
   testing the fix against an existing score will conclude it failed. The user allowed
   re-conversion on 2026-08-23.
3. **The VM image was rebuilt on 2026-08-23 — this is done.** Deployed commit `cb42947`,
   image `clairkeys-omr:cb42947`/`:current`, 911 MB → 930 MB. The half-deployed state the
   earlier version of this section warned about was real and is now closed. Evidence:
   `docs/recovery/validation/2026-08-23-omr-image-rebuild-after-48-49.md`.

   What that rebuild proved, in production, that no PR could:

   | | before | after |
   |---|---|---|
   | `eng.traineddata` | 4,113,088 B (LSTM-only) | **23,466,654 B**, sha256 matches the pin |
   | `Could not initialize TessBaseAPI` / `No OCR'd lines` | present | **gone** |
   | `<credit-words>` on `love-affair.pdf` | none | title, subtitle, composer, arranger, bar numbers |
   | `grep -c "return 120"` in the container | 1 | **0** |
   | unmarked score | `tempo: 120` | **`tempo: null`, `tempoSource: unknown`** |
   | user tempo 72 | silently dropped | `tempo: 72.0`, `tempoSource: "user"` |
   | `tempo=abc` | ignored | **HTTP 400** |

   So **#50's one unverified link is closed** (the image builds, the checksum pin holds, and
   Audiveris actually reads text with the replacement model), and **#51 works end to end
   through the live service**.

   Still unverified: the browser round trip through the upload form. Only the service API was
   exercised.

4. **A new defect was found while deploying, and left unfixed on purpose:
   [#52](https://github.com/landfill/ClairKeys/issues/52).** `systemctl restart clairkeys-omr`
   exits nonzero every time — the first start dies at 125 on a cidfile race and `Restart=always`
   recovers it 100ms later. The unit is missing `ExecStartPre=/bin/rm -f %t/%n.ctr-id`. The
   service is fine; a deploy script reading the exit code is not. The repo's copy
   (`omr-service/deploy/clairkeys-omr.service`) is byte-identical, so fixing it is a branch/PR,
   not a handoff commit — which is why this session did not touch the production unit.

5. **Nothing detects deployment skew.** The rebuild closed today's gap but not the mechanism:
   Vercel redeploys itself on merge, the VM does not, and in between a user's tempo is accepted,
   validated, forwarded, and discarded with no error anywhere. A capability/version handshake
   with `/process`, or refusing a tempo the service will not honour, would make that visible.
   Not done, no issue filed — a candidate, not a decision.

### Still open, untouched by this session

Issues [#46](https://github.com/landfill/ClairKeys/issues/46) (small-page PDFs discarded at
`SCALE` — sits underneath the 메트로놈 문제: a sheet discarded at `SCALE` never reaches text
recognition at all), [#47](https://github.com/landfill/ClairKeys/issues/47) (Java stack trace
shown to the user), [#44](https://github.com/landfill/ClairKeys/issues/44) (recognised rhythm
wrong in 10 of 35 measures).

### How this session was run

Orca orchestration, run `run_6f9cddc08787`, three Codex workers in three separate worktrees:
`task_820672adfb46` (#49), `task_83abe2073ce4` (#48 Python), `task_8e7e2224a615` (#48 TypeScript).
The coordinator settled the tempo contract first and handed both #48 workers the same written
contract, because they could not see each other's code. Workers ran no git commands; the
coordinator integrated, verified, and committed. Both patches applied to one branch without a
single conflict.

## Resume here — 2026-08-23 (issues #49 and #48, completed)

Decided with the user 2026-08-23: **the next session takes issues #49 (OCR is dead) and #48
(playback tempo) together.** They are one story — the tempo is wrong because the printed
`♩ = 60` was never read — but they are two fixes in two different places, and #49 alone does not
close #48.

The prior resume section for this date is kept below as `Resume here — 2026-08-23 (completed)`;
every step in it is done.

### First prompt on the new machine — copy this

```text
AGENTS.md를 읽고 그 규약을 따른다.
그다음 docs/recovery/HANDOFF.md의 "Resume here — next session" 섹션을 읽고,
거기 적힌 순서대로 이어서 진행한다.

이슈 #49(OCR 사망)와 #48(재생 빠르기)을 함께 처리한다.
#49를 고쳐도 메트로놈 표기는 여전히 인식되지 않으므로, #49만으로 #48이 닫히지 않는다.
빠르기를 못 읽었을 때 120을 지어내지 않는 것이 #48의 핵심이다 (D-001, D-010과 같은 계열).
```

### State

- `main` is clean, no open PRs, no work branches. All of 2026-08-23's merges (#41, #42, #43, #45)
  are in and their branches deleted.
- Production upload works end to end and plays. What is wrong is the *content* of what plays.
- The VM runs `clairkeys-omr-prod` under systemd on `0.0.0.0:3000`; `omr-service/deploy/README.md`
  has the procedure and D-012 the exposure decision.

### What to do, in order

1. **Issue [#49](https://github.com/landfill/ClairKeys/issues/49) — OCR. Cause and fix are both
   already demonstrated; this is implementation, not investigation.**
   Ubuntu's `tesseract-ocr-eng` ships a 4.1 MB LSTM-only `eng.traineddata`; Audiveris initialises
   Tesseract in legacy mode and `TesseractOrder` exposes no constant to change that. Substituting
   the 23.5 MB legacy-capable file from `tesseract-ocr/tessdata` removed
   `Could not initialize TessBaseAPI` and `No OCR'd lines`, and read the printed credits correctly.

   The change is in `Dockerfile.audiveris` — fetch that file and pin its checksum, the same shape
   as the Audiveris `.deb` pin from PR #36. Image grows ~19 MB on 911 MB.

   **Regression evidence first**: the fixture to assert on is that a converted score carries
   `<credit-words>` at all. `omr-service/tests` runs in no CI workflow, so whatever is added there
   protects nothing automatically — say so rather than implying coverage.

2. **Issue [#48](https://github.com/landfill/ClairKeys/issues/48) — tempo. Two separable parts.**

   **(a) `beat-unit` is discarded — demonstrated, and independent of everything else.**
   `_extract_tempo` reads only the number in `<per-minute>`; `converter.py:183` assumes that number
   is quarter-notes per minute. Injecting three musically identical markings produced 2:27
   (`quarter`/60, correct), 1:13 (`eighth`/120) and 4:55 (`half`/30). Convert `<beat-unit>` and
   `<beat-unit-dot/>` to a quarter-note equivalent, and note that `_extract_tempo` returns `int`
   while the converted value need not be integral.

   **(b) Stop inventing 120, and let the user supply a tempo.** This is the part that actually
   fixes what the user hears, and it does not depend on OCR succeeding. `/process` already takes
   `title`, `composer`, `user_id` and `sheet_music_id` as multipart fields, so `tempo` is a
   symmetric addition. When no tempo is known, do not substitute 120 — the player prints
   `{composer} • {timeSignature} • {tempo} BPM`, so a fabricated number currently sits beside two
   measured ones in identical type. That is the D-001/D-010 defect at lower stakes.

   Precedence, if a printed marking is ever recovered: the user's explicit value should win, and
   the score's value should be shown to them rather than silently overridden.

3. **Do not expect (1) to close (2).** With OCR restored, `<metronome>` was still 0 on the same
   score, and neither `Adagio` nor `60` appeared anywhere, though measure numbers 10/13/16/19/25/28
   were read. Every `ProcessingSwitch` was enumerated; none governs metronome recognition. Why the
   marking is not assembled is **unexplained**, and nothing here should be written as though
   fixing OCR will reveal it.

4. **Re-conversion is accepted.** The user confirmed on 2026-08-23 that stored scores may be
   re-converted, so a fix does not have to be backward-compatible with already-stored animation
   JSON. Note times are baked in seconds at conversion, so stored scores keep their current speed
   until re-converted — anyone checking the fix against an old upload will conclude it failed.

### Reproductions available without any new file

- `/data/testpdf/wtk1-prelude1-a4.pdf` — A4, no tempo marking, 514 notes, 73.875 s at the default.
- `/data/testpdf/love-affair.pdf` — the user's score, prints `Adagio ♩ = 60`, 2 sheets, converts
  cleanly, produces no `<metronome>`.
- `omr/cli.py` reproduces the service's exact conversion locally from a `.musicxml`, which is how
  the `beat-unit` and tempo experiments were run without touching the service.
- Audiveris can be driven directly on the VM to keep the intermediate MusicXML:
  `podman exec clairkeys-omr-prod /opt/audiveris/bin/Audiveris -batch -export -output DIR -- PDF`

### Also open, not part of this session

Issues [#46](https://github.com/landfill/ClairKeys/issues/46) (small-page PDFs discarded at
`SCALE`), [#47](https://github.com/landfill/ClairKeys/issues/47) (Java stack trace shown to the
user), [#44](https://github.com/landfill/ClairKeys/issues/44) (recognised rhythm wrong in 10 of 35
measures). #46 sits underneath #48 in one respect: a sheet discarded at `SCALE` never reaches text
recognition, so a printed marking on such a file could never be read.

## Resume here — 2026-08-23 (completed)

This section is the immediate continuation point and takes precedence over the
numbered `Next actions` below, which describe the longer-lived backlog. It was
written so the work can be picked up on a different machine; everything it
refers to is committed and pushed.

### First prompt on the new machine — copy this

Paste this as the first message to the coding agent in a fresh clone. It is
kept here rather than in a separate file because this document is the canonical
entrypoint every session is already told to read, and because `AGENTS.md`
allows this file to be committed straight to `main` — a resume prompt is a
state record, not a change to the contract.

```text
AGENTS.md를 읽고 그 규약을 따른다.
그다음 docs/recovery/HANDOFF.md의 "Resume here — 2026-08-23" 섹션을 읽고,
거기 적힌 순서대로 이어서 진행한다.

지금 열려 있는 PR #41과 #42는 사용자의 명시적 승인 없이 병합하지 않는다.
업로드를 성공시키기 위해 데모 생성 경로나 fallback을 되살리지 않는다 (D-010).
NAVER VM은 사용자가 직접 터미널로 실행하므로, 실행할 명령을 주고 출력을 받아 판단한다.
```

Keep it short on purpose. The detail lives in this section and in
`docs/recovery/reviews/PR-41.md` / `PR-42.md`; a prompt that restates them
would go stale the moment either changes, and a session that reads a stale
prompt instead of the live document is worse off than one that reads nothing.

The two prohibitions are in the prompt rather than left to discovery because
both are decisions a fresh session has no way to infer: `AGENTS.md` records
that merge approval is the user's (D-005), and `DECISIONS.md` D-010 records
that visible upload failure is intended. An agent that finds a broken upload
and no context is very likely to "fix" it by restoring exactly what P1-A
removed.

### State

**Both PRs merged 2026-08-23** with the user's explicit approval — #41 at
`727031c`, #42 at `670201a`. All post-merge checks on `670201a` are green, every
branch tip was confirmed contained in `main` with 0 unique commits, and both work
branches are deleted local and remote. `git branch -a` lists only `main` and
`origin/main`; `git status --short` is empty. The state below is kept as the
record of what was merged.

- ~~Two review-ready PRs are open, and **both are waiting on the user's explicit
  merge approval**~~ — both merged; see above.
  - **#41** `codex/p1-upload-failure-visibility` at `48d123c`, with two commits
    added 2026-08-23: the 404-after-restart stranded row found by the #42 VM run
    (`1750ec5`), and CodeRabbit's `serviceUrl` finding — a malformed
    `OMR_SERVICE_URL` was reported as a transient outage rather than a
    configuration error (`48d123c`). 17/17 hosted checks pass on the head.
  - **#42** `codex/p1-omr-result-handoff` at `f328dc9`, **stacked on #41's
    branch**. Implements and records D-011, and has merged #41 twice so the stack
    carries both fixes. Merged-branch suite: 46 suites / 421 tests, 0 failures.
- **Neither PR has a complete automated review, and the green `CodeRabbit` check
  does not mean it does.** Only #41's `8629ead` was ever reviewed; every later
  push reported `Review skipped: manual review required for this OSS repository`,
  #42 was never reviewed at all (`Review limit reached` at creation), and a
  `@coderabbitai review` request on both returned `Review rate limited`. This is
  the same shape as the CI trap on #42 below — a check that is green because it
  did not run — and the third and fourth occurrence of the rate-limit pattern
  already recorded for PRs #34 and #35.
- `main`, and both work branches, are pushed with 0 unique local commits.
- Production upload is still broken, by design, and will stay broken until the
  VM serves the OMR service **and is reachable from Vercel** (step 4) and the two
  variables are set (step 5).

### The CI trap on a stacked PR — and the second trap under it

Resolved for #42 on 2026-08-23, but both halves will recur on the next stacked PR.

`.github/workflows/test.yml` and `pr-checks.yml` trigger on
`pull_request: branches: [main, develop]`, so while #42's base was a `codex/*`
branch **no test workflow ran on it at all** — only Vercel and CodeRabbit
reported. An empty check list on a stacked PR is not a passing check list.

**Retargeting to `main` does not fix that by itself.** This was written here as
though it did, and it is wrong. `pr-checks.yml` declares
`types: [opened, synchronize, reopened]`, and `test.yml` omits `types:` — which
defaults to exactly those three. Changing a PR's base fires `pull_request` with
action **`edited`**, which is in neither list. #42 sat at `BLOCKED` with three
checks and no way to progress until the PR was **closed and reopened**, firing
`reopened`. Pushing any commit would also work by firing `synchronize`;
close/reopen was chosen because it leaves no empty commit behind.

Once triggered, #42 passed all 17 checks on its first-ever workflow run.

Local verification for #42 is recorded in `docs/recovery/reviews/PR-42.md`.

### What to do, in order

1. ~~**Collect VM state.**~~ **DONE 2026-08-23.** State is in the entries above and in
   `docs/recovery/validation/2026-08-23-pr42-vm-verification.md`. Two things this step got wrong
   and the next session should not repeat: the clone is at **`/opt/clairkeys`**, not `~/ClairKeys`,
   and this machine **can** SSH to the VM
   (`ssh -i ~/.ssh/ncp-aitestbed-user-555.pem root@101.79.16.73`).

2. ~~**Verify #42 on the VM before asking for merge approval — not after.**~~ **DONE 2026-08-23**,
   at `dcc946a`, before the approval request. Three of the four "Not verified" items are closed;
   the fourth was a false claim, not an untested one. Full record:
   `docs/recovery/validation/2026-08-23-pr42-vm-verification.md`. The one finding it produced —
   the 404-after-restart stranded row — was **fixed in #41 at `1750ec5`** the same day, and #42
   merged that fix at `f540752`. Nothing from this step is still open.

   The `omr-pr42` container is still running on the VM at `127.0.0.1:8001` (loopback only) with
   its secret in `/root/.pr42-secret`, so it can be re-driven without a rebuild.

3. ~~**Merge order, once the user approves.**~~ **DONE 2026-08-23.** #41 at
   `727031c`, then #42 retargeted, its workflows run for the first time (17/17
   pass), merged at `670201a`. Branches deleted after confirming 0 unique commits
   on all four refs. **`gh pr edit --base main` alone did not start the
   workflows** — see the trap section above before repeating this on a stacked
   PR.

   `main` now carries the pieces that let Vercel talk to the service at all:
   `omrAuthHeaders()` sends `X-ClairKeys-Token`, the status route collects
   `/result` and stores it with `SUPABASE_SERVICE_ROLE_KEY` instead of reading
   the `animation_data_url` the service no longer returns, and a malformed
   `OMR_SERVICE_URL` is refused as a configuration error rather than reported as
   an outage. Before this merge none of that was true on `main`, so setting the
   Vercel variables would have produced 401s and rows marked `completed` with no
   animation data.

4. ~~**Expose the service**~~ **DONE 2026-08-23 — PR [#43](https://github.com/landfill/ClairKeys/pull/43)
   merged at `f55a4b4`.** The service is reachable at `http://101.79.16.73:3000`, managed by a
   systemd unit, and verified from a machine outside the VM: `/health` 200 without a token,
   `/process`/`/status` 401 without one and with a wrong one, and a full Bach WTK1 Prelude 1
   conversion returning 514 notes in 45,598 bytes with `/result` answering in 51 ms. D-012 records
   the decision; `omr-service/deploy/` holds the unit and the procedure. Details below are kept as
   the reasoning, not as outstanding work.

   **Still unobserved: a reboot.** Boot-time start is inferred from `systemctl is-enabled`
   (`enabled`, `default.target` → `multi-user.target`) plus a successful `systemctl restart`.
   Whoever is next on the VM should reboot it once and confirm the service returns.

   Original framing, retained because it explains the decision: the service bound
   `127.0.0.1:8000`; there was no nginx, no TLS certificate, no domain, no systemd unit, and
   nothing on 80/443. Until that was settled there was no value to put in `OMR_SERVICE_URL` in
   step 5, and no amount of merging would have changed it.

   **Decided with the user 2026-08-23: plain HTTP, no TLS, for the test phase.** This is a
   deliberate, recorded trade, not an oversight, and it needs a `DECISIONS.md` entry (D-012)
   committed with the code that implements it — D-008 does not cover this host.

   What the user weighed: this is a test deployment, not a live service. Two facts made the
   trade defensible rather than reckless. **D-011 already removed the credential that mattered**
   — the VM holds no Supabase key, verified 2026-08-23 by inspecting the container's environment,
   so plaintext exposes the shared secret, the PDF, and the animation JSON, but never
   `SUPABASE_SERVICE_ROLE_KEY`, which stays on Vercel. And both consequences are recoverable by
   reissuing the secret and restarting the container.

   What is being accepted, stated plainly so it is not rediscovered as a surprise: the shared
   secret crosses the internet in the clear, so an on-path observer can capture it and then drive
   `/process` — up to fifteen minutes of a two-vCPU box per call — and read any job's score from
   `/result`. `omr/auth.py`'s own reasoning ("the exposure worth controlling is an
   unauthenticated caller, not an eavesdropper") assumes the secret arrives safely; plaintext
   removes that assumption, so D-012 must say so rather than let the code's comment stand
   unqualified.

   **Exit condition for D-012**: before this is treated as a real service, move to TLS. The path
   was checked and costs nothing — `101.79.16.73.sslip.io` already resolves to the VM with no
   registration, ports 80 and 443 are already open in the ACG, and nginx would terminate TLS in
   front of a container that stays on loopback. Only `OMR_SERVICE_URL` changes; no application
   code does.

   Concrete shape agreed: bind the container to `0.0.0.0:3000` (already open in the ACG; 8000 is
   not, and 80/443 stay free for the TLS upgrade), giving
   `OMR_SERVICE_URL=http://101.79.16.73:3000`. Settle the systemd unit in the same PR —
   `podman generate systemd` or a quadlet — because without one a reboot drops the service and,
   per the 404-after-restart finding, fails every in-flight row. Generate a **fresh** secret;
   `/root/.pr42-secret` was used for verification and should be discarded.

   Hardening that costs nothing here: `GET /` answers 200 without a token (found 2026-08-23), so
   whatever fronts the service should not expose it.

5. **Vercel environment variables — user only, and they are a pair.** *(current step)*
   `OMR_SERVICE_URL = http://101.79.16.73:3000` **and** `OMR_SHARED_SECRET` (the exact value in
   `/etc/clairkeys-omr.env` on the VM; `omr-service/deploy/README.md` says how to read and rotate
   it). Setting them does not affect an existing deployment — Vercel applies environment variables
   at build time, so a redeploy of `main` is required after saving. `omrAuthHeaders()` returns `{}` when the secret is
   absent, so setting one without the other makes every call 401 and the
   symptom reads as a service bug. No code change can substitute for this step —
   it is the same shape as the 2026-07 Production Branch Tracking problem.

6. ~~**Only then is upload testable end to end in production.**~~ **DONE 2026-08-23 — upload
   works end to end, and the animation plays.** The user set the two Vercel variables, redeployed,
   and confirmed playback in the browser. That closes the last unexercised half of D-011: the
   status route really does fetch `/result` and store it with `SUPABASE_SERVICE_ROLE_KEY`, against
   real Supabase rather than a Jest mock. Service logs show the calls arriving from Vercel's AWS
   egress (`44.210.239.240`, `54.205.70.194`) with **zero 401/403** — the shared secret pair is
   correct.

   **Issue #22 is not closed by this.** Recognition accuracy is a separate question that has never
   been opened, and the first real upload opened it: see the entry below and issue
   [#44](https://github.com/landfill/ClairKeys/issues/44).

   Original wording:

   **Only then is upload testable end to end in production.** Do not report
   issue #22 closed, or upload fixed, before this step has actually run.

   **What step 6 exercises for the first time**: the Next.js half of D-011 — the status route
   fetching `/result` and storing it with `SUPABASE_SERVICE_ROLE_KEY`. Every verification so far
   covers the service half; that half has only ever run against Jest mocks, and no real Supabase
   upload has happened. A successful upload is therefore not the end of the check — confirm the
   row's `animationDataUrl` is non-empty and that the score actually plays, because the failure
   this project has repeatedly produced is a row marked `completed` with nothing readable behind
   it.

### Notes for a different machine

- `.env` is local-only and not in the repository. A fresh clone needs its own,
  with at least `DATABASE_URL`, `NEXTAUTH_*`, the OAuth pairs,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY`. `AGENTS.md` § Project Reference lists the full
  set. Leave `OMR_SERVICE_URL` unset locally — PR #41 makes an unset value fail
  fast and explicitly, which is the honest local state until step 4.
- The Jest baseline on a machine without Python is **13 failures**, and they are
  environment dependent: 10 `converter corpus` cases plus the `.mxl` CLI case
  (all need Python), `omrRuntimeContract`, `prChecksWorkflow`, and one
  `uploadPathInventory` demo-writer assertion. Compare any new run against that
  set rather than against zero; CI has Python and is greener.

  **Confirmed 2026-08-23: on a machine *with* Python the baseline is zero.** This
  machine has Python 3.14.3 and the full suite runs 44/399 (on #41) and 45/405
  (on #42) with no failures at all, and `tsc --noEmit` exits 0 rather than
  reporting the 2 errors recorded earlier — those came from a stale `.next`
  validator reference. So the number to compare against is a property of the
  environment, not of the repository. Check `python3 --version` before reading a
  failure count as a regression.
- `jest.setup.js:103` replaces `global.File` with a class that is not a `Blob`,
  so `FormData.append` stringifies it and a route sees no filename. Route tests
  that post a file must import `File` from `node:buffer`. Do not change the
  global mock — the rest of the suite depends on it.

## Next actions

0. **Recognition quality is now the live problem, and it is what the next session takes.**
   Added 2026-08-23, after production upload started working. Ordered by how settled each one is:

   | Issue | State |
   |---|---|
   | [#49](https://github.com/landfill/ClairKeys/issues/49) OCR completely dead | **Cause and fix both demonstrated** — implementation only |
   | [#48](https://github.com/landfill/ClairKeys/issues/48) tempo | Part (a) `beat-unit` demonstrated; part (b) is a product decision, already framed |
   | [#46](https://github.com/landfill/ClairKeys/issues/46) small-page PDFs discarded | Reproduction and threshold measured; three options, none chosen |
   | [#47](https://github.com/landfill/ClairKeys/issues/47) stack trace shown to the user | Cause obvious, one line; no design question |
   | [#44](https://github.com/landfill/ClairKeys/issues/44) recognised rhythm wrong | Diagnosed as an Audiveris recognition failure; no fix identified |

   #49 and #48 are the current session's scope — see `Resume here — next session` above. #44 is the
   least tractable: no PDF in this repository has ground truth, so "wrong" is currently measured
   against 4/4 arithmetic and a piece whose measures are structurally uniform.

1. **The last P1-A item: the `provenance` backfill (D-010 decision 5).** Work stages 1–5 are merged and live; the writers are closed, which was the precondition for counting. What remains, in its own PR: add a `provenance` column (`'omr' | 'demo' | 'unknown'`, default `'unknown'`); run a read-only script that narrows candidates with `omrJobId IS NULL AND animationDataUrl <> ''`, then fetches each candidate's stored JSON and matches `notes` against `pdfParser`'s three fixed melodies; mark `'demo'` **only on a content match**; disclose `'demo'` scores on the playback screen and exclude them from `/api/sheet/public`. **`'unknown'` triggers nothing** — the filter alone also matches rows written by `POST /api/sheet` and `SheetMusicRepository.create`, and hiding a user's real score on a guess is its own harm. Needs real-data access, so it needs the user's approval before running. Do not delete rows: they carry user-chosen titles, categories, and `PracticeSession` history.
2. **Issue #22 — the runtime now provably works; the service around it does not yet exist.**
   Updated 2026-08-21. The image builds, Audiveris starts, and a real PDF converts end to end on
   the NAVER Cloud VM (PR #37). What is still missing before issue #22 can close: the FastAPI
   service has never been started, Supabase upload is unconfigured and untested, and no
   `/api/omr/upload` → status path has run against a live service. Deployment itself has not begun
   — no systemd unit, no nginx, no TLS, no authentication, and `OMR_SERVICE_URL` still defaults to
   the dead `https://clairkeys-omr.fly.dev` in `src/app/api/omr/upload/route.ts:6` and
   `src/app/api/omr/status/[jobId]/route.ts:7`. **Recognition accuracy is a separate, unopened
   question** — no PDF in this repository has ground truth, and `e2e/fixtures/sample-sheet.pdf` is
   a 468-byte synthetic file that draws text, not a score. Historical framing of the repository
   repair follows.

   **Issue #22 — repository repair is PR #36; runtime proof still remains.** The 2026-07-25 audit
   found four causes rather than the issue's original two. PR #36 addresses all four and also fixes
   review findings: concurrent 3GB JVMs on one 4GB VM, silent first-file selection when Audiveris
   emits multiple `.mxl` results, unbounded subprocess waits, and orphaned child processes on caller
   cancellation. Final head `4613e08` is locally verified, independently reviewed, and green across
   hosted repository CI; it merged at `c8764ec`. Full implementation evidence:
   `docs/recovery/validation/2026-07-26-issue-22-audiveris-runtime-repair.md`.

   Confirmed as filed: (a) `Dockerfile.audiveris` installs no JRE or Audiveris — and the unused `omr-service/Dockerfile` installs a JDK but writes `/opt/audiveris/bin/audiveris` as a shell script that echoes "Audiveris placeholder", the same shape as the `pdfParser` stub P1-A just removed; (b) `app.py:24-33` picks the processor at import time, and `audiveris_docker` imports only stdlib so it always wins, then fails on `docker run` with no daemon.

   The previously unresolved packaging question is closed: the official 5.11.0 `.deb` bundles Java
   25 and installs `/opt/audiveris/bin/Audiveris`; its real JAR is under `lib/app`, not either path
   the old code searched. It bundles Tesseract native libraries but no language traineddata.

   PR #36's locally provable parts carry regression evidence through `omr/cli.py` and mocked native
   launcher behavior. The image installs the checksum-pinned `.deb` and English traineddata without
   a redundant system JRE; `fly.toml` is 4GB and the packaged launcher config is rewritten to 3GB.
   Those deployment values remain static contracts only.

   Do not close issue #22 on repository CI alone. Docker build/run, real PDF conversion, Fly
   deployment, and `/api/omr/upload` → status end-to-end remain unverified. D-008 hosting is still
   `Proposed`; issue #22 remains open until that runtime proof exists.

   Historical context of how P1-A got here: `src/app/api/__tests__/uploadPathInventory.test.ts` pins that only `/api/omr/upload` converts a score, while `/api/upload-async` (`MultiStageUploadUI`), `/api/processing` (`BackgroundFileUpload`), and the caller-less `/api/upload` all reach `pdfParser.createEnhancedDemo()` — which picks a canned melody by `bufferLength % melodyVariations.length` and never opens the PDF — then persist it as an ordinary `SheetMusic` row with no marker. D-001 forbade this on 2026-07-19 and the code never followed it. Stage 2 records D-010: `/api/omr/upload` is canonical, `/api/upload` and `useFileUpload` are deleted, the two async paths keep their progress UI for P1-B but lose persistence, and `pdfParser`'s demo generation is isolated for development rather than removed. **Accepting D-010 means upload visibly fails until issue #22 is fixed** — the canonical path cannot run Audiveris on a Docker-less host. That is the end of a concealment, not a regression. Evidence: `docs/recovery/validation/2026-07-25-p1a-upload-path-inventory.md`.
3. **Needs the user's ear, not code: the two timbre defaults.** PR #30/#32/#33 all shipped and are live in production. `DEFAULT_MASTER_GAIN` (`src/hooks/useFallingNotesAudio.ts:54`, currently `0.22`) and `DEFAULT_TREBLE_ROLLOFF` (`src/utils/pianoTimbre.ts:62`, currently `3.2`) are still provisional. Both are exposed as live sliders on the playback screen whose readouts are exactly these values, so the remaining work is: listen, pick, then a small PR fixing the constants. No agent can settle this — jsdom has no Web Audio and no offline renderer is installed, so every timbre claim to date covers the coefficients fed to `PeriodicWave`, not the rendered sound.
4. Optional, low impact: give non-hashed `public/` assets (favicon, icons) a shorter `maxAge` or a revalidating strategy in `public/sw.js`. The larger "stale bundle" framing of this item was retracted on 2026-07-25 — see the corrected entry above before spending effort here.
5. **RESOLVED (2026-07-25): `main` now deploys itself.** The user changed Vercel's Production Branch Tracking from `master` to `main`, and the very next `main` push (`3659db8`) produced the **first Vercel-created `Production` deployment in the repository's history** — `state=success`, creator `vercel[bot]`, and `https://clairkeys.vercel.app/sheet/2` returns 200. The `deployments` API environment list went from `["Preview","production"]` to `["Preview","Production","production"]`; the capital-P `Production` entries are Vercel's real deployments, while lowercase `production` are the failing Actions jobs PR #29 removes. A merge to `main` can now be treated as shipping. Original diagnosis retained below.
   - ROOT CAUSE (confirmed 2026-07-25 from the Vercel dashboard): Production Branch Tracking had been left on `master`. "Every commit pushed to the `master` branch will create a Production Deployment" — but GitHub has had no `master` since the DOC-1 rename `643ce71` (2026-07-19), so every `main` push builds as Preview only. This one setting explains the zero Production-environment deployments, `clairkeys.vercel.app` frozen on a pre-rename build, and the green `Vercel` PR check that only ever meant the Preview build succeeded. **Fix: change that field to `main` in Vercel → Settings → Environments → Production → Branch Tracking** (dashboard action, user only). Until then `main` does not deploy itself and every release needs a manual promote. Tracked in issue #28; the repository-side half is PR #29.
6. P0-B leftovers remain non-blocking: cross-staff/missing-hand fallback is corpus-covered but not separately documented; ties spanning >2 measures and same-measure conflicting per-part tempos are untested (see `docs/recovery/reviews/PR-24.md`).
7. OMR pipeline defects: issue #20 (TS demo stub) is now **inside P1-A's scope** — D-010 stage 4 isolates `pdfParser`'s demo generation, which is what #20 asks for. Issue #22's repository repair is PR #36; Docker/Fly/runtime proof remains open. Hosting choice D-008 remains `Proposed`.
8. If the direct-push policy for `main` is decided, extend the branch protection payload with `required_pull_request_reviews` / `restrictions` accordingly.

## Session handoff — 2026-08-21

The OMR service is being deployed for the first time, on a NAVER Cloud Platform VM
(`vm-naver-20260820145930`, KR-1, Rocky 8.8, 2 vCPU, 15Gi RAM). **This is not a migration from
Fly.io** — `omr-service/fly.toml` was written but never deployed, so there is no running service to
move. The Next.js application stays on Vercel; only the OMR service moves.

Rocky 8.8 forces the container route: Audiveris 5.11.0 ships no `.rpm` (only Ubuntu `.deb`s), and
the system Python is 3.6.8 against `pydantic==2.5.0`'s 3.8 floor. podman 4.4.1 is installed and the
image is built.

Decisions taken with the user on 2026-08-21:

- Deploy behind nginx on port 80 with a shared-secret header now, and move to Let's Encrypt over a
  wildcard-DNS hostname (`sslip.io`-style) later. No domain is owned. The later step is a strict
  superset — certbot needs port 80 anyway — so nothing done now is thrown away.
- **The shared secret is not optional.** SELinux is `Disabled` and firewalld is `inactive`, so the
  NCloud ACG is the only control on a public IP. TLS would protect a threat that is not present
  here; the token protects the one that is — an unauthenticated `/process` that spends 15 minutes of
  a 2-vCPU box per request.
- Memory stays at `-Xmx3G` for now despite 15Gi being available, so the deployment proves the
  shipped contract rather than a variant. Tune after real conversions, not before.

Constraints for the next session:

- **Do not close issue #22 on PR #37.** The image runs; the service does not exist yet.
- **Do not report recognition accuracy** from the 2026-08-21 record. The mechanism is proven; the
  quality is unmeasured and one note position already looks suspicious.
- `omr-service/tests/test_audiveris_runtime.py` still asserts `memory = "4gb"` from `fly.toml`.
  Removing `fly.toml` breaks the suite, and replacing it needs a D-008 revision — which is a
  decision record, so it belongs in a PR alongside the code, not a direct `main` commit.
- The VM is expected to expire about one month from 2026-08-20 and may return with a different IP.
  Capture provisioning as a re-runnable script rather than typed commands.
- The VM's public IP is deliberately absent from this public repository while the host has no
  OS-level firewall. Look it up in the NCloud console by resource name.

## Session handoff — 2026-07-26, to a different agent

PR #36 merged at `c8764ec` from its verified head `4613e08`. Local validation, independent review,
PR CI, merge-commit required checks, post-merge tests/build, and the Next.js Vercel Production
deployment are green. CodeRabbit's final-commit review was rate limited, but its prior valid
findings are fixed and its incorrect launcher-config finding was withdrawn. The separate Fly OMR
image still has no build, deployment, real-PDF, or production end-to-end evidence, so issue #22
remains open and upload failure must not be concealed with demo output.

Three constraints remain load-bearing:

- **Upload failure remains expected until the OMR service is separately deployed.** PR #36 is in
  `main`, but Vercel does not build or deploy the Fly OMR service. Do not restore demo output to
  make upload look successful.
- A green repository PR does not prove the OMR image. Docker build/run, real PDF conversion, Fly
  deployment, and production end-to-end remain separate evidence.
- Do not close issue #22 or call production upload fixed until those runtime checks pass.

## Local worktree state

Updated 2026-08-21, after PRs #39/#37/#38/#40 merged. `git status --short` is empty and
`git branch -a` lists only `main` and `origin/main`. `/playwright-report/` and `/test-results/` are
now ignored (PR #40), so a Playwright run no longer produces worktree state that reads as
user-owned and blocks branch cleanup — the condition that stalled cleanup on 2026-07-26 and again
on 2026-08-21. `.omx/` remains an ignored local runtime directory; tracked
`.claude/settings.local.json` and `prisma/schema.prisma` are unchanged. `.omx/` remains an ignored local runtime directory; tracked
`.claude/settings.local.json` and `prisma/schema.prisma` are unchanged. Previously listed
`.claude/settings.json`, `docs/.bkit-memory.json`, and `docs/.pdca-status.json` do not exist in this
checkout.

**PR #36 branch cleanup is complete.** Before deletion, `git merge-base --is-ancestor
origin/codex/p1-omr-audiveris-runtime origin/main` exited 0 and `git rev-list --count
origin/main..origin/codex/p1-omr-audiveris-runtime` was 0, so tip `4613e08` carried no commits
outside `main`. The local branch no longer existed; the remote ref was deleted and pruned. `git
branch -a` now lists only `main` and `origin/main`, and local `main` matches `origin/main` at
`5196754` with 0 commits either way. Deleting the branch was not a status change for issue #22 —
the merged code is in `main`, and the Fly OMR runtime proof is still missing.

## Product-critical follow-up order

P0-A는 파일 범위가 겹치지 않으면 P0-D와 병렬로 시작할 수 있다. 이후 핵심 제품 작업은 다음 의존 순서를 유지한다.

1. P0-A: canonical animation contract와 양손·다성부 golden fixture
2. P0-B: MusicXML 박자/voice/staff/backup 변환 정확도
3. P0-C: AudioContext 기준 시계와 애니메이션 동기화

P0-A/P0-B/P0-C/P0-D는 모두 `DONE`이고, 2026-07-25 기준으로 이 성과가 마침내 프로덕션에 반영됐다 — 사용자가 `/sheet/2`에서 10초 끊김이 사라진 것을 확인했고, 에이전트도 서빙 번들에 `>10` 상한이 없음을 확인했다. 첫 복구는 수동 promote였으나, 같은 날 Vercel의 Production Branch Tracking을 `master`에서 `main`으로 바로잡아 **자동 배포도 복구됐다** — `3659db8` 푸시가 이 저장소 최초의 Vercel 생성 `Production` 배포를 만들었다. 이제 `main` 병합은 배포로 이어진다. PR #27이 병합되어 `Security Audit` 게이트도 `main`에서 초록이다.

P0가 전부 닫히면서 다음 단계는 **P1-A(업로드 경로 단일화)** 이고, 2026-07-25 하루에 stage 1~5가 모두 병합됐다(PR #34 `aca4073`, PR #35 `317dad2`). 첫 조사에서 드러난 사실은 로드맵이 예상한 것보다 무거웠다 — 네 업로드 경로 중 실제로 악보를 변환하는 것은 `/api/omr/upload` 하나뿐이고, 나머지 셋은 PDF를 열지도 않은 채 파일 크기로 고른 데모 멜로디를 실제 악보와 구분 불가능한 형태로 저장했다. D-001이 2026-07-19에 금지한 동작이 1년 가까이 코드에 남아 있었던 셈이다.

이제 그 능력은 제거됐다. `prisma.sheetMusic.create` 호출 지점은 여섯에서 셋으로 줄었고 그중 어느 것도 데모 생성기에 닿지 않는다. **대신 업로드는 이슈 #22가 해소될 때까지 눈에 보이게 실패한다** — 사용자가 명시적으로 승인한 결과이며, 회귀가 아니라 은폐의 종료다. 데모 경로가 가려주던 고장이 이제 그대로 드러난다는 뜻이므로, 다음 세션이 이를 되돌리려 해서는 안 된다.

P1-A에 남은 것은 완료 조건 하나다: 이미 저장된 행에 대한 `provenance` backfill(D-010 decision 5). 실데이터 접근이 필요하므로 사용자 승인 아래 별도 PR로 수행한다.
