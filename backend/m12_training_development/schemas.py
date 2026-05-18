from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from m12_training_development.constants import RECORD_TYPES


class TrainingProgramCreate(BaseModel):
    training_code: str = Field(..., min_length=1, max_length=64)
    training_name: str = Field(..., min_length=1, max_length=300)
    training_category: str = Field(default="GENERAL", max_length=80)
    training_type: str = Field(default="COURSE", max_length=80)
    level: str = Field(default="ALL", max_length=40)
    delivery_mode: str = Field(default="VIRTUAL", max_length=40)
    duration_hours: float = Field(default=0, ge=0, le=10_000)
    credits: float = Field(default=0, ge=0, le=10_000)
    description: Optional[str] = None
    objectives: Optional[str] = None
    learning_outcomes: Optional[str] = None
    target_audience: Optional[str] = None
    linked_skills: List[str] = Field(default_factory=list)
    linked_roles: List[str] = Field(default_factory=list)
    compliance_flag: bool = False
    certification_flag: bool = False
    mandatory_flag: bool = False
    active_flag: bool = True
    status: str = Field(default="DRAFT", max_length=40)


class TrainingProgramUpdate(BaseModel):
    training_name: Optional[str] = Field(None, min_length=1, max_length=300)
    training_category: Optional[str] = Field(None, max_length=80)
    training_type: Optional[str] = Field(None, max_length=80)
    level: Optional[str] = Field(None, max_length=40)
    delivery_mode: Optional[str] = Field(None, max_length=40)
    duration_hours: Optional[float] = Field(None, ge=0, le=10_000)
    credits: Optional[float] = Field(None, ge=0, le=10_000)
    description: Optional[str] = None
    objectives: Optional[str] = None
    learning_outcomes: Optional[str] = None
    target_audience: Optional[str] = None
    linked_skills: Optional[List[str]] = None
    linked_roles: Optional[List[str]] = None
    compliance_flag: Optional[bool] = None
    certification_flag: Optional[bool] = None
    mandatory_flag: Optional[bool] = None
    active_flag: Optional[bool] = None
    status: Optional[str] = Field(None, max_length=40)


class TrainingBatchCreate(BaseModel):
    training_id: str = Field(..., min_length=1)
    batch_code: str = Field(..., min_length=1, max_length=64)
    batch_name: str = Field(..., min_length=1, max_length=200)
    capacity: int = Field(default=30, ge=1, le=10_000)
    status: str = Field(default="PLANNED", max_length=40)


class TrainingSessionCreate(BaseModel):
    training_id: str = Field(..., min_length=1)
    batch_id: Optional[str] = None
    session_title: str = Field(..., min_length=1, max_length=300)
    start_datetime: str = Field(..., min_length=8)
    end_datetime: str = Field(..., min_length=8)
    trainer_id: Optional[str] = None
    venue_or_link: Optional[str] = None
    delivery_mode: str = Field(default="VIRTUAL", max_length=40)
    capacity: int = Field(default=30, ge=1, le=10_000)
    session_status: str = Field(default="SCHEDULED", max_length=40)

    @model_validator(mode="after")
    def end_after_start(self):
        if self.end_datetime < self.start_datetime:
            raise ValueError("end_datetime must be >= start_datetime")
        return self


class EnrollmentCreate(BaseModel):
    training_id: str = Field(..., min_length=1)
    batch_id: Optional[str] = None
    employee_id: str = Field(..., min_length=1)
    nomination_type: str = Field(default="HR", max_length=40)
    enrollment_status: str = Field(default="PENDING", max_length=40)
    approval_status: str = Field(default="PENDING", max_length=40)
    waitlist_flag: bool = False


class ExtendedRecordCreate(BaseModel):
    record_type: str = Field(..., min_length=2, max_length=64)
    title: str = Field(..., min_length=1, max_length=300)
    body: Dict[str, Any] = Field(default_factory=dict)
    employee_id: Optional[str] = None
    department_id: Optional[str] = None
    priority: str = Field(default="MEDIUM", max_length=20)
    status: str = Field(default="OPEN", max_length=40)

    @field_validator("record_type")
    @classmethod
    def validate_rt(cls, v: str) -> str:
        if v not in RECORD_TYPES:
            raise ValueError(f"Unsupported record_type: {v}")
        return v


class CatalogItemCreate(BaseModel):
    training_id: Optional[str] = None
    catalog_type: str = Field(default="INTERNAL", max_length=40)
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    skill_tags: List[str] = Field(default_factory=list)
    role_tags: List[str] = Field(default_factory=list)
    source_type: str = Field(default="INTERNAL", max_length=40)
    provider_name: Optional[str] = None
    duration_hours: float = Field(default=0, ge=0)
    mode: str = Field(default="VIRTUAL", max_length=40)
    mandatory_flag: bool = False
    status: str = Field(default="ACTIVE", max_length=40)
    visibility: str = Field(default="ORG", max_length=40)
