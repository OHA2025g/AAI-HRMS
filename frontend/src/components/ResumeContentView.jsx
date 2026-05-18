import React, { useMemo } from 'react';
import { normalizeExperienceList, formatTenure } from '../lib/experienceParser';
import { isEducationOnlyResume } from '../lib/resumeContent';

const SECTION_CLASS = 'border-b border-slate-200 pb-5 last:border-0 last:pb-0';

function Section({ title, children }) {
  if (!children) return null;
  return (
    <section className={SECTION_CLASS}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-2">{title}</h3>
      <div className="text-sm text-slate-700">{children}</div>
    </section>
  );
}

function EducationList({ education }) {
  if (!education?.length) return null;
  return (
    <ul className="space-y-2 list-none pl-0">
      {education.map((edu, i) => {
        const degree = edu?.degree || '';
        const institution = edu?.institution || '';
        const field = edu?.field && String(edu.field).toLowerCase() !== 'none' ? edu.field : '';
        const year = edu?.year && String(edu.year).toLowerCase() !== 'none' ? edu.year : '';
        return (
          <li key={i} className="leading-relaxed">
            <span className="font-medium text-slate-900">{degree}</span>
            {field ? <span className="text-slate-600">{` in ${field}`}</span> : null}
            {institution ? <span className="text-slate-600">{` @ ${institution}`}</span> : null}
            {year ? <span className="text-slate-500">{` (${year})`}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function WorkExperienceList({ experience }) {
  const roles = useMemo(() => normalizeExperienceList(experience), [experience]);
  if (!roles.length) return null;

  return (
    <div className="space-y-5">
      {roles.map((role, i) => {
        const tenure = formatTenure(role.start_date, role.end_date);
        const bullets =
          Array.isArray(role.bullets) && role.bullets.length
            ? role.bullets
            : String(role.description || '')
                .split('\n')
                .map((l) => l.replace(/^•\s*/, '').trim())
                .filter(Boolean);

        return (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {role.company ? (
              <p className="text-sm font-semibold text-slate-900">{role.company}</p>
            ) : null}
            {role.title ? (
              <p className="text-sm text-indigo-800 font-medium mt-0.5">{role.title}</p>
            ) : null}
            {tenure ? (
              <p className="text-xs text-slate-500 mt-1.5">
                <span className="font-medium text-slate-600">Tenure:</span> {tenure}
              </p>
            ) : null}
            {bullets.length > 0 ? (
              <ul className="mt-3 space-y-2 list-disc pl-5 text-slate-700">
                {bullets.map((b, j) => (
                  <li key={j} className="leading-relaxed">
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Structured resume sections for candidate profile. */
export function ResumeContentView({ profile }) {
  if (!profile) return null;

  const stored = String(profile.resume_text || '').trim();
  const isLegacyComposed =
    stored.includes('========================================') || stored.includes('Company:');
  const summary =
    stored && !isEducationOnlyResume(stored) && !isLegacyComposed && !stored.startsWith('Headline\n')
      ? stored
      : '';

  const hasHeadline = Boolean(profile.headline?.trim());
  const hasProfile = Boolean(summary);
  const hasLocation = Boolean(profile.location?.trim());
  const hasTotalExp =
    profile.total_experience_years != null && profile.total_experience_years !== '';
  const hasSkills = profile.skills?.length > 0;
  const hasExperience = normalizeExperienceList(profile.experience).length > 0;
  const hasEducation = profile.education?.length > 0;

  if (!hasHeadline && !hasProfile && !hasLocation && !hasTotalExp && !hasSkills && !hasExperience && !hasEducation) {
    return null;
  }

  const totalExpLabel =
    profile.total_experience_years != null && profile.total_experience_years !== ''
      ? Number(profile.total_experience_years) === 1
        ? '1 year'
        : `${profile.total_experience_years} years`
      : null;

  return (
    <div className="space-y-5">
      {hasHeadline ? (
        <Section title="Headline">
          <p className="text-base font-medium text-slate-900 leading-snug">{profile.headline.trim()}</p>
        </Section>
      ) : null}

      {hasProfile ? (
        <Section title="Profile">
          <p className="whitespace-pre-wrap leading-relaxed">{summary}</p>
        </Section>
      ) : null}

      {hasLocation ? (
        <Section title="Location">
          <p>{profile.location.trim()}</p>
        </Section>
      ) : null}

      {hasTotalExp ? (
        <Section title="Total Experience">
          <p>{totalExpLabel}</p>
        </Section>
      ) : null}

      {hasSkills ? (
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((sk, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {sk.skill_name}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      {hasExperience ? (
        <Section title="Work Experience">
          <WorkExperienceList experience={profile.experience} />
        </Section>
      ) : null}

      {hasEducation ? (
        <Section title="Education">
          <EducationList education={profile.education} />
        </Section>
      ) : null}
    </div>
  );
}
