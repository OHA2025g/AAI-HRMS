#!/usr/bin/env python3
"""Spot-check PDF text extraction (pdfplumber + PyPDF2 fallback)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow running from repo root or backend/
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from career_trajectory.parser import extract_text_from_bytes, _pdf_text_pdfplumber, _pdf_text_pypdf  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Spot-check CV PDF parsing")
    parser.add_argument("pdf_path", type=Path, help="Path to a resume PDF")
    args = parser.parse_args()
    path = args.pdf_path
    if not path.is_file():
        print(f"File not found: {path}", file=sys.stderr)
        return 1
    raw = path.read_bytes()
    plumber = _pdf_text_pdfplumber(raw)
    pypdf = _pdf_text_pypdf(raw)
    merged = extract_text_from_bytes(raw, path.name)
    print(f"pdfplumber chars: {len(plumber.strip())}")
    print(f"pypdf chars:      {len(pypdf.strip())}")
    print(f"merged chars:     {len(merged.strip())}")
    print("--- merged preview (first 800 chars) ---")
    print(merged[:800])
    ok = len(merged.strip()) >= 80
    print("PASS" if ok else "FAIL (merged text too short)")
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
