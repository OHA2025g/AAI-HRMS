"""Parse ATS/Excel mashed experience strings into structured roles."""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

ROLE_KEYWORDS = (
    "Chief",
    "Vice President",
    "Director",
    "Manager",
    "Architect",
    "Consultant",
    "Associate",
    "Analyst",
    "Engineer",
    "Developer",
    "Executive",
    "Intern",
    "Trainee",
    "Accountant",
    "Specialist",
    "Lead",
    "Officer",
    "Coordinator",
)

RE_ISO_RANGE = re.compile(
    r"(?P<start>\d{4}-\d{2})(?:\s*[-–]\s*(?P<end>\d{4}-\d{2}|present|current))?",
    re.IGNORECASE,
)
RE_ISO_MASHED = re.compile(
    r"(?P<start>\d{4}-\d{2})(?P<end>\d{4}-\d{2}|present|current)",
    re.IGNORECASE,
)
RE_SERIAL_RANGE = re.compile(
    r"(?P<start>\d{5,6})(?P<end>\d{5,6})?(?P<present>present|current)",
    re.IGNORECASE,
)
RE_SERIAL_SINGLE = re.compile(r"(?P<start>\d{5,6})(?P<present>present|current)", re.IGNORECASE)
RE_SERIAL_PAIR = re.compile(r"(?P<start>\d{5})(?P<end>\d{5})(?!\d)")


def _excel_serial_to_label(serial: str) -> Optional[str]:
    try:
        days = int(serial)
        if days < 30000 or days > 60000:
            return None
        dt = datetime(1899, 12, 30) + timedelta(days=days)
        return dt.strftime("%b %Y")
    except (TypeError, ValueError):
        return None


def _iso_to_label(ym: str) -> str:
    try:
        year, month = ym.split("-", 1)
        dt = datetime(int(year), int(month), 1)
        return dt.strftime("%b %Y")
    except (TypeError, ValueError):
        return ym


def format_tenure(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> str:
    start = (start_date or "").strip()
    end = (end_date or "").strip()
    if not start and not end:
        return ""
    end_l = end.lower()
    if not end or end_l in ("present", "current"):
        end_label = "Present"
    else:
        end_label = end
    if start and end_label:
        return f"{start} – {end_label}"
    return start or end_label


def _insert_title_boundaries(text: str) -> str:
    """Add spaces between mashed tokens: AssociatesDecision -> Associates Decision."""
    s = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text)
    s = re.sub(r"(?<=[A-Z])(?=[A-Z][a-z])", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _split_company_title(prefix: str) -> Tuple[str, str]:
    text = _insert_title_boundaries(prefix.strip())
    if not text:
        return "", ""
    best_idx = -1
    best_end = 0
    for kw in sorted(ROLE_KEYWORDS, key=len, reverse=True):
        idx = text.lower().rfind(kw.lower())
        if idx <= 0:
            continue
        end = idx + len(kw)
        if end >= best_end:
            best_idx = idx
            best_end = end
    if best_idx > 0:
        company = text[:best_idx].strip()
        title = text[best_idx:].strip()
        return company, title
    return text, ""


def _extract_date_range(segment: str) -> Tuple[Optional[Dict[str, str]], int, int]:
    for pattern in (RE_ISO_RANGE, RE_ISO_MASHED, RE_SERIAL_RANGE, RE_SERIAL_SINGLE, RE_SERIAL_PAIR):
        m = pattern.search(segment)
        if not m:
            continue
        start_raw = m.group("start")
        end_raw = m.groupdict().get("end")
        present = m.groupdict().get("present")
        if "-" in start_raw:
            start_label = _iso_to_label(start_raw)
            if end_raw and str(end_raw).lower() not in ("present", "current"):
                end_label = _iso_to_label(str(end_raw))
            else:
                end_label = "Present"
        else:
            start_label = _excel_serial_to_label(start_raw) or start_raw
            if end_raw:
                end_label = _excel_serial_to_label(str(end_raw)) or str(end_raw)
            elif present:
                end_label = "Present"
            else:
                end_label = ""
        return (
            {"start_date": start_label, "end_date": end_label},
            m.start(),
            m.end(),
        )
    return None, -1, -1


def _split_bullets(text: str) -> List[str]:
    raw = (text or "").strip()
    if not raw:
        return []
    parts = re.split(r"\s*•\s*", raw)
    parts = [p.strip() for p in parts if p.strip()]
    if len(parts) > 1:
        return parts
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z(])", raw)
    return [s.strip() for s in sentences if len(s.strip()) > 20]


def parse_experience_segment(segment: str) -> Dict[str, Any]:
    seg = (segment or "").strip()
    if not seg:
        return {"company": "", "title": "", "start_date": "", "end_date": "", "description": "", "bullets": []}

    dates, d_start, d_end = _extract_date_range(seg)
    if dates:
        prefix = seg[:d_start].strip()
        suffix = seg[d_end:].strip()
    else:
        prefix = seg
        suffix = ""
        dates = {"start_date": "", "end_date": ""}

    company, title = _split_company_title(prefix)
    bullets = _split_bullets(suffix)
    description = "\n".join(f"• {b}" for b in bullets) if bullets else suffix

    return {
        "company": company,
        "title": title,
        "start_date": dates.get("start_date", ""),
        "end_date": dates.get("end_date", ""),
        "description": description,
        "bullets": bullets,
    }


def parse_experience_blob(raw: str) -> List[Dict[str, Any]]:
    text = (raw or "").strip()
    if not text:
        return []
    text = re.sub(r"\|+$", "", text).strip()
    segments = [s.strip() for s in text.split("|") if s.strip()]
    if not segments:
        segments = [text]
    return [parse_experience_segment(seg) for seg in segments]


def normalize_experience_list(experience: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalize DB experience rows; parse mashed description blobs when needed."""
    if not experience:
        return []
    out: List[Dict[str, Any]] = []
    for exp in experience:
        if not isinstance(exp, dict):
            continue
        company = str(exp.get("company") or "").strip()
        title = str(exp.get("title") or "").strip()
        start = str(exp.get("start_date") or "").strip()
        end = str(exp.get("end_date") or "").strip()
        desc = str(exp.get("description") or "").strip()

        if company and title and (start or end or not desc):
            bullets = exp.get("bullets")
            if not isinstance(bullets, list):
                bullets = _split_bullets(desc)
            out.append({**exp, "company": company, "title": title, "bullets": bullets})
            continue

        if desc and ("|" in desc or re.search(r"\d{4}-\d{2}|\d{5,6}", desc)):
            out.extend(parse_experience_blob(desc))
            continue

        if desc:
            parsed = parse_experience_segment(desc)
            out.append(parsed)
        elif company or title:
            out.append(
                {
                    "company": company,
                    "title": title,
                    "start_date": start,
                    "end_date": end,
                    "description": desc,
                    "bullets": _split_bullets(desc),
                }
            )
    return out
