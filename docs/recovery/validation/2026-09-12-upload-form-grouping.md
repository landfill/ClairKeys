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

## Review round: two P1 findings, handled differently (2026-09-12)

Head advanced to `46c0d4cebaf85112a2dfbdf01a947ebe9ca77b81`. All 16 hosted checks pass on it;
non-draft, MERGEABLE. No merge approval exists.

### The breakpoint was in the wrong place — accepted, with a different cause than reported

Codex reported that 844×390 renders two columns and called it a contract violation, citing D-058 at
`DECISIONS.md:2229`. The citation was wrong twice: D-058 governs the protected-route E2E fixture,
and the column criterion lived in `HANDOFF.md:100`. But measuring the breakpoint exposed a real
defect next to it.

| Viewport | Columns | 곡명 field width |
|---|---|---|
| 390×844 | 1 | 308 |
| 639×900 | 1 | 557 |
| 640×900 (old boundary) | 2 | **263** |
| 768×1024 (new boundary) | 2 | 327 |
| 844×390 | 2 | 365 |

At exactly 640px the `sm` breakpoint split each field to 263px — narrower than the 308px a 390px
phone gets in a single column. Widening the screen made the input smaller, which defeats the reason
for splitting at all. The boundary moved to `md` (768px).

The prescription to stack 844×390 was declined, with measurement: each field is 365px there, wider
than the phone baseline, and stacking would spend more of the scarcest resource on a screen only
390px tall. Instead the rule is now asserted rather than incidental — a new case pins 390 / 767 /
768 on both sides of the boundary, and every viewport case asserts that a split field is wider than
the baseline. That assertion is what covers `phone landscape`.

### The governing criterion was rewritten before the code was kept — D-059

Codex then observed, correctly, that D-058's own Context still stated the criterion in device terms
while the code had moved to a width rule. That inconsistency was introduced by this branch. AGENTS
requires the decision record to change before the implementation deviates, so `46c0d4c` adds D-059
("쪼갠 칸이 휴대폰이 한 칸으로 받는 폭보다 좁아지지 않는다", baseline = the single-column width at
390px), removes the column wording from D-058's Context, and cites D-059 from both the component and
the spec. The code behaviour is identical to `8d8c1c4`.

Device terms cannot be verified: "one column on mobile" does not say at which width it is judged, so
it cannot be moved into a test — and in this repository it was in fact translated into the wrong
boundary. Width and field width are both measurable, so the rule and its verification are now
written in the same language.

### Lore trailers were genuinely broken, then genuinely fixed

The second finding was correct on its first appearance. `git show -s --format='%(trailers:only)'`
returned nothing for `e3d5d32` and `ecff241`, while `64989c7` — the repository's previous Lore
commit — returned 8. Cause: `Rejected:` and `Tested:` values were wrapped onto unindented
continuation lines, which makes git's trailer parser reject the whole block. The message looks
correct to a reader while tooling reads nothing, and `git log -1 --format=full` cannot reveal this
because it prints the message rather than the parse.

The three commits were rewritten with single-line trailers, trees verified identical
(`git diff --stat` empty) before force-pushing. Parsed counts are now 11 / 10 / 10, and `46c0d4c`
has 10.

The finding's repeat against `8d8c1c4` was not acted on: it cited
`14c73f5153f8a55379fd4f207f8059604db0afa5`, which does not exist in this repository
(`git cat-file -t` → `could not get object info`), and the commit it named parses 10 trailers.

### Not fixed, and recorded as such

`192c62c`, the handoff commit pushed directly to `main` earlier in this session, has the same
unparseable-trailer defect (0 parsed). Rewriting `main` history is not done without explicit
approval, so it stays as-is. This is a concrete instance of the AGENTS warning that direct commits
also remove the review that would have caught the error — a reviewer caught it here only because the
same mistake appeared in a PR.

### Commands and results at 46c0d4c

| Command | Result |
|---|---|
| `npx playwright test` | 160/160 pass, 5 browser projects |
| `npx jest src/components/upload` | 59/59 pass |
| `npm run lint` | 0 warnings, 0 errors |
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | success |
| hosted checks on 46c0d4c | 16/16 pass |

## Post-merge verification (2026-09-12)

Merged as `925e75832787c861308fc381b82d753ccb8b4bc1` on explicit user instruction.

| Check | Result |
|---|---|
| check-runs on the exact merge commit | 6/6 success (E2E, Post-merge build, Post-merge tests, Run Tests, Lint, Security Audit) |
| local `main` after `git pull --ff-only` | `925e758` |
| user's uncommitted HANDOFF edit after pull | byte-identical to the pre-pull backup |
| `md:grid-cols-2` present on merged main | yes, `OMRUploadForm.tsx:420` |
| `min-w-0` on all three fieldsets | yes, lines 341 / 406 / 463 |
| D-059 present on merged main | yes |
| `npx jest src/components/upload` on merged main | 59/59 pass |

Both branch tips had zero commits outside `main`, so the branch was deleted on origin and locally.
The merge commit's own Lore trailers parse (8), which was checked before pushing rather than after.

Stage 3 is complete. Stage 4 — existing states and responsive behaviour including keyboard focus and
zoom — is untouched by this slice and still carries the unverified list above: real device touch,
real landscape hardware, the browser's own zoom, screen reader output, measured colour contrast, and
the real sign-in flow.
