# PR153 approved merge and downstream propagation

Date: 2026-09-12
Merge: 248666bf4ce7e9e1aba900bd66f8b31d26fb4f85

- `gh pr view 153` and reviewThreads verified exact head/all checks/no unresolved findings.
- `gh pr merge 153 --merge --match-head-commit eea2cad6dea948f8b0f0ad7d256de1abe84db353`
  with Lore subject/body succeeded after explicit user approval.
- Scoped HANDOFF stash/pull --ff-only/stash pop succeeded without conflicts. User changes preserved.
- `git rev-list --count origin/main..codex/ci-security-dependencies` and remote equivalent:0 each.
  User-owned changes remain, so lifecycle forbids branch deletion; both tips retained.
- Exact-merge Production deployment6396546356 status success; no manual deployment action performed.
- Callback merged main in3a8c92b, final implementation0cba56d; toolbar merged main infbc9364,
  final test-evidence724d5db. Both pushed without force; code PR diffs remain separate.
- Both worktrees now use the independently installed patched node_modules in security-dependencies.
- Callback: full Jest997/type/lint pass on combined deps; final Python162/6 skips and focused bridge pass.
- Toolbar: full Jest995/type/lint pass on combined deps;30 transition E2E pass with DOM/focus retention.
- Hosted outcomes and reviews are recorded in PR151/152/153 logs. No feature merge or OMR VM rollout.
