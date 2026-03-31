"""M6-3: anonymity thresholds and RBAC helpers."""

from __future__ import annotations

import os
from typing import Any, Dict, Tuple


def anonymity_min_threshold() -> int:
    return max(1, int(os.environ.get("ENGAGEMENT_ANONYMITY_MIN_RESPONSES", "5")))


def should_redact_survey_aggregates(response_count: int) -> Tuple[bool, str]:
    """If True, omit granular analytics for this slice."""
    m = anonymity_min_threshold()
    if response_count < m:
        return True, (
            f"Aggregates for this view are suppressed until at least {m} responses exist "
            f"(privacy / anonymity threshold)."
        )
    return False, ""


def redacted_dashboard_payload(
    *,
    total_responses: int,
    base: Dict[str, Any],
) -> Dict[str, Any]:
    redact, note = should_redact_survey_aggregates(total_responses)
    if not redact:
        return {**base, "anonymity_note": None}
    return {
        "total_responses": total_responses,
        "avg_rating": 0.0,
        "last_30_days_responses": base.get("last_30_days_responses", 0),
        "sentiment_counts": {},
        "topic_counts": {},
        "weekly_trend": [],
        "display_confidence": "LOW",
        "confidence_rationale": note,
        "anonymity_note": note,
    }
