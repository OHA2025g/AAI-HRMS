"""Resolve placement org fields on jobs (stored values + title/domain fallbacks)."""

from __future__ import annotations

import re
from typing import Any, Dict, Optional, Tuple

_TITLE_SUFFIX_RE = re.compile(r"[\u2013\u2014\-]\s*(.+)$")

# Practice label (title suffix) -> (pillar, department)
_PRACTICE_ORG: Dict[str, Tuple[str, str]] = {
    "investigations": ("Advisory", "Forensic & Integrity"),
    "forensic technology services": ("Advisory", "Forensic & Integrity"),
    "third party due diligence & anti money laundering": ("Advisory", "Forensic & Integrity"),
    "internal audit": ("Advisory", "Risk Advisory"),
    "risk assessment – pci dss / nist / iso 27001": ("Advisory", "Risk Advisory"),
    "info sec and tech risk assessments": ("Advisory", "Cyber Security"),
    "cyber transformation": ("Advisory", "Cyber Security"),
    "email security": ("Advisory", "Cyber Security"),
    "credit risk": ("Advisory", "Financial Risk"),
    "data analyst": ("Technology", "Data & Analytics"),
    "azure data engineering": ("Technology", "Data & Analytics"),
    "power bi": ("Technology", "Data & Analytics"),
    "alteryx": ("Technology", "Data & Analytics"),
    "gen ai": ("Technology", "AI & Innovation"),
    "ai/ml": ("Technology", "AI & Innovation"),
    "product development and ai": ("Technology", "AI & Innovation"),
    "sap pp": ("Technology", "Enterprise Applications"),
    "it servicenow – virtual agent": ("Technology", "Enterprise Applications"),
    "power platforms": ("Technology", "Enterprise Applications"),
    "gcc sales – power platform": ("Technology", "Enterprise Applications"),
    "software": ("Technology", "Software Engineering"),
    "elk engineer": ("Technology", "Cyber Security"),
    "elk / splunk – associate consultant": ("Technology", "Cyber Security"),
    "soar automation – associate consultant": ("Technology", "Cyber Security"),
    "consultant": ("Advisory", "Consulting"),
    "associate consultant": ("Advisory", "Consulting"),
    "associate director": ("Advisory", "Consulting"),
}

_DEFAULT_PILLAR = "Advisory"
_DEFAULT_DEPARTMENT = "Consulting"


def _clean(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def infer_sub_department_from_title(title: Optional[str]) -> Optional[str]:
    text = _clean(title)
    if not text:
        return None
    match = _TITLE_SUFFIX_RE.search(text)
    if match:
        return match.group(1).strip()
    return text


def infer_org_from_practice(practice: Optional[str]) -> Tuple[str, str, str]:
    """Return (pillar, department, sub_department) from a practice label."""
    sub = _clean(practice) or _DEFAULT_DEPARTMENT
    key = sub.lower()
    pillar, dept = _PRACTICE_ORG.get(key, (_DEFAULT_PILLAR, _DEFAULT_DEPARTMENT))
    return pillar, dept, sub


def effective_job_org(job: Dict[str, Any]) -> Dict[str, Optional[str]]:
    """
    Placement fields for filters and scoping.

    Uses stored business_* values when present; otherwise infers from title/domain.
    """
    pillar = _clean(job.get("business_pillar"))
    department = _clean(job.get("business_department")) or _clean(job.get("department"))
    sub_department = _clean(job.get("business_sub_department"))
    project_id = _clean(job.get("project_id"))

    if pillar and department and sub_department:
        return {
            "business_pillar": pillar,
            "business_department": department,
            "business_sub_department": sub_department,
            "project_id": project_id,
        }

    practice = sub_department or infer_sub_department_from_title(job.get("title"))
    if not practice:
        domain = _clean(job.get("domain"))
        if domain:
            practice = domain

    if practice:
        inf_pillar, inf_dept, inf_sub = infer_org_from_practice(practice)
        pillar = pillar or inf_pillar
        department = department or inf_dept
        sub_department = sub_department or inf_sub
    elif department and not pillar:
        pillar = _DEFAULT_PILLAR

    return {
        "business_pillar": pillar,
        "business_department": department,
        "business_sub_department": sub_department,
        "project_id": project_id,
    }


def backfill_org_update(job: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Fields to $set when persisting inferred org values (None if nothing to add)."""
    if _clean(job.get("business_pillar")):
        return None

    org = effective_job_org(job)
    updates: Dict[str, str] = {}
    for key in ("business_pillar", "business_department", "business_sub_department"):
        if not _clean(job.get(key)) and org.get(key):
            updates[key] = org[key]  # type: ignore[assignment]
    return updates or None
