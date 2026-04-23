"""M9 analytics: semantic layer + export helpers (no Mongo)."""

import re
import zipfile
from io import BytesIO

from m9_analytics.drill_scope import _subtree_employee_ids
from m9_analytics.export_packs import (
    build_full_leadership_pack_zip_bytes,
    default_snapshot_period_previous_month_utc,
    format_snapshot_csv,
)
from m9_analytics.kpi_catalog import default_kpi_definitions


def test_default_kpi_catalog_covers_core_ids():
    ids = {d["kpi_id"] for d in default_kpi_definitions()}
    assert "headcount_total" in ids
    assert "skill_coverage_pct" in ids
    assert "automation_estimated_usd_saved_30d" in ids
    assert "talent_acq_dedup_audit_count_window" in ids
    assert "talent_acq_primary_source_concentration_pct" in ids
    assert "talent_acq_top_match_precision_proxy_pct" in ids
    for d in default_kpi_definitions():
        assert d.get("owner_role")
        assert d.get("source_system")


def test_subtree_includes_root_and_descendants():
    all_emp = [
        {"id": "m1", "manager_id": None},
        {"id": "a", "manager_id": "m1"},
        {"id": "b", "manager_id": "a"},
        {"id": "x", "manager_id": None},
    ]
    s = _subtree_employee_ids(all_emp, "m1")
    assert s == {"m1", "a", "b"}


def test_default_previous_month_format():
    ym = default_snapshot_period_previous_month_utc()
    assert re.match(r"^\d{4}-\d{2}$", ym)


def test_full_leadership_zip_contains_json_and_csv():
    payload = {
        "period": "2025-03",
        "generated_at": "2025-03-21T00:00:00+00:00",
        "strategic_dashboard": {"employee_count": 3},
        "kpi_pack": {"values": {}, "talent_acquisition": {"dedup_audit_events_in_window": 0}},
        "freshness": {"checks": []},
    }
    raw = build_full_leadership_pack_zip_bytes(payload)
    zf = zipfile.ZipFile(BytesIO(raw))
    names = zf.namelist()
    assert any(n.endswith(".json") for n in names)
    assert any(n.endswith(".csv") for n in names)


def test_format_snapshot_csv_rows():
    payload = {
        "period": "2025-03",
        "generated_at": "2025-03-21T00:00:00+00:00",
        "strategic_dashboard": {"employee_count": 10, "attrition_rate_pct": 5.5},
        "kpi_pack": {"values": {"headcount_total": {"value": 10}}},
        "freshness": {"checks": [{"source": "employees", "sla_ok": True, "age_hours": 1.0, "last_event_at": "t"}]},
    }
    raw = format_snapshot_csv(payload)
    assert b"employee_count" in raw
    assert b"headcount_total" in raw
    assert b"employees" in raw
