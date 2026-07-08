import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  buildRubricRows,
  computeOverviewKpis,
  descriptionBullets,
  fmtOrg,
  formatJobDate,
  initials,
  kpiStripItems,
  workLocationLabel,
} from '../../lib/jobDetailOverviewUtils';

export default function JobDetailOverviewTab({ job, applications, matchingCandidates }) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const kpis = computeOverviewKpis(applications, matchingCandidates);
  const kpiItems = kpiStripItems(kpis);
  const rubricRows = buildRubricRows(job);
  const bullets = descriptionBullets(job);
  const hiringManager = job?.hiring_team?.hiring_manager;
  const managerName = hiringManager?.full_name || hiringManager?.email;

  const descriptionPreview =
    job?.description?.length > 280 && !showFullDescription
      ? `${job.description.slice(0, 280).trim()}…`
      : job?.description;

  return (
    <>
      <div className="jd-kpi-strip" data-testid="job-overview-kpis">
        {kpiItems.map((item) => (
          <div key={item.key} className="jd-kpi">
            <div className={`jd-kpi-circle ${item.circle}`}>{item.icon}</div>
            <div>
              <small>{item.label}</small>
              <b>{item.value}</b>
              {item.key === 'inInterview' && kpis.inInterview > 0 ? (
                <div className="down">↓ pipeline active</div>
              ) : item.key === 'totalCandidates' && kpis.totalCandidates > 0 ? (
                <div className="up">↑ live count</div>
              ) : item.key === 'avgFitScore' && kpis.avgFitScore != null ? (
                <div className="up">↑ fit quality</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="jd-overview-grid">
        <div className="jd-card">
          <h2>
            <span className="jd-card-icon">▤</span>
            Job Details
          </h2>
          <div className="jd-detail-row">
            <span>Business Unit</span>
            <strong>{fmtOrg(job.business_pillar)}</strong>
          </div>
          <div className="jd-detail-row">
            <span>Department</span>
            <strong>{fmtOrg(job.business_department)}</strong>
          </div>
          <div className="jd-detail-row">
            <span>Role</span>
            <strong>{job.title}</strong>
          </div>
          <div className="jd-detail-row">
            <span>Project ID</span>
            <strong>{fmtOrg(job.project_id)}</strong>
          </div>
          <div className="jd-detail-row">
            <span>Employment Type</span>
            <strong>Full-time</strong>
          </div>
          <div className="jd-detail-row">
            <span>Experience Level</span>
            <strong>{fmtOrg(job.seniority)}</strong>
          </div>
          <div className="jd-detail-row">
            <span>Work Location</span>
            <strong>{workLocationLabel(job)}</strong>
          </div>
          <div className="jd-detail-row">
            <span>Created On</span>
            <strong>{formatJobDate(job.created_at)}</strong>
          </div>
          <div className="jd-detail-row">
            <span>Hiring Manager</span>
            <strong>
              {managerName ? (
                <>
                  <span className="jd-manager-avatar">{initials(managerName)}</span>
                  {managerName}
                </>
              ) : (
                '—'
              )}
            </strong>
          </div>
        </div>

        <div className="jd-card jd-desc">
          <h2>
            <span className="jd-card-icon">▤</span>
            Job Description
          </h2>
          {job.description ? (
            <p>{descriptionPreview}</p>
          ) : (
            <p>Added job requisition for placement coverage.</p>
          )}
          {bullets.map(([label, value]) => (
            <p key={label}>
              <span className="jd-check">●</span>
              <strong>{label}:</strong> {value}
            </p>
          ))}
          {job.description?.length > 280 ? (
            <button type="button" className="jd-link-btn" onClick={() => setShowFullDescription((v) => !v)}>
              {showFullDescription ? 'Show Less ‹' : 'View Full Description ›'}
            </button>
          ) : null}
        </div>

        <div className="jd-card">
          <h2>
            <span className="jd-card-icon">◎</span>
            Scoring Rubric
          </h2>
          <p className="jd-rubric-intro">
            {job.scoring_rubric ? 'Role-specific scoring weights for this requisition.' : 'Default scoring applied for this role.'}
          </p>
          {rubricRows.map((row) => (
            <div key={row.key} className="jd-rubric-row">
              <div className="jd-rubric-label">
                <span>{row.label}</span>
                <span>
                  {row.score}/100
                </span>
              </div>
              <div className="jd-bar">
                <div className="jd-bar-fill" style={{ width: `${row.score}%`, background: row.color }} />
              </div>
            </div>
          ))}
          <Link to={`/jobs/${job.id}/edit`} className="jd-link-btn">
            View Full Rubric ›
          </Link>
        </div>

        <div className="jd-card jd-skills-card">
          <h2>
            <span className="jd-card-icon">✧</span>
            Required Skills
          </h2>
          <div className="jd-skill-list">
            {(job.skills || []).map((skill, i) => (
              <div
                key={`${skill.skill_name}-${i}`}
                className={`jd-skill ${skill.skill_type === 'MUST_HAVE' ? 'required' : ''}`}
              >
                {skill.skill_name}
                <span>{skill.skill_type === 'MUST_HAVE' ? 'Required' : 'Preferred'}</span>
              </div>
            ))}
            <Link to={`/jobs/${job.id}/edit`} className="jd-skill jd-skill-add">
              ＋ Add Skill
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
