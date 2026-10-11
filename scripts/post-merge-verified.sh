#!/bin/sh
# Decide whether to skip post-merge checks (Lint, Run Tests, E2E Tests).
#
# When a merge commit is proven to introduce no code changes compared to the PR
# head that already passed PR Checks, repeating those checks on main is redundant.
# "Code" is every path outside docs/ and outside *.md, the same definition as
# the change filter in pr-checks.yml and paths-ignore in deploy.yml (D-101).
#
# PR Checks validates the pull request head merged with the base branch as it
# was then, so identical code is not enough: the base must have stayed main
# and main must not have changed code since the branch last met it.
# Runs are matched to the pull request by the run title that pr-checks.yml sets.
# When in doubt, run everything (exit 0 without writing skip=true).

run_all() {
  echo "Running all checks: $1"
  exit 0
}

# 1. GITHUB_EVENT_NAME must be push; GITHUB_REPOSITORY and GITHUB_SHA must be non-empty.
[ "${GITHUB_EVENT_NAME:-}" = "push" ] || run_all "event '${GITHUB_EVENT_NAME:-}' is not push."
[ -n "${GITHUB_REPOSITORY:-}" ] || run_all "GITHUB_REPOSITORY is empty."
[ -n "${GITHUB_SHA:-}" ] || run_all "GITHUB_SHA is empty."

# 2. Fetch pull requests associated with GITHUB_SHA.
pulls_raw=$(gh api "repos/$GITHUB_REPOSITORY/commits/$GITHUB_SHA/pulls" 2>/dev/null) || {
  run_all "failed to fetch pull requests for $GITHUB_SHA."
}
[ -n "$pulls_raw" ] || run_all "pull requests response is empty."

