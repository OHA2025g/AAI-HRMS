"""Tests for job org field inference and dashboard filter options."""

from __future__ import annotations

import asyncio


def test_infer_sub_department_from_title():
    from talent_acquisition.job_org_fields import infer_sub_department_from_title

    assert infer_sub_department_from_title("Manager – Investigations") == "Investigations"
    assert infer_sub_department_from_title("Senior - Cyber Transformation") == "Cyber Transformation"
    assert infer_sub_department_from_title("QA Seed — Software Engineer") == "Software Engineer"


def test_effective_job_org_from_title_when_fields_missing():
    from talent_acquisition.job_org_fields import effective_job_org

    org = effective_job_org(
        {
            "title": "Manager – Investigations",
            "project_id": "INTG10040707",
        }
    )
    assert org["business_pillar"] == "Advisory"
    assert org["business_department"] == "Forensic & Integrity"
    assert org["business_sub_department"] == "Investigations"
    assert org["project_id"] == "INTG10040707"


def test_effective_job_org_prefers_stored_values():
    from talent_acquisition.job_org_fields import effective_job_org

    org = effective_job_org(
        {
            "title": "Manager – Investigations",
            "business_pillar": "Core Business",
            "business_department": "Sales",
            "business_sub_department": "Inside Sales",
        }
    )
    assert org["business_pillar"] == "Core Business"
    assert org["business_department"] == "Sales"
    assert org["business_sub_department"] == "Inside Sales"


def test_get_hiring_filter_options_infers_from_title():
    from talent_acquisition.hiring_dashboard import get_dashboard_filter_options

    class FakeCursor:
        def __init__(self, rows):
            self._rows = rows

        async def to_list(self, _limit):
            return self._rows

    class FakeJobs:
        def __init__(self, rows):
            self._rows = rows

        def find(self, _filt, _proj):
            return FakeCursor(self._rows)

    class FakeDb:
        def __init__(self, rows):
            self.jobs = FakeJobs(rows)

    rows = [
        {
            "title": "Manager – Investigations",
            "project_id": "INTG10040707",
        },
        {
            "title": "Senior – Cyber Transformation",
            "project_id": "INTG10042192",
        },
        {
            "business_pillar": "Core Business",
            "business_department": "Sales",
            "business_sub_department": "Inside Sales",
            "project_id": "PRJ-1",
        },
    ]

    async def run():
        all_opts = await get_dashboard_filter_options(FakeDb(rows), job_ids=None)
        assert "Advisory" in all_opts["pillars"]
        assert "Core Business" in all_opts["pillars"]
        assert "Forensic & Integrity" in all_opts["departments"]
        assert "Cyber Security" in all_opts["departments"]
        assert "Investigations" in all_opts["sub_departments"]
        assert "INTG10040707" in all_opts["project_ids"]

        pillar_opts = await get_dashboard_filter_options(
            FakeDb(rows),
            job_ids=None,
            business_pillar="Advisory",
        )
        assert "Sales" not in pillar_opts["departments"]
        assert "Forensic & Integrity" in pillar_opts["departments"]

    asyncio.run(run())


def test_backfill_org_update_skips_when_pillar_present():
    from talent_acquisition.job_org_fields import backfill_org_update

    assert backfill_org_update({"business_pillar": "Core Business", "title": "X – Y"}) is None


def test_backfill_org_update_returns_patch():
    from talent_acquisition.job_org_fields import backfill_org_update

    patch = backfill_org_update({"title": "Analyst – Investigations"})
    assert patch["business_pillar"] == "Advisory"
    assert patch["business_department"] == "Forensic & Integrity"
    assert patch["business_sub_department"] == "Investigations"
