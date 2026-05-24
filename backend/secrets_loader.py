"""Optional secret store bootstrap (Vault / AWS SM). No-op when unset."""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def apply_secret_store() -> None:
    """Load secrets into os.environ when SECRET_STORE is configured."""
    store = (os.environ.get("SECRET_STORE") or "").strip().lower()
    if not store:
        return
    logger.warning("SECRET_STORE=%s is set but no loader is configured in this build", store)