matching_prs=$(printf '%s' "$pulls_raw" | jq -c --arg sha "$GITHUB_SHA" '
  [ .[]? | select(.merged_at != null and .merge_commit_sha == $sha and .base.ref == "main") ]
' 2>/dev/null) || run_all "failed to parse pull requests JSON."

match_count=$(printf '%s' "$matching_prs" | jq 'length' 2>/dev/null) || run_all "invalid pull requests data."
[ "$match_count" = "1" ] || run_all "expected 1 matching pull request for $GITHUB_SHA, found '$match_count'."

pr_number=$(printf '%s' "$matching_prs" | jq -r '.[0].number' 2>/dev/null)
head=$(printf '%s' "$matching_prs" | jq -r '.[0].head.sha' 2>/dev/null)

# 3. head must be a 40-character lowercase hex sha, and number must be numeric.
printf '%s' "$head" | grep -Eq '^[0-9a-f]{40}$' || run_all "head sha '$head' is not a 40-character hex sha."
printf '%s' "$pr_number" | grep -Eq '^[0-9]+$' || run_all "pr number '$pr_number' is not numeric."

# 4. The merge commit second parent must equal head.
first=$(git rev-parse --verify -q "$GITHUB_SHA^1") || run_all "failed to parse first parent of $GITHUB_SHA."
second=$(git rev-parse --verify -q "$GITHUB_SHA^2") || run_all "$GITHUB_SHA is not a merge commit."
[ "$second" = "$head" ] || run_all "second parent of $GITHUB_SHA ($second) is not head ($head)."

# 5. The PR base branch must never have changed.
events_raw=$(gh api --paginate "repos/$GITHUB_REPOSITORY/issues/$pr_number/events?per_page=100" 2>/dev/null) || {
  run_all "failed to fetch issue events for PR #$pr_number."
}
[ -n "$events_raw" ] || run_all "issue events response is empty."
base_changed_count=$(printf '%s' "$events_raw" | jq -s '[ .[][]? | select(.event == "base_ref_changed") ] | length' 2>/dev/null) || {
  run_all "failed to parse issue events for PR #$pr_number."
}
[ "$base_changed_count" = "0" ] || run_all "PR #$pr_number base ref changed $base_changed_count time(s)."

# 6. Main must not have changed code since the pull request branch last met it.
base=$(git merge-base "$first" "$head") || run_all "failed to find merge base between $first and $head."
# Path-limited log compares trees directly, so submodule ignore settings cannot hide a gitlink change here.
touched=$(git log --first-parent --format=%H "$base..$first" -- . ':(exclude)docs' ':(exclude,glob)**/*.md') || {
  run_all "failed to inspect log on main."
}
[ -z "$touched" ] || run_all "main changed code after the pull request branched from $base."

# 7. Merge commit code must be identical to head.
git diff --quiet --ignore-submodules=none "$head" "$GITHUB_SHA" -- . ':(exclude)docs' ':(exclude,glob)**/*.md' || {
  run_all "code differences detected between $head and $GITHUB_SHA."
}

# 8. All PR Checks workflow runs for head must be completed and successful.
runs_raw=$(gh api --paginate "repos/$GITHUB_REPOSITORY/actions/runs?head_sha=$head&per_page=100" 2>/dev/null) || {
  run_all "failed to fetch workflow runs for $head."
}
[ -n "$runs_raw" ] || run_all "workflow runs response is empty."

expected_title="PR Checks for #$pr_number into main"
run_eval=$(printf '%s' "$runs_raw" | jq -s --arg title "$expected_title" '
  [ .[].workflow_runs[]? | select(.path == ".github/workflows/pr-checks.yml" and .event == "pull_request") ] as $matching |
  {
    count: ($matching | length),
    all_success: (if ($matching | length) > 0 then ($matching | all(.status == "completed" and .conclusion == "success" and .display_title == $title)) else false end),
    ids: [ $matching[].id ]
  }
' 2>/dev/null) || run_all "failed to parse workflow runs for $head."

matching_run_count=$(printf '%s' "$run_eval" | jq -r '.count' 2>/dev/null)
[ -n "$matching_run_count" ] && [ "$matching_run_count" != "0" ] && [ "$matching_run_count" != "null" ] || {
  run_all "no PR Checks workflow runs found for $head."
}

all_runs_success=$(printf '%s' "$run_eval" | jq -r '.all_success' 2>/dev/null)
[ "$all_runs_success" = "true" ] || run_all "not every PR Checks run for $head is a successful run of pull request #$pr_number into main."

run_ids=$(printf '%s' "$run_eval" | jq -r '.ids[]' 2>/dev/null) || run_all "failed to extract run IDs."
for run_id in $run_ids; do
  printf '%s' "$run_id" | grep -Eq '^[0-9]+$' || run_all "run id '$run_id' is not numeric."
done

# 9. Each run must have all four required jobs completed with success.
latest_e2e_url=""
for run_id in $run_ids; do
  jobs_raw=$(gh api --paginate "repos/$GITHUB_REPOSITORY/actions/runs/$run_id/jobs?filter=latest&per_page=100" 2>/dev/null) || {
    run_all "failed to fetch jobs for run $run_id."
  }
  [ -n "$jobs_raw" ] || run_all "jobs response is empty for run $run_id."

  jobs_eval=$(printf '%s' "$jobs_raw" | jq -s '
    [ .[].jobs[]? ] as $all |
    [ "Lint", "Run Tests", "E2E Tests", "Security Audit" ] as $required |
    (all($required[];
      . as $req |
      [ $all[] | select(.name == $req) ] as $matches |
      ($matches | length > 0) and ($matches | all(.status == "completed" and .conclusion == "success"))
    )) as $valid |
    {
      valid: $valid,
      e2e_url: ([ $all[] | select(.name == "E2E Tests") ][0].html_url // "")
    }
  ' 2>/dev/null) || run_all "failed to parse jobs for run $run_id."

  jobs_valid=$(printf '%s' "$jobs_eval" | jq -r '.valid' 2>/dev/null)
  [ "$jobs_valid" = "true" ] || run_all "run $run_id does not have all required jobs completed with success."

  e2e_url=$(printf '%s' "$jobs_eval" | jq -r '.e2e_url' 2>/dev/null)
  if [ -n "$e2e_url" ]; then
    latest_e2e_url="$e2e_url"
  fi
done

# 10. Verification succeeded.
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "skip=true" >> "$GITHUB_OUTPUT"
fi

echo "Skipping: pull request #$pr_number head $head passed PR Checks and differs from $GITHUB_SHA only in documents."

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  cat <<EOF >> "$GITHUB_STEP_SUMMARY"
### Post-merge verification skipped
- Pull Request: #$pr_number
- Head SHA: $head
- E2E Tests: $latest_e2e_url
EOF
fi

exit 0
