/** Service / QA accounts on @aai-hrms.local — not AI-generated candidates. */
const HRMS_LOCAL_ADMIN_EMAILS = new Set([
  'qa_admin@aai-hrms.local',
  'qa.employee@aai-hrms.local',
  'excel.import.admin@aai-hrms.local',
  'seed.admin@aai-hrms.local',
]);

const TALENT_POOL_BADGE = {
  label: 'Talent Pool',
  className: 'bg-emerald-100 text-emerald-800',
};

const LINKEDIN_BADGE = {
  label: 'LinkedIn',
  className: 'bg-blue-100 text-blue-700',
};

/** Excel import, bulk DB seed, or explicit talent-pool source. */
export function isTalentPoolCandidate(candidate) {
  if (!candidate) return false;
  const source = String(candidate.source || '').trim().toUpperCase();
  const marker = String(candidate.seed_marker || '').trim();
  if (marker === 'excel_candidates_v1') return true;
  if (candidate.import_source_file || candidate.import_stable_id) return true;
  if (source === 'TALENT_POOL' || source === 'EXCEL_IMPORT' || source === 'BULK_SEED') return true;
  return false;
}

/**
 * AI-generated fit/demo candidates (fit seeds, demo generator, job posting fit seed).
 * Shown as LinkedIn — not the pipeline stage "SOURCED".
 */
export function isAiGeneratedCandidate(candidate) {
  if (!candidate) return false;
  if (isTalentPoolCandidate(candidate)) return false;

  const source = String(candidate.source || '').trim().toUpperCase();
  const marker = String(candidate.seed_marker || '').trim();
  const email = String(candidate.email || '').trim().toLowerCase();

  if (marker === 'job_posting_fit_candidates_v1') return true;
  if (candidate.seed_job_id != null && candidate.seed_slot != null) return true;
  if (source === 'FIT_SEED' || source === 'DEMO') return true;
  if (email.startsWith('fitseed.') && email.endsWith('@aai-hrms.local')) return true;
  if (email.endsWith('@aai-hrms.local') && !HRMS_LOCAL_ADMIN_EMAILS.has(email)) return true;
  if (source === 'LINKEDIN' && (email.includes('fitseed') || email.endsWith('@aai-hrms.local'))) {
    return true;
  }
  return false;
}

/** @deprecated use isAiGeneratedCandidate */
export function isAiGeneratedAaiHrmsCandidate(candidate) {
  return isAiGeneratedCandidate(candidate);
}

export function getSourceBadgeClass(source) {
  switch (String(source || '').toUpperCase()) {
    case 'LINKEDIN':
      return LINKEDIN_BADGE.className;
    case 'TALENT_POOL':
    case 'EXCEL_IMPORT':
    case 'BULK_SEED':
      return TALENT_POOL_BADGE.className;
    case 'REFERRAL':
      return 'bg-amber-100 text-amber-700';
    case 'NAUKRI':
      return 'bg-purple-100 text-purple-700';
    case 'INDEED':
      return 'bg-indigo-100 text-indigo-700';
    case 'DIRECT_UPLOAD':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

/** Profile header / card corner badge — source tag overrides pipeline stage when recognized. */
export function getCandidateDisplaySource(candidate) {
  if (isTalentPoolCandidate(candidate)) return { ...TALENT_POOL_BADGE };
  if (isAiGeneratedCandidate(candidate)) return { ...LINKEDIN_BADGE };
  const source = String(candidate?.source || '').trim().toUpperCase();
  if (source && source !== 'DIRECT_UPLOAD') {
    return {
      label: formatSourceLabel(source),
      className: getSourceBadgeClass(source),
    };
  }
  return null;
}

/** Top-right card badge: Talent Pool / LinkedIn / connector source; else pipeline stage. */
export function getCandidateCardBadge(candidate, stage, stageBadgeMap = {}) {
  const sourceBadge = getCandidateDisplaySource(candidate);
  if (sourceBadge) return sourceBadge;

  const key = stage || '';
  return {
    label: key ? String(key).replace(/_/g, ' ') : 'TALENT POOL',
    className: stageBadgeMap[key] || 'bg-slate-100 text-slate-700',
  };
}

export function formatSourceLabel(source) {
  if (!source) return 'Other';
  const s = String(source).toUpperCase();
  if (s === 'LINKEDIN') return 'LinkedIn';
  if (s === 'TALENT_POOL' || s === 'EXCEL_IMPORT' || s === 'BULK_SEED') return 'Talent Pool';
  return String(source).replace(/_/g, ' ');
}
