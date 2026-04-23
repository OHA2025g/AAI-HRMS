from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ResourceProfilePatch(BaseModel):
    """Overlay fields stored in resource_section_profiles (employee id = resource_id)."""

    employment_type: Optional[str] = None
    resource_category: Optional[str] = None
    sub_department: Optional[str] = None
    designation: Optional[str] = None
    grade: Optional[str] = None
    band: Optional[str] = None
    dotted_manager_id: Optional[str] = None
    geography: Optional[str] = None
    work_mode: Optional[str] = None
    cost_center: Optional[str] = None
    profile_summary: Optional[str] = None
    billable_classification: Optional[str] = None
    current_primary_skill: Optional[str] = None
    current_secondary_skills: Optional[List[str]] = None


class SkillRecordCreate(BaseModel):
    resource_id: str
    skill_name: str
    skill_category: Optional[str] = None
    skill_type: str = "SECONDARY"  # PRIMARY / SECONDARY / TOOL
    competency_level: Optional[str] = None
    proficiency_level: Optional[str] = None
    experience_years: Optional[float] = None
    domain_expertise: Optional[str] = None
    tool_expertise: Optional[str] = None
    certification_linked_flag: bool = False
    verified_flag: bool = False
    remarks: Optional[str] = None


class ResourceNoteCreate(BaseModel):
    resource_id: str
    note_type: str = "HR"
    title: Optional[str] = None
    content: str
    is_pinned: bool = False
    visibility_scope: str = "INTERNAL"


class ResourceApprovalActionBody(BaseModel):
    action: Literal["approve", "reject", "escalate"]
    reason: Optional[str] = None


# Alias for route handler import clarity
ApprovalActionBody = ResourceApprovalActionBody
