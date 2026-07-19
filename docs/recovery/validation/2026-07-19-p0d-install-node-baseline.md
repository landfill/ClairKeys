# P0-D Install and Node Baseline

- Date: 2026-07-19 KST
- Branch: `codex/p0-quality-gates`
- Base: `main` at `1db4ffb2a72f30e1967d98f8e0a70e94081b03e9`

## Changes

- Synchronized root dependency metadata into `package-lock.json`.
- Declared `engines.node >=22.3.0`.
- Changed every `actions/setup-node` invocation from Node 18 to Node 22.

## Verification

| Command | Result |
|---|---|
| `npm install --package-lock-only --ignore-scripts` | PASS |
| `npm ci` on Node 22.18.0 / npm 10.9.3 | PASS; 792 packages installed |
| `npm test -- --runInBand --silent` | BASELINE FAIL; 7/21 suites and 183/252 tests pass |
| `npx tsc --noEmit` | BASELINE FAIL; route params, stale component/service contracts and Prisma-related types |
| `npm run lint` | BASELINE FAIL; existing explicit-any, unused code, hook dependency and JSX text issues |

## Remaining risks

- npm audit reports 35 vulnerabilities: 1 low, 25 moderate and 9 high. No automatic force upgrade was applied.
- The machine has another lockfile at `C:\Users\surro\package-lock.json`; Next warns about workspace-root inference. This repository change does not delete user files outside the project.
- Application quality checks remain red and must not be hidden by disabling rules or build checks.
