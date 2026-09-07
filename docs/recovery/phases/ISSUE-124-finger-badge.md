# ISSUE-124 — Contained and readable finger badges

Status: `IN_PROGRESS`
Depends on: D-037, D-038 (display rule amended by D-055)

## Objective

Keep active-note finger badges inside their own notes without changing musical data or keyboard geometry.

## Work stages

1. Reproduce overflow at white-key widths 10.8/24/24.46/36px and short durations before implementation.
2. Apply D-055 rectangular badge geometry, readable font/contrast and display threshold.
3. Verify actual rendering in desktop and mobile landscape browser viewports using a real-score fixture.
4. Run focused/full Jest, typecheck, lint and build; create a review-ready PR and handle CI/review.

## Completion criteria

- Badge rectangles remain inside both white and black notes; 0.1s at 140px/s fits when width permits.
- Width below 10px or height below 14px omits only the label, preserving notes and finger data.
- Renderer consumes bounded width/height/font and removes the overflowing text shadow.
- Browser screenshots and DOM bounds corroborate the regression cases. No human performance claim.
- Required checks pass, review findings addressed and explicit PR merge approval received before delivery.
- #146 follows this phase; no score panel, fingering inference or playback timing changes here.
