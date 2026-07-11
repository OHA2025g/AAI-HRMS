/** Normalize drill-down query values from Executive KPI → target pages. */

const CANDIDATE_SOURCE_VALUES = new Set([
  'DIRECT_UPLOAD',
  'LINKEDIN',
  'NAUKRI',
  'INDEED',
  'REFERRAL',
  'TALENT_POOL',
  'IMPORT',
  'UNKNOWN',
]);

export function normalizeCandidateSourceParam(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return null;
  if (CANDIDATE_SOURCE_VALUES.has(s)) return s;
  if (s === 'TALENT POOL') return 'TALENT_POOL';
  return s;
}

/** Dashboard display channels → candidates API filter */
export function normalizeDisplayChannelParam(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (['talent_pool_ex', 'talent_pool', 'talent_pool_all', 'all_talent_pool', 'linkedin', 'other'].includes(s)) return s;
  return null;
}

export function normalizeSkillParam(raw) {
  const s = String(raw || '').trim();
  return s || null;
}

export function normalizeEmployeeCodeParam(raw) {
  const s = String(raw || '').trim();
  return s || null;
}

const SENTIMENT_VALUES = new Set(['POSITIVE', 'NEUTRAL', 'NEGATIVE']);

export function normalizeSentimentParam(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return null;
  if (SENTIMENT_VALUES.has(s)) return s;
  if (s === 'POS') return 'POSITIVE';
  if (s === 'NEG') return 'NEGATIVE';
  return null;
}

/** Match ESE sentiment rows (labels may be lower or upper case). */
export function sentimentLabelMatches(rowLabel, normalizedUpper) {
  if (!normalizedUpper) return true;
  return String(rowLabel || '').trim().toUpperCase() === normalizedUpper;
}
