#!/usr/bin/env python3
"""Seed Employee Satisfaction & Engagement (M17) demo data. Env: ESE_SEED_FORCE=1 to refresh."""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from random import Random

from pymongo import MongoClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from m17_employee_satisfaction_engagement.constants import (  # noqa: E402
    COL_ACTIVITY_LOGS,
    COL_AI_ENGAGEMENT_RECOMMENDATION_RECORDS,
    COL_AI_SENTIMENT_INTELLIGENCE_RECORDS,
    COL_ATTRITION_LINKED_ENGAGEMENT_RISK_RECORDS,
    COL_BURNOUT_RISK_PREDICTION_RECORDS,
    COL_COMMUNICATION_CAMPAIGN_RECORDS,
    COL_COMMUNITY_PARTICIPATION_RECORDS,
    COL_CULTURE_PROGRAM_RECORDS,
    COL_EMPLOYEE_EXPERIENCE_RECORDS,
    COL_EMPLOYEE_FEEDBACK_RECORDS,
    COL_ENGAGEMENT_ACTION_PLANS,
    COL_ENGAGEMENT_ANALYTICS_SNAPSHOTS,
    COL_ENGAGEMENT_DASHBOARD_SNAPSHOTS,
    COL_ENGAGEMENT_DECLINE_PREDICTION_RECORDS,
    COL_ENGAGEMENT_DRIVER_ANALYSIS_RECORDS,
    COL_ENGAGEMENT_GOVERNANCE_RECORDS,
    COL_EXECUTIVE_EXPERIENCE_SUMMARY_SNAPSHOTS,
    COL_EXPERIENCE_FORECAST_RECORDS,
    COL_EXPERIENCE_GAP_ANALYSIS_RECORDS,
    COL_EXPERIENCE_RECOVERY_RECORDS,
    COL_EXPERIENCE_SCENARIO_MODELS,
    COL_GRIEVANCE_CONCERN_VISIBILITY_RECORDS,
    COL_HELPDESK_SERVICE_EXPERIENCE_RECORDS,
    COL_INCLUSION_BELONGING_RECORDS,
    COL_MANAGER_CONNECT_RECORDS,
    COL_MANAGER_EFFECTIVENESS_IMPROVEMENT_RECORDS,
    COL_MANAGER_INTERVENTION_RECORDS,
    COL_POLICY_RULES,
    COL_PULSE_SURVEY_CAMPAIGNS,
    COL_PULSE_SURVEY_RESPONSES,
    COL_PULSE_SURVEY_TEMPLATES,
    COL_RECOGNITION_PROGRAM_RECORDS,
    COL_RECOGNITION_VISIBILITY_RECORDS,
    COL_SELF_SERVICE_EXPERIENCE_RECORDS,
    COL_SENTIMENT_ANALYSIS_RECORDS,
    COL_STRATEGIC_EXPERIENCE_INTELLIGENCE_SNAPSHOTS,
    COL_TEAM_CLIMATE_RECORDS,
    COL_WELLBEING_PROGRAM_RECORDS,
    COL_WELLBEING_WORKLIFE_RECORDS,
    COL_WORKLOAD_FLEXIBILITY_RECORDS,
)

SEED_MARKER = "ESE_M17_DEMO"


def _load_env() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(BACKEND_DIR / ".env")
    except Exception:
        pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _id() -> str:
    return str(uuid.uuid4())


