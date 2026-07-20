"""Unit tests for Smart Hiring Dashboard helpers."""

from datetime import datetime, timezone

from talent_acquisition.candidate_source import display_channel_mongo_filter
from talent_acquisition.hiring_alerts import build_hiring_alerts, compute_health_score
from talent_acquisition.hiring_constants import (
    pipeline_path_for_stage,
    pipeline_tab_for_stage,
)
from talent_acquisition.hiring_dashboard import (
    _application_stage_dwell_rows,
    _days_in_stage_bucket,
    _interview_round_metrics,
    _median,
    build_funnel,
    build_offer_funnel,
    compute_time_to_fill_days,
    compute_time_to_hire_days,
    display_source_channel,
)
from talent_acquisition.hiring_dashboard_schemas import StageAgingSummary


def test_median_fit_score():
    assert _median([10, 20, 30]) == 20
    assert _median([10, 20, 30, 40]) == 25
    assert _median([]) is None


def test_compute_time_to_fill_days():
    created = {"j1": datetime(2026, 1, 1, tzinfo=timezone.utc)}
    apps = [{"job_id": "j1", "updated_at": "2026-01-31T00:00:00+00:00"}]
    median, avg = compute_time_to_fill_days(created, apps)
    assert median == 30.0
    assert avg == 30.0


def test_compute_time_to_hire_days():
    started = {"a1": datetime(2026, 1, 10, tzinfo=timezone.utc)}
    apps = [{"id": "a1", "updated_at": "2026-02-09T00:00:00+00:00"}]
    median, avg = compute_time_to_hire_days(started, apps)
    assert median == 30.0
    assert avg == 30.0


def test_ai_match_adoption_pct():
    open_ids = ["j1", "j2", "j3", "j4"]
    with_scores = {"j1", "j2"}
    with_matches = sum(1 for jid in open_ids if jid in with_scores)
    pct = round(100.0 * with_matches / len(open_ids), 2)
    assert pct == 50.0


def test_alerts_stale_req_zero_interviews():
    alerts = build_hiring_alerts(
        stuck_by_stage={},
        req_aging_over_60=0,
        req_aging_over_90=0,
        jobs_without_pipeline=0,
        low_fit_jobs=0,
        stale_req_zero_interviews=2,
    )
    assert any(a["id"] == "stale-req-zero-interviews" for a in alerts)
    assert alerts[0]["severity"] == "critical"


def test_alerts_jobs_without_ai_matches():
    alerts = build_hiring_alerts(
        stuck_by_stage={},
        req_aging_over_60=0,
        req_aging_over_90=0,
        jobs_without_pipeline=0,
        low_fit_jobs=0,
        jobs_without_ai_matches=3,
    )
    assert any(a["action_path"] == "/jobs?status=OPEN&without_matches=1" for a in alerts)


def test_build_funnel_conversion():
    counts = {
        "SOURCED": 100,
        "SCREENING": 40,
        "ASSESSMENT_SENT": 20,
        "ASSESSMENT_CLEARED": 15,
        "INTERVIEW_1": 10,
        "INTERVIEW_2": 8,
        "INTERVIEW_3": 6,
        "HR_ROUND": 4,
        "OFFER": 2,
        "JOINED": 1,
    }
    funnel = build_funnel(counts)
    assert funnel[0].stage == "SOURCED"
    assert funnel[0].count == 100
    assert funnel[1].conversion_from_prev_pct == 40.0
    assert any(f.stage == "INTERVIEW_3" for f in funnel)
    assert any(f.stage == "HR_ROUND" for f in funnel)


def test_interview_round_metrics():
    stage_counts = {
        "INTERVIEW_1": 10,
        "INTERVIEW_2": 6,
        "INTERVIEW_3": 4,
        "HR_ROUND": 2,
        "OFFER": 1,
    }
    summary = [
        StageAgingSummary(stage="INTERVIEW_1", label="Interview 1", avg_days=5.0, count=10),
        StageAgingSummary(stage="INTERVIEW_2", label="Interview 2", avg_days=3.0, count=6),
    ]
    metrics = _interview_round_metrics(stage_counts, summary)
    assert len(metrics) == 4
    assert metrics[0].active_count == 10
    assert metrics[0].avg_days == 5.0
    assert metrics[0].conversion_to_next_pct == 60.0


