#!/usr/bin/env python3
"""
Validate Smart Hiring assessment email / cron environment for production readiness.

Exit 0 when ready (or warnings-only mode). Exit 1 when --strict and any blocker is present.

Usage (from backend/):
  python scripts/validate_assessment_ops.py
  python scripts/validate_assessment_ops.py --strict
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _load_env() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(BACKEND_DIR / ".env")
    except ImportError:
        pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate assessment ops environment")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit 1 when email delivery is not fully configured",
    )
    args = parser.parse_args()
    _load_env()

    from talent_acquisition.assessment_email import get_assessment_email_ops_status

    status = get_assessment_email_ops_status()
    print("Assessment ops validation")
    print(f"  smtp_configured: {status['smtp_configured']}")
    print(f"  public_base_url: {status.get('public_base_url') or '(empty)'}")
    print(f"  public_base_url_explicit: {status['public_base_url_explicit']}")
    print(f"  cron_configured: {status['cron_configured']}")
    print(f"  ready_to_send: {status['ready_to_send']}")

    warnings = status.get("warnings") or []
    if warnings:
        print("\nWarnings:")
        for w in warnings:
            print(f"  - {w}")
    else:
        print("\nNo configuration warnings.")

    if args.strict and not status.get("ready_to_send"):
        print("\nStrict mode: assessment email delivery is NOT production-ready.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
