"""Candidate Excel import ETL service — batch, staging, commit."""

from __future__ import annotations

import hashlib
import io
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from bson.binary import Binary
from fastapi import HTTPException

from talent_acquisition.candidate_import.constants import (
    ABANDONED_BATCH_FILE_RETENTION_DAYS,
    AUDIT_COLLECTION,
    ALLOWED_CANDIDATE_SOURCES,
    ALLOWED_PIPELINE_STAGES,
    BATCHES_COLLECTION,
    CANDIDATE_IMPORT_FIELDS,
    DEFAULT_APPLICATION_STAGE,
    DEFAULT_CANDIDATE_IMPORT_STAGE,
    DUPLICATE_STRATEGIES,
    GLOBAL_AUDIT_COLLECTION,
    IMPORT_AUDIT_MODULE,
    MAX_ROWS,
    PREVIEW_LIMIT,
    PURGE_FILE_CONTENT_AFTER_COMMIT,
    SEED_MARKER,
    SOURCE_EXCEL_UPLOAD,
    STAGING_COLLECTION,
    STAGING_RETENTION_DAYS,
    DUP_LOOKUP_IN_CHUNK,
    DUP_LOOKUP_OR_CHUNK,
)
from talent_acquisition.candidate_import.etl_utils import (
    auto_map_columns,
    build_recruiter_name_lookup,
    composite_name_email_key,
    composite_name_phone_key,
    compute_import_stable_id,
    compute_pin_rank,
    InFileDuplicateTracker,
    iso_now,
    format_sequential_batch_id,
    new_batch_id,
    norm_email,
    norm_full_name_lc,
    norm_linkedin_url,
    norm_phone_digits,
    normalize_import_source,
    read_excel_bytes,
    resume_hash,
    sanitize_cell_value,
    source_import_warning,
    suggest_required_field_for_column,
    transform_row,
    validate_candidate_row,
)

# Fields stored on candidates but not exposed for Excel mapping by default.
_SCHEMA_SKIP_FIELDS = frozenset(
    {
        "id",
        "_id",
        "created_at",
        "updated_at",
        "email_lc",
        "phone_lc",
        "full_name_lc",
        "linkedin_url_lc",
        "resume_hash",
        "import_batch_id",
        "import_row_index",
        "import_source",
        "import_file_name",
        "import_stable_id",
        "file_digest",
        "pin_rank",
        "seed_marker",
        "stage",
        "duplicate_candidate_id",
        "duplicate_match_reason",
    }
)


def _infer_field_type(value: Any) -> str:
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return "string"


logger = logging.getLogger(__name__)


def _register_job_alias(job_codes: Dict[str, str], alias: Optional[str], job_id: str) -> None:
    if not alias or not job_id:
        return
    key = str(alias).strip().lower()
    if not key:
        return
    job_codes[key] = job_id
    compact = re.sub(r"[\s\-_]+", "", key)
    if compact:
        job_codes[compact] = job_id


def _sanitize_excel_value(val: Any) -> Any:
    return sanitize_cell_value(val)


def _chunked(items: List[Any], size: int) -> List[List[Any]]:
    if size <= 0:
        return [items]
    return [items[i : i + size] for i in range(0, len(items), size)]


