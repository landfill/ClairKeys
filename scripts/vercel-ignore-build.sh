#!/bin/sh
# Vercel "Ignored Build Step" (vercel.json ignoreCommand).
# Exit 0 skips the deployment; any other exit builds it.
#
# Every push to main otherwise becomes a production deployment, and each
# deployment stores its own copy of the function bundles. Almost all pushes
# to main are status-record commits under docs/ (AGENTS.md), so they filled
# Functions Storage without changing the app (issue #178, D-077).
#
# Compare with the last successful deployment of this branch, not HEAD^, so a
# code change is never skipped because docs commits landed after it. Vercel
# clones shallowly, so fetch that one commit when it is missing; if it is
# unknown or cannot be fetched, build.

base="${VERCEL_GIT_PREVIOUS_SHA:-}"

if [ -z "$base" ]; then
  echo "No previous deployment to compare with; building."
  exit 1
fi

if ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  git fetch --quiet --depth=1 origin "$base" 2>/dev/null
  if ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
    echo "Previous deployment ${base} is not available; building."
    exit 1
  fi
fi

# Paths that cannot change the deployed app. Anything else builds.
if git diff --quiet "$base" HEAD -- . \
  ':(exclude)docs/' \
  ':(exclude).github/' \
  ':(exclude)AGENTS.md' \
  ':(exclude)CLAUDE.md' \
  ':(exclude)README.md'; then
  echo "Only docs and CI files changed since ${base}; skipping deployment."
  exit 0
fi

echo "Deployable files changed since ${base}; building."
exit 1
