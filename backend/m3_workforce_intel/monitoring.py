"""
MAPE/MAE tracking, drift-style alerts, retraining recommendation flags.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from m3_workforce_intel.baseline_model import BaselineParams, predict_demand
from m3_workforce_intel.constants import (
    COL_DRIFT_EVENTS,
    COL_EVAL_RUNS,
    COL_MODEL_STATE,
    COL_MODELS,
    COL_MONITORING_STATE,
    MODEL_STATE_DOC_ID,
    MONITORING_STATE_DOC_ID,
)
from m3_workforce_intel.features import extract_workforce_intel_feature_rows
from m3_workforce_intel import prom_metrics as m3_prom_metrics


def _thresholds() -> Dict[str, float]:
    return {
        "drift_abs_pct": float(os.environ.get("WORKFORCE_INTEL_DRIFT_ALERT_ABS_PCT", "35")),
        "mape_retrain": float(os.environ.get("WORKFORCE_INTEL_MAPE_RETRAIN_THRESHOLD_PCT", "40")),
        "min_skills_eval": float(os.environ.get("WORKFORCE_INTEL_MIN_SKILLS_FOR_EVAL", "3")),
    }


async def _get_active_version_id(db: AsyncIOMotorDatabase) -> Optional[str]:
    doc = await db[COL_MODEL_STATE].find_one({"_id": MODEL_STATE_DOC_ID}, {"_id": 0, "active_version_id": 1})
    if not doc:
        return None
    return doc.get("active_version_id")


async def _load_model_doc(db: AsyncIOMotorDatabase, version_id: str) -> Optional[Dict[str, Any]]:
    return await db[COL_MODELS].find_one({"version_id": version_id}, {"_id": 0})


def build_params_map(raw: Dict[str, Any]) -> Dict[str, Any]:
    return raw.get("params") or {}


async def evaluate_active_model_vs_current(
    db: AsyncIOMotorDatabase,
    *,
    actor_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compare active model one-step demand forecast vs latest extracted feature row (current truth).
    Writes evaluation + drift events.
    """
    thr = _thresholds()
    version_id = await _get_active_version_id(db)
    if not version_id:
        return {"status": "skipped", "reason": "no_active_model"}

    mdoc = await _load_model_doc(db, version_id)
    if not mdoc:
        return {"status": "skipped", "reason": "model_not_found"}

    params = build_params_map(mdoc)
    per_skill_params = params.get("per_skill") or {}

    live_rows, demand_source, _supply_source = await extract_workforce_intel_feature_rows(db)
    live_by_sk = {(r["skill_name_lc"] or "").lower(): r for r in live_rows}

    abs_errs: List[float] = []
    heuristic_abs_errs: List[float] = []
    pct_errs: List[float] = []
    drift_events: List[Dict[str, Any]] = []
    evaluated_at = datetime.now(timezone.utc)
    eval_id = str(uuid.uuid4())

    for sk, pdict in per_skill_params.items():
        if sk not in live_by_sk:
            continue
        actual = float(max(0, int(live_by_sk[sk].get("demand_current") or 0)))
        p = BaselineParams.from_dict(pdict)
        y_hat = float(predict_demand(p, steps_ahead=1))
        y_hat_heuristic = float(round(p.last_demand))
        ae = abs(y_hat - actual)
        abs_errs.append(ae)
        heuristic_abs_errs.append(abs(y_hat_heuristic - actual))
        denom = max(1.0, abs(actual))
        pe = ae / denom * 100.0
        pct_errs.append(pe)

        if pe >= thr["drift_abs_pct"]:
            ev = {
                "id": str(uuid.uuid4()),
                "eval_id": eval_id,
                "version_id": version_id,
                "skill_name_lc": sk,
                "predicted": y_hat,
                "actual": actual,
                "abs_pct_error": round(pe, 4),
                "alert": "drift_high_abs_pct",
                "created_at": evaluated_at,
                "actor_id": actor_id,
            }
            drift_events.append(ev)

    n = len(abs_errs)
    if n < int(thr["min_skills_eval"]):
        return {
            "status": "skipped",
            "reason": "insufficient_overlap",
            "skills_compared": n,
            "min_required": int(thr["min_skills_eval"]),
        }

    mae = sum(abs_errs) / n
    heuristic_mae = sum(heuristic_abs_errs) / n
    mape = sum(pct_errs) / n
    retrain_recommended = mape >= thr["mape_retrain"]
    model_beats_heuristic = mae < heuristic_mae

    await db[COL_EVAL_RUNS].insert_one(
        {
            "eval_id": eval_id,
            "version_id": version_id,
            "evaluated_at": evaluated_at,
            "mape_pct": round(mape, 4),
            "mae": round(mae, 4),
            "heuristic_mae": round(heuristic_mae, 4),
            "model_beats_heuristic": model_beats_heuristic,
            "n_skills": n,
            "demand_source": demand_source,
            "retrain_recommended": retrain_recommended,
            "thresholds": thr,
            "actor_id": actor_id,
        }
    )

    if drift_events:
        await db[COL_DRIFT_EVENTS].insert_many(drift_events)

    await db[COL_MONITORING_STATE].update_one(
        {"_id": MONITORING_STATE_DOC_ID},
        {
            "$set": {
                "last_eval_id": eval_id,
                "last_evaluated_at": evaluated_at,
                "last_mape_pct": round(mape, 4),
                "last_mae": round(mae, 4),
                "last_heuristic_mae": round(heuristic_mae, 4),
                "model_beats_heuristic": model_beats_heuristic,
                "retrain_recommended": retrain_recommended,
                "active_version_id": version_id,
            }
        },
        upsert=True,
    )

    m3_prom_metrics.set_from_evaluation(
        model_mae=mae,
        heuristic_mae=heuristic_mae,
        mape_pct=mape,
        n_skills=n,
    )

    return {
        "status": "ok",
        "eval_id": eval_id,
        "version_id": version_id,
        "mape_pct": round(mape, 4),
        "mae": round(mae, 4),
        "heuristic_mae": round(heuristic_mae, 4),
        "model_beats_heuristic": model_beats_heuristic,
        "n_skills": n,
        "drift_alerts": len(drift_events),
        "retrain_recommended": retrain_recommended,
    }


async def retrain_trigger_evaluation(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """
    Policy hook: refresh retrain flag from latest evaluation doc / state.
    """
    st = await db[COL_MONITORING_STATE].find_one({"_id": MONITORING_STATE_DOC_ID}, {"_id": 0})
    if not st:
        return {"retrain_recommended": False, "reason": "no_monitoring_state"}
    return {
        "retrain_recommended": bool(st.get("retrain_recommended")),
        "last_mape_pct": st.get("last_mape_pct"),
        "last_evaluated_at": st.get("last_evaluated_at"),
        "active_version_id": st.get("active_version_id"),
    }
