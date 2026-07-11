import React from 'react';
import { Link } from 'react-router-dom';
import PipelineFitRing from './PipelineFitRing';
import PipelineMatchBars from './PipelineMatchBars';
import PipelineCareerStrip from './PipelineCareerStrip';
import {
  extractSkills,
  formatCandidateSubtitle,
  getMatchLabel,
  getOverallFitScore,
  getSourceLabel,
} from '@/shared/lib/pipelineCommandUtils';

export default function PipelineCandidateCard({
  app,
  jobTitle,
  jobId,
  trajSummary,
  trajLoading,
  onTrajRefresh,
  stageBadge,
  variant = 'sourced',
  children,
  footer,
  headerExtra,
  className = '',
}) {
  const candidate = app?.candidate;
  const score = getOverallFitScore(app);
  const matchLabel = getMatchLabel(score);
  const skills = extractSkills(app, candidate);
  const subtitle = formatCandidateSubtitle(app, jobTitle);
  const sourceLabel = getSourceLabel(app);

  const cardClass = [
    'pl-card',
    'pl-candidate',
    variant === 'screening' ? 'pl-candidate-screening' : '',
    variant === 'assessment' ? 'pl-candidate-assessment' : '',
    variant === 'interview' ? 'pl-candidate-interview' : '',
    variant === 'salary' ? 'pl-candidate-salary' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (variant === 'screening') {
    const initials = (candidate?.full_name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();

    return (
      <article className={cardClass}>
        <div className="pl-candidate-head">
          <div className="pl-person">
            <div className="pl-photo">{initials || '?'}</div>
            <div>
              <h3>{candidate?.full_name || 'Candidate'}</h3>
              <p>{subtitle}</p>
            </div>
          </div>
          {stageBadge ? <span className="pl-badge-stage">{stageBadge}</span> : null}
        </div>
        <div className="pl-fit-row">
          <PipelineFitRing app={app} size="sm" />
          <div>
            <div className="pl-muted">Overall Fit</div>
            <div className="pl-match-tag">{matchLabel}</div>
            <p className="pl-fit-note">Stable match across skills, title, activity and experience.</p>
          </div>
        </div>
        <PipelineMatchBars app={app} />
        <div className="pl-muted pl-skills-label">Matched Skills</div>
        <div className="pl-skills">
          {skills.length
            ? skills.map((skill) => (
                <span key={skill} className="pl-skill">
                  {skill}
                </span>
              ))
            : (
              <span className="pl-skill">Skills pending</span>
            )}
        </div>
        <PipelineCareerStrip
          candidateId={app.candidate_id}
          jobId={jobId}
          summary={trajSummary}
          loading={trajLoading}
          onAnalyzed={onTrajRefresh}
          className="pl-note"
        />
        {footer}
      </article>
    );
  }

  if (variant === 'assessment') {
    return (
      <article className={cardClass}>
        <div className="pl-candidate-top">
          <div>
            <h3>{candidate?.full_name || 'Candidate'}</h3>
            <div className="pl-sub">{subtitle}</div>
            {headerExtra}
          </div>
          {stageBadge ? <span className="pl-tag">{stageBadge}</span> : null}
        </div>
        <div className="pl-fit-row pl-fit-compact">
          <PipelineFitRing app={app} size="sm" />
          <div className="pl-match-label">
            <span>Overall Fit</span>
            <b>{matchLabel}</b>
          </div>
        </div>
        <PipelineMatchBars app={app} variant="compact" />
        <div className="pl-skills pl-skills-inline">
          {skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
        <PipelineCareerStrip
          candidateId={app.candidate_id}
          jobId={jobId}
          summary={trajSummary}
          loading={trajLoading}
          onAnalyzed={onTrajRefresh}
          className="pl-ai-note"
        />
        {footer}
      </article>
    );
  }

  if (variant === 'interview') {
    return (
      <article className={cardClass}>
        <div className="pl-candidate-head">
          <div>
            <h3>{candidate?.full_name || 'Candidate'}</h3>
            <p>{subtitle}</p>
          </div>
          {stageBadge ? <span className="pl-badge-interview">{stageBadge}</span> : null}
        </div>
        <div className="pl-fit-row">
          <PipelineFitRing app={app} />
          <div>
            <p className="pl-muted">Overall Fit</p>
            <b>{matchLabel}</b>
          </div>
        </div>
        <PipelineMatchBars app={app} variant="stacked" />
        <p className="pl-muted pl-skills-label">Matched Skills</p>
        <div className="pl-chips">
          {skills.map((skill) => (
            <span key={skill} className="pl-chip">
              {skill}
            </span>
          ))}
        </div>
        <PipelineCareerStrip
          candidateId={app.candidate_id}
          jobId={jobId}
          summary={trajSummary}
          loading={trajLoading}
          onAnalyzed={onTrajRefresh}
          className="pl-career"
        />
        {footer}
      </article>
    );
  }

  if (variant === 'salary') {
    return (
      <article className={cardClass}>
        <div className="pl-card-top">
          <div className="pl-name">
            <h3>{candidate?.full_name || 'Candidate'}</h3>
            <p>{subtitle}</p>
          </div>
          {stageBadge ? <span className="pl-badge-salary">{stageBadge}</span> : null}
        </div>
        <div className="pl-fit-row pl-fit-salary">
          <PipelineFitRing app={app} size="sm" />
          <div>
            <small>Overall Fit</small>
            <br />
            <b>{matchLabel}</b>
            {headerExtra}
          </div>
        </div>
        <PipelineMatchBars app={app} variant="compact" />
        <div className="pl-skills">
          {skills.map((skill) => (
            <span key={skill} className="pl-skill">
              {skill}
            </span>
          ))}
        </div>
        {children}
        {footer}
      </article>
    );
  }

  // Default: sourced grid card
  return (
    <article className={cardClass}>
      <div className="pl-candidate-head">
        <div>
          <h3>{candidate?.full_name || 'Candidate'}</h3>
          <p className="pl-muted">{subtitle}</p>
        </div>
        <span className="pl-source">{sourceLabel}</span>
      </div>
      <div className="pl-fit-row">
        <PipelineFitRing app={app} />
        <div>
          <span className="pl-muted">Overall Fit</span>
          <h3>{matchLabel}</h3>
        </div>
      </div>
      <PipelineMatchBars app={app} />
      <div className="pl-skills">
        {skills.length
          ? skills.map((skill) => (
              <span key={skill} className="pl-skill">
                {skill}
              </span>
            ))
          : (
            <span className="pl-skill">Skills pending</span>
          )}
      </div>
      <PipelineCareerStrip
        candidateId={app.candidate_id}
        jobId={jobId}
        summary={trajSummary}
        loading={trajLoading}
        onAnalyzed={onTrajRefresh}
      />
      {footer || (
        <div className="pl-footer-actions">
          <Link to={`/candidates/${app.candidate_id}`} className="pl-btn">
            View Profile
          </Link>
        </div>
      )}
    </article>
  );
}
