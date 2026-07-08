"""Tests for LLM insights cache and cached-pack LLM application."""

from __future__ import annotations

import pytest

from talent_acquisition.hiring_dashboard_llm_insights import (
    apply_llm_insights_to_hiring_pack,
    build_llm_context_from_pack,
    mistral_configured,
)
from talent_acquisition.hiring_dashboard_schemas import (
    AiInsightItem,
    AiRecommendation,
    DeltaMetric,
    HiringDashboardHeadline,
    HiringDashboardPack,
    HeroRiskMetrics,
    TabKpis,
)
from talent_acquisition.hiring_pack_cache import (
    get_cached_llm_insights,
    hiring_llm_insights_cache_size,
    invalidate_hiring_pack_cache,
    set_cached_hiring_pack,
    set_cached_llm_insights,
)


def _metric(value: int | float = 0, delta: float | None = 0.0) -> DeltaMetric:
    return DeltaMetric(value=value, delta_pct=delta)


def _sample_pack() -> HiringDashboardPack:
    return HiringDashboardPack(
        as_of="2026-06-18T00:00:00+00:00",
        window_days=30,
        data_freshness="cached",
        health_score=57,
        health_status="watch",
        headline=HiringDashboardHeadline(
            open_jobs=_metric(10, 1.0),
            active_pipeline=_metric(50, 0),
            new_applications=_metric(100, 5.0),
            hires=_metric(8, 0),
            avg_fit_score=_metric(80, 2.0),
            high_fit_pct=_metric(10, 1.0),
            good_fit_pct=_metric(45, 3.0),
        ),
        pipeline_by_stage={"SOURCED": 10},
        funnel=[],
        source_mix=[],
        fit_distribution=[],
        quality_by_source=[],
        req_aging=[],
        top_jobs=[],
        alerts=[],
        hero_risk_metrics=HeroRiskMetrics(),
        ai_recommendation=AiRecommendation(
            title="Rule title",
            message="Rule message",
            impact_days=3,
            action_path="/pipeline",
        ),
        ai_insights=[
            AiInsightItem(severity="blue", title="Rule insight", message="x", action_label="View")
        ],
        ai_insights_source="rule_based",
        tab_kpis=TabKpis(),
        total_jobs=1,
        total_candidates=1,
        total_applications=1,
    )


def test_mistral_configured_reads_env(monkeypatch):
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)
    assert mistral_configured() is False
    monkeypatch.setenv("MISTRAL_API_KEY", "test-key")
    assert mistral_configured() is True


def test_build_llm_context_from_pack():
    ctx = build_llm_context_from_pack(_sample_pack())
    assert ctx["health_score"] == 57
    assert ctx["open_jobs"] == 10
    assert ctx["data_freshness"] == "cached"


@pytest.mark.asyncio
async def test_apply_llm_uses_llm_insights_cache(monkeypatch):
    invalidate_hiring_pack_cache(reason="test_reset")
    monkeypatch.setenv("MISTRAL_API_KEY", "test-key")
    pack = _sample_pack()
    cache_key = "test-cache-key"
    set_cached_hiring_pack(cache_key, pack)

    calls = {"n": 0}

    async def fake_llm(_system, _user):
        calls["n"] += 1
        return (
            '{"recommendation":{"title":"Mistral title","message":"M","impact_days":9,'
            '"action_path":"/pipeline"},"insights":[{"severity":"red","title":"Mistral insight",'
            '"message":"Critical","action_label":"Act","action_path":"/pipeline"}]}'
        )

    out1 = await apply_llm_insights_to_hiring_pack(
        pack,
        llm_chat=fake_llm,
        config_flag=True,
        cache_key=cache_key,
    )
    assert out1.ai_insights_source == "llm"
    assert out1.ai_recommendation.title == "Mistral title"
    assert calls["n"] == 1
    assert get_cached_llm_insights(cache_key) is not None

    out2 = await apply_llm_insights_to_hiring_pack(
        pack,
        llm_chat=fake_llm,
        config_flag=True,
        cache_key=cache_key,
    )
    assert out2.ai_insights_source == "llm"
    assert calls["n"] == 1


def test_invalidate_clears_llm_cache():
    invalidate_hiring_pack_cache(reason="test_reset")
    set_cached_llm_insights("k1", {"source": "llm", "recommendation": None, "insights": []})
    assert hiring_llm_insights_cache_size() == 1
    invalidate_hiring_pack_cache(reason="test_reset")
    assert hiring_llm_insights_cache_size() == 0
