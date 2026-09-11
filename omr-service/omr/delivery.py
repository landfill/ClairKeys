"""Trust boundary and retry policy for completion delivery to Next.js.

`app.py` owns the HTTP call itself. What lives here is the part of delivery
that can be wrong in an interesting way — how long to wait, how many times, and
which answers are worth asking again about.

This module imports stdlib only, for the same reason `auth.py` does: `app.py`
needs fastapi and aiofiles, so anything that exists only inside it can be
asserted from its source text but never actually run. A retry policy read from
a test rather than executed by one is a policy nobody has checked.
"""

import os
from typing import Optional, Tuple
from urllib.parse import SplitResult, urlsplit


class CallbackOriginError(ValueError):
    """The configured origin or requested callback is not safe to contact."""


def _parse_http_url(value: Optional[str], label: str) -> SplitResult:
    if not value or value != value.strip() or any(ord(char) < 33 for char in value):
        raise CallbackOriginError(f"{label} is missing or malformed")
    if "\\" in value:
        raise CallbackOriginError(f"{label} is malformed")

    try:
        parsed = urlsplit(value)
        # Accessing these properties performs urllib's bracket and port checks.
        hostname = parsed.hostname
        port = parsed.port
    except ValueError as error:
        raise CallbackOriginError(f"{label} is malformed") from error

    if (
        parsed.scheme not in ("http", "https")
        or not parsed.netloc
        or not hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
        or hostname.endswith(".")
        or parsed.netloc.endswith(":")
        or port == 0
    ):
        raise CallbackOriginError(f"{label} is malformed")
    return parsed


def _origin_tuple(parsed: SplitResult) -> Tuple[str, str, int]:
    default_port = 443 if parsed.scheme == "https" else 80
    hostname = parsed.hostname
    if hostname is None:  # `_parse_http_url` is the only constructor path.
        raise CallbackOriginError("URL hostname is missing")
    return parsed.scheme, hostname.lower(), default_port if parsed.port is None else parsed.port


def validate_callback_url(callback_url: Optional[str]) -> str:
    """Return a callback only when it exactly matches the configured origin.

    Paths and queries identify the endpoint but are deliberately absent from
    the trust comparison. Callers must never include either value in logs.
    """
    configured = _parse_http_url(
        os.getenv("CLAIRKEYS_CALLBACK_ORIGIN"), "callback origin configuration"
    )
    callback = _parse_http_url(callback_url, "callback URL")

    if configured.path not in ("", "/") or configured.query:
        raise CallbackOriginError("callback origin configuration is not an origin")

    is_development = (
        os.getenv("ENVIRONMENT", "production").strip().lower() == "development"
    )
    if not is_development and (
        configured.scheme != "https" or callback.scheme != "https"
    ):
        raise CallbackOriginError("completion callbacks require HTTPS")

    if _origin_tuple(callback) != _origin_tuple(configured):
        raise CallbackOriginError("callback URL does not match the configured origin")

    # `_parse_http_url` established that this is a present string.
    assert callback_url is not None
    return callback_url

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
