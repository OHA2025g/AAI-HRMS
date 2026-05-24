#!/usr/bin/env python3
"""
Batch-validate PDF/text extraction for career trajectory parsing.

Usage:
  cd backend && python scripts/validate_pdf_corpus.py
  python scripts/validate_pdf_corpus.py /path/to/resumes/*.pdf
  python scripts/validate_pdf_corpus.py --json-report tests/reports/pdf_corpus_validation.json
  CAREER_TRAJECTORY_CUSTOMER_CORPUS_DIR=/path/to/customer/pdfs python scripts/validate_pdf_corpus.py

Exit code 0 if all files pass minimum char threshold; 1 otherwise.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from career_trajectory.parser import extract_text_from_bytes  # noqa: E402
from career_trajectory.report_generator import analyze_resume_text  # noqa: E402

FIXTURES = BACKEND / "tests" / "fixtures"
CUSTOMER_SAMPLE_DIR = FIXTURES / "customer_corpus_sample"
MIN_CHARS = 80
DEFAULT_JSON_REPORT = BACKEND / "tests" / "reports" / "pdf_corpus_validation.json"


def validate_file(path: Path) -> tuple[bool, str, dict]:
    raw = path.read_bytes()
    text = extract_text_from_bytes(raw, path.name)
    n = len(text.strip())
    meta: dict = {"chars": n, "overall_score": None}
    if n < MIN_CHARS:
        return False, f"extracted only {n} chars (min {MIN_CHARS})", meta
    try:
        report = analyze_resume_text(text, candidate_id=f"corpus-{path.stem}")
        overall = (report.get("scores") or {}).get("overall_career_trajectory", {}).get("score")
        if overall is None:
            return False, "analyze produced no overall score", meta
        meta["overall_score"] = overall
    except Exception as e:
        return False, f"analyze failed: {e}", meta
    return True, f"ok ({n} chars, overall={overall:.0f})", meta


def write_json_report(results: list[dict], report_path: Path) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "min_chars": MIN_CHARS,
        "total": len(results),
        "passed": sum(1 for r in results if r["ok"]),
        "failed": sum(1 for r in results if not r["ok"]),
        "files": results,
    }
    report_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote report: {report_path}")


def main() -> int:
    paths: list[Path] = []
    json_report_path: Path | None = None

    args = [a for a in sys.argv[1:] if a]
    i = 0
    while i < len(args):
        arg = args[i]
        if arg == "--json-report":
            next_arg = args[i + 1] if i + 1 < len(args) else None
            if next_arg and not next_arg.startswith("-"):
                json_report_path = Path(next_arg)
                i += 2
                continue
            json_report_path = DEFAULT_JSON_REPORT
            i += 1
            continue
        if arg.startswith("--json-report="):
            json_report_path = Path(arg.split("=", 1)[1])
            i += 1
            continue
        p = Path(arg)
        if p.is_dir():
            paths.extend(sorted(p.glob("**/*.pdf")))
            paths.extend(sorted(p.glob("**/*.txt")))
        else:
            paths.append(p)
        i += 1

    if not paths:
        paths = sorted(FIXTURES.glob("career_trajectory_*.txt"))
        paths.extend(sorted(FIXTURES.glob("career_trajectory_*.pdf")))
        paths.extend(sorted(FIXTURES.glob("career_trajectory_*.docx")))

    customer_dir = os.environ.get("CAREER_TRAJECTORY_CUSTOMER_CORPUS_DIR", "").strip()
    if not customer_dir and os.environ.get("CI", "").lower() in ("1", "true", "yes"):
        if CUSTOMER_SAMPLE_DIR.is_dir() and any(CUSTOMER_SAMPLE_DIR.iterdir()):
            customer_dir = str(CUSTOMER_SAMPLE_DIR)
    if customer_dir:
        customer_path = Path(customer_dir)
        if not customer_path.is_dir():
            print(f"Customer corpus dir not found: {customer_path}", file=sys.stderr)
            return 1
        extra = sorted(customer_path.glob("**/*.pdf"))
        extra.extend(sorted(customer_path.glob("**/*.docx")))
        extra.extend(sorted(customer_path.glob("**/*.txt")))
        seen = {p.resolve() for p in paths}
        for p in extra:
            resolved = p.resolve()
            if resolved not in seen:
                paths.append(p)
                seen.add(resolved)
        print(f"Including {len(extra)} file(s) from customer corpus: {customer_path}")

    if os.environ.get("CI", "").lower() in ("1", "true", "yes") and json_report_path is None:
        json_report_path = DEFAULT_JSON_REPORT

    if not paths:
        print("No files to validate.")
        return 1

    failed = 0
    report_rows: list[dict] = []
    for path in paths:
        ok, msg, meta = validate_file(path)
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] {path.name}: {msg}")
        report_rows.append(
            {
                "file": str(path),
                "name": path.name,
                "ok": ok,
                "message": msg,
                **meta,
            }
        )
        if not ok:
            failed += 1

    print(f"\n{len(paths) - failed}/{len(paths)} passed")

    if json_report_path:
        write_json_report(report_rows, json_report_path)

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
