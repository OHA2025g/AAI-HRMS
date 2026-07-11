#!/usr/bin/env python3
"""
Seed High-Skill Talent Retention (M13) demo data.

Idempotent by marker doc; set HSR_SEED_FORCE=1 to wipe and re-seed.
"""

from __future__ import annotations

import asyncio
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from high_skill_retention.constants import (
    COL_ACTIVITY_LOGS,
    COL_AI_FLIGHT_RISK,
    COL_AI_RECOMMENDATIONS,
    COL_ATTRITION_PREDICTIONS,
    COL_CLIENT_CRITICAL,
    COL_COMP_COMPETITIVENESS,
    COL_CRITICAL_TALENT_PROFILES,
    COL_ENGAGEMENT_ACTION_PLANS,
    COL_ENGAGEMENT_SIGNALS,
    COL_EXIT_RISK_TRIGGERS,
    COL_KNOWLEDGE_DEPENDENCY,
    COL_PROJECT_CRITICAL,
    COL_PROMOTION_STAGNATION,
    COL_RELATIONSHIP_HISTORY,
    COL_RECOGNITION_RECORDS,
    COL_RETENTION_CASES,
    COL_RETENTION_INCENTIVES,
    COL_RISK_ASSESSMENTS,
    COL_SEARCH_LOGS,
    COL_STABILITY_FORECASTS,
    COL_STAY_INTERVIEWS,
    COL_TALENT_CRITICALITY_TAGS,
    COL_TALENT_SEGMENTS,
)

MARKER = "hsr_m13_seed_marker"
VERSION = 1
SEED_MARK = "hsr_m13_demo"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _risk_level(x: float) -> str:
    if x >= 0.85:
        return "CRITICAL"
    if x >= 0.65:
        return "HIGH"
    if x >= 0.40:
        return "MEDIUM"
    return "LOW"


