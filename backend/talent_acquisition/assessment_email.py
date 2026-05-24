"""Optional SMTP delivery + audit log for assessment invite emails."""

from __future__ import annotations

import logging
import os
import smtplib
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

COL_ASSESSMENT_INVITE_EMAILS = "assessment_invite_emails"


def get_assessment_email_ops_status() -> Dict[str, Any]:
    """Surface production readiness for invite/reminder email delivery."""
    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    public_base = (
        os.environ.get("ASSESSMENT_PUBLIC_BASE_URL")
        or os.environ.get("FRONTEND_URL")
        or os.environ.get("REACT_APP_BACKEND_URL")
        or ""
    ).strip()
    cron_token = os.environ.get("ASSESSMENT_EMAIL_CRON_TOKEN", "").strip()
    cron_base = os.environ.get("ASSESSMENT_EMAIL_BASE_URL", "").strip()
    warnings: list[str] = []
    if not smtp_host:
        warnings.append("SMTP_HOST is not set — invite and reminder emails will queue but not send.")
    if not os.environ.get("ASSESSMENT_PUBLIC_BASE_URL", "").strip():
        warnings.append(
            "ASSESSMENT_PUBLIC_BASE_URL is not set — candidate links may use FRONTEND_URL or localhost."
        )
    if public_base.startswith("http://localhost") or public_base.startswith("http://127.0.0.1"):
        warnings.append(f"Public take URL base looks like a dev host: {public_base or '(empty)'}")
    if not cron_token or not cron_base:
        warnings.append(
            "ASSESSMENT_EMAIL_CRON_TOKEN and/or ASSESSMENT_EMAIL_BASE_URL unset — scheduled email dispatch will not run."
        )
    return {
        "smtp_configured": bool(smtp_host),
        "public_base_url": public_base or None,
        "public_base_url_explicit": bool(os.environ.get("ASSESSMENT_PUBLIC_BASE_URL", "").strip()),
        "cron_configured": bool(cron_token and cron_base),
        "ready_to_send": bool(smtp_host and public_base),
        "warnings": warnings,
    }


def _public_take_url(take_path: str) -> str:
    if take_path.startswith("http"):
        return take_path
    base = (
        os.environ.get("ASSESSMENT_PUBLIC_BASE_URL")
        or os.environ.get("FRONTEND_URL")
        or os.environ.get("REACT_APP_BACKEND_URL")
        or "http://localhost:3001"
    )
    return f"{base.rstrip('/')}{take_path}"


def _smtp_send(to_email: str, subject: str, body: str) -> None:
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        raise RuntimeError("SMTP not configured")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "").strip()
    from_addr = os.environ.get("SMTP_FROM", user or "noreply@aai-hrms.local")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(body)

    with smtplib.SMTP(host, port, timeout=15) as smtp:
        if os.environ.get("SMTP_TLS", "1") not in ("0", "false", "False"):
            smtp.starttls()
        if user and password:
            smtp.login(user, password)
        smtp.send_message(msg)


async def send_assessment_invite_email(
    db,
    *,
    submission_id: str,
    candidate_email: Optional[str],
    candidate_name: str,
    job_title: str,
    assessment_title: str,
    take_path: str,
) -> Dict[str, Any]:
    """Queue and optionally send candidate invite email. Returns {sent, queued, email_id, error}."""
    now = datetime.now(timezone.utc).isoformat()
    email_id = str(uuid.uuid4())
    full_url = _public_take_url(take_path)
    subject = f"Assessment invitation: {assessment_title}"
    body = (
        f"Hello {candidate_name},\n\n"
        f"You have been invited to complete the assessment \"{assessment_title}\" for the role {job_title}.\n\n"
        f"Please use this link to start (expires per recruiter settings):\n{full_url}\n\n"
        f"Good luck,\nHiring Team"
    )

    record: Dict[str, Any] = {
        "id": email_id,
        "submission_id": submission_id,
        "to_email": candidate_email,
        "subject": subject,
        "body": body,
        "take_url": full_url,
        "status": "skipped",
        "error": None,
        "created_at": now,
    }

    if not candidate_email or "@" not in candidate_email:
        record["status"] = "skipped"
        record["error"] = "no_candidate_email"
        await db[COL_ASSESSMENT_INVITE_EMAILS].insert_one(record)
        return {"sent": False, "queued": False, "email_id": email_id, "error": "no_candidate_email"}

    sent = False
    err: Optional[str] = None
    if os.environ.get("SMTP_HOST", "").strip():
        try:
            _smtp_send(candidate_email, subject, body)
            sent = True
            record["status"] = "sent"
        except Exception as exc:
            err = str(exc)
            record["status"] = "failed"
            record["error"] = err
            logger.warning("Assessment invite SMTP failed: %s", exc)
    else:
        record["status"] = "queued"
        logger.info(
            "Assessment invite email queued (SMTP not configured) to=%s submission=%s",
            candidate_email,
            submission_id,
        )

    await db[COL_ASSESSMENT_INVITE_EMAILS].insert_one(record)
    return {"sent": sent, "queued": record["status"] == "queued", "email_id": email_id, "error": err}


