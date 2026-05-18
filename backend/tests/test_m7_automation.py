"""M7 automation: triggers, copilot intent, savings (no Mongo)."""

from datetime import datetime, timedelta, timezone

from m7_automation.copilot_hf import _parse_zero_shot_response
from m7_automation.copilot_intent import detect_intent, extract_employee_code_hint, permission_for_intent
from m7_automation.savings import baseline_map, compute_savings_totals
from m7_automation.workflow_flow import topological_action_order
from m7_automation.workflow_triggers import should_execute_trigger
from m7_automation.workflow_webhook import validate_webhook_url


def test_trigger_manual_requires_explicit():
    ok, _ = should_execute_trigger(
        trigger_type="MANUAL",
        trigger_config={},
        pending_lifecycle_count=99,
        manual=False,
    )
    assert ok is False


def test_webhook_url_blocks_loopback():
    ok, _ = validate_webhook_url("http://127.0.0.1/x")
    assert ok is False


def test_schedule_trigger_due():
    past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    ok, _ = should_execute_trigger(
        trigger_type="ON_SCHEDULE",
        trigger_config={},
        pending_lifecycle_count=0,
        manual=False,
        rule={"schedule_next_run_at": past},
    )
    assert ok is True


def test_webhook_inbound_not_auto_dispatch():
    ok, _ = should_execute_trigger(
        trigger_type="WEBHOOK_INBOUND",
        trigger_config={},
        pending_lifecycle_count=0,
        manual=False,
        rule={},
    )
    assert ok is False


def test_flow_topological_actions():
    fg = {
        "nodes": [
            {"id": "t", "position": {"x": 0, "y": 0}, "data": {"label": "T"}},
            {"id": "a1", "position": {"x": 0, "y": 0}, "data": {"action_type": "NOOP", "action_config": {}}},
            {"id": "a2", "position": {"x": 0, "y": 1}, "data": {"action_type": "HTTP_WEBHOOK", "action_config": {"url": "https://example.com"}}},
        ],
        "edges": [{"source": "t", "target": "a1"}, {"source": "a1", "target": "a2"}],
    }
    order = topological_action_order(fg)
    assert [n["id"] for n in order] == ["a1", "a2"]


def test_trigger_threshold():
    ok, _ = should_execute_trigger(
        trigger_type="ON_LIFECYCLE_PENDING_THRESHOLD",
        trigger_config={"min_pending": 5},
        pending_lifecycle_count=5,
        manual=False,
    )
    assert ok is True


def test_detect_intent_status():
    assert detect_intent("What is automation status?") == "automation_status"


def test_detect_intent_reprocess():
    assert detect_intent("Please reprocess lifecycle events") == "reprocess_lifecycle"


def test_extract_employee_code():
    assert extract_employee_code_hint("lookup employee E1234") == "E1234"


def test_permission_for_intent():
    assert permission_for_intent("reprocess_lifecycle") == "lifecycle_write"
    assert permission_for_intent("employee_lookup") == "employees_read"


def test_parse_hf_zero_shot_response():
    lbls, scores = _parse_zero_shot_response(
        {"labels": ["The user wants metrics or health about HR automation, lifecycle event backlog, pending or failed jobs.", "other"], "scores": [0.82, 0.05]}
    )
    assert len(lbls) == 2
    assert scores[0] == 0.82


def test_savings_totals():
    baselines = baseline_map(
        [
            {"workflow_key": "REPROCESS_LIFECYCLE", "minutes_per_run": 10, "hourly_fully_loaded_cost_usd": 60},
        ]
    )
    runs = [
        {"status": "SUCCESS", "savings_workflow_key": "REPROCESS_LIFECYCLE"},
        {"status": "SUCCESS", "action_type": "REPROCESS_LIFECYCLE"},
        {"status": "FAILED", "savings_workflow_key": "REPROCESS_LIFECYCLE"},
    ]
    t = compute_savings_totals(successful_runs=runs, baselines=baselines)
    assert t["estimated_minutes_saved"] == 20.0
    assert t["estimated_cost_saved_usd"] == 20.0
