#!/usr/bin/env python3
"""Fail if expected career trajectory corpus files are missing after generate."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
FIXTURES = BACKEND / "tests" / "fixtures"
CUSTOMER = FIXTURES / "customer_corpus_sample"

STEMS = [
    "career_trajectory_rapid_growth",
    "career_trajectory_stable_builder",
    "career_trajectory_deep_specialist",
    "career_trajectory_transformation_driver",
    "career_trajectory_high_mobility",
]


def main() -> int:
    missing: list[str] = []
    for stem in STEMS:
        for ext in (".txt", ".pdf", ".docx"):
            path = FIXTURES / f"{stem}{ext}"
            if not path.is_file() or path.stat().st_size < 50:
                missing.append(str(path.relative_to(BACKEND)))
    for name in ("resume_sample.pdf", "resume_sample.docx"):
        path = CUSTOMER / name
        if not path.is_file():
            missing.append(str(path.relative_to(BACKEND)))
    if missing:
        print("Missing corpus files (run generate_pdf_corpus_fixture.py):", file=sys.stderr)
        for m in missing:
            print(f"  - {m}", file=sys.stderr)
        return 1
    print(f"Corpus manifest OK ({len(STEMS) * 3 + 2} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
