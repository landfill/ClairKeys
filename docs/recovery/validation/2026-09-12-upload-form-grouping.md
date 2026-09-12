# Upload form grouping — local validation

Date: 2026-09-12
Branch: `codex/issue-146-upload-form-grouping`
Commit: `e3d5d325cb37821f112ef6ca660f9e9e08c74800`
PR: https://github.com/landfill/ClairKeys/pull/157
Scope: issue 146 stage 3, upload form only. The explore screen shipped separately in PR155.

## Regression evidence preceded the change

Tests were written and run against the unmodified component first.

jest (`src/components/upload/__tests__/OMRUploadForm.test.tsx`), before implementation:

- 3 failed, all on the audited defect — no labelled grouping existed at all:
  `세 덩어리로 나뉘고 각 덩어리에 이름이 있다`, `필수 항목과 선택 항목이 서로 다른 덩어리에 있다`,
  `파일과 그 거부 사유는 같은 덩어리에 머문다`.
- 24 passed, including the new `덩어리를 나눠도 컨트롤 구성과 순서는 그대로다`. That one is an
  invariant guard, not a defect reproduction, so it is green on both sides by design — it pins the
  eight controls and their DOM order, which is what "fields must not change" actually means.

Playwright (`e2e/upload-form-grouping.spec.ts`), before implementation:

- 6 viewport cases failed on `getByRole('group', { name: '악보 파일' })` — no group roles existed.
- `puts 곡명 and 저작자 side by side on a wide screen` failed: the two inputs' tops differed by
  94px at 1280×720, i.e. they were stacked.
- `stacks 곡명 and 저작자 on a narrow screen` and `keeps a visible focus ring` passed before and
  after. Narrow stacking and the global focus ring were already correct and had to stay correct.

After implementation: jest 27/27, Playwright 155/155 across five browser projects.

## Geometry, measured in Chromium before and after

| Viewport | Drop zone height | 곡명 input top | Form height |
|---|---|---|---|
| 320×800 | 220 → 188 | 599 → 611 | 1184 → 1224 |
| 390×844 | 196 → 144 | 555 → 547 | 1124 → 1160 |
| 844×390 | 176 → 144 | 535 → 547 | 1016 → 986 |
| 1280×720 | 176 → 144 | 535 → 547 | 1016 → 986 |
| 1440×900 | 176 → 144 | 535 → 547 | 1016 → 986 |

The drop zone shrank everywhere. The form got 30px shorter on wide screens because the two-column
row removes one field row; it got 36–40px taller on narrow screens because two extra group headings
were added and there is no column to collapse. The required field's position moved by at most 12px.

This is recorded rather than summarised as "the form was compressed", because it was not — only the
drop area was, and the labelled groups spent part of that saving. The first attempt spent all of it:
group description paragraphs added at first pushed 곡명 from 535px down to 579px, undoing the
compression. Those paragraphs were copy no phase document asked for and were removed.

## A defect the measurement exposed, fixed before submission

Adding `<fieldset>` introduced a horizontal overflow: at 320 CSS pixels the document measured 386px
against a 320px viewport. The overflowing box was the `선택 설정` fieldset at 345px wide.

Cause: the UA stylesheet sets `min-inline-size: min-content` on `fieldset` and on nothing else, and
Tailwind preflight does not reset it. The min-content width of the tempo row (`flex gap-2` holding
the BPM input and the beat-unit select) therefore became the group's floor. `min-w-0` on all three
fieldsets overrides it. This is invisible without measurement, which is why the E2E is not optional
for this slice.

## WebKit CSS zoom: confirmed pre-existing, not introduced here

In webkit and Mobile Safari, and only in the CSS-zoom-200% case, `documentElement.scrollWidth`
reported 1982 against a 1440px viewport while `body.scrollWidth` reported 991 at the same instant —
991×2, i.e. the pre-scale coordinate space rather than a real overflow.

This was not assumed to be pre-existing. `origin/main` at `64989c7` was checked out into a separate
worktree, built, served on port 3100 and measured in the same WebKit build:

| Build | clientWidth | documentElement.scrollWidth | body.scrollWidth |
|---|---|---|---|
| clean main `64989c7` | 1440 | 1982 | 991 |
| this branch | 1440 | 1982 | 991 |

Identical. The zoom case therefore asserts `body.scrollWidth`, which is the accurate measure on this
page; the five non-zoom viewports still assert both. The reasoning is in the spec's comment so the
next reader does not have to rediscover it.

## Commands and results

| Command | Result |
|---|---|
| `npx jest src/components/upload/__tests__/OMRUploadForm.test.tsx` | 27/27 pass |
| `npx playwright test` | 155/155 pass, 5 browser projects |
| `npm run lint` | 0 warnings, 0 errors |
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | success |
| `npx jest` | 1010 passed, 1 failed |

The single unit failure is `src/ci/__tests__/omrCallbackDelivery.test.ts`, which shells out to a
Python suite and fails with `ModuleNotFoundError: No module named 'fastapi'` on this machine. It is
an environment gap unrelated to this change — the CI job installs the dependency and is the
authority for that suite, as recorded for PR155.

## Not verified

Real device touch, the browser's own zoom (CSS zoom does not re-evaluate media queries), screen
reader output, measured colour contrast, and the real sign-in flow. The E2E mints a session cookie
to render the page (D-058) and asserts nothing about authentication.
