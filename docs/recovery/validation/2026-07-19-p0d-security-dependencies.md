# P0-D Security Dependency Iteration

- Date: 2026-07-19 KST
- Branch: `codex/p0-quality-gates`
- Pull request: https://github.com/landfill/ClairKeys/pull/4
- Hosted audit artifact: Tests run `29684725397`, artifact `npm-audit`

## Authoritative baseline

The hosted registry audit reported 35 vulnerabilities: 1 low, 25 moderate and 9 high. A prior local zero result was stale due to local registry/cache conditions and is not treated as authoritative.

## Non-breaking remediation

| Package | Before | After |
|---|---:|---:|
| Next.js | 15.4.8 | 15.5.20 |
| Prisma CLI and client | 6.19.2 (lock; package range ^6.13.0) | 6.19.3 |
| Jimp | 1.6.0 | 1.6.1 |
| UUID | 11.1.0 | 11.1.1 |

`npm audit fix --package-lock-only --ignore-scripts` also refreshed safe transitive versions without a force upgrade.

## Verification

| Check | Result |
|---|---|
| Latest registry `npm audit --audit-level high --json` | PASS — 0 high, 0 critical; 4 moderate remain |
| Installed direct package versions | PASS — match the table above |
| Focused playback regression tests | PASS — 3 suites, 65 tests |
| `git diff --check` | PASS |

## Remaining moderate findings

- `next-auth` embeds an older `uuid` line.
- Next.js audit metadata still associates a PostCSS advisory through the NextAuth dependency graph.
- npm's automatic full fix proposes `next-auth@3.29.10` and `next@9.3.3`, which are breaking downgrades and were rejected.
- These four moderate findings do not fail the repository's `--audit-level high` gate; they remain explicitly tracked instead of being suppressed.

## Hosted verification

- `Security Audit`: PASS in Tests run `29684986127`.
- `Security Scan` / CodeQL: PASS in PR Checks run `29684986103`.
