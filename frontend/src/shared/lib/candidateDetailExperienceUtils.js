import { buildAiInsight } from './candidatesCommandUtils';
import { deriveCurrentRole, fmtField } from './candidateDetailOverviewUtils';
import { formatTenure, normalizeExperienceList } from './experienceParser';

const MERGED_ID_PATTERN = /\d{8,}/;
const MERGED_ALPHA_NUM = /[A-Za-z]\d{6,}/;

const SKILL_SIGNALS = [
  { key: 'Research', patterns: [/research/i] },
  { key: 'Analytics', patterns: [/analytics/i, /analy(?:sis|tical|ze)/i, /data analysis/i] },
  { key: 'Reporting', patterns: [/report/i] },
  { key: 'R&D', patterns: [/r\s*&\s*d/i, /research and development/i] },
  { key: 'Quality', patterns: [/quality/i, /production monitoring/i] },
];

function experienceTextBlob(experience = []) {
  return experience
    .map((exp) =>
      [exp?.title, exp?.company, exp?.description, ...(exp?.bullets || [])]
        .filter(Boolean)
        .join(' ')
    )
    .join(' ');
}

function isPresentEnd(endDate) {
  const s = String(endDate || '').trim().toLowerCase();
  return !s || s.includes('present') || s.includes('current');
}

function sortKey(exp) {
  const end = String(exp?.end_date || '').trim();
  const start = String(exp?.start_date || '').trim();
  if (isPresentEnd(end)) return '9999-12';
  if (/^\d{4}-\d{2}$/.test(end)) return end;
  if (/^\d{4}-\d{2}$/.test(start)) return start;
  return '0000-01';
}

export function sortExperienceTimeline(experience = [], newestFirst = true) {
  const sorted = [...experience].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return newestFirst ? sorted : [...sorted].reverse();
}

export function assessExperienceRecord(exp) {
  const company = String(exp?.company || '').trim();
  const title = String(exp?.title || '').trim();
  const start = String(exp?.start_date || '').trim();
  const end = String(exp?.end_date || '').trim();
  const raw = `${company} ${title} ${exp?.description || ''} ${(exp?.bullets || []).join(' ')}`;

  const issues = [];
  if (!company) issues.push('missing_employer');
  if (!start && !end) issues.push('missing_dates');
  if (MERGED_ID_PATTERN.test(raw) || MERGED_ALPHA_NUM.test(raw)) issues.push('merged_text');

  let status = 'clean';
  let qualityLabel = 'Clean record';
  let dotClass = '';
  let chipLabel = null;
  let subtext = null;

  if (issues.includes('merged_text')) {
    status = 'review';
    qualityLabel = 'Title/company mixed';
    dotClass = 'warn';
    chipLabel = 'Needs review';
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 72);
    subtext = snippet ? `Original text appears merged: "${snippet}..."` : null;
  } else if (issues.includes('missing_employer')) {
    status = 'review';
    qualityLabel = 'Employer/date missing';
    dotClass = 'warn';
    chipLabel = 'Incomplete';
    subtext = 'Employer name was not captured cleanly from resume/profile data.';
  } else if (issues.includes('missing_dates')) {
    status = 'review';
    qualityLabel = 'Employer/date missing';
    dotClass = 'warn';
  }

  return { status, qualityLabel, dotClass, chipLabel, subtext, issues };
}

export function enrichExperienceRecord(exp, index) {
  const assessment = assessExperienceRecord(exp);
  const bullets =
    Array.isArray(exp?.bullets) && exp.bullets.length
      ? exp.bullets
      : String(exp?.description || '')
          .split(/\n|•/)
          .map((s) => s.replace(/^[\s\-*]+/, '').trim())
          .filter((s) => s.length > 12);

  const skills = extractRecordSkills(exp, bullets);

  return {
    ...exp,
    id: `${exp?.title || 'role'}-${exp?.company || 'company'}-${index}`,
    bullets,
    skills,
    durationLabel: formatTenure(exp?.start_date, exp?.end_date) || 'N/A – Present',
    ...assessment,
  };
}

