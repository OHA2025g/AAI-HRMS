#!/usr/bin/env bash
# MongoDB restore helper for AAI-HRMS (M0).
# Requires: mongorestore, tar
#
# Usage:
#   export MONGO_URL="mongodb://..."
#   export DB_NAME="aai_hrms"
#   ./mongo_restore.sh /path/to/aai_hrms-20250101T120000Z.tar.gz
#
# WARNING: Uses --drop on the target database. Confirm environment and approvals first.
#
set -euo pipefail

: "${MONGO_URL:?Set MONGO_URL}"
: "${DB_NAME:?Set DB_NAME}"
: "${1:?Usage: $0 <path-to-backup.tar.gz>}"

ARCHIVE="$1"
if [[ ! -f "${ARCHIVE}" ]]; then
  echo "Archive not found: ${ARCHIVE}" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

echo "Extracting ${ARCHIVE} ..."
tar -xzf "${ARCHIVE}" -C "${TMP}"

DUMP_DIR="${TMP}/${DB_NAME}"
if [[ ! -d "${DUMP_DIR}" ]]; then
  echo "Expected dump directory missing: ${DUMP_DIR}" >&2
  echo "Archive layout may differ; list contents:" >&2
  find "${TMP}" -maxdepth 3 -type d >&2 || true
  exit 1
fi

echo "Restoring into database ${DB_NAME} with --drop ..."
mongorestore --uri "${MONGO_URL}" --drop --db "${DB_NAME}" "${DUMP_DIR}"

echo "Restore finished. Validate /api/health and spot-check collections."
