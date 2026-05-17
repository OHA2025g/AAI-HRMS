"""Build full resume_text from structured candidate fields (Excel import, patches)."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from experience_parser import format_tenure, normalize_experience_list

SECTION_RULE = "=" * 40


def format_experience_section(experience: List[Dict[str, Any]]) -> str:
    roles = normalize_experience_list(experience or [])
    if not roles:
        return ""

    blocks: List[str] = []
    for role in roles:
        company = str(role.get("company") or "").strip()
        title = str(role.get("title") or "").strip()
        tenure = format_tenure(role.get("start_date"), role.get("end_date"))
        bullets = role.get("bullets")
        if not isinstance(bullets, list):
            bullets = []
        if not bullets:
            desc = str(role.get("description") or "").strip()
            if desc:
                bullets = [ln.lstrip("• ").strip() for ln in desc.splitlines() if ln.strip()]

        lines: List[str] = []
        if company:
            lines.append(f"Company: {company}")
        if title:
            lines.append(f"Role: {title}")
        if tenure:
            lines.append(f"Tenure: {tenure}")
        for bullet in bullets:
            b = str(bullet).strip()
            if b:
                lines.append(f"  • {b}")
        if lines:
            blocks.append("\n".join(lines))

    return "\n\n".join(blocks)


def format_skills_section(skills: List[Dict[str, Any]]) -> str:
    names: List[str] = []
    for sk in skills or []:
        if isinstance(sk, dict) and sk.get("skill_name"):
            names.append(str(sk["skill_name"]).strip())
        elif isinstance(sk, str) and sk.strip():
            names.append(sk.strip())
    return ", ".join(names)


def format_education_section(
    education: List[Dict[str, Any]], education_cell: Optional[str] = None
) -> str:
    lines: List[str] = []
    for edu in education or []:
        if not isinstance(edu, dict):
            continue
        degree = str(edu.get("degree") or "").strip()
        institution = str(edu.get("institution") or "").strip()
        field = str(edu.get("field") or "").strip()
        year = edu.get("year")
        year_s = str(year).strip() if year not in (None, "", "None") else ""
        if degree and institution:
            chunk = degree
            if field and field.lower() != "none":
                chunk += f" in {field}"
            chunk += f" @ {institution}"
            if year_s:
                chunk += f" ({year_s})"
            lines.append(chunk)
        elif degree:
            lines.append(degree)
    if lines:
        return "\n".join(lines)
    if education_cell and str(education_cell).strip():
        return str(education_cell).strip()
    return ""


def parse_education_cell(educ: str) -> List[Dict[str, Any]]:
    """Parse semicolon-separated education strings from Excel exports."""
    raw = (educ or "").strip()
    if not raw:
        return []
    parts = [p.strip() for p in re.split(r";", raw) if p.strip()]
    result: List[Dict[str, Any]] = []
    for part in parts:
        m = re.match(
            r"^(.+?)\s+in\s+(.+?)\s+@\s+(.+?)\s*\(([^)]+)\)\s*$",
            part,
            re.IGNORECASE,
        )
        if m:
            field = m.group(2).strip()
            year = m.group(4).strip()
            result.append(
                {
                    "degree": m.group(1).strip(),
                    "field": None if field.lower() == "none" else field,
                    "institution": m.group(3).strip(),
                    "year": None if year.lower() == "none" else year,
                }
            )
        else:
            result.append(
                {
                    "degree": part,
                    "institution": "",
                    "field": None,
                    "year": None,
                }
            )
    return result


def is_education_only_resume(resume_text: Optional[str]) -> bool:
    text = (resume_text or "").strip()
    if not text:
        return False
    lowered = text.lower()
    if not lowered.startswith("education"):
        return False
    without = re.sub(r"^education:?\s*", "", lowered, flags=re.IGNORECASE).strip()
    return not any(
        prefix in without
        for prefix in ("work experience", "company:", "skills:", "summary:", "headline:")
    )


def _section(title: str, body: str) -> str:
    body = (body or "").strip()
    if not body:
        return ""
    return f"{title}\n{SECTION_RULE}\n{body}"


def compose_resume_text(
    *,
    resume_text: Optional[str] = None,
    headline: Optional[str] = None,
    location: Optional[str] = None,
    total_experience_years: Optional[float] = None,
    skills: Optional[List[Dict[str, Any]]] = None,
    experience: Optional[List[Dict[str, Any]]] = None,
    education: Optional[List[Dict[str, Any]]] = None,
    education_cell: Optional[str] = None,
) -> Optional[str]:
    """Merge fields into a consistently formatted resume body."""
    sections: List[str] = []
    stored = (resume_text or "").strip()

    summary = stored if stored and not is_education_only_resume(stored) else ""
    if summary and summary.startswith("Headline\n"):
        summary = ""

    if headline and str(headline).strip():
        sections.append(_section("Headline", str(headline).strip()))

    if summary:
        sections.append(_section("Profile", summary))

    if location and str(location).strip():
        sections.append(_section("Location", str(location).strip()))

    if total_experience_years is not None:
        try:
            yrs = float(total_experience_years)
            label = f"{yrs:g} year" if yrs == 1 else f"{yrs:g} years"
            sections.append(_section("Total Experience", label))
        except (TypeError, ValueError):
            pass

    skills_block = format_skills_section(skills or [])
    if skills_block:
        sections.append(_section("Skills", skills_block))

    exp_block = format_experience_section(experience or [])
    if exp_block:
        sections.append(_section("Work Experience", exp_block))

    edu_block = format_education_section(education or [], education_cell)
    if edu_block:
        sections.append(_section("Education", edu_block))
    elif stored and is_education_only_resume(stored):
        edu_only = re.sub(r"^Education:?\s*", "", stored, flags=re.IGNORECASE).strip()
        if edu_only:
            sections.append(_section("Education", edu_only))

    sections = [s for s in sections if s]
    if not sections:
        return stored or None
    return "\n\n".join(sections)