async def main() -> int:
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("MONGO_DB", "aai_hrms")
    force = os.environ.get("HSR_SEED_FORCE", "").strip().lower() in ("1", "true", "yes")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    try:
        existing = await db[MARKER].find_one({"version": VERSION})
        if existing and not force:
            print("M13 seed already applied; set HSR_SEED_FORCE=1 to re-seed.")
            return 0

        if force:
            for col in [
                COL_CRITICAL_TALENT_PROFILES,
                COL_TALENT_CRITICALITY_TAGS,
                COL_TALENT_SEGMENTS,
                COL_RISK_ASSESSMENTS,
                COL_ATTRITION_PREDICTIONS,
                COL_ENGAGEMENT_SIGNALS,
                COL_STAY_INTERVIEWS,
                COL_RECOGNITION_RECORDS,
                COL_RELATIONSHIP_HISTORY,
                COL_COMP_COMPETITIVENESS,
                COL_RETENTION_INCENTIVES,
                COL_RETENTION_CASES,
                COL_ENGAGEMENT_ACTION_PLANS,
                COL_EXIT_RISK_TRIGGERS,
                COL_KNOWLEDGE_DEPENDENCY,
                COL_CLIENT_CRITICAL,
                COL_PROJECT_CRITICAL,
                COL_PROMOTION_STAGNATION,
                COL_STABILITY_FORECASTS,
                COL_AI_RECOMMENDATIONS,
                COL_AI_FLIGHT_RISK,
                COL_SEARCH_LOGS,
                COL_ACTIVITY_LOGS,
            ]:
                await db[col].delete_many({"seed_marker": SEED_MARK})
            await db[MARKER].delete_many({})

        employees = await db.employees.find({}, {"_id": 0, "id": 1, "employee_code": 1, "full_name": 1, "department": 1}).to_list(5000)
        if not employees:
            # fallback: fabricate a small employee set if base seed is absent
            employees = [{"id": f"E{i:03d}", "employee_code": f"E{i:03d}", "full_name": f"Employee {i}", "department": "Engineering"} for i in range(1, 81)]

        random.shuffle(employees)
        target_profiles = min(200, max(120, len(employees) // 2))
        emps = employees[:target_profiles]

        now = _now()
        now_iso = _iso(now)
        skills = [
            "GenAI", "LLMOps", "Data Engineering", "MLOps", "Cloud Security", "SAP HANA", "Mainframe", "Kubernetes",
            "Full Stack", "DevOps", "Platform Engineering", "Cybersecurity", "Enterprise Architecture",
        ]
        segments = ["CRITICAL_EXPERT", "SCARCE_SKILL", "HIGH_PERFORMER", "FUTURE_LEADER", "CLIENT_SPECIALIST", "HIGH_RISK"]
        tag_types = ["SKILL", "CLIENT_CRITICAL", "PROJECT_CRITICAL", "ROLE_CRITICAL", "LEADERSHIP"]
        trigger_types = ["PROMOTION_DELAY", "COMP_MISMATCH", "MOBILITY_BLOCK", "PEER_ATTRITION", "BURNOUT_SIGNAL"]

        profiles = []
        tags = []
        seg_rows = []
        risks = []
        preds = []
        engagement = []
        stays = []
        recog = []
        rel = []
        comp = []
        incent = []
        cases = []
        actions = []
        triggers = []
        knowledge = []
        client_crit = []
        project_crit = []
        stagn = []
        forecasts = []
        ai_recs = []
        ai_risk = []

        for i, e in enumerate(emps):
            emp_id = e.get("id") or e.get("employee_code") or f"E{i:03d}"
            dept = e.get("department") or random.choice(["Engineering", "Delivery", "Data", "Security", "Product"])
            bu = random.choice(["BU-Delivery", "BU-Platforms", "BU-Data", "BU-Security"])
            manager = random.choice(emps)["id"]
            primary = random.choice(skills)
            secondary = random.sample(skills, k=min(3, 1 + (i % 3)))
            depth = round(random.uniform(4.5, 9.8), 1)
            sensitivity = round(random.uniform(0.15, 0.95), 2)
            risk_level = _risk_level(sensitivity * 0.9 + (0.1 if i % 9 == 0 else 0))
            pid = str(uuid.uuid4())

            profiles.append(
                {
                    "id": pid,
                    "employee_id": emp_id,
                    "talent_code": f"TC-{i+1:04d}",
                    "business_unit": bu,
                    "department": dept,
                    "manager_id": manager,
                    "primary_skill": primary,
                    "secondary_skills": secondary,
                    "skill_depth_score": depth,
                    "certifications_summary": "AWS, Azure, Security+" if i % 4 == 0 else "K8s, Terraform",
                    "role_criticality": random.choice(["LOW", "MEDIUM", "HIGH"]),
                    "project_criticality": random.choice(["LOW", "MEDIUM", "HIGH"]),
                    "client_criticality": random.choice(["LOW", "MEDIUM", "HIGH"]),
                    "retention_sensitivity_index": sensitivity,
                    "current_risk_level": risk_level,
                    "successor_available_flag": i % 3 == 0,
                    "mobility_preference": random.choice(["ONSITE", "REMOTE", "HYBRID"]),
                    "work_preference": random.choice(["STABLE", "FAST_PACED", "RESEARCH", "CLIENT_FACING"]),
                    "notes": "Seeded high-skill profile.",
                    "created_by": "seed",
                    "updated_by": "seed",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "deleted_at": None,
                    "seed_marker": SEED_MARK,
                }
            )

            # tags + segments
            for t in random.sample(tag_types, k=2):
                tags.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "tag_type": t,
                        "tag_value": primary if t == "SKILL" else random.choice(["ACME BANK", "OMEGA TELCO", "NEBULA"]),
                        "reason": "Seeded criticality tag.",
                        "assigned_by": "seed",
                        "assigned_on": now_iso,
                        "active_flag": True,
                        "seed_marker": SEED_MARK,
                    }
                )

            for s in random.sample(segments, k=1 + (i % 2)):
                seg_rows.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "segment_type": s,
                        "priority_score": round(random.uniform(30, 98), 1),
                        "rule_source": "SEED",
                        "assigned_on": now_iso,
                        "active_flag": True,
                        "created_by": "seed",
                        "seed_marker": SEED_MARK,
                    }
                )

            # risk assessment
            overall = min(1.0, max(0.0, sensitivity + random.uniform(-0.15, 0.2)))
            risks.append(
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": emp_id,
                    "overall_risk_score": round(overall, 3),
                    "compensation_risk_score": round(random.uniform(0, 1), 3),
                    "workload_risk_score": round(random.uniform(0, 1), 3),
                    "manager_dependency_risk_score": round(random.uniform(0, 1), 3),
                    "growth_stagnation_risk_score": round(random.uniform(0, 1), 3),
                    "market_demand_risk_score": round(random.uniform(0, 1), 3),
                    "engagement_risk_score": round(random.uniform(0, 1), 3),
                    "mobility_block_risk_score": round(random.uniform(0, 1), 3),
                    "recognition_gap_risk_score": round(random.uniform(0, 1), 3),
                    "risk_level": _risk_level(overall),
                    "top_risk_factors": random.sample(
                        ["compensation_gap", "workload", "growth_stagnation", "manager_dependency", "market_demand", "engagement"],
                        k=3,
                    ),
                    "assessed_on": now_iso,
                    "source_type": "SEED_RULES",
                    "created_by": "seed",
                    "seed_marker": SEED_MARK,
                }
            )

            # prediction
            exit_prob = min(1.0, max(0.0, overall * 0.9 + random.uniform(-0.05, 0.12)))
            preds.append(
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": emp_id,
                    "exit_probability": round(exit_prob, 3),
                    "time_to_exit_prediction": random.choice(["30-60d", "60-90d", "90-180d", "180d+"] if exit_prob > 0.5 else ["180d+", "UNKNOWN"]),
                    "confidence_score": round(random.uniform(0.55, 0.92), 2),
                    "predicted_risk_level": _risk_level(exit_prob),
                    "prediction_factors": {"primary_skill": primary, "dept": dept, "work_mode": "HYBRID"},
                    "generated_at": now_iso,
                    "source_type": "MOCK_AI",
                    "is_mock": True,
                    "created_by": "seed",
                    "seed_marker": SEED_MARK,
                }
            )

            # engagement signals
            eng = round(random.uniform(0.35, 0.92), 2)
            burn = round(min(1.0, max(0.0, 1.0 - eng + random.uniform(-0.1, 0.2))), 2)
            engagement.append(
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": emp_id,
                    "source_type": "PULSE",
                    "engagement_score": eng,
                    "sentiment_score": round(random.uniform(0.2, 0.95), 2),
                    "burnout_score": burn,
                    "manager_influence_score": round(random.uniform(0.2, 0.95), 2),
                    "satisfaction_score": round(random.uniform(0.2, 0.95), 2),
                    "captured_on": now_iso,
                    "remarks": "Seeded engagement signal.",
                    "seed_marker": SEED_MARK,
                }
            )

            # stay interviews
            if i % 4 == 0:
                scheduled = now + timedelta(days=7 + (i % 11))
                conducted = scheduled + timedelta(days=1) if i % 8 == 0 else None
                stays.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "scheduled_on": _iso(scheduled),
                        "conducted_on": _iso(conducted) if conducted else None,
                        "interviewer_id": manager,
                        "questionnaire_template": "DEFAULT",
                        "key_concerns": random.sample(["growth", "compensation", "workload", "role_fit", "flexibility"], k=2),
                        "expectation_summary": "More growth opportunities and role clarity.",
                        "risk_flags": ["HIGH_RISK"] if risk_level in ("HIGH", "CRITICAL") else [],
                        "follow_up_actions": ["Career discussion", "Workload rebalance"],
                        "outcome_status": "CONDUCTED" if conducted else "PLANNED",
                        "notes": "Seeded stay interview.",
                        "created_by": "seed",
                        "created_at": now_iso,
                        "updated_at": now_iso,
                        "seed_marker": SEED_MARK,
                    }
                )

            # recognition
            if i % 3 == 0:
                recog.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "recognition_type": random.choice(["AWARD", "PEER", "MANAGER", "INNOVATION"]),
                        "title": f"Recognition — {primary}",
                        "points": 10 + (i % 5) * 5,
                        "awarded_on": _iso(now - timedelta(days=10 + i)),
                        "notes": "Seeded recognition.",
                        "seed_marker": SEED_MARK,
                    }
                )

            # relationship timeline (interaction log)
            rel.append(
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": emp_id,
                    "ts": _iso(now - timedelta(days=random.randint(1, 60))),
                    "event_type": random.choice(["MANAGER_1_1", "RETENTION_TOUCHPOINT", "MOBILITY_DISCUSSION", "FEEDBACK", "RECOGNITION"]),
                    "summary": "Seeded interaction.",
                    "seed_marker": SEED_MARK,
                }
            )

            # compensation competitiveness
            current = 12_00_000 + (i % 20) * 75_000
            market = int(current * random.uniform(1.02, 1.25))
            gap = market - current
            comp_risk = "HIGH" if gap > 250_000 else ("MEDIUM" if gap > 100_000 else "LOW")
            comp.append(
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": emp_id,
                    "current_compensation": current,
                    "market_benchmark": market,
                    "internal_equity_position": random.choice(["LOW", "MID", "HIGH"]),
                    "skill_premium_gap": gap,
                    "variable_pay_alignment": random.choice(["LOW", "MEDIUM", "HIGH"]),
                    "compensation_risk_level": comp_risk,
                    "recommendation": "Adjust base / premium for critical skill." if comp_risk != "LOW" else "Monitor",
                    "evaluated_on": now_iso,
                    "seed_marker": SEED_MARK,
                }
            )

            # incentives + cases + actions for higher risk
            if risk_level in ("HIGH", "CRITICAL") and i % 2 == 0:
                incent.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "incentive_type": random.choice(["RETENTION_BONUS", "SKILL_PREMIUM", "PROJECT_COMPLETION"]),
                        "proposed_amount": 150_000 + (i % 5) * 50_000,
                        "approved_amount": 0,
                        "business_reason": "Retention risk mitigation for client/project critical skill.",
                        "approval_status": "PENDING",
                        "expected_retention_impact": round(random.uniform(0.2, 0.7), 2),
                        "start_date": now_iso,
                        "end_date": _iso(now + timedelta(days=180)),
                        "seed_marker": SEED_MARK,
                    }
                )
                case_id = str(uuid.uuid4())
                cases.append(
                    {
                        "id": case_id,
                        "employee_id": emp_id,
                        "case_type": "RETENTION",
                        "risk_level": risk_level,
                        "owner_id": manager,
                        "status": "OPEN",
                        "escalation_level": "L1" if risk_level == "CRITICAL" else "L0",
                        "review_date": _iso(now + timedelta(days=14)),
                        "outcome": None,
                        "opened_on": now_iso,
                        "closed_on": None,
                        "notes": "Seeded case.",
                        "created_by": "seed",
                        "seed_marker": SEED_MARK,
                    }
                )
                actions.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "linked_case_id": case_id,
                        "action_type": "MANAGER_ACTION",
                        "action_title": "Career growth conversation + role enrichment",
                        "owner_id": manager,
                        "priority": "HIGH",
                        "due_date": _iso(now + timedelta(days=10)),
                        "status": "OPEN",
                        "effectiveness_score": None,
                        "created_by": "seed",
                        "created_at": now_iso,
                        "updated_at": now_iso,
                        "closed_on": None,
                        "seed_marker": SEED_MARK,
                    }
                )

            # triggers
            if i % 5 == 0:
                triggers.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "trigger_type": random.choice(trigger_types),
                        "trigger_value": random.choice(["2 missed cycles", "gap>15%", "3 escalations", "overallocated"]),
                        "severity": random.choice(["MEDIUM", "HIGH", "CRITICAL"]),
                        "detected_on": _iso(now - timedelta(days=random.randint(0, 14))),
                        "resolved_flag": False,
                        "resolution_notes": None,
                        "seed_marker": SEED_MARK,
                    }
                )

            # knowledge dependency
            if i % 6 == 0:
                knowledge.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "dependency_type": random.choice(["CLIENT", "SYSTEM", "PROCESS"]),
                        "concentration_score": round(random.uniform(0.4, 0.98), 2),
                        "documentation_gap_flag": True if i % 12 == 0 else False,
                        "client_dependency_flag": True if i % 3 == 0 else False,
                        "system_dependency_flag": True if i % 9 == 0 else False,
                        "mitigation_plan": "Plan KT + documentation sprint.",
                        "assessed_on": now_iso,
                        "seed_marker": SEED_MARK,
                    }
                )

            # client/project critical maps (counts on dashboard)
            if i % 7 == 0:
                client_crit.append({"id": str(uuid.uuid4()), "employee_id": emp_id, "client": "ACME BANK", "risk_index": sensitivity, "seed_marker": SEED_MARK})
            if i % 9 == 0:
                project_crit.append({"id": str(uuid.uuid4()), "employee_id": emp_id, "project": "Project Orion", "risk_index": sensitivity, "seed_marker": SEED_MARK})

            # promotion stagnation
            if i % 8 == 0:
                stagn.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "time_in_role_months": 12 + (i % 36),
                        "stagnation_index": round(random.uniform(0.1, 0.95), 2),
                        "captured_on": now_iso,
                        "seed_marker": SEED_MARK,
                    }
                )

            # forecasts (department-level)
            if i < 12:
                forecasts.append(
                    {
                        "id": str(uuid.uuid4()),
                        "forecast_type": "DEPARTMENT_STABILITY",
                        "department_id": dept,
                        "forecast_period": "2026-Q3",
                        "forecast_payload": {"risk_employees": random.randint(4, 18), "expected_attrition": round(random.uniform(0.01, 0.08), 3)},
                        "stability_index": round(random.uniform(0.55, 0.92), 2),
                        "generated_on": now_iso,
                        "source_type": "MOCK",
                        "is_mock": True,
                        "seed_marker": SEED_MARK,
                    }
                )

            # AI recs + flight risk (employee-level)
            if i % 2 == 0:
                ai_recs.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "recommendation_type": random.choice(["COMP_ADJUST", "MOBILITY", "LEARNING", "MANAGER_ACTION"]),
                        "recommendation_payload": {"primary_skill": primary, "actions": ["adjust premium", "offer mobility", "assign mentor"]},
                        "score": round(random.uniform(0.35, 0.98), 2),
                        "expected_impact": round(random.uniform(0.1, 0.6), 2),
                        "generated_at": now_iso,
                        "source_type": "MOCK_AI",
                        "is_mock": True,
                        "seed_marker": SEED_MARK,
                    }
                )
                ai_risk.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_id,
                        "flight_risk_score": round(exit_prob, 3),
                        "time_to_exit_prediction": random.choice(["30-60d", "60-90d", "90-180d", "180d+"]),
                        "explanation_payload": {"top_factors": ["compensation_gap", "growth_gap", "workload"]},
                        "severity": _risk_level(exit_prob),
                        "generated_at": now_iso,
                        "source_type": "MOCK_AI",
                        "is_mock": True,
                        "seed_marker": SEED_MARK,
                    }
                )

        await db[COL_CRITICAL_TALENT_PROFILES].insert_many(profiles)
        await db[COL_TALENT_CRITICALITY_TAGS].insert_many(tags)
        await db[COL_TALENT_SEGMENTS].insert_many(seg_rows)
        await db[COL_RISK_ASSESSMENTS].insert_many(risks)
        await db[COL_ATTRITION_PREDICTIONS].insert_many(preds)
        await db[COL_ENGAGEMENT_SIGNALS].insert_many(engagement)
        if stays:
            await db[COL_STAY_INTERVIEWS].insert_many(stays)
        if recog:
            await db[COL_RECOGNITION_RECORDS].insert_many(recog)
        await db[COL_RELATIONSHIP_HISTORY].insert_many(rel)
        await db[COL_COMP_COMPETITIVENESS].insert_many(comp)
        if incent:
            await db[COL_RETENTION_INCENTIVES].insert_many(incent)
        if cases:
            await db[COL_RETENTION_CASES].insert_many(cases)
        if actions:
            await db[COL_ENGAGEMENT_ACTION_PLANS].insert_many(actions)
        if triggers:
            await db[COL_EXIT_RISK_TRIGGERS].insert_many(triggers)
        if knowledge:
            await db[COL_KNOWLEDGE_DEPENDENCY].insert_many(knowledge)
        if client_crit:
            await db[COL_CLIENT_CRITICAL].insert_many(client_crit)
        if project_crit:
            await db[COL_PROJECT_CRITICAL].insert_many(project_crit)
        if stagn:
            await db[COL_PROMOTION_STAGNATION].insert_many(stagn)
        if forecasts:
            await db[COL_STABILITY_FORECASTS].insert_many(forecasts)
        if ai_recs:
            await db[COL_AI_RECOMMENDATIONS].insert_many(ai_recs)
        if ai_risk:
            await db[COL_AI_FLIGHT_RISK].insert_many(ai_risk)

        await db[MARKER].insert_one(
            {
                "version": VERSION,
                "seeded_at": now_iso,
                "profiles": len(profiles),
                "note": "M13 High-Skill Talent Retention demo data",
            }
        )
        print(f"M13 retention seed OK ({len(profiles)} critical talent profiles).")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

