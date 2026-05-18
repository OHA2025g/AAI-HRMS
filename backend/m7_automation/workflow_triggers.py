"""M7-1: trigger evaluation for workflow rules (no I/O except datetime)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional


def should_execute_trigger(
    *,
    trigger_type: str,
    trigger_config: Dict[str, Any] | None,
    pending_lifecycle_count: int,
    manual: bool,
    rule: Optional[Dict[str, Any]] = None,
) -> tuple[bool, str]:
    """
    Returns (should_run, reason_if_skip).

    `manual=True` (admin "Run" or signed inbound webhook path) bypasses schedule/threshold checks.
    """
    t = (trigger_type or "MANUAL").upper()
    cfg = trigger_config or {}
    rule = rule or {}

    if manual:
        return True, ""

    if t == "WEBHOOK_INBOUND":
        return False, "Inbound webhook rules run only via POST /webhooks/workflow/inbound/{rule_id} with token."

    if t == "MANUAL":
        return False, "Rule is MANUAL-only; use explicit execute endpoint."

    if t == "ON_LIFECYCLE_PENDING_THRESHOLD":
        need = max(1, int(cfg.get("min_pending") or 1))
        if pending_lifecycle_count < need:
            return False, f"Pending lifecycle count {pending_lifecycle_count} < threshold {need}."
        return True, ""

    if t == "ON_SCHEDULE":
        nxt = rule.get("schedule_next_run_at") or cfg.get("next_run_at")
        if not nxt:
            return False, "ON_SCHEDULE requires schedule_next_run_at on the rule."
        try:
            raw = str(nxt).replace("Z", "+00:00")
            due = datetime.fromisoformat(raw)
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
        except Exception:
            return False, "Invalid schedule_next_run_at on rule."
        now = datetime.now(timezone.utc)
        if due > now:
            return False, f"Next run at {nxt} not yet due."
        return True, ""

    return False, f"Unknown trigger_type: {trigger_type}"
