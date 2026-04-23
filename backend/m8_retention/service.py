"""M8 async service: critical skill map, scoring batch, playbooks, interventions."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from m8_retention.constants import (
    ATTRITION_MODEL_VERSION,
    COL_ATTRITION_MODEL_STATE,
    COL_ATTRITION_SCORES_LATEST,
    COL_RETENTION_INTERVENTIONS,
    COL_RETENTION_PLAYBOOKS,
    COL_RETENTION_SEGMENT_SETTINGS,
    FEATURE_KEYS,
    RETENTION_SETTINGS_DOC_ID,
)
from m8_retention.explainability import linear_shap_attributions
from m8_retention.features import build_feature_row, compute_confidence
from m8_retention.model_v1 import default_model_state, effective_feature_keys, risk_band, score_from_state
from m8_retention.segments import compute_segments, default_segment_settings
from m8_retention import sklearn_model
from m8_retention.training import train_logistic_regression

from m5_training.constants import COL_ASSIGNMENTS


async def load_critical_skill_risk_map(db: AsyncIOMotorDatabase) -> Dict[str, float]:
    critical = await db.workforce_skills.find(
        {"priority": "HIGH"},
        {"_id": 0, "skill_name": 1, "demand_count": 1, "supply_count": 1},
    ).to_list(200)
    if not critical:
        critical = (
            await db.workforce_skills.find(
                {},
                {"_id": 0, "skill_name": 1, "demand_count": 1, "supply_count": 1},
            )
            .sort("gap", -1)
            .limit(5)
            .to_list(50)
        )
    out: Dict[str, float] = {}
    for c in critical:
        name = (c.get("skill_name") or "").strip().lower()
        if not name:
            continue
        demand = max(0, int(c.get("demand_count") or 0))
        supply = max(0, int(c.get("supply_count") or 0))
        shortage = max(0, demand - supply)
        ratio = shortage / demand if demand > 0 else 0.0
        out[name] = float(round(ratio, 4))
    return out


async def load_engagement_avg_by_employee_code(db: AsyncIOMotorDatabase) -> Dict[str, float]:
    """Average rating (1–5) per employee_code from last 2000 responses."""
    rows = await db.employee_engagement_responses.find(
        {},
        {"_id": 0, "employee_code": 1, "rating": 1},
    ).sort("created_at", -1).limit(5000).to_list(5000)
    sums: Dict[str, List[int]] = {}
    for r in rows:
        code = (r.get("employee_code") or "").strip()
        if not code:
            continue
        rt = int(r.get("rating") or 0)
        if rt < 1:
            continue
        sums.setdefault(code, []).append(min(5, max(1, rt)))
    out: Dict[str, float] = {}
    for code, vals in sums.items():
        if vals:
            out[code] = sum(vals) / len(vals)
    return out


async def load_assignment_stats_by_employee_code(
    db: AsyncIOMotorDatabase,
    *,
    now: Optional[datetime] = None,
) -> Dict[str, Dict[str, int]]:
    now = now or datetime.now(timezone.utc)
    since_12m = (now - timedelta(days=365)).isoformat()
    rows = await db[COL_ASSIGNMENTS].find(
        {},
        {"_id": 0, "employee_code": 1, "status": 1, "updated_at": 1},
    ).to_list(10000)
    out: Dict[str, Dict[str, int]] = {}
    for r in rows:
        code = (r.get("employee_code") or "").strip()
        if not code:
            continue
        o = out.setdefault(code, {"open": 0, "done_12m": 0})
        st = str(r.get("status") or "").upper()
        if st in ("DONE", "COMPLETED", "COMPLETE"):
            upd = r.get("updated_at") or ""
            if isinstance(upd, str) and upd >= since_12m:
                o["done_12m"] += 1
        elif st in ("OPEN", "ASSIGNED", "IN_PROGRESS", "IN PROGRESS"):
            o["open"] += 1
    return out


def _merge_model_state(row: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    base = default_model_state()
    if not row or not row.get("weights"):
        return dict(base)
    out = {**base}
    for k, v in row.items():
        if k == "_id":
            continue
        out[k] = v
    return out


async def get_model_state_doc(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    row = await db[COL_ATTRITION_MODEL_STATE].find_one({"id": "current"}, {"_id": 0})
    merged = _merge_model_state(row)
    merged["id"] = "current"
    merged["version"] = (row or {}).get("version") or ATTRITION_MODEL_VERSION
    return merged


async def patch_model_runtime_settings(
    db: AsyncIOMotorDatabase,
    *,
    ensemble_mode: Optional[str] = None,
    interaction_features_enabled: Optional[bool] = None,
) -> Dict[str, Any]:
    """Update scoring-time flags without retraining (admin)."""
    cur = await get_model_state_doc(db)
    if ensemble_mode is not None:
        em = str(ensemble_mode).lower().strip()
        if em in ("linear", "gb", "avg"):
            cur["ensemble_mode"] = em
    if interaction_features_enabled is not None:
        cur["interaction_features_enabled"] = bool(interaction_features_enabled)
    await save_model_state_doc(db, cur)
    return await get_model_state_doc(db)


async def save_model_state_doc(db: AsyncIOMotorDatabase, state: Dict[str, Any]) -> None:
    now = datetime.now(timezone.utc).isoformat()
    doc: Dict[str, Any] = {
        "id": "current",
        "bias": state.get("bias"),
        "weights": state.get("weights"),
        "feature_keys": state.get("feature_keys") or list(FEATURE_KEYS),
        "interaction_features_enabled": bool(state.get("interaction_features_enabled")),
        "reference_features": state.get("reference_features") or {},
        "reference_feature_default": float(state.get("reference_feature_default") or 0.5),
        "ensemble_mode": (state.get("ensemble_mode") or "linear"),
        "version": ATTRITION_MODEL_VERSION,
        "updated_at": now,
    }
    if state.get("classifier_blob_b64"):
        doc["classifier_blob_b64"] = state["classifier_blob_b64"]
    else:
        doc["classifier_blob_b64"] = None
    await db[COL_ATTRITION_MODEL_STATE].update_one({"id": "current"}, {"$set": doc}, upsert=True)


async def get_segment_settings(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    row = await db[COL_RETENTION_SEGMENT_SETTINGS].find_one({"id": RETENTION_SETTINGS_DOC_ID}, {"_id": 0})
    if not row:
        return {**default_segment_settings(), "id": RETENTION_SETTINGS_DOC_ID}
    base = default_segment_settings()
    base.update({k: row[k] for k in base if k in row})
    base["id"] = RETENTION_SETTINGS_DOC_ID
    return base


async def save_segment_settings(db: AsyncIOMotorDatabase, patch: Dict[str, Any]) -> Dict[str, Any]:
    cur = await get_segment_settings(db)
    for k, v in patch.items():
        if k in ("high_risk_score_min", "medium_risk_score_min") and v is not None:
            cur[k] = float(v)
        if k == "require_critical_role_for_segment":
            cur[k] = bool(v)
    cur["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db[COL_RETENTION_SEGMENT_SETTINGS].update_one(
        {"id": RETENTION_SETTINGS_DOC_ID},
        {"$set": cur},
        upsert=True,
    )
    return cur


async def run_score_batch(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """Compute and upsert latest scores for ACTIVE/ONBOARDING employees."""
    now = datetime.now(timezone.utc)
    model_row = await get_model_state_doc(db)
    score_state = {k: v for k, v in model_row.items() if k != "id"}
    seg_settings = await get_segment_settings(db)
    crit_map = await load_critical_skill_risk_map(db)
    eng = await load_engagement_avg_by_employee_code(db)
    assign_stats = await load_assignment_stats_by_employee_code(db, now=now)
    interaction = bool(model_row.get("interaction_features_enabled"))
    b64 = model_row.get("classifier_blob_b64")
    ensemble = str(model_row.get("ensemble_mode") or "linear").lower()
    ref_map = model_row.get("reference_features") or {}

    emps = await db.employees.find(
        {"status": {"$in": ["ACTIVE", "ONBOARDING"]}},
        {"_id": 0},
    ).to_list(10000)

    scored = 0
    for e in emps:
        eid = e.get("id")
        code = (e.get("employee_code") or "").strip()
        ast = assign_stats.get(code, {"open": 0, "done_12m": 0})
        built = build_feature_row(
            e,
            critical_risk_by_skill_lc=crit_map,
            engagement_avg_rating=eng.get(code),
            open_assignments=int(ast.get("open", 0)),
            completed_assignments_12m=int(ast.get("done_12m", 0)),
            now=now,
            interaction_features_enabled=interaction,
        )
        vec = built["vector"]
        meta = built["meta"]
        risk_lin, logit, factors = score_from_state(vec, score_state)
        keys_eff = effective_feature_keys(score_state)
        shap_lin = linear_shap_attributions(vec, score_state, keys=keys_eff)

        risk_final = risk_lin
        top_factors: List[Dict[str, Any]] = factors[:5]
        model_kind = "linear"
        gb_top: Optional[List[Dict[str, Any]]] = None

        if b64 and sklearn_model.sklearn_available():
            try:
                blob = sklearn_model.b64_to_blob(str(b64))
                x_base = [float(vec.get(k) or 0.0) for k in FEATURE_KEYS]
                ref_row = [float(ref_map.get(k, 0.5)) for k in FEATURE_KEYS]
                risk_gb, gb_factors = sklearn_model.delta_feature_explanation(
                    blob,
                    x_base,
                    reference_row=ref_row,
                    feature_names=list(FEATURE_KEYS),
                )
                gb_top = gb_factors[:8]
                if ensemble == "gb":
                    risk_final = risk_gb
                    top_factors = gb_factors[:5]
                    model_kind = "sklearn_hist_gb"
                elif ensemble == "avg":
                    risk_final = round((risk_lin + risk_gb) / 2.0, 4)
                    model_kind = "ensemble_avg"
                else:
                    model_kind = "linear"
            except Exception:
                gb_top = None

        conf = compute_confidence(meta)
        band = risk_band(risk_final)
        segments = compute_segments(e, risk_final, seg_settings)

        doc = {
            "employee_id": eid,
            "employee_code": code,
            "full_name": e.get("full_name") or "",
            "department": e.get("department"),
            "role_title": e.get("role_title"),
            "attrition_risk": risk_final,
            "risk_band": band,
            "confidence": conf,
            "logit": logit,
            "attrition_risk_linear": risk_lin,
            "top_factors": top_factors,
            "shap_linear": shap_lin[:10],
            "gb_explanation_top": gb_top,
            "model_kind": model_kind,
            "ensemble_mode": ensemble,
            "features": vec,
            "feature_meta": meta,
            "segments": segments,
            "model_version": model_row.get("version") or ATTRITION_MODEL_VERSION,
            "computed_at": now.isoformat(),
        }
        await db[COL_ATTRITION_SCORES_LATEST].update_one(
            {"employee_id": eid},
            {"$set": doc},
            upsert=True,
        )
        scored += 1

    return {
        "scored_employees": scored,
        "computed_at": now.isoformat(),
        "model_version": model_row.get("version") or ATTRITION_MODEL_VERSION,
    }


async def list_latest_scores(
    db: AsyncIOMotorDatabase,
    *,
    department: Optional[str] = None,
    segment: Optional[str] = None,
    min_risk: Optional[float] = None,
    band: Optional[str] = None,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if department:
        q["department"] = {"$regex": f"^{department}$", "$options": "i"}
    if band:
        q["risk_band"] = str(band).upper()
    if min_risk is not None:
        q["attrition_risk"] = {"$gte": float(min_risk)}
    if segment:
        q["segments"] = str(segment).upper()

    cur = db[COL_ATTRITION_SCORES_LATEST].find(q, {"_id": 0}).sort("attrition_risk", -1).limit(limit)
    return await cur.to_list(limit)


async def get_employee_latest_score(db: AsyncIOMotorDatabase, employee_id: str) -> Optional[Dict[str, Any]]:
    return await db[COL_ATTRITION_SCORES_LATEST].find_one({"employee_id": employee_id}, {"_id": 0})


# --- Training ---


async def train_and_store(
    db: AsyncIOMotorDatabase,
    labeled: List[Dict[str, Any]],
    *,
    use_gradient_boosting: bool = False,
    interaction_features: bool = False,
) -> Dict[str, Any]:
    """
    labeled items: { "employee_id": str, "churned": bool }
    Builds feature rows for those employees and refits logistic weights.
    """
    if len(labeled) < 5:
        state = default_model_state()
        await save_model_state_doc(db, state)
        return {"ok": True, "message": "Insufficient labels (<5); reset to default weights.", "state": state}

    crit_map = await load_critical_skill_risk_map(db)
    eng = await load_engagement_avg_by_employee_code(db)
    assign_stats = await load_assignment_stats_by_employee_code(db)
    now = datetime.now(timezone.utc)

    rows: List[Tuple[Dict[str, float], float]] = []
    for item in labeled:
        eid = item.get("employee_id")
        y = 1.0 if item.get("churned") else 0.0
        emp = await db.employees.find_one({"id": eid}, {"_id": 0})
        if not emp:
            continue
        code = (emp.get("employee_code") or "").strip()
        ast = assign_stats.get(code, {"open": 0, "done_12m": 0})
        built = build_feature_row(
            emp,
            critical_risk_by_skill_lc=crit_map,
            engagement_avg_rating=eng.get(code),
            open_assignments=int(ast.get("open", 0)),
            completed_assignments_12m=int(ast.get("done_12m", 0)),
            now=now,
            interaction_features_enabled=interaction_features,
        )
        rows.append((built["vector"], y))

    if len(rows) < 5:
        state = default_model_state()
        await save_model_state_doc(db, state)
        return {"ok": True, "message": "Too few matched employees; reset to default.", "state": state}

    state = train_logistic_regression(rows)
    state["interaction_features_enabled"] = interaction_features
    state["ensemble_mode"] = "linear"

    if use_gradient_boosting and sklearn_model.sklearn_available() and len(rows) >= 10:
        try:
            X = [[float(vec.get(k) or 0.0) for k in FEATURE_KEYS] for vec, _y in rows]
            yv = [1.0 if float(y) >= 0.5 else 0.0 for _vec, y in rows]
            if len({int(v) for v in yv}) < 2:
                state["classifier_blob_b64"] = None
                state["gb_skipped_reason"] = "labels must include both churned and not churned"
            else:
                blob = sklearn_model.train_hist_gradient_boosting(X, yv)
                state["classifier_blob_b64"] = sklearn_model.blob_to_b64(blob)
                state["ensemble_mode"] = "gb"
        except Exception as ex:
            state["classifier_blob_b64"] = None
            state["gb_train_error"] = str(ex)[:500]
    else:
        state["classifier_blob_b64"] = None
        if use_gradient_boosting:
            state["gb_skipped_reason"] = (
                "need sklearn and >=10 labels"
                if not sklearn_model.sklearn_available()
                else "need at least 10 labeled rows"
            )

    await save_model_state_doc(db, state)
    return {"ok": True, "message": f"Trained on {len(rows)} rows", "state": state}


# --- Playbooks ---


async def list_playbooks(db: AsyncIOMotorDatabase) -> List[Dict[str, Any]]:
    return await db[COL_RETENTION_PLAYBOOKS].find({}, {"_id": 0}).sort("title", 1).to_list(200)


async def create_playbook(db: AsyncIOMotorDatabase, doc: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    pid = str(uuid.uuid4())
    full = {
        "id": pid,
        "title": doc.get("title", "").strip(),
        "description": doc.get("description") or "",
        "category": (doc.get("category") or "GENERAL").upper(),
        "suggested_duration_days": int(doc.get("suggested_duration_days") or 30),
        "created_at": now,
        "updated_at": now,
    }
    await db[COL_RETENTION_PLAYBOOKS].insert_one(full)
    return full


# --- Interventions ---


async def list_interventions(
    db: AsyncIOMotorDatabase,
    *,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if employee_id:
        q["employee_id"] = employee_id
    if status:
        q["status"] = str(status).upper()
    return await db[COL_RETENTION_INTERVENTIONS].find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


async def create_intervention(
    db: AsyncIOMotorDatabase,
    *,
    employee_id: str,
    playbook_id: str,
    assigned_by: str,
    notes: str = "",
) -> Dict[str, Any]:
    pb = await db[COL_RETENTION_PLAYBOOKS].find_one({"id": playbook_id}, {"_id": 0})
    if not pb:
        raise ValueError("playbook_not_found")
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise ValueError("employee_not_found")

    now = datetime.now(timezone.utc).isoformat()
    iid = str(uuid.uuid4())
    due_days = int(pb.get("suggested_duration_days") or 30)
    doc = {
        "id": iid,
        "employee_id": employee_id,
        "employee_code": emp.get("employee_code"),
        "playbook_id": playbook_id,
        "playbook_title": pb.get("title"),
        "status": "OPEN",
        "outcome": None,
        "notes": notes,
        "timeline": [{"at": now, "type": "CREATED", "note": "Intervention assigned"}],
        "assigned_by": assigned_by,
        "created_at": now,
        "updated_at": now,
        "due_at": (datetime.now(timezone.utc) + timedelta(days=due_days)).isoformat(),
    }
    await db[COL_RETENTION_INTERVENTIONS].insert_one(doc)
    return doc


async def append_timeline_event(
    db: AsyncIOMotorDatabase,
    intervention_id: str,
    *,
    event_type: str,
    note: str,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    ev = {"at": now, "type": str(event_type).upper(), "note": note[:2000]}
    r = await db[COL_RETENTION_INTERVENTIONS].find_one({"id": intervention_id}, {"_id": 0})
    if not r:
        raise ValueError("not_found")
    tl = list(r.get("timeline") or [])
    tl.append(ev)
    await db[COL_RETENTION_INTERVENTIONS].update_one(
        {"id": intervention_id},
        {"$set": {"timeline": tl, "updated_at": now}},
    )
    return await db[COL_RETENTION_INTERVENTIONS].find_one({"id": intervention_id}, {"_id": 0})


async def set_intervention_outcome(
    db: AsyncIOMotorDatabase,
    intervention_id: str,
    *,
    outcome: str,
    note: str = "",
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    oc = str(outcome).upper()
    if oc not in ("RETAINED", "EXITED", "UNKNOWN", "CLOSED"):
        raise ValueError("invalid_outcome")
    r = await db[COL_RETENTION_INTERVENTIONS].find_one({"id": intervention_id}, {"_id": 0})
    if not r:
        raise ValueError("not_found")
    tl = list(r.get("timeline") or [])
    tl.append({"at": now, "type": "OUTCOME", "note": f"{oc}: {note}"[:2000]})
    st = "CLOSED" if oc in ("RETAINED", "EXITED", "UNKNOWN") else r.get("status")
    await db[COL_RETENTION_INTERVENTIONS].update_one(
        {"id": intervention_id},
        {"$set": {"outcome": oc, "status": st, "timeline": tl, "updated_at": now}},
    )
    return await db[COL_RETENTION_INTERVENTIONS].find_one({"id": intervention_id}, {"_id": 0})


async def retention_metrics(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """M8-3: risk-to-save style counts (MVP)."""
    open_n = await db[COL_RETENTION_INTERVENTIONS].count_documents({"status": "OPEN"})
    closed = await db[COL_RETENTION_INTERVENTIONS].find(
        {"outcome": {"$in": ["RETAINED", "EXITED", "UNKNOWN"]}},
        {"_id": 0, "outcome": 1, "employee_id": 1},
    ).to_list(5000)
    retained = sum(1 for x in closed if x.get("outcome") == "RETAINED")
    exited = sum(1 for x in closed if x.get("outcome") == "EXITED")

    high_risk = await db[COL_ATTRITION_SCORES_LATEST].count_documents({"risk_band": "HIGH"})
    high_with_open = await db[COL_RETENTION_INTERVENTIONS].count_documents(
        {"status": "OPEN", "employee_id": {"$exists": True}}
    )

    denom = retained + exited
    save_rate = round(retained / denom, 4) if denom else None

    return {
        "interventions_open": open_n,
        "interventions_closed_retained": retained,
        "interventions_closed_exited": exited,
        "risk_to_save_rate": save_rate,
        "employees_high_attrition_risk_scored": high_risk,
        "open_interventions_count": high_with_open,
    }
