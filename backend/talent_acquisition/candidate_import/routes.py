"""FastAPI routes for candidate Excel import."""

from __future__ import annotations

import os
from typing import Callable, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response

from talent_acquisition.candidate_import.constants import (
    ALLOWED_EXTENSIONS,
    IMPORT_ALLOWED_ROLES,
    MAX_UPLOAD_BYTES,
)
from talent_acquisition.candidate_import.etl_service import CandidateImportService
from talent_acquisition.candidate_import.schemas import (
    AutoMapRequest,
    AutoMapResponse,
    CommitImportRequest,
    CommitImportResponse,
    ImportBatchDetailResponse,
    ImportHistoryResponse,
    SchemaMapResponse,
    SheetPreviewRequest,
    SheetPreviewResponse,
    UploadResponse,
    ValidatePreviewRequest,
    ValidatePreviewResponse,
)


ALLOWED_MIME_PREFIXES = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/csv",
    "application/octet-stream",
)


def _mime_ok(content_type: Optional[str], filename: str) -> bool:
    if not content_type:
        return True
    ct = content_type.split(";")[0].strip().lower()
    if ct in ALLOWED_MIME_PREFIXES:
        return True
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in ALLOWED_EXTENSIONS


def create_candidate_import_router(
    *,
    db,
    get_current_user,
    trigger_auto_analyze=None,
) -> APIRouter:
    router = APIRouter(prefix="/ats/candidates/import", tags=["Candidate Import"])
    service = CandidateImportService(db, trigger_auto_analyze=trigger_auto_analyze)

    def require_import_access(current_user: dict = Depends(get_current_user)):
        role = (current_user.get("role") or "").lower()
        if role not in IMPORT_ALLOWED_ROLES:
            raise HTTPException(status_code=403, detail="Not authorized for candidate bulk import")
        return current_user

    @router.get("/schema", response_model=SchemaMapResponse)
    async def get_schema(current_user: dict = Depends(require_import_access)):
        data = await service.schema_map()
        return SchemaMapResponse(**data)

    @router.get("/template")
    async def download_template(current_user: dict = Depends(require_import_access)):
        content = service.template_bytes()
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="candidate_import_template.xlsx"'},
        )

    @router.post("/upload", response_model=UploadResponse)
    async def upload_excel(
        file: UploadFile = File(...),
        current_user: dict = Depends(require_import_access),
    ):
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name is required")
        ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )
        if not _mime_ok(file.content_type, file.filename):
            raise HTTPException(status_code=400, detail="Unsupported file MIME type")
        content = await file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        result = await service.upload_file(
            content=content,
            file_name=file.filename,
            uploaded_by=current_user.get("id") or "",
        )
        return UploadResponse(**result)

    @router.post("/auto-map", response_model=AutoMapResponse)
    async def auto_map(body: AutoMapRequest, current_user: dict = Depends(require_import_access)):
        await service._batch(body.batch_id)
        result = service.auto_map(body.excel_columns)
        return AutoMapResponse(**result)

    @router.post("/sheet-preview", response_model=SheetPreviewResponse)
    async def sheet_preview(body: SheetPreviewRequest, current_user: dict = Depends(require_import_access)):
        result = await service.sheet_preview(batch_id=body.batch_id, sheet_name=body.sheet_name)
        return SheetPreviewResponse(**result)

    @router.post("/validate-preview", response_model=ValidatePreviewResponse)
    async def validate_preview(
        body: ValidatePreviewRequest,
        current_user: dict = Depends(require_import_access),
    ):
        result = await service.validate_and_preview(
            batch_id=body.batch_id,
            mapping=body.mapping,
            sheet_name=body.sheet_name,
            duplicate_strategy=body.duplicate_strategy,
            uploaded_by=current_user.get("id") or "",
        )
        return ValidatePreviewResponse(**result)

    @router.post("/commit", response_model=CommitImportResponse)
    async def commit_import(
        body: CommitImportRequest,
        current_user: dict = Depends(require_import_access),
    ):
        result = await service.commit(
            batch_id=body.batch_id,
            import_only_valid=body.import_only_valid,
            duplicate_strategy=body.duplicate_strategy,
            uploaded_by=current_user.get("id") or "",
        )
        return CommitImportResponse(**result)

    @router.post("/cleanup-cron")
    async def cleanup_cron(request: Request):
        """Scheduled retention cleanup (no JWT). Requires cleanup token header."""
        expected = (
            os.environ.get("CANDIDATE_IMPORT_CLEANUP_TOKEN")
            or os.environ.get("HIRING_SNAPSHOT_TOKEN")
            or ""
        ).strip()
        got = (
            request.headers.get("X-Candidate-Import-Cleanup-Token")
            or request.headers.get("X-Hiring-Snapshot-Token")
            or ""
        ).strip()
        if not expected or got != expected:
            raise HTTPException(status_code=401, detail="Invalid or missing cleanup token")
        stats = await service.run_retention_cleanup()
        return {"ok": True, **stats}

    @router.get("/history", response_model=ImportHistoryResponse)
    async def import_history(current_user: dict = Depends(require_import_access)):
        return ImportHistoryResponse(**await service.list_history())

    @router.get("/history/{batch_id}", response_model=ImportBatchDetailResponse)
    async def import_batch_detail(
        batch_id: str,
        current_user: dict = Depends(require_import_access),
    ):
        return ImportBatchDetailResponse(**await service.batch_detail(batch_id))

    @router.get("/{batch_id}/errors/download")
    async def download_errors(
        batch_id: str,
        current_user: dict = Depends(require_import_access),
    ):
        content = await service.error_report_bytes(batch_id)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="import_errors_{batch_id}.xlsx"'
            },
        )

    return router
