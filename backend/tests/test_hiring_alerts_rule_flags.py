"""Tests for hiring alert rule-flag governance."""

from talent_acquisition.hiring_alerts import build_hiring_alerts
from talent_acquisition.hiring_dashboard_config import DEFAULT_RULE_FLAGS, HiringDashboardConfig


def _all_off_flags():
    return {key: False for key in DEFAULT_RULE_FLAGS}


def test_low_fit_alert_suppressed_when_flag_disabled():
    cfg = HiringDashboardConfig(rule_flags={**DEFAULT_RULE_FLAGS, "low_fit": False})
    alerts = build_hiring_alerts(
        stuck_by_stage={},
        req_aging_over_60=0,
        req_aging_over_90=0,
        jobs_without_pipeline=0,
        low_fit_jobs=3,
        dashboard_config=cfg,
    )
    assert not any(a["id"] == "low-fit-jobs" for a in alerts)


def test_stuck_stage_alerts_suppressed_when_flag_disabled():
    cfg = HiringDashboardConfig(rule_flags={**DEFAULT_RULE_FLAGS, "stuck_stage": False})
    alerts = build_hiring_alerts(
        stuck_by_stage={"SCREENING": 4, "INTERVIEW_1": 2},
        req_aging_over_60=0,
        req_aging_over_90=0,
        jobs_without_pipeline=0,
        low_fit_jobs=0,
        dashboard_config=cfg,
    )
    assert not any(a["id"].startswith("stuck-") for a in alerts)


def test_stale_req_alerts_suppressed_when_flag_disabled():
    cfg = HiringDashboardConfig(rule_flags={**DEFAULT_RULE_FLAGS, "stale_req": False})
    alerts = build_hiring_alerts(
        stuck_by_stage={},
        req_aging_over_60=2,
        req_aging_over_90=1,
        jobs_without_pipeline=0,
        low_fit_jobs=0,
        stale_req_zero_interviews=3,
        dashboard_config=cfg,
    )
    stale_ids = {"stale-req-zero-interviews", "req-aging-over-60", "req-aging-over-90"}
    assert not any(a["id"] in stale_ids for a in alerts)


def test_no_pipeline_alert_suppressed_when_flag_disabled():
    cfg = HiringDashboardConfig(rule_flags={**DEFAULT_RULE_FLAGS, "no_pipeline": False})
    alerts = build_hiring_alerts(
        stuck_by_stage={},
        req_aging_over_60=0,
        req_aging_over_90=0,
        jobs_without_pipeline=3,
        low_fit_jobs=0,
        dashboard_config=cfg,
    )
    assert not any(a["id"] == "jobs-without-pipeline" for a in alerts)


def test_no_ai_matches_alert_suppressed_when_flag_disabled():
    cfg = HiringDashboardConfig(rule_flags={**DEFAULT_RULE_FLAGS, "no_ai_matches": False})
    alerts = build_hiring_alerts(
        stuck_by_stage={},
        req_aging_over_60=0,
        req_aging_over_90=0,
        jobs_without_pipeline=0,
        low_fit_jobs=0,
        jobs_without_ai_matches=2,
        dashboard_config=cfg,
    )
    assert not any(a["id"] == "jobs-without-ai-matches" for a in alerts)


def test_high_fit_recent_alert_suppressed_when_flag_disabled():
    cfg = HiringDashboardConfig(rule_flags={**DEFAULT_RULE_FLAGS, "high_fit_recent": False})
    alerts = build_hiring_alerts(
        stuck_by_stage={},
        req_aging_over_60=0,
        req_aging_over_90=0,
        jobs_without_pipeline=0,
        low_fit_jobs=0,
        high_fit_candidates_7d=5,
        dashboard_config=cfg,
    )
    assert not any(a["id"] == "new-high-fit-candidates-7d" for a in alerts)


def test_all_rule_flags_off_suppresses_all_governed_alerts():
    cfg = HiringDashboardConfig(rule_flags=_all_off_flags())
    alerts = build_hiring_alerts(
        stuck_by_stage={"SCREENING": 5},
        req_aging_over_60=2,
        req_aging_over_90=1,
        jobs_without_pipeline=2,
        low_fit_jobs=1,
        jobs_without_ai_matches=1,
        high_fit_candidates_7d=2,
        stale_req_zero_interviews=1,
        dashboard_config=cfg,
    )
    assert alerts == []
