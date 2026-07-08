"""Pydantic models for candidate import API."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ImportFieldSpec(BaseModel):
    field: str
    label: str
    required: bool = False
    type: str = "string"
    dynamic: bool = False


class SchemaMapResponse(BaseModel):
    fields: List[ImportFieldSpec]
    required_any_of: List[List[str]] = Field(default_factory=list)


class PriorImportWarning(BaseModel):
    message: str
    prior_batch_id: Optional[str] = None
    prior_file_name: Optional[str] = None
    prior_uploaded_at: Optional[str] = None
    prior_status: Optional[str] = None


class UploadResponse(BaseModel):
    batch_id: str
    file_name: str
    sheet_names: List[str]
    columns: List[str]
    sample_rows: List[Dict[str, Any]]
    detected_row_count: int
    prior_import_warning: Optional[PriorImportWarning] = None


class AutoMapRequest(BaseModel):
    batch_id: str
    excel_columns: List[str]


class AutoMapResponse(BaseModel):
    mapping: Dict[str, Optional[str]]
    unmapped_excel_columns: List[str]
    missing_required_fields: List[str]
    column_required_hints: Dict[str, str] = Field(default_factory=dict)


class SheetPreviewRequest(BaseModel):
    batch_id: str
    sheet_name: str


class SheetPreviewResponse(BaseModel):
    batch_id: str
    sheet_name: str
    columns: List[str]
    sample_rows: List[Dict[str, Any]]
    detected_row_count: int


class ValidationSummaryBreakdown(BaseModel):
    missing_mandatory: int = 0
    invalid_email: int = 0
    invalid_phone: int = 0
    unknown_job_id: int = 0
    unknown_job_code: int = 0
    unknown_recruiter: int = 0
    duplicate_rows: int = 0
    in_file_duplicate: int = 0
    unknown_source: int = 0
    duplicate_file_upload: int = 0


class ImportAuditEvent(BaseModel):
    action: str
    batch_id: str
    uploaded_by: str = ""
    uploaded_by_name: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = ""


class ValidatePreviewRequest(BaseModel):
    batch_id: str
    sheet_name: Optional[str] = None
    mapping: Dict[str, str]
    duplicate_strategy: Literal["skip", "update", "merge", "create_new"] = "skip"


class RowPreviewItem(BaseModel):
    row_number: int
    status: str
    transformed_candidate: Dict[str, Any]
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    duplicate_candidate_id: Optional[str] = None
    duplicate_match_reason: Optional[str] = None


class ValidatePreviewResponse(BaseModel):
    batch_id: str
    sheet_name: Optional[str] = None
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    validation_summary: ValidationSummaryBreakdown = Field(default_factory=ValidationSummaryBreakdown)
    preview: List[RowPreviewItem]
    errors: List[Dict[str, Any]]
    prior_import_warning: Optional[PriorImportWarning] = None


class CommitImportRequest(BaseModel):
    batch_id: str
    import_only_valid: bool = True
    duplicate_strategy: Literal["skip", "update", "merge", "create_new"] = "skip"


class CommitImportResponse(BaseModel):
    batch_id: str
    inserted_count: int
    updated_count: int
    skipped_duplicate_count: int
    failed_count: int
    status: str


class ImportBatchSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    batch_id: str
    file_name: str
    file_size: Optional[int] = None
    uploaded_by: str
    uploaded_by_name: Optional[str] = None
    uploaded_at: str
    status: str
    total_rows: int = 0
    valid_rows: int = 0
    invalid_rows: int = 0
    duplicate_rows: int = 0
    inserted_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    failed_count: int = 0


class ImportHistoryResponse(BaseModel):
    items: List[ImportBatchSummary]
    total: int


class ImportBatchDetailResponse(ImportBatchSummary):
    mapping: Dict[str, str] = Field(default_factory=dict)
    error_summary: Dict[str, Any] = Field(default_factory=dict)
    validation_summary: Dict[str, Any] = Field(default_factory=dict)
    sheet_name: Optional[str] = None
    sheet_names: List[str] = Field(default_factory=list)
    has_errors: bool = False
    file_content_purged: bool = False
    audit_events: List[ImportAuditEvent] = Field(default_factory=list)
