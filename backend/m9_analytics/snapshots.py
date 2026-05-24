"""Normalize leadership snapshot documents (wrapper vs flat payload)."""

from __future__ import annotations

from typing import Any, Dict, Optional


def unwrap_snapshot_doc(doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Persisted snapshots store the full payload under `payload`.
    Compare/trends readers expect `strategic_dashboard` / `kpi_pack` at the top level.
    """
    if not doc:
        return {}
    payload = doc.get("payload")
    if isinstance(payload, dict) and payload.get("strategic_dashboard") is not None:
        merged = dict(payload)
        if doc.get("id"):
            merged["id"] = doc["id"]
        if doc.get("period"):
            merged["period"] = doc["period"]
        if doc.get("created_at"):
            merged["created_at"] = doc["created_at"]
        return merged
    return doc
