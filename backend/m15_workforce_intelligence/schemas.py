from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, model_validator


class WorkforceSnapshotCreate(BaseModel):
    snapshot_date: str = Field(..., min_length=8)
    total_workforce: int = Field(..., ge=0)
    active_workforce: int = Field(..., ge=0)
    inactive_workforce: int = Field(..., ge=0)
    new_joiners: int = Field(default=0, ge=0)
    exits: int = Field(default=0, ge=0)
    bench_population: int = Field(default=0, ge=0)
    billable_population: int = Field(default=0, ge=0)
    non_billable_population: int = Field(default=0, ge=0)
    average_utilization: float = Field(default=0.0, ge=0.0, le=100.0)
    critical_alert_count: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_totals(self):
        if self.active_workforce + self.inactive_workforce > self.total_workforce:
            raise ValueError("active_workforce + inactive_workforce cannot exceed total_workforce")
        return self


class WorkforceHeadcountCreate(BaseModel):
    snapshot_date: str = Field(..., min_length=8)
    business_unit: str = Field(..., min_length=1, max_length=80)
    department: str = Field(..., min_length=1, max_length=120)
    geography: str = Field(default="Global", max_length=80)
    planned_headcount: int = Field(default=0, ge=0)
    approved_headcount: int = Field(default=0, ge=0)
    current_headcount: int = Field(default=0, ge=0)
    filled_positions: int = Field(default=0, ge=0)
    open_positions: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_numbers(self):
        if self.filled_positions > self.current_headcount and self.current_headcount > 0:
            raise ValueError("filled_positions cannot exceed current_headcount")
        return self


class WorkforceForecastCreate(BaseModel):
    forecast_type: str = Field(..., min_length=2, max_length=60)
    forecast_period: str = Field(..., min_length=2, max_length=60)
    dimension_scope: str = Field(default="org", max_length=120)
    forecast_payload: Dict[str, Any] = Field(default_factory=dict)
    confidence_score: float = Field(default=0.7, ge=0.0, le=1.0)
    source_type: str = Field(default="mock", max_length=40)
    is_mock: bool = True


class CopilotQueryCreate(BaseModel):
    query_text: str = Field(..., min_length=2, max_length=1000)
    query_type: str = Field(default="general", max_length=60)
    source_type: str = Field(default="mock", max_length=40)
    is_mock: bool = True
    context: Optional[Dict[str, Any]] = None

