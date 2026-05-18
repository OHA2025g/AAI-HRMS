"""Resolve org / team / role drill scopes to employee id sets."""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set


def _subtree_employee_ids(all_emp: List[Dict[str, Any]], root_id: str) -> Set[str]:
    by_id = {e["id"]: e for e in all_emp if e.get("id")}
    children: Dict[str, List[str]] = defaultdict(list)
    for e in all_emp:
        eid = e.get("id")
        mid = e.get("manager_id")
        if eid and mid and str(mid) in by_id:
            children[str(mid)].append(str(eid))

    out: Set[str] = set()

    def walk(eid: str) -> None:
        if eid in out:
            return
        out.add(eid)
        for cid in children.get(eid, []):
            walk(cid)

    if root_id not in by_id:
        return set()
    walk(str(root_id))
    return out


async def resolve_drill_scope_ids(
    db,
    *,
    department: Optional[str] = None,
    manager_root_id: Optional[str] = None,
    role_title_contains: Optional[str] = None,
) -> Optional[Set[str]]:
    """
    Returns None = full org (no drill filters).
    Returns set of employee ids matching ALL provided filters.
    """
    if not department and not manager_root_id and not (role_title_contains and role_title_contains.strip()):
        return None

    all_emp = await db.employees.find({}, {"_id": 0, "id": 1, "department": 1, "manager_id": 1, "role_title": 1}).to_list(
        10000
    )
    ids: Optional[Set[str]] = None

    if manager_root_id and str(manager_root_id).strip():
        subtree = _subtree_employee_ids(all_emp, str(manager_root_id).strip())
        ids = subtree if ids is None else ids & subtree

    dept_key = (department or "").strip()
    if dept_key:
        pat = re.compile("^" + re.escape(dept_key) + "$", re.I)
        dept_set = {str(e["id"]) for e in all_emp if e.get("id") and pat.match(str(e.get("department") or ""))}
        ids = dept_set if ids is None else ids & dept_set

    role_q = (role_title_contains or "").strip()
    if role_q:
        rq = role_q.lower()
        role_set = {str(e["id"]) for e in all_emp if e.get("id") and rq in str(e.get("role_title") or "").lower()}
        ids = role_set if ids is None else ids & role_set

    return ids
