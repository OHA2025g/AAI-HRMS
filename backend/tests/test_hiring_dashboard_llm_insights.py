"""Tests for optional LLM-enhanced hiring dashboard insights."""

import json

import pytest

from talent_acquisition.hiring_dashboard_llm_insights import (
    _extract_json_block,
    _parse_insights,
    _parse_recommendation,
    enhance_insights_with_llm,
    llm_insights_enabled,
)
from talent_acquisition.hiring_dashboard_schemas import AiInsightItem, AiRecommendation


def test_llm_insights_enabled_respects_env_and_config(monkeypatch):
    monkeypatch.delenv("HIRING_DASHBOARD_LLM_INSIGHTS", raising=False)
    assert llm_insights_enabled(config_flag=False) is False
    assert llm_insights_enabled(config_flag=True) is True
    monkeypatch.setenv("HIRING_DASHBOARD_LLM_INSIGHTS", "1")
    assert llm_insights_enabled(config_flag=False) is True


def test_extract_json_block_parses_fenced_json():
    raw = '```json\n{"recommendation": {"title": "Fix pipeline"}}\n```'
    data = _extract_json_block(raw)
    assert data["recommendation"]["title"] == "Fix pipeline"


def test_parse_recommendation_and_insights():
    rec = _parse_recommendation(
        {
            "recommendation": {
                "title": "Prioritize interviews",
                "message": "Backlog growing",
                "impact_days": 7,
                "action_path": "/pipeline",
            }
        }
    )
    assert isinstance(rec, AiRecommendation)
    assert rec.title == "Prioritize interviews"
    assert rec.impact_days == 7

    insights = _parse_insights(
        {
            "insights": [
                {
                    "severity": "orange",
                    "title": "Stuck candidates",
                    "message": "12 over SLA",
                    "action_label": "Review",
                    "action_path": "/pipeline",
                }
            ]
        }
    )
    assert len(insights) == 1
    assert insights[0].severity == "orange"


@pytest.mark.asyncio
async def test_enhance_insights_with_llm_success():
    fallback_rec = AiRecommendation(title="Fallback", message="Rule copy", impact_days=0, action_path="/pipeline")
    fallback_insights = [AiInsightItem(severity="blue", title="Fallback insight", message="x", action_label="View")]

    async def fake_llm(_system, _user):
        return json.dumps(
            {
                "recommendation": {
                    "title": "LLM title",
                    "message": "LLM message",
                    "impact_days": 5,
                    "action_path": "/dashboard?tab=pipeline",
                },
                "insights": [
                    {
                        "severity": "red",
                        "title": "LLM insight",
                        "message": "Critical",
                        "action_label": "Act",
                        "action_path": "/pipeline",
                    }
                ],
            }
        )

    rec, insights, source = await enhance_insights_with_llm(
        llm_chat=fake_llm,
        context={"health_score": 42},
        fallback_rec=fallback_rec,
        fallback_insights=fallback_insights,
    )
    assert source == "llm"
    assert rec.title == "LLM title"
    assert insights[0].title == "LLM insight"


@pytest.mark.asyncio
async def test_enhance_insights_with_llm_falls_back_on_error():
    fallback_rec = AiRecommendation(title="Fallback", message="Rule copy", impact_days=0, action_path="/pipeline")
    fallback_insights = [AiInsightItem(severity="blue", title="Fallback insight", message="x", action_label="View")]

    async def bad_llm(_system, _user):
        raise RuntimeError("LLM unavailable")

    rec, insights, source = await enhance_insights_with_llm(
        llm_chat=bad_llm,
        context={},
        fallback_rec=fallback_rec,
        fallback_insights=fallback_insights,
    )
    assert source == "rule_based"
    assert rec.title == "Fallback"
    assert insights[0].title == "Fallback insight"
