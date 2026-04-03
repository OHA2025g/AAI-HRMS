"""
M5-2: LMS provider adapter — pluggable fetch; default stub for labs.
"""

from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, List, Protocol, runtime_checkable


@runtime_checkable
class LmsCourseProvider(Protocol):
    provider_name: str

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        ...


class StubLmsProvider:
    """Returns deterministic catalog rows (no external HTTP)."""

    provider_name = "stub"

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        await asyncio.sleep(0)
        extra = os.environ.get("M5_LMS_STUB_JSON", "").strip()
        if extra:
            import json

            try:
                data = json.loads(extra)
                if isinstance(data, list):
                    return [x for x in data if isinstance(x, dict)]
            except json.JSONDecodeError:
                pass
        return [
            {
                "id": "stub-python-101",
                "title": "Python for Professionals",
                "description": "Core Python syntax, data structures, and testing basics.",
                "skills": ["Python", "pytest"],
                "duration_hours": 8,
                "url": "https://example.com/lms/python-101",
            },
            {
                "id": "stub-cloud-sec",
                "title": "Cloud Security Essentials",
                "description": "IAM, network controls, and audit logging patterns.",
                "skills": ["AWS", "Security"],
                "duration_hours": 6,
                "url": "https://example.com/lms/cloud-sec",
            },
        ]


def get_provider(name: str) -> LmsCourseProvider:
    n = (name or "").strip().lower() or "stub"
    if n == "stub":
        return StubLmsProvider()
    raise ValueError(f"Unknown LMS provider: {name}")
