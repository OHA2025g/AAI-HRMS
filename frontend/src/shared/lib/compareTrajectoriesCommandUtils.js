import { candidateDisplayName, dedupeCandidatesForDisplay } from './candidateListUtils';

export const MAX_COMPARE_CANDIDATES = 5;

export const RADAR_COLORS = ['#5b4bff', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9'];

export const COMPARE_MATRIX_ROWS = [
  { key: 'overall_score', label: 'Overall trajectory', hasBar: true, emptyInsight: 'Reports not generated' },
  { key: 'career_progression', label: 'Career progression', emptyInsight: 'Run analyzer' },
  { key: 'leadership_maturity', label: 'Leadership maturity', emptyInsight: 'Pending signals' },
  { key: 'project_complexity', label: 'Project complexity', emptyInsight: 'Missing evidence' },
  { key: 'business_impact', label: 'Business impact', emptyInsight: 'Requires CV evidence' },
  { key: 'retention_risk', label: 'Retention risk', emptyInsight: 'Not calculated' },
  { key: 'primary_archetype', label: 'Archetype', isText: true, emptyInsight: 'Pending classification' },
  { key: 'decision_gate', label: 'Decision gate', isText: true, emptyInsight: 'Awaiting reports' },
];

export const RADAR_METRICS = [
  ['overall_score', 'Overall'],
  ['career_progression', 'Progression'],
  ['leadership_maturity', 'Leadership'],
  ['project_complexity', 'Complexity'],
  ['business_impact', 'Impact'],
  ['retention_risk', 'Retention'],
];

export function normalizeTrajectoryReadyCandidates(items) {
  return dedupeCandidatesForDisplay(
    (items || []).map((row) => ({
      id: row.candidate_id || row.id,
      full_name: row.full_name,
      email: row.email,
      headline: row.headline,
      current_role: row.current_role,
      overall_score: row.overall_score,
      primary_archetype: row.primary_archetype,
      report_id: row.report_id,
      hasReport: true,
    }))
  )
    .filter((c) => {
      const label = candidateDisplayName(c);
      return c.id && label.length > 1 && !/^\d+$/.test(label);
    })
    .sort((a, b) => candidateDisplayName(a).localeCompare(candidateDisplayName(b)));
}

export function mergeCandidatePools(readyList, selectList) {
  const map = new Map();
  dedupeCandidatesForDisplay(selectList || []).forEach((c) => {
    map.set(String(c.id), { ...c, hasReport: false });
  });
  (readyList || []).forEach((c) => {
    const id = String(c.id);
    const existing = map.get(id) || {};
    map.set(id, { ...existing, ...c, hasReport: true });
  });
  return Array.from(map.values()).sort((a, b) =>
    candidateDisplayName(a).localeCompare(candidateDisplayName(b))
  );
}

export function candidateSubtitle(candidate) {
  if (!candidate) return '';
  const parts = [];
  if (candidate.headline) parts.push(candidate.headline);
  else if (candidate.current_role) parts.push(candidate.current_role);
  if (candidate.email && parts.length === 0) parts.push(candidate.email);
  return parts.join(' · ') || 'Talent pool candidate';
}

export function computeCompareKpis(selectedIds, summaries) {
  const selected = selectedIds.length;
  const withReports = selectedIds.filter((id) => summaries[id]).length;
  const missing = selected - withReports;
  const scores = selectedIds
    .map((id) => summaries[id]?.overall_score)
    .filter((v) => v != null);
  const avg =
    scores.length > 0
      ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%`
      : '—';
  let bestFit = 'Pending';
  if (scores.length > 0) {
    const bestId = selectedIds.reduce((best, id) => {
      const s = summaries[id]?.overall_score;
      if (s == null) return best;
      if (!best || s > summaries[best]?.overall_score) return id;
      return best;
    }, null);
    if (bestId && summaries[bestId]?.primary_archetype) {
      bestFit = summaries[bestId].primary_archetype;
    } else if (bestId) {
      bestFit = `${Math.round(summaries[bestId].overall_score)}%`;
    }
  }
  return {
    selected,
    withReports,
    missing,
    avg,
    bestFit,
    readyLabel: selected > 0 ? 'Ready for comparison' : 'Add candidates to begin',
    reportsDelta: missing > 0 ? `${missing} missing report${missing === 1 ? '' : 's'}` : 'All reports ready',
    avgDelta: scores.length > 0 ? 'Across selected candidates' : 'Run analysis to populate',
    bestDelta: scores.length > 0 ? 'Top trajectory signal' : 'Awaiting trajectory analysis',
  };
}

export function matrixCellValue(summary, row) {
  if (!summary) return '—';
  const val = summary[row.key];
  if (val == null || val === '') return '—';
  if (row.isText) {
    if (row.key === 'decision_gate') return String(val).split(':')[0];
    return String(val);
  }
  return `${Math.round(val)}%`;
}

export function matrixInsight(row, selectedIds, summaries) {
  const hasAny = selectedIds.some((id) => summaries[id]);
  if (!hasAny) return row.emptyInsight;
  if (row.key === 'overall_score') {
    const vals = selectedIds.map((id) => summaries[id]?.overall_score).filter((v) => v != null);
    if (!vals.length) return row.emptyInsight;
    const spread = Math.max(...vals) - Math.min(...vals);
    if (spread >= 15) return 'Clear leader on overall trajectory';
    if (spread >= 5) return 'Moderate score spread';
    return 'Similar overall readiness';
  }
  if (row.key === 'retention_risk') {
    const vals = selectedIds.map((id) => summaries[id]?.retention_risk).filter((v) => v != null);
    if (!vals.length) return row.emptyInsight;
    return `Range ${Math.round(Math.min(...vals))}–${Math.round(Math.max(...vals))}%`;
  }
  if (row.isText) return 'Compared across candidates';
  const vals = selectedIds.map((id) => summaries[id]?.[row.key]).filter((v) => v != null);
  if (!vals.length) return row.emptyInsight;
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  if (max - min >= 12) return 'Notable gap between candidates';
  return 'Comparable signals';
}

export function buildRankingRows(selectedIds, summaries, nameById) {
  return selectedIds
    .map((id) => ({
      id,
      name: nameById[id] || id,
      score: summaries[id]?.overall_score,
    }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

export function exportComparisonCsv(selectedIds, summaries, nameById) {
  const headers = ['Metric', ...selectedIds.map((id) => nameById[id] || id), 'Insight'];
  const rows = COMPARE_MATRIX_ROWS.map((row) => [
    row.label,
    ...selectedIds.map((id) => matrixCellValue(summaries[id], row)),
    matrixInsight(row, selectedIds, summaries),
  ]);
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
}
