import React from 'react';
import { buildRankingRows } from '../../../lib/compareTrajectoriesCommandUtils';

export default function CompareTrajectoriesBottomSections({
  selectedIds,
  summaries,
  nameById,
  missingCount,
  onAnalyzeMissing,
  onExport,
  analyzing,
}) {
  const ranking = buildRankingRows(selectedIds, summaries, nameById);
  const hasReports = selectedIds.some((id) => summaries[id]);
  const allMissing = selectedIds.length > 0 && missingCount === selectedIds.length;

  return (
    <>
      <section className="ctc-insight-grid">
        <div className="ctc-insight purple">
          <h3>AI comparison summary</h3>
          <p className="ctc-muted">
            {hasReports
              ? 'Trajectory signals are available — review the matrix and ranking preview for the strongest readiness profile.'
              : 'Once reports are generated, this panel will summarize who has stronger readiness, maturity, and long-term role fit.'}
          </p>
          <button type="button" className="ctc-btn primary" disabled={!hasReports}>
            Generate summary
          </button>
        </div>
        <div className="ctc-insight green">
          <h3>Recommended next action</h3>
          <p className="ctc-muted">
            {missingCount > 0
              ? 'Generate missing trajectory reports before final comparison. This prevents biased ranking using incomplete data.'
              : 'All selected candidates have reports — proceed to panel review or export the decision pack.'}
          </p>
          <button
            type="button"
            className="ctc-btn green"
            onClick={onAnalyzeMissing}
            disabled={!missingCount || analyzing}
          >
            Analyze missing candidates
          </button>
        </div>
        <div className="ctc-insight orange">
          <h3>Evidence quality</h3>
          <p className="ctc-muted">
            {allMissing
              ? 'Selected candidates need CV-derived evidence for progression, scope, leadership, and impact signals.'
              : hasReports
                ? 'Review strength and risk signals in the matrix before final hiring decisions.'
                : 'Run trajectory analysis to populate evidence-backed progression and impact signals.'}
          </p>
          <button type="button" className="ctc-btn" disabled={!hasReports}>
            View evidence checklist
          </button>
        </div>
      </section>

      <section className="ctc-timeline">
        <div className="ctc-card ctc-line-card">
          <div className="ctc-section-title">
            <h2>Comparison workflow</h2>
          </div>
          <div className="ctc-event">
            <b>1. Select candidates</b>
            <span className="ctc-muted">Choose up to five candidates from talent pool.</span>
          </div>
          <div className="ctc-event">
            <b>2. Generate missing reports</b>
            <span className="ctc-muted">Analyze CV/resume and build trajectory profile.</span>
          </div>
          <div className="ctc-event">
            <b>3. Compare fit signals</b>
            <span className="ctc-muted">Review readiness, risk, and role alignment.</span>
          </div>
          <div className="ctc-event">
            <b>4. Export decision pack</b>
            <span className="ctc-muted">Download summary for hiring panel.</span>
          </div>
        </div>
        <div className="ctc-card">
          <div className="ctc-section-title">
            <h2>Candidate ranking preview</h2>
            <span className="ctc-muted ctc-small">{hasReports ? 'By overall trajectory' : 'Pending analysis'}</span>
          </div>
          <div className="ctc-rank-list">
            {ranking.length === 0 ? (
              <div className="ctc-rank">
                <span className="ctc-muted">No candidates selected</span>
                <b>—</b>
              </div>
            ) : (
              ranking.map((row) => (
                <div key={row.id} className="ctc-rank">
                  <span>{row.name}</span>
                  <b>{row.score != null ? `${Math.round(row.score)}%` : '—'}</b>
                </div>
              ))
            )}
            <div className="ctc-rank">
              <span>Decision recommendation</span>
              <b>{hasReports ? 'Review top candidate' : 'Generate reports'}</b>
            </div>
          </div>
        </div>
      </section>

      <section className="ctc-recommend">
        <div className="ctc-rec">
          <span className="ctc-tag">Recruiter</span>
          <h3>Complete reports first</h3>
          <p className="ctc-muted">Run career trajectory analysis for selected candidates before panel review.</p>
        </div>
        <div className="ctc-rec">
          <span className="ctc-tag">Hiring Manager</span>
          <h3>Ask evidence-based questions</h3>
          <p className="ctc-muted">Validate business impact, role scope, and leadership examples during interview.</p>
        </div>
        <div className="ctc-rec">
          <span className="ctc-tag">Decision Pack</span>
          <h3>Export comparison</h3>
          <p className="ctc-muted">Create CSV once scores are generated for governance-ready selection.</p>
          <button type="button" className="ctc-btn" style={{ marginTop: 10 }} onClick={onExport} disabled={!hasReports}>
            Export comparison
          </button>
        </div>
      </section>
    </>
  );
}
