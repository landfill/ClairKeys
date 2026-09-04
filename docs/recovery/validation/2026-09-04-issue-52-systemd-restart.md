# Issue #52 — systemd restart cidfile regression

Date: 2026-09-04 KST
Branch: `codex/issue-52-systemd-restart`
Head: `d439173`

## Regression evidence

Commit `24fdb91` added `omr-service/tests/test_deployment_unit.py`. Before implementation it failed because
`omr-service/deploy/clairkeys-omr.service` did not contain
`ExecStartPre=/bin/rm -f %t/%n.ctr-id` before `ExecStart`.

## Implemented boundary

- `dd06c56` adds the pre-start cidfile cleanup to the checked-in unit.
- The deployment README defines repeat deployment from a clean detached commit, installation and reload of the unit,
  restart exit-status handling, active-state verification, and expected-versus-running image ID comparison.
- `d439173` removes a whitespace warning from the regression fixture without changing its assertion.

## Verification

| Command | Result |
|---|---|
| `python3 -m unittest omr-service/tests/test_deployment_unit.py` | PASS on the work branch |
| `cd omr-service && python3 -m unittest discover -s tests -p 'test_*.py'` | PASS, 45 tests |
| `git diff --check origin/main...HEAD` | PASS |
| `python3 -m unittest discover -s omr-service/tests -p 'test_*.py'` from repository root | FAIL, 32 passed plus one import error because `omr` is not on `PYTHONPATH` from that working directory; corrected by running from `omr-service` as above |

## Not verified

No production VM credentials/access were confirmed. The new unit was therefore not installed and no real
`systemctl restart`, journal inspection, external `/health` 200, protected `/process` 401, or running image identity
check was performed. Issue #52 must remain open until those operational checks pass.
