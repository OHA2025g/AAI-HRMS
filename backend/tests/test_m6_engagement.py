"""M6 engagement: sentiment, topics, privacy, schedules (no Mongo)."""

from datetime import datetime, timezone

from m6_engagement.privacy import anonymity_min_threshold, redacted_dashboard_payload, should_redact_survey_aggregates
from m6_engagement.schedules import next_run_after, parse_iso_dt
from m6_engagement.sentiment import compute_sentiment
from m6_engagement.topics import aggregate_topic_counts, classify_topic, confidence_tier, weekly_rating_trends


def test_compute_sentiment_rating_and_text():
    s = compute_sentiment(5, "great team and helpful manager")
    assert s["sentiment_label"] == "POSITIVE"
    assert s["sentiment_pipeline_version"]


def test_classify_topic_workload():
    assert classify_topic("Too many deadlines and overload") == "WORKLOAD"


def test_aggregate_topic_counts_uses_stored_primary():
    rows = [{"topic_primary": "CAREER", "response_text": "x"}, {"response_text": "pay is unfair"}]
    c = aggregate_topic_counts(rows)
    assert c.get("CAREER") == 1
    assert c.get("COMPENSATION") == 1


def test_weekly_rating_trends_shape():
    rows = [
        {"created_at": "2025-03-10T12:00:00+00:00", "rating": 4},
        {"created_at": "2025-03-11T12:00:00+00:00", "rating": 2},
    ]
    wt = weekly_rating_trends(rows, max_weeks=4)
    assert len(wt) >= 1
    assert "week" in wt[0] and "avg_rating" in wt[0]


def test_confidence_tier():
    assert confidence_tier(2)[0] == "LOW"
    assert confidence_tier(10)[0] == "MEDIUM"
    assert confidence_tier(30)[0] == "HIGH"


def test_should_redact_below_threshold(monkeypatch):
    monkeypatch.setenv("ENGAGEMENT_ANONYMITY_MIN_RESPONSES", "5")
    redact, note = should_redact_survey_aggregates(3)
    assert redact is True
    assert "5" in note


def test_redacted_dashboard_payload():
    base = {"last_30_days_responses": 1}
    out = redacted_dashboard_payload(total_responses=2, base=base)
    assert out["display_confidence"] == "LOW"
    assert out["topic_counts"] == {}
    assert out["anonymity_note"]


def test_next_run_after_weekly():
    ref = datetime(2025, 1, 1, tzinfo=timezone.utc)
    n = next_run_after("WEEKLY", ref)
    assert (n - ref).days == 7


def test_parse_iso_dt_z_suffix():
    dt = parse_iso_dt("2025-01-15T10:00:00Z")
    assert dt.tzinfo is not None


def test_anonymity_min_threshold_env(monkeypatch):
    monkeypatch.setenv("ENGAGEMENT_ANONYMITY_MIN_RESPONSES", "10")
    assert anonymity_min_threshold() == 10


def test_anonymity_min_threshold_default(monkeypatch):
    monkeypatch.delenv("ENGAGEMENT_ANONYMITY_MIN_RESPONSES", raising=False)
    assert anonymity_min_threshold() == 5
