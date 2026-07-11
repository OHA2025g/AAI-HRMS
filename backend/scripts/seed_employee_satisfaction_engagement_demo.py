#!/usr/bin/env python3
"""
Seed Employee Satisfaction & Engagement (M17) demo data.

Env:
  ESE_SEED_FORCE=1   delete ESE_M17_DEMO rows then re-seed
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from pymongo import MongoClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from employee_satisfaction.constants import (  # noqa: E402
    COL_ACTION_PLANS,
    COL_AI_RECOMMENDATIONS,
    COL_ANALYTICS_SNAPSHOTS,
    COL_ATTRITION_LINKED,
    COL_BURNOUT_RISK,
    COL_COMM_CAMPAIGNS,
    COL_COMMUNITY,
    COL_CULTURE_PROGRAMS,
    COL_DASHBOARD_SNAPSHOTS,
    COL_DECLINE_PRED,
    COL_DRIVER_ANALYSIS,
    COL_EXECUTIVE_SUMMARY,
    COL_EXPERIENCE,
    COL_EXP_GAP,
    COL_FEEDBACK,
    COL_FORECASTS,
    COL_GOVERNANCE,
    COL_GRIEVANCE_VISIBILITY,
    COL_INCLUSION,
    COL_MANAGER_CONNECT,
    COL_MANAGER_EFFECTIVENESS,
    COL_MANAGER_INTERVENTIONS,
    COL_PULSE_CAMPAIGNS,
    COL_RECOGNITION_PROGRAMS,
    COL_RECOGNITION_VISIBILITY,
    COL_SCENARIOS,
    COL_SELF_SERVICE_EXP,
    COL_SENTIMENT,
    COL_STRATEGIC_INTEL,
    COL_TEAM_CLIMATE,
    COL_WELLBEING,
    COL_WELLBEING_PROGRAMS,
    COL_WORKLOAD_FLEX,
    LIST_SEGMENT_COLLECTION,
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
    db_name = os.environ.get("DB_NAME", os.environ.get("MONGO_DB", "aai_hrms"))
    client = MongoClient(url, serverSelectionTimeoutMS=8000)
    db = client[db_name]

    force = os.environ.get("ESE_SEED_FORCE", "").strip().lower() in ("1", "true", "yes")
    if force:
        for col in set(LIST_SEGMENT_COLLECTION.values()) | {
            COL_DASHBOARD_SNAPSHOTS,
            COL_ACTION_PLANS,
        }:
            try:
                db[col].delete_many({"seed_marker": SEED_MARKER})
            except Exception:
                pass

    # Dashboard snapshots — last 6 months
    if db[COL_DASHBOARD_SNAPSHOTS].count_documents({"seed_marker": SEED_MARKER}) == 0:
        base = _now()
        for i in range(6):
            d = base - timedelta(days=30 * i)
            db[COL_DASHBOARD_SNAPSHOTS].insert_one(
                {
                    "id": _id(),
                    "seed_marker": SEED_MARKER,
                    "snapshot_id": _id(),
                    "snapshot_date": d.date().isoformat(),
                    "overall_engagement_score": 72.0 + (i % 3),
                    "satisfaction_index": 78.0 - i * 0.5,
                    "enps_score": 24.0 + i,
                    "pulse_participation_rate": 62.0 + i,
                    "burnout_signal_score": 18.0 + (i % 4),
                    "recognition_coverage_percent": 55.0,
                    "manager_connect_coverage_percent": 48.0 + i,
                    "team_climate_score": 70.0,
                    "experience_risk_alert_count": 3 + (i % 2),
                    "executive_kpi_payload": {"headline": "Experience health stable", "focus": ["manager connect", "inclusion"]},
                    "created_at": _iso(d),
                }
            )

    def ensure_samples(col: str, factory, n: int = 3):
        if db[col].count_documents({"seed_marker": SEED_MARKER}) >= n:
            return
        for i in range(n):
            db[col].insert_one(factory(i))

    ensure_samples(
        COL_FEEDBACK,
        lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "employee_id": f"EMP{i + 1:04d}",
            "feedback_type": "open",
            "source_channel": "web",
            "category": ["policy", "manager", "workload"][i % 3],
            "feedback_text": "Seeded feedback for demo dashboards.",
            "severity": ["low", "medium", "high"][i % 3],
            "department": ["ENG", "HR", "SALES"][i % 3],
            "manager_id": f"MGR{i % 2 + 1}",
            "submitted_on": _iso(_now()),
            "status": "open",
            "created_at": _iso(_now()),
        },
    )

    ensure_samples(
        COL_PULSE_CAMPAIGNS,
        lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "campaign_id": _id(),
            "campaign_name": f"Q{(i % 4) + 1} Pulse {2024 + i // 4}",
            "template_id": "tpl-demo",
            "survey_type": "pulse",
            "target_scope": "GLOBAL",
            "anonymous_flag": True,
            "recurring_flag": i % 2 == 0,
            "launch_date": _iso(_now() - timedelta(days=14 + i)),
            "close_date": _iso(_now() + timedelta(days=7)),
            "participation_rate": 50.0 + i * 5,
            "status": "active",
            "created_by": "seed",
            "created_at": _iso(_now()),
        },
    )

    ensure_samples(
        COL_SENTIMENT,
        lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "sentiment_id": _id(),
            "source_record_type": "feedback",
            "source_record_id": _id(),
            "sentiment_score": 0.2 + i * 0.1,
            "sentiment_label": ["positive", "neutral", "negative"][i % 3],
            "emotion_signal": "hopeful",
            "theme_payload": {"themes": ["communication", "growth"]},
            "analyzed_on": _iso(_now()),
            "source_type": "m6_heuristic",
            "is_mock": True,
            "created_at": _iso(_now()),
        },
    )

    ensure_samples(
        COL_BURNOUT_RISK,
        lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "burnout_prediction_id": _id(),
            "employee_id_or_group": f"TEAM-{i + 1}",
            "burnout_risk_score": 0.35 + i * 0.05,
            "severity": ["low", "medium", "high"][i % 3],
            "risk_factors_payload": {"load": 0.7, "autonomy": 0.4},
            "generated_at": _iso(_now()),
            "source_type": "heuristic",
            "is_mock": True,
        },
    )

    ensure_samples(
        COL_AI_RECOMMENDATIONS,
        lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "recommendation_id": _id(),
            "recommendation_type": ["recognition", "wellness", "connect"][i % 3],
            "target_scope": "ENG",
            "recommendation_payload": {"actions": ["1:1 cadence", "spot bonus"]},
            "score": 0.82,
            "expected_impact": "medium",
            "generated_at": _iso(_now()),
            "source_type": "mock",
            "is_mock": True,
        },
    )

    ensure_samples(
        COL_EXECUTIVE_SUMMARY,
        lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "executive_summary_id": _id(),
            "snapshot_date": (_now() - timedelta(days=7 * i)).date().isoformat(),
            "summary_type": "CHRO_EXPERIENCE_SUMMARY",
            "summary_payload": {"narrative": "Engagement steady; watch burnout in delivery."},
            "risk_index": 22 + i,
            "opportunity_index": 41,
            "created_at": _iso(_now()),
        },
    )

    ensure_samples(
        COL_ACTION_PLANS,
        lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "action_plan_id": _id(),
            "scope_type": "department",
            "scope_id": ["ENG", "HR", "FIN"][i % 3],
            "action_title": f"Improve connect coverage {i + 1}",
            "action_type": "intervention",
            "owner_id": f"owner-{i + 1}",
            "priority": "P1",
            "due_date": (_now() + timedelta(days=30)).date().isoformat(),
            "status": "open",
            "effectiveness_score": None,
            "closed_on": None,
            "created_at": _iso(_now()),
        },
    )

    # Fill remaining list collections with minimal rows so tables are non-empty
    minimal_factories = {
        COL_EXPERIENCE: lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "experience_record_id": _id(),
            "employee_id": f"E{i}",
            "experience_dimension": "managerial",
            "score": 4 + (i % 2),
            "comments": "Seeded",
            "captured_on": _iso(_now()),
            "department": "ENG",
            "manager_id": "M1",
            "work_mode": "hybrid",
            "created_at": _iso(_now()),
        },
        COL_TEAM_CLIMATE: lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "climate_id": _id(),
            "team_id_or_department": f"DEPT-{i}",
            "snapshot_date": _now().date().isoformat(),
            "climate_score": 68 + i,
            "collaboration_score": 72,
            "trust_score": 70,
            "psychological_safety_score": 65,
            "conflict_signal_score": 12,
            "support_score": 74,
            "created_at": _iso(_now()),
        },
        COL_RECOGNITION_VISIBILITY: lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "recognition_visibility_id": _id(),
            "employee_id_or_team_scope": f"EMP-{i}",
            "period": "2026-Q2",
            "recognition_count": 2 + i,
            "recognition_type_mix": {"peer": 1, "manager": 2},
            "manager_recognition_flag": True,
            "peer_recognition_flag": True,
            "coverage_score": 0.71,
            "created_at": _iso(_now()),
        },
        COL_MANAGER_CONNECT: lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "connect_id": _id(),
            "employee_id": f"E{i}",
            "manager_id": "M1",
            "checkin_date": _iso(_now()),
            "interaction_type": "1:1",
            "interaction_quality_score": 4,
            "career_discussion_flag": True,
            "feedback_discussion_flag": True,
            "followup_required_flag": i % 2 == 0,
            "remarks": "Seeded",
            "created_at": _iso(_now()),
        },
        COL_WELLBEING: lambda i: {
            "id": _id(),
            "seed_marker": SEED_MARKER,
            "wellbeing_id": _id(),
            "employee_id": f"E{i}",
            "period": "2026-04",
            "wellbeing_score": 72,
            "burnout_score": 22 + i,
            "workload_stress_score": 35,
            "worklife_balance_score": 68,
            "overtime_signal": "elevated" if i == 2 else "normal",
            "leave_deprivation_flag": False,
            "support_uptake_flag": True,
            "created_at": _iso(_now()),
        },
    }

    for col, factory in minimal_factories.items():
        ensure_samples(col, factory, 3)

    filled = {
        COL_DASHBOARD_SNAPSHOTS,
        COL_FEEDBACK,
        COL_PULSE_CAMPAIGNS,
        COL_SENTIMENT,
        COL_BURNOUT_RISK,
        COL_AI_RECOMMENDATIONS,
        COL_EXECUTIVE_SUMMARY,
        COL_ACTION_PLANS,
        *minimal_factories.keys(),
    }
    for col in sorted(set(LIST_SEGMENT_COLLECTION.values()) - filled):
        if db[col].count_documents({"seed_marker": SEED_MARKER}) > 0:
            continue
        for i in range(2):
            db[col].insert_one(
                {
                    "id": _id(),
                    "seed_marker": SEED_MARKER,
                    "title": f"Demo record {i + 1}",
                    "status": "active",
                    "created_at": _iso(_now()),
                }
            )

    print(f"ESE M17 seed complete ({SEED_MARKER}) on {db_name}")


if __name__ == "__main__":
    main()
