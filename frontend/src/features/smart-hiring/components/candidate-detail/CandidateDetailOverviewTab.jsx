import React from 'react';
import {
  buildAiRecommendation,
  buildExperienceSnapshotItems,
  classifySkills,
  computeOverviewKpis,
  deriveCurrentRole,
  fmtField,
  formatCandidateDate,
  kpiStripItems,
  normalizeEducationList,
} from '@/shared/lib/candidateDetailOverviewUtils';

export default function CandidateDetailOverviewTab({ profile, trajSummary }) {
  const kpis = computeOverviewKpis(profile);
  const kpiItems = kpiStripItems(kpis);
  const currentRole = deriveCurrentRole(profile);
  const skillRows = classifySkills(profile?.skills);
  const education = normalizeEducationList(profile?.education);
  const snapshotItems = buildExperienceSnapshotItems(profile, currentRole);
  const recommendation = buildAiRecommendation(profile, trajSummary);

  const roleCountLabel =
    kpis.roles === 1 ? '1 role' : kpis.roles > 1 ? `${kpis.roles} roles` : '—';

  return (
    <>
      <section className="cd-kpi-strip" data-testid="candidate-overview-kpis">
        {kpiItems.map((item) => (
          <div key={item.key} className="cd-kpi">
            <div className={`cd-kpi-icon ${item.iconClass}`}>{item.icon}</div>
            <div>
              <small>{item.label}</small>
              <b>{item.value}</b>
            </div>
          </div>
        ))}
      </section>

      <section className="cd-overview-grid">
        <article className="cd-card" data-testid="candidate-employee-details">
          <h2>
            <span className="cd-card-icon">♙</span>
            Employee Details
          </h2>
          <div className="cd-profile-grid">
            <div className="cd-detail">
              <small>Name</small>
              <b>{fmtField(profile.full_name)}</b>
            </div>
            <div className="cd-detail">
              <small>Current Company</small>
              <b>{fmtField(currentRole.company)}</b>
            </div>
            <div className="cd-detail">
              <small>Current Role</small>
              <b>{fmtField(currentRole.title)}</b>
            </div>
            <div className="cd-detail">
              <small>Location</small>
              <b>{fmtField(profile.location)}</b>
            </div>
          </div>

          <h2 className="cd-section-gap">
            <span className="cd-card-icon">✧</span>
            Core Skills
          </h2>
          <div className="cd-skills" data-testid="candidate-core-skills">
            {skillRows.length ? (
              skillRows.map((skill) => (
                <span key={skill.name} className={`cd-skill ${skill.tier !== 'default' ? skill.tier : ''}`}>
                  {skill.name}
                </span>
              ))
            ) : (
              <span className="cd-skill">No skills listed</span>
            )}
          </div>
        </article>

        <aside className="cd-card cd-ai-panel" data-testid="candidate-quick-stats">
          <h2>
            <span className="cd-card-icon">◎</span>
            Quick Stats
          </h2>
          <div className="cd-stats">
            <div className="cd-stat-row">
              <span>Applications</span>
              <b>{kpis.applications}</b>
            </div>
            <div className="cd-stat-row">
              <span>Skills</span>
              <b>{kpis.skills}</b>
            </div>
            <div className="cd-stat-row">
              <span>Experience</span>
              <b>{roleCountLabel}</b>
            </div>
            <div className="cd-stat-row">
              <span>Candidate Added</span>
              <b>{formatCandidateDate(kpis.addedAt)}</b>
            </div>
          </div>
          <div className="cd-recommendation" data-testid="candidate-ai-recommendation">
            <b>AI Recommendation</b>
            <p>{recommendation}</p>
          </div>
        </aside>
      </section>

      <section className="cd-card" data-testid="candidate-education">
        <h2>
          <span className="cd-card-icon">🎓</span>
          Education
        </h2>
        <div className="cd-education">
          {education.length ? (
            education.map((edu, i) => (
              <div key={`${edu.degree}-${edu.year}-${i}`} className="cd-edu">
                <div className="cd-edu-icon">🎓</div>
                <div>
                  <b>{edu.degree}</b>
                  <p>
                    {[edu.institution, edu.field].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                {edu.year ? <div className="cd-year">{edu.year}</div> : null}
              </div>
            ))
          ) : (
            <div className="cd-edu cd-edu-empty">
              <div className="cd-edu-icon">🎓</div>
              <div>
                <b>No education listed</b>
                <p>Upload a resume to extract education history.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="cd-card cd-card-spaced" data-testid="candidate-experience-snapshot">
        <h2>
          <span className="cd-card-icon">◷</span>
          Experience Snapshot
        </h2>
        <div className="cd-timeline">
          {snapshotItems.length ? (
            snapshotItems.map((item) => (
              <div key={item.title} className="cd-timeline-item">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))
          ) : (
            <div className="cd-timeline-item">
              <h3>No experience listed</h3>
              <p>Upload a resume to automatically extract work history.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
