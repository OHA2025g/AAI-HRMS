"""M4 allocation solver unit tests (no Mongo)."""

from m4_resource_optimization.solver import (
    DemandRecord,
    compare_solve_results,
    result_to_api_dict,
    solve_capacity_allocation,
)


def test_solver_fills_hard_seats_deterministically():
    demands = [
        DemandRecord(
            project_id="p1",
            project_name="P1",
            skill_lc="python",
            skill_name="Python",
            demand_count=2,
            priority="HIGH",
            demand_min=2,
            demand_max=2,
            constraint_type="HARD",
        )
    ]
    employees = [
        ("e2", {"python"}),
        ("e1", {"python"}),
    ]
    res = solve_capacity_allocation(
        demands,
        employees,
        max_projects_per_employee=3,
        max_seats_per_employee_per_project=1,
        run_key="t1",
    )
    assert res.metrics["filled_seats"] == 2
    assert res.metrics["unfilled_hard_seats"] == 0
    codes = [a.employee_code for a in res.assignments]
    assert codes == ["e1", "e2"]


def test_solver_respects_max_projects_per_employee():
    demands = [
        DemandRecord("p1", "P1", "python", "Python", 1, demand_min=1, demand_max=1, constraint_type="HARD"),
        DemandRecord("p2", "P2", "python", "Python", 1, demand_min=1, demand_max=1, constraint_type="HARD"),
        DemandRecord("p3", "P3", "python", "Python", 1, demand_min=1, demand_max=1, constraint_type="HARD"),
        DemandRecord("p4", "P4", "python", "Python", 1, demand_min=1, demand_max=1, constraint_type="HARD"),
    ]
    employees = [("e1", {"python"})]
    res = solve_capacity_allocation(demands, employees, max_projects_per_employee=1)
    assert res.metrics["filled_seats"] == 1
    assert res.metrics["unfilled_hard_seats"] == 3


def test_soft_seats_unfilled_lower_penalty_metric():
    demands = [
        DemandRecord(
            "p1",
            "P1",
            "python",
            "Python",
            2,
            demand_min=0,
            demand_max=2,
            constraint_type="SOFT",
        )
    ]
    employees = []
    res = solve_capacity_allocation(demands, employees)
    assert res.metrics["unfilled_soft_seats"] == 2
    assert res.metrics["unfilled_hard_seats"] == 0


def test_compare_solve_results():
    a = result_to_api_dict(
        solve_capacity_allocation(
            [DemandRecord("p1", "P1", "x", "X", 1, demand_min=1, demand_max=1)],
            [("e1", {"x"})],
        )
    )
    b = result_to_api_dict(
        solve_capacity_allocation(
            [DemandRecord("p1", "P1", "x", "X", 2, demand_min=2, demand_max=2)],
            [("e1", {"x"})],
        )
    )
    c = compare_solve_results(a, b)
    assert "metrics" in c
    assert c["objective_score"]["a"] != c["objective_score"]["b"]
