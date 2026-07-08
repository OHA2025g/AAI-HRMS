"""Phase 2 contextual fit simulation from Phase 1 trajectory report."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def build_phase2_report(
    *,
    candidate_id: str,
    trajectory_report: Dict[str, Any],
    job_id: Optional[str] = None,
    job: Optional[Dict[str, Any]] = None,
    candidate: Optional[Dict[str, Any]] = None,
    manager_employee: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    scores = trajectory_report.get("scores") or {}
    overall_p1 = _score_val(scores, "overall_career_trajectory", 65)
    leadership = _score_val(scores, "leadership_maturity", 60)
    adaptability = _score_val(scores, "adaptability", 58)
    progression = _score_val(scores, "career_progression", 62)
    complexity = _score_val(scores, "project_complexity", 60)
    impact = _score_val(scores, "business_impact", 58)
    retention = _score_val(scores, "retention_risk", 35)
    readiness = _score_val(scores, "future_role_readiness", 62)

    contextual = _clamp(0.45 * overall_p1 + 0.35 * leadership + 0.2 * adaptability)
    manager_fit = _clamp(contextual - 5 + (3 if manager_employee else 0))

    arch = (trajectory_report.get("primary_archetype") or {}).get("name") or "Professional"
    secondary_arch = (trajectory_report.get("secondary_archetype") or {}).get("name")
    manager_name = (manager_employee or {}).get("full_name") or (manager_employee or {}).get("name")
    candidate_name = (candidate or {}).get("full_name") or "Candidate"
    job_title = (job or {}).get("title") or (job or {}).get("normalized_title")
    decision_gate = (trajectory_report.get("decision_gate") or {}).get("category") or "Review"
    gate_reason = (trajectory_report.get("decision_gate") or {}).get("reason") or ""
    p1_summary = trajectory_report.get("executive_summary") or "Phase 1 trajectory indicates steady progression."

    comm_score = _clamp(adaptability + 2)
    leadership_style = _leadership_style(leadership)
    friction = _friction_points(manager_fit, manager_name, leadership_style)

    ctx = {
        "candidate_name": candidate_name,
        "job_title": job_title,
        "job": job,
        "arch": arch,
        "secondary_arch": secondary_arch,
        "decision_gate": decision_gate,
        "gate_reason": gate_reason,
        "p1_summary": p1_summary,
        "overall_p1": overall_p1,
        "leadership": leadership,
        "adaptability": adaptability,
        "progression": progression,
        "complexity": complexity,
        "impact": impact,
        "retention": retention,
        "readiness": readiness,
        "contextual": contextual,
        "manager_fit": manager_fit,
        "manager_name": manager_name,
        "leadership_style": leadership_style,
        "comm_score": comm_score,
        "trajectory_report": trajectory_report,
    }

    insights = _build_insights(ctx)
    recommendations = _build_recommendations(ctx, friction)
    action_items = _build_action_items(ctx, friction)
    next_steps = _build_next_steps(recommendations, action_items, ctx)

    now = datetime.now(timezone.utc).isoformat()
    report_id = str(uuid.uuid4())

    return {
        "id": report_id,
        "candidate_id": candidate_id,
        "job_id": job_id or trajectory_report.get("job_id") or (job or {}).get("id"),
        "trajectory_report_id": trajectory_report.get("id"),
        "created_at": now,
        "updated_at": now,
        "overall_contextual_fit_score": contextual,
        "executive_summary": _executive_summary(ctx),
        "leadership_style": {
            "primary_style": {"name": leadership_style, "confidence": round(min(0.95, 0.55 + leadership / 200), 2)},
            "signals": _leadership_signals(trajectory_report, leadership),
        },
        "communication": {
            "overall_communication_score": comm_score,
            "clarity": _communication_clarity(adaptability, impact),
            "stakeholder_orientation": _stakeholder_orientation(leadership, adaptability),
            "narrative_strengths": _communication_strengths(trajectory_report),
        },
        "manager_fit": {
            "manager_fit_score": manager_fit,
            "risk_level": "Low" if manager_fit >= 70 else "Medium" if manager_fit >= 50 else "High",
            "friction_points": friction,
            "manager_name": manager_name,
            "alignment_summary": _manager_alignment_summary(ctx),
        },
        "insights": insights,
        "recommendations": recommendations,
        "action_items": action_items,
        "recommended_next_steps": next_steps,
    }


def _score_val(scores: Dict[str, Any], key: str, default: float) -> float:
    block = scores.get(key) or {}
    try:
        return float(block.get("score") if isinstance(block, dict) else block or default)
    except (TypeError, ValueError):
        return default


def _clamp(v: float, lo: float = 15.0, hi: float = 98.0) -> float:
    return max(lo, min(hi, v))


def _leadership_style(leadership_score: float) -> str:
    if leadership_score >= 75:
        return "Transformational"
    if leadership_score >= 60:
        return "Collaborative"
    return "Developing"


def _executive_summary(ctx: Dict[str, Any]) -> str:
    role = f" for {ctx['job_title']}" if ctx.get("job_title") else ""
    mgr = (
        f" Hiring manager comparison against {ctx['manager_name']} suggests "
        f"{ctx['manager_fit']:.0f}% working-style alignment."
        if ctx.get("manager_name")
        else " Manager-fit uses the ideal profile for the candidate archetype."
    )
    return (
        f"Phase 2 contextual fit{role}: {ctx['candidate_name']} presents as a {ctx['arch']} profile with "
        f"{ctx['contextual']:.0f}% contextual alignment. Phase 1 overall trajectory was {ctx['overall_p1']:.0f}%; "
        f"leadership maturity {ctx['leadership']:.0f}% and adaptability {ctx['adaptability']:.0f}%. "
        f"Decision gate from Phase 1: {ctx['decision_gate']}.{mgr}"
    )


def _leadership_signals(report: Dict[str, Any], leadership: float) -> List[str]:
    signals: List[str] = []
    for item in (report.get("strengths") or [])[:3]:
        title = (item or {}).get("title")
        if title:
            signals.append(title)
    if leadership >= 70:
        signals.append("Repeated ownership and scope-expansion language in career narrative")
    elif leadership >= 55:
        signals.append("Collaboration and delivery cues; limited explicit people-leadership evidence")
    else:
        signals.append("Individual contributor pattern — validate people-leadership scope before senior hire")
    probes = report.get("recommended_interview_probes") or []
    if probes:
        signals.append(f"Phase 1 flagged {len(probes)} targeted interview probe areas")
    return signals[:5]


def _communication_clarity(adaptability: float, impact: float) -> str:
    if adaptability >= 70 and impact >= 65:
        return "Strong — structured narrative with measurable outcomes and stakeholder context"
    if adaptability >= 55:
        return "Adequate — clear role descriptions; probe for executive-level summarisation"
    return "Developing — may need structured prompts to surface concise business narrative"


def _stakeholder_orientation(leadership: float, adaptability: float) -> str:
    avg = (leadership + adaptability) / 2
    if avg >= 72:
        return "High — cross-functional and stakeholder language present"
    if avg >= 58:
        return "Medium-high — some stakeholder cues; validate breadth in panel"
    return "Medium — confirm influence beyond immediate team"


def _communication_strengths(report: Dict[str, Any]) -> List[str]:
    out: List[str] = []
    for gap in (report.get("missing_evidence") or [])[:2]:
        out.append(f"Gap to probe: {gap}")
    for risk in (report.get("risks") or [])[:2]:
        title = (risk or {}).get("title")
        if title:
            out.append(f"Risk area: {title}")
    if not out:
        out.append("Résumé uses outcome-oriented verbs suitable for structured behavioural interviews")
    return out


def _manager_alignment_summary(ctx: Dict[str, Any]) -> str:
    if ctx.get("manager_name"):
        return (
            f"Compared with {ctx['manager_name']}: {ctx['leadership_style']} candidate style vs "
            f"manager profile yields {ctx['manager_fit']:.0f}% fit. "
            "Focus onboarding on decision rights, feedback cadence, and autonomy boundaries."
        )
    return (
        f"Ideal manager profile for {ctx['arch']} archetype: coaching-oriented, clear on priorities, "
        f"and comfortable with {ctx['leadership_style'].lower()} working style."
    )


def _friction_points(manager_fit: float, manager_name: Optional[str], style: str) -> List[str]:
    if manager_fit >= 70:
        return []
    mgr = f" with {manager_name}" if manager_name else ""
    if manager_fit >= 50:
        return [
            f"May need explicit decision-rights and escalation paths{mgr}",
            f"{style} style may require clearer expectation-setting on pace and autonomy",
        ]
    return [
        f"Working style mismatch risk{mgr} — schedule alignment conversation before offer stage",
        "Consider structured 30/60/90 onboarding with weekly manager checkpoints",
        "Validate appetite for ambiguity vs process-driven environment",
    ]


def _build_insights(ctx: Dict[str, Any]) -> List[Dict[str, Any]]:
    tr = ctx["trajectory_report"]
    timeline = tr.get("career_timeline") or []
    timeline_note = (
        f"{len(timeline)} career segments identified; progression score {ctx['progression']:.0f}%."
        if timeline
        else f"Progression score {ctx['progression']:.0f}% from résumé tenure and scope signals."
    )

    insights: List[Dict[str, Any]] = [
        {
            "id": "ins-career",
            "category": "career_trajectory",
            "title": "Career trajectory supports role scope",
            "summary": (
                f"{ctx['p1_summary']} {timeline_note} "
                f"Future role readiness scored {ctx['readiness']:.0f}%; project complexity {ctx['complexity']:.0f}%."
            ),
            "severity": "info" if ctx["progression"] >= 60 else "medium",
        },
        {
            "id": "ins-leadership",
            "category": "leadership",
            "title": f"{ctx['leadership_style']} leadership pattern",
            "summary": (
                f"Leadership maturity is {ctx['leadership']:.0f}% (Phase 1). Primary archetype: {ctx['arch']}"
                + (f"; secondary pattern: {ctx['secondary_arch']}." if ctx.get("secondary_arch") else ".")
                + " Validate largest team, budget, and decision authority in panel."
            ),
            "severity": "low" if ctx["leadership"] >= 65 else "medium" if ctx["leadership"] >= 50 else "high",
        },
        {
            "id": "ins-communication",
            "category": "communication",
            "title": "Communication & stakeholder presence",
            "summary": (
                f"Communication score {ctx['comm_score']:.0f}% inferred from adaptability ({ctx['adaptability']:.0f}%) "
                f"and business impact language ({ctx['impact']:.0f}%). "
                f"{_communication_clarity(ctx['adaptability'], ctx['impact'])}"
            ),
            "severity": "low" if ctx["comm_score"] >= 68 else "medium",
        },
        {
            "id": "ins-manager",
            "category": "manager_fit",
            "title": "Manager working-style alignment",
            "summary": _manager_alignment_summary(ctx),
            "severity": "low" if ctx["manager_fit"] >= 70 else "medium" if ctx["manager_fit"] >= 50 else "high",
        },
        {
            "id": "ins-contextual",
            "category": "contextual_fit",
            "title": "Contextual fit for target role",
            "summary": (
                f"Overall contextual fit {ctx['contextual']:.0f}% blending trajectory, leadership, and adaptability. "
                + (
                    f"Target role: {ctx['job_title']}. "
                    if ctx.get("job_title")
                    else "No job linked — run simulation from a job context for tighter role fit. "
                )
                + f"Phase 1 gate: {ctx['decision_gate']}"
                + (f" — {ctx['gate_reason']}" if ctx.get("gate_reason") else ".")
            ),
            "severity": "info" if ctx["contextual"] >= 70 else "medium",
        },
        {
            "id": "ins-retention",
            "category": "retention",
            "title": "Retention & tenure risk",
            "summary": (
                f"Retention risk indicator {ctx['retention']:.0f}% from Phase 1 tenure and transition patterns. "
                + (
                    "Elevated — discuss motivators, role scope, and long-term goals early in process."
                    if ctx["retention"] >= 55
                    else "Moderate — confirm compensation, level, and growth path alignment."
                    if ctx["retention"] >= 35
                    else "Lower risk signal — still validate expectations at offer stage."
                )
            ),
            "severity": "high" if ctx["retention"] >= 55 else "medium" if ctx["retention"] >= 35 else "low",
        },
    ]

    for risk in (tr.get("risks") or [])[:2]:
        title = (risk or {}).get("title") or "Evidence gap"
        evidence = (risk or {}).get("evidence") or "Requires validation in interview."
        validation = (risk or {}).get("recommended_validation") or "Use structured behavioural questions."
        insights.append(
            {
                "id": f"ins-risk-{len(insights) + 1}",
                "category": "contextual_fit",
                "title": f"Risk: {title}",
                "summary": f"{evidence} Recommended validation: {validation}",
                "severity": (risk or {}).get("severity") or "medium",
            }
        )

    return insights


def _build_recommendations(ctx: Dict[str, Any], friction: List[str]) -> List[Dict[str, Any]]:
    tr = ctx["trajectory_report"]
    probes = tr.get("recommended_interview_probes") or []
    probe_text = "; ".join(
        f"{(p or {}).get('area', 'Area')}: {(p or {}).get('question', '')}" for p in probes[:3]
    ) or "Use Phase 1 behavioural probes on scope, impact, and career direction."

    recs: List[Dict[str, Any]] = [
        {
            "id": "rec-panel",
            "category": "contextual_fit",
            "title": "Run structured panel on scope and impact",
            "rationale": (
                f"Contextual fit is {ctx['contextual']:.0f}%. Panel should validate claims behind "
                f"complexity ({ctx['complexity']:.0f}%) and business impact ({ctx['impact']:.0f}%) scores. "
                f"Suggested probes: {probe_text}"
            ),
            "priority": "high",
            "audience": "interviewer",
        },
        {
            "id": "rec-hm",
            "category": "manager_fit",
            "title": "Hiring manager alignment interview",
            "rationale": (
                f"Manager fit {ctx['manager_fit']:.0f}% with {ctx['leadership_style']} leadership style. "
                + (
                    " ".join(friction)
                    if friction
                    else "Confirm working norms, feedback style, and decision autonomy match candidate expectations."
                )
            ),
            "priority": "high" if ctx["manager_fit"] < 70 else "medium",
            "audience": "hiring_manager",
        },
        {
            "id": "rec-recruiter",
            "category": "career_trajectory",
            "title": "Calibrate level and compensation expectations",
            "rationale": (
                f"Phase 1 gate: {ctx['decision_gate']}. Recruiter should confirm level, location, "
                f"and compensation band before late-stage interviews. Retention risk {ctx['retention']:.0f}% — "
                "misaligned level is a common drop-off driver."
            ),
            "priority": "medium",
            "audience": "recruiter",
        },
        {
            "id": "rec-refs",
            "category": "leadership",
            "title": "Structured references on people leadership",
            "rationale": (
                f"Leadership maturity {ctx['leadership']:.0f}%. If role requires people management, "
                "obtain references covering team size, performance management, and conflict resolution — "
                "not just delivery outcomes."
            ),
            "priority": "high" if ctx["leadership"] < 60 else "medium",
            "audience": "recruiter",
        },
        {
            "id": "rec-team",
            "category": "communication",
            "title": "Cross-functional stakeholder simulation",
            "rationale": (
                f"Communication score {ctx['comm_score']:.0f}%. Include exercise or case requiring "
                "stakeholder trade-offs, written summary, or executive briefing — especially if role is client-facing."
            ),
            "priority": "medium" if ctx["comm_score"] >= 60 else "high",
            "audience": "hiring_team",
        },
    ]

    if ctx.get("job_title"):
        skills = (ctx.get("job") or {}).get("skills") or []
        skill_names = [
            str(s.get("skill_name")).strip()
            for s in skills[:5]
            if isinstance(s, dict) and s.get("skill_name")
        ]
        if skill_names:
            recs.append(
                {
                    "id": "rec-skills",
                    "category": "contextual_fit",
                    "title": f"Deep-dive must-have skills for {ctx['job_title']}",
                    "rationale": (
                        "Job requires: "
                        + ", ".join(skill_names)
                        + ". Map each to a concrete project example with metrics; flag any must-have gaps before offer."
                    ),
                    "priority": "high",
                    "audience": "interviewer",
                }
            )

    return recs


def _build_action_items(ctx: Dict[str, Any], friction: List[str]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = [
        {
            "id": "act-hm-interview",
            "title": "Schedule hiring manager alignment conversation",
            "detail": (
                f"Cover working style, autonomy, and success metrics for {ctx['job_title'] or 'the role'}. "
                f"Manager fit score: {ctx['manager_fit']:.0f}%."
            ),
            "owner_role": "hiring_manager",
            "timeframe": "within_1_week",
            "status": "open",
            "priority": "high" if ctx["manager_fit"] < 65 else "medium",
        },
        {
            "id": "act-panel",
            "title": "Book panel interview with Phase 1 probe pack",
            "detail": "Use recommended interview probes from Phase 1 trajectory report; score scope, impact, and leadership evidence.",
            "owner_role": "recruiter",
            "timeframe": "within_2_weeks",
            "status": "open",
            "priority": "high",
        },
        {
            "id": "act-refs",
            "title": "Collect leadership and delivery references",
            "detail": (
                f"Minimum two references: one people-leadership, one delivery/technical. "
                f"Leadership maturity baseline: {ctx['leadership']:.0f}%."
            ),
            "owner_role": "recruiter",
            "timeframe": "before_offer",
            "status": "open",
            "priority": "medium" if ctx["leadership"] >= 60 else "high",
        },
        {
            "id": "act-comp",
            "title": "Confirm compensation, level, and start date",
            "detail": (
                f"Align offer band with {ctx['arch']} profile and {ctx['readiness']:.0f}% future-readiness score. "
                f"Retention risk indicator: {ctx['retention']:.0f}%."
            ),
            "owner_role": "recruiter",
            "timeframe": "before_offer",
            "status": "open",
            "priority": "medium",
        },
        {
            "id": "act-onboard",
            "title": "Draft 30/60/90 onboarding plan",
            "detail": (
                "Document decision rights, buddy assignment, and first-quarter outcomes. "
                + (friction[0] if friction else "Tailor to archetype and role scope.")
            ),
            "owner_role": "hiring_manager",
            "timeframe": "after_offer_acceptance",
            "status": "open",
            "priority": "medium",
        },
    ]

    if ctx["retention"] >= 50:
        items.insert(
            1,
            {
                "id": "act-retention",
                "title": "Retention conversation — motivators and career path",
                "detail": (
                    "Discuss long-term goals, role scope, and growth trajectory before final round. "
                    "Address tenure pattern concerns from Phase 1."
                ),
                "owner_role": "hiring_manager",
                "timeframe": "within_1_week",
                "status": "open",
                "priority": "high",
            },
        )

    return items


def _build_next_steps(
    recommendations: List[Dict[str, Any]],
    action_items: List[Dict[str, Any]],
    ctx: Dict[str, Any],
) -> List[str]:
    steps = [
        f"Review Phase 1 decision gate ({ctx['decision_gate']}) with hiring team before advancing.",
        "Complete hiring manager alignment on working style and decision rights.",
        "Execute panel using Phase 1 interview probes; document evidence for complexity and impact claims.",
        "Run references focused on leadership scope and measurable outcomes.",
        "Confirm level, compensation, and start date alignment with candidate expectations.",
    ]
    high_recs = [r["title"] for r in recommendations if r.get("priority") == "high"][:2]
    for title in high_recs:
        if title not in steps:
            steps.append(title)
    return steps[:8]
