from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CopilotQueryCreate(BaseModel):
    query_text: str = Field(..., min_length=1, max_length=8000)
    query_type: Literal["engagement", "sentiment", "experience", "general"] = "engagement"
    source_type: Literal["ui", "api", "scheduled"] = "ui"
    is_mock: bool = True
