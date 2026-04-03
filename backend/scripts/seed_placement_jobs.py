#!/usr/bin/env python3
"""
Seed job requisitions to cover the full placement taxonomy:
Pillar → Department → Sub-department (+ Project ID).

Why this exists:
- UI filters depend on jobs having placement fields.
- Each job can only belong to ONE sub-department, so to ensure every sub-department
  has at least one job, we create one job per sub-department (currently 86).

Idempotent:
- Uses seed_marker + seed_key for stable upserts.

Requires:
- MONGO_URL
- DB_NAME  (defaults to aai_hrms)
"""

from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone


SEED_MARKER = "placement_jobs_v1"


TAXONOMY = [
    {
        "pillar": "Core Business",
        "departments": [
            {
                "department": "Executive Leadership",
                "subs": [
                    "CEO / Managing Director",
                    "COO (Operations)",
                    "CFO (Finance)",
                    "CTO / CIO (Technology & IT)",
                    "CMO (Marketing)",
                    "CHRO (Human Resources)",
                ],
            },
            {
                "department": "Operations",
                "subs": [
                    "Business Operations",
                    "Process Management",
                    "Quality Assurance (QA)",
                    "Supply Chain Operations",
                    "Vendor Management",
                    "Service Delivery",
                ],
            },
            {
                "department": "Finance & Accounts",
                "subs": [
                    "Financial Planning & Analysis (FP&A)",
                    "Accounting & Bookkeeping",
                    "Treasury Management",
                    "Taxation",
                    "Audit & Compliance",
                    "Payroll",
                ],
            },
            {
                "department": "Human Resources (HR)",
                "subs": [
                    "Talent Acquisition (Hiring)",
                    "Employee Engagement",
                    "Learning & Development (L&D)",
                    "Performance Management",
                    "Compensation & Benefits",
                    "HR Operations",
                ],
            },
            {
                "department": "Sales",
                "subs": [
                    "Inside Sales",
                    "Field Sales",
                    "Channel / Partner Sales",
                    "Key Account Management",
                    "Pre-Sales / Solution Consulting",
                ],
            },
            {
                "department": "Marketing Department",
                "subs": [
                    "Digital Marketing",
                    "Brand Management",
                    "Product Marketing",
                    "Content Marketing",
                    "Market Research",
                    "PR & Communications",
                ],
            },
            {
                "department": "Customer Support / Success",
                "subs": [
                    "Customer Support (Helpdesk)",
                    "Customer Success Management",
                    "Complaint Resolution",
                    "Retention & Loyalty Programs",
                ],
            },
        ],
    },
    {
        "pillar": "Technology & Data",
        "departments": [
            {
                "department": "Information Technology (IT)",
                "subs": [
                    "Infrastructure Management",
                    "Network & Security",
                    "Cloud Operations",
                    "IT Support / Helpdesk",
                    "DevOps",
                ],
            },
            {
                "department": "Product & Engineering",
                "subs": [
                    "Software Development",
                    "UI/UX Design",
                    "Product Management",
                    "QA Testing",
                    "Release Management",
                ],
            },
            {
                "department": "Data & Analytics",
                "subs": [
                    "Data Engineering",
                    "Data Science",
                    "Business Intelligence (BI)",
                    "Data Governance",
                    "AI / Machine Learning",
                ],
            },
        ],
    },
    {
        "pillar": "Governance & Control",
        "departments": [
            {
                "department": "Legal & Compliance",
                "subs": [
                    "Corporate Legal",
                    "Contract Management",
                    "Regulatory Compliance",
                    "Risk Management",
                ],
            },
            {
                "department": "Internal Audit & Risk",
                "subs": [
                    "Internal Audit",
                    "Enterprise Risk Management (ERM)",
                    "Fraud Detection",
                    "Controls & Assurance",
                ],
            },
        ],
    },
    {
        "pillar": "Support & Administrative",
        "departments": [
            {
                "department": "Procurement / Purchasing",
                "subs": [
                    "Vendor Sourcing",
                    "Contract Negotiation",
                    "Inventory Procurement",
                ],
            },
            {
                "department": "Administration",
                "subs": [
                    "Facilities Management",
                    "Office Administration",
                    "Travel & Logistics",
                    "Security",
                ],
            },
            {
                "department": "Research & Development (R&D)",
                "subs": [
                    "Innovation Labs",
                    "Product Research",
                    "Prototyping",
                    "Emerging Technologies",
                ],
            },
            {
                "department": "Strategy & Planning",
                "subs": [
                    "Corporate Strategy",
                    "Business Planning",
                    "Mergers & Acquisitions (M&A)",
                    "Transformation Office",
                ],
            },
        ],
    },
    {
        "pillar": "Advanced / Modern Enterprise",
        "departments": [
            {
                "department": "Digital Transformation",
                "subs": [
                    "Automation (RPA)",
                    "AI Transformation",
                    "Process Digitization",
                ],
            },
            {
                "department": "ESG / Sustainability",
                "subs": [
                    "Environmental Compliance",
                    "Social Responsibility",
                    "Governance Reporting",
                ],
            },
            {
                "department": "Information Security (Cybersecurity)",
                "subs": [
                    "Security Operations Center (SOC)",
                    "Threat Intelligence",
                    "Identity & Access Management",
                ],
            },
        ],
    },
]


