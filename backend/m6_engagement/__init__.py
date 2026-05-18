"""M6 Employee Satisfaction & Engagement."""

from m6_engagement.sentiment import compute_sentiment
from m6_engagement.topics import aggregate_topic_counts, classify_topic, confidence_tier, weekly_rating_trends

__all__ = [
    "compute_sentiment",
    "aggregate_topic_counts",
    "classify_topic",
    "confidence_tier",
    "weekly_rating_trends",
]