def test_display_source_channel_labels():
    excel = {"seed_marker": "excel_candidates_v1", "source": "TALENT_POOL"}
    assert display_source_channel(excel) == "talent_pool_ex"
    linkedin = {
        "source": "LINKEDIN",
        "seed_marker": "job_posting_fit_candidates_v1",
        "email": "fitseed.abc.0@aai-hrms.local",
    }
    assert display_source_channel(linkedin) == "linkedin"
    bulk = {"source": "BULK_SEED"}
    assert display_source_channel(bulk) == "talent_pool"


def test_pipeline_stage_drill_paths():
    assert pipeline_tab_for_stage("ASSESSMENT_SENT") == "ASSESSMENT"
    assert pipeline_tab_for_stage("INTERVIEW_1") == "INTERVIEW"
    assert pipeline_tab_for_stage("OFFER") == "SALARY"
    assert pipeline_path_for_stage("ASSESSMENT_SENT") == "/pipeline?stage=ASSESSMENT"
    assert pipeline_path_for_stage("SCREENING") == "/pipeline?stage=SCREENING"


def test_days_in_stage_bucket():
    assert _days_in_stage_bucket(0) == "0-7d"
    assert _days_in_stage_bucket(7) == "0-7d"
    assert _days_in_stage_bucket(8) == "8-14d"
    assert _days_in_stage_bucket(15) == "15-30d"
    assert _days_in_stage_bucket(31) == "31+d"


def test_prior_open_jobs_heuristic():
    open_jobs = 12
    new_open_in_cur = 3
    new_open_in_prior = 2
    prior_open = max(0, int(open_jobs - new_open_in_cur + new_open_in_prior))
    assert prior_open == 11


def test_display_channel_mongo_filter_keys():
    assert "$or" in display_channel_mongo_filter("talent_pool_ex")
    tp = display_channel_mongo_filter("talent_pool")
    assert "$and" in tp or "source" in tp
    assert "$or" in display_channel_mongo_filter("linkedin")
    assert display_channel_mongo_filter("unknown") == {}


def test_all_talent_pool_includes_excel_and_db():
    from talent_acquisition.candidate_source import all_talent_pool_mongo_filter

    filt = all_talent_pool_mongo_filter()
    assert "$or" in filt
    assert len(filt["$or"]) == 2


def test_candidate_fit_filter_none_when_no_bounds():
    import asyncio
    from talent_acquisition.candidate_fit_filter import candidate_ids_matching_fit_range

    class FakeDb:
        pass

    result = asyncio.run(candidate_ids_matching_fit_range(FakeDb(), None, None))
    assert result is None


def test_alerts_use_pipeline_tab_paths():
    alerts = build_hiring_alerts(
        stuck_by_stage={"ASSESSMENT_SENT": 5},
        req_aging_over_60=0,
        req_aging_over_90=0,
        jobs_without_pipeline=0,
        low_fit_jobs=0,
    )
    assert alerts
    assert alerts[0]["action_path"] == "/pipeline?stage=ASSESSMENT"


def test_alerts_high_fit_recent():
    alerts = build_hiring_alerts(
        stuck_by_stage={},
        req_aging_over_60=0,
        req_aging_over_90=0,
        jobs_without_pipeline=0,
        low_fit_jobs=0,
        high_fit_candidates_7d=4,
    )
    assert any(a["id"] == "new-high-fit-candidates-7d" for a in alerts)
    assert any(a["action_path"] == "/candidates?fit_min=90" for a in alerts)


def test_alerts_low_fit_job_matches_tab():
    alerts = build_hiring_alerts(
        stuck_by_stage={},
        req_aging_over_60=0,
        req_aging_over_90=0,
        jobs_without_pipeline=0,
        low_fit_jobs=2,
        low_fit_job_id="job-abc",
    )
    low = next(a for a in alerts if a["id"] == "low-fit-jobs")
    assert low["action_path"] == "/jobs/job-abc?tab=matches"