def _slug(s: str) -> str:
    out = []
    for ch in s.lower():
        if ch.isalnum():
            out.append(ch)
        else:
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")[:80]


def _pick_skills(pillar: str, department: str, sub: str) -> tuple[list[dict], list[dict]]:
    # Keep lightweight, consistent structure for UI (skills array).
    must = []
    good = []
    s = f"{pillar} {department} {sub}".lower()
    if "data" in s or "analytics" in s or "ai" in s:
        must = ["Python", "SQL"]
        good = ["Statistics", "Power BI"]
    elif "security" in s or "risk" in s or "compliance" in s or "audit" in s:
        must = ["Risk Management", "Compliance"]
        good = ["Policy Writing", "Documentation"]
    elif "engineering" in s or "software" in s or "devops" in s or "cloud" in s:
        must = ["JavaScript", "System Design"]
        good = ["Docker", "CI/CD"]
    elif "sales" in s or "marketing" in s:
        must = ["Communication", "CRM"]
        good = ["Negotiation", "Market Research"]
    elif "human resources" in s or "talent" in s:
        must = ["Recruiting", "Stakeholder Management"]
        good = ["HR Operations", "Interviewing"]
    else:
        must = ["Communication"]
        good = ["Problem Solving"]

    skills = []
    for m in must:
        skills.append({"skill_name": m, "skill_type": "MUST_HAVE", "weight": 1.0})
    for g in good:
        skills.append({"skill_name": g, "skill_type": "GOOD_TO_HAVE", "weight": 1.0})
    return skills, must


async def main() -> int:
    mongo_url = os.environ.get("MONGO_URL")
    db_name = (os.environ.get("DB_NAME") or "aai_hrms").strip() or "aai_hrms"
    if not mongo_url:
        raise SystemExit("MONGO_URL is required")

    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        now = datetime.now(timezone.utc).isoformat()

        admin = await db.users.find_one({"role": "admin"}, {"_id": 0})
        created_by = (admin or {}).get("id")
        if not created_by:
            created_by = str(uuid.uuid4())
            await db.users.insert_one(
                {
                    "id": created_by,
                    "email": "seed.admin@aai-hrms.local",
                    "password": "seed",
                    "full_name": "Seed Admin",
                    "role": "admin",
                    "created_at": now,
                }
            )

        total = 0
        created = 0
        updated = 0

        for p in TAXONOMY:
            pillar = p["pillar"]
            for d in p["departments"]:
                dept = d["department"]
                for sub in d["subs"]:
                    total += 1
                    seed_key = f"{_slug(pillar)}::{_slug(dept)}::{_slug(sub)}"
                    title = f"{sub} — {dept}"
                    project_id = f"PRJ-{_slug(dept)[:18].upper()}-{_slug(sub)[:18].upper()}".replace("-", "")[:28]

                    skills, must_have = _pick_skills(pillar, dept, sub)
                    doc = {
                        "id": str(uuid.uuid4()),
                        "title": title,
                        "normalized_title": title.lower(),
                        "description": (
                            f"Seeded job requisition for placement coverage.\n\n"
                            f"Pillar: {pillar}\nDepartment: {dept}\nSub-department: {sub}\nProject ID: {project_id}\n\n"
                            f"Must-have skills: {', '.join(must_have)}"
                        ),
                        "seniority": "Mid",
                        "domain": dept,
                        "business_pillar": pillar,
                        "business_department": dept,
                        "business_sub_department": sub,
                        "project_id": project_id,
                        "location": "Remote",
                        "work_mode": "hybrid",
                        "status": "OPEN",
                        "skills": skills,
                        "activities": [],
                        "scoring_rubric": None,
                        "created_by": created_by,
                        "created_at": now,
                        "seed_marker": SEED_MARKER,
                        "seed_key": seed_key,
                    }

                    res = await db.jobs.update_one(
                        {"seed_marker": SEED_MARKER, "seed_key": seed_key},
                        {"$setOnInsert": doc, "$set": {"updated_at": now}},
                        upsert=True,
                    )
                    if res.upserted_id is not None:
                        created += 1
                    elif res.modified_count > 0:
                        updated += 1

        print(
            f"Placement seed complete. taxonomy_rows={total} created={created} updated={updated} db={db_name}",
            flush=True,
        )
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

