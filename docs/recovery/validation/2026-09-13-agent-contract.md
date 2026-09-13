# Agent contract validation — 2026-09-13

Target: PR160 head ed4f0a1 (documentation only).

- Python pathlib + Markdown link extraction: relative links in AGENTS.md, WORKFLOW.md, PROJECT_REFERENCE.md all resolve.
- package.json checked: db:migrate executes prisma migrate dev. Production deploy command matches the existing provenance migration record.
- git diff --cached --check: PASS after removing the new reference file's trailing blank line.
- Manual old/new mapping: start/read order, user-owned changes, purpose-scoped PR, regression-first, Lore, non-draft, review loop, explicit target approval, main verification, both-tip/user-change cleanup guards, immediate durable status records and honest verification retained.
- Contradiction removed: DECISIONS belongs in the related branch/PR, not direct main status commits.
- Application tests not run; no application behavior changed. Hosted CI/review pending.
- User-owned 11-line addition in historical handoff remains uncommitted and excluded.
