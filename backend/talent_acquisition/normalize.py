"""
Normalize vendor-specific candidate payloads to the canonical HRMS shape (M1-2).
"""

from __future__ import annotations

from typing import Any, Dict, List


def _normalize_skills(raw_skills: Any) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not isinstance(raw_skills, list):
        return out
    for s in raw_skills:
        if isinstance(s, str) and s.strip():
            out.append({"skill_name": s.strip(), "proficiency": None})
        elif isinstance(s, dict) and s.get("skill_name"):
            out.append({"skill_name": str(s.get("skill_name")).strip(), "proficiency": s.get("proficiency")})
    return out


def normalize_board_candidate(raw: Dict[str, Any], source: str) -> Dict[str, Any]:
    """
    Map Naukri / Monster / LinkedIn style keys into the internal candidate dict.
    """
    src = (source or "EXTERNAL").upper()

    # Naukri-style
    if src == "NAUKRI":
        email = raw.get("email") or raw.get("contact_email")
        name = raw.get("full_name") or raw.get("candidate_name") or raw.get("name")
        skills = raw.get("key_skills") or raw.get("skills") or raw.get("skill_set")
        return {
            "id": raw.get("id") or raw.get("resume_id") or raw.get("candidate_id"),
            "full_name": name or "",
            "email": email,
            "phone": raw.get("phone") or raw.get("mobile") or raw.get("contact_number"),
            "location": raw.get("location") or raw.get("current_location"),
            "headline": raw.get("headline") or raw.get("designation") or raw.get("current_title"),
            "total_experience_years": raw.get("total_experience_years") or raw.get("experience_years"),
            "skills": _normalize_skills(skills if isinstance(skills, list) else []),
            "experience": raw.get("experience") or raw.get("employment") or [],
            "resume_text": raw.get("resume_text") or raw.get("synopsis") or raw.get("summary"),
            "source": "NAUKRI",
            "created_at": raw.get("created_at") or raw.get("last_modified"),
        }

    # Monster-style
    if src == "MONSTER":
        return {
            "id": raw.get("id") or raw.get("candidateId") or raw.get("profile_id"),
            "full_name": raw.get("full_name") or raw.get("name") or "",
            "email": raw.get("email") or raw.get("Email"),
            "phone": raw.get("phone") or raw.get("Phone"),
            "location": raw.get("location") or raw.get("City"),
            "headline": raw.get("headline") or raw.get("JobTitle"),
            "total_experience_years": raw.get("total_experience_years") or raw.get("YearsOfExperience"),
            "skills": _normalize_skills(raw.get("skills") or raw.get("Skills") or []),
            "experience": raw.get("experience") or [],
            "resume_text": raw.get("resume_text") or raw.get("ProfileSummary"),
            "source": "MONSTER",
            "created_at": raw.get("created_at"),
        }

    # LinkedIn / generic
    email = raw.get("email")
    return {
        "id": raw.get("id"),
        "full_name": raw.get("full_name") or raw.get("name") or raw.get("candidate_name") or "",
        "email": email,
        "phone": raw.get("phone"),
        "location": raw.get("location"),
        "headline": raw.get("headline") or raw.get("current_title") or raw.get("job_title"),
        "total_experience_years": raw.get("total_experience_years") or raw.get("experience_years"),
        "skills": _normalize_skills(raw.get("skills") or raw.get("skill_set") or []),
        "experience": raw.get("experience") or raw.get("work_experience") or [],
        "resume_text": raw.get("resume_text") or raw.get("resume") or raw.get("summary"),
        "source": "LINKEDIN" if src == "LINKEDIN" else source,
        "created_at": raw.get("created_at"),
    }
