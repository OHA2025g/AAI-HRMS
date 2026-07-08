from talent_acquisition.hiring_dashboard_insights import build_department_risk


def test_build_department_risk_varies_by_signals():
    jobs = [
        {"status": "OPEN", "business_department": "Engineering"},
        {"status": "OPEN", "business_department": "Engineering"},
        {"status": "OPEN", "business_department": "Finance"},
    ]
    rows = build_department_risk(
        jobs,
        stuck_by_dept={"Engineering": 8, "Finance": 0},
        req_age_by_dept={"Engineering": 72.0, "Finance": 12.0},
        empty_pipeline_by_dept={"Engineering": 1, "Finance": 3},
    )
    by_dept = {row.department: row for row in rows}
    assert by_dept["Engineering"].risk_level == "high"
    assert by_dept["Engineering"].dot_count == 5
    assert by_dept["Finance"].risk_level == "medium"
    assert by_dept["Finance"].dot_count == 3


def test_build_department_risk_not_all_low_without_metrics():
    jobs = [{"status": "OPEN", "business_department": f"Dept {i}"} for i in range(12)]
    rows = build_department_risk(jobs, {}, {}, {f"Dept {i}": i % 4 for i in range(12)})
    levels = {row.risk_level for row in rows}
    assert "low" in levels
    assert len(levels) > 1
