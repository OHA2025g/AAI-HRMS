"""
M7-2: Hugging Face zero-shot intent classification aligned with rule-based intents.

Uses the Hugging Face **Inference API** (no local torch). When `HUGGINGFACE_API_TOKEN`
is set, messages that the keyword rules classify as `unknown` are sent to a
zero-shot NLI model; labels are phrased to match `copilot_intent.detect_intent` routes.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

import httpx

from m7_automation.constants import HR_COPILOT_HF_DEFAULT_MODEL
from m7_automation.copilot_intent import detect_intent

logger = logging.getLogger(__name__)

# Natural-language hypotheses for zero-shot NLI → maps to handler branch keys.
_ZERO_SHOT_PAIRS: List[Tuple[str, str]] = [
    (
        "The user is asking what the assistant can do, for capabilities, or for help using the copilot.",
        "help",
    ),
    (
        "The user wants metrics or health about HR automation, lifecycle event backlog, pending or failed jobs.",
        "automation_status",
    ),
    (
        "The user wants to reprocess, rerun, replay, or unstick employee lifecycle events or queue processing.",
        "reprocess_lifecycle",
    ),
    (
        "The user wants to look up, find, or search for an employee record or profile by code or name.",
        "employee_lookup",
    ),
    (
        "The user is asking about workflow automation rules, scheduled automations, or rule configuration.",
        "workflow_rules",
    ),
]


def _hf_token() -> Optional[str]:
    return (os.environ.get("HUGGINGFACE_API_TOKEN") or os.environ.get("HF_TOKEN") or "").strip() or None


def _hf_model() -> str:
    return (os.environ.get("HR_COPILOT_HF_MODEL") or HR_COPILOT_HF_DEFAULT_MODEL).strip()


def _hf_min_score() -> float:
    try:
        return max(0.0, min(1.0, float(os.environ.get("HR_COPILOT_HF_MIN_SCORE", "0.35"))))
    except ValueError:
        return 0.35


def _hf_enabled() -> bool:
    v = (os.environ.get("HR_COPILOT_HF_ENABLED") or "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def _inference_urls(model: str) -> List[str]:
    return [
        f"https://router.huggingface.co/hf-inference/models/{model}",
        f"https://api-inference.huggingface.co/models/{model}",
    ]


def _parse_zero_shot_response(data: Any) -> Tuple[List[str], List[float]]:
    if isinstance(data, list) and data:
        data = data[0]
    if not isinstance(data, dict):
        return [], []
    lbls = data.get("labels")
    scores = data.get("scores")
    if isinstance(lbls, list) and isinstance(scores, list) and len(lbls) == len(scores):
        return [str(x) for x in lbls], [float(x) for x in scores]
    return [], []


async def _call_zero_shot(message: str, *, model: str, token: str) -> Tuple[str, float]:
    """Returns (top_intent_key, top_score)."""
    nl_labels = [pair[0] for pair in _ZERO_SHOT_PAIRS]
    intent_by_nl = {pair[0]: pair[1] for pair in _ZERO_SHOT_PAIRS}
    payload = {
        "inputs": message,
        "parameters": {"candidate_labels": nl_labels, "multi_label": False},
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    last_err: Optional[Exception] = None

    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
        for url in _inference_urls(model):
            for attempt in range(2):
                try:
                    r = await client.post(url, json=payload, headers=headers)
                    if r.status_code == 503 and attempt == 0:
                        await asyncio.sleep(2.0)
                        continue
                    r.raise_for_status()
                    labels_out, scores_out = _parse_zero_shot_response(r.json())
                    if not labels_out:
                        last_err = ValueError("empty labels from HF")
                        break
                    top_lbl = labels_out[0]
                    top_score = scores_out[0]
                    return intent_by_nl.get(top_lbl, "unknown"), top_score
                except Exception as e:
                    last_err = e
                    await asyncio.sleep(0.5)

    if last_err:
        logger.warning("HF zero-shot inference failed: %s", last_err)
    return "unknown", 0.0


async def resolve_copilot_intent_async(message: str) -> Tuple[str, Dict[str, Any]]:
    """
    Resolve intent: keyword rules first; if `unknown`, optionally Hugging Face zero-shot.

    Returns (intent, metadata) for audit / API extras.
    """
    rule_intent = detect_intent(message)
    meta: Dict[str, Any] = {
        "intent_source": "rules",
        "rule_intent": rule_intent,
    }

    if rule_intent != "unknown":
        meta["intent_final"] = rule_intent
        return rule_intent, meta

    if not _hf_enabled() or not _hf_token():
        meta["intent_final"] = "unknown"
        meta["hf_skipped"] = "disabled_or_no_token"
        return "unknown", meta

    model = _hf_model()
    try:
        hf_intent, score = await _call_zero_shot(message.strip(), model=model, token=_hf_token() or "")
    except Exception as e:
        logger.warning("HF copilot classification error: %s", e)
        meta["intent_final"] = "unknown"
        meta["hf_error"] = str(e)[:300]
        return "unknown", meta

    meta["intent_source"] = "huggingface"
    meta["hf_model"] = model
    meta["hf_top_score"] = round(score, 4)
    meta["hf_raw_intent"] = hf_intent

    min_score = _hf_min_score()
    if hf_intent != "unknown" and score >= min_score:
        meta["intent_final"] = hf_intent
        return hf_intent, meta

    meta["intent_final"] = "unknown"
    meta["hf_below_threshold"] = min_score
    return "unknown", meta
