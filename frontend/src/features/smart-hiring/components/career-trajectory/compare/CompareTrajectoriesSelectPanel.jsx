import React from 'react';
import { Loader2 } from 'lucide-react';
import { candidateDisplayName } from '@/shared/lib/candidateListUtils';
import {
  MAX_COMPARE_CANDIDATES,
  candidateSubtitle,
} from '@/shared/lib/compareTrajectoriesCommandUtils';

export default function CompareTrajectoriesSelectPanel({
  candidates,
  selectedIds,
  summaries,
  nameById,
  candidateById,
  onAdd,
  onRemove,
  onAnalyzeMissing,
  analyzing,
  missingCount,
}) {
  const available = candidates.filter((c) => !selectedIds.includes(String(c.id)));

  return (
    <section className="ctc-select-card" data-testid="compare-trajectories-select">
      <div className="ctc-card ctc-candidate-select">
        <div className="ctc-section-title">
          <h2>Select candidates</h2>
          <span className="ctc-muted ctc-small">
            {selectedIds.length} selected · max {MAX_COMPARE_CANDIDATES}
          </span>
        </div>
        <div className="ctc-input-row">
          <select
            className="ctc-input"
            value=""
            onChange={(e) => {
              if (e.target.value) onAdd(e.target.value);
              e.target.value = '';
            }}
            data-testid="career-compare-add-candidate"
          >
            <option value="">Add candidate…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {candidateDisplayName(c)}
                {c.hasReport ? '' : ' (no report)'}
              </option>
            ))}
          </select>
          {selectedIds.map((id) => (
            <span key={id} className="ctc-chip">
              {nameById[id] || id}
              {!summaries[id] ? <span className="warn">no report</span> : null}
              <button
                type="button"
                className="ctc-chip-remove"
                aria-label={`Remove ${nameById[id] || id}`}
                onClick={() => onRemove(id)}
              >
                ×
              </button>
            </span>
          ))}
          {missingCount > 0 ? (
            <button
              type="button"
              className="ctc-btn primary"
              onClick={onAnalyzeMissing}
              disabled={analyzing}
            >
              {analyzing ? <Loader2 className="ctc-btn-spinner" /> : null}
              Analyze {missingCount} missing
            </button>
          ) : null}
        </div>
      </div>
      <div className="ctc-candidate-mini">
        {selectedIds.length === 0 ? (
          <div className="ctc-mini-profile ctc-mini-empty">
            <b>No candidates selected</b>
            <span className="ctc-muted ctc-small">Add up to five candidates to compare trajectories.</span>
          </div>
        ) : (
          selectedIds.map((id) => {
            const c = candidateById[id];
            const summary = summaries[id];
            const score = summary?.overall_score;
            return (
              <div key={id} className="ctc-mini-profile">
                <b>{nameById[id] || id}</b>
                <span className="ctc-muted ctc-small">{candidateSubtitle(c)}</span>
                <div className="score">{score != null ? `${Math.round(score)}%` : '—'}</div>
                <span className={`ctc-status ${summary ? 'ready' : 'missing'}`}>
                  {summary ? 'Report ready' : 'Report missing'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
