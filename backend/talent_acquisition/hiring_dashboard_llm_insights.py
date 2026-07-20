"""Optional LLM-enhanced insights for Smart Hiring Dashboard (Mistral AI, feature-flagged)."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Callable, Dict, List, Optional, Tuple

from talent_acquisition.hiring_dashboard_insights import shorten_action_label
from talent_acquisition.hiring_dashboard_schemas import AiInsightItem, AiRecommendation, HiringDashboardPack
from talent_acquisition.hiring_pack_cache import get_cached_llm_insights, set_cached_llm_insights

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a hiring operations analyst for an enterprise HRMS dashboard.
Return ONLY valid JSON (no markdown) with this shape:
{
  "recommendation": {
    "title": "string",
    "message": "string",
    "impact_days": number,
    "action_path": "/pipeline or /dashboard?tab=..."
  },
  "insights": [
    {
      "severity": "red|orange|blue|green",
      "title": "string",
      "message": "string",
      "action_label": "2-3 words only (e.g. Take Action, View Details)",
      "action_path": "string or null"
    }
  ]
}
Provide at most 4 insights. Be specific, actionable, and grounded in the supplied metrics.
Each insight action_label must be exactly 2 or 3 words."""


def llm_insights_enabled(*, config_flag: bool) -> bool:
    env_on = os.environ.get("HIRING_DASHBOARD_LLM_INSIGHTS", "").strip().lower() in ("1", "true", "yes")
    return env_on or bool(config_flag)


def mistral_configured() -> bool:
    return bool((os.environ.get("MISTRAL_API_KEY") or "").strip())


def _extract_json_block(text: str) -> Dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        raise ValueError("empty LLM response")
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if fence:
        raw = fence.group(1).strip()
    return json.loads(raw)


def _parse_recommendation(data: Dict[str, Any]) -> Optional[AiRecommendation]:
    rec = data.get("recommendation")
    if not isinstance(rec, dict):
        return None
    title = str(rec.get("title") or "").strip()
    if not title:
        return None
    impact = rec.get("impact_days")
    try:
        impact_days = int(impact) if impact is not None else 0
    except (TypeError, ValueError):
        impact_days = 0
    return AiRecommendation(
        title=title,
        message=str(rec.get("message") or ""),
        impact_days=impact_days,
        action_path=rec.get("action_path") or "/pipeline",
    )


def _parse_insights(data: Dict[str, Any]) -> List[AiInsightItem]:
    items: List[AiInsightItem] = []
    for row in data.get("insights") or []:
        if not isinstance(row, dict):
            continue
        sev = str(row.get("severity") or "blue").lower()
        if sev not in {"red", "orange", "blue", "green"}:
            sev = "blue"
        title = str(row.get("title") or "").strip()
        if not title:
            continue
        items.append(
            AiInsightItem(
                severity=sev,
                title=title,
                message=str(row.get("message") or ""),
                action_label=shorten_action_label(str(row.get("action_label") or "View Details")),
                action_path=row.get("action_path"),
            )
        )
    return items[:4]


async def enhance_insights_with_llm(
    *,
    llm_chat: Callable[..., Any],
    context: Dict[str, Any],
    fallback_rec: Optional[AiRecommendation],
    fallback_insights: List[AiInsightItem],
) -> Tuple[Optional[AiRecommendation], List[AiInsightItem], str]:
    """Returns (recommendation, insights, source) where source is llm or rule_based."""
    try:
        user_text = json.dumps(context, default=str)
        raw = await llm_chat(SYSTEM_PROMPT, user_text)
        data = _extract_json_block(raw)
        rec = _parse_recommendation(data) or fallback_rec
        insights = _parse_insights(data) or fallback_insights
        return rec, insights, "llm"
    except Exception as exc:
        logger.warning("LLM hiring dashboard insights failed, using rule-based copy: %s", exc)
        return fallback_rec, fallback_insights, "rule_based"


def build_llm_context_from_pack(pack: HiringDashboardPack) -> Dict[str, Any]:
    """Build Mistral context from an aggregated pack (works for cached packs)."""
    headline = pack.headline
    open_jobs = headline.open_jobs.value if headline.open_jobs else 0
    alerts = [
        a.model_dump() if hasattr(a, "model_dump") else dict(a)
        for a in (pack.alerts or [])[:6]
    ]
    offer_acceptance = None
    if headline.offer_acceptance_pct and headline.offer_acceptance_pct.value is not None:
        offer_acceptance = headline.offer_acceptance_pct.value
    avg_fit = headline.avg_fit_score.value if headline.avg_fit_score else None
    high_fit = headline.high_fit_pct.value if headline.high_fit_pct else None
    return {
        "health_score": pack.health_score,
        "health_status": pack.health_status,
        "window_days": pack.window_days,
        "open_jobs": open_jobs,
        "active_pipeline": headline.active_pipeline.value if headline.active_pipeline else 0,
        "avg_fit": avg_fit,
        "high_fit_pct": high_fit,
        "offer_acceptance_pct": offer_acceptance,
        "alerts": alerts,
        "hero_risk": pack.hero_risk_metrics.model_dump(),
        "tab_kpis": pack.tab_kpis.model_dump(),
        "data_freshness": pack.data_freshness,
    }


async def apply_llm_insights_to_hiring_pack(
    pack: HiringDashboardPack,
    *,
    llm_chat: Callable[..., Any] | None,
    config_flag: bool,
    cache_key: str | None = None,
) -> HiringDashboardPack:
    """
    Apply Mistral LLM insights on top of a rule-based pack (fresh or cached metrics).
    Uses a separate LLM insights cache keyed by hiring-pack cache_key.
    """
    if not llm_chat or not llm_insights_enabled(config_flag=config_flag):
        return pack
    if not mistral_configured():
        logger.warning("LLM insights enabled but MISTRAL_API_KEY is not set")
        return pack

    # Empty / no-signal dashboards: do not invent recommendation copy via LLM.
    if pack.health_score is None and not (pack.alerts or []) and not (pack.ai_insights or []):
        return pack

    fallback_rec = pack.ai_recommendation
    fallback_insights = list(pack.ai_insights or [])

    if cache_key:
        cached_llm = get_cached_llm_insights(cache_key)
        if cached_llm is not None:
            return pack.model_copy(
                update={
                    "ai_recommendation": cached_llm["recommendation"],
                    "ai_insights": cached_llm["insights"],
                    "ai_insights_source": cached_llm["source"],
                }
            )

    context = build_llm_context_from_pack(pack)
    ai_rec, ai_insights, insights_source = await enhance_insights_with_llm(
        llm_chat=llm_chat,
        context=context,
        fallback_rec=fallback_rec,
        fallback_insights=fallback_insights,
    )

    if cache_key:
        set_cached_llm_insights(
            cache_key,
            {
                "recommendation": ai_rec,
                "insights": ai_insights,
                "source": insights_source,
            },
        )

    return pack.model_copy(
        update={
            "ai_recommendation": ai_rec,
            "ai_insights": ai_insights,
            "ai_insights_source": insights_source,
        }
    )
