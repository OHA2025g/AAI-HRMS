#!/usr/bin/env bash
# Create aai-hrms-complete.zip next to the repo folder (or pass -o path).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec python3 "$ROOT/scripts/make_full_bundle.py" "$@"
