from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class AllocationMasterRow(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    allocation_code: Optional[str] = None
    project_id: str
    project_name: Optional[str] = None
    employee_id: str
    employee_name: Optional[str] = None
    role: Optional[str] = None
    allocation_type: Optional[str] = None
    billable: bool = True
    billing_category: Optional[str] = None
    allocation_percentage: int = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "PENDING"
    approval_status: str = "PENDING"
    primary_project_flag: bool = False
    shadow_flag: bool = False
    backup_flag: bool = False
    reserve_flag: bool = False
    cost_rate: Optional[float] = None
    billing_rate: Optional[float] = None
    client_name: Optional[str] = None
    business_unit: Optional[str] = None
    department: Optional[str] = None
    manager_id: Optional[str] = None
    remarks: Optional[str] = None
    conflict_flag: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AllocationMasterCreate(BaseModel):
    project_id: str
    employee_id: str
    role: Optional[str] = None
    allocation_percentage: int = 100
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    billable: bool = True
    allocation_type: Optional[str] = "FULL_TIME"
    billing_category: Optional[str] = None
    status: Optional[str] = "PENDING"
    primary_project_flag: bool = False
    shadow_flag: bool = False
    backup_flag: bool = False
    reserve_flag: bool = False
    cost_rate: Optional[float] = None
    billing_rate: Optional[float] = None
    manager_id: Optional[str] = None
    remarks: Optional[str] = None


class AllocationMasterUpdate(BaseModel):
    role: Optional[str] = None
    approval_status: Optional[str] = None
    allocation_percentage: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    billable: Optional[bool] = None
    allocation_type: Optional[str] = None
    billing_category: Optional[str] = None
    status: Optional[str] = None
    approval_status: Optional[str] = None
    primary_project_flag: Optional[bool] = None
    shadow_flag: Optional[bool] = None
    backup_flag: Optional[bool] = None
    reserve_flag: Optional[bool] = None
    cost_rate: Optional[float] = None
    billing_rate: Optional[float] = None
    manager_id: Optional[str] = None
    remarks: Optional[str] = None


class StaffingRequestCreate(BaseModel):
    project_id: str
    request_title: str
    request_type: Optional[str] = "STAFFING"
    required_role: Optional[str] = None
    required_skill: Optional[str] = None
    skill_category: Optional[str] = None
    competency_level: Optional[str] = None
    experience_required: Optional[str] = None
    certification_required: Optional[str] = None
    location_required: Optional[str] = None
    work_mode: Optional[str] = None
    billable_flag: bool = True
    billing_type: Optional[str] = None
    requested_count: int = 1
    needed_from_date: Optional[str] = None
    needed_till_date: Optional[str] = None
    urgency: Optional[str] = "medium"
    priority: Optional[str] = "medium"
    justification: Optional[str] = None
    remarks: Optional[str] = None


class StaffingRequestUpdate(BaseModel):
    request_title: Optional[str] = None
    required_role: Optional[str] = None
    required_skill: Optional[str] = None
    requested_count: Optional[int] = None
    needed_from_date: Optional[str] = None
    needed_till_date: Optional[str] = None
    urgency: Optional[str] = None
    priority: Optional[str] = None
    request_status: Optional[str] = None
    approval_status: Optional[str] = None
    justification: Optional[str] = None
    remarks: Optional[str] = None


class ApprovalActionBody(BaseModel):
    action: Literal["approve", "reject", "escalate"]
    reason: Optional[str] = None
    stage: Optional[str] = None


class NoteCreate(BaseModel):
    allocation_id: Optional[str] = None
    project_id: Optional[str] = None
    body: str
    note_type: Optional[str] = "general"


class AlertAckBody(BaseModel):
    acknowledged: bool = True


class ConflictResolveBody(BaseModel):
    resolution_status: str = "RESOLVED"
    remarks: Optional[str] = None
    override_flag: bool = False


def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
