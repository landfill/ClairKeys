# ISSUE-146 — UI renewal without feature expansion

Status: `IN_PROGRESS`
Base: existing main behavior; PR147 is withdrawn and must not be included.

## Objective

Improve the confirmed UI problems from the 2026-09-07 audit while preserving existing routes,
queries, actions, upload contract, note numbers, playback timing and musical data.

## Work stages

1. First reviewable slice: remove duplicated sheet-card padding, use content-sized grid columns,
   preserve management action readability, align the mobile sort control, and fill the empty home
   result area with a static capture of the existing player components and repository home sample.
2. Separate subsequent slice: keep the existing playback controls discoverable across play/pause;
   review orientation/state decisions before implementation. No label suppression or score panel.
3. Subsequent slice: align explore cards and upload form spacing with existing design tokens.
4. Verify existing states and responsive behavior, including keyboard focus and zoom.

## First-slice completion criteria

- Long-title cards and all existing management actions remain readable at 390/768/1280/1440px.
- Card actions, confirmations, availability states, search and sorting preserve their existing behavior.
- Mobile select arrow stays inside the select; upload action does not cover card management actions.
- Home shows a clearly labeled static practice example, with no player/audio mounted, no operational
  account data, no backend request and no new interactive feature. Preserve primary CTA and first-screen layout.
- Regression evidence precedes behavior changes; local tests/type/lint/build and hosted checks pass.
- Scope remains in review until explicit PR merge approval; #146 is not closed by this slice.

## Validation limits

Browser visual inspection and layout bounds are not human readability or learning-outcome measurements.
Static image source is the existing HOME_SAMPLE_ANIMATION fixture, not a claim of OMR accuracy.

## Progress

- 2026-09-07: First slice approved and merged in PR148 as a1a84da385d47e00ce9469dcd274ed2af443efa4.
  Exact-SHA Vercel Production deployment succeeded; live home and static artifact verified.
  Local 977 tests/type/lint/build and final PR CI/E2E passed. Post-merge checks tracked in PR148 log.
  Phase remains IN_PROGRESS for stages2–4. No note-label or playback behavior change in this slice.

- 2026-09-11: PR150's session/pause change is already merged. Remaining narrow desktop seek
  defect was recovered locally after cloud setup failures and submitted in PR152. Local995 Jest,
  60 E2E,type/lint/build pass; hosted gates/review remain tracked in PR152 log. No issue completion.

- 2026-09-12: PR152 explicitly approved and merged as e652c64. Narrow fine-pointer seeking,
  speed width and keyboard focus fixes are in main. Explore/upload refinements remain; issue146
  stays open. Post-merge verification is recorded in validation/2026-09-12-feature-merges.md.

- 2026-09-12: All six exact-merge checks passed for PR152. Exact-merge Vercel Production succeeded
  and public CSS delivery was verified. Remaining explore/upload work keeps this phase IN_PROGRESS.

- 2026-09-12: GitHub issue146 progress synchronized with PR148/150/152 delivery. Playback-transition
  criterion marked complete; issue remains OPEN for explore/upload and remaining UI checks.

- 2026-09-12: Stage3 explore slice submitted as [PR155](../reviews/PR-155.md). The three sections now
  share one field order, the non-existent preview placeholder is removed rather than resized, cards
  became real links, three handler-less `전체 보기` controls were removed and the palette is fully
  tokenised. The 3/4/8 sections and their data order are preserved and now asserted. Regression test
  preceded implementation: 5 of 8 cases failed on the audited defects before the fix. New
  `e2e/explore-cards-responsive.spec.ts` measures 320/390x844/844x390/1280x720/1440x900 and CSS zoom
  200% in five browser projects and caught a document overflow this branch had introduced, confirmed
  against clean main before repair. Evidence: [explore card validation](../validation/2026-09-12-explore-cards.md).
  Upload form spacing remains outstanding, so this phase stays `IN_PROGRESS`.
