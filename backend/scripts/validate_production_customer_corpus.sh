#!/usr/bin/env bash
# Production customer PDF/DOCX sign-off (P0).
# Requires real customer files — not the bundled customer_corpus_sample.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CORPUS_DIR="${CAREER_TRAJECTORY_CUSTOMER_CORPUS_DIR:-}"
if [[ -z "$CORPUS_DIR" ]]; then
  echo "ERROR: Set CAREER_TRAJECTORY_CUSTOMER_CORPUS_DIR to your production resume directory." >&2
  echo "Example:" >&2
  echo "  export CAREER_TRAJECTORY_CUSTOMER_CORPUS_DIR=/path/to/customer/pdfs" >&2
  echo "  $0" >&2
  exit 1
fi

if [[ ! -d "$CORPUS_DIR" ]]; then
  echo "ERROR: Directory not found: $CORPUS_DIR" >&2
  exit 1
fi

SAMPLE="$ROOT/tests/fixtures/customer_corpus_sample"
if [[ "$(cd "$CORPUS_DIR" && pwd)" == "$(cd "$SAMPLE" 2>/dev/null && pwd)" ]]; then
  echo "ERROR: Production sign-off must not use bundled customer_corpus_sample." >&2
  echo "Point CAREER_TRAJECTORY_CUSTOMER_CORPUS_DIR at real customer exports." >&2
  exit 1
fi

shopt -s nullglob
files=("$CORPUS_DIR"/*.pdf "$CORPUS_DIR"/*.docx "$CORPUS_DIR"/*.txt)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "ERROR: No .pdf, .docx, or .txt files in $CORPUS_DIR" >&2
  exit 1
fi

REPORT="${PRODUCTION_CORPUS_REPORT:-tests/reports/production_pdf_corpus_validation.json}"
mkdir -p "$(dirname "$REPORT")"
export CI=true
python scripts/validate_pdf_corpus.py --json-report "$REPORT" "$CORPUS_DIR"
echo "Production corpus sign-off passed. Report: $REPORT"
