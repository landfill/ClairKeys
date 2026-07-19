# DOC-1 Default Branch Migration Validation

- Date/time: 2026-07-19 KST
- Phase: DOC-1
- Pull request: https://github.com/landfill/ClairKeys/pull/2
- Branch: `codex/default-branch-main-migration`
- Baseline commit: `6174ed088edc5d488c1bc9e16078bbee5081db97`

## Pre-migration evidence

- GitHub default branch: `master`
- Remote HEAD: `refs/heads/master`
- Local tracking branch: `master` → `origin/master`
- Repository rulesets: none
- `master` branch protection: none
- Open pull requests: none
- Actions branch filters: `main` or `main/develop`
- Existing user-owned working tree changes: present and excluded from migration commits

## Planned verification after rename

1. Query GitHub `defaultBranchRef` and require `main`.
2. Query remote symbolic HEAD and require `refs/heads/main`.
3. Require local `main` to track `origin/main` at the same commit.
4. Require local and remote `master` branch refs to be absent.
5. Check Actions/Vercel status and document any platform-trigger limitation.
6. Confirm only pre-existing user-owned files remain dirty.

## Scope statement

This migration changes branch identity and recovery documentation only. It does not resolve or reclassify the application test, type, lint, conversion, or playback baseline failures.
## Pre-PR validation result

- PASS: all relative recovery Markdown links resolve.
- PASS: WORKFLOW uses `main` for branch creation, PR base and post-merge branching.
- PASS: ROADMAP gates P0-A and P0-D on DOC-1.
- PASS: D-004 is superseded by D-006 without rewriting historical evidence.
- PASS: GitHub Actions workflow branch filters contain no `master` target.
- PASS: migration staged scope excludes all existing user-owned changes.
- NOT RUN: application tests, typecheck and lint; this documentation/branch-identity migration changes no runtime code and preserves existing failures.
