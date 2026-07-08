import React from 'react';

export default function CareerTrajectorySignalsRow({ strengths = [], risks = [] }) {
  const strengthList = Array.isArray(strengths) ? strengths : [];
  const riskList = Array.isArray(risks) ? risks : [];

  return (
    <section className="ct-signal-grid">
      <div className="ct-card">
        <h3>Strength signals</h3>
        {strengthList.length === 0 ? (
          <p className="ct-muted">No strength signals identified.</p>
        ) : (
          strengthList.map((s, i) => (
            <div key={i} className={`ct-signal${i > 0 ? ' spaced' : ''}`}>
              <b>{s.title}</b>
              <p className="ct-muted">{s.evidence}</p>
            </div>
          ))
        )}
      </div>
      <div className="ct-card">
        <h3>Risk signals</h3>
        {riskList.length === 0 ? (
          <p className="ct-muted">No risk signals identified.</p>
        ) : (
          riskList.map((r, i) => (
            <div key={i} className={`ct-signal risk${i > 0 ? ' spaced' : ''}`}>
              <b>
                {r.title}
                {r.severity ? ` · ${r.severity}` : ''}
              </b>
              <p className="ct-muted">{r.evidence}</p>
              {r.recommended_validation ? (
                <button type="button" className="ct-link-btn">
                  {r.recommended_validation}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
