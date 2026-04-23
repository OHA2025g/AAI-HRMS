from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator

from m13_high_skill_talent_retention.constants import RISK_LEVELS


class CriticalTalentProfileCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    talent_code: str = Field(..., min_length=2, max_length=64)
    business_unit: Optional[str] = Field(default=None, max_length=80)
    department: Optional[str] = Field(default=None, max_length=120)
    manager_id: Optional[str] = Field(default=None, max_length=64)
    primary_skill: str = Field(..., min_length=1, max_length=120)
    secondary_skills: List[str] = Field(default_factory=list)
    skill_depth_score: float = Field(default=0, ge=0, le=10)
    certifications_summary: Optional[str] = None
    role_criticality: str = Field(default="MEDIUM", max_length=40)
    project_criticality: str = Field(default="MEDIUM", max_length=40)
    client_criticality: str = Field(default="MEDIUM", max_length=40)
    retention_sensitivity_index: float = Field(default=0.0, ge=0, le=1)
    current_risk_level: str = Field(default="LOW", max_length=20)
    successor_available_flag: bool = False
    mobility_preference: Optional[str] = Field(default=None, max_length=120)
    work_preference: Optional[str] = Field(default=None, max_length=120)
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_risk(self):
        if self.current_risk_level and self.current_risk_level.upper() not in RISK_LEVELS:
            raise ValueError("current_risk_level must be one of LOW|MEDIUM|HIGH|CRITICAL")
        self.current_risk_level = self.current_risk_level.upper()
        return self


class CriticalTalentProfileUpdate(BaseModel):
    business_unit: Optional[str] = Field(default=None, max_length=80)
    department: Optional[str] = Field(default=None, max_length=120)
    manager_id: Optional[str] = Field(default=None, max_length=64)
    primary_skill: Optional[str] = Field(default=None, max_length=120)
    secondary_skills: Optional[List[str]] = None
    skill_depth_score: Optional[float] = Field(default=None, ge=0, le=10)
    certifications_summary: Optional[str] = None
    role_criticality: Optional[str] = Field(default=None, max_length=40)
    project_criticality: Optional[str] = Field(default=None, max_length=40)
    client_criticality: Optional[str] = Field(default=None, max_length=40)
    retention_sensitivity_index: Optional[float] = Field(default=None, ge=0, le=1)
    current_risk_level: Optional[str] = Field(default=None, max_length=20)
    successor_available_flag: Optional[bool] = None
    mobility_preference: Optional[str] = Field(default=None, max_length=120)
    work_preference: Optional[str] = Field(default=None, max_length=120)
    notes: Optional[str] = None


class TalentCriticalityTagCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    tag_type: str = Field(..., min_length=2, max_length=40)
    tag_value: str = Field(..., min_length=1, max_length=120)
    reason: Optional[str] = Field(default=None, max_length=500)
    active_flag: bool = True


class TalentSegmentCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    segment_type: str = Field(..., min_length=2, max_length=60)
    priority_score: float = Field(default=0, ge=0, le=100)
    rule_source: str = Field(default="MANUAL", max_length=40)
    active_flag: bool = True


class RetentionRiskAssessmentCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    overall_risk_score: float = Field(..., ge=0, le=1)
    compensation_risk_score: float = Field(default=0, ge=0, le=1)
    workload_risk_score: float = Field(default=0, ge=0, le=1)
    manager_dependency_risk_score: float = Field(default=0, ge=0, le=1)
    growth_stagnation_risk_score: float = Field(default=0, ge=0, le=1)
    market_demand_risk_score: float = Field(default=0, ge=0, le=1)
    engagement_risk_score: float = Field(default=0, ge=0, le=1)
    mobility_block_risk_score: float = Field(default=0, ge=0, le=1)
    recognition_gap_risk_score: float = Field(default=0, ge=0, le=1)
    risk_level: str = Field(default="LOW", max_length=20)
    top_risk_factors: List[str] = Field(default_factory=list)
    source_type: str = Field(default="RULES", max_length=40)

    @model_validator(mode="after")
    def validate_level(self):
        if self.risk_level and self.risk_level.upper() not in RISK_LEVELS:
            raise ValueError("risk_level must be one of LOW|MEDIUM|HIGH|CRITICAL")
        self.risk_level = self.risk_level.upper()
        return self


class AttritionPredictionCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    exit_probability: float = Field(..., ge=0, le=1)
    time_to_exit_prediction: str = Field(default="UNKNOWN", max_length=40)
    confidence_score: float = Field(default=0.5, ge=0, le=1)
    predicted_risk_level: str = Field(default="LOW", max_length=20)
    prediction_factors: Dict[str, Any] = Field(default_factory=dict)
    source_type: str = Field(default="MOCK_AI", max_length=40)
    is_mock: bool = True


class StayInterviewCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    scheduled_on: str = Field(..., min_length=8)
    conducted_on: Optional[str] = Field(default=None, min_length=8)
    interviewer_id: Optional[str] = Field(default=None, max_length=64)
    questionnaire_template: str = Field(default="DEFAULT", max_length=80)
    key_concerns: List[str] = Field(default_factory=list)
    expectation_summary: Optional[str] = None
    risk_flags: List[str] = Field(default_factory=list)
    follow_up_actions: List[str] = Field(default_factory=list)
    outcome_status: str = Field(default="PLANNED", max_length=40)
    notes: Optional[str] = None

    @model_validator(mode="after")
    def conducted_not_before(self):
        if self.conducted_on and self.conducted_on < self.scheduled_on:
            raise ValueError("conducted_on cannot be before scheduled_on")
        return self


class RetentionCaseCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    case_type: str = Field(default="RETENTION", max_length=40)
    risk_level: str = Field(default="LOW", max_length=20)
    owner_id: Optional[str] = Field(default=None, max_length=64)
    status: str = Field(default="OPEN", max_length=40)
    escalation_level: str = Field(default="L0", max_length=20)
    review_date: Optional[str] = Field(default=None, min_length=8)
    outcome: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_level(self):
        if self.risk_level and self.risk_level.upper() not in RISK_LEVELS:
            raise ValueError("risk_level must be one of LOW|MEDIUM|HIGH|CRITICAL")
        self.risk_level = self.risk_level.upper()
        return self


class EngagementActionPlanCreate(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=64)
    linked_case_id: Optional[str] = Field(default=None, max_length=64)
    action_type: str = Field(default="MANAGER_ACTION", max_length=60)
    action_title: str = Field(..., min_length=2, max_length=200)
    owner_id: Optional[str] = Field(default=None, max_length=64)
    priority: str = Field(default="MEDIUM", max_length=20)
    due_date: Optional[str] = Field(default=None, min_length=8)
    status: str = Field(default="OPEN", max_length=40)
    effectiveness_score: Optional[float] = Field(default=None, ge=0, le=1)


class RetentionSearchLogCreate(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    user_id: Optional[str] = Field(default=None, max_length=64)
    filters: Dict[str, Any] = Field(default_factory=dict)
    results_count: int = Field(default=0, ge=0, le=100000)

