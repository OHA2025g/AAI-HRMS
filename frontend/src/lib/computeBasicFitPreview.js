/**
 * Client-side mirror of backend `compute_basic_fit_score` (server.py) for talent-pool
 * candidates who do not yet have an application / persisted fit_score.
 * Keeps weights and formula aligned so cards match Pipeline-style FitScoreCard data.
 */
const DEFAULT_WEIGHTS = { title: 0.2, skill: 0.4, activity: 0.3, experience: 0.1 };

function skillNameLc(s) {
  if (!s || typeof s !== 'object') return '';
  return String(s.skill_name || '')
    .trim()
    .toLowerCase();
}

function titleCaseSkill(s) {
  if (!s) return '';
  return String(s)
    .split(/[\s/_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * @param {Record<string, unknown>} job
 * @param {Record<string, unknown>} candidate
 * @returns {Record<string, unknown> | null}
 */
export function computeBasicFitPreview(job, candidate) {
  if (!job?.id || !candidate?.id) return null;

  const jobSkillsList = Array.isArray(job.skills) ? job.skills : [];
  const jobSkills = new Set(jobSkillsList.map(skillNameLc).filter(Boolean));
  const mustHave = new Set(
    jobSkillsList
      .filter((s) => s && s.skill_type === 'MUST_HAVE')
      .map(skillNameLc)
      .filter(Boolean)
  );
  const candSkills = new Set(
    (Array.isArray(candidate.skills) ? candidate.skills : []).map(skillNameLc).filter(Boolean)
  );

  const matchedLc = [...jobSkills].filter((s) => candSkills.has(s));
  const skillMatchPct = jobSkills.size ? (matchedLc.length / jobSkills.size) * 100 : 0;
  const mustHaveOk = [...mustHave].every((m) => candSkills.has(m));

  const weights = { ...DEFAULT_WEIGHTS, ...(job.scoring_rubric?.weights || {}) };
  const titleScore = 70.0;
  const actScore = 60.0;
  const expScore = 70.0;
  let final =
    titleScore * Number(weights.title ?? 0.2) +
    skillMatchPct * Number(weights.skill ?? 0.4) +
    actScore * Number(weights.activity ?? 0.3) +
    expScore * Number(weights.experience ?? 0.1);
  if (!mustHaveOk) final *= 0.25;

  const missingLc = [...mustHave].filter((m) => !candSkills.has(m));

  return {
    id: `preview-${candidate.id}-${job.id}`,
    job_id: job.id,
    candidate_id: candidate.id,
    title_score: titleScore,
    skill_match_pct: Math.round(skillMatchPct * 100) / 100,
    activity_match_pct: actScore,
    experience_score: expScore,
    final_score: Math.round(final * 100) / 100,
    must_have_ok: mustHaveOk,
    score_source: 'basic_preview',
    score_factors: {
      title_weighted: Math.round(titleScore * Number(weights.title ?? 0.2) * 1000) / 1000,
      skill_weighted: Math.round(skillMatchPct * Number(weights.skill ?? 0.4) * 1000) / 1000,
      activity_weighted: Math.round(actScore * Number(weights.activity ?? 0.3) * 1000) / 1000,
      experience_weighted: Math.round(expScore * Number(weights.experience ?? 0.1) * 1000) / 1000,
    },
    explanation: {
      matched_skills: matchedLc.map(titleCaseSkill),
      missing_must_have: missingLc.map(titleCaseSkill),
      matched_activities: [],
      strengths: [],
      concerns: [],
    },
    computed_at: new Date().toISOString(),
  };
}
