#!/usr/bin/env bash
# MongoDB backup helper for AAI-HRMS (M0).
# Requires: mongodump, tar, shasum or sha256sum
#
# Usage:
#   export MONGO_URL="mongodb://..."
#   export DB_NAME="aai_hrms"
#   optional: export BACKUP_ROOT="./backups"
#   ./mongo_backup.sh
#
set -euo pipefail

: "${MONGO_URL:?Set MONGO_URL}"
: "${DB_NAME:?Set DB_NAME}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-${SCRIPT_DIR}/../../backups/mongo}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="${BACKUP_ROOT}/stage-${TS}"
ARCHIVE_NAME="${DB_NAME}-${TS}.tar.gz"
ARCHIVE_PATH="${BACKUP_ROOT}/${ARCHIVE_NAME}"

mkdir -p "${STAGE}" "${BACKUP_ROOT}"

echo "Dumping database ${DB_NAME} to ${STAGE} ..."
mongodump --uri "${MONGO_URL}" --db "${DB_NAME}" --out "${STAGE}"

echo "Creating archive ${ARCHIVE_PATH} ..."
tar -czf "${ARCHIVE_PATH}" -C "${STAGE}" "${DB_NAME}"
rm -rf "${STAGE}"

if command -v shasum >/dev/null 2>&1; then
  CHECKSUM="$(shasum -a 256 "${ARCHIVE_PATH}" | awk '{print $1}')"
elif command -v sha256sum >/dev/null 2>&1; then
  CHECKSUM="$(sha256sum "${ARCHIVE_PATH}" | awk '{print $1}')"
else
  CHECKSUM="(install shasum or sha256sum for checksum)"
fi

BYTES="$(wc -c < "${ARCHIVE_PATH}" | tr -d ' ')"

META="${ARCHIVE_PATH}.meta.txt"
{
  echo "created_utc=${TS}"
  echo "db_name=${DB_NAME}"
  echo "archive=${ARCHIVE_NAME}"
  echo "bytes=${BYTES}"
  echo "sha256=${CHECKSUM}"
} > "${META}"

echo "Backup complete."
echo "  Archive: ${ARCHIVE_PATH}"
echo "  Meta:    ${META}"
echo "  SHA256:  ${CHECKSUM}"