async def dispatch_queued_invite_emails(db, *, limit: int = 100) -> Dict[str, Any]:
    """Flush queued invite emails when SMTP becomes available (cron / admin dispatch)."""
    if not os.environ.get("SMTP_HOST", "").strip():
        return {"sent": 0, "failed": 0, "skipped": "smtp_not_configured"}

    rows = (
        await db[COL_ASSESSMENT_INVITE_EMAILS]
        .find({"status": "queued"}, {"_id": 0})
        .sort("created_at", 1)
        .limit(min(limit, 500))
        .to_list(limit)
    )
    sent = failed = 0
    for rec in rows:
        to_email = rec.get("to_email")
        if not to_email:
            continue
        try:
            _smtp_send(to_email, rec.get("subject", ""), rec.get("body", ""))
            await db[COL_ASSESSMENT_INVITE_EMAILS].update_one(
                {"id": rec["id"]},
                {"$set": {"status": "sent", "error": None, "sent_at": datetime.now(timezone.utc).isoformat()}},
            )
            sub_id = rec.get("submission_id")
            if sub_id:
                await db.assessment_submissions.update_one(
                    {"id": sub_id},
                    {
                        "$set": {
                            "candidate_email_sent": True,
                            "candidate_email_queued": False,
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                    },
                )
            sent += 1
        except Exception as exc:
            failed += 1
            await db[COL_ASSESSMENT_INVITE_EMAILS].update_one(
                {"id": rec["id"]},
                {"$set": {"status": "failed", "error": str(exc)}},
            )
    return {"sent": sent, "failed": failed}


async def send_assessment_reminder_email(
    db,
    *,
    submission_id: str,
    candidate_email: Optional[str],
    candidate_name: str,
    job_title: str,
    assessment_title: str,
    take_path: str,
) -> Dict[str, Any]:
    """Reminder for incomplete assessment (queued if SMTP absent)."""
    now = datetime.now(timezone.utc).isoformat()
    email_id = str(uuid.uuid4())
    full_url = _public_take_url(take_path)
    subject = f"Reminder: complete your assessment — {assessment_title}"
    body = (
        f"Hello {candidate_name},\n\n"
        f"This is a reminder to complete \"{assessment_title}\" for {job_title}.\n\n"
        f"Assessment link:\n{full_url}\n\n"
        f"Thank you,\nHiring Team"
    )
    record: Dict[str, Any] = {
        "id": email_id,
        "submission_id": submission_id,
        "to_email": candidate_email,
        "subject": subject,
        "body": body,
        "take_url": full_url,
        "kind": "reminder",
        "status": "skipped",
        "error": None,
        "created_at": now,
    }
    if not candidate_email or "@" not in candidate_email:
        record["status"] = "skipped"
        record["error"] = "no_candidate_email"
        await db[COL_ASSESSMENT_INVITE_EMAILS].insert_one(record)
        return {"sent": False, "queued": False, "email_id": email_id}

    sent = False
    err: Optional[str] = None
    if os.environ.get("SMTP_HOST", "").strip():
        try:
            _smtp_send(candidate_email, subject, body)
            sent = True
            record["status"] = "sent"
        except Exception as exc:
            err = str(exc)
            record["status"] = "failed"
            record["error"] = err
    else:
        record["status"] = "queued"
    await db[COL_ASSESSMENT_INVITE_EMAILS].insert_one(record)
    return {"sent": sent, "queued": record["status"] == "queued", "email_id": email_id, "error": err}
