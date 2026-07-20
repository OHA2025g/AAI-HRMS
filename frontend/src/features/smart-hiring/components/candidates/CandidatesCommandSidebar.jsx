import React from 'react';
import { Link } from 'react-router-dom';
import { fmtNum } from '@/shared/lib/candidatesCommandUtils';

export default function CandidatesCommandSidebar({ metrics }) {
  const stages = metrics.pipelineStages || [];
  const recommendations = metrics.recommendations || [];
  const segments = metrics.talentSegments || [];

  return (
    <aside className="cand-side" data-testid="candidates-command-sidebar">
      <div className="cand-panel">
        <h3>AI Candidate Pipeline</h3>
        <div className="cand-pipeline">
          {stages.map((stage) => (
            <div key={stage.key} className="cand-stage">
              <span>{stage.label}</span>
              <b>{fmtNum(stage.count)}</b>
              <div className="cand-bar">
                <i style={{ width: `${stage.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cand-panel">
        <h3>AI Recommendations</h3>
        {recommendations.length ? (
          recommendations.map((rec, i) => (
            <div key={`${rec.title}-${i}`} className="cand-rec">
              <div className="cand-rec-ico">{rec.icon}</div>
              <div>
                {rec.actionPath ? (
                  <Link to={rec.actionPath}>
                    <b>{rec.title}</b>
                  </Link>
                ) : (
                  <b>{rec.title}</b>
                )}
                <p>{rec.message}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="cand-muted">No recommendations until candidates are added.</p>
        )}
      </div>

      <div className="cand-panel">
        <h3>Top Talent Segments</h3>
        {segments.length ? (
          segments.map((seg) => (
            <div key={seg.label} className="cand-talent-row">
              <span>{seg.label}</span>
              <span className="cand-score-pill">{seg.score}</span>
            </div>
          ))
        ) : (
          <p className="cand-muted">No talent segments yet.</p>
        )}
      </div>
    </aside>
  );
}
