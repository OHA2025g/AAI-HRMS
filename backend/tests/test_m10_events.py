"""M10 event backbone — unit tests (no Mongo)."""

from m10_events.schemas import M10EventEnvelope
from m10_events.topics import ALL_TOPICS, TOPIC_WORKFLOW_RUN_COMPLETED


def test_topics_versioned():
    assert TOPIC_WORKFLOW_RUN_COMPLETED.endswith(".v1")
    assert len(ALL_TOPICS) >= 3


def test_envelope_roundtrip():
    e = M10EventEnvelope(
        event_id="x",
        topic=TOPIC_WORKFLOW_RUN_COMPLETED,
        occurred_at="2025-01-01T00:00:00+00:00",
        payload={"run_id": "r1"},
        idempotency_key="workflow_run:r1:completed",
    )
    d = e.model_dump()
    assert d["payload"]["run_id"] == "r1"
    assert d["idempotency_key"] == "workflow_run:r1:completed"