def main() -> None:
    _load_env()
    url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("MONGO_DB", "hrms")
    client = MongoClient(url, serverSelectionTimeoutMS=8000)
    db = client[db_name]
    rnd = Random(17)
    now = _now()

    force = os.environ.get("ESE_SEED_FORCE", "").strip().lower() in ("1", "true", "yes")
    cols = [
        COL_ENGAGEMENT_DASHBOARD_SNAPSHOTS,
        COL_PULSE_SURVEY_TEMPLATES,
        COL_PULSE_SURVEY_CAMPAIGNS,
        COL_PULSE_SURVEY_RESPONSES,
        COL_EMPLOYEE_FEEDBACK_RECORDS,
        COL_SENTIMENT_ANALYSIS_RECORDS,
        COL_EMPLOYEE_EXPERIENCE_RECORDS,
        COL_TEAM_CLIMATE_RECORDS,
        COL_RECOGNITION_VISIBILITY_RECORDS,
        COL_MANAGER_CONNECT_RECORDS,
        COL_WELLBEING_WORKLIFE_RECORDS,
        COL_INCLUSION_BELONGING_RECORDS,
        COL_GRIEVANCE_CONCERN_VISIBILITY_RECORDS,
        COL_ENGAGEMENT_ACTION_PLANS,
        COL_MANAGER_INTERVENTION_RECORDS,
        COL_RECOGNITION_PROGRAM_RECORDS,
        COL_COMMUNICATION_CAMPAIGN_RECORDS,
        COL_CULTURE_PROGRAM_RECORDS,
        COL_WELLBEING_PROGRAM_RECORDS,
        COL_SELF_SERVICE_EXPERIENCE_RECORDS,
        COL_WORKLOAD_FLEXIBILITY_RECORDS,
        COL_MANAGER_EFFECTIVENESS_IMPROVEMENT_RECORDS,
    COL_COMMUNITY_PARTICIPATION_RECORDS,
    COL_COMMUNICATION_EXPERIENCE_RECORDS,
    COL_CAREER_GROWTH_EXPERIENCE_RECORDS,
    COL_EXPERIENCE_RECOVERY_RECORDS,
        COL_HELPDESK_SERVICE_EXPERIENCE_RECORDS,
        COL_ENGAGEMENT_GOVERNANCE_RECORDS,
        COL_ENGAGEMENT_ANALYTICS_SNAPSHOTS,
        COL_ENGAGEMENT_DRIVER_ANALYSIS_RECORDS,
        COL_BURNOUT_RISK_PREDICTION_RECORDS,
        COL_ENGAGEMENT_DECLINE_PREDICTION_RECORDS,
        COL_ATTRITION_LINKED_ENGAGEMENT_RISK_RECORDS,
        COL_EXPERIENCE_GAP_ANALYSIS_RECORDS,
        COL_AI_ENGAGEMENT_RECOMMENDATION_RECORDS,
        COL_AI_SENTIMENT_INTELLIGENCE_RECORDS,
        COL_EXPERIENCE_FORECAST_RECORDS,
        COL_EXPERIENCE_SCENARIO_MODELS,
        COL_STRATEGIC_EXPERIENCE_INTELLIGENCE_SNAPSHOTS,
        COL_EXECUTIVE_EXPERIENCE_SUMMARY_SNAPSHOTS,
    ]

    if force:
        for c in cols:
            db[c].delete_many({"seed_marker": SEED_MARKER})
        db[COL_POLICY_RULES].delete_many({"seed_marker": SEED_MARKER})

    if db[COL_ENGAGEMENT_DASHBOARD_SNAPSHOTS].count_documents({"seed_marker": SEED_MARKER}) > 0 and not force:
        print("ESE seed: already present (set ESE_SEED_FORCE=1 to refresh)")
        return

    for i in range(6):
        dt = now - timedelta(days=30 * i)
        db[COL_ENGAGEMENT_DASHBOARD_SNAPSHOTS].insert_one(
            {
                "id": _id(),
                "snapshot_id": f"ese-dash-{i}",
                "snapshot_date": dt.date().isoformat(),
                "overall_engagement_score": round(0.68 + rnd.random() * 0.1, 3),
                "satisfaction_index": round(0.7 + rnd.random() * 0.08, 3),
                "enps_score": rnd.randint(8, 35),
                "pulse_participation_rate": round(0.52 + rnd.random() * 0.2, 3),
                "burnout_signal_score": round(0.2 + rnd.random() * 0.15, 3),
                "recognition_coverage_percent": round(0.45 + rnd.random() * 0.2, 3),
                "manager_connect_coverage_percent": round(0.5 + rnd.random() * 0.2, 3),
                "team_climate_score": round(0.65 + rnd.random() * 0.12, 3),
                "experience_risk_alert_count": rnd.randint(2, 14),
                "executive_kpi_payload": {"voice_index": 0.71},
                "created_at": _iso(dt),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(4):
        tid = f"tpl-{i}"
        db[COL_PULSE_SURVEY_TEMPLATES].insert_one(
            {
                "id": _id(),
                "template_id": tid,
                "template_name": f"Pulse template {i}",
                "survey_category": ["ENGAGEMENT", "WELLBEING", "MANAGER"][i % 3],
                "question_payload": {"questions": [{"id": "q1", "text": "How supported do you feel?"}]},
                "active_flag": True,
                "version": 1,
                "created_by": "seed",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(10):
        cid = f"camp-{i}"
        db[COL_PULSE_SURVEY_CAMPAIGNS].insert_one(
            {
                "id": _id(),
                "campaign_id": cid,
                "campaign_name": f"Pulse {i} — {['Q1', 'Q2', 'Q3', 'Q4'][i % 4]}",
                "template_id": f"tpl-{i % 4}",
                "survey_type": "PULSE",
                "target_scope": {"departments": ["Engineering", "HR"]},
                "anonymous_flag": i % 3 == 0,
                "recurring_flag": i % 4 == 0,
                "launch_date": (now - timedelta(days=10 * i)).date().isoformat(),
                "close_date": (now - timedelta(days=10 * i - 7)).date().isoformat(),
                "participation_rate": round(0.4 + rnd.random() * 0.45, 3),
                "status": ["OPEN", "CLOSED", "DRAFT"][i % 3],
                "created_by": "seed",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(20):
        db[COL_PULSE_SURVEY_RESPONSES].insert_one(
            {
                "id": _id(),
                "response_id": f"resp-{i}",
                "campaign_id": f"camp-{i % 10}",
                "employee_id_or_anonymous_token": f"anon-{i}" if i % 5 == 0 else f"emp-{i}",
                "response_payload": {"q1": rnd.randint(1, 5)},
                "engagement_score": round(0.5 + rnd.random() * 0.45, 3),
                "submitted_at": _iso(now - timedelta(hours=i)),
                "anonymity_scope": "ANONYMOUS" if i % 5 == 0 else "IDENTIFIED",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    cats = ["WORKLOAD", "MANAGER", "POLICY", "GROWTH", "TOOLS"]
    for i in range(24):
        db[COL_EMPLOYEE_FEEDBACK_RECORDS].insert_one(
            {
                "id": _id(),
                "feedback_id": f"fb-{i}",
                "employee_id": f"emp-{i % 40}",
                "feedback_type": ["OPEN", "STRUCTURED"][i % 2],
                "source_channel": "WEB",
                "category": cats[i % len(cats)],
                "feedback_text": "Sample feedback for demo theming and triage.",
                "severity": ["LOW", "MEDIUM", "HIGH"][i % 3],
                "department": ["Engineering", "HR", "Sales"][i % 3],
                "manager_id": f"mgr-{i % 8}",
                "submitted_on": (now - timedelta(days=i)).date().isoformat(),
                "status": ["NEW", "IN_REVIEW", "RESOLVED"][i % 3],
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(16):
        db[COL_SENTIMENT_ANALYSIS_RECORDS].insert_one(
            {
                "id": _id(),
                "sentiment_id": f"sen-{i}",
                "source_record_type": "FEEDBACK",
                "source_record_id": f"fb-{i % 20}",
                "sentiment_score": round(-1 + rnd.random() * 2, 3),
                "sentiment_label": ["POSITIVE", "NEUTRAL", "NEGATIVE"][i % 3],
                "emotion_signal": "STRESS" if i % 4 == 0 else "NEUTRAL",
                "theme_payload": {"themes": ["workload", "communication"]},
                "analyzed_on": _iso(now - timedelta(days=i)),
                "source_type": "MOCK_NLP",
                "is_mock": True,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    dims = ["HR_SERVICE", "MANAGER", "TOOLS", "GROWTH", "INCLUSION"]
    for i in range(18):
        db[COL_EMPLOYEE_EXPERIENCE_RECORDS].insert_one(
            {
                "id": _id(),
                "experience_record_id": f"exp-{i}",
                "employee_id": f"emp-{i % 30}",
                "experience_dimension": dims[i % len(dims)],
                "score": round(0.55 + rnd.random() * 0.4, 3),
                "comments": "Demo experience pulse",
                "captured_on": (now - timedelta(days=i)).date().isoformat(),
                "department": "Engineering",
                "manager_id": f"mgr-{i % 6}",
                "work_mode": ["REMOTE", "HYBRID", "ONSITE"][i % 3],
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_TEAM_CLIMATE_RECORDS].insert_one(
            {
                "id": _id(),
                "climate_id": f"cli-{i}",
                "team_id_or_department": f"DEPT-{i % 5}",
                "snapshot_date": (now - timedelta(days=14 * i)).date().isoformat(),
                "climate_score": round(0.6 + rnd.random() * 0.25, 3),
                "collaboration_score": round(0.58 + rnd.random() * 0.3, 3),
                "trust_score": round(0.55 + rnd.random() * 0.3, 3),
                "psychological_safety_score": round(0.52 + rnd.random() * 0.28, 3),
                "conflict_signal_score": round(0.05 + rnd.random() * 0.2, 3),
                "support_score": round(0.62 + rnd.random() * 0.2, 3),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(14):
        db[COL_RECOGNITION_VISIBILITY_RECORDS].insert_one(
            {
                "id": _id(),
                "recognition_visibility_id": f"recvis-{i}",
                "employee_id_or_team_scope": f"emp-{i % 25}",
                "period": (now - timedelta(days=30 * (i // 6))).strftime("%Y-%m"),
                "recognition_count": rnd.randint(0, 8),
                "recognition_type_mix": {"peer": 2, "manager": 3},
                "manager_recognition_flag": i % 2 == 0,
                "peer_recognition_flag": True,
                "coverage_score": round(0.4 + rnd.random() * 0.5, 3),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(16):
        db[COL_MANAGER_CONNECT_RECORDS].insert_one(
            {
                "id": _id(),
                "connect_id": f"conn-{i}",
                "employee_id": f"emp-{i % 20}",
                "manager_id": f"mgr-{i % 6}",
                "checkin_date": (now - timedelta(days=7 * i)).date().isoformat(),
                "interaction_type": ["1:1", "SKIP", "AD_HOC"][i % 3],
                "interaction_quality_score": round(0.5 + rnd.random() * 0.45, 3),
                "career_discussion_flag": i % 3 == 0,
                "feedback_discussion_flag": True,
                "followup_required_flag": i % 7 == 0,
                "remarks": "Demo connect",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(14):
        db[COL_WELLBEING_WORKLIFE_RECORDS].insert_one(
            {
                "id": _id(),
                "wellbeing_id": f"wb-{i}",
                "employee_id": f"emp-{i % 22}",
                "period": (now - timedelta(days=14 * i)).strftime("%Y-%m"),
                "wellbeing_score": round(0.55 + rnd.random() * 0.35, 3),
                "burnout_score": round(0.15 + rnd.random() * 0.35, 3),
                "workload_stress_score": round(0.2 + rnd.random() * 0.4, 3),
                "worklife_balance_score": round(0.5 + rnd.random() * 0.35, 3),
                "overtime_signal": rnd.randint(0, 20),
                "leave_deprivation_flag": i % 8 == 0,
                "support_uptake_flag": i % 5 == 0,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_INCLUSION_BELONGING_RECORDS].insert_one(
            {
                "id": _id(),
                "inclusion_id": f"inc-{i}",
                "employee_id_or_group_scope": f"emp-{i % 18}",
                "period": (now - timedelta(days=20 * i)).strftime("%Y-%m"),
                "inclusion_score": round(0.6 + rnd.random() * 0.3, 3),
                "belonging_score": round(0.58 + rnd.random() * 0.32, 3),
                "fairness_score": round(0.62 + rnd.random() * 0.28, 3),
                "respect_score": round(0.65 + rnd.random() * 0.25, 3),
                "exclusion_signal_score": round(0.05 + rnd.random() * 0.15, 3),
                "remarks": "Demo",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(14):
        db[COL_GRIEVANCE_CONCERN_VISIBILITY_RECORDS].insert_one(
            {
                "id": _id(),
                "concern_id": f"gr-{i}",
                "category": ["MANAGER", "WORKLOAD", "POLICY"][i % 3],
                "volume": rnd.randint(1, 12),
                "period": (now - timedelta(days=10 * i)).strftime("%Y-%m"),
                "escalation_trend": "FLAT",
                "resolution_satisfaction": round(0.5 + rnd.random() * 0.4, 3),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    def _bulk(col: str, prefix: str, title_fn, n: int = 8) -> None:
        for i in range(n):
            db[col].insert_one(
                {
                    "id": _id(),
                    f"{prefix}_id": f"{prefix}-{i}",
                    "title": title_fn(i),
                    "status": ["ACTIVE", "PLANNED", "DONE"][i % 3],
                    "created_at": _iso(now),
                    "seed_marker": SEED_MARKER,
                }
            )

    _bulk(COL_ENGAGEMENT_ACTION_PLANS, "action_plan", lambda i: f"Action plan {i}")
    _bulk(COL_MANAGER_INTERVENTION_RECORDS, "intervention", lambda i: f"Intervention {i}")
    _bulk(COL_RECOGNITION_PROGRAM_RECORDS, "program", lambda i: f"Recognition program {i}")
    _bulk(COL_COMMUNICATION_CAMPAIGN_RECORDS, "campaign_record", lambda i: f"Comm campaign {i}")
    _bulk(COL_CULTURE_PROGRAM_RECORDS, "culture", lambda i: f"Culture initiative {i}")
    _bulk(COL_WELLBEING_PROGRAM_RECORDS, "wellbeing_prog", lambda i: f"Wellness program {i}")
    _bulk(COL_SELF_SERVICE_EXPERIENCE_RECORDS, "ess", lambda i: f"ESS friction item {i}")
    _bulk(COL_WORKLOAD_FLEXIBILITY_RECORDS, "wf", lambda i: f"Workload flex {i}")
    _bulk(COL_MANAGER_EFFECTIVENESS_IMPROVEMENT_RECORDS, "mei", lambda i: f"Manager coaching {i}")
    _bulk(COL_COMMUNITY_PARTICIPATION_RECORDS, "cp", lambda i: f"Community {i}")
    _bulk(COL_EXPERIENCE_RECOVERY_RECORDS, "er", lambda i: f"Recovery case {i}")
    _bulk(COL_HELPDESK_SERVICE_EXPERIENCE_RECORDS, "hd", lambda i: f"Helpdesk experience {i}")
    _bulk(COL_ENGAGEMENT_GOVERNANCE_RECORDS, "gov", lambda i: f"Governance item {i}")

    for i in range(8):
        db[COL_ENGAGEMENT_ANALYTICS_SNAPSHOTS].insert_one(
            {
                "id": _id(),
                "analytics_snapshot_id": f"an-{i}",
                "snapshot_date": (now - timedelta(days=7 * i)).date().isoformat(),
                "enps_trend": round(rnd.uniform(-5, 8), 2),
                "participation_trend": round(0.5 + rnd.random() * 0.2, 3),
                "payload": {"teams": 42},
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(10):
        db[COL_ENGAGEMENT_DRIVER_ANALYSIS_RECORDS].insert_one(
            {
                "id": _id(),
                "driver_id": f"drv-{i}",
                "driver_name": ["Manager", "Recognition", "Workload", "Growth"][i % 4],
                "contribution_percent": round(5 + rnd.random() * 25, 2),
                "impact_summary": "Heuristic driver (demo)",
                "period": (now - timedelta(days=30 * i)).strftime("%Y-%m"),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(14):
        db[COL_BURNOUT_RISK_PREDICTION_RECORDS].insert_one(
            {
                "id": _id(),
                "burnout_prediction_id": f"br-{i}",
                "employee_id_or_group": f"emp-{i % 30}",
                "burnout_risk_score": round(0.2 + rnd.random() * 0.7, 3),
                "severity": ["LOW", "MEDIUM", "HIGH"][i % 3],
                "risk_factors_payload": {"signals": ["overtime", "low_checkin"]},
                "generated_at": _iso(now - timedelta(days=i)),
                "source_type": "MOCK_MODEL",
                "is_mock": True,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_ENGAGEMENT_DECLINE_PREDICTION_RECORDS].insert_one(
            {
                "id": _id(),
                "decline_prediction_id": f"ed-{i}",
                "employee_id_or_group": f"team-{i % 8}",
                "engagement_drop_probability": round(0.1 + rnd.random() * 0.5, 3),
                "time_to_decline_prediction": f"{rnd.randint(2, 12)}w",
                "risk_factors_payload": {"signals": ["survey dip"]},
                "confidence_score": round(0.55 + rnd.random() * 0.35, 3),
                "generated_at": _iso(now - timedelta(days=i)),
                "source_type": "MOCK_MODEL",
                "is_mock": True,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(10):
        db[COL_ATTRITION_LINKED_ENGAGEMENT_RISK_RECORDS].insert_one(
            {
                "id": _id(),
                "attrition_risk_id": f"ar-{i}",
                "cohort": f"BU-{i % 4}",
                "risk_score": round(0.15 + rnd.random() * 0.45, 3),
                "factors": ["low_recognition", "manager_connect"],
                "generated_at": _iso(now),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(10):
        db[COL_EXPERIENCE_GAP_ANALYSIS_RECORDS].insert_one(
            {
                "id": _id(),
                "gap_id": f"gap-{i}",
                "scope": ["DEPT", "TEAM", "LOCATION"][i % 3],
                "gap_score": round(rnd.uniform(0.05, 0.25), 3),
                "priority": ["P1", "P2", "P3"][i % 3],
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(10):
        db[COL_AI_ENGAGEMENT_RECOMMENDATION_RECORDS].insert_one(
            {
                "id": _id(),
                "recommendation_id": f"airec-{i}",
                "recommendation_type": ["INTERVENTION", "RECOGNITION", "WELLNESS"][i % 3],
                "target_scope": "Engineering",
                "recommendation_payload": {"actions": ["increase 1:1s"]},
                "score": round(0.55 + rnd.random() * 0.4, 3),
                "expected_impact": "MEDIUM",
                "generated_at": _iso(now - timedelta(days=i)),
                "source_type": "MOCK_AI",
                "is_mock": True,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(8):
        db[COL_AI_SENTIMENT_INTELLIGENCE_RECORDS].insert_one(
            {
                "id": _id(),
                "insight_id": f"ais-{i}",
                "summary": "Clustered themes: workload, clarity, recognition.",
                "clusters": {"workload": 12, "clarity": 7},
                "generated_at": _iso(now - timedelta(days=i)),
                "source_type": "MOCK_AI",
                "is_mock": True,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_EXPERIENCE_FORECAST_RECORDS].insert_one(
            {
                "id": _id(),
                "forecast_id": f"fc-{i}",
                "forecast_type": ["ENGAGEMENT", "ENPS", "BURNOUT"][i % 3],
                "forecast_period": f"FY{now.year}-Q{(i % 4) + 1}",
                "scope_dimension": "GLOBAL",
                "forecast_payload": {"point": round(0.65 + rnd.random() * 0.1, 3)},
                "confidence_score": round(0.55 + rnd.random() * 0.3, 3),
                "generated_on": _iso(now - timedelta(days=i)),
                "generated_at": _iso(now - timedelta(days=i)),
                "source_type": "MOCK_MODEL",
                "is_mock": True,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(6):
        db[COL_EXPERIENCE_SCENARIO_MODELS].insert_one(
            {
                "id": _id(),
                "scenario_id": f"scn-{i}",
                "scenario_name": ["Recognition expansion", "Manager coaching", "Flex policy"][i % 3],
                "scenario_type": ["REWARDS", "COACH", "POLICY"][i % 3],
                "input_payload": {"baseline_engagement_score": 0.72},
                "output_payload": {"delta": 0.04},
                "expected_impact": "POSITIVE",
                "created_by": "seed",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    db[COL_STRATEGIC_EXPERIENCE_INTELLIGENCE_SNAPSHOTS].insert_one(
        {
            "id": _id(),
            "strategic_snapshot_id": "strat-ese-1",
            "snapshot_date": now.date().isoformat(),
            "experience_health_index": 0.73,
            "belonging_inclusion_health_index": 0.7,
            "burnout_exposure_index": 0.31,
            "risk_map_payload": {"hotspots": ["Team B", "Remote cohort"]},
            "recommendation_payload": {"priorities": ["manager connect", "recognition"]},
            "created_at": _iso(now),
            "seed_marker": SEED_MARKER,
        }
    )

    db[COL_EXECUTIVE_EXPERIENCE_SUMMARY_SNAPSHOTS].insert_one(
        {
            "id": _id(),
            "executive_summary_id": "exec-ese-1",
            "snapshot_date": now.date().isoformat(),
            "summary_type": "CHRO_BOARD_PACK",
            "summary_payload": {
                "narrative": "Engagement stable; monitor burnout in delivery teams; recognition coverage improving.",
                "actions": ["Expand pulse to GIC", "Manager coaching pilot"],
            },
            "risk_index": 0.36,
            "opportunity_index": 0.66,
            "created_at": _iso(now),
            "seed_marker": SEED_MARKER,
        }
    )

    db[COL_POLICY_RULES].insert_one(
        {
            "id": _id(),
            "rule_name": "ESE demo policy",
            "description": "Anonymous pulses require minimum cell size",
            "payload": {"min_cell": 5},
            "active": True,
            "seed_marker": SEED_MARKER,
        }
    )

    print(f"ESE seed: inserted demo rows ({SEED_MARKER})")


if __name__ == "__main__":
    main()
