"""RBAC helpers for Smart Hiring Dashboard scope parameters."""

from __future__ import annotations

from typing import Optional, Tuple

from fastapi import HTTPException


async def _resolve_user_department(db, user_id: Optional[str]) -> Optional[str]:
    if not user_id:
        return None
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
    email = (user or {}).get("email")
    if not email:
        return None
    emp = await db.employees.find_one(
        {"email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0, "department": 1, "business_department": 1},
    )
    if not emp:
        return None
    return emp.get("business_department") or emp.get("department")


async def enforce_hiring_dashboard_scope(
    db,
    *,
    current_user: dict,
    scope: str,
    department: Optional[str],
    owner_id: Optional[str],
    job_id: Optional[str],
) -> Tuple[str, Optional[str], Optional[str], Optional[str]]:
    """
    Normalize scope filters and reject cross-tenant queries for non-privileged roles.

    Returns (scope, department, owner_id, job_id).
    """
    role = (current_user.get("role") or "").strip().lower()
    user_id = current_user.get("id")
    scope_norm = (scope or "all").strip().lower()
    privileged = role in ("admin", "hr_admin")

    if owner_id and owner_id != user_id and not privileged:
        raise HTTPException(status_code=403, detail="Cannot filter by another user's jobs")

    if scope_norm == "mine":
        if not user_id:
            raise HTTPException(status_code=403, detail="User context required for scope=mine")
        owner_id = user_id
        department = None
    elif scope_norm == "my_department":
        resolved = await _resolve_user_department(db, user_id)
        if resolved:
            department = resolved
            owner_id = None
        elif not privileged:
            scope_norm = "mine"
            owner_id = user_id
    elif role == "hr_viewer" and not privileged and scope_norm == "all":
        resolved = await _resolve_user_department(db, user_id)
        if resolved:
            if department and department.strip().lower() != str(resolved).strip().lower():
                raise HTTPException(status_code=403, detail="Cannot view another department")
            department = department or resolved
        else:
            scope_norm = "mine"
            owner_id = user_id

    return scope_norm, department, owner_id, job_id
