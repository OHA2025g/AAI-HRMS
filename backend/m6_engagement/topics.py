"""M6-2: lightweight topic tagging (keyword buckets) + weekly trend summaries."""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

_TOPIC_KEYWORDS: Dict[str, frozenset] = {
    "WORKLOAD": frozenset({"busy", "overload", "hours", "burnout", "deadline", "pace", "overwork"}),
    "CAREER": frozenset({"growth", "promotion", "learning", "career", "path", "skills", "training"}),
    "MANAGEMENT": frozenset({"manager", "leadership", "communication", "feedback", "micromanag"}),
    "COMPENSATION": frozenset({"pay", "salary", "bonus", "benefits", "compensation", "raise"}),
    "CULTURE": frozenset({"culture", "team", "inclusion", "respect", "values", "environment"}),
}


def classify_topic(text: Optional[str]) -> str:
    if not text:
        return "OTHER"
    t = text.lower()
    best_topic = "OTHER"
    best_hits = 0
    for topic, words in _TOPIC_KEYWORDS.items():
        hits = sum(1 for w in words if w in t)
        if hits > best_hits:
            best_hits = hits
            best_topic = topic
    return best_topic if best_hits > 0 else "OTHER"


def aggregate_topic_counts(rows: Sequence[Mapping[str, Any]]) -> Dict[str, int]:
    c: Counter[str] = Counter()
    for r in rows:
        lbl = r.get("topic_primary") or classify_topic(r.get("response_text"))
        c[str(lbl)] += 1
    return dict(c)


def _week_key(iso_ts: str) -> str:
    try:
        raw = (iso_ts or "").replace("Z", "+00:00")
        dt = datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        y, w, _ = dt.isocalendar()
        return f"{y}-W{w:02d}"
    except Exception:
        return "unknown"


def weekly_rating_trends(rows: Sequence[Mapping[str, Any]], *, max_weeks: int = 8) -> List[Dict[str, Any]]:
    """Most recent weeks first; avg rating + count per week."""
    by_week: Dict[str, List[int]] = defaultdict(list)
    for r in rows:
        wk = _week_key(str(r.get("created_at") or ""))
        if wk == "unknown":
            continue
        try:
            by_week[wk].append(int(r.get("rating") or 0))
        except (TypeError, ValueError):
            continue
    keys = sorted(by_week.keys(), reverse=True)[:max_weeks]
    out: List[Dict[str, Any]] = []
    for k in keys:
        vals = by_week[k]
        out.append(
            {
                "week": k,
                "count": len(vals),
                "avg_rating": round(sum(vals) / len(vals), 2) if vals else 0.0,
            }
        )
    return out


def confidence_tier(n_responses: int, *, low_below: int = 5, medium_below: int = 25) -> Tuple[str, str]:
    if n_responses < low_below:
        return "LOW", f"Sample size {n_responses} is below minimum for stable aggregates ({low_below})."
    if n_responses < medium_below:
        return "MEDIUM", f"Moderate sample ({n_responses}); treat trends as directional."
    return "HIGH", f"Sample size {n_responses} supports reliable aggregate views."
