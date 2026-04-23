#!/usr/bin/env python3
"""
Seed Cost Optimization & Automation (M16) demo data for first-boot richness.

Env:
  COA_SEED_FORCE=1   delete COA demo rows then re-seed
"""

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

from m16_cost_optimization_automation.constants import (  # noqa: E402
    COL_ACTIVITY_LOGS,
    COL_AI_COST_RECOMMENDATION_RECORDS,
    COL_AI_PRODUCTIVITY_RECOMMENDATION_RECORDS,
    COL_ALLOCATION_AUTOMATION_RECORDS,
    COL_AUTOMATION_EXECUTION_LOGS,
    COL_AUTOMATION_GOVERNANCE_RECORDS,
    COL_AUTOMATION_OPPORTUNITY_RECORDS,
    COL_AUTOMATION_ROI_RECORDS,
    COL_AUTOMATION_RULE_CONFIGS,
    COL_AUTOMATION_WORKFLOW_CONFIGS,
    COL_BUDGET_SPEND_RECORDS,
    COL_COMPLIANCE_AUTOMATION_RECORDS,
    COL_COMPLIANCE_PENALTY_COST_RECORDS,
    COL_CONTINUOUS_IMPROVEMENT_RECORDS,
    COL_COST_BENCHMARK_RECORDS,
    COL_COST_DASHBOARD_SNAPSHOTS,
    COL_COST_DRIVER_ANALYSIS_RECORDS,
    COL_COST_FORECAST_RECORDS,
    COL_COST_OVERRUN_PREDICTION_RECORDS,
    COL_COST_SCENARIO_MODELS,
    COL_EFFICIENCY_RISK_PREDICTION_RECORDS,
    COL_EXECUTIVE_COST_SUMMARY_SNAPSHOTS,
    COL_HR_OPERATIONS_COST_RECORDS,
    COL_LIFECYCLE_AUTOMATION_RECORDS,
    COL_MANUAL_EFFORT_RECORDS,
    COL_PAYROLL_AUTOMATION_RECORDS,
    COL_PERFORMANCE_ENGAGEMENT_AUTOMATION_RECORDS,
    COL_POLICY_EXCEPTION_LEAKAGE_RECORDS,
    COL_POLICY_RULES,
    COL_PROCESS_COST_RECORDS,
    COL_PROCESS_REENGINEERING_RECORDS,
    COL_PRODUCTIVITY_EFFICIENCY_RECORDS,
    COL_RECRUITMENT_AUTOMATION_RECORDS,
    COL_SAVINGS_OPPORTUNITY_RECORDS,
    COL_SELF_SERVICE_OPTIMIZATION_RECORDS,
    COL_STRATEGIC_COST_INTELLIGENCE_SNAPSHOTS,
    COL_SUPPORT_AUTOMATION_RECORDS,
    COL_TOOL_COST_VISIBILITY_RECORDS,
    COL_TRAINING_AUTOMATION_RECORDS,
    COL_VENDOR_COST_RECORDS,
    COL_WORKFORCE_COST_RECORDS,
)

SEED_MARKER = "COA_M16_DEMO"


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


def _doc_id() -> str:
    return str(uuid.uuid4())


