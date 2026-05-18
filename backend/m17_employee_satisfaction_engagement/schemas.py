from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PagedItems(BaseModel):
    items: List[Dict[str, Any]] = Field(default_factory=list)
    total: int = 0
    skip: int = 0
    limit: int = 200


class FeedbackCreate(BaseModel):
    feedback_type: str = "open"
    source_channel: str = "web"
    category: str = "general"
    feedback_text: str
    severity: str = "low"
    department: Optional[str] = None
    manager_id: Optional[str] = None


class ActionPlanCreate(BaseModel):
    scope_type: str = "department"
    scope_id: str
    action_title: str
    action_type: str = "improvement"
    owner_id: str
    priority: str = "P2"
    due_date: str


class GovernanceRecordCreate(BaseModel):
    workflow_type: str
    subject_id: str
    status: str = "pending"
    payload: Dict[str, Any] = Field(default_factory=dict)


class ScenarioWhatIfCreate(BaseModel):
    scenario_type: str = "custom"
    input_payload: Dict[str, Any] = Field(default_factory=dict)


class CopilotQueryCreate(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None
