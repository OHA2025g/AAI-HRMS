"""Compose searchable resume_text from candidate fields."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional


def parse_education_cell(raw: str) -> List[Dict[str, Any]]:
    if not raw or not str(raw).strip():
        return []
    parts = re.split(r"[;\n|]+", str(raw))
    out: List[Dict[str, Any]] = []
    for p in parts:
        text = p.strip()
        if text:
            out.append({"institution": text, "degree": None, "field": None})
    return out


def is_education_only_resume(text: Optional[str]) -> bool:
    if not text:
        return False
    t = str(text).strip().lower()
    return t.startswith("education:") and "experience:" not in t


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
) -> str:
    chunks: List[str] = []
    if resume_text and str(resume_text).strip():
        chunks.append(str(resume_text).strip())
    if headline:
        chunks.append(f"Headline: {headline}")
    if location:
        chunks.append(f"Location: {location}")
    if total_experience_years is not None:
        chunks.append(f"Experience: {total_experience_years} years")
    if skills:
        names = [s.get("skill_name") or s.get("name") for s in skills if isinstance(s, dict)]
        names = [n for n in names if n]
        if names:
            chunks.append("Skills: " + ", ".join(names))
    if experience:
        for exp in experience[:20]:
            if not isinstance(exp, dict):
                continue
            title = exp.get("title") or exp.get("role") or "Role"
            company = exp.get("company") or exp.get("organization") or ""
            desc = exp.get("description") or ""
            chunks.append(f"{title} @ {company}. {desc}".strip())
    if education:
        for ed in education[:10]:
            if isinstance(ed, dict):
                inst = ed.get("institution") or ed.get("school") or ""
                deg = ed.get("degree") or ""
                chunks.append(f"Education: {deg} {inst}".strip())
    elif education_cell:
        chunks.append(f"Education: {education_cell}")
    return "\n".join(chunks).strip()
