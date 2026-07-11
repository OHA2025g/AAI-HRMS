import React from 'react';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export default function CandidateExperienceTimelineCard({ record }) {
  const isWarn = record.status === 'review';

  return (
    <article className="cde-exp-card" data-testid={`candidate-experience-card-${record.id}`}>
      <span className={`cde-dot ${record.dotClass || ''}`.trim()} aria-hidden />
      <div className="cde-exp-top">
        <div className="cde-role">
          <h5>{record.title || 'Role not captured'}</h5>
          <div className="cde-company">
            {record.company || 'Employer not captured'}
            {record.chipLabel ? (
              <span className="cde-chip cde-chip-amber">{record.chipLabel}</span>
            ) : null}
          </div>
          {record.subtext ? <div className="cde-subtext">{record.subtext}</div> : null}
        </div>
        <span className="cde-duration-pill">{record.durationLabel}</span>
      </div>

      {record.bullets?.length ? (
        <div className="cde-exp-body">
          <ul className="cde-bullet-summary">
            {record.bullets.map((bullet) => (
              <li key={bullet.slice(0, 48)}>{bullet}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="cde-exp-footer">
        <div className="cde-skills">
          {record.skills?.length ? (
            record.skills.map((skill) => (
              <span key={skill} className="cde-skill">
                {skill}
              </span>
            ))
          ) : (
            <span className="cde-skill cde-skill-muted">Skills pending extraction</span>
          )}
        </div>
        <div className={`cde-quality ${isWarn ? 'warn' : ''}`}>
          {isWarn ? <WarnIcon /> : <CheckIcon />}
          {record.qualityLabel}
        </div>
      </div>
    </article>
  );
}
