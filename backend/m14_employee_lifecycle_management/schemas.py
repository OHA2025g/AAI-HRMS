from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, model_validator


class PreboardingCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    offer_accepted_on: Optional[str] = Field(default=None, min_length=8)
    joining_date_confirmed: Optional[str] = Field(default=None, min_length=8)
    buddy_id: Optional[str] = Field(default=None, max_length=64)
    reporting_manager_id: Optional[str] = Field(default=None, max_length=64)
    preboarding_status: str = Field(default="OPEN", max_length=40)
    checklist_payload: Dict[str, Any] = Field(default_factory=dict)
    communication_status: str = Field(default="PENDING", max_length=40)
    asset_readiness_flag: bool = False
    remarks: Optional[str] = None


class OnboardingCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    onboarding_start_date: Optional[str] = Field(default=None, min_length=8)
    onboarding_end_date: Optional[str] = Field(default=None, min_length=8)
    onboarding_status: str = Field(default="IN_PROGRESS", max_length=40)
    hr_induction_status: str = Field(default="PENDING", max_length=40)
    department_induction_status: str = Field(default="PENDING", max_length=40)
    role_onboarding_status: str = Field(default="PENDING", max_length=40)
    policy_ack_status: str = Field(default="PENDING", max_length=40)
    access_status: str = Field(default="PENDING", max_length=40)
    asset_status: str = Field(default="PENDING", max_length=40)
    checklist_payload: Dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def end_after_start(self):
        if self.onboarding_end_date and self.onboarding_start_date and self.onboarding_end_date < self.onboarding_start_date:
            raise ValueError("onboarding_end_date cannot be before onboarding_start_date")
        return self


class ProbationCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    probation_start_date: str = Field(..., min_length=8)
    probation_end_date: str = Field(..., min_length=8)
    review_date: Optional[str] = Field(default=None, min_length=8)
    probation_status: str = Field(default="IN_PROGRESS", max_length=40)
    extension_flag: bool = False
    extension_reason: Optional[str] = None
    manager_feedback: Optional[str] = None
    final_recommendation: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.probation_end_date < self.probation_start_date:
            raise ValueError("probation_end_date cannot be before probation_start_date")
        if self.review_date and self.review_date < self.probation_start_date:
            raise ValueError("review_date cannot be before probation_start_date")
        return self


class ResignationCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    resignation_submitted_on: str = Field(..., min_length=8)
    last_working_day: str = Field(..., min_length=8)
    reason_primary: str = Field(default="OTHER", max_length=80)
    reason_secondary: Optional[str] = Field(default=None, max_length=120)
    approval_status: str = Field(default="PENDING", max_length=40)
    withdrawal_flag: bool = False
    exit_status: str = Field(default="IN_PROGRESS", max_length=40)

    @model_validator(mode="after")
    def lwd_after_resignation(self):
        if self.last_working_day < self.resignation_submitted_on:
            raise ValueError("last_working_day cannot be before resignation_submitted_on")
        return self


class GenericNoteCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    note_type: str = Field(default="HR_NOTE", max_length=40)
    title: str = Field(..., min_length=2, max_length=200)
    body: Dict[str, Any] = Field(default_factory=dict)
    status: str = Field(default="OPEN", max_length=40)