function extractRecordSkills(exp, bullets = []) {
  const text = `${exp?.title || ''} ${exp?.company || ''} ${bullets.join(' ')}`.toLowerCase();
  const found = [];
  const catalog = [
    ['Data Analysis', /data analysis|analytics|analy/i],
    ['Research', /research/i],
    ['Reporting', /report/i],
    ['Stakeholder Communication', /stakeholder|communication/i],
    ['R&D', /r\s*&\s*d|research and development/i],
    ['Machinery Design', /machinery|design/i],
    ['Prototype Testing', /prototype|testing/i],
    ['Manufacturing Support', /manufacturing|production/i],
    ['Quality Checks', /quality check/i],
    ['Production Monitoring', /production monitor/i],
    ['Process Improvement', /process improvement/i],
  ];
  for (const [label, pattern] of catalog) {
    if (pattern.test(text)) found.push(label);
  }
  return found.slice(0, 6);
}

export function computeExperienceRecordsSummary(experience = []) {
  const enriched = experience.map((exp, i) => enrichExperienceRecord(exp, i));
  const clean = enriched.filter((e) => e.status === 'clean').length;
  const review = enriched.length - clean;
  return { enriched, clean, review, total: enriched.length };
}

export function computeDataQualityScore(experience = []) {
  if (!experience.length) return 0;
  let score = 0;
  for (const exp of experience) {
    let row = 0;
    if (String(exp?.title || '').trim()) row += 25;
    if (String(exp?.company || '').trim()) row += 25;
    if (String(exp?.start_date || '').trim() || String(exp?.end_date || '').trim()) row += 25;
    const bullets = exp?.bullets?.length || String(exp?.description || '').length > 20;
    if (bullets) row += 25;
    score += row;
  }
  return Math.round(score / experience.length);
}

export function aiConfidenceLabel(score) {
  if (score >= 85) return 'High';
  if (score >= 60) return 'Medium';
  return 'Low';
}

export function computeExperienceKpis(profile) {
  const experience = normalizeExperienceList(profile?.experience);
  const { clean, review, total } = computeExperienceRecordsSummary(experience);
  const currentRole = deriveCurrentRole(profile);
  const dataQuality = computeDataQualityScore(experience);
  const aiConfidence = aiConfidenceLabel(dataQuality);

  const yrs = profile?.total_experience_years;
  let totalExperienceLabel = '—';
  if (yrs != null && !Number.isNaN(Number(yrs))) {
    const n = Number(yrs);
    totalExperienceLabel = `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} yrs`;
  }

  const currentTenure =
    experience.find((e) => isPresentEnd(e?.end_date)) ||
    experience[0] ||
    null;
  const currentDates = currentTenure
    ? formatTenure(currentTenure.start_date, currentTenure.end_date)
    : null;

  return {
    totalExperienceLabel,
    recordCount: total,
    recordNote:
      total > 0 ? `${clean} clean · ${review} need review` : 'No records extracted yet',
    currentRoleTitle: fmtField(currentRole.title).replace('—', 'Unknown'),
    currentRoleDates: currentDates || 'Dates pending',
    dataQuality,
    dataQualityNote:
      review > 0 ? 'Company/title mix detected' : total > 0 ? 'Structured records look clean' : 'Upload resume to populate',
    aiConfidence,
    aiConfidenceNote:
      dataQuality >= 85
        ? 'History looks reliable'
        : dataQuality >= 60
          ? 'Validate extracted history'
          : 'Limited structured history',
    cleanCount: clean,
    reviewCount: review,
  };
}

