"""Tests for assessment feature flags and coverage matrix."""

from pathlib import Path

import pytest

from talent_acquisition.assessment_email import get_assessment_email_ops_status
from talent_acquisition.assessment_feature_flags import get_assessment_feature_flags, is_assessment_feature_enabled
from talent_acquisition.assessments_analytics import build_coverage_matrix


def test_feature_flags_default_enabled():
    flags = get_assessment_feature_flags()
    assert flags["public_take"] is True
    assert flags["coverage_heatmap"] is True
    assert is_assessment_feature_enabled("ai_grading") is True


def test_email_ops_status_reports_smtp_and_warnings(monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.delenv("ASSESSMENT_PUBLIC_BASE_URL", raising=False)
    monkeypatch.delenv("ASSESSMENT_EMAIL_CRON_TOKEN", raising=False)
    status = get_assessment_email_ops_status()
    assert status["smtp_configured"] is False
    assert status["warnings"]


def test_feature_flags_include_email_delivery_ready(monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.delenv("ASSESSMENT_PUBLIC_BASE_URL", raising=False)
    from talent_acquisition.assessment_feature_flags import get_assessment_feature_flags
    from talent_acquisition.assessment_email import get_assessment_email_ops_status

    flags = get_assessment_feature_flags()
    ops = get_assessment_email_ops_status()
    assert flags["command_center"] is True
    assert ops["ready_to_send"] is False


def test_validate_assessment_ops_script_strict_exits_when_not_ready(monkeypatch):
    import subprocess
    import sys

    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.delenv("ASSESSMENT_PUBLIC_BASE_URL", raising=False)
    proc = subprocess.run(
        [sys.executable, "scripts/validate_assessment_ops.py", "--strict"],
        cwd=str(Path(__file__).resolve().parents[1]),
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 1
    assert "ready_to_send" in proc.stdout or "ready_to_send" in proc.stderr


@pytest.mark.asyncio
async def test_build_coverage_matrix_empty_org(monkeypatch):
    import talent_acquisition.assessments_analytics as mod

    async def _empty_jobs(_db, _org=None):
        return []

    monkeypatch.setattr(mod, "_job_ids_for_org_filter", _empty_jobs)
    matrix = await build_coverage_matrix(_FakeDb(), window_days=30, org={"pillar": "X"})
    assert matrix.types
    assert matrix.jobs == []


class _FakeDb:
    def __getitem__(self, name):
        raise KeyError(name)