class CandidateImportService:
    def __init__(self, db, *, trigger_auto_analyze: Optional[Callable[..., Awaitable[Any]]] = None):
        self.db = db
        self.trigger_auto_analyze = trigger_auto_analyze

    async def schema_map(self) -> Dict[str, Any]:
        fields: List[Dict[str, Any]] = [
            {**spec, "dynamic": False} for spec in CANDIDATE_IMPORT_FIELDS
        ]
        known = {f["field"] for f in fields}
        sample = None
        rows = await self.db.candidates.find(
            {"import_source": SOURCE_EXCEL_UPLOAD},
            {"_id": 0},
        ).sort("created_at", -1).limit(1).to_list(1)
        if rows:
            sample = rows[0]
        if not sample:
            rows = await self.db.candidates.find({}, {"_id": 0}).sort("created_at", -1).limit(1).to_list(1)
            sample = rows[0] if rows else None
        if sample:
            for key, value in sample.items():
                if key in known or key in _SCHEMA_SKIP_FIELDS or key.endswith("_lc"):
                    continue
                fields.append(
                    {
                        "field": key,
                        "label": key.replace("_", " ").title(),
                        "required": False,
                        "type": _infer_field_type(value),
                        "dynamic": True,
                    }
                )
                known.add(key)
        return {
            "fields": fields,
            "required_any_of": [["full_name"], ["email", "phone"]],
        }

    async def _batch(self, batch_id: str, *, include_file: bool = False) -> Dict[str, Any]:
        projection = {"_id": 0}
        if not include_file:
            projection["file_content"] = 0
        doc = await self.db[BATCHES_COLLECTION].find_one({"batch_id": batch_id}, projection)
        if not doc:
            raise HTTPException(status_code=404, detail=f"Import batch {batch_id} not found")
        return doc

    def _file_bytes(self, batch: Dict[str, Any]) -> bytes:
        raw = batch.get("file_content")
        if raw is None:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is no longer available for this batch. Please re-upload.",
            )
        if isinstance(raw, Binary):
            return bytes(raw)
        if isinstance(raw, (bytes, bytearray)):
            return bytes(raw)
        raise HTTPException(status_code=400, detail="Invalid stored file content for batch")

    def _extract_rows(
        self,
        batch: Dict[str, Any],
        *,
        sheet_name: Optional[str] = None,
    ) -> Tuple[List[str], List[str], List[Dict[str, Any]]]:
        content = self._file_bytes(batch)
        target_sheet = sheet_name or batch.get("sheet_name")
        return read_excel_bytes(content, batch.get("file_name") or "upload.xlsx", target_sheet)

    async def sheet_preview(self, *, batch_id: str, sheet_name: str) -> Dict[str, Any]:
        batch = await self._batch(batch_id, include_file=True)
        sheet_names, columns, rows = self._extract_rows(batch, sheet_name=sheet_name)
        if sheet_name not in sheet_names:
            raise HTTPException(status_code=400, detail=f"Sheet '{sheet_name}' not found in workbook")
        sample = [
            {k: sanitize_cell_value(v) for k, v in r.items() if v is not None}
            for r in rows[:5]
        ]
        return {
            "batch_id": batch_id,
            "sheet_name": sheet_name,
            "columns": columns,
            "sample_rows": sample,
            "detected_row_count": len(rows),
        }

    async def _allocate_batch_id(self) -> str:
        day = datetime.now(timezone.utc).strftime("%Y%m%d")
        prefix = f"IMP-{day}-"
        existing = await self.db[BATCHES_COLLECTION].find(
            {"batch_id": {"$regex": f"^{re.escape(prefix)}"}},
            {"_id": 0, "batch_id": 1},
        ).to_list(5000)
        max_seq = 0
        for doc in existing:
            batch_id = doc.get("batch_id") or ""
            if not batch_id.startswith(prefix):
                continue
            tail = batch_id[len(prefix) :]
            try:
                max_seq = max(max_seq, int(tail))
            except ValueError:
                continue
        return format_sequential_batch_id(day, max_seq + 1)

    async def _prior_committed_batch(
        self,
        file_digest: str,
        *,
        exclude_batch_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        rows = await self.db[BATCHES_COLLECTION].find(
            {"file_digest": file_digest, "status": {"$in": ["COMPLETED", "PARTIAL"]}},
            {
                "_id": 0,
                "batch_id": 1,
                "file_name": 1,
                "uploaded_at": 1,
                "status": 1,
            },
        ).sort("uploaded_at", -1).limit(10).to_list(10)
        for row in rows:
            if exclude_batch_id and row.get("batch_id") == exclude_batch_id:
                continue
            return row
        return None

    def _prior_import_warning(self, prior: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not prior:
            return None
        return {
            "message": (
                "This file was already imported in a prior batch. "
                "Review duplicates before committing."
            ),
            "prior_batch_id": prior.get("batch_id"),
            "prior_file_name": prior.get("file_name"),
            "prior_uploaded_at": prior.get("uploaded_at"),
            "prior_status": prior.get("status"),
        }

    async def upload_file(
        self,
        *,
        content: bytes,
        file_name: str,
        uploaded_by: str,
    ) -> Dict[str, Any]:
        sheet_names, columns, rows = read_excel_bytes(content, file_name)
        if not columns:
            raise HTTPException(status_code=400, detail="No columns found in the uploaded file")
        if len(rows) > MAX_ROWS:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum row limit of {MAX_ROWS}",
            )
        if not rows:
            raise HTTPException(status_code=400, detail="No candidate rows found in the file")

        batch_id = await self._allocate_batch_id()
        now = iso_now()
        file_digest = hashlib.sha256(content).hexdigest()
        prior = await self._prior_committed_batch(file_digest)
        prior_warning = self._prior_import_warning(prior)
        sample = [
            {k: sanitize_cell_value(v) for k, v in r.items() if v is not None}
            for r in rows[:5]
        ]

        batch_doc = {
            "batch_id": batch_id,
            "file_name": file_name,
            "file_size": len(content),
            "file_digest": file_digest,
            "file_content": Binary(content),
            "uploaded_by": uploaded_by,
            "uploaded_at": now,
            "status": "UPLOADED",
            "sheet_names": sheet_names,
            "sheet_name": sheet_names[0] if sheet_names else "Sheet1",
            "columns": columns,
            "total_rows": len(rows),
            "mapping": {},
            "created_at": now,
            "updated_at": now,
        }
        await self.db[BATCHES_COLLECTION].insert_one(batch_doc)
        await self._audit(
            batch_id=batch_id,
            uploaded_by=uploaded_by,
            action="UPLOAD",
            details={"file_name": file_name, "row_count": len(rows)},
        )
        await self._run_stale_cleanup_safe()
        logger.info("candidate_import upload batch_id=%s rows=%s", batch_id, len(rows))
        return {
            "batch_id": batch_id,
            "file_name": file_name,
            "sheet_names": sheet_names,
            "columns": columns,
            "sample_rows": sample,
            "detected_row_count": len(rows),
            "prior_import_warning": prior_warning,
        }

    def auto_map(self, excel_columns: List[str]) -> Dict[str, Any]:
        mapping = auto_map_columns(excel_columns)
        unmapped = [c for c, f in mapping.items() if not f]
        mapped_fields = {f for f in mapping.values() if f}
        missing_required = []
        if "full_name" not in mapped_fields:
            missing_required.append("full_name")
        if "email" not in mapped_fields and "phone" not in mapped_fields:
            missing_required.append("email_or_phone")
        column_required_hints = {
            col: hint
            for col in excel_columns
            if (hint := suggest_required_field_for_column(col))
        }
        return {
            "mapping": mapping,
            "unmapped_excel_columns": unmapped,
            "missing_required_fields": missing_required,
            "column_required_hints": column_required_hints,
        }

    async def _lookup_jobs_and_recruiters(
        self,
    ) -> Tuple[set, Dict[str, str], set, Dict[str, str], Dict[str, str], set[str]]:
        jobs = await self.db.jobs.find(
            {},
            {"_id": 0, "id": 1, "title": 1, "normalized_title": 1, "import_stable_id": 1},
        ).to_list(5000)
        job_ids = {j["id"] for j in jobs if j.get("id")}
        job_codes: Dict[str, str] = {}
        for j in jobs:
            jid = j.get("id")
            if not jid:
                continue
            _register_job_alias(job_codes, jid, jid)
            _register_job_alias(job_codes, j.get("title"), jid)
            _register_job_alias(job_codes, j.get("normalized_title"), jid)
            _register_job_alias(job_codes, j.get("import_stable_id"), jid)

        users = await self.db.users.find(
            {}, {"_id": 0, "id": 1, "email": 1, "role": 1, "full_name": 1}
        ).to_list(5000)
        recruiter_ids = {u["id"] for u in users if u.get("id")}
        recruiter_emails: Dict[str, str] = {}
        for u in users:
            em = norm_email(u.get("email"))
            if em and u.get("id"):
                recruiter_emails[em] = u["id"]
        recruiter_names, ambiguous_names = build_recruiter_name_lookup(users)
        return job_ids, job_codes, recruiter_ids, recruiter_emails, recruiter_names, ambiguous_names

    def _collect_import_identity_keys(
        self,
        raw_rows: List[Dict[str, Any]],
        clean_mapping: Dict[str, str],
        *,
        file_name: str,
        file_digest: str,
    ) -> Dict[str, Any]:
        emails: set[str] = set()
        phones: set[str] = set()
        linkedin_urls: set[str] = set()
        stable_ids: set[str] = set()
        name_email_pairs: set[tuple[str, str]] = set()
        name_phone_pairs: set[tuple[str, str]] = set()

        for i, original in enumerate(raw_rows, start=2):
            transformed = transform_row(original, clean_mapping, i)
            email_lc = norm_email(transformed.get("email"))
            if email_lc:
                emails.add(email_lc)
            phone_lc = norm_phone_digits(transformed.get("phone"))
            if phone_lc:
                phones.add(phone_lc)
            linkedin_lc = norm_linkedin_url(transformed.get("linkedin_url"))
            if linkedin_lc:
                linkedin_urls.add(linkedin_lc)
            stable_ids.add(
                compute_import_stable_id(
                    file_name=file_name,
                    file_digest=file_digest,
                    row_number=i,
                    email=transformed.get("email"),
                    full_name=transformed.get("full_name"),
                )
            )
            fn_lc = norm_full_name_lc(transformed.get("full_name"))
            if fn_lc and email_lc:
                name_email_pairs.add((fn_lc, email_lc))
            if fn_lc and phone_lc:
                name_phone_pairs.add((fn_lc, phone_lc))

        return {
            "emails": emails,
            "phones": phones,
            "linkedin_urls": linkedin_urls,
            "stable_ids": stable_ids,
            "name_email_pairs": name_email_pairs,
            "name_phone_pairs": name_phone_pairs,
        }

    async def _build_duplicate_maps_for_import(
        self, keys: Dict[str, Any]
    ) -> Tuple[Dict[str, str], Dict[str, str], Dict[str, str], Dict[str, str], Dict[str, str], Dict[str, str]]:
        """Indexed MongoDB lookups scoped to keys present in the current import file."""
        dup_email: Dict[str, str] = {}
        dup_phone: Dict[str, str] = {}
        dup_linkedin: Dict[str, str] = {}
        dup_name_email: Dict[str, str] = {}
        dup_name_phone: Dict[str, str] = {}
        dup_stable: Dict[str, str] = {}

        candidate_projection = {
            "_id": 0,
            "id": 1,
            "email_lc": 1,
            "email": 1,
            "phone_lc": 1,
            "phone": 1,
            "full_name_lc": 1,
            "full_name": 1,
            "linkedin_url": 1,
            "linkedin_url_lc": 1,
            "import_stable_id": 1,
        }

        for chunk in _chunked(list(keys["emails"]), DUP_LOOKUP_IN_CHUNK):
            rows = await self.db.candidates.find(
                {"email_lc": {"$in": chunk}}, candidate_projection
            ).to_list(len(chunk) + 1)
            for c in rows:
                cid = c.get("id")
                el = c.get("email_lc") or norm_email(c.get("email"))
                if cid and el:
                    dup_email[el] = cid

        for chunk in _chunked(list(keys["phones"]), DUP_LOOKUP_IN_CHUNK):
            rows = await self.db.candidates.find(
                {"phone_lc": {"$in": chunk}}, candidate_projection
            ).to_list(len(chunk) + 1)
            for c in rows:
                cid = c.get("id")
                pl = c.get("phone_lc") or norm_phone_digits(c.get("phone"))
                if cid and pl:
                    dup_phone[pl] = cid

        for chunk in _chunked(list(keys["linkedin_urls"]), DUP_LOOKUP_IN_CHUNK):
            rows = await self.db.candidates.find(
                {
                    "$or": [
                        {"linkedin_url_lc": {"$in": chunk}},
                        {"linkedin_url": {"$in": chunk}},
                    ]
                },
                candidate_projection,
            ).to_list(len(chunk) * 2 + 1)
            for c in rows:
                cid = c.get("id")
                ll = c.get("linkedin_url_lc") or norm_linkedin_url(c.get("linkedin_url"))
                if cid and ll:
                    dup_linkedin[ll] = cid

        for chunk in _chunked(list(keys["stable_ids"]), DUP_LOOKUP_IN_CHUNK):
            rows = await self.db.candidates.find(
                {"import_stable_id": {"$in": chunk}}, candidate_projection
            ).to_list(len(chunk) + 1)
            for c in rows:
                cid = c.get("id")
                sid = c.get("import_stable_id")
                if cid and sid:
                    dup_stable[sid] = cid

        for chunk in _chunked(list(keys["name_email_pairs"]), DUP_LOOKUP_OR_CHUNK):
            or_clauses = [{"full_name_lc": fn, "email_lc": em} for fn, em in chunk]
            if not or_clauses:
                continue
            rows = await self.db.candidates.find({"$or": or_clauses}, candidate_projection).to_list(
                len(or_clauses) + 1
            )
            for c in rows:
                cid = c.get("id")
                ne_key = composite_name_email_key(c.get("full_name"), c.get("email"))
                if cid and ne_key:
                    dup_name_email[ne_key] = cid

        for chunk in _chunked(list(keys["name_phone_pairs"]), DUP_LOOKUP_OR_CHUNK):
            or_clauses = [{"full_name_lc": fn, "phone_lc": ph} for fn, ph in chunk]
            if not or_clauses:
                continue
            rows = await self.db.candidates.find({"$or": or_clauses}, candidate_projection).to_list(
                len(or_clauses) + 1
            )
            for c in rows:
                cid = c.get("id")
                np_key = composite_name_phone_key(c.get("full_name"), c.get("phone"))
                if cid and np_key:
                    dup_name_phone[np_key] = cid

        return dup_email, dup_phone, dup_linkedin, dup_name_email, dup_name_phone, dup_stable

    async def _lookup_context(
        self,
        raw_rows: List[Dict[str, Any]],
        clean_mapping: Dict[str, str],
        *,
        file_name: str,
        file_digest: str,
    ) -> Tuple[
        set,
        Dict[str, str],
        set,
        Dict[str, str],
        Dict[str, str],
        set[str],
        Dict[str, str],
        Dict[str, str],
        Dict[str, str],
        Dict[str, str],
        Dict[str, str],
        Dict[str, str],
    ]:
        (
            job_ids,
            job_codes,
            recruiter_ids,
            recruiter_emails,
            recruiter_names,
            ambiguous_recruiter_names,
        ) = await self._lookup_jobs_and_recruiters()
        identity_keys = self._collect_import_identity_keys(
            raw_rows, clean_mapping, file_name=file_name, file_digest=file_digest
        )
        (
            dup_email,
            dup_phone,
            dup_linkedin,
            dup_name_email,
            dup_name_phone,
            dup_stable,
        ) = await self._build_duplicate_maps_for_import(identity_keys)
        return (
            job_ids,
            job_codes,
            recruiter_ids,
            recruiter_emails,
            recruiter_names,
            ambiguous_recruiter_names,
            dup_email,
            dup_phone,
            dup_linkedin,
            dup_name_email,
            dup_name_phone,
            dup_stable,
        )

    async def validate_and_preview(
        self,
        *,
        batch_id: str,
        mapping: Dict[str, str],
        sheet_name: Optional[str],
        duplicate_strategy: str,
        uploaded_by: str,
    ) -> Dict[str, Any]:
        batch = await self._batch(batch_id, include_file=True)
        target_sheet = sheet_name or batch.get("sheet_name")
        _sheet_names, columns, raw_rows = self._extract_rows(batch, sheet_name=target_sheet)
        if not raw_rows:
            raise HTTPException(status_code=400, detail="No candidate rows found in the selected sheet")

        clean_mapping = {k: v for k, v in mapping.items() if v}
        file_name = batch.get("file_name") or "upload.xlsx"
        file_digest = batch.get("file_digest") or ""
        (
            job_ids,
            job_codes,
            recruiter_ids,
            recruiter_emails,
            recruiter_names,
            ambiguous_recruiter_names,
            dup_email,
            dup_phone,
            dup_linkedin,
            dup_name_email,
            dup_name_phone,
            dup_stable,
        ) = await self._lookup_context(
            raw_rows,
            clean_mapping,
            file_name=file_name,
            file_digest=file_digest,
        )

        await self.db[STAGING_COLLECTION].delete_many({"batch_id": batch_id})

        valid_n = invalid_n = dup_n = 0
        preview: List[Dict[str, Any]] = []
        flat_errors: List[Dict[str, Any]] = []
        staging_docs: List[Dict[str, Any]] = []
        validation_summary = {
            "missing_mandatory": 0,
            "invalid_email": 0,
            "invalid_phone": 0,
            "unknown_job_id": 0,
            "unknown_job_code": 0,
            "unknown_recruiter": 0,
            "duplicate_rows": 0,
            "in_file_duplicate": 0,
            "unknown_source": 0,
            "duplicate_file_upload": 0,
        }

        prior = await self._prior_committed_batch(file_digest, exclude_batch_id=batch_id)
        prior_warning = self._prior_import_warning(prior)
        if prior_warning:
            validation_summary["duplicate_file_upload"] = 1

        in_file_tracker = InFileDuplicateTracker()

        for i, original in enumerate(raw_rows, start=2):
            transformed = transform_row(original, clean_mapping, i)
            stable_id = compute_import_stable_id(
                file_name=file_name,
                file_digest=file_digest,
                row_number=i,
                email=transformed.get("email"),
                full_name=transformed.get("full_name"),
            )
            transformed["import_stable_id"] = stable_id
            transformed["pin_rank"] = compute_pin_rank(i)
            status, errors, warnings = validate_candidate_row(
                transformed,
                known_job_ids=job_ids,
                known_job_codes=job_codes,
                known_recruiter_ids=recruiter_ids,
                known_recruiter_emails=recruiter_emails,
                known_recruiter_names=recruiter_names,
                ambiguous_recruiter_names=ambiguous_recruiter_names,
                duplicate_by_email=dup_email,
                duplicate_by_phone=dup_phone,
                duplicate_by_linkedin=dup_linkedin,
                duplicate_by_name_email=dup_name_email,
                duplicate_by_name_phone=dup_name_phone,
                duplicate_by_stable_id=dup_stable,
            )
            source_raw = transformed.pop("_source_raw", None)
            src_warn = source_import_warning(source_raw)
            if src_warn:
                warnings.append(
                    {
                        "field": "source",
                        "warning": src_warn,
                        "original_value": source_raw,
                    }
                )
            dup_id = transformed.pop("duplicate_candidate_id", None)
            dup_reason = transformed.pop("duplicate_match_reason", None)
            duplicate_in_file_row: Optional[int] = None

            if status == "VALID":
                in_file_reason, anchor_row = in_file_tracker.check(transformed)
                if in_file_reason and anchor_row is not None:
                    status = "DUPLICATE"
                    dup_reason = in_file_reason
                    duplicate_in_file_row = anchor_row
                else:
                    in_file_tracker.register(i, transformed)

            if status == "VALID":
                valid_n += 1
            elif status == "DUPLICATE":
                dup_n += 1
                validation_summary["duplicate_rows"] += 1
                if dup_reason and str(dup_reason).startswith("in_file_"):
                    validation_summary["in_file_duplicate"] += 1
            else:
                invalid_n += 1

            for err in errors:
                flat_errors.append({"row_number": i, **err})
                et = err.get("error_type")
                if et in validation_summary:
                    validation_summary[et] += 1
            for warn in warnings:
                if warn.get("field") in ("recruiter_email", "recruiter_name"):
                    validation_summary["unknown_recruiter"] += 1
                if warn.get("field") == "source":
                    validation_summary["unknown_source"] += 1

            item = {
                "row_number": i,
                "status": status,
                "transformed_candidate": {
                    k: v for k, v in transformed.items() if v is not None and not str(k).startswith("_")
                },
                "errors": errors,
                "warnings": warnings,
                "duplicate_candidate_id": dup_id,
                "duplicate_match_reason": dup_reason,
                "duplicate_in_file_row": duplicate_in_file_row,
            }
            if len(preview) < PREVIEW_LIMIT:
                preview.append(item)

            staging_docs.append(
                {
                    "batch_id": batch_id,
                    "row_number": i,
                    "original_row": original,
                    "transformed_row": transformed,
                    "validation_status": status,
                    "errors": errors,
                    "warnings": warnings,
                    "duplicate_candidate_id": dup_id,
                    "duplicate_match_reason": dup_reason,
                    "duplicate_in_file_row": duplicate_in_file_row,
                    "import_action": None,
                    "created_at": iso_now(),
                }
            )

        if staging_docs:
            await self.db[STAGING_COLLECTION].insert_many(staging_docs)

        now = iso_now()
        await self.db[BATCHES_COLLECTION].update_one(
            {"batch_id": batch_id},
            {
                "$set": {
                    "status": "VALIDATED",
                    "mapping": clean_mapping,
                    "sheet_name": target_sheet,
                    "columns": columns,
                    "duplicate_strategy": duplicate_strategy,
                    "valid_rows": valid_n,
                    "invalid_rows": invalid_n,
                    "duplicate_rows": dup_n,
                    "total_rows": len(raw_rows),
                    "updated_at": now,
                    "validation_summary": validation_summary,
                    "error_summary": {
                        "invalid_rows": invalid_n,
                        "duplicate_rows": dup_n,
                        "error_count": len(flat_errors),
                    },
                }
            },
        )
        await self._audit(
            batch_id=batch_id,
            uploaded_by=uploaded_by,
            action="VALIDATE",
            details={"valid": valid_n, "invalid": invalid_n, "duplicate": dup_n},
        )
        await self._run_stale_cleanup_safe()

        return {
            "batch_id": batch_id,
            "sheet_name": target_sheet,
            "total_rows": len(raw_rows),
            "valid_rows": valid_n,
            "invalid_rows": invalid_n,
            "duplicate_rows": dup_n,
            "validation_summary": validation_summary,
            "preview": preview,
            "errors": flat_errors[:500],
            "prior_import_warning": prior_warning,
        }

    async def commit(
        self,
        *,
        batch_id: str,
        import_only_valid: bool,
        duplicate_strategy: str,
        uploaded_by: str,
    ) -> Dict[str, Any]:
        batch = await self._batch(batch_id)
        if batch.get("status") not in ("VALIDATED", "MAPPED"):
            raise HTTPException(
                status_code=400,
                detail="Batch must be validated before commit. Run validate-preview first.",
            )

        staged = await self.db[STAGING_COLLECTION].find({"batch_id": batch_id}, {"_id": 0}).to_list(
            MAX_ROWS + 1
        )
        if not staged:
            raise HTTPException(status_code=400, detail="No staged rows for this batch")

        staged.sort(key=lambda r: r.get("row_number") or 0)
        row_to_candidate: Dict[int, str] = {}

        inserted = updated = skipped = failed = 0
        now = iso_now()

        for row in staged:
            status = row.get("validation_status")
            if import_only_valid and status not in ("VALID", "DUPLICATE"):
                failed += 1
                await self._mark_staging(row, "FAILED")
                continue

            if status == "DUPLICATE":
                dup_id = row.get("duplicate_candidate_id")
                in_file_row = row.get("duplicate_in_file_row")
                if not dup_id and in_file_row:
                    dup_id = row_to_candidate.get(int(in_file_row))
                if duplicate_strategy == "skip":
                    skipped += 1
                    await self._mark_staging(row, "SKIP")
                    continue
                if duplicate_strategy in ("update", "merge") and dup_id:
                    ok = await self._update_existing(
                        dup_id,
                        row.get("transformed_row") or {},
                        batch_id,
                        now,
                        merge=duplicate_strategy == "merge",
                    )
                    if ok:
                        updated += 1
                        await self._mark_staging(row, "UPDATE", candidate_id=dup_id)
                        job_id = (row.get("transformed_row") or {}).get("job_id")
                        if job_id:
                            await self._maybe_create_application(
                                job_id, dup_id, now, changed_by=uploaded_by
                            )
                    else:
                        failed += 1
                        await self._mark_staging(row, "FAILED")
                    continue
                if duplicate_strategy == "create_new":
                    pass  # fall through to insert

            if status == "INVALID" and not import_only_valid:
                pass
            elif status == "INVALID":
                failed += 1
                await self._mark_staging(row, "FAILED")
                continue

            try:
                cid = await self._insert_candidate(
                    row.get("transformed_row") or {},
                    batch_id=batch_id,
                    file_name=batch.get("file_name") or "",
                    row_number=row.get("row_number") or 0,
                    uploaded_by=uploaded_by,
                    now=now,
                )
                inserted += 1
                await self._mark_staging(row, "INSERT", candidate_id=cid)
                row_num = row.get("row_number")
                if row_num is not None:
                    row_to_candidate[int(row_num)] = cid
                job_id = (row.get("transformed_row") or {}).get("job_id")
                if job_id and cid:
                    await self._maybe_create_application(
                        job_id, cid, now, changed_by=uploaded_by
                    )
            except Exception as exc:
                logger.exception("candidate_import commit row failed batch=%s row=%s", batch_id, row.get("row_number"))
                failed += 1
                await self._mark_staging(row, "FAILED", error=str(exc))

        final_status = "COMPLETED" if failed == 0 else "PARTIAL"
        await self.db[BATCHES_COLLECTION].update_one(
            {"batch_id": batch_id},
            {
                "$set": {
                    "status": final_status,
                    "inserted_count": inserted,
                    "updated_count": updated,
                    "skipped_count": skipped,
                    "failed_count": failed,
                    "updated_at": now,
                }
            },
        )
        await self._audit(
            batch_id=batch_id,
            uploaded_by=uploaded_by,
            action="COMMIT",
            details={
                "inserted": inserted,
                "updated": updated,
                "skipped": skipped,
                "failed": failed,
            },
        )
        if PURGE_FILE_CONTENT_AFTER_COMMIT and final_status in ("COMPLETED", "PARTIAL"):
            await self._purge_batch_file_content(batch_id, now)
        await self._run_stale_cleanup_safe()
        return {
            "batch_id": batch_id,
            "inserted_count": inserted,
            "updated_count": updated,
            "skipped_duplicate_count": skipped,
            "failed_count": failed,
            "status": final_status,
        }

    async def _purge_batch_file_content(self, batch_id: str, now: str) -> None:
        await self.db[BATCHES_COLLECTION].update_one(
            {"batch_id": batch_id},
            {
                "$unset": {"file_content": ""},
                "$set": {"file_content_purged_at": now, "updated_at": now},
            },
        )
        logger.info("candidate_import purged file_content batch_id=%s", batch_id)

    async def run_retention_cleanup(self) -> Dict[str, Any]:
        """Run staging / abandoned file retention (for scheduled cron)."""
        return await self._cleanup_stale_import_artifacts()

    async def _run_stale_cleanup_safe(self) -> None:
        try:
            await self._cleanup_stale_import_artifacts()
        except Exception:
            logger.warning("candidate_import stale cleanup skipped", exc_info=True)

    async def _cleanup_stale_import_artifacts(self) -> Dict[str, Any]:
        """Drop old staging rows and purge abandoned upload binaries."""
        now_dt = datetime.now(timezone.utc)
        committed_cutoff = (now_dt - timedelta(days=STAGING_RETENTION_DAYS)).isoformat()
        abandoned_cutoff = (now_dt - timedelta(days=ABANDONED_BATCH_FILE_RETENTION_DAYS)).isoformat()

        staging_batches_purged = 0
        files_purged = 0

        committed_batches = await self.db[BATCHES_COLLECTION].find(
            {
                "status": {"$in": ["COMPLETED", "PARTIAL", "FAILED"]},
                "updated_at": {"$lt": committed_cutoff},
            },
            {"_id": 0, "batch_id": 1},
        ).to_list(500)
        for batch in committed_batches:
            bid = batch.get("batch_id")
            if bid:
                await self.db[STAGING_COLLECTION].delete_many({"batch_id": bid})
                staging_batches_purged += 1

        abandoned = await self.db[BATCHES_COLLECTION].find(
            {
                "status": {"$in": ["UPLOADED", "VALIDATED", "MAPPED", "FAILED"]},
                "uploaded_at": {"$lt": abandoned_cutoff},
            },
            {"_id": 0, "batch_id": 1, "file_content": 1},
        ).to_list(200)
        purge_now = iso_now()
        for batch in abandoned:
            if batch.get("file_content") is not None and batch.get("batch_id"):
                await self._purge_batch_file_content(batch["batch_id"], purge_now)
                files_purged += 1

        return {
            "staging_batches_purged": staging_batches_purged,
            "abandoned_files_purged": files_purged,
            "committed_cutoff": committed_cutoff,
            "abandoned_cutoff": abandoned_cutoff,
        }

    async def _mark_staging(
        self,
        row: Dict[str, Any],
        action: str,
        candidate_id: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        upd: Dict[str, Any] = {"import_action": action}
        if candidate_id:
            upd["candidate_id"] = candidate_id
        if error:
            upd["commit_error"] = error
        await self.db[STAGING_COLLECTION].update_one(
            {"batch_id": row["batch_id"], "row_number": row["row_number"]},
            {"$set": upd},
        )

    async def _insert_candidate(
        self,
        data: Dict[str, Any],
        *,
        batch_id: str,
        file_name: str,
        row_number: int,
        uploaded_by: str,
        now: str,
    ) -> str:
        candidate_id = str(uuid.uuid4())
        email_lc = norm_email(data.get("email"))
        phone_lc = norm_phone_digits(data.get("phone"))
        fn_lc = norm_full_name_lc(data.get("full_name"))
        rh = resume_hash(data.get("resume_text"))

        doc = {
            "id": candidate_id,
            "full_name": data.get("full_name"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "location": data.get("location"),
            "headline": data.get("headline"),
            "total_experience_years": data.get("total_experience_years"),
            "skills": data.get("skills") or [],
            "experience": data.get("experience") or [],
            "education": data.get("education") or [],
            "resume_text": data.get("resume_text"),
            "source": normalize_import_source(data.get("source")),
            "created_at": now,
            "updated_at": now,
            "email_lc": email_lc,
            "phone_lc": phone_lc,
            "full_name_lc": fn_lc,
            "resume_content_hash": rh,
            "import_batch_id": batch_id,
            "import_source_file": file_name,
            "import_row_index": row_number,
            "seed_marker": SEED_MARKER,
            "imported_by": uploaded_by,
            "pipeline_stage": DEFAULT_CANDIDATE_IMPORT_STAGE,
            "candidate_status": "NEW",
        }
        if data.get("import_stable_id"):
            doc["import_stable_id"] = data.get("import_stable_id")
        if data.get("pin_rank") is not None:
            doc["pin_rank"] = data.get("pin_rank")
        # Optional extended fields stored when present
        for extra in (
            "current_ctc",
            "expected_ctc",
            "notice_period_days",
            "preferred_location",
            "recruiter_id",
            "job_id",
            "linkedin_url",
        ):
            if data.get(extra) is not None:
                doc[extra] = data.get(extra)
        if data.get("linkedin_url"):
            doc["linkedin_url_lc"] = norm_linkedin_url(data.get("linkedin_url"))

        await self.db.candidates.insert_one(doc)

        if self.trigger_auto_analyze:
            try:
                await self.trigger_auto_analyze(
                    self.db,
                    candidate_id=candidate_id,
                    resume_text=doc.get("resume_text"),
                    created_by=uploaded_by,
                )
            except Exception:
                logger.warning("auto_analyze skipped for import candidate %s", candidate_id)

        return candidate_id

    async def _update_existing(
        self,
        candidate_id: str,
        data: Dict[str, Any],
        batch_id: str,
        now: str,
        *,
        merge: bool,
    ) -> bool:
        existing = await self.db.candidates.find_one({"id": candidate_id}, {"_id": 0})
        if not existing:
            return False
        patch: Dict[str, Any] = {
            "updated_at": now,
            "import_batch_id": batch_id,
        }
        for key in (
            "full_name",
            "email",
            "phone",
            "location",
            "headline",
            "total_experience_years",
            "skills",
            "experience",
            "education",
            "resume_text",
            "source",
            "current_ctc",
            "expected_ctc",
            "notice_period_days",
            "preferred_location",
            "linkedin_url",
        ):
            val = data.get(key)
            if val is None:
                continue
            if merge and existing.get(key):
                continue
            if key == "source" and val:
                patch[key] = normalize_import_source(val)
                continue
            patch[key] = val
        new_rank = data.get("pin_rank")
        if new_rank is not None:
            existing_rank = existing.get("pin_rank") or 0
            if not merge or int(new_rank) > int(existing_rank):
                patch["pin_rank"] = new_rank
        if data.get("import_stable_id"):
            patch["import_stable_id"] = data.get("import_stable_id")
        if data.get("email"):
            patch["email_lc"] = norm_email(data.get("email"))
        if data.get("phone"):
            patch["phone_lc"] = norm_phone_digits(data.get("phone"))
        if data.get("full_name"):
            patch["full_name_lc"] = norm_full_name_lc(data.get("full_name"))
        await self.db.candidates.update_one({"id": candidate_id}, {"$set": patch})
        return True

    async def _maybe_create_application(
        self,
        job_id: str,
        candidate_id: str,
        now: str,
        *,
        changed_by: str = "",
    ) -> None:
        job = await self.db.jobs.find_one({"id": job_id}, {"_id": 0, "id": 1})
        if not job:
            return
        existing = await self.db.applications.find_one(
            {"job_id": job_id, "candidate_id": candidate_id}, {"_id": 0, "id": 1}
        )
        if existing:
            return
        app_id = str(uuid.uuid4())
        stage = DEFAULT_APPLICATION_STAGE
        await self.db.applications.insert_one(
            {
                "id": app_id,
                "job_id": job_id,
                "candidate_id": candidate_id,
                "stage": stage,
                "status": "ACTIVE",
                "created_at": now,
                "updated_at": now,
            }
        )
        await self.db.application_stage_history.insert_one(
            {
                "id": str(uuid.uuid4()),
                "application_id": app_id,
                "from_stage": None,
                "to_stage": stage,
                "changed_by": changed_by or "excel_import",
                "changed_at": now,
            }
        )
        await self.db.candidates.update_one(
            {"id": candidate_id},
            {"$set": {"pipeline_stage": stage, "updated_at": now}},
        )

    async def _user_name_map(self) -> Dict[str, str]:
        users = await self.db.users.find({}, {"_id": 0, "id": 1, "full_name": 1, "email": 1}).to_list(5000)
        out: Dict[str, str] = {}
        for u in users:
            uid = u.get("id")
            if not uid:
                continue
            out[uid] = u.get("full_name") or u.get("email") or uid
        return out

    async def list_history(self, *, limit: int = 50) -> Dict[str, Any]:
        name_map = await self._user_name_map()
        rows = (
            await self.db[BATCHES_COLLECTION]
            .find({}, {"_id": 0, "file_content": 0, "raw_rows": 0})
            .sort("uploaded_at", -1)
            .limit(limit)
            .to_list(limit)
        )
        items = []
        for r in rows:
            uploaded_by = r.get("uploaded_by") or ""
            items.append(
                {
                    "batch_id": r.get("batch_id"),
                    "file_name": r.get("file_name"),
                    "file_size": r.get("file_size"),
                    "uploaded_by": uploaded_by,
                    "uploaded_by_name": name_map.get(uploaded_by),
                    "uploaded_at": r.get("uploaded_at"),
                    "status": r.get("status"),
                    "total_rows": r.get("total_rows", 0),
                    "valid_rows": r.get("valid_rows", 0),
                    "invalid_rows": r.get("invalid_rows", 0),
                    "duplicate_rows": r.get("duplicate_rows", 0),
                    "inserted_count": r.get("inserted_count", 0),
                    "updated_count": r.get("updated_count", 0),
                    "skipped_count": r.get("skipped_count", 0),
                    "failed_count": r.get("failed_count", 0),
                    "has_errors": (
                        (r.get("invalid_rows", 0) or 0) > 0
                        or (r.get("failed_count", 0) or 0) > 0
                        or (r.get("duplicate_rows", 0) or 0) > 0
                    ),
                    "file_content_purged": bool(r.get("file_content_purged_at")),
                }
            )
        return {"items": items, "total": len(items)}

    async def batch_detail(self, batch_id: str) -> Dict[str, Any]:
        batch = await self._batch(batch_id)
        batch.pop("raw_rows", None)
        name_map = await self._user_name_map()
        uploaded_by = batch.get("uploaded_by") or ""
        batch["uploaded_by_name"] = name_map.get(uploaded_by)
        invalid_rows = batch.get("invalid_rows", 0) or 0
        failed_count = batch.get("failed_count", 0) or 0
        batch["has_errors"] = (
            invalid_rows > 0
            or failed_count > 0
            or (batch.get("duplicate_rows", 0) or 0) > 0
        )
        batch["file_content_purged"] = bool(batch.get("file_content_purged_at"))
        batch.setdefault("sheet_names", [])
        batch.setdefault("validation_summary", {})
        audit_rows = (
            await self.db[AUDIT_COLLECTION]
            .find({"batch_id": batch_id}, {"_id": 0})
            .sort("timestamp", 1)
            .to_list(20)
        )
        for ev in audit_rows:
            actor = ev.get("uploaded_by") or ""
            ev["uploaded_by_name"] = name_map.get(actor)
        batch["audit_events"] = audit_rows
        return batch

    async def error_report_bytes(self, batch_id: str) -> bytes:
        await self._batch(batch_id)
        rows = await self.db[STAGING_COLLECTION].find({"batch_id": batch_id}, {"_id": 0}).sort(
            "row_number", 1
        ).to_list(MAX_ROWS + 1)

        import pandas as pd

        out_rows = []
        for r in rows:
            orig = r.get("original_row") or {}
            trans = r.get("transformed_row") or {}
            err_items = r.get("errors") or []
            err_msgs = "; ".join(f"{e.get('field')}: {e.get('error')}" for e in err_items)
            suggestions = "; ".join(
                e.get("suggested_correction") or "" for e in err_items if e.get("suggested_correction")
            )
            row_out: Dict[str, Any] = {
                "row_number": r.get("row_number"),
                "validation_status": r.get("validation_status"),
                "import_action": r.get("import_action"),
                "duplicate_match_reason": r.get("duplicate_match_reason"),
                "errors": err_msgs,
                "suggested_correction": suggestions,
                "full_name": _sanitize_excel_value(trans.get("full_name") or orig.get("Name") or orig.get("full_name")),
                "email": _sanitize_excel_value(trans.get("email")),
                "phone": _sanitize_excel_value(trans.get("phone")),
            }
            for k, v in orig.items():
                col = f"original_{k}"
                if col not in row_out:
                    row_out[col] = _sanitize_excel_value(v)
            for k, v in trans.items():
                col = f"transformed_{k}"
                if col not in row_out and k not in ("import_row_index",):
                    row_out[col] = _sanitize_excel_value(v)
            out_rows.append(row_out)
        df = pd.DataFrame(out_rows)
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Errors")
        buf.seek(0)
        return buf.read()

    def template_bytes(self) -> bytes:
        import pandas as pd

        cols = [f["label"] for f in CANDIDATE_IMPORT_FIELDS if f["field"] in {
            "full_name", "email", "phone", "location", "headline", "total_experience_years",
            "skills", "current_company", "current_ctc", "expected_ctc", "notice_period_days",
            "preferred_location", "source", "job_code", "recruiter_email", "recruiter_name", "remarks",
        }]
        sample = pd.DataFrame(
            [
                {
                    "Full Name": "Rahul Sharma",
                    "Email": "rahul@example.com",
                    "Phone": "9876543210",
                    "Skills": "Python, SQL, FastAPI",
                    "Total Experience (years)": 5,
                    "Current CTC": "12 LPA",
                    "Expected CTC": "16 LPA",
                    "Notice Period (days)": 30,
                    "Current Company": "TCS",
                    "Location": "Mumbai",
                    "Job Code / Requisition ID": "JOB-001",
                }
            ]
        )
        instructions = pd.DataFrame(
            {
                "Instruction": [
                    "Required: Full Name. Email or Phone is strongly recommended.",
                    "Skills: comma-separated values.",
                    "CTC: supports LPA or numeric annual amount.",
                    "Job Code: use job ID, requisition code (e.g. JOB-001), or exact job title from Jobs.",
                    "When Job ID/Code is mapped, candidate is linked to pipeline stage SOURCED.",
                    "Duplicate rows (same email/phone/stable id) can be skipped, updated, or merged on import.",
                    "See Allowed Values sheet for source and pipeline stage reference.",
                ]
            }
        )
        allowed_rows = []
        for src in ALLOWED_CANDIDATE_SOURCES:
            allowed_rows.append({"Category": "Candidate Source", "Allowed Value": src, "Notes": "Use in Source column"})
        allowed_rows.append(
            {
                "Category": "Candidate Source",
                "Allowed Value": "Excel Upload",
                "Notes": "Display label; stored as EXCEL_IMPORT if blank",
            }
        )
        for stage in ALLOWED_PIPELINE_STAGES:
            allowed_rows.append(
                {
                    "Category": "Pipeline Stage (with Job)",
                    "Allowed Value": stage,
                    "Notes": "Set automatically when job is linked; default SOURCED",
                }
            )
        for strat in sorted(DUPLICATE_STRATEGIES):
            allowed_rows.append(
                {"Category": "Duplicate Strategy (UI)", "Allowed Value": strat, "Notes": "Selected at import time"}
            )
        allowed = pd.DataFrame(allowed_rows)
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            sample.to_excel(writer, index=False, sheet_name="Candidate Data")
            instructions.to_excel(writer, index=False, sheet_name="Instructions")
            allowed.to_excel(writer, index=False, sheet_name="Allowed Values")
        buf.seek(0)
        return buf.read()

    async def _audit(self, *, batch_id: str, uploaded_by: str, action: str, details: Dict[str, Any]) -> None:
        ts = iso_now()
        await self.db[AUDIT_COLLECTION].insert_one(
            {
                "action": f"CANDIDATE_EXCEL_{action}",
                "batch_id": batch_id,
                "uploaded_by": uploaded_by,
                "details": details,
                "timestamp": ts,
            }
        )
        mode_map = {"UPLOAD": "upload", "VALIDATE": "validate", "COMMIT": "commit"}
        try:
            await self.db[GLOBAL_AUDIT_COLLECTION].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "module": IMPORT_AUDIT_MODULE,
                    "mode": mode_map.get(action, action.lower()),
                    "dry_run": action == "VALIDATE",
                    "summary": {"batch_id": batch_id, **details},
                    "details": [],
                    "created_by": uploaded_by,
                    "created_at": ts,
                }
            )
        except Exception:
            logger.warning("candidate_import global audit write failed batch_id=%s", batch_id, exc_info=True)
