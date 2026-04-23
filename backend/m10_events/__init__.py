"""M10 — event-driven backbone (Mongo outbox, versioned topics)."""

from m10_events.producer import publish_event
from m10_events.topics import (
    TOPIC_EMPLOYEE_LIFECYCLE_EVENT_CREATED,
    TOPIC_WORKFLOW_RUN_COMPLETED,
    TOPIC_WORKFLOW_RUN_FAILED,
)

__all__ = [
    "publish_event",
    "TOPIC_EMPLOYEE_LIFECYCLE_EVENT_CREATED",
    "TOPIC_WORKFLOW_RUN_COMPLETED",
    "TOPIC_WORKFLOW_RUN_FAILED",
]