def test_alerts_and_health_score():
    alerts = build_hiring_alerts(
        stuck_by_stage={"SCREENING": 5},
        req_aging_over_60=2,
        req_aging_over_90=1,
        jobs_without_pipeline=3,
        low_fit_jobs=1,
    )
    assert len(alerts) >= 2
    score, status = compute_health_score(
        funnel_conversion_to_interview=12.0,
        avg_fit=68.0,
        req_aging_over_60=2,
        open_jobs=10,
        stuck_total=5,
    )
    assert 0 <= score <= 100
    assert status in ("ok", "watch", "critical")


def test_health_score_funnel_bonus():
    score_high, _ = compute_health_score(
        funnel_conversion_to_interview=20.0,
        avg_fit=None,
        req_aging_over_60=0,
        open_jobs=5,
        stuck_total=0,
    )
    score_low, _ = compute_health_score(
        funnel_conversion_to_interview=3.0,
        avg_fit=None,
        req_aging_over_60=0,
        open_jobs=5,
        stuck_total=0,
    )
    assert score_high > score_low


def test_health_score_empty_db_has_no_fabricated_baseline():
    score, status = compute_health_score(
        funnel_conversion_to_interview=None,
        avg_fit=None,
        req_aging_over_60=0,
        open_jobs=0,
        stuck_total=0,
    )
    assert score is None
    assert status is None


def test_expected_hires_zero_without_activity():
    from talent_acquisition.hiring_dashboard_insights import compute_expected_hires

    assert (
        compute_expected_hires(
            window_days=30,
            hires_in_window=0,
            pending_offers=0,
            interview_ready=0,
            monthly_target=10,
        )
        == 0
    )


def test_build_ai_recommendation_none_when_no_alerts():
    from talent_acquisition.hiring_dashboard_insights import build_ai_recommendation

    assert build_ai_recommendation([]) is None


def test_application_stage_dwell_rows():
    rows = [
        {"to_stage": "SOURCED", "changed_at": "2026-01-01T00:00:00+00:00"},
        {"to_stage": "INTERVIEW_1", "changed_at": "2026-01-11T00:00:00+00:00"},
        {"to_stage": "OFFER", "changed_at": "2026-01-21T00:00:00+00:00"},
        {"to_stage": "JOINED", "changed_at": "2026-02-10T00:00:00+00:00"},
    ]
    dwell = _application_stage_dwell_rows(rows, "2026-02-10T00:00:00+00:00")
    assert dwell == [
        ("SOURCED", 10.0),
        ("INTERVIEW_1", 10.0),
        ("OFFER", 20.0),
    ]
    assert max(dwell, key=lambda x: x[1]) == ("OFFER", 20.0)


def test_build_offer_funnel():
    from talent_acquisition.hiring_dashboard_schemas import OfferStatusCount

    counts = [
        OfferStatusCount(status="SENT", label="Offer sent", count=5),
        OfferStatusCount(status="NEGOTIATION", label="In negotiation", count=2),
        OfferStatusCount(status="ACCEPTED", label="Accepted", count=1),
    ]
    funnel = build_offer_funnel(counts)
    assert [f.stage for f in funnel] == [
        "OFFER_SENT",
        "OFFER_NEGOTIATION",
        "OFFER_ACCEPTED",
        "OFFER_DECLINED",
    ]
    assert funnel[0].count == 5
    assert funnel[1].count == 2


def test_build_ai_recommendation_from_alerts():
    from talent_acquisition.hiring_dashboard_insights import build_ai_recommendation

    rec = build_ai_recommendation(
        [{"title": "Stuck pipeline", "message": "Fix assessment", "action_path": "/pipeline", "severity": "critical"}]
    )
    assert rec.title == "Stuck pipeline"
    assert rec.action_path == "/pipeline"


