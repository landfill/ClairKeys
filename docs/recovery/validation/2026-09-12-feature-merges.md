# Approved PR151 and PR152 merges

Date: 2026-09-12

## Authorization and merge evidence

- User approved both named PRs. Pre-merge exact heads were acc43fbf3128281eb6084e1478af763fe24f75df
  and724d5db6009080f99f7b223f9f1231b65ee9e97b, each with14 successful checks and unresolved-review count0.
- `gh pr merge 151 --merge --match-head-commit acc43fbf3128281eb6084e1478af763fe24f75df` with Lore body:
  merged as381a17f3b75fe7607008e59fb9655106432e1ac3,2026-09-11T16:05:24Z.
- `gh pr merge 152 --merge --match-head-commit 724d5db6009080f99f7b223f9f1231b65ee9e97b` with Lore body:
  merged as e652c643920625f3baccff4f0500110357aa2ba9,2026-09-11T16:05:28Z.
- Scoped HANDOFF stash, `git pull --ff-only`, stash pop succeeded. Original user changes preserved.
- Local and remote tips for both feature branches have0 commits outside origin/main. Cleanup is
  blocked by user-owned working-tree changes, not unmerged feature commits; no branch removed.

## Post-merge verification

- On final merge e652c64, Security Audit, Lint, Run Tests and Post-merge tests pass; build/E2E pending
  at initial recording. Exact-merge Production deployment6396973814 is registered; Vercel status success.
- Both issue110 and issue146 remain OPEN. No OMR VM image, environment or service was changed.
- Exact final check/deployment outcomes will be appended after completion.

## Final results

- GET check-runs for381a17f3b75fe7607008e59fb9655106432e1ac3: total_count6, no non-successful checks.
- GET check-runs fore652c643920625f3baccff4f0500110357aa2ba9: total_count6, no non-successful checks.
- Final exact-merge deployment6396973814: Production/success.
- Public home fetched with Python urllib: HTTP200, one linked stylesheet. Fetched that same-origin
  stylesheet and asserted .compact-playback-bar/.compact-playback-speed/.compact-playback-volume
  are present: all true. No authenticated request or production mutation occurred.
- Local main synchronized and both branch-tip pairs contained; original user modifications remain.
- OMR VM rollout/live callback validation is unperformed and separate. Issues110/146 remain open.
