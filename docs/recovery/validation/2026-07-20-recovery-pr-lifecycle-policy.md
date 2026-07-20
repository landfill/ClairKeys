# Validation — Recovery PR Lifecycle Policy

Captured: 2026-07-20 KST

## Scope

- Require every PR to be created review-ready rather than as a draft.
- Require explicit user approval for each `main` merge.
- Require post-merge verification and local/remote work-branch cleanup.
- Require stage-level commit, PR, review, merge, cleanup, and handoff evidence to remain inside the project.

## Policy alignment

- `AGENTS.md`: absolute rules and the stage lifecycle define review-ready creation, explicit merge approval, cleanup safety, and project-contained records.
- `docs/recovery/WORKFLOW.md`: PR creation and merge sections no longer instruct agents to start with a Draft PR and define the same merge/cleanup sequence.
- `.github/pull_request_template.md`: review checklist exposes the review-ready, in-project evidence, and explicit merge-approval requirements.
- `docs/recovery/HANDOFF.md`: PR #13 is recorded as the delivery path without duplicating transient review state.

## Verification

- Draft-policy scan: no instruction remains to create or start with a Draft PR in the active project contract or workflow.
- Merge-policy scan: AGENTS and WORKFLOW both require explicit user approval for the target PR.
- Cleanup-policy scan: both documents require remote and local work-branch cleanup after verified merge, with safety stops for user changes or unique commits.
- Handoff-location scan: canonical and supporting handoff artifacts are restricted to paths under `docs/recovery/`.
- `git diff --check`: PASS.

## Not tested

- No application behavior changed; application suites are delegated to hosted PR checks.
- No PR merge or branch deletion was performed because the user has not approved a merge.
