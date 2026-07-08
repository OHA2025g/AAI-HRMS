"""Product-mode flags — Smart Hiring-only vs full HRMS."""
import os

_TRUE = frozenset({"1", "true", "yes", "on"})


def is_smart_hiring_only() -> bool:
    """When true, optional phase-1 module routers are not mounted."""
    raw = os.environ.get("SMART_HIRING_ONLY", "1").strip().lower()
    return raw in _TRUE
