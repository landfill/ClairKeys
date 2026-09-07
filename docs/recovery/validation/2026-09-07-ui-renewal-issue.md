# UI renewal issue audit — 2026-09-07

- Requested outcome: inspect the current service UI and publish a renewal proposal without feature expansion.
- Published and read back: https://github.com/landfill/ClairKeys/issues/146; OPEN, exact body equality with `2026-09-07-ui-audit/issue-body.md` confirmed.
- Repository reference: 5debfe0779c394c286c942077189ead02830806d; origin/main was synchronized before reading. Exact deployed SHA was not established.
- Live browser inspection: home, explore, signed-in library, initial upload form, public sheet detail, playback, pause, stop; mobile library viewport 390x844. Temporary viewport reset; playback stopped.
- All eight captured PNGs were reopened and visually inspected. They remain local in `2026-09-07-ui-audit/`, intentionally NOT staged or published because they include session/library context. The public issue contains only de-identified UI findings and proposed acceptance checks.
- Automatic review rejected the original screenshot-publication attempt before execution. A safer text-only body excluding screenshots and the concrete sheet ID was subsequently approved and published.
- Key evidence: home static placeholder confirmed in HomeSamplePlayer; library card action labels wrap at desktop width; mobile list spacing; upload form density; substantial layout shift between playing and paused states. Existing design tokens inspected.
- Existing issue boundaries checked: #124 badge readability, #125 score panel/geometry expansion, #47 error classification. Those scopes are not newly implemented or closed.
- No application code, data, API, OMR, database, or user settings changed. No upload submitted or library item modified/deleted. No application build/test or accessibility compliance claim.
- Next action: use issue #146 to scope a future UI-only implementation request. No implementation/merge authorization is implied by issue creation.
- Pre-existing settings and HANDOFF edits are preserved and excluded from this commit.

## Local capture hashes (evidence identity only)

- `01-home.png`: SHA-256 `9efea16bf46b101df1630ffa98bf53f1ac8a52418027e0159e243a51ff3fa7f3`
- `02-explore.png`: SHA-256 `f6288eb7e52265b19ef241a3048c21c0f7cbb0c755126158d6e1283a75f8f2e9`
- `03-library.png`: SHA-256 `5eb4670d1c3ef9f84553561bd8e7c4c2cd4819b8366e5bcfcb0d17bf70e2417a`
- `04-upload.png`: SHA-256 `e5e97172daf19360cb8574725f49063b86e3faf480bb91902a5ec7b6dbcf84fa`
- `05-practice.png`: SHA-256 `3d9c71f425897cba9755621872db0c1547153bd284d5916d64f93aebd2f28625`
- `06-player-paused.png`: SHA-256 `7fdcf485ba4565e75fc20cb9620ca60a2c98615570a11ed282b976736d2fd028`
- `07-player-active.png`: SHA-256 `d6fda7f6932ac1d6be359b8c269d4dd0a15bc28ad71fc12721b0035ac3bed780`
- `08-library-mobile.png`: SHA-256 `b9051114d8ec56d48c2cfe8e3dae467636bd28359dfe6b71e160e08ff7513681`
