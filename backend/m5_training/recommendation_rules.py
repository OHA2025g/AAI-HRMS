"""
M5-1: Skill gap → learning path mapping — ranking rules and path assembly (pure logic).
"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Sequence, Set


def priority_rank(priority: str) -> int:
    p = (priority or "").upper()
    if p == "HIGH":
        return 3
    if p == "MEDIUM":
        return 2
    return 1


def sort_gap_skills(gap_skills: Sequence[Mapping[str, Any]]) -> List[Mapping[str, Any]]:
    """Larger organizational gap first, then higher workforce priority."""
    rows = [dict(r) for r in gap_skills if int(r.get("gap") or 0) > 0]
    rows.sort(key=lambda r: (-priority_rank(str(r.get("priority") or "MEDIUM")), -int(r.get("gap") or 0)))
    return rows


def default_path_steps(skill_name: str) -> List[Dict[str, str]]:
    sn = skill_name.strip() or "Target skill"
    return [
        {
            "step_title": f"{sn} fundamentals",
            "description": f"Core concepts and terminology for {sn}.",
        },
        {
            "step_title": f"Hands-on practice — {sn}",
            "description": f"Guided exercises to build practical proficiency in {sn}.",
        },
        {
            "step_title": "Assessment & certification",
            "description": "Validate learning with a short assessment; capture completion in HRMS.",
        },
    ]


def build_recommendation_reason(skill_row: Mapping[str, Any]) -> str:
    d = int(skill_row.get("demand_count") or 0)
    s = int(skill_row.get("supply_count") or 0)
    g = int(skill_row.get("gap") or 0)
    pr = str(skill_row.get("priority") or "MEDIUM").upper()
    return (
        f"Workforce gap (priority {pr}): demand {d} vs supply {s} "
        f"(gap {g}); employee does not list this skill."
    )


def path_for_skill(
    skill_name: str,
    skill_lc: str,
    templates: Mapping[str, Sequence[Mapping[str, Any]]],
) -> List[Dict[str, str]]:
    tpl = templates.get(skill_lc.strip().lower())
    if tpl:
        return [
            {"step_title": str(s.get("step_title") or "Step"), "description": str(s.get("description") or "")}
            for s in tpl
        ]
    return default_path_steps(skill_name)


def recommend_skills_for_employee(
    employee_skills_lc: Set[str],
    gap_pool_sorted: Sequence[Mapping[str, Any]],
    path_templates: Mapping[str, Sequence[Mapping[str, Any]]],
    *,
    max_skills: int,
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for s in gap_pool_sorted:
        if len(out) >= max_skills:
            break
        name = str(s.get("skill_name") or "").strip()
        if not name:
            continue
        sk_lc = name.lower()
        if sk_lc in employee_skills_lc:
            continue
        out.append(
            {
                "skill_name": name,
                "priority": str(s.get("priority") or "MEDIUM").upper(),
                "reason": build_recommendation_reason(s),
                "path_steps": path_for_skill(name, sk_lc, path_templates),
            }
        )
    return out


def build_employee_recommendation_payloads(
    employees: Sequence[Mapping[str, Any]],
    skill_inventory_gap_rows: Sequence[Mapping[str, Any]],
    path_templates: Mapping[str, Sequence[Mapping[str, Any]]],
    *,
    max_skills_per_employee: int,
) -> List[Dict[str, Any]]:
    gap_sorted = sort_gap_skills(skill_inventory_gap_rows)
    recs: List[Dict[str, Any]] = []
    for e in employees:
        code = str(e.get("employee_code") or "")
        name = str(e.get("full_name") or "")
        emp_skills = {
            str(x).strip().lower()
            for x in (e.get("skills") or [])
            if isinstance(x, str) and str(x).strip()
        }
        skills = recommend_skills_for_employee(
            emp_skills,
            gap_sorted,
            path_templates,
            max_skills=max_skills_per_employee,
        )
        recs.append(
            {
                "employee_code": code,
                "full_name": name,
                "recommended_skills": skills,
            }
        )
    return recs
