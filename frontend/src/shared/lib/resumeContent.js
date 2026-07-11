/** Resume display helpers for candidate profile. */

import { normalizeExperienceList } from './experienceParser';

export function isEducationOnlyResume(resumeText) {
  const text = String(resumeText || '').trim();
  if (!text) return false;
  const lowered = text.toLowerCase();
  if (!lowered.startsWith('education')) return false;
  const without = text.replace(/^education:?\s*/i, '').trim().toLowerCase();
  return !['work experience', 'company:', 'skills:', 'summary:', 'headline:'].some((p) =>
    without.includes(p)
  );
}

export function hasResumeDisplayContent(profile) {
  if (!profile) return false;
  const stored = String(profile.resume_text || '').trim();
  const isLegacyComposed =
    stored.includes('========================================') || stored.includes('Company:');
  const summary =
    stored && !isEducationOnlyResume(stored) && !isLegacyComposed && !stored.startsWith('Headline\n');
  return Boolean(
    profile.headline?.trim() ||
      summary ||
      profile.location?.trim() ||
      (profile.total_experience_years != null && profile.total_experience_years !== '') ||
      profile.skills?.length ||
      normalizeExperienceList(profile.experience).length ||
      profile.education?.length
  );
}

/** @deprecated Use ResumeContentView component for structured display. */
export function buildResumeDisplayText(profile) {
  return String(profile?.resume_text || '').trim();
}
