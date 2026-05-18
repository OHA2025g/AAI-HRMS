from m17_employee_satisfaction_engagement.schemas import (
    ActionPlanCreate,
    FeedbackCreate,
    GovernanceRecordCreate,
    ScenarioWhatIfCreate,
)


def test_feedback_create_minimal():
    f = FeedbackCreate(feedback_text="Great tools", category="workplace")
    assert f.feedback_type == "open"
    assert f.severity == "low"


def test_action_plan_create():
    a = ActionPlanCreate(
        scope_type="team",
        scope_id="T1",
        action_title="Increase 1:1s",
        owner_id="u1",
        due_date="2026-12-31",
    )
    assert a.priority == "P2"


def test_governance_payload_defaults():
    g = GovernanceRecordCreate(workflow_type="survey_approval", subject_id="S1")
    assert g.status == "pending"
    assert g.payload == {}


def test_scenario_whatif_defaults():
    s = ScenarioWhatIfCreate()
    assert s.scenario_type == "custom"
    assert s.input_payload == {}


def test_list_segment_collection_covers_route_table():
    from m17_employee_satisfaction_engagement.constants import LIST_SEGMENT_COLLECTION

    assert "pulse-surveys" in LIST_SEGMENT_COLLECTION
    assert "executive-decision-support" in LIST_SEGMENT_COLLECTION
