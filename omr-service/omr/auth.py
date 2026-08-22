"""Shared-secret authentication for the OMR service.

The service runs on a public IP behind nginx with SELinux disabled and
firewalld inactive, so the cloud ACG is the only other control. A single
`/process` call spends up to fifteen minutes of a two-vCPU box, which makes an
unauthenticated endpoint the real exposure here — not eavesdropping.

The secret is therefore mandatory. An unset `OMR_SHARED_SECRET` fails closed in
production, the same shape as the local-fallback guard it replaces; only an
explicit `ENVIRONMENT=development` may run without one.

This module imports stdlib only. The FastAPI wiring lives in `app.py`, so the
check itself can be exercised for real in an environment without fastapi
installed — the same reason `storage.py` was testable before it was removed.
"""

import hmac
import os
from typing import Optional

SHARED_SECRET_HEADER = "X-ClairKeys-Token"


class SharedSecretError(Exception):
    """A request may not proceed. `status_code` is what `app.py` should return."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _is_development() -> bool:
    return os.getenv("ENVIRONMENT", "production").strip().lower() == "development"


def verify_shared_secret(presented: Optional[str]) -> None:
    """Raise `SharedSecretError` unless the caller presented the secret."""
    expected = (os.getenv("OMR_SHARED_SECRET") or "").strip()

    if not expected:
        if _is_development():
            return
        # Refusing every request is the safe reading of a missing secret: an
        # operator who forgets it gets a service nobody can drive, not an open
        # one.
        raise SharedSecretError(
            503,
            "OMR_SHARED_SECRET is not configured. The service refuses requests "
            "rather than running unauthenticated.",
        )

    candidate = (presented or "").strip()

    # compare_digest keeps the comparison time independent of how much of the
    # secret a caller guessed correctly.
    if not candidate or not hmac.compare_digest(candidate, expected):
        raise SharedSecretError(401, "Invalid or missing shared secret")
