# Obsolete Fly deployment artifact cleanup — 2026-08-28

## Scope

PR [#69](https://github.com/landfill/ClairKeys/pull/69), branch
`codex/ops-remove-fly-artifacts`, head `afa5a0a`.

The repository exposed both the applied NAVER Cloud VM podman/systemd contract
and an undeployed Fly configuration. This ambiguity caused PR #68's manual
review to reason about Fly idle auto-stop even though the service has never run
there.

## Regression evidence

Commit `c674a72` added a static deployment-contract test before the cleanup.
Applied alone to `main` (`aebb66e`), the focused test failed:

```text
FAIL: test_repository_exposes_only_the_applied_vm_deployment_contract
AssertionError: True is not false
```

The failure was the presence of `omr-service/fly.toml`. The test also requires
the committed NAVER VM unit to invoke podman and use the protected env file.

## Verification after cleanup

| Command | Result |
|---|---|
| focused deployment-contract unittest | PASS, 1 test |
| `python3 -m unittest discover -s tests` in `omr-service/` | PASS, 34 tests |
| focused Jest for upload inventory, upload route, service URL | PASS, 3 suites / 33 tests |
| `npm test -- --runInBand` | PASS, 54 suites / 515 tests |
| `npm run build` | PASS |
| `npx tsc --noEmit` after build refreshed `.next/types` | PASS |
| `npm run lint` | PASS, no warnings or errors |
| active-surface `rg` audit excluding dated reviews/validation/HANDOFF/phases | only the regression test's forbidden filename remains |

The first standalone `tsc` invocation failed because `.next/types` still
referenced PR #68's unmerged `/api/omr/finalize` route. A normal production
build regenerated `.next` from the current branch; the subsequent `tsc` passed.
No source change was made for that generated-state mismatch.

## Deliberate preservation

Dated review and validation records retain their Fly references because they
record what earlier sessions inspected and believed at that time. D-008 is no
longer an active proposal: PR #69 reduces it to a superseded historical stub
and directs operators to D-012 and `omr-service/deploy/` only.

## Not verified

- OMR container rebuild
- NAVER VM redeployment
- PR #68 callback flow in production