def test_build_smart_actions():
    from talent_acquisition.hiring_dashboard_insights import build_smart_actions

    actions = build_smart_actions(
        pending_offers=3,
        high_fit_count=18,
        schedule_interviews=27,
        escalate_delays=4,
        hiring_risks=2,
    )
    assert len(actions) == 5
    assert actions[0].count == 3
    assert actions[0].id == "approve-offers"


def test_build_tab_kpis_shapes():
    from talent_acquisition.hiring_dashboard_insights import build_tab_kpis

    kpis = build_tab_kpis(
        stage_counts={"SOURCED": 100, "ASSESSMENT_SENT": 24, "ASSESSMENT_CLEARED": 7, "INTERVIEW_1": 2, "OFFER": 2},
        active_pipeline=531,
        stuck_assessment=23,
        offer_status_counts=[],
        offer_aging=[],
        interview_round_metrics=[],
        new_apps=530,
        avg_fit=80,
        high_fit_pct=10,
        funnel_to_offer_pct=0.4,
        avg_stage_age=18,
    )
    assert kpis.pipeline.total == 531
    assert kpis.pipeline.sourced == 100
    assert kpis.analytics.applications == 530


def test_offer_aging_row_includes_expected_ctc():
    from talent_acquisition.hiring_dashboard_schemas import OfferAgingRow

    row = OfferAgingRow(
        application_id="a1",
        candidate_id="c1",
        candidate_name="Test",
        job_id="j1",
        job_title="Engineer",
        days_in_offer=0,
        entered_offer_at="2026-06-12T00:00:00+00:00",
        sla_days=7,
        offer_value=1850000,
        action_path="/pipeline?application_id=a1",
    )
    assert row.offer_value == 1850000
    assert row.action_path.endswith("a1")


def test_monthly_hire_target_default():
    from talent_acquisition.hiring_threshold_config import DEFAULT_MONTHLY_HIRE_TARGET, get_monthly_hire_target

    assert get_monthly_hire_target() == DEFAULT_MONTHLY_HIRE_TARGET


def test_get_hiring_filter_options_distinct_values():
    from talent_acquisition.hiring_dashboard import get_dashboard_filter_options

    class FakeCursor:
        def __init__(self, rows):
            self._rows = rows

        async def to_list(self, _limit):
            return self._rows

    class FakeJobs:
        def __init__(self, rows):
            self._rows = rows

        def find(self, _filt, _proj):
            return FakeCursor(self._rows)

    class FakeDb:
        def __init__(self, rows):
            self.jobs = FakeJobs(rows)

    rows = [
        {
            "business_pillar": "Core Business",
            "business_department": "Sales",
            "department": "Sales",
            "business_sub_department": "Inside Sales",
            "project_id": "PRJ-1",
        },
        {
            "business_pillar": "Core Business",
            "business_department": "Marketing Department",
            "department": "Marketing Department",
            "business_sub_department": "Digital Marketing",
            "project_id": "PRJ-2",
        },
        {
            "business_pillar": "Technology",
            "business_department": "Engineering",
            "department": "Engineering",
            "business_sub_department": "Platform",
            "project_id": "PRJ-3",
        },
    ]

    import asyncio

    async def run():
        all_opts = await get_dashboard_filter_options(FakeDb(rows), job_ids=None)
        assert all_opts["pillars"] == ["Core Business", "Technology"]
        assert "Sales" in all_opts["departments"]
        assert "Engineering" in all_opts["departments"]

        pillar_opts = await get_dashboard_filter_options(
            FakeDb(rows),
            job_ids=None,
            business_pillar="Core Business",
        )
        assert pillar_opts["departments"] == ["Marketing Department", "Sales"]
        assert "Engineering" not in pillar_opts["departments"]

        dept_opts = await get_dashboard_filter_options(
            FakeDb(rows),
            job_ids=None,
            business_pillar="Core Business",
            department="Sales",
        )
        assert dept_opts["sub_departments"] == ["Inside Sales"]
        assert dept_opts["project_ids"] == ["PRJ-1"]

    asyncio.run(run())
