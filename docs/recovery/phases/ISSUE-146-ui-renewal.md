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
