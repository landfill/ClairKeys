"""Retry policy for delivering a completed conversion to Next.js.

`app.py` owns the HTTP call itself. What lives here is the part of delivery
that can be wrong in an interesting way — how long to wait, how many times, and
which answers are worth asking again about.

This module imports stdlib only, for the same reason `auth.py` does: `app.py`
needs fastapi and aiofiles, so anything that exists only inside it can be
asserted from its source text but never actually run. A retry policy read from
a test rather than executed by one is a policy nobody has checked.
"""

# The conversion is already finished and its payload is already in memory by
# the time any of this runs. Delivery is therefore allowed to be patient: the
# cost of another attempt is one request, and the cost of giving up early is a
# score the user can only recover by returning to the upload page — which is
# the exact dependency this delivery path exists to remove.
MAX_DELIVERY_ATTEMPTS = 12
INITIAL_BACKOFF_SECONDS = 1
MAX_BACKOFF_SECONDS = 60

# `src/app/api/omr/finalize/route.ts` declares `maxDuration = 60`, and the
# `/result` fetch inside it may take 30s on its own before Storage is touched.
# A client that gives up at 30s abandons a finalize that is still working and
# retries a second later, so the same job runs finalize twice concurrently: two
# `/result` fetches, two Storage uploads, two row updates. The job-derived
# upsert keeps that correct, but it doubles the work in exactly the case that
# was already slow. Outlast the consumer instead.
CALLBACK_TIMEOUT_SECONDS = 70.0

# Answers that do not become different because we asked again.
#
# 400 means the job id is not a UUID — this service generated it, so no amount
# of waiting will reshape it. 401 means the shared secret does not match, which
# is deployment configuration. Retrying either spends the full backoff budget
# to arrive at the answer already in hand, and buries a configuration fault
# under ten quiet minutes instead of surfacing it in the log at once.
#
# 404 is deliberately absent. `/api/omr/upload` writes `omrJobId` only after
# `/process` answers, so a conversion that finishes quickly can deliver before
# the row carries the id the callback looks it up by. That window closes on its
# own within a retry or two, and treating it as permanent would lose precisely
# the fastest jobs.
PERMANENT_STATUS_CODES = frozenset({400, 401, 403, 422})


def is_retryable_status(status_code: int) -> bool:
    """True when asking again could plausibly produce a different answer."""
    return status_code not in PERMANENT_STATUS_CODES


def next_backoff_seconds(current_delay: int) -> int:
    """Double the wait, but never past the ceiling."""
    return min(current_delay * 2, MAX_BACKOFF_SECONDS)
