import { getCandidateDisplaySource } from './candidateSource';
import { buildAiInsight, formatExperienceYears, topSkillNames } from './candidatesCommandUtils';
import { normalizeExperienceList } from './experienceParser';

export function initials(name = '') {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Mock shows numeric label for "Candidate 11" style names. */
export function avatarLabel(profile) {
  const name = String(profile?.full_name || '').trim();
  const numbered = name.match(/^Candidate\s+(\d+)$/i);
  if (numbered) return numbered[1];
  return initials(name);
}

export function fmtField(v) {
  return v != null && String(v).trim() !== '' ? String(v).trim() : '—';
}

export function formatCandidateDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatPhone(phone) {
  const p = fmtField(phone);
  if (p === '—') return p;
  if (p.startsWith('+') || p.startsWith('-')) return p;
  return p;
}

export function formatExperienceMeta(years) {
  if (years == null || Number.isNaN(Number(years))) return '—';
  const n = Number(years);
  const label = n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
  return `${label} years experience`;
}

export function deriveCurrentRole(profile) {
  const exp = normalizeExperienceList(profile?.experience);
  if (!exp.length) {
    return {
      title: profile?.headline || null,
      company: null,
    };
  }

  const norm = (v) => String(v || '').trim();
  const isPresent = (v) => {
    const s = norm(v).toLowerCase();
    return !s || s.includes('present') || s.includes('current');
  };

  const current = exp.find((e) => isPresent(e?.end_date)) || exp[0];
  return {
    title: norm(current?.title) || profile?.headline || null,
    company: norm(current?.company) || null,
  };
}

export function sourceBadgeMeta(profile) {
  const badge = getCandidateDisplaySource(profile);
  if (!badge) return null;
  let variant = 'default';
  if (badge.label === 'Inhouse Database') variant = 'inhouse';
  else if (badge.label === 'LinkedIn') variant = 'linkedin';
  return { label: badge.label, variant };
}

export function subtitleLabel(profile) {
  if (profile?.headline) return profile.headline;
  const skills = topSkillNames(profile?.skills, 3);
  if (skills.length) return `${skills.join(' · ')} Candidate`;
  return 'Candidate Profile';
}

export function computeOverviewKpis(profile) {
  const applications = profile?.applications || [];
  const skills = profile?.skills || [];
  const experience = normalizeExperienceList(profile?.experience);
  const roles = experience.length || (deriveCurrentRole(profile).title ? 1 : 0);

  return {
    applications: applications.length,
    skills: skills.length,
    experienceYears: profile?.total_experience_years,
    roles,
    addedAt: profile?.created_at,
  };
}

const KPI_META = [
  { key: 'applications', label: 'Applications', icon: '▣', iconClass: 'purple' },
  { key: 'skills', label: 'Skills', icon: '✧', iconClass: 'blue' },
  { key: 'experienceYears', label: 'Experience', icon: '◷', iconClass: 'green', isYears: true },
  { key: 'roles', label: 'Roles', icon: '♙', iconClass: 'orange' },
  { key: 'addedAt', label: 'Added', icon: '📅', iconClass: 'purple', isDate: true },
];

export function kpiStripItems(kpis) {
  return KPI_META.map((meta) => {
    let value = '—';
    if (meta.isYears) {
      value =
        kpis.experienceYears != null && !Number.isNaN(Number(kpis.experienceYears))
          ? formatExperienceYears(kpis.experienceYears)
          : '—';
    } else if (meta.isDate) {
      value = formatCandidateDate(kpis.addedAt);
    } else {
      value = String(kpis[meta.key] ?? 0);
    }
    return { ...meta, value };
  });
}

export function classifySkills(skills = []) {
  const names = [];
  const seen = new Set();
  for (const s of skills) {
    const name = String(s?.skill_name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names.map((name, i) => ({
    name,
    tier: i < 4 ? 'strong' : i === 4 ? 'core' : 'default',
  }));
}

export function buildAiRecommendation(profile, trajSummary) {
  const bestApp = (profile?.applications || [])[0];
  const insight = buildAiInsight(profile, bestApp, trajSummary);
  if (insight && insight !== 'Profile enriched with AI skills and experience signals. Review for open roles.') {
    return insight;
  }

  const skills = topSkillNames(profile?.skills, 5);
  const role = deriveCurrentRole(profile);
  const yrs = profile?.total_experience_years;

  if (skills.length && role.title) {
    return `Strong ${skills.slice(0, 2).join(' & ')} profile. Best suited for ${role.title.toLowerCase()} and related analytics roles. Run career trajectory analysis before shortlisting.`;
  }
  if (skills.length) {
    return `Strong analytics profile. Best suited for roles leveraging ${skills.slice(0, 3).join(', ')}. Run career trajectory analysis before shortlisting.`;
  }
  if (yrs != null) {
    return `${formatExperienceMeta(yrs)} on record. Run career trajectory analysis to enrich fit signals before shortlisting.`;
  }
  return 'Run career trajectory analysis to generate AI fit recommendations for open requisitions.';
}

export function buildExperienceSnapshotItems(profile, currentRole) {
  const experience = normalizeExperienceList(profile?.experience);
  const items = [];

  if (currentRole.title || currentRole.company) {
    const descParts = [];
    if (currentRole.company) descParts.push(currentRole.company);
    const firstDesc = experience[0]?.description || experience[0]?.bullets?.join('. ');
    if (firstDesc) descParts.push(String(firstDesc).replace(/\s+/g, ' ').trim());
    items.push({
      title: currentRole.title || 'Current Role',
      description:
        descParts.join('. ').slice(0, 280) ||
        'Focused on analytics, reporting, and business analysis from candidate profile.',
    });
  }

  const skillNames = topSkillNames(profile?.skills, 10);
  if (skillNames.length >= 3) {
    items.push({
      title: 'Analytics Skill Cluster',
      description: `Strong coverage across ${skillNames.join(', ')}.`,
    });
  } else if (profile?.headline) {
    items.push({
      title: profile.headline,
      description: 'Professional background and role alignment from candidate profile.',
    });
  }

  return items.slice(0, 2);
}

export function normalizeEducationList(education) {
  if (!Array.isArray(education)) return [];
  return education
    .map((edu) => ({
      degree: fmtField(edu?.degree),
      institution: fmtField(edu?.institution),
      field: edu?.field ? String(edu.field).trim() : '',
      year: edu?.year != null ? String(edu.year) : '',
    }))
    .filter((e) => e.degree !== '—' || e.institution !== '—');
}

export function analyzeFitUrl(candidateId, profile) {
  const app = (profile?.applications || []).find((a) => a?.job_id);
  if (app?.job_id) {
    return `/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidateId}&job_id=${app.job_id}`;
  }
  return `/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidateId}`;
}
