"""
Versioned topic names (M10-2). Bump suffix (v2) for breaking payload changes.
"""

# Employee domain
TOPIC_EMPLOYEE_LIFECYCLE_EVENT_CREATED = "hrms.employee.lifecycle_event.created.v1"

# Automation domain
TOPIC_WORKFLOW_RUN_COMPLETED = "hrms.workflow.run.completed.v1"
TOPIC_WORKFLOW_RUN_FAILED = "hrms.workflow.run.failed.v1"

ALL_TOPICS = frozenset(
    {
        TOPIC_EMPLOYEE_LIFECYCLE_EVENT_CREATED,
        TOPIC_WORKFLOW_RUN_COMPLETED,
        TOPIC_WORKFLOW_RUN_FAILED,
    }
)
