import os
import random
import uuid
from datetime import datetime, timedelta, timezone

from pymongo import MongoClient


def iso(dt: datetime) -> str:
    return dt.replace(tzinfo=timezone.utc).isoformat()


def main():
    mongo_uri = os.environ.get("MONGO_URI") or os.environ.get("MONGODB_URI") or "mongodb://localhost:27017/hrms"
    db_name = os.environ.get("MONGO_DB_NAME") or None

    client = MongoClient(mongo_uri)
    db = client.get_default_database() if db_name is None else client[db_name]

    # Don’t spam duplicates if already seeded
    existing = db.project_masters.count_documents({"is_deleted": {"$ne": True}})
    if existing >= 10:
        print(f"Project Section seed skipped (project_masters already has {existing} docs).")
        return

    now = datetime.now(timezone.utc)
    bus = ["AI Labs", "Delivery", "Platform", "R&D", "Support"]
    clients = ["Acme Corp", "Globex", "Initech", "Umbrella", "Wayne Enterprises"]
    statuses = ["draft", "proposed", "under_review", "approved", "active", "on_hold", "completed", "closed"]
    priorities = ["low", "medium", "high", "critical"]
    health = ["green", "amber", "red"]
    ptypes = ["internal", "external", "r&d", "support"]

    # Pick a few employees as managers if present
    emps = list(db.employees.find({}, {"_id": 0, "id": 1, "full_name": 1}).limit(50))
    emp_ids = [e.get("id") for e in emps if e.get("id")]

    projects = []
    lifecycle = []
    demands = []
    risks = []
    issues = []
    docs = []
    notes = []

    for i in range(20):
        pid = str(uuid.uuid4())
        code = f"PRJ-{i+1:05d}"
        start = (now - timedelta(days=random.randint(0, 120))).date().isoformat()
        end = (now + timedelta(days=random.randint(15, 180))).date().isoformat()
        st = random.choice(statuses)
        bu = random.choice(bus)
        client_name = random.choice(clients)
        pr = random.choice(priorities)
        ph = random.choice(health)
        pt = random.choice(ptypes)
        mgr = random.choice(emp_ids) if emp_ids else None

        projects.append(
            {
                "id": pid,
                "project_id": pid,
                "project_name": f"{client_name} - Workforce Modernization {i+1}",
                "project_code": code,
                "client_name": client_name,
                "project_type": pt,
                "business_unit": bu,
                "department": "Engineering",
                "cost_center": f"CC-{random.randint(100,999)}",
                "project_manager_id": mgr,
                "delivery_manager_id": mgr,
                "account_manager_id": None,
                "project_owner_id": None,
                "project_priority": pr,
                "project_category": "Delivery",
                "project_status": st,
                "project_health": ph,
                "start_date": start,
                "end_date": end,
                "actual_end_date": None,
                "billing_type": random.choice(["FIXED", "TIME_MATERIAL"]),
                "currency": "INR",
                "project_budget": float(random.randint(25, 300)) * 100000.0,
                "expected_revenue": float(random.randint(30, 450)) * 100000.0,
                "location": "India",
                "geography": "APAC",
                "work_mode": random.choice(["onsite", "remote", "hybrid"]),
                "description": "Seeded demo project for Project Section.",
                "objectives": "Deliver milestones, staff roles, and track execution.",
                "tags": ["demo", bu.lower().replace(" ", "-")],
                "remarks": "",
                "is_archived": False,
                "is_deleted": False,
                "created_at": iso(now),
                "updated_at": iso(now),
                "created_by": "seed",
                "updated_by": "seed",
            }
        )

        lifecycle.append(
            {
                "id": str(uuid.uuid4()),
                "project_id": pid,
                "from_state": None,
                "to_state": st,
                "reason": "Seed",
                "changed_by": "seed",
                "changed_at": iso(now),
            }
        )

        # Demands
        for (role, skill, count) in [
            ("Data Scientist", "Python", random.randint(1, 4)),
            ("Frontend Engineer", "React", random.randint(1, 3)),
            ("Cloud Engineer", "AWS", random.randint(1, 3)),
        ]:
            fulfilled = random.randint(0, max(0, count - 1))
            demands.append(
                {
                    "id": str(uuid.uuid4()),
                    "project_id": pid,
                    "role_name": role,
                    "role_name_lc": role.lower(),
                    "skill_name": skill,
                    "skill_name_lc": skill.lower(),
                    "mandatory_or_optional": "mandatory",
                    "demand_count": count,
                    "fulfilled_count": fulfilled,
                    "planned_start_date": start,
                    "planned_end_date": end,
                    "allocation_percentage": 50,
                    "hiring_required_flag": (count - fulfilled) > 1,
                    "updated_at": iso(now),
                    "updated_by": "seed",
                    "created_at": iso(now),
                    "created_by": "seed",
                }
            )

        risks.append(
            {
                "id": str(uuid.uuid4()),
                "project_id": pid,
                "risk_id": f"RSK-{uuid.uuid4().hex[:8].upper()}",
                "title": "Staffing risk",
                "category": "Resource",
                "description": "Open demand may delay milestones.",
                "probability": 3,
                "impact": 4,
                "severity": "high",
                "mitigation_plan": "Backfill from bench; accelerate hiring.",
                "owner_employee_id": mgr,
                "target_date": end,
                "status": "open",
                "created_at": iso(now),
                "updated_at": iso(now),
                "created_by": "seed",
            }
        )

        issues.append(
            {
                "id": str(uuid.uuid4()),
                "project_id": pid,
                "issue_id": f"ISS-{uuid.uuid4().hex[:8].upper()}",
                "title": "Environment access pending",
                "category": "Delivery",
                "description": "Awaiting client VPN approvals.",
                "severity": "medium",
                "owner_employee_id": mgr,
                "raised_date": start,
                "due_date": (now + timedelta(days=10)).date().isoformat(),
                "resolution": "",
                "status": "open",
                "escalated_flag": False,
                "created_at": iso(now),
                "updated_at": iso(now),
                "created_by": "seed",
            }
        )

        docs.append(
            {
                "id": str(uuid.uuid4()),
                "project_id": pid,
                "doc_name": "SOW",
                "category": "SOW",
                "url": None,
                "version": "v1",
                "tags": ["seed"],
                "remarks": "",
                "created_at": iso(now),
                "updated_at": iso(now),
                "created_by": "seed",
            }
        )

        notes.append(
            {
                "id": str(uuid.uuid4()),
                "project_id": pid,
                "type": "mom",
                "title": "Kickoff MoM",
                "body": "Discussed scope, timelines, staffing, and risks.",
                "pinned": False,
                "created_at": iso(now),
                "created_by": "seed",
            }
        )

    db.project_masters.insert_many(projects)
    db.project_lifecycle_history.insert_many(lifecycle)
    db.project_demands.insert_many(demands)
    db.project_risks.insert_many(risks)
    db.project_issues.insert_many(issues)
    db.project_documents.insert_many(docs)
    db.project_notes.insert_many(notes)

    print("Seeded Project Section demo data:")
    print(f"- projects: {len(projects)}")
    print(f"- demands: {len(demands)}")
    print(f"- risks: {len(risks)}")
    print(f"- issues: {len(issues)}")


if __name__ == "__main__":
    main()

