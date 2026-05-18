"""M6-2: sentiment scoring pipeline (deterministic, versioned)."""

from __future__ import annotations

from typing import Any, Dict, Optional

from m6_engagement.constants import SENTIMENT_PIPELINE_VERSION

POSITIVE_WORDS = frozenset(
    {"good", "great", "excellent", "improve", "improvement", "satisfied", "support", "helpful", "happy", "love", "thanks"}
)
NEGATIVE_WORDS = frozenset(
    {"bad", "poor", "terrible", "worse", "issue", "issues", "unsatisfied", "burnout", "stress", "toxic", "unfair"}
)


def compute_sentiment(rating: int, response_text: Optional[str]) -> Dict[str, Any]:
    rating = max(0, int(rating))
    text = (response_text or "").lower()

    score = 0.0
    if rating >= 4:
        score += 0.6
    elif rating <= 2:
        score -= 0.6

    pos_hits = sum(1 for w in POSITIVE_WORDS if w in text) if text else 0
    neg_hits = sum(1 for w in NEGATIVE_WORDS if w in text) if text else 0
    score += 0.15 * pos_hits
    score -= 0.15 * neg_hits

    if score >= 0.35:
        label = "POSITIVE"
    elif score <= -0.35:
        label = "NEGATIVE"
    else:
        label = "NEUTRAL"

    return {
        "sentiment_label": label,
        "sentiment_score": round(score, 3),
        "sentiment_pipeline_version": SENTIMENT_PIPELINE_VERSION,
    }
