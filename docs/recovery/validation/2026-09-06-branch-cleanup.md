# Branch cleanup — 2026-09-06

Explicit user approval covers deleting merged branches despite existing local changes.
No PR was merged. Application code was not changed or tested.

## Verification

- `git fetch origin`: PASS; main already current at eea1d8826c6d922c8041569cf9a7bb680e5760a4.
- `git rev-list --count origin/main..<ref>`: 0 for each deleted ref below.
- Remote deletion used an atomic push with an expected-tip lease for every ref: PASS.
- `git branch -d` deleted 11 local branches: PASS.
- `git fetch --prune origin` and `git branch -a`: only main and the retained refs remain.
- SHA-256 comparison of all 10 pre-existing modified/untracked files after switching to main:
  PASS, byte-identical. Only our new HANDOFF entry is staged; previous edits remain uncommitted.
- Temporary stash dropped only after content verification. Source snapshots remain in .git.

## Deleted refs

| Branch | Tip | Deleted locations |
|---|---|---|
| codex/audit-musicxml-timing | bd35836c6fb8c7a9478264c89fe49eebea69e28f | local, origin |
| codex/audit-playback-loop | aed0c82a8a959c04ffab6b69c80979e182d3d1b7 | local, origin |
| codex/issue-134-recognition-quality | d8a612997ffefa2815a0a0a42c6b2945c242dd6b | local, origin |
| codex/issue-135-held-note-guidance | e9b8f63ba8bb0784e16252d058428b65b4d73fc9 | local, origin |
| codex/issue-137-tempo-controls | 3f5977340c829bc34a2c636cb4ecd74b80f617cb | local, origin |
| codex/omr-key-signature-integrity | 92c8e1b5b4394cb293582d564eafd2871969223e | local, origin |
| codex/omr-wedge-measure-integrity | f614245784b632b029ea7a6299555c3103da4ddc | local, origin |
| codex/omr-whole-note-integrity | ef714c78ad9ddfdf7f4fe1128f5e5edc961fc09a | local, origin |
| codex/test-local-score-workspace | a2c0035dddaee4c51c00db0e8d1d88674d1638a4 | local |
| codex/test-love-affair-priority | 6f6848491e805981264b6c19d8bd44e05f232833 | local |
| codex/test-satie-service-validation | f79931dfd37b27092ae61d2bd4620bc25ee4744c | local |

## Preserved refs

- codex/issue-130-directional-budget: {'codex/issue-130-directional-budget': 2}; tips {'codex/issue-130-directional-budget': '7a3d5e80273964ab14ae1fa3ebaea1934f54f3fb'}
- codex/omr-page-scale-validation: {'codex/omr-page-scale-validation': 1, 'origin/codex/omr-page-scale-validation': 1}; tips {'codex/omr-page-scale-validation': '76a6b893cff6300de572aa8990bd62562bd9fece', 'origin/codex/omr-page-scale-validation': '76a6b893cff6300de572aa8990bd62562bd9fece'}