def main() -> None:
    _load_env()
    url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("MONGO_DB", "hrms")
    client = MongoClient(url, serverSelectionTimeoutMS=8000)
    db = client[db_name]

    force = os.environ.get("COA_SEED_FORCE", "").strip().lower() in ("1", "true", "yes")
    if force:
        for col in COL_POLICY_RULES, COL_ACTIVITY_LOGS:
            db[col].delete_many({"seed_marker": SEED_MARKER})
        for name in (
            COL_COST_DASHBOARD_SNAPSHOTS,
            COL_WORKFORCE_COST_RECORDS,
            COL_HR_OPERATIONS_COST_RECORDS,
            COL_BUDGET_SPEND_RECORDS,
            COL_VENDOR_COST_RECORDS,
            COL_PROCESS_COST_RECORDS,
            COL_MANUAL_EFFORT_RECORDS,
            COL_PRODUCTIVITY_EFFICIENCY_RECORDS,
            COL_COMPLIANCE_PENALTY_COST_RECORDS,
            COL_TOOL_COST_VISIBILITY_RECORDS,
            COL_POLICY_EXCEPTION_LEAKAGE_RECORDS,
            COL_COST_BENCHMARK_RECORDS,
            COL_AUTOMATION_OPPORTUNITY_RECORDS,
            COL_AUTOMATION_WORKFLOW_CONFIGS,
            COL_AUTOMATION_RULE_CONFIGS,
            COL_AUTOMATION_EXECUTION_LOGS,
            COL_SELF_SERVICE_OPTIMIZATION_RECORDS,
            COL_RECRUITMENT_AUTOMATION_RECORDS,
            COL_LIFECYCLE_AUTOMATION_RECORDS,
            COL_PAYROLL_AUTOMATION_RECORDS,
            COL_TRAINING_AUTOMATION_RECORDS,
            COL_SUPPORT_AUTOMATION_RECORDS,
            COL_COMPLIANCE_AUTOMATION_RECORDS,
            COL_ALLOCATION_AUTOMATION_RECORDS,
            COL_PERFORMANCE_ENGAGEMENT_AUTOMATION_RECORDS,
            COL_PROCESS_REENGINEERING_RECORDS,
            COL_AUTOMATION_ROI_RECORDS,
            COL_AUTOMATION_GOVERNANCE_RECORDS,
            COL_COST_FORECAST_RECORDS,
            COL_COST_DRIVER_ANALYSIS_RECORDS,
            COL_SAVINGS_OPPORTUNITY_RECORDS,
            COL_AI_COST_RECOMMENDATION_RECORDS,
            COL_AI_PRODUCTIVITY_RECOMMENDATION_RECORDS,
            COL_COST_OVERRUN_PREDICTION_RECORDS,
            COL_EFFICIENCY_RISK_PREDICTION_RECORDS,
            COL_COST_SCENARIO_MODELS,
            COL_STRATEGIC_COST_INTELLIGENCE_SNAPSHOTS,
            COL_EXECUTIVE_COST_SUMMARY_SNAPSHOTS,
            COL_CONTINUOUS_IMPROVEMENT_RECORDS,
        ):
            db[name].delete_many({"seed_marker": SEED_MARKER})

    if db[COL_COST_DASHBOARD_SNAPSHOTS].count_documents({"seed_marker": SEED_MARKER}) > 0 and not force:
        print("COA seed: already present (set COA_SEED_FORCE=1 to refresh)")
        return

    rnd = Random(42)
    now = _now()
    bus = ["Digital", "Enterprise", "Cloud", "BFSI"]

    # Dashboard snapshots (6 months)
    for i in range(6):
        dt = now - timedelta(days=30 * i)
        db[COL_COST_DASHBOARD_SNAPSHOTS].insert_one(
            {
                "id": _doc_id(),
                "snapshot_id": f"coa-dash-{i}",
                "snapshot_date": dt.date().isoformat(),
                "total_hr_cost": 12.4e6 + rnd.uniform(-0.3e6, 0.4e6),
                "total_workforce_cost": 10.1e6 + rnd.uniform(-0.2e6, 0.3e6),
                "fixed_cost": 6.2e6,
                "variable_cost": 5.9e6 + rnd.uniform(-0.1e6, 0.2e6),
                "budget_total": 12.0e6,
                "actual_spend_total": 11.7e6 + rnd.uniform(-0.2e6, 0.2e6),
                "cost_variance_percent": rnd.uniform(-4, 6),
                "automation_savings_total": 420000 + i * 12000,
                "cost_leakage_alert_count": rnd.randint(2, 9),
                "executive_kpi_payload": {"efficiency_index": 0.72 + rnd.random() * 0.05},
                "created_at": _iso(dt),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(24):
        db[COL_WORKFORCE_COST_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "record_id": f"wfc-{i}",
                "snapshot_date": (now - timedelta(days=i * 3)).date().isoformat(),
                "business_unit": bus[i % 4],
                "department": ["Engineering", "HR", "Sales", "GIC"][i % 4],
                "geography": ["IN", "US", "EU", "APAC"][i % 4],
                "salary_cost": 800000 + rnd.randint(0, 120000),
                "benefits_cost": 120000 + rnd.randint(0, 40000),
                "bonus_cost": 40000 + rnd.randint(0, 20000),
                "overtime_cost": rnd.randint(5000, 35000),
                "bench_cost": rnd.randint(20000, 90000),
                "contract_workforce_cost": rnd.randint(10000, 80000),
                "consultant_cost": rnd.randint(5000, 45000),
                "cost_per_employee": rnd.uniform(82, 118),
                "cost_per_skill_pool": rnd.uniform(70, 130),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    proc_types = ["RECRUITMENT", "ONBOARDING", "TRAINING", "PAYROLL", "COMPLIANCE", "HELPDESK", "EXIT", "BGV", "HR_ADMIN"]
    for i in range(18):
        db[COL_HR_OPERATIONS_COST_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "operation_cost_id": f"hop-{i}",
                "snapshot_date": (now - timedelta(days=i * 5)).date().isoformat(),
                "process_type": proc_types[i % len(proc_types)],
                "department": ["HR", "TA", "Payroll"][i % 3],
                "total_cost": 20000 + rnd.randint(0, 80000),
                "cost_per_transaction": rnd.uniform(12, 180),
                "transaction_count": rnd.randint(20, 800),
                "vendor_component_cost": rnd.randint(2000, 25000),
                "internal_effort_cost": rnd.randint(5000, 40000),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(20):
        b = 500000 + rnd.randint(0, 400000)
        a = b * rnd.uniform(0.88, 1.08)
        var = a - b
        db[COL_BUDGET_SPEND_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "budget_record_id": f"bud-{i}",
                "fiscal_period": f"FY{(now.year + (i // 12)) % 100}-Q{(i % 4) + 1}",
                "business_unit": bus[i % 4],
                "department": ["Engineering", "HR", "Sales"][i % 3],
                "cost_center": f"CC-{1000 + i}",
                "budget_amount": round(b, 2),
                "actual_spend": round(a, 2),
                "variance_amount": round(var, 2),
                "variance_percent": round(100 * var / b, 2) if b else 0,
                "overspend_flag": var > 0 and abs(var) > 15000,
                "approval_status": ["PENDING", "APPROVED", "ESCALATED"][i % 3],
                "updated_at": _iso(now),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    vendors = ["Vendor ATS", "LMS Cloud", "BGV Pro", "Payroll Outsourcer", "Compliance Co"]
    for i in range(16):
        db[COL_VENDOR_COST_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "vendor_cost_id": f"ven-{i}",
                "vendor_name": vendors[i % len(vendors)] + f" {i // 5}",
                "vendor_category": ["RECRUITMENT", "TRAINING", "BGV", "PAYROLL", "TECH"][i % 5],
                "contract_period": "FY26",
                "invoice_amount": 40000 + rnd.randint(0, 200000),
                "sla_score": round(rnd.uniform(0.75, 0.99), 2),
                "renewal_due_date": (now + timedelta(days=30 + i * 10)).date().isoformat(),
                "benchmark_position": ["AT_MARKET", "ABOVE", "BELOW"][i % 3],
                "cost_risk_flag": i % 7 == 0,
                "updated_at": _iso(now),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    pnames = ["Hire cycle", "Payroll run", "Ticket resolve", "Training delivery", "Exit case"]
    for i in range(14):
        db[COL_PROCESS_COST_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "process_cost_id": f"pc-{i}",
                "process_name": pnames[i % len(pnames)],
                "period": (now - timedelta(days=14 * i)).strftime("%Y-%m"),
                "transaction_count": rnd.randint(10, 500),
                "total_cost": 10000 + rnd.randint(0, 90000),
                "cost_per_transaction": rnd.uniform(8, 220),
                "average_cycle_time": rnd.uniform(0.5, 14),
                "benchmark_cost": 50000,
                "variance_percent": rnd.uniform(-15, 18),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_MANUAL_EFFORT_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "effort_record_id": f"me-{i}",
                "process_name": pnames[i % len(pnames)],
                "department": ["HR", "TA", "Payroll"][i % 3],
                "period": (now - timedelta(days=7 * i)).strftime("%Y-%m"),
                "manual_hours": rnd.uniform(40, 400),
                "repetitive_task_hours": rnd.uniform(10, 120),
                "rework_hours": rnd.uniform(2, 40),
                "exception_handling_hours": rnd.uniform(5, 80),
                "admin_overhead_cost": rnd.randint(5000, 45000),
                "delay_cost": rnd.randint(1000, 25000),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_PRODUCTIVITY_EFFICIENCY_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "productivity_record_id": f"pe-{i}",
                "process_name": pnames[i % len(pnames)],
                "department": ["HR", "TA", "Payroll"][i % 3],
                "period": (now - timedelta(days=7 * i)).strftime("%Y-%m"),
                "turnaround_time": rnd.uniform(0.5, 10),
                "sla_adherence_percent": rnd.uniform(82, 99),
                "effort_output_ratio": rnd.uniform(0.6, 1.1),
                "productivity_score": rnd.uniform(0.55, 0.92),
                "inefficiency_flag": i % 5 == 0,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(10):
        db[COL_COMPLIANCE_PENALTY_COST_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "penalty_id": f"cp-{i}",
                "category": ["LATE_FILING", "POLICY", "AUDIT", "DOCS"][i % 4],
                "amount": rnd.randint(2000, 85000),
                "period": (now - timedelta(days=20 * i)).strftime("%Y-%m"),
                "department": "HR",
                "status": ["OPEN", "MITIGATED"][i % 2],
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_TOOL_COST_VISIBILITY_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "tool_name": ["HRMS", "ATS", "LMS", "Payroll", "ITSM"][i % 5],
                "license_cost_annual": 20000 + rnd.randint(0, 180000),
                "utilization_percent": rnd.uniform(0.35, 0.95),
                "per_user_cost": rnd.uniform(120, 480),
                "renewal_alert": i % 4 == 0,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(14):
        db[COL_POLICY_EXCEPTION_LEAKAGE_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "exception_id": f"pl-{i}",
                "exception_type": ["OVERRIDE", "DUPLICATE", "UNAPPROVED"][i % 3],
                "estimated_leakage": rnd.randint(2000, 120000),
                "severity": ["LOW", "MEDIUM", "HIGH", "CRITICAL"][i % 4],
                "period": (now - timedelta(days=5 * i)).strftime("%Y-%m"),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(10):
        db[COL_COST_BENCHMARK_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "benchmark_id": f"bm-{i}",
                "dimension": ["BU", "DEPT", "GEO", "PROCESS"][i % 4],
                "label": f"Scope-{i}",
                "cost_per_employee": rnd.uniform(75, 130),
                "variance_vs_peer": rnd.uniform(-12, 15),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_AUTOMATION_OPPORTUNITY_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "opportunity_id": f"ao-{i}",
                "process_name": pnames[i % len(pnames)],
                "department": ["HR", "TA"][i % 2],
                "opportunity_type": ["RULE", "BOT", "WORKFLOW"][i % 3],
                "current_manual_effort_hours": rnd.uniform(80, 600),
                "estimated_automation_savings": rnd.randint(10000, 220000),
                "priority_score": rnd.uniform(0.4, 0.95),
                "complexity_score": rnd.uniform(0.2, 0.9),
                "status": ["IDEA", "PIPELINE", "LIVE"][i % 3],
                "owner_id": "seed",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(10):
        db[COL_AUTOMATION_WORKFLOW_CONFIGS].insert_one(
            {
                "id": _doc_id(),
                "workflow_config_id": f"wf-{i}",
                "automation_name": f"Auto flow {i}",
                "workflow_type": ["JOINING", "EXIT", "PAYROLL_INPUT"][i % 3],
                "trigger_event": "STATUS_CHANGE",
                "condition_payload": {"field": "country", "op": "eq", "value": "IN"},
                "action_payload": {"notify": ["hr_ops"], "task": "CREATE_TICKET"},
                "active_flag": True,
                "owner_id": "seed",
                "approval_status": "APPROVED",
                "updated_at": _iso(now),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(8):
        db[COL_AUTOMATION_RULE_CONFIGS].insert_one(
            {
                "id": _doc_id(),
                "rule_config_id": f"rule-{i}",
                "rule_name": f"HR rule {i}",
                "category": ["LEAVE", "ATTENDANCE", "DOCS"][i % 3],
                "condition_payload": {"hours_gt": 48},
                "action_payload": {"route": "manager"},
                "active_flag": True,
                "updated_at": _iso(now),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(15):
        db[COL_AUTOMATION_EXECUTION_LOGS].insert_one(
            {
                "id": _doc_id(),
                "execution_id": f"ex-{i}",
                "automation_name": f"Auto flow {i % 5}",
                "executed_on": _iso(now - timedelta(hours=i)),
                "execution_status": ["SUCCESS", "PARTIAL", "FAILED"][i % 3],
                "records_processed": rnd.randint(5, 500),
                "success_count": rnd.randint(4, 480),
                "failure_count": rnd.randint(0, 12),
                "savings_estimate": rnd.randint(200, 9000),
                "exception_payload": {} if i % 5 else {"error": "timeout"},
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    def _automation_block(col: str, prefix: str, name_fn) -> None:
        for i in range(6):
            db[col].insert_one(
                {
                    "id": _doc_id(),
                    f"{prefix}_id": f"{prefix}-{i}",
                    "name": name_fn(i),
                    "status": ["ACTIVE", "PILOT", "PLANNED"][i % 3],
                    "coverage_percent": rnd.uniform(0.2, 0.95),
                    "created_at": _iso(now),
                    "seed_marker": SEED_MARKER,
                }
            )

    _automation_block(COL_SELF_SERVICE_OPTIMIZATION_RECORDS, "sso", lambda i: f"ESS opt {i}")
    _automation_block(COL_RECRUITMENT_AUTOMATION_RECORDS, "ra", lambda i: f"Recruit auto {i}")
    _automation_block(COL_LIFECYCLE_AUTOMATION_RECORDS, "la", lambda i: f"Lifecycle auto {i}")
    _automation_block(COL_PAYROLL_AUTOMATION_RECORDS, "pa", lambda i: f"Payroll auto {i}")
    _automation_block(COL_TRAINING_AUTOMATION_RECORDS, "ta", lambda i: f"Training auto {i}")
    _automation_block(COL_SUPPORT_AUTOMATION_RECORDS, "sa", lambda i: f"Helpdesk auto {i}")
    _automation_block(COL_COMPLIANCE_AUTOMATION_RECORDS, "ca", lambda i: f"Doc compliance {i}")
    _automation_block(COL_ALLOCATION_AUTOMATION_RECORDS, "aa", lambda i: f"Allocation auto {i}")
    _automation_block(COL_PERFORMANCE_ENGAGEMENT_AUTOMATION_RECORDS, "pea", lambda i: f"Perf engagement {i}")

    for i in range(8):
        db[COL_PROCESS_REENGINEERING_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "initiative_id": f"pri-{i}",
                "title": f"Lean HR initiative {i}",
                "bottleneck": ["approvals", "handoffs", "rework"][i % 3],
                "expected_benefit": rnd.randint(20000, 400000),
                "status": ["DISCOVERY", "EXECUTING", "DONE"][i % 3],
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_AUTOMATION_ROI_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "roi_id": f"roi-{i}",
                "automation_name": f"Auto flow {i % 5}",
                "period": (now - timedelta(days=30 * i)).strftime("%Y-%m"),
                "hours_saved": rnd.uniform(40, 900),
                "manual_effort_reduced": rnd.uniform(80, 700),
                "cycle_time_reduced_percent": rnd.uniform(5, 45),
                "cost_saved": rnd.randint(5000, 180000),
                "error_reduction_percent": rnd.uniform(5, 60),
                "productivity_gain_score": rnd.uniform(0.5, 0.95),
                "realized_benefit": rnd.randint(4000, 150000),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(8):
        db[COL_AUTOMATION_GOVERNANCE_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "governance_id": f"gov-{i}",
                "automation_name": f"Auto flow {i % 4}",
                "owner_team": "HR Ops",
                "last_audit": (now - timedelta(days=10 * i)).date().isoformat(),
                "exceptions_30d": rnd.randint(0, 12),
                "rollback_events": rnd.randint(0, 2),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    ftypes = ["HR_BUDGET", "WORKFORCE", "SALARY", "BENEFITS", "TRAINING", "RECRUITMENT", "VENDOR", "COMPLIANCE"]
    for i in range(14):
        db[COL_COST_FORECAST_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "forecast_id": f"fc-{i}",
                "forecast_type": ftypes[i % len(ftypes)],
                "forecast_period": f"FY{now.year}-Q{(i % 4) + 1}",
                "business_scope": bus[i % 4],
                "forecast_payload": {"point_estimate_millions": round(8 + rnd.random() * 4, 3)},
                "confidence_score": rnd.uniform(0.55, 0.92),
                "generated_on": _iso(now - timedelta(days=i)),
                "generated_at": _iso(now - timedelta(days=i)),
                "source_type": "MOCK_MODEL",
                "is_mock": True,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_COST_DRIVER_ANALYSIS_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "driver_analysis_id": f"drv-{i}",
                "period": (now - timedelta(days=20 * i)).strftime("%Y-%m"),
                "driver_type": ["SALARY", "ATTRITION", "VENDOR", "OVERTIME"][i % 4],
                "driver_name": f"Driver {i}",
                "contribution_percent": rnd.uniform(5, 35),
                "impact_value": rnd.randint(10000, 400000),
                "root_cause_summary": "Heuristic attribution from seeded distributions.",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(14):
        db[COL_SAVINGS_OPPORTUNITY_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "savings_id": f"sv-{i}",
                "opportunity_type": ["PROCESS", "VENDOR", "TOOL", "WORKFORCE"][i % 4],
                "business_scope": bus[i % 4],
                "process_or_vendor": f"Target-{i}",
                "estimated_savings": rnd.randint(8000, 420000),
                "implementation_effort": ["S", "M", "L"][i % 3],
                "priority_score": rnd.uniform(0.35, 0.95),
                "status": ["BACKLOG", "IN_PROGRESS", "REALIZED"][i % 3],
                "owner_id": "seed",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(10):
        db[COL_AI_COST_RECOMMENDATION_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "recommendation_id": f"airc-{i}",
                "recommendation_type": ["STAFFING_MIX", "VENDOR_CONSOLIDATION", "AUTOMATION"][i % 3],
                "target_scope": bus[i % 4],
                "recommendation_payload": {"actions": ["reduce bench", "bundle vendors"], "rationale": "mock"},
                "score": rnd.uniform(0.5, 0.98),
                "expected_savings": rnd.randint(15000, 300000),
                "expected_impact": "HIGH" if i % 2 == 0 else "MEDIUM",
                "generated_at": _iso(now - timedelta(days=i)),
                "source_type": "MOCK_AI",
                "is_mock": True,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(10):
        db[COL_AI_PRODUCTIVITY_RECOMMENDATION_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "recommendation_id": f"airp-{i}",
                "recommendation_type": ["AUTOMATE", "SELF_SERVICE", "SIMPLIFY"][i % 3],
                "target_scope": "HR",
                "recommendation_payload": {"process": pnames[i % len(pnames)]},
                "score": rnd.uniform(0.45, 0.95),
                "expected_hours_saved": rnd.randint(100, 4000),
                "generated_at": _iso(now - timedelta(days=i)),
                "source_type": "MOCK_AI",
                "is_mock": True,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_COST_OVERRUN_PREDICTION_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "prediction_id": f"cor-{i}",
                "business_scope": bus[i % 4],
                "overrun_type": ["DEPT_BUDGET", "PAYROLL", "VENDOR", "HIRING"][i % 4],
                "predicted_risk_score": rnd.uniform(0.2, 0.95),
                "predicted_variance": rnd.uniform(-0.12, 0.22),
                "risk_factors_payload": {"signals": ["vendor_spike", "hiring_surge"]},
                "confidence_score": rnd.uniform(0.5, 0.9),
                "generated_at": _iso(now - timedelta(days=i)),
                "source_type": "MOCK_MODEL",
                "is_mock": True,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(12):
        db[COL_EFFICIENCY_RISK_PREDICTION_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "efficiency_prediction_id": f"efr-{i}",
                "business_scope": bus[i % 4],
                "process_name": pnames[i % len(pnames)],
                "risk_type": ["DELAY", "REWORK", "BOTTLENECK"][i % 3],
                "risk_score": rnd.uniform(0.25, 0.92),
                "severity": ["LOW", "MEDIUM", "HIGH"][i % 3],
                "risk_factors_payload": {"sla_breaches_30d": rnd.randint(0, 25)},
                "generated_at": _iso(now - timedelta(days=i)),
                "source_type": "MOCK_MODEL",
                "is_mock": True,
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    for i in range(8):
        db[COL_COST_SCENARIO_MODELS].insert_one(
            {
                "id": _doc_id(),
                "scenario_id": f"scn-{i}",
                "scenario_name": ["Hiring freeze", "Automation expansion", "Vendor consolidation", "Budget cut"][i % 4],
                "scenario_type": ["FREEZE", "AUTO", "VENDOR", "CUT"][i % 4],
                "input_payload": {"hiring_rate": 0.05, "automation_coverage": 0.4},
                "output_payload": {"projected_spend_delta": rnd.uniform(-0.15, 0.05)},
                "expected_savings": rnd.randint(50000, 900000),
                "expected_risk": rnd.uniform(0.1, 0.4),
                "created_by": "seed",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    db[COL_STRATEGIC_COST_INTELLIGENCE_SNAPSHOTS].insert_one(
        {
            "id": _doc_id(),
            "strategic_snapshot_id": "strat-1",
            "snapshot_date": now.date().isoformat(),
            "cost_efficiency_index": 0.74,
            "automation_maturity_index": 0.63,
            "budget_health_score": 0.69,
            "savings_realization_index": 0.57,
            "risk_map_payload": {"hotspots": ["vendor_renewals", "overtime_spike"]},
            "recommendation_payload": {"priorities": ["vendor consolidation", "ESS adoption"]},
            "created_at": _iso(now),
            "seed_marker": SEED_MARKER,
        }
    )

    db[COL_EXECUTIVE_COST_SUMMARY_SNAPSHOTS].insert_one(
        {
            "id": _doc_id(),
            "executive_summary_id": "exec-1",
            "snapshot_date": now.date().isoformat(),
            "summary_type": "BOARD_PACK_V1",
            "summary_payload": {
                "narrative": "Workforce spend stable; automation savings trending up; monitor vendor renewals in Q3.",
                "actions": ["Approve vendor consolidation pilot", "Expand payroll exception automation"],
            },
            "risk_index": 0.41,
            "opportunity_index": 0.62,
            "created_at": _iso(now),
            "seed_marker": SEED_MARKER,
        }
    )

    for i in range(10):
        db[COL_CONTINUOUS_IMPROVEMENT_RECORDS].insert_one(
            {
                "id": _doc_id(),
                "initiative_id": f"ci-{i}",
                "title": f"CI initiative {i}",
                "target_savings": rnd.randint(10000, 500000),
                "status": ["OPEN", "IN_FLIGHT", "CLOSED"][i % 3],
                "owner_id": "seed",
                "review_cycle": "MONTHLY",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )

    db[COL_POLICY_RULES].insert_one(
        {
            "id": _doc_id(),
            "rule_name": "COA demo policy",
            "description": "Non-negative spend; approvals for overspend",
            "payload": {"min_confidence_forecast": 0.5},
            "active": True,
            "seed_marker": SEED_MARKER,
        }
    )

    print(f"COA seed: inserted demo rows ({SEED_MARKER})")


if __name__ == "__main__":
    main()
