# Agent contract validation — 2026-09-13

Target: PR160 head ed4f0a1 (documentation only).

- Python pathlib + Markdown link extraction: relative links in AGENTS.md, WORKFLOW.md, PROJECT_REFERENCE.md all resolve.
- package.json checked: db:migrate executes prisma migrate dev. Production deploy command matches the existing provenance migration record.
- git diff --cached --check: PASS after removing the new reference file's trailing blank line.
- Manual old/new mapping: start/read order, user-owned changes, purpose-scoped PR, regression-first, Lore, non-draft, review loop, explicit target approval, main verification, both-tip/user-change cleanup guards, immediate durable status records and honest verification retained.
- Contradiction removed: DECISIONS belongs in the related branch/PR, not direct main status commits.
- Application tests not run; no application behavior changed. Hosted PR Run Tests, Lint, Lint and Type Check, Security Audit and the separate Tests workflow E2E passed; PR Checks workflow scope-based skips remain skips. Codex review completed with no threads; CodeRabbit review was skipped. See PR-160 review log.
- User-owned 11-line addition in historical handoff remains uncommitted and excluded.

## Approved merge — 2026-09-13

- PR160 merged as d7bfbc885b1c5675d4ea076bc6d022eb95d39b04 with --match-head-commit ed4f0a134e70d943b0fd2a1e777c6b6b178408f7 after explicit approval.
- git pull --ff-only succeeded; both local/remote branch counts outside main are 0.
- SHA-256 comparison of the pre-existing dirty history file before/after pull passed.
- Branches preserved under the user-change cleanup guard. Merge-commit CI queried: starting/in progress, not a completed validation.
