"""M10 event schemas (minimal stub for API boot)."""

from pydantic import BaseModel, Field


class M10ReplayRequest(BaseModel):
    topic: str | None = None
    from_ts: str | None = None
    to_ts: str | None = None
    limit: int = Field(default=100, ge=1, le=1000)
