"""Contract tests for Smart Hiring analytics fields on hiring-pack and trends."""

from talent_acquisition.hiring_dashboard_schemas import (
    BottleneckSlowHireRow,
    HireJourneyRow,
    HiringDashboardPack,
    HiringDashboardTrends,
    HiringSnapshotHealth,
    TrendPoint,
)


def test_hiring_pack_analytics_fields_on_schema():
    fields = HiringDashboardPack.model_fields
    for name in (
        "offer_aging",
        "offer_funnel",
        "offer_status_counts",
        "conversion_bottleneck",
        "bottleneck_slow_hires",
        "hire_journeys",
        "interview_round_metrics",
        "hero_risk_metrics",
        "tab_kpis",
        "smart_actions",
        "department_risk",
        "talent_intelligence",
        "recruiter_performance",
        "signal_strength",
        "analytics_summary",
    ):
        assert name in fields


def test_hiring_snapshot_health_schema():
    fields = HiringSnapshotHealth.model_fields
    assert "status" in fields
    assert set(fields["status"].annotation.__args__) == {
        "ok",
        "no_snapshots",
        "seeded_only",
        "stale",
    }
    assert "cron_token_configured" in fields
    assert "snapshot_on_boot_enabled" in fields


def test_hiring_trends_metadata_fields_on_schema():
    fields = HiringDashboardTrends.model_fields
    assert "snapshot_count" in fields
    assert "live_snapshot_count" in fields
    assert "last_live_snapshot_at" in fields
    assert set(HiringDashboardTrends.model_fields["data_source"].annotation.__args__) == {
        "snapshots",
        "seeded",
        "mixed",
        "synthetic",
    }


def test_bottleneck_slow_hire_row_model():
    row = BottleneckSlowHireRow(
        application_id="a1",
        candidate_id="c1",
        candidate_name="Test",
        job_title="Engineer",
        stage="OFFER",
        label="Offer",
        days=12.0,
        sla_days=7,
        over_sla_days=5.0,
        joined_at="2026-01-01T00:00:00+00:00",
    )
    assert row.over_sla_days == 5.0


def test_hire_journey_row_model():
    row = HireJourneyRow(
        application_id="a1",
        candidate_id="c1",
        candidate_name="Test",
        job_id="j1",
        job_title="Engineer",
        total_days=40.0,
        bottleneck_stage="OFFER",
        bottleneck_label="Offer",
        bottleneck_days=15.0,
        joined_at="2026-02-01T00:00:00+00:00",
    )
    assert row.total_days == 40.0


def test_trend_point_includes_offer_acceptance_pct():
    point = TrendPoint(period="2026-01-01", label="Jan 1", offer_acceptance_pct=82.5)
    assert point.offer_acceptance_pct == 82.5
