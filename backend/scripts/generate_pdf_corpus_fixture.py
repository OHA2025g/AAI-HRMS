#!/usr/bin/env python3
"""
Generate career_trajectory_*.pdf and .docx from matching .txt fixtures; seed customer sample dir.

Usage:
  cd backend && python scripts/generate_pdf_corpus_fixture.py
  python scripts/generate_pdf_corpus_fixture.py career_trajectory_rapid_growth
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
FIXTURES = BACKEND / "tests" / "fixtures"
CUSTOMER_SAMPLE_DIR = FIXTURES / "customer_corpus_sample"


def txt_to_pdf(source_txt: Path, output_pdf: Path) -> None:
    try:
        from fpdf import FPDF
    except ImportError as exc:
        raise RuntimeError("fpdf2 required: pip install fpdf2") from exc

    body = _read_body(source_txt)
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Helvetica", size=10)
    effective_width = pdf.w - pdf.l_margin - pdf.r_margin
    for line in body.splitlines():
        chunk = line.strip() or " "
        pdf.multi_cell(effective_width, 5, chunk)

    output_pdf.write_bytes(pdf.output())


def txt_to_docx(source_txt: Path, output_docx: Path) -> None:
    try:
        from docx import Document
    except ImportError as exc:
        raise RuntimeError("python-docx required") from exc

    body = _read_body(source_txt, latin1_safe=False)
    doc = Document()
    for line in body.splitlines():
        doc.add_paragraph(line.strip() or " ")
    doc.save(str(output_docx))


def _read_body(source_txt: Path, *, latin1_safe: bool = True) -> str:
    body = source_txt.read_text(encoding="utf-8").strip()
    if latin1_safe:
        body = body.replace("\u2022", "-").encode("latin-1", errors="replace").decode("latin-1")
    if len(body) < 80:
        raise ValueError(f"Source text too short: {source_txt}")
    return body


def discover_txt_sources(filter_stem: str | None) -> list[Path]:
    sources = sorted(FIXTURES.glob("career_trajectory_*.txt"))
    if filter_stem:
        sources = [p for p in sources if p.stem == filter_stem or p.stem.endswith(filter_stem)]
    return sources


def seed_customer_corpus_sample() -> None:
    """CI customer-corpus path: mirrors production batch validation wiring."""
    CUSTOMER_SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    rapid_pdf = FIXTURES / "career_trajectory_rapid_growth.pdf"
    rapid_docx = FIXTURES / "career_trajectory_rapid_growth.docx"
    if rapid_pdf.is_file():
        shutil.copy2(rapid_pdf, CUSTOMER_SAMPLE_DIR / "resume_sample.pdf")
    if rapid_docx.is_file():
        shutil.copy2(rapid_docx, CUSTOMER_SAMPLE_DIR / "resume_sample.docx")
    print(f"Seeded customer sample corpus: {CUSTOMER_SAMPLE_DIR}")


def main() -> int:
    filter_stem = sys.argv[1] if len(sys.argv) > 1 else None
    sources = discover_txt_sources(filter_stem)
    if not sources:
        print("No career_trajectory_*.txt fixtures found.", file=sys.stderr)
        return 1

    failed = 0
    for source_txt in sources:
        for ext, writer in ((".pdf", txt_to_pdf), (".docx", txt_to_docx)):
            output = source_txt.with_suffix(ext)
            try:
                writer(source_txt, output)
                print(f"Wrote {output} ({output.stat().st_size} bytes)")
            except Exception as exc:
                print(f"FAIL {source_txt.name} -> {ext}: {exc}", file=sys.stderr)
                failed += 1

    if not filter_stem and failed == 0:
        seed_customer_corpus_sample()

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
