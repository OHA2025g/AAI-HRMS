export function collectionBarWidth(count, maxCount) {
  const value = Number(count) || 0;
  const max = Number(maxCount) || 1;
  return `${Math.max(4, Math.round((value / max) * 100))}%`;
}

export function filterCollections(collections, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return collections || [];
  return (collections || []).filter((row) => String(row.name || '').toLowerCase().includes(q));
}

export function previewFlushTargets(collections, { preserveMigrations, preserveCurrentUser }) {
  const protectedNames = new Set();
  if (preserveMigrations) protectedNames.add('_schema_migrations');
  if (preserveCurrentUser) protectedNames.add('users');
  return (collections || []).filter((row) => !protectedNames.has(row.name));
}

export function protectedRecordCount({ preserveMigrations, preserveCurrentUser }) {
  let count = 0;
  if (preserveMigrations) count += 1;
  if (preserveCurrentUser) count += 1;
  return count;
}

export function exportStatsSnapshot(stats) {
  return new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
}
