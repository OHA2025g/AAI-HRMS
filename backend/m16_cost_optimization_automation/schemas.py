from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class CopilotQueryCreate(BaseModel):
    query_text: str = Field(..., min_length=1, max_length=8000)
    query_type: Literal["cost", "automation", "general"] = "cost"
    source_type: Literal["ui", "api", "scheduled"] = "ui"
    is_mock: bool = True


class CostScenarioCreate(BaseModel):
    scenario_name: str = Field(..., min_length=1, max_length=240)
    scenario_type: str = Field(..., min_length=1, max_length=120)
    input_payload: dict[str, Any] = Field(default_factory=dict)


class ContinuousImprovementUpdate(BaseModel):
    status: Optional[str] = None
    owner_id: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=4000)