export function experienceKpiStripItems(kpis) {
  return [
    {
      key: 'totalExperience',
      label: 'Total Experience',
      value: kpis.totalExperienceLabel,
      note: 'Current profile value',
      noteClass: 'good',
    },
    {
      key: 'records',
      label: 'Experience Records',
      value: String(kpis.recordCount),
      note: kpis.recordNote,
      noteClass: 'info',
    },
    {
      key: 'currentRole',
      label: 'Current Role',
      value: kpis.currentRoleTitle,
      note: kpis.currentRoleDates,
      noteClass: 'good',
    },
    {
      key: 'dataQuality',
      label: 'Data Quality',
      value: `${kpis.dataQuality}%`,
      note: kpis.dataQualityNote,
      noteClass: kpis.reviewCount > 0 ? 'warn' : 'good',
    },
    {
      key: 'aiConfidence',
      label: 'AI Confidence',
      value: kpis.aiConfidence,
      note: kpis.aiConfidenceNote,
      noteClass: kpis.aiConfidence === 'High' ? 'good' : 'warn',
    },
  ];
}

export function buildSkillEvidenceMap(profile, experience = normalizeExperienceList(profile?.experience)) {
  const blob = experienceTextBlob(experience);
  if (!blob.trim()) {
    return SKILL_SIGNALS.map((s) => ({ key: s.key, score: 0 }));
  }

  return SKILL_SIGNALS.map((signal) => {
    const hits = signal.patterns.reduce((acc, pattern) => acc + (pattern.test(blob) ? 1 : 0), 0);
    const base = hits > 0 ? 55 + hits * 15 : 0;
    const skillBoost = (profile?.skills || []).some((s) =>
      signal.patterns.some((p) => p.test(String(s?.skill_name || '')))
    )
      ? 12
      : 0;
    return { key: signal.key, score: Math.min(95, base + skillBoost) };
  }).sort((a, b) => b.score - a.score);
}

export function buildDataQualityChecklist(profile, experience = normalizeExperienceList(profile?.experience)) {
  const enriched = experience.map((exp, i) => enrichExperienceRecord(exp, i));
  const current = enriched.find((e) => isPresentEnd(e.end_date)) || enriched[0];
  const earlier = enriched.filter((e) => e !== current);

  const currentClean = current?.status === 'clean';
  const earlierReview = earlier.some((e) => e.status === 'review');
  const progressionReview =
    enriched.length > 1 &&
    enriched.some((e) => /engineer|production|quality|r&d/i.test(`${e.title} ${e.company}`)) &&
    enriched.some((e) => /analyst|research|report/i.test(`${e.title} ${e.company}`));

  return [
    {
      check: 'Current employer & dates',
      status: currentClean ? 'clean' : 'review',
      statusLabel: currentClean ? 'Clean' : 'Review',
      action: currentClean ? 'No action' : 'Confirm from resume/candidate',
    },
    {
      check: 'Earlier employer names',
      status: earlier.length === 0 ? 'review' : earlierReview ? 'review' : 'clean',
      statusLabel: earlier.length === 0 ? 'Review' : earlierReview ? 'Review' : 'Clean',
      action: earlierReview || earlier.length === 0 ? 'Confirm from resume/candidate' : 'No action',
    },
    {
      check: 'Role progression',
      status: progressionReview ? 'review' : enriched.length ? 'clean' : 'review',
      statusLabel: progressionReview ? 'Review' : enriched.length ? 'Clean' : 'Review',
      action: progressionReview
        ? 'Validate analyst transition story'
        : enriched.length
          ? 'No action'
          : 'Add or parse experience history',
    },
  ];
}

export function buildInterviewProbes(profile, experience = normalizeExperienceList(profile?.experience)) {
  const blob = experienceTextBlob(experience).toLowerCase();
  const hasEngineering = /engineer|r&d|production|quality|machinery/.test(blob);
  const hasAnalytics = /analyst|analytics|report|research|data/.test(blob);

  if (hasEngineering && hasAnalytics) {
    return 'Ask the candidate to explain the transition from engineering/R&D work into analyst responsibilities, examples of data-driven decisions, and the tools used for reporting, research, and production-quality analysis.';
  }
  if (hasAnalytics) {
    return 'Probe for examples of research workflows, stakeholder reporting, analytical tooling, and how insights influenced business decisions.';
  }
  if (hasEngineering) {
    return 'Ask about production-quality ownership, cross-functional R&D collaboration, and measurable improvements delivered in prior engineering roles.';
  }
  if (profile?.skills?.length) {
    const skills = profile.skills
      .map((s) => s?.skill_name)
      .filter(Boolean)
      .slice(0, 4)
      .join(', ');
    return `Validate depth in ${skills || 'core skills'} with concrete project examples, ownership scope, and outcomes from recent roles.`;
  }
  return 'Ask the candidate to walk through recent roles, employer names, dates, and examples of work most relevant to the open requisition.';
}

