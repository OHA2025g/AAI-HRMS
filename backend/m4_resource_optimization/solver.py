"""
M4-2: deterministic greedy capacity allocation with hard/soft demand seats,
scoring (shortage + utilization), and explainability steps.

Pure Python — no DB.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Sequence, Set, Tuple


ConstraintType = Literal["HARD", "SOFT"]


def _priority_rank(priority: str) -> int:
    p = (priority or "").upper()
    if p == "HIGH":
        return 3
    if p == "MEDIUM":
        return 2
    return 1


@dataclass(frozen=True)
class DemandRecord:
    project_id: str
    project_name: str
    skill_lc: str
    skill_name: str
    demand_count: int
    priority: str = "MEDIUM"
    demand_min: Optional[int] = None
    demand_max: Optional[int] = None
    constraint_type: ConstraintType = "HARD"

    def effective_min(self) -> int:
        if self.demand_min is not None:
            return max(0, int(self.demand_min))
        return max(0, int(self.demand_count))

    def effective_max(self) -> int:
        if self.demand_max is not None:
            return max(self.effective_min(), int(self.demand_max))
        return max(self.effective_min(), int(self.demand_count))


@dataclass
class Assignment:
    employee_code: str
    project_id: str
    skill_lc: str
    skill_name: str
    seat_kind: ConstraintType


@dataclass
class SolveResult:
    assignments: List[Assignment] = field(default_factory=list)
    explain_steps: List[Dict[str, Any]] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    score_breakdown: Dict[str, Any] = field(default_factory=dict)
    run_key: str = ""


def _expand_seats(records: Sequence[DemandRecord]) -> List[Tuple[ConstraintType, int, str, DemandRecord, int]]:
    """
    Returns list of tuples:
      (constraint_type_sort, neg_priority_rank, project_id, record, seat_idx)
    for stable sorting: HARD before SOFT, higher priority first, then project_id.
    """
    seats: List[Tuple[ConstraintType, int, str, DemandRecord, int]] = []
    for rec in records:
        lo = rec.effective_min()
        hi = rec.effective_max()
        ctype: ConstraintType = rec.constraint_type if rec.constraint_type in ("HARD", "SOFT") else "HARD"
        pr = _priority_rank(rec.priority)
        for i in range(hi):
            kind: ConstraintType = "HARD" if i < lo else "SOFT"
            seats.append((kind, -pr, rec.project_id, rec, i))
    seats.sort(key=lambda x: (0 if x[0] == "HARD" else 1, x[1], x[2], x[3].skill_lc, x[4]))
    return seats


def solve_capacity_allocation(
    demand_rows: Sequence[DemandRecord],
    employees: Sequence[Tuple[str, Set[str]]],
    *,
    max_projects_per_employee: int = 3,
    max_seats_per_employee_per_project: int = 1,
    shortage_penalty_hard: float = 10.0,
    shortage_penalty_soft: float = 3.0,
    utilization_weight: float = 4.0,
    target_utilization_pct: float = 85.0,
    run_key: str = "",
) -> SolveResult:
    """
    Greedy seat filling with deterministic employee order (sorted employee_code).

    Hard constraints enforced:
    - Employee must have skill (skill_lc match on employee skill set, lower-cased).
    - At most `max_projects_per_employee` distinct projects per employee.
    - At most `max_seats_per_employee_per_project` seats per (employee, project).

    Soft behavior:
    - Seats beyond demand_min but <= demand_max are SOFT; leaving them unfilled adds SOFT shortage penalty only.
    """
    seats_order = _expand_seats(demand_rows)
    total_seats = len(seats_order)

    sorted_emps = sorted(employees, key=lambda t: t[0])
    emp_projects: Dict[str, Set[str]] = {code: set() for code, _ in sorted_emps}
    emp_project_seats: Dict[Tuple[str, str], int] = {}

    assignments: List[Assignment] = []
    explain: List[Dict[str, Any]] = []

    unfilled_hard = 0
    unfilled_soft = 0

    for kind, _neg_pr, _pid, rec, seat_idx in seats_order:
        skill_lc = rec.skill_lc.strip().lower()
        placed = False
        for code, skills in sorted_emps:
            sk_set = {s.strip().lower() for s in skills if isinstance(s, str) and s.strip()}
            if skill_lc not in sk_set:
                continue
            if len(emp_projects[code]) >= max_projects_per_employee and rec.project_id not in emp_projects[code]:
                continue
            key = (code, rec.project_id)
            used_here = emp_project_seats.get(key, 0)
            if used_here >= max_seats_per_employee_per_project:
                continue

            emp_projects[code].add(rec.project_id)
            emp_project_seats[key] = used_here + 1
            a = Assignment(
                employee_code=code,
                project_id=rec.project_id,
                skill_lc=skill_lc,
                skill_name=rec.skill_name,
                seat_kind=kind,
            )
            assignments.append(a)
            explain.append(
                {
                    "action": "ASSIGN",
                    "employee_code": code,
                    "project_id": rec.project_id,
                    "project_name": rec.project_name,
                    "skill_name": rec.skill_name,
                    "seat_kind": kind,
                    "seat_index": seat_idx,
                    "reason": "first_eligible_employee_deterministic_order",
                }
            )
            placed = True
            break

        if not placed:
            if kind == "HARD":
                unfilled_hard += 1
            else:
                unfilled_soft += 1
            explain.append(
                {
                    "action": "UNFILLED",
                    "project_id": rec.project_id,
                    "project_name": rec.project_name,
                    "skill_name": rec.skill_name,
                    "seat_kind": kind,
                    "seat_index": seat_idx,
                    "reason": "no_eligible_employee_under_capacity_constraints",
                }
            )

    filled = len(assignments)
    util_pct = round(100.0 * filled / total_seats, 2) if total_seats else 0.0
    util_gap = max(0.0, target_utilization_pct - util_pct)

    shortage_component = shortage_penalty_hard * unfilled_hard + shortage_penalty_soft * unfilled_soft
    # Lower score is better: penalize shortage and util gap; subtract small reward for fill rate.
    objective = shortage_component + utilization_weight * util_gap - 0.01 * filled

    metrics = {
        "total_seats": total_seats,
        "filled_seats": filled,
        "unfilled_hard_seats": unfilled_hard,
        "unfilled_soft_seats": unfilled_soft,
        "utilization_pct": util_pct,
        "distinct_employees_used": len({a.employee_code for a in assignments}),
        "distinct_projects": len({a.project_id for a in assignments}),
    }
    score_breakdown = {
        "shortage_penalty_hard": shortage_penalty_hard,
        "shortage_penalty_soft": shortage_penalty_soft,
        "unfilled_hard": unfilled_hard,
        "unfilled_soft": unfilled_soft,
        "shortage_component": round(shortage_component, 4),
        "utilization_weight": utilization_weight,
        "target_utilization_pct": target_utilization_pct,
        "utilization_gap_pct": round(util_gap, 4),
        "objective_score": round(objective, 4),
        "run_key": run_key,
    }

    return SolveResult(
        assignments=assignments,
        explain_steps=explain,
        metrics=metrics,
        score_breakdown=score_breakdown,
        run_key=run_key,
    )


def result_to_api_dict(res: SolveResult) -> Dict[str, Any]:
    return {
        "assignments": [
            {
                "employee_code": a.employee_code,
                "project_id": a.project_id,
                "skill_lc": a.skill_lc,
                "skill_name": a.skill_name,
                "seat_kind": a.seat_kind,
            }
            for a in res.assignments
        ],
        "explain_steps": res.explain_steps,
        "metrics": res.metrics,
        "score_breakdown": res.score_breakdown,
        "run_key": res.run_key,
    }


def compare_solve_results(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    """Lightweight diff for scenario compare API."""
    ma, mb = a.get("metrics") or {}, b.get("metrics") or {}
    sa, sb = a.get("score_breakdown") or {}, b.get("score_breakdown") or {}
    keys = [
        "total_seats",
        "filled_seats",
        "unfilled_hard_seats",
        "unfilled_soft_seats",
        "utilization_pct",
        "distinct_employees_used",
    ]
    side_by_side = {k: {"a": ma.get(k), "b": mb.get(k)} for k in keys}
    return {
        "objective_score": {"a": sa.get("objective_score"), "b": sb.get("objective_score")},
        "shortage_component": {"a": sa.get("shortage_component"), "b": sb.get("shortage_component")},
        "metrics": side_by_side,
    }
