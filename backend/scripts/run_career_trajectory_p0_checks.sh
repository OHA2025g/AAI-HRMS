#!/usr/bin/env bash
# P0 checks: unit tests, PDF corpus generate + validate, optional customer PDF dir.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Generate PDF/DOCX fixtures + customer sample dir"
python scripts/generate_pdf_corpus_fixture.py

echo "==> Verify corpus manifest"
python scripts/verify_corpus_manifest.py

echo "==> Validate PDF/text/DOCX corpus (CI includes customer_corpus_sample when present)"
export CI=true
if [[ -z "${CAREER_TRAJECTORY_CUSTOMER_CORPUS_DIR:-}" ]] && [[ -d tests/fixtures/customer_corpus_sample ]]; then
  export CAREER_TRAJECTORY_CUSTOMER_CORPUS_DIR=tests/fixtures/customer_corpus_sample
  echo "    (using bundled customer sample: $CAREER_TRAJECTORY_CUSTOMER_CORPUS_DIR)"
elif [[ -n "${CAREER_TRAJECTORY_CUSTOMER_CORPUS_DIR:-}" ]]; then
  echo "    (including customer dir: $CAREER_TRAJECTORY_CUSTOMER_CORPUS_DIR)"
fi
python scripts/validate_pdf_corpus.py --json-report tests/reports/pdf_corpus_validation.json

echo "==> Career trajectory backend tests"
PYTHONPATH=. pytest -q \
  tests/test_career_trajectory.py \
  tests/test_career_trajectory_api.py \
  tests/test_career_trajectory_pdf.py \
  tests/test_career_trajectory_pdf_corpus.py \
  tests/test_career_trajectory_ops.py \
  tests/test_phase2_fit.py

echo "P0 checks passed."