export function buildAiExperienceSummary(profile, trajSummary, experience = normalizeExperienceList(profile?.experience)) {
  const insight = buildAiInsight(profile, (profile?.applications || [])[0], trajSummary);
  if (insight && !insight.includes('Profile enriched with AI skills')) {
    return insight;
  }

  const blob = experienceTextBlob(experience).toLowerCase();
  const hasEngineering = /engineer|r&d|production|quality/.test(blob);
  const hasAnalytics = /analyst|analytics|report|research/.test(blob);

  if (hasEngineering && hasAnalytics) {
    return 'The candidate shows a mixed engineering-to-analytics trajectory. Current work is analyst-oriented, while earlier records indicate mechanical/R&D and production-quality exposure.';
  }
  if (hasAnalytics) {
    return 'The candidate profile emphasizes research, analytics, and reporting responsibilities with stakeholder-facing deliverables across recent roles.';
  }
  if (hasEngineering) {
    return 'Experience history skews toward engineering operations, production quality, and R&D support with progressively broader technical ownership.';
  }
  const role = deriveCurrentRole(profile);
  if (role.title) {
    return `Available experience centers on ${role.title.toLowerCase()} responsibilities. Recruiter verification is recommended before shortlisting.`;
  }
  return 'Experience history is limited or unstructured. Parse the resume or confirm work history directly with the candidate.';
}

export function profileCompletenessCopy(score, reviewCount) {
  if (score >= 85 && reviewCount === 0) {
    return 'Strong structured history across current and prior roles.';
  }
  if (score >= 60) {
    return 'Good current-role data; earlier experience requires recruiter verification before shortlisting.';
  }
  return 'Several experience fields are incomplete. Validate employer names, dates, and role scope before proceeding.';
}

export function buildExperienceInsights(profile, experience = normalizeExperienceList(profile?.experience)) {
  const blob = experienceTextBlob(experience).toLowerCase();
  const primary =
    /analyst|analytics|report|research/.test(blob)
      ? 'Research analyst, data reporting, documentation-heavy roles.'
      : /engineer|developer|architect/.test(blob)
        ? 'Technical delivery, engineering execution, and systems-oriented roles.'
        : 'General professional roles aligned to extracted resume signals.';

  const secondary =
    /engineer|production|quality|r&d/.test(blob)
      ? 'Engineering operations, production quality, and R&D support.'
      : /stakeholder|communication|client/.test(blob)
        ? 'Stakeholder communication and cross-functional coordination.'
        : 'Supporting experience themes from resume text and listed skills.';

  const recruiterAction =
    computeExperienceRecordsSummary(experience).review > 0
      ? 'Confirm employer names, employment dates, and the exact engineering designation.'
      : 'Validate scope, tools, and recency for the current role before shortlisting.';

  return { primary, secondary, recruiterAction };
}

export function experienceVerificationBadge(profile, experience = normalizeExperienceList(profile?.experience)) {
  if (!experience.length) return null;
  const { clean, review, total } = computeExperienceRecordsSummary(experience);
  if (clean === total) {
    return { label: 'Experience Verified: Full', variant: 'inhouse' };
  }
  if (clean > 0) {
    return { label: 'Experience Verified: Partial', variant: 'purple' };
  }
  return { label: 'Experience Verified: Pending', variant: 'default' };
}

export function ringStyle(percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return { background: `conic-gradient(#6d5dfc 0 ${p}%, #e2e8f0 ${p}% 100%)` };
}
