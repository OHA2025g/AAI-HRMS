"""Human-readable candidate labels (mirrors frontend `candidateListUtils.candidateDisplayName`)."""

from __future__ import annotations

import re
from typing import Any, Dict


def candidate_display_name(candidate: Dict[str, Any] | None) -> str:
    if not candidate:
        return "Unnamed Candidate"
    name = str(candidate.get("full_name") or "").strip()
    if name and not re.fullmatch(r"\d+", name):
        return name
    email = str(candidate.get("email") or "").strip()
    if email:
        local = email.split("@")[0]
        pretty = re.sub(r"[._+-]+", " ", local).strip()
        if pretty and not re.fullmatch(r"\d+", pretty):
            return pretty.title()
    headline = str(candidate.get("headline") or "").strip()
    return headline or "Unnamed Candidate"
