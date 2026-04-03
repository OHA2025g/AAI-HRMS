"""Event envelope schema (M10-2)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class M10EventEnvelope(BaseModel):
    """Canonical wire/document shape stored in m10_events.envelope."""

    event_id: str
    topic: str
    occurred_at: str
    producer: str = "aai-hrms-monolith"
    schema_version: str = "1.0"
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class M10ReplayRequest(BaseModel):
    event_ids: List[str] = Field(default_factory=list)
    topic: Optional[str] = None
    since_iso: Optional[str] = None
    limit: int = Field(default=100, ge=1, le=500)
