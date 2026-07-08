import React from 'react';
import { buildTimelineSignals } from '../../../lib/candidateDetailTrajectoryUtils';
import { chartTitleCase } from '../../../lib/chartTitleCase';

function TimelineIcon({ type }) {
  if (type === 'user') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }
  if (type === 'arrow') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M9 18 15 12 9 6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

export default function TrajectoryTimelinePanel({ report, phase2Report, profile }) {
  const signals = buildTimelineSignals(report, phase2Report, profile);

  return (
    <div className="cdt-panel" data-testid="trajectory-timeline-panel">
      <div className="cdt-panel-title">
        <div>
          <h3>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-6" />
            </svg>
            {chartTitleCase('Experience trajectory timeline')}
          </h3>
          <p>Readable career storyline with evidence chips and recruiter-friendly interpretation.</p>
        </div>
        <span className="cdt-chip cdt-chip-gray">{signals.length} signals</span>
      </div>
      <div className="cdt-timeline">
        {signals.map((item) => (
          <div key={item.key} className="cdt-time-item">
            <div className="cdt-time-dot">
              <TimelineIcon type={item.icon} />
            </div>
            <div className="cdt-time-box">
              <div className="cdt-time-top">
                <strong>{item.title}</strong>
                <span className="cdt-time-range">{item.range}</span>
              </div>
              <p>{item.body}</p>
              <div className="cdt-evidence-row">
                {item.chips.map((chip) => (
                  <span key={chip} className="cdt-evidence">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
