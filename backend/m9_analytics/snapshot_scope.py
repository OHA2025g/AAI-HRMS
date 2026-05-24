"""Snapshot scope keys for idempotent monthly leadership exports (M9)."""

from __future__ import annotations

from typing import Any, Dict, Optional


def snapshot_scope_key(
    *,
    drill_filters: Optional[Dict[str, Any]] = None,
    department: Optional[str] = None,
    manager_root_id: Optional[str] = None,
    role_title_contains: Optional[str] = None,
) -> str:
    """Stable key for upsert: organization or department:{name} or custom filter hash."""
    if drill_filters:
        dept = (drill_filters.get("department") or "").strip()
        mgr = (drill_filters.get("manager_root_id") or "").strip()
        role = (drill_filters.get("role_title_contains") or "").strip()
    else:
        dept = (department or "").strip()
        mgr = (manager_root_id or "").strip()
        role = (role_title_contains or "").strip()

    if dept:
        return f"department:{dept.lower()}"
    if mgr or role:
        parts = []
        if mgr:
            parts.append(f"mgr={mgr}")
        if role:
            parts.append(f"role={role.lower()}")
        return "custom:" + "|".join(parts)
    return "organization"


def attach_snapshot_scope(payload: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(payload)
    out["snapshot_scope"] = snapshot_scope_key(drill_filters=out.get("drill_filters"))
    return out
